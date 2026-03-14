import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials: {
    host: process.env.DATABASE_HOST ?? "localhost",
    port: Number(process.env.DATABASE_PORT ?? 3306),
    user: process.env.DATABASE_USER ?? "kartixa",
    password: process.env.DATABASE_PASSWORD ?? "kartixa_dev",
    database: process.env.DATABASE_NAME ?? "kartixa",
  },
});
