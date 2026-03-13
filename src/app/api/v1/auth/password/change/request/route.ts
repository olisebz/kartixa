import { NextResponse } from "next/server";
import { apiHandler, optionsHandler } from "@/server/middleware/apiHandler";
import { successResponse } from "@/server/domain/dto";
import { requireUserId } from "@/server/auth/guards";
import { userService } from "@/server/services/userService";
import { authSecurityService } from "@/server/services/authSecurityService";

export const POST = apiHandler({
  handler: async () => {
    const userId = await requireUserId();
    const profile = await userService.getById(userId);
    const challenge = await authSecurityService.startPasswordChange(userId, profile.email);

    return NextResponse.json(
      successResponse({
        challengeId: challenge.challengeId,
        expiresAt: challenge.expiresAt,
        requiresVerification: true,
      })
    );
  },
});

export const OPTIONS = optionsHandler();
