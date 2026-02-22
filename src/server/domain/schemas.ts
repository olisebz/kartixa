/**
 * Zod validation schemas for all API inputs.
 * Strict input validation — sanitization happens here.
 */

import { z } from "zod";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "./constants";

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
  drivers: z
    .array(z.object({ name: z.string().trim().min(1).max(255) }))
    .max(100)
    .default([]),
});

export const updateLeagueSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  description: z.string().trim().max(2000).optional(),
  tracks: z.array(z.string().trim().min(1).max(255)).max(50).optional(),
});

// ============================================================================
// SEASON
// ============================================================================

export const createSeasonSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(255),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
});

// ============================================================================
// DRIVER
// ============================================================================

export const createDriverSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(255),
});

export const updateDriverSchema = z.object({
  name: z.string().trim().min(1).max(255),
});

// ============================================================================
// RACE
// ============================================================================

const raceResultInputSchema = z.object({
  driverId: uuidParam,
  position: z.number().int().min(1).max(100),
  lapTime: z
    .string()
    .regex(/^\d{2}:\d{2}\.\d{3}$/, "Lap time must be MM:SS.mmm")
    .optional()
    .nullable(),
  fastestLap: z.boolean().default(false),
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
  email: z.string().trim().toLowerCase().email("Invalid email address").max(255),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be at most 128 characters"),
  displayName: z.string().trim().min(1, "Display name is required").max(255),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email address"),
  password: z.string().min(1, "Password is required").max(128),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, "Current password is required").max(128),
  newPassword: z
    .string()
    .min(8, "New password must be at least 8 characters")
    .max(128, "New password must be at most 128 characters"),
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
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
