import { NextResponse } from "next/server";
import { apiHandler, optionsHandler } from "@/server/middleware/apiHandler";
import { successResponse } from "@/server/domain/dto";
import { requireLeagueRole, requireUserId } from "@/server/auth/guards";
import { leagueAccessService } from "@/server/services/leagueAccessService";

export const DELETE = apiHandler({
  handler: async (_req, ctx) => {
    const userId = await requireUserId();
    await requireLeagueRole(ctx.params.leagueId, userId, "member");
    const result = await leagueAccessService.leaveLeague(ctx.params.leagueId, userId);
    return NextResponse.json(successResponse(result));
  },
});

export const OPTIONS = optionsHandler();
