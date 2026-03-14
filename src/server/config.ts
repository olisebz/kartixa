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
    ssl: envBool("DATABASE_SSL", false),
  },

  /** Comma-separated allowed origins */
  corsOrigins: env("CORS_ORIGINS", "http://localhost:3000"),

  rateLimiting: {
    maxRequests: envInt("RATE_LIMIT_MAX", 100),
    windowMs: envInt("RATE_LIMIT_WINDOW_MS", 60000),
  },

  auth: {
    challengeSecret: env("AUTH_CHALLENGE_SECRET", env("AUTH_SECRET", "kartixa-dev-auth-secret")),
    emailCodeTtlMinutes: envInt("AUTH_EMAIL_CODE_TTL_MINUTES", 10),
    sessionTtlDays: envInt("AUTH_SESSION_TTL_DAYS", 30),
    storeSessionIpAddress: envBool("AUTH_STORE_SESSION_IP_ADDRESS", false),
    storeSessionUserAgent: envBool("AUTH_STORE_SESSION_USER_AGENT", true),
    sessionMetadataRetentionDays: envInt("AUTH_SESSION_METADATA_RETENTION_DAYS", 90),
    trustedDeviceRetentionDays: envInt("AUTH_TRUSTED_DEVICE_RETENTION_DAYS", 180),
    challengeRetentionDays: envInt("AUTH_CHALLENGE_RETENTION_DAYS", 7),
  },

  mail: {
    enabled: envBool("MAIL_ENABLED", false),
    host: env("SMTP_HOST", "localhost"),
    port: envInt("SMTP_PORT", 1025),
    secure: envBool("SMTP_SECURE", false),
    user: env("SMTP_USER", ""),
    password: env("SMTP_PASSWORD", ""),
    from: env("MAIL_FROM", "Kartixa <no-reply@kartixa.local>"),
  },

} as const;
