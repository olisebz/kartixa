/**
 * Zod validation schemas for all API inputs.
 * Strict input validation — sanitization happens here.
 */

import { z } from "zod";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, UNKNOWN_DRIVER_TOKEN } from "./constants";

// ============================================================================
// SHARED
// ============================================================================

/** UUID v4 format */
const uuidParam = z.string().uuid("Invalid ID format");

/** Pagination query params */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

/** Sort direction */
export const sortSchema = z.object({
  sortBy: z.string().optional(),
  sortDir: z.enum(["asc", "desc"]).default("asc"),
});

// ============================================================================
// LEAGUE
// ============================================================================

export const createLeagueSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(255),
  description: z.string().trim().max(2000).default(""),
  tracks: z.array(z.string().trim().min(1).max(255)).max(50).default([]),
  teams: z.array(z.string().trim().min(1).max(255)).max(100).default([]),
  drivers: z
    .array(z.object({ name: z.string().trim().min(1).max(255) }))
    .max(100)
    .default([]),
});

export const updateLeagueSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  description: z.string().trim().max(2000).optional(),
  tracks: z.array(z.string().trim().min(1).max(255)).max(50).optional(),
  teams: z.array(z.string().trim().min(1).max(255)).max(100).optional(),
});

// ============================================================================
// SEASON
// ============================================================================

export const createSeasonSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(255),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  carryDrivers: z.boolean().default(false),
});

// ============================================================================
// DRIVER
// ============================================================================

export const createDriverSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(255),
  number: z.number().int().min(1).max(999).optional(),
  teamId: uuidParam.optional().nullable(),
});

export const updateDriverSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  number: z.number().int().min(1).max(999).optional(),
  teamId: uuidParam.optional().nullable(),
});

// ============================================================================
// RACE
// ============================================================================

const raceResultInputSchema = z.object({
  driverId: z.union([uuidParam, z.literal(UNKNOWN_DRIVER_TOKEN)]),
  position: z.number().int().min(1).max(100),
  lapTime: z
    .string()
    .regex(/^\d{2}:\d{2}\.\d{3}$/, "Lap time must be MM:SS.mmm")
    .optional()
    .nullable(),
  fastestLap: z.boolean().default(false),
  dnf: z.boolean().default(false),
  penalties: z
    .array(
      z.object({
        type: z.enum(["seconds", "grid", "points"]),
        value: z.number().int().min(1).max(9999),
        note: z.string().trim().max(2000).optional().nullable(),
      })
    )
    .max(50)
    .default([]),
});

export const createRaceSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(255),
  track: z.string().trim().min(1, "Track is required").max(255),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  results: z.array(raceResultInputSchema).min(1, "At least one result is required").max(100),
});

export const updateRaceSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  track: z.string().trim().min(1).max(255).optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD")
    .optional(),
  results: z.array(raceResultInputSchema).min(1).max(100).optional(),
});

// ============================================================================
// AUTH
// ============================================================================

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(255),
  email: z.email("Valid email required").transform((value) => value.trim().toLowerCase()),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
  deviceId: z.string().trim().min(6).max(128).optional(),
});

export const verifyRegisterSchema = z.object({
  email: z.email("Valid email required").transform((value) => value.trim().toLowerCase()),
  challengeId: z.string().uuid("Invalid challenge ID"),
  code: z.string().trim().min(4).max(12),
});

export const startLoginChallengeSchema = z.object({
  email: z.email("Valid email required").transform((value) => value.trim().toLowerCase()),
  password: z.string().min(8).max(128),
  deviceId: z.string().trim().min(6).max(128),
});

export const verifyCodeSchema = z.object({
  challengeId: z.string().uuid("Invalid challenge ID"),
  code: z.string().trim().min(4).max(12),
});

export const requestPasswordResetSchema = z.object({
  email: z.email("Valid email required").transform((value) => value.trim().toLowerCase()),
});

export const confirmPasswordResetSchema = z.object({
  email: z.email("Valid email required").transform((value) => value.trim().toLowerCase()),
  challengeId: z.string().uuid("Invalid challenge ID"),
  code: z.string().trim().min(4).max(12),
  newPassword: z.string().min(8).max(128),
});

export const confirmPasswordChangeSchema = z.object({
  challengeId: z.string().uuid("Invalid challenge ID"),
  code: z.string().trim().min(4).max(12),
  newPassword: z.string().min(8).max(128),
});

export const revokeSessionSchema = z.object({
  sessionId: z.string().uuid("Invalid session ID"),
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(255),
});

export const createInviteCodeSchema = z.object({
  roleToGrant: z.enum(["member", "admin"]).default("member"),
  maxUses: z.number().int().min(1).max(1000).optional(),
  expiresAt: z
    .string()
    .datetime({ offset: true, message: "expiresAt must be an ISO datetime string" })
    .optional(),
});

export const joinByCodeSchema = z.object({
  code: z.string().trim().min(6).max(32),
});

export const updateMembershipRoleSchema = z.object({
  role: z.enum(["admin", "member"]),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type CreateLeagueInput = z.infer<typeof createLeagueSchema>;
export type UpdateLeagueInput = z.infer<typeof updateLeagueSchema>;
export type CreateSeasonInput = z.infer<typeof createSeasonSchema>;
export type CreateDriverInput = z.infer<typeof createDriverSchema>;
export type UpdateDriverInput = z.infer<typeof updateDriverSchema>;
export type CreateRaceInput = z.infer<typeof createRaceSchema>;
export type UpdateRaceInput = z.infer<typeof updateRaceSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type VerifyRegisterInput = z.infer<typeof verifyRegisterSchema>;
export type StartLoginChallengeInput = z.infer<typeof startLoginChallengeSchema>;
export type VerifyCodeInput = z.infer<typeof verifyCodeSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type RequestPasswordResetInput = z.infer<typeof requestPasswordResetSchema>;
export type ConfirmPasswordResetInput = z.infer<typeof confirmPasswordResetSchema>;
export type ConfirmPasswordChangeInput = z.infer<typeof confirmPasswordChangeSchema>;
export type RevokeSessionInput = z.infer<typeof revokeSessionSchema>;
export type CreateInviteCodeInput = z.infer<typeof createInviteCodeSchema>;
export type JoinByCodeInput = z.infer<typeof joinByCodeSchema>;
export type UpdateMembershipRoleInput = z.infer<typeof updateMembershipRoleSchema>;
