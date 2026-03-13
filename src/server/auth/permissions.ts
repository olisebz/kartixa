export const LEAGUE_ROLE_ORDER = {
  member: 1,
  admin: 2,
  owner: 3,
} as const;

export type LeagueRoleLevel = keyof typeof LEAGUE_ROLE_ORDER;

export function isLeagueRole(value: unknown): value is LeagueRoleLevel {
  return value === "member" || value === "admin" || value === "owner";
}

export function hasMinLeagueRole(
  role: LeagueRoleLevel,
  minRole: LeagueRoleLevel,
): boolean {
  return LEAGUE_ROLE_ORDER[role] >= LEAGUE_ROLE_ORDER[minRole];
}

export function hasElevatedLeagueRole(role: LeagueRoleLevel): boolean {
  return role === "admin" || role === "owner";
}
