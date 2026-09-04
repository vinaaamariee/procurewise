import { defineConfig } from "drizzle-kit";

const password = process.env.SUPABASE_DB_PASSWORD;
const configuredConnectionString = process.env.SUPABASE_DATABASE_URL;
if (!configuredConnectionString && !password) throw new Error("SUPABASE_DATABASE_URL or SUPABASE_DB_PASSWORD is required to run Supabase PostgreSQL Drizzle commands.");

const connectionString = configuredConnectionString ?? `postgresql://postgres.wchgxpvviebvwuhrsrvj:${encodeURIComponent(password as string)}@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres`;

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle/pg-migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: connectionString,
  },
});
