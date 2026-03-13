import { NextResponse } from "next/server";
import { apiHandler, optionsHandler } from "@/server/middleware/apiHandler";
import { successResponse } from "@/server/domain/dto";
import { registerSchema, type RegisterInput } from "@/server/domain/schemas";
import { authSecurityService } from "@/server/services/authSecurityService";

export const POST = apiHandler<RegisterInput>({
  bodySchema: registerSchema,
  handler: async (_req, _ctx, body) => {
    const challenge = await authSecurityService.startRegisterVerification(body);
    return NextResponse.json(
      successResponse({
        challengeId: challenge.challengeId,
        expiresAt: challenge.expiresAt,
        requiresVerification: true,
      }),
      { status: 201 }
    );
  },
});

export const OPTIONS = optionsHandler();
