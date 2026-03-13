import { NextResponse } from "next/server";
import { apiHandler, optionsHandler } from "@/server/middleware/apiHandler";
import { successResponse } from "@/server/domain/dto";
import { requireLeagueRole, requireUserId } from "@/server/auth/guards";
import { teamService } from "@/server/services/teamService";

export const GET = apiHandler({
  handler: async (_req, ctx) => {
    const userId = await requireUserId();
    await requireLeagueRole(ctx.params.leagueId, userId, "member");

    const rankings = await teamService.listRankingsBySeason(
      ctx.params.leagueId,
      ctx.params.seasonId,
    );

    return NextResponse.json(successResponse(rankings));
  },
});

export const OPTIONS = optionsHandler();
