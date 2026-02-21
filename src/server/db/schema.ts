/**
 * Drizzle ORM Schema — MariaDB
 *
 * Entities: League, Season, Driver, Race, RaceResult
 * Auth-ready: users table can be added later without schema refactors.
 *
 * Conventions:
 * - UUID primary keys (v4) for all entities
 * - snake_case columns
 * - Timestamps: created_at, updated_at
 * - Foreign keys with cascade deletes where appropriate
 */

import {
  mysqlTable,
  varchar,
  text,
  boolean,
  int,
  timestamp,
  json,
  index,
} from "drizzle-orm/mysql-core";

// ============================================================================
// LEAGUES
// ============================================================================

export const leagues = mysqlTable("leagues", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description").notNull().default(""),
  tracks: json("tracks").notNull().$type<string[]>().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

// ============================================================================
// SEASONS
// ============================================================================

export const seasons = mysqlTable(
  "seasons",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    leagueId: varchar("league_id", { length: 36 })
      .notNull()
      .references(() => leagues.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    startDate: varchar("start_date", { length: 10 }).notNull(), // ISO date string YYYY-MM-DD
    endDate: varchar("end_date", { length: 10 }),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (table) => [index("idx_seasons_league").on(table.leagueId)]
);

// ============================================================================
// DRIVERS (per season)
// ============================================================================

export const drivers = mysqlTable(
  "drivers",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    seasonId: varchar("season_id", { length: 36 })
      .notNull()
      .references(() => seasons.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (table) => [index("idx_drivers_season").on(table.seasonId)]
);

// ============================================================================
// RACES
// ============================================================================

export const races = mysqlTable(
  "races",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    seasonId: varchar("season_id", { length: 36 })
      .notNull()
      .references(() => seasons.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    track: varchar("track", { length: 255 }).notNull(),
    date: varchar("date", { length: 10 }).notNull(), // ISO date string YYYY-MM-DD
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (table) => [index("idx_races_season").on(table.seasonId)]
);

// ============================================================================
// RACE RESULTS
// ============================================================================

export const raceResults = mysqlTable(
  "race_results",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    raceId: varchar("race_id", { length: 36 })
      .notNull()
      .references(() => races.id, { onDelete: "cascade" }),
    driverId: varchar("driver_id", { length: 36 })
      .notNull()
      .references(() => drivers.id, { onDelete: "cascade" }),
    position: int("position").notNull(),
    points: int("points").notNull().default(0),
    lapTime: varchar("lap_time", { length: 20 }), // Format: "MM:SS.mmm"
    fastestLap: boolean("fastest_lap").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_results_race").on(table.raceId),
    index("idx_results_driver").on(table.driverId),
  ]
);

// ============================================================================
// TYPE EXPORTS (inferred from schema)
// ============================================================================

export type LeagueRow = typeof leagues.$inferSelect;
export type SeasonRow = typeof seasons.$inferSelect;
export type DriverRow = typeof drivers.$inferSelect;
export type RaceRow = typeof races.$inferSelect;
export type RaceResultRow = typeof raceResults.$inferSelect;
