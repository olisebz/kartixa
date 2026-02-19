/**
 * Mock data for Phase 1 (UI only, no backend)
 * This file contains type definitions, mock data, and utility functions
 * for managing racing leagues, seasons, races, and drivers.
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface Driver {
  readonly id: string;
  readonly name: string;
  totalPoints: number;
  races: number;
  wins: number;
}

export interface RaceResult {
  readonly driverId: string;
  readonly driverName: string;
  readonly position: number;
  readonly points: number;
  readonly lapTime?: string; // Format: "MM:SS.mmm" (e.g., "01:23.456")
  readonly fastestLap?: boolean;
}

export interface Race {
  readonly id: string;
  readonly name: string;
  readonly track: string;
  readonly date: string;
  readonly results: readonly RaceResult[];
}

export interface Season {
  readonly id: string;
  readonly name: string;
  readonly startDate: string;
  readonly endDate?: string;
  readonly isActive: boolean;
  readonly drivers: Driver[];
  readonly races: readonly Race[];
}

export interface League {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly createdAt: string;
  readonly tracks: readonly string[];
  readonly seasons: readonly Season[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Points awarded for race positions (1st through 10th place)
 */
export const POINTS_SYSTEM: Readonly<Record<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10, number>> = {
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
} as const;

// ============================================================================
// MOCK DATA
// ============================================================================

/**
 * Demo leagues with seasons, races, and drivers
 * In production, this would be fetched from a backend API
 */
export const leagues: readonly League[] = [
  {
    id: "league-1",
    name: "Summer Championship 2025",
    description: "The main summer league with weekly races across multiple tracks.",
    createdAt: "2025-06-01",
    tracks: ["Speedway Arena", "Thunder Circuit", "Velocity Park"],
    seasons: [
      {
        id: "season-1",
        name: "Season 1",
        startDate: "2025-06-01",
        isActive: true,
        drivers: [
          { id: "driver-1", name: "Max Power", totalPoints: 156, races: 8, wins: 3 },
          { id: "driver-2", name: "Lisa Speed", totalPoints: 142, races: 8, wins: 2 },
          { id: "driver-3", name: "Tom Turbo", totalPoints: 128, races: 7, wins: 2 },
          { id: "driver-4", name: "Sarah Swift", totalPoints: 115, races: 8, wins: 1 },
          { id: "driver-5", name: "Mike Drift", totalPoints: 98, races: 6, wins: 0 },
        ],
        races: [
          {
            id: "race-1",
            name: "Opening Race",
            track: "Speedway Arena",
            date: "2025-06-15",
            results: [
              { driverId: "driver-1", driverName: "Max Power", position: 1, points: 25, lapTime: "01:23.456", fastestLap: true },
              { driverId: "driver-2", driverName: "Lisa Speed", position: 2, points: 18 },
              { driverId: "driver-3", driverName: "Tom Turbo", position: 3, points: 15 },
              { driverId: "driver-4", driverName: "Sarah Swift", position: 4, points: 12 },
              { driverId: "driver-5", driverName: "Mike Drift", position: 5, points: 10 },
            ],
          },
          {
            id: "race-2",
            name: "Thunder Grand Prix",
            track: "Thunder Circuit",
            date: "2025-06-22",
            results: [
              { driverId: "driver-2", driverName: "Lisa Speed", position: 1, points: 25, lapTime: "01:22.987", fastestLap: true },
              { driverId: "driver-1", driverName: "Max Power", position: 2, points: 18 },
              { driverId: "driver-4", driverName: "Sarah Swift", position: 3, points: 15 },
              { driverId: "driver-3", driverName: "Tom Turbo", position: 4, points: 12 },
            ],
          },
          {
            id: "race-3",
            name: "Velocity Challenge",
            track: "Velocity Park",
            date: "2025-06-29",
            results: [
              { driverId: "driver-3", driverName: "Tom Turbo", position: 1, points: 25 },
              { driverId: "driver-1", driverName: "Max Power", position: 2, points: 18, lapTime: "01:23.678", fastestLap: true },
              { driverId: "driver-2", driverName: "Lisa Speed", position: 3, points: 15 },
              { driverId: "driver-4", driverName: "Sarah Swift", position: 4, points: 12 },
            ],
          },
        ],
      }
    ]
  },
  {
    id: "league-2",
    name: "Rookie League",
    description: "A friendly league for newcomers to learn and compete.",
    createdAt: "2025-07-01",
    tracks: ["Apex Karting"],
    seasons: [
      {
        id: "season-1",
        name: "Season 1",
        startDate: "2025-07-01",
        isActive: true,
        drivers: [
          { id: "driver-6", name: "Anna First", totalPoints: 45, races: 3, wins: 1 },
          { id: "driver-7", name: "Ben Starter", totalPoints: 38, races: 3, wins: 1 },
          { id: "driver-8", name: "Clara New", totalPoints: 32, races: 3, wins: 1 },
        ],
        races: [
          {
            id: "race-4",
            name: "Welcome Race",
            track: "Apex Karting",
            date: "2025-07-05",
            results: [
              { driverId: "driver-6", driverName: "Anna First", position: 1, points: 25, lapTime: "01:28.456", fastestLap: true },
              { driverId: "driver-7", driverName: "Ben Starter", position: 2, points: 18 },
              { driverId: "driver-8", driverName: "Clara New", position: 3, points: 15 },
            ],
          },
        ],
      }
    ]
  },
  {
    id: "league-3",
    name: "Pro Circuit",
    description: "Competitive racing for experienced drivers. High stakes, big rewards.",
    createdAt: "2025-05-15",
    tracks: ["Grand Prix Arena", "Champions Circuit"],
    seasons: [
      {
        id: "season-1",
        name: "Season 1",
        startDate: "2025-05-15",
        isActive: true,
        drivers: [
          { id: "driver-9", name: "Victor Vroom", totalPoints: 210, races: 10, wins: 5 },
          { id: "driver-10", name: "Diana Dash", totalPoints: 195, races: 10, wins: 3 },
        ],
        races: [],
      }
    ]
  },
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Retrieves a league by its unique identifier
 * @param id - The league ID to search for
 * @returns The league if found, undefined otherwise
 */
export function getLeagueById(id: string): League | undefined {
  if (!id) return undefined;
  return leagues.find((league) => league.id === id);
}

/**
 * Sorts drivers by total points in descending order
 * Creates a shallow copy to avoid mutating the original array
 * @param drivers - Array of drivers to sort
 * @returns New array of drivers sorted by points (highest first)
 */
export function getDriversByPoints(drivers: readonly Driver[]): Driver[] {
  return [...drivers].sort((a, b) => b.totalPoints - a.totalPoints);
}

/**
 * Retrieves a specific race from a league
 * Searches through all seasons to find the race
 * @param leagueId - The ID of the league containing the race
 * @param raceId - The ID of the race to find
 * @returns The race if found, undefined otherwise
 */
export function getRaceById(leagueId: string, raceId: string): Race | undefined {
  if (!leagueId || !raceId) return undefined;

  const league = getLeagueById(leagueId);
  if (!league) return undefined;

  for (const season of league.seasons) {
    const race = season.races.find((r) => r.id === raceId);
    if (race) return race;
  }
  
  return undefined;
}

/**
 * Gets the points awarded for a given position
 * @param position - The finishing position (1-10)
 * @returns Points awarded, or 0 if position is outside top 10
 */
export function getPointsForPosition(position: number): number {
  if (position < 1 || position > 10) return 0;
  return POINTS_SYSTEM[position as keyof typeof POINTS_SYSTEM] ?? 0;
}

/**
 * Retrieves the active season for a given league
 * @param leagueId - The ID of the league
 * @returns The active season if found, undefined otherwise
 */
export function getActiveSeason(leagueId: string): Season | undefined {
  const league = getLeagueById(leagueId);
  return league?.seasons.find((season) => season.isActive);
}
