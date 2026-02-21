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

/** Get points for a position + optional fastest lap bonus */
export function calculatePoints(position: number, fastestLap: boolean): number {
  const base = POINTS_SYSTEM[position] ?? 0;
  const bonus = fastestLap && position <= 10 ? FASTEST_LAP_BONUS : 0;
  return base + bonus;
}

/** Maximum items per page for pagination */
export const MAX_PAGE_SIZE = 100;
export const DEFAULT_PAGE_SIZE = 50;

/** Role definitions for Phase 2 auth */
export const ROLES = {
  PUBLIC: "public",
  ADMIN: "admin",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];
