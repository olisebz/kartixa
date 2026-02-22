/**
 * POST /api/v1/auth/register — Create a new account
 * POST /api/v1/auth/login    — Login with email + password
 */

import { NextResponse } from "next/server";
import { apiHandler, optionsHandler } from "@/server/middleware/apiHandler";
import { userService } from "@/server/services/userService";
import {
  registerSchema,
  loginSchema,
  type RegisterInput,
  type LoginInput,
} from "@/server/domain/schemas";
import { successResponse } from "@/server/domain/dto";

export const POST = apiHandler<RegisterInput>({
  bodySchema: registerSchema,
  handler: async (_req, _ctx, body) => {
    const result = await userService.register(body);
    return NextResponse.json(successResponse(result), { status: 201 });
  },
});

export const OPTIONS = optionsHandler();
