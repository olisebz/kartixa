/**
 * Database seed script — populates MariaDB with mock data from the existing mockData.ts.
 *
 * Usage: npx tsx src/server/db/seed.ts
 */

import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { v4 as uuidv4 } from "uuid";
import * as schema from "./schema";
import { calculatePoints } from "../domain/constants";

async function seed() {
  const pool = mysql.createPool({
    host: process.env.DATABASE_HOST ?? "localhost",
    port: Number(process.env.DATABASE_PORT ?? 3306),
    user: process.env.DATABASE_USER ?? "kartixa",
    password: process.env.DATABASE_PASSWORD ?? "kartixa_dev",
    database: process.env.DATABASE_NAME ?? "kartixa",
  });

  const db = drizzle(pool, { schema, mode: "default" });

  console.log("🌱 Seeding database...");

  // ========================================================================
  // League 1: Summer Championship 2025
  // ========================================================================
  const league1Id = uuidv4();
  await db.insert(schema.leagues).values({
    id: league1Id,
    name: "Summer Championship 2025",
    description: "The main summer league with weekly races across multiple tracks.",
    tracks: ["Speedway Arena", "Thunder Circuit", "Velocity Park"],
  });

  const season1Id = uuidv4();
  await db.insert(schema.seasons).values({
    id: season1Id,
    leagueId: league1Id,
    name: "Season 1",
    startDate: "2025-06-01",
    isActive: true,
  });

  const d1 = uuidv4(), d2 = uuidv4(), d3 = uuidv4(), d4 = uuidv4(), d5 = uuidv4();
  await db.insert(schema.drivers).values([
    { id: d1, seasonId: season1Id, name: "Max Power" },
    { id: d2, seasonId: season1Id, name: "Lisa Speed" },
    { id: d3, seasonId: season1Id, name: "Tom Turbo" },
    { id: d4, seasonId: season1Id, name: "Sarah Swift" },
    { id: d5, seasonId: season1Id, name: "Mike Drift" },
  ]);

  // Race 1: Opening Race
  const race1Id = uuidv4();
  await db.insert(schema.races).values({
    id: race1Id,
    seasonId: season1Id,
    name: "Opening Race",
    track: "Speedway Arena",
    date: "2025-06-15",
  });
  await db.insert(schema.raceResults).values([
    { id: uuidv4(), raceId: race1Id, driverId: d1, position: 1, points: calculatePoints(1, true), lapTime: "01:23.456", fastestLap: true },
    { id: uuidv4(), raceId: race1Id, driverId: d2, position: 2, points: calculatePoints(2, false), lapTime: null, fastestLap: false },
    { id: uuidv4(), raceId: race1Id, driverId: d3, position: 3, points: calculatePoints(3, false), lapTime: null, fastestLap: false },
    { id: uuidv4(), raceId: race1Id, driverId: d4, position: 4, points: calculatePoints(4, false), lapTime: null, fastestLap: false },
    { id: uuidv4(), raceId: race1Id, driverId: d5, position: 5, points: calculatePoints(5, false), lapTime: null, fastestLap: false },
  ]);

  // Race 2: Thunder Grand Prix
  const race2Id = uuidv4();
  await db.insert(schema.races).values({
    id: race2Id,
    seasonId: season1Id,
    name: "Thunder Grand Prix",
    track: "Thunder Circuit",
    date: "2025-06-22",
  });
  await db.insert(schema.raceResults).values([
    { id: uuidv4(), raceId: race2Id, driverId: d2, position: 1, points: calculatePoints(1, true), lapTime: "01:22.987", fastestLap: true },
    { id: uuidv4(), raceId: race2Id, driverId: d1, position: 2, points: calculatePoints(2, false), lapTime: null, fastestLap: false },
    { id: uuidv4(), raceId: race2Id, driverId: d4, position: 3, points: calculatePoints(3, false), lapTime: null, fastestLap: false },
    { id: uuidv4(), raceId: race2Id, driverId: d3, position: 4, points: calculatePoints(4, false), lapTime: null, fastestLap: false },
  ]);

  // Race 3: Velocity Challenge
  const race3Id = uuidv4();
  await db.insert(schema.races).values({
    id: race3Id,
    seasonId: season1Id,
    name: "Velocity Challenge",
    track: "Velocity Park",
    date: "2025-06-29",
  });
  await db.insert(schema.raceResults).values([
    { id: uuidv4(), raceId: race3Id, driverId: d3, position: 1, points: calculatePoints(1, false), lapTime: null, fastestLap: false },
    { id: uuidv4(), raceId: race3Id, driverId: d1, position: 2, points: calculatePoints(2, true), lapTime: "01:23.678", fastestLap: true },
    { id: uuidv4(), raceId: race3Id, driverId: d2, position: 3, points: calculatePoints(3, false), lapTime: null, fastestLap: false },
    { id: uuidv4(), raceId: race3Id, driverId: d4, position: 4, points: calculatePoints(4, false), lapTime: null, fastestLap: false },
  ]);

  // ========================================================================
  // League 2: Rookie League
  // ========================================================================
  const league2Id = uuidv4();
  await db.insert(schema.leagues).values({
    id: league2Id,
    name: "Rookie League",
    description: "A friendly league for newcomers to learn and compete.",
    tracks: ["Apex Karting"],
  });

  const season2Id = uuidv4();
  await db.insert(schema.seasons).values({
    id: season2Id,
    leagueId: league2Id,
    name: "Season 1",
    startDate: "2025-07-01",
    isActive: true,
  });

  const d6 = uuidv4(), d7 = uuidv4(), d8 = uuidv4();
  await db.insert(schema.drivers).values([
    { id: d6, seasonId: season2Id, name: "Anna First" },
    { id: d7, seasonId: season2Id, name: "Ben Starter" },
    { id: d8, seasonId: season2Id, name: "Clara New" },
  ]);

  const race4Id = uuidv4();
  await db.insert(schema.races).values({
    id: race4Id,
    seasonId: season2Id,
    name: "Welcome Race",
    track: "Apex Karting",
    date: "2025-07-05",
  });
  await db.insert(schema.raceResults).values([
    { id: uuidv4(), raceId: race4Id, driverId: d6, position: 1, points: calculatePoints(1, true), lapTime: "01:28.456", fastestLap: true },
    { id: uuidv4(), raceId: race4Id, driverId: d7, position: 2, points: calculatePoints(2, false), lapTime: null, fastestLap: false },
    { id: uuidv4(), raceId: race4Id, driverId: d8, position: 3, points: calculatePoints(3, false), lapTime: null, fastestLap: false },
  ]);

  // ========================================================================
  // League 3: Pro Circuit
  // ========================================================================
  const league3Id = uuidv4();
  await db.insert(schema.leagues).values({
    id: league3Id,
    name: "Pro Circuit",
    description: "Competitive racing for experienced drivers. High stakes, big rewards.",
    tracks: ["Grand Prix Arena", "Champions Circuit"],
  });

  const season3Id = uuidv4();
  await db.insert(schema.seasons).values({
    id: season3Id,
    leagueId: league3Id,
    name: "Season 1",
    startDate: "2025-05-15",
    isActive: true,
  });

  await db.insert(schema.drivers).values([
    { id: uuidv4(), seasonId: season3Id, name: "Victor Vroom" },
    { id: uuidv4(), seasonId: season3Id, name: "Diana Dash" },
  ]);

  console.log("✅ Seed completed successfully!");
  console.log("   - 3 leagues");
  console.log("   - 3 seasons");
  console.log("   - 10 drivers");
  console.log("   - 4 races with results");

  await pool.end();
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
