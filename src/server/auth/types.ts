/**
 * Auth types — shared across the auth module.
 */

import type { Role } from "../domain/constants";

/** Represents an authenticated user */
export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  displayName: string;
}

/**
 * Request-scoped auth context, passed to every handler.
 * Services remain auth-agnostic — they receive userId/role as plain args
 * if needed, never the full AuthContext.
 */
export interface AuthContext {
  /** null = anonymous (no valid token) */
  user: AuthUser | null;
  /** Shortcut: is there a logged-in user? */
  isAuthenticated: boolean;
  /** Check if user has a specific permission */
  hasPermission: (permission: string) => boolean;
}

/** Create an anonymous (unauthenticated) context */
export function anonymousContext(): AuthContext {
  return {
    user: null,
    isAuthenticated: false,
    hasPermission: () => false,
  };
}

/** Create an authenticated context for a given user */
export function authenticatedContext(
  user: AuthUser,
  permissions: ReadonlySet<string>,
): AuthContext {
  return {
    user,
    isAuthenticated: true,
    hasPermission: (p) => permissions.has(p),
  };
}
