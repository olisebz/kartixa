/**
 * POST /api/v1/auth/me/password — Change current user's password
 */

import { NextResponse } from "next/server";
import { apiHandler, optionsHandler } from "@/server/middleware/apiHandler";
import { userService } from "@/server/services/userService";
import { changePasswordSchema, type ChangePasswordInput } from "@/server/domain/schemas";
import { successResponse } from "@/server/domain/dto";
import { AppError } from "@/server/domain/errors";
import { ROLES } from "@/server/domain/constants";

export const POST = apiHandler<ChangePasswordInput>({
  role: ROLES.ADMIN,
  bodySchema: changePasswordSchema,
  handler: async (_req, ctx, body) => {
    if (!ctx.auth.user) {
      throw new AppError("UNAUTHORIZED", "Authentication required");
    }
    await userService.changePassword(ctx.auth.user.id, body.oldPassword, body.newPassword);
    return NextResponse.json(successResponse({ changed: true }));
  },
});

export const OPTIONS = optionsHandler();
