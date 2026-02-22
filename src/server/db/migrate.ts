/**
 * Database migration runner.
 * Uses drizzle-orm's programmatic migrate() instead of `drizzle-kit push`.
 *
 * Why not `drizzle-kit push`?
 * drizzle-kit push introspects the live DB via fromDatabase() which has a
 * known bug with MariaDB (TypeError: checkConstraint).
 *
 * Workflow:
 *   1. Schema change → npm run db:generate   (creates SQL in drizzle/)
 *   2. Apply to DB   → npm run db:migrate    (this script)
 */

import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import { resolve } from "path";

const DB_CONFIG = {
  host: process.env.DATABASE_HOST ?? "localhost",
  port: Number(process.env.DATABASE_PORT ?? 3306),
  user: process.env.DATABASE_USER ?? "kartixa",
  password: process.env.DATABASE_PASSWORD ?? "kartixa_dev",
  database: process.env.DATABASE_NAME ?? "kartixa",
};

const MIGRATIONS_FOLDER = resolve(process.cwd(), "drizzle");

async function tableExists(conn: mysql.Connection, table: string): Promise<boolean> {
  const [rows] = await conn.query<mysql.RowDataPacket[]>(
    `SELECT COUNT(*) as cnt FROM information_schema.tables
     WHERE table_schema = ? AND table_name = ?`,
    [DB_CONFIG.database, table],
  );
  return (rows[0]?.cnt ?? 0) > 0;
}

async function main() {
  console.log("🗄️  Running database migrations...");

  const connection = await mysql.createConnection(DB_CONFIG);
  const db = drizzle(connection);

  try {
    // Check if the migrations tracking table exists.
    // If it doesn't (or is empty) but the main tables do, we need to baseline
    // so drizzle-orm knows the initial migration was already applied.
    const hasMigrationsTable = await tableExists(connection, "__drizzle_migrations");
    const hasLeaguesTable = await tableExists(connection, "leagues");

    let migrationCount = 0;
    if (hasMigrationsTable) {
      const [rows] = await connection.query<mysql.RowDataPacket[]>(
        "SELECT COUNT(*) as cnt FROM `__drizzle_migrations`",
      );
      migrationCount = (rows[0] as { cnt: number })?.cnt ?? 0;
    }

    const needBaseline = hasLeaguesTable && migrationCount === 0;

    if (needBaseline) {
      console.log("📋 Baselining existing database (marking 0000_init as applied)...");

      const { readFileSync } = await import("fs");
      const { createHash } = await import("crypto");

      const sqlPath = resolve(MIGRATIONS_FOLDER, "0000_init.sql");
      const sqlContent = readFileSync(sqlPath, "utf-8");
      const hash = createHash("sha256").update(sqlContent).digest("hex");

      await connection.query(`
        CREATE TABLE IF NOT EXISTS \`__drizzle_migrations\` (
          id INT AUTO_INCREMENT PRIMARY KEY,
          hash VARCHAR(64) NOT NULL,
          created_at BIGINT
        )
      `);
      await connection.query(
        `INSERT INTO \`__drizzle_migrations\` (hash, created_at) VALUES (?, ?)`,
        [hash, Date.now()],
      );

      console.log("✅ Baseline complete.");
    }

    // Now run all pending migrations (skips anything already tracked)
    await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });

    console.log("✅ Migrations applied successfully.");
  } finally {
    await connection.end();
  }
}

main().catch((err) => {
  console.error("❌ Migration failed:", err.message ?? err);
  process.exit(1);
});
