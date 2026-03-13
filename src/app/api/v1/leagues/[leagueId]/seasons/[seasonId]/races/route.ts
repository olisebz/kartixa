/**
 * GET  /api/v1/leagues/:leagueId/seasons/:seasonId/races  — List races for a season
 * POST /api/v1/leagues/:leagueId/seasons/:seasonId/races  — Create a race (admin)
 */

import { NextResponse } from "next/server";
import { apiHandler, optionsHandler } from "@/server/middleware/apiHandler";
import { raceService } from "@/server/services/raceService";
import { createRaceSchema, type CreateRaceInput } from "@/server/domain/schemas";
import { successResponse } from "@/server/domain/dto";
import { requireLeagueRole, requireUserId } from "@/server/auth/guards";

export const GET = apiHandler({
  handler: async (_req, ctx) => {
    const userId = await requireUserId();
    await requireLeagueRole(ctx.params.leagueId, userId, "member");
    const races = await raceService.listBySeason(
      ctx.params.leagueId,
      ctx.params.seasonId
    );
    return NextResponse.json(successResponse(races));
  },
});

export const POST = apiHandler<CreateRaceInput>({
  bodySchema: createRaceSchema,
  handler: async (_req, ctx, body) => {
    const userId = await requireUserId();
    await requireLeagueRole(ctx.params.leagueId, userId, "admin");
    const race = await raceService.create(
      ctx.params.leagueId,
      ctx.params.seasonId,
      body
    );
    return NextResponse.json(successResponse(race), { status: 201 });
  },
});

export const OPTIONS = optionsHandler();
