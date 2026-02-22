/**
 * Unified API route handler with:
 * - Zod validation
 * - Error handling (AppError → HTTP status)
 * - Security headers
 * - CORS
 * - Request size limits
 * - Structured logging
 * - Auth context resolution + role guard
 *
 * Usage in route.ts:
 *   export const GET = apiHandler({ handler: async (req, ctx) => { ... } });
 */

import { NextRequest, NextResponse } from "next/server";
import { ZodError, ZodSchema } from "zod";
import { AppError, ERROR_STATUS_MAP } from "../domain/errors";
import { errorResponse } from "../domain/dto";
import { config } from "../config";
import { logger } from "../logger";
import { checkRateLimit } from "./rateLimit";
import { resolveAuthContext, requireRole, requirePermission } from "../auth";
import type { AuthContext, Permission } from "../auth";
import type { Role } from "../domain/constants";

// ============================================================================
// TYPES
// ============================================================================

export interface RouteContext {
  params: Record<string, string>;
  /** Auth context for the current request (Phase 1: always anonymous) */
  auth: AuthContext;
}

export interface HandlerConfig<TBody = unknown> {
  /** The main handler function */
  handler: (req: NextRequest, ctx: RouteContext, body: TBody) => Promise<NextResponse>;
  /** Zod schema for request body validation (POST/PUT/PATCH) */
  bodySchema?: ZodSchema<TBody>;
  /** Required role. "public" = no auth, "admin" = API key (Phase 1) / login (Phase 2) */
  role?: Role;
  /** Required permission (more granular than role). Checked in addition to role. */
  permission?: Permission;
  /** Maximum request body size in bytes (default: 100KB) */
  maxBodySize?: number;
}

// ============================================================================
// SECURITY HEADERS
// ============================================================================

function applySecurityHeaders(response: NextResponse): void {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-XSS-Protection", "0"); // Modern browsers use CSP
  if (config.isProd) {
    response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }
}

// ============================================================================
// CORS
// ============================================================================

function applyCorsHeaders(req: NextRequest, response: NextResponse): void {
  const origin = req.headers.get("origin");
  const allowed = config.corsOrigins.split(",").map((s) => s.trim());

  if (origin && (allowed.includes(origin) || allowed.includes("*"))) {
    response.headers.set("Access-Control-Allow-Origin", origin);
  }
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, X-API-Key, Authorization");
  response.headers.set("Access-Control-Max-Age", "86400");
}

// ============================================================================
// HANDLER FACTORY
// ============================================================================

export function apiHandler<TBody = unknown>(cfg: HandlerConfig<TBody>) {
  return async (req: NextRequest, routeCtx: { params: Promise<Record<string, string>> }) => {
    const startTime = Date.now();

    // Resolve params (Next.js 16 async params)
    const params = await routeCtx.params;

    // Build response with headers applied at the end
    try {
      // 1. Rate limiting
      const clientIp =
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        req.headers.get("x-real-ip") ??
        "unknown";
      const rateLimitResult = checkRateLimit(clientIp);
      if (!rateLimitResult.allowed) {
        const res = NextResponse.json(
          errorResponse("RATE_LIMITED", "Too many requests. Please try again later."),
          { status: 429 }
        );
        res.headers.set("Retry-After", String(Math.ceil(rateLimitResult.retryAfterMs / 1000)));
        applySecurityHeaders(res);
        applyCorsHeaders(req, res);
        return res;
      }

      // 2. Auth: resolve context + check role + permission
      const authCtx = await resolveAuthContext(req);
      requireRole(req, authCtx, cfg.role ?? "public");
      if (cfg.permission) {
        requirePermission(req, authCtx, cfg.permission);
      }

      // Build route context (params + auth)
      const ctx: RouteContext = { params, auth: authCtx };

      // 3. Body parsing + validation
      let body = undefined as TBody;
      if (cfg.bodySchema) {
        const contentLength = parseInt(req.headers.get("content-length") ?? "0", 10);
        const maxSize = cfg.maxBodySize ?? 102400; // 100KB default
        if (contentLength > maxSize) {
          throw new AppError("VALIDATION_ERROR", `Request body too large (max ${maxSize} bytes)`);
        }

        const rawBody = await req.json().catch(() => {
          throw new AppError("VALIDATION_ERROR", "Invalid JSON body");
        });
        body = cfg.bodySchema.parse(rawBody);
      }

      // 4. Execute handler
      const response = await cfg.handler(req, ctx, body);

      // 5. Apply headers
      applySecurityHeaders(response);
      applyCorsHeaders(req, response);

      // 6. Log
      const duration = Date.now() - startTime;
      logger.info(`${req.method} ${req.nextUrl.pathname}`, {
        status: response.status,
        duration: `${duration}ms`,
      });

      return response;
    } catch (err) {
      return handleError(req, err, startTime);
    }
  };
}

// ============================================================================
// CORS preflight handler
// ============================================================================

export function optionsHandler() {
  return async (req: NextRequest) => {
    const response = new NextResponse(null, { status: 204 });
    applyCorsHeaders(req, response);
    applySecurityHeaders(response);
    return response;
  };
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

function handleError(req: NextRequest, err: unknown, startTime: number): NextResponse {
  const duration = Date.now() - startTime;

  // Zod validation errors
  if (err instanceof ZodError) {
    const details: Record<string, string> = {};
    for (const issue of err.issues) {
      const path = issue.path.join(".");
      details[path || "body"] = issue.message;
    }

    logger.warn(`Validation error: ${req.method} ${req.nextUrl.pathname}`, {
      duration: `${duration}ms`,
      errors: details,
    });

    const res = NextResponse.json(
      errorResponse("VALIDATION_ERROR", "Invalid request data", details),
      { status: 400 }
    );
    applySecurityHeaders(res);
    applyCorsHeaders(req, res);
    return res;
  }

  // Domain errors
  if (err instanceof AppError) {
    const status = ERROR_STATUS_MAP[err.code] ?? 500;

    if (status >= 500) {
      logger.error(`${err.code}: ${err.message}`, { duration: `${duration}ms` });
    } else {
      logger.warn(`${err.code}: ${err.message}`, { duration: `${duration}ms` });
    }

    const res = NextResponse.json(errorResponse(err.code, err.message, err.details), { status });
    applySecurityHeaders(res);
    applyCorsHeaders(req, res);
    return res;
  }

  // Unknown errors — no stacktrace in prod
  const message = err instanceof Error ? err.message : "Unknown error";
  logger.error(`Unhandled error: ${message}`, {
    duration: `${duration}ms`,
    ...(config.isProd ? {} : { stack: err instanceof Error ? err.stack : undefined }),
  });

  const res = NextResponse.json(
    errorResponse("INTERNAL_ERROR", config.isProd ? "Internal server error" : message),
    { status: 500 }
  );
  applySecurityHeaders(res);
  applyCorsHeaders(req, res);
  return res;
}
