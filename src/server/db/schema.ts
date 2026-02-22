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
  uniqueIndex,
} from "drizzle-orm/mysql-core";

// ============================================================================
// USERS (Phase 2 — table exists but is not actively used yet)
// ============================================================================

export const users = mysqlTable(
  "users",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    email: varchar("email", { length: 255 }).notNull(),
    displayName: varchar("display_name", { length: 255 }).notNull(),
    /** bcrypt/argon2 hash — never exposed via API */
    passwordHash: varchar("password_hash", { length: 255 }),
    /** "public" | "admin" — matches Role type */
    role: varchar("role", { length: 20 }).notNull().default("public"),
    /** Provider for future OAuth: "local" | "google" | "github" etc. */
    authProvider: varchar("auth_provider", { length: 50 }).notNull().default("local"),
    /** External provider user ID (Phase 2+) */
    externalId: varchar("external_id", { length: 255 }),
    /** Whether the user's email has been verified */
    emailVerified: boolean("email_verified").notNull().default(false),
    /** Soft-disable: block login without deleting data */
    isActive: boolean("is_active").notNull().default(true),
    lastLoginAt: timestamp("last_login_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    uniqueIndex("idx_users_email").on(table.email),
    index("idx_users_role").on(table.role),
  ],
);

// ============================================================================
// LEAGUES
// ============================================================================

export const leagues = mysqlTable("leagues", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description").notNull().default(""),
  tracks: json("tracks").notNull().$type<string[]>().default([]),
  /** Phase 2: tracks which user created this league */
  createdBy: varchar("created_by", { length: 36 }).references(() => users.id, {
    onDelete: "set null",
  }),
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

export type UserRow = typeof users.$inferSelect;
export type LeagueRow = typeof leagues.$inferSelect;
export type SeasonRow = typeof seasons.$inferSelect;
export type DriverRow = typeof drivers.$inferSelect;
export type RaceRow = typeof races.$inferSelect;
export type RaceResultRow = typeof raceResults.$inferSelect;
