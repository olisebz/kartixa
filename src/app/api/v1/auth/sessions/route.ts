import { NextResponse } from "next/server";
import { apiHandler, optionsHandler } from "@/server/middleware/apiHandler";
import { successResponse } from "@/server/domain/dto";
import { requireCurrentAuthSessionId, requireUserId } from "@/server/auth/guards";
import { authSecurityService } from "@/server/services/authSecurityService";
import { revokeSessionSchema, type RevokeSessionInput } from "@/server/domain/schemas";

export const GET = apiHandler({
  handler: async () => {
    const userId = await requireUserId();
    const currentSessionId = await requireCurrentAuthSessionId();
    const sessions = await authSecurityService.listUserSessions(userId);

    return NextResponse.json(
      successResponse(
        sessions.map((sessionRow) => ({
          ...sessionRow,
          isCurrent: sessionRow.id === currentSessionId,
        }))
      )
    );
  },
});

export const DELETE = apiHandler<RevokeSessionInput>({
  bodySchema: revokeSessionSchema,
  handler: async (_req, _ctx, body) => {
    const userId = await requireUserId();
    await authSecurityService.revokeUserSession(userId, body.sessionId);
    return NextResponse.json(successResponse({ revoked: true }));
  },
});

export const OPTIONS = optionsHandler();
