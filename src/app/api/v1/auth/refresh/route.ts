/**
 * POST /api/v1/auth/refresh — Get a new access token using a refresh token
 */

import { NextResponse } from "next/server";
import { apiHandler, optionsHandler } from "@/server/middleware/apiHandler";
import { userService } from "@/server/services/userService";
import { refreshSchema, type RefreshInput } from "@/server/domain/schemas";
import { successResponse } from "@/server/domain/dto";

export const POST = apiHandler<RefreshInput>({
  bodySchema: refreshSchema,
  handler: async (_req, _ctx, body) => {
    const result = await userService.refresh(body.refreshToken);
    return NextResponse.json(successResponse(result));
  },
});

export const OPTIONS = optionsHandler();
