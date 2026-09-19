import { defineConfig } from "drizzle-kit";
import "dotenv/config";

const connectionString = process.env.SUPABASE_DATABASE_URL;
if (!connectionString) throw new Error("SUPABASE_DATABASE_URL is required for Supabase Drizzle migrations.");

export default defineConfig({
  schema: "./drizzle/schema.pg.ts",
  out: "./drizzle/pg-migrations",
  dialect: "postgresql",
  dbCredentials: { url: connectionString },
  strict: true,
  verbose: true,
});
