/**
 * Permission definitions and role → permission mapping.
 *
 * Fine-grained permissions follow the pattern: "resource:action"
 * Roles map to sets of permissions.
 *
 * Phase 1: Not enforced (guard allows everything).
 * Phase 2: Guard checks permissions based on user role.
 */

import type { Role } from "../domain/constants";

// ============================================================================
// PERMISSION CONSTANTS
// ============================================================================

export const PERMISSIONS = {
  // Leagues
  LEAGUE_READ: "league:read",
  LEAGUE_CREATE: "league:create",
  LEAGUE_UPDATE: "league:update",
  LEAGUE_DELETE: "league:delete",

  // Seasons
  SEASON_READ: "season:read",
  SEASON_CREATE: "season:create",

  // Drivers
  DRIVER_READ: "driver:read",
  DRIVER_CREATE: "driver:create",
  DRIVER_UPDATE: "driver:update",
  DRIVER_DELETE: "driver:delete",

  // Races
  RACE_READ: "race:read",
  RACE_CREATE: "race:create",
  RACE_UPDATE: "race:update",
  RACE_DELETE: "race:delete",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// ============================================================================
// ROLE → PERMISSIONS MAPPING
// ============================================================================

/** Read-only permissions granted to every visitor */
const PUBLIC_PERMISSIONS: ReadonlySet<Permission> = new Set([
  PERMISSIONS.LEAGUE_READ,
  PERMISSIONS.SEASON_READ,
  PERMISSIONS.DRIVER_READ,
  PERMISSIONS.RACE_READ,
]);

/** Full access — all permissions */
const ADMIN_PERMISSIONS: ReadonlySet<Permission> = new Set(
  Object.values(PERMISSIONS),
);

const ROLE_PERMISSIONS: Record<Role, ReadonlySet<Permission>> = {
  public: PUBLIC_PERMISSIONS,
  admin: ADMIN_PERMISSIONS,
};

/**
 * Get the permission set for a role.
 * Falls back to public permissions for unknown roles.
 */
export function getPermissionsForRole(role: Role): ReadonlySet<Permission> {
  return ROLE_PERMISSIONS[role] ?? PUBLIC_PERMISSIONS;
}
