/**
 * League Service — Business logic for league CRUD operations.
 * Auth-agnostic: receives validated data, returns DTOs.
 */

import { v4 as uuidv4 } from "uuid";
import { and, eq, count, inArray } from "drizzle-orm";
import { getDb } from "../db";
import { leagues, seasons, teams, drivers, races, leagueMemberships } from "../db/schema";
import { ForbiddenError, NotFoundError } from "../domain/errors";
import type {
  CreateLeagueInput,
  UpdateLeagueInput,
} from "../domain/schemas";
import type { LeagueListDTO, LeagueDetailDTO, SeasonDTO } from "../domain/dto";
import { leagueAccessService } from "./leagueAccessService";

function normalizeTracks(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((track) => (typeof track === "string" ? track.trim() : ""))
      .filter((track) => track.length > 0);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed);
      return normalizeTracks(parsed);
    } catch {
      return trimmed
        .split(",")
        .map((track) => track.trim())
        .filter((track) => track.length > 0);
    }
  }

  if (value && typeof value === "object") {
    return normalizeTracks(Object.values(value));
  }

  return [];
}

function normalizeTeamNames(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();
  const result: string[] = [];

  for (const item of value) {
    if (typeof item !== "string") continue;
    const name = item.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(name);
  }

  return result;
}

export const leagueService = {
  /** List all leagues with aggregated stats */
  async list(userId: string): Promise<LeagueListDTO[]> {
    const db = getDb();

    const allLeagues = await db
      .select({
        id: leagues.id,
        name: leagues.name,
        description: leagues.description,
        createdAt: leagues.createdAt,
        role: leagueMemberships.role,
      })
      .from(leagues)
      .innerJoin(leagueMemberships, eq(leagueMemberships.leagueId, leagues.id))
      .where(eq(leagueMemberships.userId, userId))
      .orderBy(leagues.createdAt);

    const result: LeagueListDTO[] = [];

    for (const league of allLeagues) {
      const leagueSeasons = await db
        .select()
        .from(seasons)
        .where(eq(seasons.leagueId, league.id));

      let driverCount = 0;
      let raceCount = 0;
      let activeSeason: string | null = null;

      for (const season of leagueSeasons) {
        const [dResult] = await db
          .select({ count: count() })
          .from(drivers)
          .where(eq(drivers.seasonId, season.id));
        const [rResult] = await db
          .select({ count: count() })
          .from(races)
          .where(eq(races.seasonId, season.id));

        driverCount += dResult?.count ?? 0;
        raceCount += rResult?.count ?? 0;

        if (season.isActive) {
          activeSeason = season.name;
        }
      }

      result.push({
        id: league.id,
        name: league.name,
        description: league.description,
        createdAt: league.createdAt.toISOString(),
        driverCount,
        raceCount,
        activeSeason,
        role: league.role as "owner" | "admin" | "member",
      });
    }

    return result;
  },

  /** Get league detail with seasons */
  async getById(leagueId: string, userId: string): Promise<LeagueDetailDTO> {
    const db = getDb();

    const [membership] = await db
      .select({ id: leagueMemberships.id, role: leagueMemberships.role })
      .from(leagueMemberships)
      .where(and(eq(leagueMemberships.leagueId, leagueId), eq(leagueMemberships.userId, userId)));
    if (!membership) throw new ForbiddenError("You are not a member of this league");

    const [league] = await db.select().from(leagues).where(eq(leagues.id, leagueId));
    if (!league) throw new NotFoundError("League", leagueId);

    const leagueSeasons = await db
      .select()
      .from(seasons)
      .where(eq(seasons.leagueId, leagueId))
      .orderBy(seasons.createdAt);

    const seasonDTOs: SeasonDTO[] = [];
    for (const season of leagueSeasons) {
      const [dResult] = await db
        .select({ count: count() })
        .from(drivers)
        .where(eq(drivers.seasonId, season.id));
      const [rResult] = await db
        .select({ count: count() })
        .from(races)
        .where(eq(races.seasonId, season.id));

      seasonDTOs.push({
        id: season.id,
        name: season.name,
        startDate: season.startDate,
        endDate: season.endDate,
        isActive: season.isActive,
        driverCount: dResult?.count ?? 0,
        raceCount: rResult?.count ?? 0,
      });
    }

    return {
      id: league.id,
      name: league.name,
      description: league.description,
      tracks: normalizeTracks(league.tracks),
      teams: (
        await db
          .select({ id: teams.id, name: teams.name, isActive: teams.isActive })
          .from(teams)
          .where(eq(teams.leagueId, leagueId))
      ).map((team) => ({
        id: team.id,
        name: team.name,
        isActive: team.isActive,
      })),
      currentUserRole: membership.role as "owner" | "admin" | "member",
      createdAt: league.createdAt.toISOString(),
      updatedAt: league.updatedAt.toISOString(),
      seasons: seasonDTOs,
    };
  },

  /** Create a new league with default Season 1 and optional initial drivers */
  async create(input: CreateLeagueInput, ownerUserId: string): Promise<LeagueDetailDTO> {
    const db = getDb();

    const leagueId = uuidv4();
    const seasonId = uuidv4();
    const now = new Date().toISOString().slice(0, 10);

    await db.insert(leagues).values({
      id: leagueId,
      name: input.name,
      description: input.description,
      tracks: input.tracks,
    });

    await db.insert(seasons).values({
      id: seasonId,
      leagueId,
      name: "Season 1",
      startDate: now,
      isActive: true,
    });

    await leagueAccessService.createOwnerMembership(leagueId, ownerUserId);

    const teamNames = normalizeTeamNames(input.teams);
    if (teamNames.length > 0) {
      await db.insert(teams).values(
        teamNames.map((teamName) => ({
          id: uuidv4(),
          leagueId,
          name: teamName,
          isActive: true,
        }))
      );
    }

    // Create initial drivers if provided
    if (input.drivers.length > 0) {
      await db.insert(drivers).values(
        input.drivers.map((d) => ({
          id: uuidv4(),
          seasonId,
          name: d.name,
        }))
      );
    }

    return this.getById(leagueId, ownerUserId);
  },

  /** Update league details */
  async update(leagueId: string, input: UpdateLeagueInput, userId: string): Promise<LeagueDetailDTO> {
    const db = getDb();

    // Verify exists
    const [existing] = await db.select({ id: leagues.id }).from(leagues).where(eq(leagues.id, leagueId));
    if (!existing) throw new NotFoundError("League", leagueId);

    const updates: Record<string, unknown> = {};
    if (input.name !== undefined) updates.name = input.name;
    if (input.description !== undefined) updates.description = input.description;
    if (input.tracks !== undefined) updates.tracks = input.tracks;

    if (Object.keys(updates).length > 0) {
      await db.update(leagues).set(updates).where(eq(leagues.id, leagueId));
    }

    if (input.teams !== undefined) {
      const normalizedNames = normalizeTeamNames(input.teams);
      const existingTeams = await db
        .select({ id: teams.id, name: teams.name })
        .from(teams)
        .where(eq(teams.leagueId, leagueId));

      const existingByName = new Map(
        existingTeams.map((team) => [team.name.toLowerCase(), team] as const)
      );

      await db
        .update(teams)
        .set({ isActive: false })
        .where(eq(teams.leagueId, leagueId));

      for (const teamName of normalizedNames) {
        const existingTeam = existingByName.get(teamName.toLowerCase());
        if (existingTeam) {
          await db
            .update(teams)
            .set({ name: teamName, isActive: true })
            .where(eq(teams.id, existingTeam.id));
        } else {
          await db.insert(teams).values({
            id: uuidv4(),
            leagueId,
            name: teamName,
            isActive: true,
          });
        }
      }

      const inactiveTeams = await db
        .select({ id: teams.id })
        .from(teams)
        .where(and(eq(teams.leagueId, leagueId), eq(teams.isActive, false)));

      const inactiveTeamIds = inactiveTeams.map((team) => team.id);
      if (inactiveTeamIds.length > 0) {
        await db
          .update(drivers)
          .set({ currentTeamId: null })
          .where(inArray(drivers.currentTeamId, inactiveTeamIds));
      }
    }

    return this.getById(leagueId, userId);
  },

  /** Delete a league and all related data (cascade) */
  async delete(leagueId: string): Promise<void> {
    const db = getDb();

    const [existing] = await db.select({ id: leagues.id }).from(leagues).where(eq(leagues.id, leagueId));
    if (!existing) throw new NotFoundError("League", leagueId);

    await db.delete(leagues).where(eq(leagues.id, leagueId));
  },
};
