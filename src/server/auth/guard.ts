/**
 * Auth guard — resolves the AuthContext for each request.
 *
 * AUTH_ENABLED=false → always returns anonymous context (API key for writes)
 * AUTH_ENABLED=true  → reads JWT from Authorization header, resolves user
 */

import { NextRequest } from "next/server";
import { timingSafeEqual } from "crypto";
import { config } from "../config";
import { logger } from "../logger";
import { AppError } from "../domain/errors";
import type { AuthContext } from "./types";
import { anonymousContext, authenticatedContext } from "./types";
import { getPermissionsForRole, type Permission } from "./permissions";
import { verifyToken } from "./jwt";
import { userService } from "../services/userService";
import type { Role } from "../domain/constants";

// ============================================================================
// HELPERS
// ============================================================================

/** Constant-time string comparison to prevent timing attacks */
function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Compare against self to burn same CPU time, then return false
    const buf = Buffer.from(a);
    timingSafeEqual(buf, buf);
    return false;
  }
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/**
 * Resolve the AuthContext for the current request.
 *
 * - AUTH_ENABLED=false → anonymous (API key protects writes)
 * - AUTH_ENABLED=true  → parse Bearer token → verify JWT → load user
 */
export async function resolveAuthContext(req: NextRequest): Promise<AuthContext> {
  // Auth disabled — everyone is anonymous
  if (!config.authEnabled) {
    return anonymousContext();
  }

  // Read Bearer token from Authorization header
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return anonymousContext();
  }

  const token = authHeader.slice(7); // strip "Bearer "
  if (!token) {
    return anonymousContext();
  }

  try {
    // Verify & decode JWT (checks signature, expiry, issuer, audience, type)
    const payload = await verifyToken(token, "access");
    if (!payload) {
      return anonymousContext();
    }

    // Look up user in DB — ensures user still exists and is active
    const user = await userService.getById(payload.sub);
    if (!user) {
      logger.warn("JWT valid but user not found", { userId: payload.sub });
      return anonymousContext();
    }

    // Build authenticated context with role-based permissions
    return authenticatedContext(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        displayName: user.displayName,
      },
      getPermissionsForRole(user.role),
    );
  } catch (err) {
    logger.warn("JWT verification failed", { error: String(err) });
    return anonymousContext();
  }
}

/**
 * Enforce that the current user has the required role.
 * Called after resolveAuthContext() in the request pipeline.
 *
 * - Authenticated users: checked via AuthContext role hierarchy
 * - Unauthenticated: falls back to API key check (backward-compatible)
 */
export function requireRole(
  req: NextRequest,
  authCtx: AuthContext,
  requiredRole: Role,
): void {
  // "public" endpoints: no restriction
  if (requiredRole === "public") return;

  // Authenticated path: check role hierarchy
  if (authCtx.isAuthenticated && authCtx.user) {
    const roleHierarchy: Record<Role, number> = { public: 0, admin: 1 };
    const userLevel = roleHierarchy[authCtx.user.role] ?? 0;
    const requiredLevel = roleHierarchy[requiredRole] ?? 0;

    if (userLevel >= requiredLevel) return;

    // User is authenticated but insufficient role
    throw new AppError("FORBIDDEN", "Insufficient permissions for this operation");
  }

  // Fallback: API key check for admin role (backward-compatible, timing-safe)
  if (config.apiKey) {
    const providedKey = req.headers.get("x-api-key");
    if (!providedKey || !safeCompare(providedKey, config.apiKey)) {
      throw new AppError("UNAUTHORIZED", "Valid API key required for this operation");
    }
    return;
  }

  // No auth method succeeded — require authentication
  throw new AppError("UNAUTHORIZED", "Authentication required");
}

/**
 * Enforce that the current user has a specific permission.
 * More granular than requireRole — checks the permission set.
 *
 * Falls back to API key check (admin key grants all permissions).
 */
export function requirePermission(
  req: NextRequest,
  authCtx: AuthContext,
  permission: Permission,
): void {
  // Check if the user's context includes this permission
  if (authCtx.hasPermission(permission)) return;

  // Fallback: admin API key grants all permissions
  if (config.apiKey) {
    const providedKey = req.headers.get("x-api-key");
    if (providedKey && safeCompare(providedKey, config.apiKey)) return;
  }

  // Determine the right error: FORBIDDEN if authenticated, UNAUTHORIZED if not
  if (authCtx.isAuthenticated) {
    throw new AppError("FORBIDDEN", `Missing permission: ${permission}`);
  }
  throw new AppError("UNAUTHORIZED", "Authentication required");
}
