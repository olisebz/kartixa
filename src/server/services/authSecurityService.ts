import { v4 as uuidv4 } from "uuid";
import { and, eq, gt, isNotNull, isNull, lt, or } from "drizzle-orm";
import { hash } from "bcryptjs";
import { getDb } from "@/server/db";
import {
  authEmailChallenges,
  userAuthSessions,
  userTrustedDevices,
  users,
} from "@/server/db/schema";
import { config } from "@/server/config";
import { logger } from "@/server/logger";
import {
  generateOtpCode,
  hashOtpCode,
  hashSessionToken,
  normalizeDeviceId,
  normalizeEmail,
} from "@/server/auth/security";
import { ConflictError, UnauthorizedError, ValidationError } from "@/server/domain/errors";
import { sendSecurityEmail } from "@/server/services/emailService";

export type EmailChallengePurpose =
  | "register"
  | "new_device"
  | "password_reset"
  | "password_change";

interface CreateEmailChallengeParams {
  userId?: string;
  email: string;
  purpose: EmailChallengePurpose;
  pendingName?: string;
  pendingPasswordHash?: string;
  pendingDeviceId?: string;
}

interface VerifyEmailChallengeParams {
  challengeId: string;
  email: string;
  purpose: EmailChallengePurpose;
  code: string;
  userId?: string;
}

const MAX_CHALLENGE_ATTEMPTS = 6;
const MAX_USER_AGENT_LENGTH = 255;

function sanitizeUserAgent(userAgent: string | null): string | null {
  if (!config.auth.storeSessionUserAgent || !userAgent) return null;
  const normalized = userAgent.trim();
  if (!normalized) return null;
  return normalized.slice(0, MAX_USER_AGENT_LENGTH);
}

function anonymizeIpAddress(ipAddress: string | null): string | null {
  if (!config.auth.storeSessionIpAddress || !ipAddress) return null;
  const normalized = ipAddress.trim();
  if (!normalized) return null;

  if (normalized.includes(".")) {
    const segments = normalized.split(".");
    if (segments.length === 4) {
      return `${segments[0]}.${segments[1]}.${segments[2]}.0`;
    }
    return normalized;
  }

  if (normalized.includes(":")) {
    const segments = normalized.split(":");
    if (segments.length >= 4) {
      return `${segments.slice(0, 4).join(":")}::`;
    }
    return normalized;
  }

  return normalized;
}

export const authSecurityService = {
  async createEmailChallenge(params: CreateEmailChallengeParams) {
    void this.cleanupAuthDataRetentionSafe();

    const db = getDb();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + config.auth.emailCodeTtlMinutes * 60_000);
    const challengeId = uuidv4();
    const code = generateOtpCode(6);
    const codeHash = hashOtpCode(code, challengeId, config.auth.challengeSecret);

    await db.insert(authEmailChallenges).values({
      id: challengeId,
      userId: params.userId,
      email: normalizeEmail(params.email),
      purpose: params.purpose,
      codeHash,
      pendingName: params.pendingName,
      pendingPasswordHash: params.pendingPasswordHash,
      pendingDeviceId: params.pendingDeviceId ? normalizeDeviceId(params.pendingDeviceId) : null,
      expiresAt,
      attemptCount: 0,
    });

    await sendSecurityEmail({
      to: params.email,
      subject: this.getChallengeSubject(params.purpose),
      text: `Your verification code is ${code}. It expires in ${config.auth.emailCodeTtlMinutes} minutes.`,
      html: `<p>Your verification code is <strong>${code}</strong>.</p><p>It expires in ${config.auth.emailCodeTtlMinutes} minutes.</p>`,
    });

    return {
      challengeId,
      expiresAt: expiresAt.toISOString(),
    };
  },

  async verifyEmailChallenge(params: VerifyEmailChallengeParams) {
    const db = getDb();
    const normalizedEmail = normalizeEmail(params.email);

    const [challenge] = await db
      .select()
      .from(authEmailChallenges)
      .where(eq(authEmailChallenges.id, params.challengeId));

    if (!challenge) {
      throw new UnauthorizedError("Verification challenge not found");
    }

    if (challenge.email !== normalizedEmail || challenge.purpose !== params.purpose) {
      throw new UnauthorizedError("Verification challenge mismatch");
    }

    if (params.userId && challenge.userId !== params.userId) {
      throw new UnauthorizedError("Verification challenge mismatch");
    }

    if (challenge.consumedAt) {
      throw new UnauthorizedError("Verification challenge already used");
    }

    const now = new Date();
    if (challenge.expiresAt < now) {
      throw new UnauthorizedError("Verification challenge has expired");
    }

    if (challenge.attemptCount >= MAX_CHALLENGE_ATTEMPTS) {
      throw new UnauthorizedError("Too many verification attempts");
    }

    const candidateHash = hashOtpCode(params.code.trim(), challenge.id, config.auth.challengeSecret);
    if (candidateHash !== challenge.codeHash) {
      await db
        .update(authEmailChallenges)
        .set({ attemptCount: challenge.attemptCount + 1 })
        .where(eq(authEmailChallenges.id, challenge.id));
      throw new UnauthorizedError("Invalid verification code");
    }

    await db
      .update(authEmailChallenges)
      .set({ consumedAt: now, updatedAt: now })
      .where(eq(authEmailChallenges.id, challenge.id));

    return challenge;
  },

  async consumeRegisterChallenge(params: {
    challengeId: string;
    email: string;
    code: string;
  }) {
    const db = getDb();
    const challenge = await this.verifyEmailChallenge({
      challengeId: params.challengeId,
      email: params.email,
      purpose: "register",
      code: params.code,
    });

    if (!challenge.pendingName || !challenge.pendingPasswordHash) {
      throw new ValidationError("Registration challenge is invalid");
    }

    const normalizedEmail = normalizeEmail(params.email);

    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, normalizedEmail));
    if (existing) {
      throw new ConflictError("A user with this email already exists");
    }

    const userId = uuidv4();
    await db.insert(users).values({
      id: userId,
      name: challenge.pendingName,
      email: normalizedEmail,
      passwordHash: challenge.pendingPasswordHash,
      emailVerifiedAt: new Date(),
    });

    if (challenge.pendingDeviceId) {
      await this.trustDevice({
        userId,
        deviceId: challenge.pendingDeviceId,
        userAgent: null,
      });
    }

    return {
      id: userId,
      name: challenge.pendingName,
      email: normalizedEmail,
    };
  },

  async startRegisterVerification(input: {
    name: string;
    email: string;
    password: string;
    deviceId?: string;
  }) {
    const db = getDb();
    const normalizedEmail = normalizeEmail(input.email);

    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, normalizedEmail));
    if (existing) {
      throw new ConflictError("A user with this email already exists");
    }

    const pendingPasswordHash = await hash(input.password, 12);
    return this.createEmailChallenge({
      email: normalizedEmail,
      purpose: "register",
      pendingName: input.name.trim(),
      pendingPasswordHash,
      pendingDeviceId: input.deviceId,
    });
  },

  async isTrustedDevice(userId: string, deviceId: string): Promise<boolean> {
    const db = getDb();
    const normalizedDeviceId = normalizeDeviceId(deviceId);

    const [device] = await db
      .select({ id: userTrustedDevices.id })
      .from(userTrustedDevices)
      .where(
        and(
          eq(userTrustedDevices.userId, userId),
          eq(userTrustedDevices.deviceId, normalizedDeviceId),
          isNull(userTrustedDevices.revokedAt)
        )
      );

    return Boolean(device);
  },

  async trustDevice(params: {
    userId: string;
    deviceId: string;
    userAgent: string | null;
  }) {
    const db = getDb();
    const normalizedDeviceId = normalizeDeviceId(params.deviceId);

    const [existing] = await db
      .select({ id: userTrustedDevices.id })
      .from(userTrustedDevices)
      .where(
        and(
          eq(userTrustedDevices.userId, params.userId),
          eq(userTrustedDevices.deviceId, normalizedDeviceId)
        )
      );

    if (existing) {
      await db
        .update(userTrustedDevices)
        .set({
          revokedAt: null,
          userAgent: sanitizeUserAgent(params.userAgent),
          lastUsedAt: new Date(),
        })
        .where(eq(userTrustedDevices.id, existing.id));
      return existing.id;
    }

    const id = uuidv4();
    await db.insert(userTrustedDevices).values({
      id,
      userId: params.userId,
      deviceId: normalizedDeviceId,
      userAgent: sanitizeUserAgent(params.userAgent),
    });
    return id;
  },

  async createUserSession(params: {
    userId: string;
    deviceId: string;
    userAgent: string | null;
    ipAddress: string | null;
  }) {
    void this.cleanupAuthDataRetentionSafe();

    const db = getDb();
    const token = uuidv4();
    const tokenHash = hashSessionToken(token, config.auth.challengeSecret);
    const sessionId = uuidv4();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + config.auth.sessionTtlDays * 24 * 60 * 60 * 1000);

    await db.insert(userAuthSessions).values({
      id: sessionId,
      userId: params.userId,
      deviceId: normalizeDeviceId(params.deviceId),
      sessionTokenHash: tokenHash,
      userAgent: sanitizeUserAgent(params.userAgent),
      ipAddress: anonymizeIpAddress(params.ipAddress),
      expiresAt,
    });

    return {
      sessionId,
      sessionToken: token,
      expiresAt: expiresAt.toISOString(),
    };
  },

  async validateUserSession(params: {
    userId: string;
    sessionId: string;
  }) {
    const db = getDb();

    const [sessionRow] = await db
      .select()
      .from(userAuthSessions)
      .where(
        and(
          eq(userAuthSessions.id, params.sessionId),
          eq(userAuthSessions.userId, params.userId)
        )
      );

    if (!sessionRow) return null;
    if (sessionRow.revokedAt) return null;
    if (sessionRow.expiresAt < new Date()) return null;

    await db
      .update(userAuthSessions)
      .set({ lastSeenAt: new Date() })
      .where(eq(userAuthSessions.id, sessionRow.id));

    return sessionRow;
  },

  async listUserSessions(userId: string) {
    void this.cleanupAuthDataRetentionSafe();

    const db = getDb();
    const now = new Date();

    const rows = await db
      .select({
        id: userAuthSessions.id,
        deviceId: userAuthSessions.deviceId,
        userAgent: userAuthSessions.userAgent,
        ipAddress: userAuthSessions.ipAddress,
        createdAt: userAuthSessions.createdAt,
        lastSeenAt: userAuthSessions.lastSeenAt,
        expiresAt: userAuthSessions.expiresAt,
      })
      .from(userAuthSessions)
      .where(
        and(
          eq(userAuthSessions.userId, userId),
          isNull(userAuthSessions.revokedAt),
          gt(userAuthSessions.expiresAt, now)
        )
      );

    return rows.map((row) => ({
      id: row.id,
      deviceId: row.deviceId,
      userAgent: row.userAgent,
      ipAddress: row.ipAddress,
      createdAt: row.createdAt.toISOString(),
      lastSeenAt: row.lastSeenAt.toISOString(),
      expiresAt: row.expiresAt.toISOString(),
    }));
  },

  async revokeUserSession(userId: string, sessionId: string) {
    const db = getDb();
    await db
      .update(userAuthSessions)
      .set({ revokedAt: new Date() })
      .where(and(eq(userAuthSessions.userId, userId), eq(userAuthSessions.id, sessionId)));
  },

  async revokeAllUserSessions(userId: string, exceptSessionId?: string) {
    const db = getDb();
    const active = await db
      .select({ id: userAuthSessions.id })
      .from(userAuthSessions)
      .where(and(eq(userAuthSessions.userId, userId), isNull(userAuthSessions.revokedAt)));

    const now = new Date();
    for (const sessionRow of active) {
      if (exceptSessionId && sessionRow.id === exceptSessionId) continue;
      await db
        .update(userAuthSessions)
        .set({ revokedAt: now })
        .where(eq(userAuthSessions.id, sessionRow.id));
    }
  },

  async startNewDeviceChallenge(params: {
    userId: string;
    email: string;
    deviceId: string;
  }) {
    return this.createEmailChallenge({
      userId: params.userId,
      email: params.email,
      purpose: "new_device",
      pendingDeviceId: params.deviceId,
    });
  },

  async consumeNewDeviceChallenge(params: {
    userId: string;
    email: string;
    challengeId: string;
    code: string;
  }) {
    const challenge = await this.verifyEmailChallenge({
      challengeId: params.challengeId,
      email: params.email,
      purpose: "new_device",
      code: params.code,
      userId: params.userId,
    });

    if (!challenge.pendingDeviceId) {
      throw new UnauthorizedError("Device verification challenge is invalid");
    }

    return {
      deviceId: challenge.pendingDeviceId,
    };
  },

  async startPasswordReset(email: string) {
    const db = getDb();
    const normalizedEmail = normalizeEmail(email);
    const [user] = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.email, normalizedEmail));

    if (!user) {
      logger.info("Password reset requested for non-existing email", {
        email: normalizedEmail,
      });
      return {
        challengeId: null,
        expiresAt: null,
      };
    }

    const challenge = await this.createEmailChallenge({
      userId: user.id,
      email: user.email,
      purpose: "password_reset",
    });

    return challenge;
  },

  async confirmPasswordReset(params: {
    email: string;
    challengeId: string;
    code: string;
    newPassword: string;
  }) {
    const db = getDb();
    const normalizedEmail = normalizeEmail(params.email);
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, normalizedEmail));

    if (!user) {
      throw new UnauthorizedError("Invalid reset request");
    }

    await this.verifyEmailChallenge({
      challengeId: params.challengeId,
      email: normalizedEmail,
      purpose: "password_reset",
      code: params.code,
      userId: user.id,
    });

    const passwordHash = await hash(params.newPassword, 12);
    await db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, user.id));

    await this.revokeAllUserSessions(user.id);
    return { updated: true };
  },

  async startPasswordChange(userId: string, email: string) {
    return this.createEmailChallenge({
      userId,
      email,
      purpose: "password_change",
    });
  },

  async confirmPasswordChange(params: {
    userId: string;
    email: string;
    challengeId: string;
    code: string;
    newPassword: string;
    keepSessionId?: string;
  }) {
    const db = getDb();

    await this.verifyEmailChallenge({
      challengeId: params.challengeId,
      email: params.email,
      purpose: "password_change",
      code: params.code,
      userId: params.userId,
    });

    const passwordHash = await hash(params.newPassword, 12);

    await db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, params.userId));

    await this.revokeAllUserSessions(params.userId, params.keepSessionId);

    return { updated: true };
  },

  async cleanupExpiredChallenges() {
    const db = getDb();
    const now = new Date();
    await db
      .delete(authEmailChallenges)
      .where(and(lt(authEmailChallenges.expiresAt, now), isNull(authEmailChallenges.consumedAt)));
  },

  async cleanupAuthDataRetention() {
    const db = getDb();
    const now = new Date();

    const challengeRetentionBefore = new Date(
      now.getTime() - config.auth.challengeRetentionDays * 24 * 60 * 60 * 1000
    );
    await db.delete(authEmailChallenges).where(
      and(
        lt(authEmailChallenges.expiresAt, now),
        lt(authEmailChallenges.updatedAt, challengeRetentionBefore)
      )
    );

    const sessionRetentionBefore = new Date(
      now.getTime() - config.auth.sessionMetadataRetentionDays * 24 * 60 * 60 * 1000
    );
    await db.delete(userAuthSessions).where(
      and(
        lt(userAuthSessions.updatedAt, sessionRetentionBefore),
        or(lt(userAuthSessions.expiresAt, now), isNotNull(userAuthSessions.revokedAt))
      )
    );

    const trustedDeviceRetentionBefore = new Date(
      now.getTime() - config.auth.trustedDeviceRetentionDays * 24 * 60 * 60 * 1000
    );
    await db.delete(userTrustedDevices).where(
      and(
        lt(userTrustedDevices.updatedAt, trustedDeviceRetentionBefore),
        or(
          isNotNull(userTrustedDevices.revokedAt),
          lt(userTrustedDevices.lastUsedAt, trustedDeviceRetentionBefore)
        )
      )
    );
  },

  async cleanupAuthDataRetentionSafe() {
    try {
      await this.cleanupAuthDataRetention();
    } catch (error) {
      logger.warn("Auth data retention cleanup failed", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },

  getChallengeSubject(purpose: EmailChallengePurpose): string {
    switch (purpose) {
      case "register":
        return "Kartixa account verification code";
      case "new_device":
        return "Kartixa new device verification code";
      case "password_reset":
        return "Kartixa password reset code";
      case "password_change":
        return "Kartixa password change verification code";
      default:
        return "Kartixa security verification code";
    }
  },
};
