/**
 * User Service — CRUD + auth operations for users.
 * Auth-agnostic: handles data, not request/response.
 */

import { v4 as uuidv4 } from "uuid";
import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { users } from "../db/schema";
import { hashPassword, verifyPassword, needsRehash } from "../auth/password";
import { issueTokenPair, issueAccessToken, verifyToken } from "../auth/jwt";
import { AppError, NotFoundError } from "../domain/errors";
import type { TokenPair } from "../auth/jwt";
import type { Role } from "../domain/constants";

// ============================================================================
// TYPES
// ============================================================================

export interface RegisterInput {
  email: string;
  password: string;
  displayName: string;
}

export interface LoginResult {
  user: UserDTO;
  tokens: TokenPair;
}

export interface UserDTO {
  id: string;
  email: string;
  displayName: string;
  role: Role;
  emailVerified: boolean;
  createdAt: string;
}

// ============================================================================
// HELPERS
// ============================================================================

function toDTO(row: typeof users.$inferSelect): UserDTO {
  return {
    id: row.id,
    email: row.email,
    displayName: row.displayName,
    role: row.role as Role,
    emailVerified: row.emailVerified,
    createdAt: row.createdAt.toISOString(),
  };
}

// ============================================================================
// SERVICE
// ============================================================================

export const userService = {
  /**
   * Register a new user.
   * - Validates email uniqueness
   * - Hashes password with argon2id + pepper
   * - Returns tokens for immediate login
   */
  async register(input: RegisterInput): Promise<LoginResult> {
    const db = getDb();

    // Check email uniqueness
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, input.email.toLowerCase()))
      .limit(1);

    if (existing.length > 0) {
      throw new AppError("CONFLICT", "An account with this email already exists");
    }

    const id = uuidv4();
    const passwordHash = await hashPassword(input.password);

    await db.insert(users).values({
      id,
      email: input.email.toLowerCase(),
      displayName: input.displayName,
      passwordHash,
      role: "admin", // First user gets admin (single-admin for Go-Kart league)
      authProvider: "local",
      emailVerified: false,
      isActive: true,
    });

    const tokens = await issueTokenPair(id, input.email.toLowerCase(), "admin");

    return {
      user: {
        id,
        email: input.email.toLowerCase(),
        displayName: input.displayName,
        role: "admin",
        emailVerified: false,
        createdAt: new Date().toISOString(),
      },
      tokens,
    };
  },

  /**
   * Authenticate a user with email + password.
   * - Timing-safe: always hash even on wrong email (prevents user enumeration)
   * - Upgrades hash if argon2 params changed (transparent rehash)
   */
  async login(email: string, password: string): Promise<LoginResult> {
    const db = getDb();

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (!user || !user.passwordHash) {
      // Burn time to prevent user enumeration via timing
      await hashPassword(password);
      throw new AppError("UNAUTHORIZED", "Invalid email or password");
    }

    // Check if account is disabled
    if (!user.isActive) {
      throw new AppError("FORBIDDEN", "Account is disabled");
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      throw new AppError("UNAUTHORIZED", "Invalid email or password");
    }

    // Transparent rehash if argon2 params were upgraded
    if (needsRehash(user.passwordHash)) {
      const newHash = await hashPassword(password);
      await db
        .update(users)
        .set({ passwordHash: newHash })
        .where(eq(users.id, user.id));
    }

    // Update last login
    await db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, user.id));

    const tokens = await issueTokenPair(
      user.id,
      user.email,
      user.role,
    );

    return { user: toDTO(user), tokens };
  },

  /**
   * Refresh an access token using a valid refresh token.
   */
  async refresh(refreshToken: string): Promise<{ accessToken: string; expiresIn: number }> {
    const payload = await verifyToken(refreshToken, "refresh");
    if (!payload) {
      throw new AppError("UNAUTHORIZED", "Invalid or expired refresh token");
    }

    // Verify user still exists and is active
    const db = getDb();
    const [user] = await db
      .select({ id: users.id, email: users.email, role: users.role, isActive: users.isActive })
      .from(users)
      .where(eq(users.id, payload.sub))
      .limit(1);

    if (!user || !user.isActive) {
      throw new AppError("UNAUTHORIZED", "Account not found or disabled");
    }

    return issueAccessToken(user.id, user.email, user.role);
  },

  /**
   * Get user by ID. Returns null if not found OR if deactivated.
   * Used by auth guard to validate JWT-derived user is still valid.
   */
  async getById(id: string): Promise<UserDTO | null> {
    const db = getDb();
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!user || !user.isActive) return null;
    return toDTO(user);
  },

  /**
   * Get the current user's profile (from auth context).
   */
  async getProfile(userId: string): Promise<UserDTO> {
    const user = await this.getById(userId);
    if (!user) throw new NotFoundError("User", userId);
    return user;
  },

  /**
   * Change password — requires old password for verification.
   */
  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
  ): Promise<void> {
    const db = getDb();
    const [user] = await db
      .select({ id: users.id, passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user || !user.passwordHash) {
      throw new NotFoundError("User", userId);
    }

    const valid = await verifyPassword(oldPassword, user.passwordHash);
    if (!valid) {
      throw new AppError("UNAUTHORIZED", "Current password is incorrect");
    }

    const newHash = await hashPassword(newPassword);
    await db
      .update(users)
      .set({ passwordHash: newHash })
      .where(eq(users.id, userId));
  },
};
