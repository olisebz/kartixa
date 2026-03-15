/**
 * Race Service — Business logic for race CRUD.
 * Points are computed server-side from the position + fastest lap.
 */

import { v4 as uuidv4 } from "uuid";
import { eq, and } from "drizzle-orm";
import { getDb } from "../db";
import { races, raceResults, raceResultPenalties, seasons, drivers, teams } from "../db/schema";
import { NotFoundError, ValidationError } from "../domain/errors";
import { UNKNOWN_DRIVER_NAME, UNKNOWN_DRIVER_NUMBER, UNKNOWN_DRIVER_TOKEN } from "../domain/constants";
import type { CreateRaceInput, UpdateRaceInput } from "../domain/schemas";
import type { RaceListDTO, RaceDetailDTO, RaceResultDTO } from "../domain/dto";
import { calculatePointsAfterPenalties, getOrCreateUnknownDriverId } from "./pointsCalculationService";

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
        .select({ name: drivers.name, number: drivers.driverNumber })
        .from(drivers)
        .where(eq(drivers.id, r.driverId));

      const [team] = r.teamId
        ? await db
            .select({ id: teams.id, name: teams.name })
            .from(teams)
            .where(eq(teams.id, r.teamId))
        : [];

      const penalties = await db
        .select()
        .from(raceResultPenalties)
        .where(eq(raceResultPenalties.raceResultId, r.id));

      const isUnknownDriver =
        (driver?.name ?? null) === UNKNOWN_DRIVER_NAME &&
        (driver?.number ?? null) === UNKNOWN_DRIVER_NUMBER;

      resultDTOs.push({
        driverId: isUnknownDriver ? UNKNOWN_DRIVER_TOKEN : r.driverId,
        driverName: isUnknownDriver ? UNKNOWN_DRIVER_NAME : driver?.name ?? "Unknown",
        teamId: r.teamId,
        teamName: team?.name ?? null,
        position: r.position,
        points: r.points,
        lapTime: r.lapTime,
        fastestLap: r.fastestLap,
        dnf: r.dnf,
        penalties: penalties.map((penalty) => ({
          id: penalty.id,
          type: penalty.penaltyType as "seconds" | "grid" | "points",
          value: penalty.penaltyValue,
          note: penalty.note,
          createdAt: penalty.createdAt?.toISOString() ?? new Date().toISOString(),
        })),
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

    const driverTeamById = new Map<string, string | null>();

    // Verify all drivers exist and belong to this season
    for (const result of input.results) {
      if (result.driverId === UNKNOWN_DRIVER_TOKEN) {
        continue;
      }

      const [driver] = await db
        .select({ id: drivers.id, currentTeamId: drivers.currentTeamId })
        .from(drivers)
        .where(and(eq(drivers.id, result.driverId), eq(drivers.seasonId, seasonId)));
      if (!driver) {
        throw new ValidationError(`Driver '${result.driverId}' not found in this season`);
      }

      driverTeamById.set(driver.id, driver.currentTeamId);
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
    const unknownDriverId = input.results.some((r) => r.driverId === UNKNOWN_DRIVER_TOKEN)
      ? await getOrCreateUnknownDriverId(seasonId)
      : null;

    const normalizedResults = input.results.map((r) => {
      const penalties = r.penalties ?? [];
      const isUnknownDriver = r.driverId === UNKNOWN_DRIVER_TOKEN;
      const dnf = r.dnf ?? false;
      const fastestLap = dnf ? false : r.fastestLap;
      return {
        ...r,
        penalties,
        isUnknownDriver,
        dnf,
        fastestLap,
      };
    });

    const resultValues = normalizedResults.map((r) => {
      const resultId = uuidv4();
      return {
        id: resultId,
        raceId,
        driverId: r.isUnknownDriver ? (unknownDriverId as string) : r.driverId,
        teamId: r.isUnknownDriver ? null : (driverTeamById.get(r.driverId) ?? null),
        position: r.position,
        points: calculatePointsAfterPenalties({
          position: r.position,
          fastestLap: r.fastestLap,
          isUnknownDriver: r.isUnknownDriver,
          dnf: r.dnf,
          penalties: r.penalties,
        }),
        lapTime: r.lapTime ?? null,
        fastestLap: r.fastestLap,
        dnf: r.dnf,
      };
    });

    if (resultValues.length > 0) {
      await db.insert(raceResults).values(resultValues);

      const penaltyValues = normalizedResults.flatMap((result, index) => {
        const raceResultId = resultValues[index].id;
        return result.penalties.map((penalty) => ({
          id: uuidv4(),
          raceResultId,
          penaltyType: penalty.type,
          penaltyValue: penalty.value,
          note: penalty.note ?? null,
        }));
      });

      if (penaltyValues.length > 0) {
        await db.insert(raceResultPenalties).values(penaltyValues);
      }
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
      const driverTeamById = new Map<string, string | null>();

      // Verify all drivers
      for (const result of input.results) {
        if (result.driverId === UNKNOWN_DRIVER_TOKEN) {
          continue;
        }

        const [driver] = await db
          .select({ id: drivers.id, currentTeamId: drivers.currentTeamId })
          .from(drivers)
          .where(and(eq(drivers.id, result.driverId), eq(drivers.seasonId, race.seasonId)));
        if (!driver) {
          throw new ValidationError(`Driver '${result.driverId}' not found in this season`);
        }

        driverTeamById.set(driver.id, driver.currentTeamId);
      }

      // Delete old results and insert new ones
      await db.delete(raceResults).where(eq(raceResults.raceId, raceId));

      const unknownDriverId = input.results.some((r) => r.driverId === UNKNOWN_DRIVER_TOKEN)
        ? await getOrCreateUnknownDriverId(race.seasonId)
        : null;

      const normalizedResults = input.results.map((r) => {
        const penalties = r.penalties ?? [];
        const isUnknownDriver = r.driverId === UNKNOWN_DRIVER_TOKEN;
        const dnf = r.dnf ?? false;
        const fastestLap = dnf ? false : r.fastestLap;
        return {
          ...r,
          penalties,
          isUnknownDriver,
          dnf,
          fastestLap,
        };
      });

      const resultValues = normalizedResults.map((r) => {
        const resultId = uuidv4();
        return {
          id: resultId,
          raceId,
          driverId: r.isUnknownDriver ? (unknownDriverId as string) : r.driverId,
          teamId: r.isUnknownDriver ? null : (driverTeamById.get(r.driverId) ?? null),
          position: r.position,
          points: calculatePointsAfterPenalties({
            position: r.position,
            fastestLap: r.fastestLap,
            isUnknownDriver: r.isUnknownDriver,
            dnf: r.dnf,
            penalties: r.penalties,
          }),
          lapTime: r.lapTime ?? null,
          fastestLap: r.fastestLap,
          dnf: r.dnf,
        };
      });

      if (resultValues.length > 0) {
        await db.insert(raceResults).values(resultValues);

        const penaltyValues = normalizedResults.flatMap((result, index) => {
          const raceResultId = resultValues[index].id;
          return result.penalties.map((penalty) => ({
            id: uuidv4(),
            raceResultId,
            penaltyType: penalty.type,
            penaltyValue: penalty.value,
            note: penalty.note ?? null,
          }));
        });

        if (penaltyValues.length > 0) {
          await db.insert(raceResultPenalties).values(penaltyValues);
        }
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
