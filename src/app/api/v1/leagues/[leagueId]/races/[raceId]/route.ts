/**
 * GET    /api/v1/leagues/:leagueId/races/:raceId  — Race detail
 * PUT    /api/v1/leagues/:leagueId/races/:raceId  — Update race (admin)
 * DELETE /api/v1/leagues/:leagueId/races/:raceId  — Delete race (admin)
 */

import { NextResponse } from "next/server";
import { apiHandler, optionsHandler } from "@/server/middleware/apiHandler";
import { raceService } from "@/server/services/raceService";
import { updateRaceSchema, type UpdateRaceInput } from "@/server/domain/schemas";
import { successResponse } from "@/server/domain/dto";
import { requireLeagueRole, requireUserId } from "@/server/auth/guards";

export const GET = apiHandler({
  handler: async (_req, ctx) => {
    const userId = await requireUserId();
    await requireLeagueRole(ctx.params.leagueId, userId, "member");
    const race = await raceService.getById(ctx.params.leagueId, ctx.params.raceId);
    return NextResponse.json(successResponse(race));
  },
});

export const PUT = apiHandler<UpdateRaceInput>({
  bodySchema: updateRaceSchema,
  handler: async (_req, ctx, body) => {
    const userId = await requireUserId();
    await requireLeagueRole(ctx.params.leagueId, userId, "admin");
    const race = await raceService.update(ctx.params.leagueId, ctx.params.raceId, body);
    return NextResponse.json(successResponse(race));
  },
});

export const DELETE = apiHandler({
  handler: async (_req, ctx) => {
    const userId = await requireUserId();
    await requireLeagueRole(ctx.params.leagueId, userId, "admin");
    await raceService.delete(ctx.params.leagueId, ctx.params.raceId);
    return NextResponse.json(successResponse({ deleted: true }));
  },
});

export const OPTIONS = optionsHandler();
