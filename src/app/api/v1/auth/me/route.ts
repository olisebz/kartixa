/**
 * GET  /api/v1/auth/me              — Get current user profile
 * POST /api/v1/auth/me/password     → see password/route.ts
 */

import { NextResponse } from "next/server";
import { apiHandler, optionsHandler } from "@/server/middleware/apiHandler";
import { userService } from "@/server/services/userService";
import { successResponse } from "@/server/domain/dto";
import { AppError } from "@/server/domain/errors";
import { ROLES } from "@/server/domain/constants";

export const GET = apiHandler({
  role: ROLES.ADMIN,
  handler: async (_req, ctx) => {
    if (!ctx.auth.user) {
      throw new AppError("UNAUTHORIZED", "Authentication required");
    }
    const profile = await userService.getProfile(ctx.auth.user.id);
    return NextResponse.json(successResponse(profile));
  },
});

export const OPTIONS = optionsHandler();
