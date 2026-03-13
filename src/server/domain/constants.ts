/**
 * Domain constants — Points system, limits, etc.
 */

/** Points awarded for race positions (1st through 10th place) */
export const POINTS_SYSTEM: Record<number, number> = {
  1: 25,
  2: 18,
  3: 15,
  4: 12,
  5: 10,
  6: 8,
  7: 6,
  8: 4,
  9: 2,
  10: 1,
};

/** Bonus point for fastest lap (only if driver finishes in top 10) */
export const FASTEST_LAP_BONUS = 1;

/** Special placeholder driver token for non-league participants in race results */
export const UNKNOWN_DRIVER_TOKEN = "__unknown__";

/** Reserved display name for placeholder race participants */
export const UNKNOWN_DRIVER_NAME = "Unknown Driver";

/** Reserved number for placeholder race participants */
export const UNKNOWN_DRIVER_NUMBER = 0;

/** Get points for a position + optional fastest lap bonus */
export function calculatePoints(position: number, fastestLap: boolean): number {
  const base = POINTS_SYSTEM[position] ?? 0;
  const bonus = fastestLap && position <= 10 ? FASTEST_LAP_BONUS : 0;
  return base + bonus;
}

/** Maximum items per page for pagination */
export const MAX_PAGE_SIZE = 100;
export const DEFAULT_PAGE_SIZE = 50;

/** League membership roles (per league) */
export const LEAGUE_ROLES = {
  OWNER: "owner",
  ADMIN: "admin",
  MEMBER: "member",
} as const;

export type LeagueRole = (typeof LEAGUE_ROLES)[keyof typeof LEAGUE_ROLES];


