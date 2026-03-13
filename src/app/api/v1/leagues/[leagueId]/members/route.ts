import { NextResponse } from "next/server";
import { apiHandler, optionsHandler } from "@/server/middleware/apiHandler";
import { successResponse } from "@/server/domain/dto";
import { requireLeagueRole, requireUserId } from "@/server/auth/guards";
import { leagueAccessService } from "@/server/services/leagueAccessService";

export const GET = apiHandler({
  handler: async (_req, ctx) => {
    const userId = await requireUserId();
    await requireLeagueRole(ctx.params.leagueId, userId, "admin");

    const members = await leagueAccessService.listMembers(ctx.params.leagueId);
    return NextResponse.json(successResponse(members));
  },
});

export const OPTIONS = optionsHandler();
