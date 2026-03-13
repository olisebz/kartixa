import { NextResponse } from "next/server";
import { apiHandler, optionsHandler } from "@/server/middleware/apiHandler";
import { successResponse } from "@/server/domain/dto";
import { createInviteCodeSchema, type CreateInviteCodeInput } from "@/server/domain/schemas";
import { requireLeagueRole, requireUserId } from "@/server/auth/guards";
import { leagueAccessService } from "@/server/services/leagueAccessService";
import { ForbiddenError } from "@/server/domain/errors";

export const POST = apiHandler<CreateInviteCodeInput>({
  bodySchema: createInviteCodeSchema,
  handler: async (_req, ctx, body) => {
    const userId = await requireUserId();
    const role = await requireLeagueRole(ctx.params.leagueId, userId, "admin");

    if (body.roleToGrant === "admin" && role !== "owner") {
      throw new ForbiddenError("Only owner can create admin invite codes");
    }

    const invite = await leagueAccessService.rotateInviteCode(ctx.params.leagueId, userId, body);
    return NextResponse.json(successResponse(invite), { status: 201 });
  },
});

export const OPTIONS = optionsHandler();
