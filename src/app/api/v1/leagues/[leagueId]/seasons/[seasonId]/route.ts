/**
 * DELETE /api/v1/leagues/:leagueId/seasons/:seasonId  — Delete season (admin)
 */

import { NextResponse } from "next/server";
import { apiHandler, optionsHandler } from "@/server/middleware/apiHandler";
import { successResponse } from "@/server/domain/dto";
import { requireLeagueRole, requireUserId } from "@/server/auth/guards";
import { seasonService } from "@/server/services/seasonService";

export const DELETE = apiHandler({
  handler: async (_req, ctx) => {
    const userId = await requireUserId();
    await requireLeagueRole(ctx.params.leagueId, userId, "admin");

    const result = await seasonService.delete(
      ctx.params.leagueId,
      ctx.params.seasonId,
    );

    return NextResponse.json(successResponse(result));
  },
});

export const OPTIONS = optionsHandler();
