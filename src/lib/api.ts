/**
 * Frontend API client — replaces direct mock data access.
 * Typed, centralized, handles errors consistently.
 */

import type {
  ApiSuccessResponse,
  ApiErrorResponse,
  LeagueListDTO,
  LeagueDetailDTO,
  LeagueMemberDTO,
  LeagueInviteCodeDTO,
  SeasonDTO,
  TeamRankingDTO,
  DriverDTO,
  RaceListDTO,
  RaceDetailDTO,
} from "@/server/domain/dto";
import type {
  CreateLeagueInput,
  CreateInviteCodeInput,
  ConfirmPasswordChangeInput,
  ConfirmPasswordResetInput,
  JoinByCodeInput,
  RegisterInput,
  RequestPasswordResetInput,
  RevokeSessionInput,
  StartLoginChallengeInput,
  UpdateLeagueInput,
  UpdateMembershipRoleInput,
  VerifyRegisterInput,
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
  auth: {
    register: {
      start: (data: RegisterInput) =>
        request<{ challengeId: string; expiresAt: string; requiresVerification: boolean }>(
          "/auth/register",
          {
            method: "POST",
            body: JSON.stringify(data),
          }
        ),
      verify: (data: VerifyRegisterInput) =>
        request<{ id: string; name: string; email: string }>("/auth/register/verify", {
          method: "POST",
          body: JSON.stringify(data),
        }),
    },

    login: {
      challenge: (data: StartLoginChallengeInput) =>
        request<{ requiresVerification: boolean; challengeId: string | null; expiresAt: string | null }>(
          "/auth/login/challenge",
          {
            method: "POST",
            body: JSON.stringify(data),
          }
        ),
    },

    profile: {
      get: () => request<{ id: string; name: string; email: string }>("/auth/profile"),
      update: (data: { name: string }) =>
        request<{ id: string; name: string }>("/auth/profile", {
          method: "PATCH",
          body: JSON.stringify(data),
        }),
    },

    sessions: {
      list: () =>
        request<
          {
            id: string;
            deviceId: string;
            userAgent: string | null;
            ipAddress: string | null;
            createdAt: string;
            lastSeenAt: string;
            expiresAt: string;
            isCurrent: boolean;
          }[]
        >("/auth/sessions"),
      revoke: (data: RevokeSessionInput) =>
        request<{ revoked: boolean }>("/auth/sessions", {
          method: "DELETE",
          body: JSON.stringify(data),
        }),
    },

    password: {
      reset: {
        request: (data: RequestPasswordResetInput) =>
          request<{ accepted: boolean; challengeId: string | null; expiresAt: string | null }>(
            "/auth/password/reset/request",
            {
            method: "POST",
            body: JSON.stringify(data),
            }
          ),
        confirm: (data: ConfirmPasswordResetInput) =>
          request<{ updated: boolean }>("/auth/password/reset/confirm", {
            method: "POST",
            body: JSON.stringify(data),
          }),
      },
      change: {
        request: () =>
          request<{ challengeId: string; expiresAt: string; requiresVerification: boolean }>(
            "/auth/password/change/request",
            {
              method: "POST",
            }
          ),
        confirm: (data: ConfirmPasswordChangeInput) =>
          request<{ updated: boolean }>("/auth/password/change/confirm", {
            method: "POST",
            body: JSON.stringify(data),
          }),
      },
    },
  },

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

    joinByCode: (data: JoinByCodeInput) =>
      request<{ leagueId: string; role: "admin" | "member" }>(`/leagues/join-by-code`, {
        method: "POST",
        body: JSON.stringify(data),
      }),

    members: {
      list: (leagueId: string) =>
        request<LeagueMemberDTO[]>(`/leagues/${leagueId}/members`),

      updateRole: (
        leagueId: string,
        memberId: string,
        data: UpdateMembershipRoleInput
      ) =>
        request<LeagueMemberDTO>(`/leagues/${leagueId}/members/${memberId}`, {
          method: "PATCH",
          body: JSON.stringify(data),
        }),

      remove: (leagueId: string, memberId: string) =>
        request<{ removed: boolean }>(`/leagues/${leagueId}/members/${memberId}`, {
          method: "DELETE",
        }),

      leave: (leagueId: string) =>
        request<{ left: boolean }>(`/leagues/${leagueId}/members/me`, {
          method: "DELETE",
        }),
    },

    inviteCodes: {
      list: (leagueId: string) =>
        request<LeagueInviteCodeDTO[]>(`/leagues/${leagueId}/invite-codes`),

      create: (leagueId: string, data: CreateInviteCodeInput) =>
        request<LeagueInviteCodeDTO>(`/leagues/${leagueId}/invite-codes`, {
          method: "POST",
          body: JSON.stringify(data),
        }),

      deactivate: (leagueId: string, inviteId: string) =>
        request<LeagueInviteCodeDTO>(`/leagues/${leagueId}/invite-codes/${inviteId}`, {
          method: "PATCH",
        }),

      rotate: (leagueId: string, data: CreateInviteCodeInput) =>
        request<LeagueInviteCodeDTO>(`/leagues/${leagueId}/invite-codes/rotate`, {
          method: "POST",
          body: JSON.stringify(data),
        }),
    },
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

    delete: (leagueId: string, seasonId: string) =>
      request<{ deleted: boolean }>(`/leagues/${leagueId}/seasons/${seasonId}`, {
        method: "DELETE",
      }),
  },

  teams: {
    listRankings: (leagueId: string, seasonId: string) =>
      request<TeamRankingDTO[]>(`/leagues/${leagueId}/seasons/${seasonId}/teams`),
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
