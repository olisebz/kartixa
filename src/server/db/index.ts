/**
 * Database connection singleton — MariaDB via mysql2 + Drizzle ORM
 *
 * Uses connection pooling. Prepared statements via Drizzle prevent SQL injection.
 */

import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";
import { config } from "../config";
import { logger } from "../logger";

let _pool: mysql.Pool | null = null;

function getPool(): mysql.Pool {
  if (!_pool) {
    _pool = mysql.createPool({
      host: config.db.host,
      port: config.db.port,
      user: config.db.user,
      password: config.db.password,
      database: config.db.database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      // Security: reject unauthorized SSL in prod
      ...(config.isProd ? { ssl: { rejectUnauthorized: true } } : {}),
    });
    logger.info("MariaDB connection pool created", {
      host: config.db.host,
      database: config.db.database,
    });
  }
  return _pool;
}

/** Drizzle ORM instance — use this in services */
export function getDb() {
  return drizzle(getPool(), { schema, mode: "default" });
}

/** Health check: verify DB connectivity */
export async function checkDbHealth(): Promise<boolean> {
  try {
    const pool = getPool();
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    return true;
  } catch (err) {
    logger.error("Database health check failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}
