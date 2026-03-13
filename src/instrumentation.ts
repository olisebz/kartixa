/**
 * Runs database migrations once at server startup.
 * Ensures fresh databases are immediately usable in dev and Docker runtime.
 */

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { drizzle } = await import("drizzle-orm/mysql2");
  const { migrate } = await import("drizzle-orm/mysql2/migrator");
  const mysql = await import("mysql2/promise");

  const {
    DATABASE_HOST = "localhost",
    DATABASE_PORT = "3306",
    DATABASE_USER = "kartixa",
    DATABASE_PASSWORD = "kartixa_dev",
    DATABASE_NAME = "kartixa",
    DATABASE_SSL = "false",
  } = process.env;

  let connection: Awaited<ReturnType<typeof mysql.default.createConnection>> | null = null;

  try {
    connection = await mysql.default.createConnection({
      host: DATABASE_HOST,
      port: parseInt(DATABASE_PORT, 10),
      user: DATABASE_USER,
      password: DATABASE_PASSWORD,
      database: DATABASE_NAME,
      multipleStatements: true,
      ...(DATABASE_SSL === "true" ? { ssl: { rejectUnauthorized: true } } : {}),
    });

    const db = drizzle(connection);
    const migrationsFolder = "./drizzle";
    await migrate(db, { migrationsFolder });

    await connection.execute(
      "ALTER TABLE `drivers` ADD COLUMN IF NOT EXISTS `driver_number` int NOT NULL DEFAULT 0",
    );
  } catch (error) {
    console.error("[startup] Database migration failed", error);

    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[startup] Continuing without startup migrations in development. Check DATABASE_HOST and database availability."
      );
      return;
    }

    throw error;
  } finally {
    await connection?.end();
  }
}
