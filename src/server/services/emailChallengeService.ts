/**
 * Email Challenge Service — OTP generation, verification, and flows.
 */

import { v4 as uuidv4 } from "uuid";
import { and, eq, lt, isNull } from "drizzle-orm";
import { hash } from "bcryptjs";
import { getDb } from "@/server/db";
import { authEmailChallenges, userTrustedDevices, users } from "@/server/db/schema";
import { config } from "@/server/config";
import { logger } from "@/server/logger";
import {
  generateOtpCode,
  hashOtpCode,
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

function getChallengeSubject(purpose: EmailChallengePurpose): string {
  switch (purpose) {
    case "register": return "Kartixa account verification code";
    case "new_device": return "Kartixa new device verification code";
    case "password_reset": return "Kartixa password reset code";
    case "password_change": return "Kartixa password change verification code";
    default: return "Kartixa security verification code";
  }
}

export const emailChallengeService = {
  async createEmailChallenge(params: CreateEmailChallengeParams) {
    void this.cleanupExpiredChallengesSafe();

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
      pendingDeviceId: params.pendingDeviceId
        ? normalizeDeviceId(params.pendingDeviceId)
        : null,
      expiresAt,
      attemptCount: 0,
    });

    await sendSecurityEmail({
      to: params.email,
      subject: getChallengeSubject(params.purpose),
      text: `Your verification code is ${code}. It expires in ${config.auth.emailCodeTtlMinutes} minutes.`,
      html: `<p>Your verification code is <strong>${code}</strong>.</p><p>It expires in ${config.auth.emailCodeTtlMinutes} minutes.</p>`,
    });

    return { challengeId, expiresAt: expiresAt.toISOString() };
  },

  async verifyEmailChallenge(params: VerifyEmailChallengeParams) {
    const db = getDb();
    const normalizedEmail = normalizeEmail(params.email);

    const [challenge] = await db
      .select()
      .from(authEmailChallenges)
      .where(eq(authEmailChallenges.id, params.challengeId));

    if (!challenge) throw new UnauthorizedError("Verification challenge not found");
    if (challenge.email !== normalizedEmail || challenge.purpose !== params.purpose)
      throw new UnauthorizedError("Verification challenge mismatch");
    if (params.userId && challenge.userId !== params.userId)
      throw new UnauthorizedError("Verification challenge mismatch");
    if (challenge.consumedAt)
      throw new UnauthorizedError("Verification challenge already used");

    const now = new Date();
    if (challenge.expiresAt < now) throw new UnauthorizedError("Verification challenge has expired");
    if (challenge.attemptCount >= MAX_CHALLENGE_ATTEMPTS)
      throw new UnauthorizedError("Too many verification attempts");

    const candidateHash = hashOtpCode(
      params.code.trim(),
      challenge.id,
      config.auth.challengeSecret,
    );
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

  async consumeRegisterChallenge(params: { challengeId: string; email: string; code: string }) {
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
    if (existing) throw new ConflictError("A user with this email already exists");

    const userId = uuidv4();
    await db.insert(users).values({
      id: userId,
      name: challenge.pendingName,
      email: normalizedEmail,
      passwordHash: challenge.pendingPasswordHash,
      emailVerifiedAt: new Date(),
    });

    if (challenge.pendingDeviceId) {
      await db.insert(userTrustedDevices).values({
        id: uuidv4(),
        userId,
        deviceId: challenge.pendingDeviceId,
        userAgent: null,
      });
    }

    return { id: userId, name: challenge.pendingName, email: normalizedEmail };
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
    if (existing) throw new ConflictError("A user with this email already exists");

    const pendingPasswordHash = await hash(input.password, 12);
    return this.createEmailChallenge({
      email: normalizedEmail,
      purpose: "register",
      pendingName: input.name.trim(),
      pendingPasswordHash,
      pendingDeviceId: input.deviceId,
    });
  },

  async startNewDeviceChallenge(params: { userId: string; email: string; deviceId: string }) {
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

    return { deviceId: challenge.pendingDeviceId };
  },

  async startPasswordReset(email: string) {
    const db = getDb();
    const normalizedEmail = normalizeEmail(email);
    const [user] = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.email, normalizedEmail));

    if (!user) {
      logger.info("Password reset requested for non-existing email", { email: normalizedEmail });
      return { challengeId: null, expiresAt: null };
    }

    return this.createEmailChallenge({
      userId: user.id,
      email: user.email,
      purpose: "password_reset",
    });
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

    if (!user) throw new UnauthorizedError("Invalid reset request");

    await this.verifyEmailChallenge({
      challengeId: params.challengeId,
      email: normalizedEmail,
      purpose: "password_reset",
      code: params.code,
      userId: user.id,
    });

    const passwordHash = await hash(params.newPassword, 12);
    await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, user.id));

    return { updated: true, userId: user.id };
  },

  async startPasswordChange(userId: string, email: string) {
    return this.createEmailChallenge({ userId, email, purpose: "password_change" });
  },

  async confirmPasswordChange(params: {
    userId: string;
    email: string;
    challengeId: string;
    code: string;
    newPassword: string;
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

    return { updated: true };
  },

  async cleanupExpiredChallenges() {
    const db = getDb();
    const now = new Date();
    await db
      .delete(authEmailChallenges)
      .where(and(lt(authEmailChallenges.expiresAt, now), isNull(authEmailChallenges.consumedAt)));
  },

  async cleanupExpiredChallengesSafe() {
    try {
      await this.cleanupExpiredChallenges();
    } catch (error) {
      logger.warn("Challenge cleanup failed", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },
};
