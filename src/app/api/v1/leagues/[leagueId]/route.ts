/**
 * GET    /api/v1/leagues/:leagueId  — League detail
 * PUT    /api/v1/leagues/:leagueId  — Update league (admin)
 * DELETE /api/v1/leagues/:leagueId  — Delete league (admin)
 */

import { NextResponse } from "next/server";
import { apiHandler, optionsHandler } from "@/server/middleware/apiHandler";
import { leagueService } from "@/server/services/leagueService";
import { updateLeagueSchema, type UpdateLeagueInput } from "@/server/domain/schemas";
import { successResponse } from "@/server/domain/dto";
import { requireLeagueRole, requireUserId } from "@/server/auth/guards";

export const GET = apiHandler({
  handler: async (_req, ctx) => {
    const userId = await requireUserId();
    await requireLeagueRole(ctx.params.leagueId, userId, "member");
    const league = await leagueService.getById(ctx.params.leagueId, userId);
    return NextResponse.json(successResponse(league));
  },
});

export const PUT = apiHandler<UpdateLeagueInput>({
  bodySchema: updateLeagueSchema,
  handler: async (_req, ctx, body) => {
    const userId = await requireUserId();
    await requireLeagueRole(ctx.params.leagueId, userId, "admin");
    const league = await leagueService.update(ctx.params.leagueId, body, userId);
    return NextResponse.json(successResponse(league));
  },
});

export const DELETE = apiHandler({
  handler: async (_req, ctx) => {
    const userId = await requireUserId();
    await requireLeagueRole(ctx.params.leagueId, userId, "admin");
    await leagueService.delete(ctx.params.leagueId);
    return NextResponse.json(successResponse({ deleted: true }));
  },
});

export const OPTIONS = optionsHandler();
