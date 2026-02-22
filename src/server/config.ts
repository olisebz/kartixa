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

  auth: {
    /** JWT signing secret (min 32 chars). Required when AUTH_ENABLED=true */
    jwtSecret: env("JWT_SECRET", ""),
    /** HMAC pepper for password hashing. Optional but strongly recommended. */
    pepperSecret: env("PASSWORD_PEPPER", ""),
  },
} as const;

// ============================================================================
// STARTUP VALIDATION
// ============================================================================

if (config.isProd && config.apiKey && config.apiKey.length < 32) {
  console.warn(
    "[SECURITY] API_KEY is shorter than 32 characters. " +
    "Use a strong key: openssl rand -base64 32",
  );
}

if (config.isProd && !config.apiKey && !config.authEnabled) {
  console.warn(
    "[SECURITY] Neither API_KEY nor AUTH_ENABLED is set in production. " +
    "All write endpoints are unprotected!",
  );
}

if (config.authEnabled) {
  if (!config.auth.jwtSecret || config.auth.jwtSecret.length < 32) {
    throw new Error(
      "[SECURITY] AUTH_ENABLED=true requires JWT_SECRET (min 32 chars). " +
      "Generate one: openssl rand -base64 48",
    );
  }
  if (config.isProd && !config.auth.pepperSecret) {
    console.warn(
      "[SECURITY] PASSWORD_PEPPER is not set. Passwords are hashed without pepper. " +
      "Generate one: openssl rand -base64 32",
    );
  }
}
