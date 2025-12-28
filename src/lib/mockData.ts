// Mock data for Phase 1 (UI only, no backend)

export interface Driver {
  id: string;
  name: string;
  totalPoints: number;
  races: number;
  wins: number;
}

export interface RaceResult {
  driverId: string;
  driverName: string;
  position: number;
  points: number;
  fastestLap?: boolean;
}

export interface Race {
  id: string;
  name: string;
  track: string;
  date: string;
  results: RaceResult[];
}

export interface League {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  drivers: Driver[];
  races: Race[];
  tracks: string[];
}

// Demo leagues
export const leagues: League[] = [
  {
    id: "league-1",
    name: "Summer Championship 2025",
    description: "The main summer league with weekly races across multiple tracks.",
    createdAt: "2025-06-01",
    tracks: ["Speedway Arena", "Thunder Circuit", "Velocity Park"],
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
          { driverId: "driver-1", driverName: "Max Power", position: 1, points: 25, fastestLap: true },
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
          { driverId: "driver-2", driverName: "Lisa Speed", position: 1, points: 25, fastestLap: true },
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
          { driverId: "driver-1", driverName: "Max Power", position: 2, points: 18, fastestLap: true },
          { driverId: "driver-2", driverName: "Lisa Speed", position: 3, points: 15 },
          { driverId: "driver-4", driverName: "Sarah Swift", position: 4, points: 12 },
        ],
      },
    ],
  },
  {
    id: "league-2",
    name: "Rookie League",
    description: "A friendly league for newcomers to learn and compete.",
    createdAt: "2025-07-01",
    tracks: ["Apex Karting"],
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
          { driverId: "driver-6", driverName: "Anna First", position: 1, points: 25 },
          { driverId: "driver-7", driverName: "Ben Starter", position: 2, points: 18 },
          { driverId: "driver-8", driverName: "Clara New", position: 3, points: 15 },
        ],
      },
    ],
  },
  {
    id: "league-3",
    name: "Pro Circuit",
    description: "Competitive racing for experienced drivers. High stakes, big rewards.",
    createdAt: "2025-05-15",
    tracks: ["Grand Prix Arena", "Champions Circuit"],
    drivers: [
      { id: "driver-9", name: "Victor Vroom", totalPoints: 210, races: 10, wins: 5 },
      { id: "driver-10", name: "Diana Dash", totalPoints: 195, races: 10, wins: 3 },
    ],
    races: [],
  },
];

// Helper function to get a league by ID
export function getLeagueById(id: string): League | undefined {
  return leagues.find((league) => league.id === id);
}

// Helper function to get sorted rankings
export function getSortedRankings(drivers: Driver[]): Driver[] {
  return [...drivers].sort((a, b) => b.totalPoints - a.totalPoints);
}

// Helper function to get race by ID
export function getRaceById(leagueId: string, raceId: string): Race | undefined {
  const league = getLeagueById(leagueId);
  return league?.races.find((race) => race.id === raceId);
}

// Points system for positions
export const pointsSystem: Record<number, number> = {
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
