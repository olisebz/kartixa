/**
 * Simple in-memory rate limiter using sliding window.
 * For production at scale, replace with Redis-based solution.
 */

import { config } from "../config";

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const store = new Map<string, RateLimitEntry>();

// Cleanup stale entries every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (now - entry.windowStart > config.rateLimiting.windowMs * 2) {
        store.delete(key);
      }
    }
  }, 300_000);
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

export function checkRateLimit(clientId: string): RateLimitResult {
  const now = Date.now();
  const { maxRequests, windowMs } = config.rateLimiting;

  const entry = store.get(clientId);

  if (!entry || now - entry.windowStart > windowMs) {
    // New window
    store.set(clientId, { count: 1, windowStart: now });
    return { allowed: true, remaining: maxRequests - 1, retryAfterMs: 0 };
  }

  if (entry.count >= maxRequests) {
    const retryAfterMs = windowMs - (now - entry.windowStart);
    return { allowed: false, remaining: 0, retryAfterMs };
  }

  entry.count++;
  return { allowed: true, remaining: maxRequests - entry.count, retryAfterMs: 0 };
}
