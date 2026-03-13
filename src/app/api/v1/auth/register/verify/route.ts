import { NextResponse } from "next/server";
import { apiHandler, optionsHandler } from "@/server/middleware/apiHandler";
import { successResponse } from "@/server/domain/dto";
import { verifyRegisterSchema, type VerifyRegisterInput } from "@/server/domain/schemas";
import { authSecurityService } from "@/server/services/authSecurityService";

export const POST = apiHandler<VerifyRegisterInput>({
  bodySchema: verifyRegisterSchema,
  handler: async (_req, _ctx, body) => {
    const user = await authSecurityService.consumeRegisterChallenge(body);
    return NextResponse.json(successResponse(user), { status: 201 });
  },
});

export const OPTIONS = optionsHandler();
