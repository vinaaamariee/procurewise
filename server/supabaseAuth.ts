import { createClient } from "@supabase/supabase-js";
import type { User } from "../drizzle/schema";
import { upsertSupabaseAuthUser } from "./db";

type AuthRequest = { headers: { authorization?: string } };

function getBearerToken(req: AuthRequest) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length).trim();
  return token || null;
}

function getAuthClient() {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.error("[SupabaseAuth] Missing env vars — VITE_SUPABASE_URL:", Boolean(url), "key (service role or anon):", Boolean(key));
    return null;
  }
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

/** Verify the caller's Supabase access token and map it to a ProcureWise user. */
type AuthClient = {
  getUser: (jwt: string) => Promise<{
    data: { user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> } | null };
    error: { message: string } | null;
  }>;
};

export async function authenticateSupabaseRequest(req: AuthRequest): Promise<User | null> {
  const token = getBearerToken(req);
  const client = getAuthClient();
  if (!token || !client) return null;

  const { data, error } = await (client.auth as unknown as AuthClient).getUser(token);
  if (error) {
    // Throw so context.ts captures this as dbError and surfaces it to the client.
    // Common causes: SUPABASE_SERVICE_ROLE_KEY is wrong or missing in Vercel env vars.
    console.error("[SupabaseAuth] getUser error:", error.message);
    throw new Error(`Supabase API error: ${error.message}. Check SUPABASE_SERVICE_ROLE_KEY in Vercel environment variables.`);
  }
  if (!data.user) return null;

  const fullName = typeof data.user.user_metadata?.full_name === "string"
    ? data.user.user_metadata.full_name
    : typeof data.user.user_metadata?.name === "string"
      ? data.user.user_metadata.name
      : null;

  return upsertSupabaseAuthUser({
    openId: data.user.id,
    email: data.user.email ?? null,
    name: fullName,
  });
}
