import { NextResponse } from "next/server";
import { apiHandler, optionsHandler } from "@/server/middleware/apiHandler";
import { successResponse } from "@/server/domain/dto";
import {
  confirmPasswordChangeSchema,
  type ConfirmPasswordChangeInput,
} from "@/server/domain/schemas";
import { requireCurrentAuthSessionId, requireUserId } from "@/server/auth/guards";
import { userService } from "@/server/services/userService";
import { authSecurityService } from "@/server/services/authSecurityService";

export const POST = apiHandler<ConfirmPasswordChangeInput>({
  bodySchema: confirmPasswordChangeSchema,
  handler: async (_req, _ctx, body) => {
    const userId = await requireUserId();
    const currentSessionId = await requireCurrentAuthSessionId();
    const profile = await userService.getById(userId);

    await authSecurityService.confirmPasswordChange({
      userId,
      email: profile.email,
      challengeId: body.challengeId,
      code: body.code,
      newPassword: body.newPassword,
      keepSessionId: currentSessionId,
    });

    return NextResponse.json(successResponse({ updated: true }));
  },
});

export const OPTIONS = optionsHandler();
