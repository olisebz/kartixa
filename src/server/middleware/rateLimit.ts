/**
 * DB-backed rate limiter using sliding window.
 * Uses the api_rate_limits table for persistent, distributed rate limiting.
 * Falls back to allowing requests if the DB is unavailable (fail-open).
 */

import { eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import { apiRateLimits } from "@/server/db/schema";
import { config } from "../config";
import { logger } from "../logger";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

const FAIL_OPEN: RateLimitResult = { allowed: true, remaining: -1, retryAfterMs: 0 };

async function checkRateLimitInternal(
  key: string,
  maxRequests: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const now = Date.now();
  const db = getDb();

  try {
    const [existing] = await db
      .select()
      .from(apiRateLimits)
      .where(eq(apiRateLimits.key, key));

    if (!existing || now - existing.windowStart > windowMs) {
      // Window expired or no entry — reset to 1
      await db
        .insert(apiRateLimits)
        .values({ key, count: 1, windowStart: now })
        .onDuplicateKeyUpdate({ set: { count: 1, windowStart: now } });
      return { allowed: true, remaining: maxRequests - 1, retryAfterMs: 0 };
    }

    const newCount = existing.count + 1;
    await db
      .update(apiRateLimits)
      .set({ count: newCount })
      .where(eq(apiRateLimits.key, key));

    if (newCount > maxRequests) {
      const retryAfterMs = windowMs - (now - existing.windowStart);
      return { allowed: false, remaining: 0, retryAfterMs };
    }

    return { allowed: true, remaining: maxRequests - newCount, retryAfterMs: 0 };
  } catch (err) {
    logger.warn("Rate limit DB check failed — failing open", {
      key,
      error: err instanceof Error ? err.message : String(err),
    });
    return FAIL_OPEN;
  }
}

export async function checkRateLimit(clientId: string): Promise<RateLimitResult> {
  const { maxRequests, windowMs } = config.rateLimiting;
  return checkRateLimitInternal(`global:${clientId}`, maxRequests, windowMs);
}

export async function checkScopedRateLimit(
  scope: string,
  clientId: string,
  maxRequests: number,
  windowMs: number,
): Promise<RateLimitResult> {
  return checkRateLimitInternal(`${scope}:${clientId}`, maxRequests, windowMs);
}
