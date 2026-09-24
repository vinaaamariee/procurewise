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
    console.warn("[Supabase Auth] Missing server Supabase configuration", {
      hasUrl: Boolean(url),
      hasServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      hasAnonKey: Boolean(process.env.VITE_SUPABASE_ANON_KEY),
    });
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
  if (!token) {
    console.warn("[Supabase Auth] Request did not include a bearer token");
    return null;
  }
  if (!client) return null;

  const { data, error } = await (client.auth as unknown as AuthClient).getUser(token);
  if (error || !data.user) {
    console.warn("[Supabase Auth] Access token verification failed", {
      message: error?.message ?? "Supabase returned no user",
    });
    return null;
  }

  const fullName = typeof data.user.user_metadata?.full_name === "string"
    ? data.user.user_metadata.full_name
    : typeof data.user.user_metadata?.name === "string"
      ? data.user.user_metadata.name
      : null;
  const officeName = typeof data.user.user_metadata?.office_name === "string"
    ? data.user.user_metadata.office_name
    : null;

  try {
    return await upsertSupabaseAuthUser({
      openId: data.user.id,
      email: data.user.email ?? null,
      name: fullName,
      officeName,
    });
  } catch (error) {
    console.error("[Supabase Auth] Profile bridge failed", {
      message: error instanceof Error ? error.message : "Unknown profile bridge error",
      userId: data.user.id,
      email: data.user.email ?? null,
    });
    return null;
  }
}
