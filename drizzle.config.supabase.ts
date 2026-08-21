import { defineConfig } from "drizzle-kit";

const password = process.env.SUPABASE_DB_PASSWORD;
if (!password) throw new Error("SUPABASE_DB_PASSWORD is required for Supabase Drizzle migrations.");

const connectionString = `postgresql://postgres.wchgxpvviebvwuhrsrvj:${encodeURIComponent(password)}@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres`;

export default defineConfig({
  schema: "./drizzle/schema.pg.ts",
  out: "./drizzle/pg-migrations",
  dialect: "postgresql",
  dbCredentials: { url: connectionString },
  strict: true,
  verbose: true,
});
