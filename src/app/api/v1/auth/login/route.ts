/**
 * POST /api/v1/auth/login — Authenticate with email + password
 */

import { NextResponse } from "next/server";
import { apiHandler, optionsHandler } from "@/server/middleware/apiHandler";
import { userService } from "@/server/services/userService";
import { loginSchema, type LoginInput } from "@/server/domain/schemas";
import { successResponse } from "@/server/domain/dto";

export const POST = apiHandler<LoginInput>({
  bodySchema: loginSchema,
  handler: async (_req, _ctx, body) => {
    const result = await userService.login(body.email, body.password);
    return NextResponse.json(successResponse(result));
  },
});

export const OPTIONS = optionsHandler();
