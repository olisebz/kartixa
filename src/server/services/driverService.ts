/**
 * Driver Service — Business logic for driver management.
 * Driver stats (points, wins, races) are computed from race results.
 */

import { v4 as uuidv4 } from "uuid";
import { eq, and, count, sql } from "drizzle-orm";
import { getDb } from "../db";
import { drivers, seasons, leagues, raceResults, races } from "../db/schema";
import { NotFoundError, ConflictError } from "../domain/errors";
import type { CreateDriverInput, UpdateDriverInput } from "../domain/schemas";
import type { DriverDTO } from "../domain/dto";

export const driverService = {
  /** List drivers for a season with computed stats, sorted by points desc */
  async listBySeason(leagueId: string, seasonId: string): Promise<DriverDTO[]> {
    const db = getDb();

    // Verify league/season relationship
    const [season] = await db
      .select()
      .from(seasons)
      .where(and(eq(seasons.id, seasonId), eq(seasons.leagueId, leagueId)));
    if (!season) throw new NotFoundError("Season", seasonId);

    const seasonDrivers = await db
      .select()
      .from(drivers)
      .where(eq(drivers.seasonId, seasonId));

    const result: DriverDTO[] = [];

    for (const driver of seasonDrivers) {
      // Compute stats from race results
      const results = await db
        .select({
          points: raceResults.points,
          position: raceResults.position,
        })
        .from(raceResults)
        .where(eq(raceResults.driverId, driver.id));

      const totalPoints = results.reduce((sum, r) => sum + r.points, 0);
      const raceCount = results.length;
      const wins = results.filter((r) => r.position === 1).length;

      result.push({
        id: driver.id,
        name: driver.name,
        totalPoints,
        races: raceCount,
        wins,
      });
    }

    // Sort by points descending
    result.sort((a, b) => b.totalPoints - a.totalPoints);

    return result;
  },

  /** Add a driver to a season */
  async create(leagueId: string, seasonId: string, input: CreateDriverInput): Promise<DriverDTO> {
    const db = getDb();

    // Verify season belongs to league
    const [season] = await db
      .select()
      .from(seasons)
      .where(and(eq(seasons.id, seasonId), eq(seasons.leagueId, leagueId)));
    if (!season) throw new NotFoundError("Season", seasonId);

    const driverId = uuidv4();
    await db.insert(drivers).values({
      id: driverId,
      seasonId,
      name: input.name,
    });

    return {
      id: driverId,
      name: input.name,
      totalPoints: 0,
      races: 0,
      wins: 0,
    };
  },

  /** Rename a driver */
  async update(
    leagueId: string,
    seasonId: string,
    driverId: string,
    input: UpdateDriverInput
  ): Promise<DriverDTO> {
    const db = getDb();

    // Verify chain: league → season → driver
    const [season] = await db
      .select()
      .from(seasons)
      .where(and(eq(seasons.id, seasonId), eq(seasons.leagueId, leagueId)));
    if (!season) throw new NotFoundError("Season", seasonId);

    const [driver] = await db
      .select()
      .from(drivers)
      .where(and(eq(drivers.id, driverId), eq(drivers.seasonId, seasonId)));
    if (!driver) throw new NotFoundError("Driver", driverId);

    await db.update(drivers).set({ name: input.name }).where(eq(drivers.id, driverId));

    // Re-fetch with computed stats
    const allDrivers = await this.listBySeason(leagueId, seasonId);
    const updated = allDrivers.find((d) => d.id === driverId);
    if (!updated) throw new NotFoundError("Driver", driverId);
    return updated;
  },

  /** Delete a driver (only if they have no race results) */
  async delete(leagueId: string, seasonId: string, driverId: string): Promise<void> {
    const db = getDb();

    // Verify chain
    const [season] = await db
      .select()
      .from(seasons)
      .where(and(eq(seasons.id, seasonId), eq(seasons.leagueId, leagueId)));
    if (!season) throw new NotFoundError("Season", seasonId);

    const [driver] = await db
      .select()
      .from(drivers)
      .where(and(eq(drivers.id, driverId), eq(drivers.seasonId, seasonId)));
    if (!driver) throw new NotFoundError("Driver", driverId);

    // Check for existing race results
    const [resultCount] = await db
      .select({ count: count() })
      .from(raceResults)
      .where(eq(raceResults.driverId, driverId));

    if ((resultCount?.count ?? 0) > 0) {
      throw new ConflictError("Cannot delete driver with existing race results. Remove race results first.");
    }

    await db.delete(drivers).where(eq(drivers.id, driverId));
  },
};
