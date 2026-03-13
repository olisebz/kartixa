import { NextResponse } from "next/server";
import { apiHandler, optionsHandler } from "@/server/middleware/apiHandler";
import { successResponse } from "@/server/domain/dto";
import { requireLeagueRole, requireUserId } from "@/server/auth/guards";
import { leagueAccessService } from "@/server/services/leagueAccessService";

export const PATCH = apiHandler({
  handler: async (_req, ctx) => {
    const userId = await requireUserId();
    await requireLeagueRole(ctx.params.leagueId, userId, "admin");

    const invite = await leagueAccessService.deactivateInviteCode(
      ctx.params.leagueId,
      ctx.params.inviteId
    );

    return NextResponse.json(successResponse(invite));
  },
});

export const OPTIONS = optionsHandler();
