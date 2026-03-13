/**
 * Driver Service — Business logic for driver management.
 * Driver stats (points, wins, races) are computed from race results.
 */

import { v4 as uuidv4 } from "uuid";
import { eq, and, count, inArray } from "drizzle-orm";
import { getDb } from "../db";
import { drivers, seasons, teams, raceResults, raceResultPenalties, races } from "../db/schema";
import { NotFoundError, ConflictError } from "../domain/errors";
import { UNKNOWN_DRIVER_NAME, UNKNOWN_DRIVER_NUMBER } from "../domain/constants";
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

    const allSeasonDrivers = await db
      .select()
      .from(drivers)
      .where(eq(drivers.seasonId, seasonId));

    const teamIds = allSeasonDrivers
      .map((driver) => driver.currentTeamId)
      .filter((teamId): teamId is string => Boolean(teamId));

    const teamMap = new Map<string, string>();
    if (teamIds.length > 0) {
      const seasonTeams = await db
        .select({ id: teams.id, name: teams.name })
        .from(teams)
        .where(inArray(teams.id, teamIds));
      for (const team of seasonTeams) {
        teamMap.set(team.id, team.name);
      }
    }

    const seasonDrivers = allSeasonDrivers.filter(
      (driver) =>
        !(driver.name === UNKNOWN_DRIVER_NAME && driver.driverNumber === UNKNOWN_DRIVER_NUMBER)
    );

    const usedNumbers = new Set<number>();
    for (const driver of seasonDrivers) {
      if (driver.driverNumber > 0) {
        usedNumbers.add(driver.driverNumber);
      }
    }

    const getNextNumber = () => {
      let number = 1;
      while (usedNumbers.has(number)) {
        number += 1;
      }
      usedNumbers.add(number);
      return number;
    };

    const result: DriverDTO[] = [];

    for (const driver of seasonDrivers) {
      const driverNumber = driver.driverNumber > 0 ? driver.driverNumber : getNextNumber();

      // Compute stats from race results
      const results = await db
        .select({
          id: raceResults.id,
          points: raceResults.points,
          position: raceResults.position,
        })
        .from(raceResults)
        .where(eq(raceResults.driverId, driver.id));

      const penalties = await db
        .select({
          id: raceResultPenalties.id,
          type: raceResultPenalties.penaltyType,
          value: raceResultPenalties.penaltyValue,
          note: raceResultPenalties.note,
          createdAt: raceResultPenalties.createdAt,
          raceId: races.id,
          raceName: races.name,
          raceDate: races.date,
        })
        .from(raceResultPenalties)
        .innerJoin(raceResults, eq(raceResultPenalties.raceResultId, raceResults.id))
        .innerJoin(races, eq(raceResults.raceId, races.id))
        .where(and(eq(raceResults.driverId, driver.id), eq(races.seasonId, seasonId)));

      const pointsPenalty = penalties
        .filter((penalty) => penalty.type === "points")
        .reduce((sum, penalty) => sum + penalty.value, 0);

      const totalPoints = results.reduce((sum, r) => sum + r.points, 0) - pointsPenalty;
      const raceCount = results.length;
      const wins = results.filter((r) => r.position === 1).length;

      result.push({
        id: driver.id,
        name: driver.name,
        number: driverNumber,
        teamId: driver.currentTeamId,
        teamName: driver.currentTeamId ? teamMap.get(driver.currentTeamId) ?? null : null,
        totalPoints,
        races: raceCount,
        wins,
        penaltiesHistory: penalties
          .slice()
          .sort(
            (a, b) =>
              new Date(b.raceDate).getTime() - new Date(a.raceDate).getTime()
          )
          .map((penalty) => ({
            id: penalty.id,
            raceId: penalty.raceId,
            raceName: penalty.raceName,
            raceDate: penalty.raceDate,
            type: penalty.type as "seconds" | "grid" | "points",
            value: penalty.value,
            note: penalty.note,
            createdAt: penalty.createdAt?.toISOString() ?? new Date().toISOString(),
          })),
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

    if (input.teamId) {
      const [team] = await db
        .select({ id: teams.id })
        .from(teams)
        .where(
          and(
            eq(teams.id, input.teamId),
            eq(teams.leagueId, leagueId),
            eq(teams.isActive, true)
          )
        );
      if (!team) {
        throw new NotFoundError("Team", input.teamId);
      }
    }

    const existingSeasonDrivers = await db
      .select({ id: drivers.id, driverNumber: drivers.driverNumber })
      .from(drivers)
      .where(eq(drivers.seasonId, seasonId));

    const usedNumbers = new Set(
      existingSeasonDrivers
        .map((driver) => driver.driverNumber)
        .filter((number) => number > 0),
    );

    let assignedNumber = input.number;
    if (assignedNumber !== undefined && usedNumbers.has(assignedNumber)) {
      throw new ConflictError("A driver with this number already exists in this season");
    }

    if (assignedNumber === undefined) {
      assignedNumber = 1;
      while (usedNumbers.has(assignedNumber)) {
        assignedNumber += 1;
      }
    }

    const driverId = uuidv4();
    await db.insert(drivers).values({
      id: driverId,
      seasonId,
      name: input.name,
      driverNumber: assignedNumber,
      currentTeamId: input.teamId ?? null,
    });

    let teamName: string | null = null;
    if (input.teamId) {
      const [team] = await db
        .select({ name: teams.name })
        .from(teams)
        .where(eq(teams.id, input.teamId));
      teamName = team?.name ?? null;
    }

    return {
      id: driverId,
      name: input.name,
      number: assignedNumber,
      teamId: input.teamId ?? null,
      teamName,
      totalPoints: 0,
      races: 0,
      wins: 0,
      penaltiesHistory: [],
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

    if (input.name === undefined && input.number === undefined && input.teamId === undefined) {
      throw new ConflictError("No changes provided");
    }

    if (input.teamId) {
      const [team] = await db
        .select({ id: teams.id })
        .from(teams)
        .where(
          and(
            eq(teams.id, input.teamId),
            eq(teams.leagueId, leagueId),
            eq(teams.isActive, true)
          )
        );
      if (!team) {
        throw new NotFoundError("Team", input.teamId);
      }
    }

    if (input.number !== undefined) {
      const [numberConflict] = await db
        .select({ id: drivers.id })
        .from(drivers)
        .where(and(eq(drivers.seasonId, seasonId), eq(drivers.driverNumber, input.number)));

      if (numberConflict && numberConflict.id !== driverId) {
        throw new ConflictError("A driver with this number already exists in this season");
      }
    }

    const updates: Partial<{ name: string; driverNumber: number; currentTeamId: string | null }> = {};
    if (input.name !== undefined) updates.name = input.name;
    if (input.number !== undefined) updates.driverNumber = input.number;
    if (input.teamId !== undefined) updates.currentTeamId = input.teamId;

    await db.update(drivers).set(updates).where(eq(drivers.id, driverId));

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
