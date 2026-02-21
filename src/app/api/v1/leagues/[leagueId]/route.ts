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
import { ROLES } from "@/server/domain/constants";

export const GET = apiHandler({
  handler: async (_req, ctx) => {
    const league = await leagueService.getById(ctx.params.leagueId);
    return NextResponse.json(successResponse(league));
  },
});

export const PUT = apiHandler<UpdateLeagueInput>({
  role: ROLES.ADMIN,
  bodySchema: updateLeagueSchema,
  handler: async (_req, ctx, body) => {
    const league = await leagueService.update(ctx.params.leagueId, body);
    return NextResponse.json(successResponse(league));
  },
});

export const DELETE = apiHandler({
  role: ROLES.ADMIN,
  handler: async (_req, ctx) => {
    await leagueService.delete(ctx.params.leagueId);
    return NextResponse.json(successResponse({ deleted: true }));
  },
});

export const OPTIONS = optionsHandler();
