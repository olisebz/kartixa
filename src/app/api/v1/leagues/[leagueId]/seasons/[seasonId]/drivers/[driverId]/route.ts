/**
 * PATCH  /api/v1/leagues/:leagueId/seasons/:seasonId/drivers/:driverId  — Rename driver (admin)
 * DELETE /api/v1/leagues/:leagueId/seasons/:seasonId/drivers/:driverId  — Remove driver (admin)
 */

import { NextResponse } from "next/server";
import { apiHandler, optionsHandler } from "@/server/middleware/apiHandler";
import { driverService } from "@/server/services/driverService";
import { updateDriverSchema, type UpdateDriverInput } from "@/server/domain/schemas";
import { successResponse } from "@/server/domain/dto";
import { requireLeagueRole, requireUserId } from "@/server/auth/guards";

export const PATCH = apiHandler<UpdateDriverInput>({
  bodySchema: updateDriverSchema,
  handler: async (_req, ctx, body) => {
    const userId = await requireUserId();
    await requireLeagueRole(ctx.params.leagueId, userId, "admin");
    const driver = await driverService.update(
      ctx.params.leagueId,
      ctx.params.seasonId,
      ctx.params.driverId,
      body
    );
    return NextResponse.json(successResponse(driver));
  },
});

export const DELETE = apiHandler({
  handler: async (_req, ctx) => {
    const userId = await requireUserId();
    await requireLeagueRole(ctx.params.leagueId, userId, "admin");
    await driverService.delete(
      ctx.params.leagueId,
      ctx.params.seasonId,
      ctx.params.driverId
    );
    return NextResponse.json(successResponse({ deleted: true }));
  },
});

export const OPTIONS = optionsHandler();
