/**
 * GET  /api/v1/leagues/:leagueId/seasons/:seasonId/drivers        — List drivers
 * POST /api/v1/leagues/:leagueId/seasons/:seasonId/drivers        — Add driver (admin)
 */

import { NextResponse } from "next/server";
import { apiHandler, optionsHandler } from "@/server/middleware/apiHandler";
import { driverService } from "@/server/services/driverService";
import { createDriverSchema, type CreateDriverInput } from "@/server/domain/schemas";
import { successResponse } from "@/server/domain/dto";
import { requireLeagueRole, requireUserId } from "@/server/auth/guards";

export const GET = apiHandler({
  handler: async (_req, ctx) => {
    const userId = await requireUserId();
    await requireLeagueRole(ctx.params.leagueId, userId, "member");
    const drivers = await driverService.listBySeason(
      ctx.params.leagueId,
      ctx.params.seasonId
    );
    return NextResponse.json(successResponse(drivers));
  },
});

export const POST = apiHandler<CreateDriverInput>({
  bodySchema: createDriverSchema,
  handler: async (_req, ctx, body) => {
    const userId = await requireUserId();
    await requireLeagueRole(ctx.params.leagueId, userId, "admin");
    const driver = await driverService.create(
      ctx.params.leagueId,
      ctx.params.seasonId,
      body
    );
    return NextResponse.json(successResponse(driver), { status: 201 });
  },
});

export const OPTIONS = optionsHandler();
