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
  bigint,
  timestamp,
  json,
  index,
  uniqueIndex,
} from "drizzle-orm/mysql-core";

// ============================================================================
// USERS
// ============================================================================

export const users = mysqlTable(
  "users",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    email: varchar("email", { length: 255 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    emailVerifiedAt: timestamp("email_verified_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (table) => [uniqueIndex("uq_users_email").on(table.email)]
);

// ============================================================================
// AUTH EMAIL CHALLENGES
// ============================================================================

export const authEmailChallenges = mysqlTable(
  "auth_email_challenges",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    userId: varchar("user_id", { length: 36 }).references(() => users.id, {
      onDelete: "cascade",
    }),
    email: varchar("email", { length: 255 }).notNull(),
    purpose: varchar("purpose", { length: 32 }).notNull(),
    codeHash: varchar("code_hash", { length: 255 }).notNull(),
    pendingName: varchar("pending_name", { length: 255 }),
    pendingPasswordHash: varchar("pending_password_hash", { length: 255 }),
    pendingDeviceId: varchar("pending_device_id", { length: 128 }),
    expiresAt: timestamp("expires_at").notNull(),
    consumedAt: timestamp("consumed_at"),
    attemptCount: int("attempt_count").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    index("idx_auth_email_challenges_email").on(table.email),
    index("idx_auth_email_challenges_user").on(table.userId),
    index("idx_auth_email_challenges_purpose").on(table.purpose),
  ]
);

// ============================================================================
// TRUSTED DEVICES
// ============================================================================

export const userTrustedDevices = mysqlTable(
  "user_trusted_devices",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    deviceId: varchar("device_id", { length: 128 }).notNull(),
    userAgent: text("user_agent"),
    lastUsedAt: timestamp("last_used_at").notNull().defaultNow(),
    revokedAt: timestamp("revoked_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    uniqueIndex("uq_user_trusted_devices_user_device").on(table.userId, table.deviceId),
    index("idx_user_trusted_devices_user").on(table.userId),
    index("idx_user_trusted_devices_revoked").on(table.revokedAt),
  ]
);

// ============================================================================
// AUTH SESSIONS
// ============================================================================

export const userAuthSessions = mysqlTable(
  "user_auth_sessions",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    deviceId: varchar("device_id", { length: 128 }).notNull(),
    sessionTokenHash: varchar("session_token_hash", { length: 255 }).notNull(),
    userAgent: text("user_agent"),
    ipAddress: varchar("ip_address", { length: 64 }),
    lastSeenAt: timestamp("last_seen_at").notNull().defaultNow(),
    expiresAt: timestamp("expires_at").notNull(),
    revokedAt: timestamp("revoked_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    uniqueIndex("uq_user_auth_sessions_token_hash").on(table.sessionTokenHash),
    index("idx_user_auth_sessions_user").on(table.userId),
    index("idx_user_auth_sessions_device").on(table.deviceId),
    index("idx_user_auth_sessions_revoked").on(table.revokedAt),
  ]
);

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
// TEAMS (per league)
// ============================================================================

export const teams = mysqlTable(
  "teams",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    leagueId: varchar("league_id", { length: 36 })
      .notNull()
      .references(() => leagues.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    index("idx_teams_league").on(table.leagueId),
    index("idx_teams_active").on(table.isActive),
    uniqueIndex("uq_teams_league_name").on(table.leagueId, table.name),
  ]
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
    currentTeamId: varchar("current_team_id", { length: 36 }).references(
      () => teams.id,
      { onDelete: "set null" }
    ),
    name: varchar("name", { length: 255 }).notNull(),
    driverNumber: int("driver_number").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    index("idx_drivers_season").on(table.seasonId),
    index("idx_drivers_team").on(table.currentTeamId),
  ]
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
    teamId: varchar("team_id", { length: 36 }).references(() => teams.id, {
      onDelete: "set null",
    }),
    position: int("position").notNull(),
    points: int("points").notNull().default(0),
    lapTime: varchar("lap_time", { length: 20 }), // Format: "MM:SS.mmm"
    fastestLap: boolean("fastest_lap").notNull().default(false),
    dnf: boolean("dnf").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_results_race").on(table.raceId),
    index("idx_results_driver").on(table.driverId),
    index("idx_results_team").on(table.teamId),
  ]
);

export const raceResultPenalties = mysqlTable(
  "race_result_penalties",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    raceResultId: varchar("race_result_id", { length: 36 })
      .notNull()
      .references(() => raceResults.id, { onDelete: "cascade" }),
    penaltyType: varchar("penalty_type", { length: 20 }).notNull(),
    penaltyValue: int("penalty_value").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_race_result_penalties_result").on(table.raceResultId),
    index("idx_race_result_penalties_type").on(table.penaltyType),
  ]
);

// ============================================================================
// LEAGUE MEMBERSHIPS
// ============================================================================

export const leagueMemberships = mysqlTable(
  "league_memberships",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    leagueId: varchar("league_id", { length: 36 })
      .notNull()
      .references(() => leagues.id, { onDelete: "cascade" }),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 20 }).notNull().default("member"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    uniqueIndex("uq_membership_league_user").on(table.leagueId, table.userId),
    index("idx_membership_user").on(table.userId),
    index("idx_membership_role").on(table.role),
  ]
);

// ============================================================================
// LEAGUE INVITE CODES
// ============================================================================

export const leagueInviteCodes = mysqlTable(
  "league_invite_codes",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    leagueId: varchar("league_id", { length: 36 })
      .notNull()
      .references(() => leagues.id, { onDelete: "cascade" }),
    code: varchar("code", { length: 32 }).notNull(),
    roleToGrant: varchar("role_to_grant", { length: 20 }).notNull().default("member"),
    maxUses: int("max_uses"),
    usedCount: int("used_count").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    expiresAt: timestamp("expires_at"),
    createdByUserId: varchar("created_by_user_id", { length: 36 }).references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    uniqueIndex("uq_invite_code").on(table.code),
    index("idx_invite_league").on(table.leagueId),
    index("idx_invite_active").on(table.isActive),
  ]
);

// ============================================================================
// API RATE LIMITS
// ============================================================================

export const apiRateLimits = mysqlTable("api_rate_limits", {
  key: varchar("key", { length: 255 }).primaryKey(),
  count: int("count").notNull().default(1),
  windowStart: bigint("window_start", { mode: "number" }).notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

// ============================================================================
// TYPE EXPORTS (inferred from schema)
// ============================================================================

export type LeagueRow = typeof leagues.$inferSelect;
export type SeasonRow = typeof seasons.$inferSelect;
export type TeamRow = typeof teams.$inferSelect;
export type DriverRow = typeof drivers.$inferSelect;
export type RaceRow = typeof races.$inferSelect;
export type RaceResultRow = typeof raceResults.$inferSelect;
export type RaceResultPenaltyRow = typeof raceResultPenalties.$inferSelect;
export type UserRow = typeof users.$inferSelect;
export type AuthEmailChallengeRow = typeof authEmailChallenges.$inferSelect;
export type UserTrustedDeviceRow = typeof userTrustedDevices.$inferSelect;
export type UserAuthSessionRow = typeof userAuthSessions.$inferSelect;
export type LeagueMembershipRow = typeof leagueMemberships.$inferSelect;
export type LeagueInviteCodeRow = typeof leagueInviteCodes.$inferSelect;
