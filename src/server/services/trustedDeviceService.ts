/**
 * Trusted Device Service — Device fingerprinting, trust management, and listing.
 */

import { v4 as uuidv4 } from "uuid";
import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/server/db";
import { userTrustedDevices } from "@/server/db/schema";
import { config } from "@/server/config";
import { normalizeDeviceId } from "@/server/auth/security";

const MAX_USER_AGENT_LENGTH = 255;

function sanitizeUserAgent(userAgent: string | null): string | null {
  if (!config.auth.storeSessionUserAgent || !userAgent) return null;
  const normalized = userAgent.trim();
  if (!normalized) return null;
  return normalized.slice(0, MAX_USER_AGENT_LENGTH);
}

export const trustedDeviceService = {
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
          isNull(userTrustedDevices.revokedAt),
        ),
      );

    return Boolean(device);
  },

  async trustDevice(params: { userId: string; deviceId: string; userAgent: string | null }) {
    const db = getDb();
    const normalizedDeviceId = normalizeDeviceId(params.deviceId);

    const [existing] = await db
      .select({ id: userTrustedDevices.id })
      .from(userTrustedDevices)
      .where(
        and(
          eq(userTrustedDevices.userId, params.userId),
          eq(userTrustedDevices.deviceId, normalizedDeviceId),
        ),
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
};
