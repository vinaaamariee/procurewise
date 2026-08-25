import { createClient } from "@supabase/supabase-js";
import type { Request as ExpressRequest } from "express";
import type { User } from "../drizzle/schema";
import { upsertSupabaseAuthUser } from "./db";

function getBearerToken(req: ExpressRequest) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length).trim();
  return token || null;
}

function getAuthClient() {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

/** Verify the caller's Supabase access token and map it to a ProcureWise user. */
type AuthClient = {
  getUser: (jwt: string) => Promise<{
    data: { user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> } | null };
    error: { message: string } | null;
  }>;
};

export async function authenticateSupabaseRequest(req: ExpressRequest): Promise<User | null> {
  const token = getBearerToken(req);
  const client = getAuthClient();
  if (!token || !client) return null;

  const { data, error } = await (client.auth as unknown as AuthClient).getUser(token);
  if (error || !data.user) return null;

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
