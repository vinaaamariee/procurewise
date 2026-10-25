import { sql } from "drizzle-orm";
import { extractSupabaseProjectRef, getDb } from "../db";

const projectRef = extractSupabaseProjectRef;

/** Logs startup problems that otherwise surface only as "could not load your workspace profile". */
export async function checkSupabaseConfig() {
  const authRef = projectRef(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL);
  const databaseRef = projectRef(process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL);
  if (!authRef) console.error("[Config] Supabase URL is missing or not a Supabase project URL.");
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) console.warn("[Config] SUPABASE_SERVICE_ROLE_KEY is not set; the server will fall back to the anon key.");
  if (authRef && databaseRef && authRef !== databaseRef) {
    console.error(`[Config] Supabase project mismatch: Auth is ${authRef} but the database URL is ${databaseRef}. Sign-in will succeed but no workspace profile can be loaded.`);
  }
  try {
    const db = await getDb();
    if (!db) throw new Error("no database connection is configured");
    await db.execute(sql`select 1 from procurewise.users limit 1`);
    console.log(`[Config] Supabase project ${authRef ?? "unknown"}: database reachable, procurewise.users found.`);
  } catch (error) {
    console.error("[Config] Database check failed; sign-in will not load profiles:", error instanceof Error ? error.message : error);
  }
}
