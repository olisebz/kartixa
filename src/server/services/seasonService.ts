/**
 * Season Service — Business logic for season operations.
 */

import { v4 as uuidv4 } from "uuid";
import { eq, and, desc, count } from "drizzle-orm";
import { getDb } from "../db";
import { leagues, seasons, drivers } from "../db/schema";
import { NotFoundError, ValidationError } from "../domain/errors";
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

    const [previousActiveSeason] = await db
      .select({ id: seasons.id })
      .from(seasons)
      .where(and(eq(seasons.leagueId, leagueId), eq(seasons.isActive, true)));

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

    if (input.carryDrivers && previousActiveSeason) {
      const previousDrivers = await db
        .select({
          name: drivers.name,
          driverNumber: drivers.driverNumber,
          currentTeamId: drivers.currentTeamId,
        })
        .from(drivers)
        .where(eq(drivers.seasonId, previousActiveSeason.id));

      if (previousDrivers.length > 0) {
        await db.insert(drivers).values(
          previousDrivers.map((driver) => ({
            id: uuidv4(),
            seasonId,
            name: driver.name,
            driverNumber: driver.driverNumber,
            currentTeamId: driver.currentTeamId,
          })),
        );
      }
    }

    const [driverCountResult] = await db
      .select({ count: count() })
      .from(drivers)
      .where(eq(drivers.seasonId, seasonId));

    const driverCount = driverCountResult?.count ?? 0;

    return {
      id: seasonId,
      name: input.name,
      startDate: input.startDate,
      endDate: null,
      isActive: true,
      driverCount,
      raceCount: 0,
    };
  },

  /** Delete a season and reassign active season if needed */
  async delete(leagueId: string, seasonId: string): Promise<{ deleted: boolean }> {
    const db = getDb();

    const leagueSeasons = await db
      .select({ id: seasons.id, isActive: seasons.isActive, createdAt: seasons.createdAt })
      .from(seasons)
      .where(eq(seasons.leagueId, leagueId))
      .orderBy(desc(seasons.createdAt));

    if (leagueSeasons.length === 0) {
      throw new NotFoundError("Season", seasonId);
    }

    const targetSeason = leagueSeasons.find((season) => season.id === seasonId);
    if (!targetSeason) {
      throw new NotFoundError("Season", seasonId);
    }

    if (leagueSeasons.length === 1) {
      throw new ValidationError("Cannot delete the last season of a league");
    }

    if (targetSeason.isActive) {
      const replacement = leagueSeasons.find((season) => season.id !== seasonId);
      if (!replacement) {
        throw new ValidationError("Cannot determine replacement active season");
      }

      await db
        .update(seasons)
        .set({ isActive: false })
        .where(and(eq(seasons.leagueId, leagueId), eq(seasons.isActive, true)));

      await db
        .update(seasons)
        .set({ isActive: true })
        .where(eq(seasons.id, replacement.id));
    }

    await db
      .delete(seasons)
      .where(and(eq(seasons.id, seasonId), eq(seasons.leagueId, leagueId)));

    return { deleted: true };
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
