/**
 * POST /api/v1/leagues/:leagueId/seasons  — Create a new season (admin)
 */

import { NextResponse } from "next/server";
import { apiHandler, optionsHandler } from "@/server/middleware/apiHandler";
import { seasonService } from "@/server/services/seasonService";
import { createSeasonSchema, type CreateSeasonInput } from "@/server/domain/schemas";
import { successResponse } from "@/server/domain/dto";
import { requireLeagueRole, requireUserId } from "@/server/auth/guards";

export const POST = apiHandler<CreateSeasonInput>({
  bodySchema: createSeasonSchema,
  handler: async (_req, ctx, body) => {
    const userId = await requireUserId();
    await requireLeagueRole(ctx.params.leagueId, userId, "admin");
    const season = await seasonService.create(ctx.params.leagueId, body);
    return NextResponse.json(successResponse(season), { status: 201 });
  },
});

export const OPTIONS = optionsHandler();
