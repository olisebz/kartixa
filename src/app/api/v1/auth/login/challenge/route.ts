import { NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { eq } from "drizzle-orm";
import { apiHandler, optionsHandler } from "@/server/middleware/apiHandler";
import { successResponse } from "@/server/domain/dto";
import {
  startLoginChallengeSchema,
  type StartLoginChallengeInput,
} from "@/server/domain/schemas";
import { getDb } from "@/server/db";
import { users } from "@/server/db/schema";
import { authSecurityService } from "@/server/services/authSecurityService";
import { UnauthorizedError } from "@/server/domain/errors";

export const POST = apiHandler<StartLoginChallengeInput>({
  bodySchema: startLoginChallengeSchema,
  handler: async (_req, _ctx, body) => {
    const db = getDb();
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        passwordHash: users.passwordHash,
        emailVerifiedAt: users.emailVerifiedAt,
      })
      .from(users)
      .where(eq(users.email, body.email));

    if (!user) {
      throw new UnauthorizedError("Invalid login credentials");
    }

    const ok = await compare(body.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedError("Invalid login credentials");
    }

    const trustedDevice = await authSecurityService.isTrustedDevice(user.id, body.deviceId);
    const requiresVerification = !user.emailVerifiedAt || !trustedDevice;

    if (!requiresVerification) {
      return NextResponse.json(
        successResponse({
          requiresVerification: false,
          challengeId: null,
          expiresAt: null,
        })
      );
    }

    const challenge = await authSecurityService.startNewDeviceChallenge({
      userId: user.id,
      email: user.email,
      deviceId: body.deviceId,
    });

    return NextResponse.json(
      successResponse({
        requiresVerification: true,
        challengeId: challenge.challengeId,
        expiresAt: challenge.expiresAt,
      })
    );
  },
});

export const OPTIONS = optionsHandler();
