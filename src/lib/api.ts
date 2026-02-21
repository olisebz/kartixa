/**
 * Frontend API client — replaces direct mock data access.
 * Typed, centralized, handles errors consistently.
 */

import type {
  ApiSuccessResponse,
  ApiErrorResponse,
  LeagueListDTO,
  LeagueDetailDTO,
  SeasonDTO,
  DriverDTO,
  RaceListDTO,
  RaceDetailDTO,
} from "@/server/domain/dto";
import type {
  CreateLeagueInput,
  UpdateLeagueInput,
  CreateSeasonInput,
  CreateDriverInput,
  UpdateDriverInput,
  CreateRaceInput,
  UpdateRaceInput,
} from "@/server/domain/schemas";

// ============================================================================
// BASE
// ============================================================================

const API_BASE = "/api/v1";

/** Error thrown by API client on non-success responses */
export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${path}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  // Include API key if set (for write operations)
  const apiKey = typeof window !== "undefined"
    ? localStorage.getItem("kartixa_api_key")
    : null;
  if (apiKey) {
    headers["X-API-Key"] = apiKey;
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  const json = await res.json();

  if (!res.ok || !json.success) {
    const err = json as ApiErrorResponse;
    throw new ApiClientError(
      res.status,
      err.error?.code ?? "UNKNOWN",
      err.error?.message ?? "Request failed",
      err.error?.details
    );
  }

  return (json as ApiSuccessResponse<T>).data;
}

// ============================================================================
// LEAGUES
// ============================================================================

export const api = {
  leagues: {
    list: () => request<LeagueListDTO[]>("/leagues"),

    get: (leagueId: string) => request<LeagueDetailDTO>(`/leagues/${leagueId}`),

    create: (data: CreateLeagueInput) =>
      request<LeagueDetailDTO>("/leagues", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    update: (leagueId: string, data: UpdateLeagueInput) =>
      request<LeagueDetailDTO>(`/leagues/${leagueId}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),

    delete: (leagueId: string) =>
      request<{ deleted: boolean }>(`/leagues/${leagueId}`, {
        method: "DELETE",
      }),
  },

  // ============================================================================
  // SEASONS
  // ============================================================================
  seasons: {
    create: (leagueId: string, data: CreateSeasonInput) =>
      request<SeasonDTO>(`/leagues/${leagueId}/seasons`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },

  // ============================================================================
  // DRIVERS
  // ============================================================================
  drivers: {
    list: (leagueId: string, seasonId: string) =>
      request<DriverDTO[]>(`/leagues/${leagueId}/seasons/${seasonId}/drivers`),

    create: (leagueId: string, seasonId: string, data: CreateDriverInput) =>
      request<DriverDTO>(`/leagues/${leagueId}/seasons/${seasonId}/drivers`, {
        method: "POST",
        body: JSON.stringify(data),
      }),

    update: (leagueId: string, seasonId: string, driverId: string, data: UpdateDriverInput) =>
      request<DriverDTO>(
        `/leagues/${leagueId}/seasons/${seasonId}/drivers/${driverId}`,
        { method: "PATCH", body: JSON.stringify(data) }
      ),

    delete: (leagueId: string, seasonId: string, driverId: string) =>
      request<{ deleted: boolean }>(
        `/leagues/${leagueId}/seasons/${seasonId}/drivers/${driverId}`,
        { method: "DELETE" }
      ),
  },

  // ============================================================================
  // RACES
  // ============================================================================
  races: {
    list: (leagueId: string, seasonId: string) =>
      request<RaceListDTO[]>(`/leagues/${leagueId}/seasons/${seasonId}/races`),

    get: (leagueId: string, raceId: string) =>
      request<RaceDetailDTO>(`/leagues/${leagueId}/races/${raceId}`),

    create: (leagueId: string, seasonId: string, data: CreateRaceInput) =>
      request<RaceDetailDTO>(
        `/leagues/${leagueId}/seasons/${seasonId}/races`,
        { method: "POST", body: JSON.stringify(data) }
      ),

    update: (leagueId: string, raceId: string, data: UpdateRaceInput) =>
      request<RaceDetailDTO>(`/leagues/${leagueId}/races/${raceId}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),

    delete: (leagueId: string, raceId: string) =>
      request<{ deleted: boolean }>(`/leagues/${leagueId}/races/${raceId}`, {
        method: "DELETE",
      }),
  },

  // ============================================================================
  // HEALTH
  // ============================================================================
  health: {
    check: () => request<{ status: string }>("/health"),
    ready: () => request<{ status: string; checks: { database: string } }>("/ready"),
  },
};
