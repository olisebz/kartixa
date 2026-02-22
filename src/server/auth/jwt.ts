/**
 * JWT token module — issue & verify access/refresh tokens.
 *
 * Uses `jose` library (Web Crypto API, Edge-compatible).
 * Algorithm: HS256 (symmetric HMAC — same secret signs & verifies).
 *
 * Token strategy:
 *   - Access token:  short-lived (15 min), used for API auth
 *   - Refresh token: long-lived (7 days), used to get new access tokens
 */

import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { config } from "../config";

// ============================================================================
// TYPES
// ============================================================================

export interface TokenPayload {
  /** User ID */
  sub: string;
  /** User email */
  email: string;
  /** User role */
  role: string;
  /** Token type */
  type: "access" | "refresh";
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  /** Access token expiry in seconds */
  expiresIn: number;
}

// ============================================================================
// CONFIG
// ============================================================================

const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY = "7d";
const ACCESS_TOKEN_EXPIRY_SECONDS = 15 * 60; // 900s

/** Encode the JWT secret as Uint8Array (required by jose) */
function getSecret(): Uint8Array {
  const secret = config.auth.jwtSecret;
  if (!secret || secret.length < 32) {
    throw new Error(
      "JWT_SECRET must be at least 32 characters. " +
      "Generate one: openssl rand -base64 48",
    );
  }
  return new TextEncoder().encode(secret);
}

// ============================================================================
// ISSUE TOKENS
// ============================================================================

async function signToken(
  payload: Omit<TokenPayload, "type">,
  type: "access" | "refresh",
  expiry: string,
): Promise<string> {
  return new SignJWT({ ...payload, type } as unknown as JWTPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiry)
    .setIssuer("kartixa")
    .setAudience("kartixa")
    .sign(getSecret());
}

/**
 * Issue an access + refresh token pair for a user.
 */
export async function issueTokenPair(
  userId: string,
  email: string,
  role: string,
): Promise<TokenPair> {
  const payload = { sub: userId, email, role };

  const [accessToken, refreshToken] = await Promise.all([
    signToken(payload, "access", ACCESS_TOKEN_EXPIRY),
    signToken(payload, "refresh", REFRESH_TOKEN_EXPIRY),
  ]);

  return {
    accessToken,
    refreshToken,
    expiresIn: ACCESS_TOKEN_EXPIRY_SECONDS,
  };
}

/**
 * Issue only a new access token (used during refresh).
 */
export async function issueAccessToken(
  userId: string,
  email: string,
  role: string,
): Promise<{ accessToken: string; expiresIn: number }> {
  const accessToken = await signToken(
    { sub: userId, email, role },
    "access",
    ACCESS_TOKEN_EXPIRY,
  );
  return { accessToken, expiresIn: ACCESS_TOKEN_EXPIRY_SECONDS };
}

// ============================================================================
// VERIFY TOKENS
// ============================================================================

/**
 * Verify and decode a JWT. Returns the payload or null if invalid.
 */
export async function verifyToken(
  token: string,
  expectedType: "access" | "refresh",
): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      issuer: "kartixa",
      audience: "kartixa",
    });

    const typed = payload as unknown as TokenPayload;

    // Ensure correct token type (prevents using refresh token as access token)
    if (typed.type !== expectedType) return null;

    return typed;
  } catch {
    // Expired, invalid signature, malformed etc.
    return null;
  }
}
