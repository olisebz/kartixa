/**
 * Auth Security Service — Session management and data retention.
 * Email challenge logic is in emailChallengeService.
 * Device trust logic is in trustedDeviceService.
 * This service re-exports those for backward compat and manages sessions/cleanup.
 */

import { v4 as uuidv4 } from "uuid";
import { and, eq, gt, isNotNull, isNull, lt, or } from "drizzle-orm";
import { getDb } from "@/server/db";
import { authEmailChallenges, userAuthSessions, userTrustedDevices } from "@/server/db/schema";
import { config } from "@/server/config";
import { logger } from "@/server/logger";
import { hashSessionToken, normalizeDeviceId } from "@/server/auth/security";
import { emailChallengeService } from "./emailChallengeService";
import { trustedDeviceService } from "./trustedDeviceService";

export type { EmailChallengePurpose } from "./emailChallengeService";

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
    if (segments.length === 4) return `${segments[0]}.${segments[1]}.${segments[2]}.0`;
    return normalized;
  }

  if (normalized.includes(":")) {
    const segments = normalized.split(":");
    if (segments.length >= 4) return `${segments.slice(0, 4).join(":")}::`;
    return normalized;
  }

  return normalized;
}

export const authSecurityService = {
  // — Email challenge delegation —
  createEmailChallenge: emailChallengeService.createEmailChallenge.bind(emailChallengeService),
  verifyEmailChallenge: emailChallengeService.verifyEmailChallenge.bind(emailChallengeService),
  consumeRegisterChallenge: emailChallengeService.consumeRegisterChallenge.bind(emailChallengeService),
  startRegisterVerification: emailChallengeService.startRegisterVerification.bind(emailChallengeService),
  startNewDeviceChallenge: emailChallengeService.startNewDeviceChallenge.bind(emailChallengeService),
  consumeNewDeviceChallenge: emailChallengeService.consumeNewDeviceChallenge.bind(emailChallengeService),
  startPasswordReset: emailChallengeService.startPasswordReset.bind(emailChallengeService),
  startPasswordChange: emailChallengeService.startPasswordChange.bind(emailChallengeService),

  async confirmPasswordReset(params: {
    email: string;
    challengeId: string;
    code: string;
    newPassword: string;
  }) {
    const result = await emailChallengeService.confirmPasswordReset(params);
    await this.revokeAllUserSessions(result.userId);
    return { updated: true };
  },

  async confirmPasswordChange(params: {
    userId: string;
    email: string;
    challengeId: string;
    code: string;
    newPassword: string;
    keepSessionId?: string;
  }) {
    await emailChallengeService.confirmPasswordChange(params);
    await this.revokeAllUserSessions(params.userId, params.keepSessionId);
    return { updated: true };
  },

  // — Trusted device delegation —
  isTrustedDevice: trustedDeviceService.isTrustedDevice.bind(trustedDeviceService),
  trustDevice: trustedDeviceService.trustDevice.bind(trustedDeviceService),

  // — Session management —
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
    const expiresAt = new Date(
      now.getTime() + config.auth.sessionTtlDays * 24 * 60 * 60 * 1000,
    );

    await db.insert(userAuthSessions).values({
      id: sessionId,
      userId: params.userId,
      deviceId: normalizeDeviceId(params.deviceId),
      sessionTokenHash: tokenHash,
      userAgent: sanitizeUserAgent(params.userAgent),
      ipAddress: anonymizeIpAddress(params.ipAddress),
      expiresAt,
    });

    return { sessionId, sessionToken: token, expiresAt: expiresAt.toISOString() };
  },

  async validateUserSession(params: { userId: string; sessionId: string }) {
    const db = getDb();
    const [sessionRow] = await db
      .select()
      .from(userAuthSessions)
      .where(
        and(
          eq(userAuthSessions.id, params.sessionId),
          eq(userAuthSessions.userId, params.userId),
        ),
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
          gt(userAuthSessions.expiresAt, now),
        ),
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
      .where(
        and(eq(userAuthSessions.userId, userId), eq(userAuthSessions.id, sessionId)),
      );
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

  // — Data retention cleanup —
  async cleanupAuthDataRetention() {
    const db = getDb();
    const now = new Date();

    const challengeRetentionBefore = new Date(
      now.getTime() - config.auth.challengeRetentionDays * 24 * 60 * 60 * 1000,
    );
    await db.delete(authEmailChallenges).where(
      and(
        lt(authEmailChallenges.expiresAt, now),
        lt(authEmailChallenges.updatedAt, challengeRetentionBefore),
      ),
    );

    const sessionRetentionBefore = new Date(
      now.getTime() - config.auth.sessionMetadataRetentionDays * 24 * 60 * 60 * 1000,
    );
    await db.delete(userAuthSessions).where(
      and(
        lt(userAuthSessions.updatedAt, sessionRetentionBefore),
        or(lt(userAuthSessions.expiresAt, now), isNotNull(userAuthSessions.revokedAt)),
      ),
    );

    const trustedDeviceRetentionBefore = new Date(
      now.getTime() - config.auth.trustedDeviceRetentionDays * 24 * 60 * 60 * 1000,
    );
    await db.delete(userTrustedDevices).where(
      and(
        lt(userTrustedDevices.updatedAt, trustedDeviceRetentionBefore),
        or(
          isNotNull(userTrustedDevices.revokedAt),
          lt(userTrustedDevices.lastUsedAt, trustedDeviceRetentionBefore),
        ),
      ),
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
};
