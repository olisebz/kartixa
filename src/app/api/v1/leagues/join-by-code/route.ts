import { NextResponse } from "next/server";
import { apiHandler, optionsHandler } from "@/server/middleware/apiHandler";
import { errorResponse, successResponse } from "@/server/domain/dto";
import { joinByCodeSchema, type JoinByCodeInput } from "@/server/domain/schemas";
import { requireUserId } from "@/server/auth/guards";
import { leagueAccessService } from "@/server/services/leagueAccessService";
import { checkScopedRateLimit } from "@/server/middleware/rateLimit";

export const POST = apiHandler<JoinByCodeInput>({
  bodySchema: joinByCodeSchema,
  handler: async (req, _ctx, body) => {
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      "unknown";

    const joinLimit = await checkScopedRateLimit("join-by-code", clientIp, 10, 60_000);
    if (!joinLimit.allowed) {
      const response = NextResponse.json(
        errorResponse("RATE_LIMITED", "Too many join attempts. Please try again shortly."),
        { status: 429 }
      );
      response.headers.set("Retry-After", String(Math.ceil(joinLimit.retryAfterMs / 1000)));
      return response;
    }

    const userId = await requireUserId();
    const joined = await leagueAccessService.joinByCode(userId, body.code);
    return NextResponse.json(successResponse(joined), { status: 201 });
  },
});

export const OPTIONS = optionsHandler();
