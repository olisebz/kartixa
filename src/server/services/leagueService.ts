/**
 * League Service — Business logic for league CRUD operations.
 * Auth-agnostic: receives validated data, returns DTOs.
 */

import { v4 as uuidv4 } from "uuid";
import { eq, sql, count } from "drizzle-orm";
import { getDb } from "../db";
import { leagues, seasons, drivers, races, raceResults } from "../db/schema";
import { NotFoundError } from "../domain/errors";
import type {
  CreateLeagueInput,
  UpdateLeagueInput,
} from "../domain/schemas";
import type { LeagueListDTO, LeagueDetailDTO, SeasonDTO } from "../domain/dto";

export const leagueService = {
  /** List all leagues with aggregated stats */
  async list(): Promise<LeagueListDTO[]> {
    const db = getDb();

    const allLeagues = await db.select().from(leagues).orderBy(leagues.createdAt);

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
      });
    }

    return result;
  },

  /** Get league detail with seasons */
  async getById(leagueId: string): Promise<LeagueDetailDTO> {
    const db = getDb();

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
      tracks: league.tracks ?? [],
      createdAt: league.createdAt.toISOString(),
      updatedAt: league.updatedAt.toISOString(),
      seasons: seasonDTOs,
    };
  },

  /** Create a new league with default Season 1 and optional initial drivers */
  async create(input: CreateLeagueInput): Promise<LeagueDetailDTO> {
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

    return this.getById(leagueId);
  },

  /** Update league details */
  async update(leagueId: string, input: UpdateLeagueInput): Promise<LeagueDetailDTO> {
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

    return this.getById(leagueId);
  },

  /** Delete a league and all related data (cascade) */
  async delete(leagueId: string): Promise<void> {
    const db = getDb();

    const [existing] = await db.select({ id: leagues.id }).from(leagues).where(eq(leagues.id, leagueId));
    if (!existing) throw new NotFoundError("League", leagueId);

    await db.delete(leagues).where(eq(leagues.id, leagueId));
  },
};
