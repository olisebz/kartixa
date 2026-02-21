/**
 * Centralized environment configuration
 * All env access goes through this module — no process.env scattered in code.
 */

function env(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function envInt(key: string, fallback: number): number {
  const raw = process.env[key];
  if (!raw) return fallback;
  const parsed = parseInt(raw, 10);
  if (isNaN(parsed)) throw new Error(`Environment variable ${key} must be a number, got: ${raw}`);
  return parsed;
}

function envBool(key: string, fallback: boolean): boolean {
  const raw = process.env[key];
  if (!raw) return fallback;
  return raw === "true" || raw === "1";
}

export const config = {
  /** Current environment */
  nodeEnv: env("NODE_ENV", "development"),
  isProd: env("NODE_ENV", "development") === "production",

  db: {
    host: env("DATABASE_HOST", "localhost"),
    port: envInt("DATABASE_PORT", 3306),
    user: env("DATABASE_USER", "kartixa"),
    password: env("DATABASE_PASSWORD", "kartixa_dev"),
    database: env("DATABASE_NAME", "kartixa"),
  },

  /** API key for write-endpoint protection. Empty = no protection */
  apiKey: env("API_KEY", ""),

  /** Comma-separated allowed origins */
  corsOrigins: env("CORS_ORIGINS", "http://localhost:3000"),

  rateLimiting: {
    maxRequests: envInt("RATE_LIMIT_MAX", 100),
    windowMs: envInt("RATE_LIMIT_WINDOW_MS", 60000),
  },

  /** Phase 2: Auth feature flag */
  authEnabled: envBool("AUTH_ENABLED", false),
} as const;
