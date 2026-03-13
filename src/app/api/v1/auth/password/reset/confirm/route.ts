import { NextResponse } from "next/server";
import { apiHandler, optionsHandler } from "@/server/middleware/apiHandler";
import { successResponse } from "@/server/domain/dto";
import {
  confirmPasswordResetSchema,
  type ConfirmPasswordResetInput,
} from "@/server/domain/schemas";
import { authSecurityService } from "@/server/services/authSecurityService";

export const POST = apiHandler<ConfirmPasswordResetInput>({
  bodySchema: confirmPasswordResetSchema,
  handler: async (_req, _ctx, body) => {
    await authSecurityService.confirmPasswordReset(body);
    return NextResponse.json(successResponse({ updated: true }));
  },
});

export const OPTIONS = optionsHandler();
