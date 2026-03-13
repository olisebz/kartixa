import { NextResponse } from "next/server";
import { apiHandler, optionsHandler } from "@/server/middleware/apiHandler";
import { successResponse } from "@/server/domain/dto";
import {
  requestPasswordResetSchema,
  type RequestPasswordResetInput,
} from "@/server/domain/schemas";
import { authSecurityService } from "@/server/services/authSecurityService";

export const POST = apiHandler<RequestPasswordResetInput>({
  bodySchema: requestPasswordResetSchema,
  handler: async (_req, _ctx, body) => {
    const challenge = await authSecurityService.startPasswordReset(body.email);
    return NextResponse.json(
      successResponse({
        accepted: true,
        challengeId: challenge.challengeId,
        expiresAt: challenge.challengeId ? challenge.expiresAt : null,
      })
    );
  },
});

export const OPTIONS = optionsHandler();
