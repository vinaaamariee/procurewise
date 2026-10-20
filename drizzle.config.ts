import { defineConfig } from "drizzle-kit";

const connectionString =
  process.env.SUPABASE_DATABASE_URL ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL;

if (!connectionString) {
  throw new Error("A PostgreSQL connection string (DATABASE_URL, SUPABASE_DATABASE_URL, or POSTGRES_URL) is required to run Drizzle commands.");
}

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle/pg-migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: connectionString,
  },
});
