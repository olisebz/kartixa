/**
 * Password hashing module — argon2id + pepper.
 *
 * Security layers:
 *   1. Salt — auto-generated per password by argon2 (stored in hash)
 *   2. Pepper — HMAC-SHA256 with a server-side secret before hashing
 *      → Even if DB is leaked, passwords can't be cracked without the pepper.
 *
 * argon2id is the recommended algorithm (OWASP 2024):
 *   - Resistant to side-channel attacks (argon2i part)
 *   - Resistant to GPU cracking (argon2d part)
 *   - Memory-hard (configurable)
 */

import argon2 from "argon2";
import { createHmac } from "crypto";
import { config } from "../config";

// ============================================================================
// PEPPER (HMAC pre-hash)
// ============================================================================

/**
 * Apply pepper: HMAC-SHA256(password, pepperSecret).
 * Returns a hex string that is then fed to argon2.
 *
 * Why HMAC instead of concatenation?
 * - Prevents length-extension attacks
 * - Output is fixed-length (64 hex chars) → no issues with argon2 input limits
 */
function applyPepper(password: string): string {
  const secret = config.auth.pepperSecret;
  if (!secret) {
    // In development without a pepper, pass through raw password
    return password;
  }
  return createHmac("sha256", secret).update(password).digest("hex");
}

// ============================================================================
// ARGON2 CONFIG (OWASP recommended minimums)
// ============================================================================

const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 19456,   // 19 MiB (OWASP minimum for argon2id)
  timeCost: 2,          // 2 iterations
  parallelism: 1,       // 1 thread
  hashLength: 32,       // 256-bit hash
};

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Hash a plaintext password.
 * Returns an argon2id hash string (includes salt, params, hash).
 */
export async function hashPassword(password: string): Promise<string> {
  const peppered = applyPepper(password);
  return argon2.hash(peppered, ARGON2_OPTIONS);
}

/**
 * Verify a plaintext password against a stored hash.
 * Returns true if the password matches.
 */
export async function verifyPassword(
  password: string,
  storedHash: string,
): Promise<boolean> {
  const peppered = applyPepper(password);
  try {
    return await argon2.verify(storedHash, peppered);
  } catch {
    // Invalid hash format → treat as mismatch
    return false;
  }
}

/**
 * Check if a hash needs to be re-hashed (e.g. after config change).
 * Call after successful login to upgrade old hashes transparently.
 */
export function needsRehash(storedHash: string): boolean {
  return argon2.needsRehash(storedHash, ARGON2_OPTIONS);
}
