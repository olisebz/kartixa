/**
 * Race Service — Business logic for race CRUD.
 * Points are computed server-side from the position + fastest lap.
 */

import { v4 as uuidv4 } from "uuid";
import { eq, and, count } from "drizzle-orm";
import { getDb } from "../db";
import { races, raceResults, seasons, drivers, leagues } from "../db/schema";
import { NotFoundError, ValidationError } from "../domain/errors";
import { calculatePoints } from "../domain/constants";
import type { CreateRaceInput, UpdateRaceInput } from "../domain/schemas";
import type { RaceListDTO, RaceDetailDTO, RaceResultDTO } from "../domain/dto";

export const raceService = {
  /** List races for a season */
  async listBySeason(leagueId: string, seasonId: string): Promise<RaceListDTO[]> {
    const db = getDb();

    // Verify league → season
    const [season] = await db
      .select()
      .from(seasons)
      .where(and(eq(seasons.id, seasonId), eq(seasons.leagueId, leagueId)));
    if (!season) throw new NotFoundError("Season", seasonId);

    const seasonRaces = await db
      .select()
      .from(races)
      .where(eq(races.seasonId, seasonId))
      .orderBy(races.date);

    const result: RaceListDTO[] = [];

    for (const race of seasonRaces) {
      const results = await db
        .select({
          driverId: raceResults.driverId,
          position: raceResults.position,
        })
        .from(raceResults)
        .where(eq(raceResults.raceId, race.id))
        .orderBy(raceResults.position);

      // Get winner name
      let winner: string | null = null;
      const winnerResult = results.find((r) => r.position === 1);
      if (winnerResult) {
        const [driverRow] = await db
          .select({ name: drivers.name })
          .from(drivers)
          .where(eq(drivers.id, winnerResult.driverId));
        winner = driverRow?.name ?? null;
      }

      result.push({
        id: race.id,
        name: race.name,
        track: race.track,
        date: race.date,
        resultCount: results.length,
        winner,
      });
    }

    return result;
  },

  /** Get race detail with full results */
  async getById(leagueId: string, raceId: string): Promise<RaceDetailDTO> {
    const db = getDb();

    // Find race, verify it belongs to this league via season
    const [race] = await db.select().from(races).where(eq(races.id, raceId));
    if (!race) throw new NotFoundError("Race", raceId);

    const [season] = await db
      .select()
      .from(seasons)
      .where(and(eq(seasons.id, race.seasonId), eq(seasons.leagueId, leagueId)));
    if (!season) throw new NotFoundError("Race", raceId);

    const results = await db
      .select()
      .from(raceResults)
      .where(eq(raceResults.raceId, raceId))
      .orderBy(raceResults.position);

    const resultDTOs: RaceResultDTO[] = [];
    for (const r of results) {
      const [driver] = await db
        .select({ name: drivers.name })
        .from(drivers)
        .where(eq(drivers.id, r.driverId));

      resultDTOs.push({
        driverId: r.driverId,
        driverName: driver?.name ?? "Unknown",
        position: r.position,
        points: r.points,
        lapTime: r.lapTime,
        fastestLap: r.fastestLap,
      });
    }

    return {
      id: race.id,
      name: race.name,
      track: race.track,
      date: race.date,
      results: resultDTOs,
    };
  },

  /** Create a race with results. Points are computed server-side. */
  async create(
    leagueId: string,
    seasonId: string,
    input: CreateRaceInput
  ): Promise<RaceDetailDTO> {
    const db = getDb();

    // Verify league → season
    const [season] = await db
      .select()
      .from(seasons)
      .where(and(eq(seasons.id, seasonId), eq(seasons.leagueId, leagueId)));
    if (!season) throw new NotFoundError("Season", seasonId);

    // Verify all drivers exist and belong to this season
    for (const result of input.results) {
      const [driver] = await db
        .select({ id: drivers.id })
        .from(drivers)
        .where(and(eq(drivers.id, result.driverId), eq(drivers.seasonId, seasonId)));
      if (!driver) {
        throw new ValidationError(`Driver '${result.driverId}' not found in this season`);
      }
    }

    const raceId = uuidv4();
    await db.insert(races).values({
      id: raceId,
      seasonId,
      name: input.name,
      track: input.track,
      date: input.date,
    });

    // Insert results with computed points
    const resultValues = input.results.map((r) => ({
      id: uuidv4(),
      raceId,
      driverId: r.driverId,
      position: r.position,
      points: calculatePoints(r.position, r.fastestLap),
      lapTime: r.lapTime ?? null,
      fastestLap: r.fastestLap,
    }));

    if (resultValues.length > 0) {
      await db.insert(raceResults).values(resultValues);
    }

    return this.getById(leagueId, raceId);
  },

  /** Update a race and its results */
  async update(
    leagueId: string,
    raceId: string,
    input: UpdateRaceInput
  ): Promise<RaceDetailDTO> {
    const db = getDb();

    // Find race, verify ownership
    const [race] = await db.select().from(races).where(eq(races.id, raceId));
    if (!race) throw new NotFoundError("Race", raceId);

    const [season] = await db
      .select()
      .from(seasons)
      .where(and(eq(seasons.id, race.seasonId), eq(seasons.leagueId, leagueId)));
    if (!season) throw new NotFoundError("Race", raceId);

    // Update race metadata
    const updates: Record<string, unknown> = {};
    if (input.name !== undefined) updates.name = input.name;
    if (input.track !== undefined) updates.track = input.track;
    if (input.date !== undefined) updates.date = input.date;

    if (Object.keys(updates).length > 0) {
      await db.update(races).set(updates).where(eq(races.id, raceId));
    }

    // Replace results if provided
    if (input.results) {
      // Verify all drivers
      for (const result of input.results) {
        const [driver] = await db
          .select({ id: drivers.id })
          .from(drivers)
          .where(and(eq(drivers.id, result.driverId), eq(drivers.seasonId, race.seasonId)));
        if (!driver) {
          throw new ValidationError(`Driver '${result.driverId}' not found in this season`);
        }
      }

      // Delete old results and insert new ones
      await db.delete(raceResults).where(eq(raceResults.raceId, raceId));

      const resultValues = input.results.map((r) => ({
        id: uuidv4(),
        raceId,
        driverId: r.driverId,
        position: r.position,
        points: calculatePoints(r.position, r.fastestLap),
        lapTime: r.lapTime ?? null,
        fastestLap: r.fastestLap,
      }));

      if (resultValues.length > 0) {
        await db.insert(raceResults).values(resultValues);
      }
    }

    return this.getById(leagueId, raceId);
  },

  /** Delete a race and its results */
  async delete(leagueId: string, raceId: string): Promise<void> {
    const db = getDb();

    const [race] = await db.select().from(races).where(eq(races.id, raceId));
    if (!race) throw new NotFoundError("Race", raceId);

    const [season] = await db
      .select()
      .from(seasons)
      .where(and(eq(seasons.id, race.seasonId), eq(seasons.leagueId, leagueId)));
    if (!season) throw new NotFoundError("Race", raceId);

    await db.delete(races).where(eq(races.id, raceId));
  },
};
