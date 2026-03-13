/**
 * Response DTOs — standardized API response format.
 * All API responses follow this shape for consistency.
 */

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: PaginationMeta;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// ============================================================================
// DTO Builders
// ============================================================================

export function successResponse<T>(data: T, meta?: PaginationMeta): ApiSuccessResponse<T> {
  return { success: true, data, ...(meta ? { meta } : {}) };
}

export function errorResponse(
  code: string,
  message: string,
  details?: Record<string, unknown>
): ApiErrorResponse {
  return {
    success: false,
    error: { code, message, ...(details ? { details } : {}) },
  };
}

export function paginationMeta(page: number, pageSize: number, total: number): PaginationMeta {
  return {
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  };
}

// ============================================================================
// Response DTOs (what the API returns)
// ============================================================================

export interface LeagueListDTO {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  driverCount: number;
  raceCount: number;
  activeSeason: string | null;
  role: "owner" | "admin" | "member";
}

export interface LeagueDetailDTO {
  id: string;
  name: string;
  description: string;
  tracks: string[];
  teams: TeamDTO[];
  currentUserRole: "owner" | "admin" | "member";
  createdAt: string;
  updatedAt: string;
  seasons: SeasonDTO[];
}

export interface TeamDTO {
  id: string;
  name: string;
  isActive: boolean;
}

export interface TeamRankingDTO {
  teamId: string;
  teamName: string;
  points: number;
  raceEntries: number;
  wins: number;
}

export interface SeasonDTO {
  id: string;
  name: string;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  driverCount: number;
  raceCount: number;
}

export interface DriverDTO {
  id: string;
  name: string;
  number: number;
  teamId: string | null;
  teamName: string | null;
  totalPoints: number;
  races: number;
  wins: number;
  penaltiesHistory: DriverPenaltyHistoryDTO[];
}

export interface DriverPenaltyHistoryDTO {
  id: string;
  raceId: string;
  raceName: string;
  raceDate: string;
  type: "seconds" | "grid" | "points";
  value: number;
  note: string | null;
  createdAt: string;
}

export interface RaceListDTO {
  id: string;
  name: string;
  track: string;
  date: string;
  resultCount: number;
  winner: string | null;
}

export interface RaceDetailDTO {
  id: string;
  name: string;
  track: string;
  date: string;
  results: RaceResultDTO[];
}

export interface RaceResultDTO {
  driverId: string;
  driverName: string;
  teamId: string | null;
  teamName: string | null;
  position: number;
  points: number;
  lapTime: string | null;
  fastestLap: boolean;
  dnf: boolean;
  penalties: RaceResultPenaltyDTO[];
}

export interface RaceResultPenaltyDTO {
  id: string;
  type: "seconds" | "grid" | "points";
  value: number;
  note: string | null;
  createdAt: string;
}

export interface LeagueMemberDTO {
  membershipId: string;
  userId: string;
  name: string;
  email: string;
  role: "owner" | "admin" | "member";
  createdAt: string;
}

export interface LeagueInviteCodeDTO {
  id: string;
  code: string;
  roleToGrant: "admin" | "member";
  maxUses: number | null;
  usedCount: number;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
}

export interface AuthChallengeDTO {
  challengeId: string;
  expiresAt: string;
  requiresVerification: boolean;
}

export interface AuthSessionDTO {
  id: string;
  deviceId: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  isCurrent: boolean;
}
