import { NextResponse } from "next/server";
import { apiHandler, optionsHandler } from "@/server/middleware/apiHandler";
import { successResponse } from "@/server/domain/dto";
import { updateMembershipRoleSchema, type UpdateMembershipRoleInput } from "@/server/domain/schemas";
import { requireLeagueRole, requireUserId } from "@/server/auth/guards";
import { leagueAccessService } from "@/server/services/leagueAccessService";

export const PATCH = apiHandler<UpdateMembershipRoleInput>({
  bodySchema: updateMembershipRoleSchema,
  handler: async (_req, ctx, body) => {
    const userId = await requireUserId();
    await requireLeagueRole(ctx.params.leagueId, userId, "owner");

    const member = await leagueAccessService.updateMemberRole(
      ctx.params.leagueId,
      ctx.params.memberId,
      body.role
    );

    return NextResponse.json(successResponse(member));
  },
});

export const DELETE = apiHandler({
  handler: async (_req, ctx) => {
    const userId = await requireUserId();
    await requireLeagueRole(ctx.params.leagueId, userId, "admin");

    const result = await leagueAccessService.removeMember(
      ctx.params.leagueId,
      ctx.params.memberId,
    );

    return NextResponse.json(successResponse(result));
  },
});

export const OPTIONS = optionsHandler();
