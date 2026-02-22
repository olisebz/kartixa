/**
 * Auth module — public API.
 *
 * Re-exports everything other modules need.
 * Import from "@/server/auth" instead of individual files.
 */

export { type AuthUser, type AuthContext, anonymousContext, authenticatedContext } from "./types";
export { PERMISSIONS, type Permission, getPermissionsForRole } from "./permissions";
export { resolveAuthContext, requireRole, requirePermission } from "./guard";
export { hashPassword, verifyPassword, needsRehash } from "./password";
export { issueTokenPair, issueAccessToken, verifyToken, type TokenPayload, type TokenPair } from "./jwt";
