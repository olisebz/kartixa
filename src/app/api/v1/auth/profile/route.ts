import { NextResponse } from "next/server";
import { apiHandler, optionsHandler } from "@/server/middleware/apiHandler";
import { successResponse } from "@/server/domain/dto";
import {
  updateProfileSchema,
  type UpdateProfileInput,
} from "@/server/domain/schemas";
import { requireUserId } from "@/server/auth/guards";
import { userService } from "@/server/services/userService";

export const GET = apiHandler({
  handler: async () => {
    const userId = await requireUserId();
    const user = await userService.getById(userId);
    return NextResponse.json(successResponse(user));
  },
});

export const PATCH = apiHandler<UpdateProfileInput>({
  bodySchema: updateProfileSchema,
  handler: async (_req, _ctx, body) => {
    const userId = await requireUserId();
    const user = await userService.updateName(userId, body.name);
    return NextResponse.json(successResponse(user));
  },
});

export const OPTIONS = optionsHandler();
