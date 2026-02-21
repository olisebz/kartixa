/**
 * Season Service — Business logic for season operations.
 */

import { v4 as uuidv4 } from "uuid";
import { eq, and } from "drizzle-orm";
import { getDb } from "../db";
import { leagues, seasons, drivers } from "../db/schema";
import { NotFoundError } from "../domain/errors";
import type { CreateSeasonInput } from "../domain/schemas";
import type { SeasonDTO, DriverDTO } from "../domain/dto";
import { driverService } from "./driverService";

export const seasonService = {
  /** Create a new season for a league, deactivating the old active season */
  async create(leagueId: string, input: CreateSeasonInput): Promise<SeasonDTO> {
    const db = getDb();

    // Verify league exists
    const [league] = await db.select({ id: leagues.id }).from(leagues).where(eq(leagues.id, leagueId));
    if (!league) throw new NotFoundError("League", leagueId);

    // Deactivate current active season
    await db
      .update(seasons)
      .set({ isActive: false })
      .where(and(eq(seasons.leagueId, leagueId), eq(seasons.isActive, true)));

    const seasonId = uuidv4();
    await db.insert(seasons).values({
      id: seasonId,
      leagueId,
      name: input.name,
      startDate: input.startDate,
      isActive: true,
    });

    return {
      id: seasonId,
      name: input.name,
      startDate: input.startDate,
      endDate: null,
      isActive: true,
      driverCount: 0,
      raceCount: 0,
    };
  },

  /** Get active season ID for a league */
  async getActiveSeasonId(leagueId: string): Promise<string> {
    const db = getDb();

    const [season] = await db
      .select({ id: seasons.id })
      .from(seasons)
      .where(and(eq(seasons.leagueId, leagueId), eq(seasons.isActive, true)));

    if (!season) throw new NotFoundError("Active season for league", leagueId);
    return season.id;
  },

  /** Get drivers for a season with computed stats */
  async getDrivers(leagueId: string, seasonId: string): Promise<DriverDTO[]> {
    return driverService.listBySeason(leagueId, seasonId);
  },
};
