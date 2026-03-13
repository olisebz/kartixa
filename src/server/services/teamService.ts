import { and, eq } from "drizzle-orm";
import { getDb } from "../db";
import { seasons, teams, races, raceResults } from "../db/schema";
import { NotFoundError } from "../domain/errors";
import type { TeamRankingDTO } from "../domain/dto";

export const teamService = {
  async listRankingsBySeason(
    leagueId: string,
    seasonId: string,
  ): Promise<TeamRankingDTO[]> {
    const db = getDb();

    const [season] = await db
      .select({ id: seasons.id })
      .from(seasons)
      .where(and(eq(seasons.id, seasonId), eq(seasons.leagueId, leagueId)));

    if (!season) {
      throw new NotFoundError("Season", seasonId);
    }

    const leagueTeams = await db
      .select({ id: teams.id, name: teams.name })
      .from(teams)
      .where(eq(teams.leagueId, leagueId));

    const rankings: TeamRankingDTO[] = [];

    for (const team of leagueTeams) {
      const results = await db
        .select({ points: raceResults.points, position: raceResults.position })
        .from(raceResults)
        .innerJoin(races, eq(raceResults.raceId, races.id))
        .where(and(eq(races.seasonId, seasonId), eq(raceResults.teamId, team.id)));

      rankings.push({
        teamId: team.id,
        teamName: team.name,
        points: results.reduce((sum, row) => sum + row.points, 0),
        raceEntries: results.length,
        wins: results.filter((row) => row.position === 1).length,
      });
    }

    return rankings.sort((a, b) => b.points - a.points);
  },
};
