import { createClient } from "@supabase/supabase-js";
import type { User } from "../drizzle/schema";
import { upsertSupabaseAuthUser } from "./db";

type AuthRequest = { headers: Record<string, string | string[] | undefined> | { authorization?: string; Authorization?: string } };

export type AuthDiagnosticCode =
  | "AUTHENTICATED"
  | "MISSING_SESSION"
  | "CONFIG_MISSING"
  | "TOKEN_REJECTED"
  | "DATABASE_UNAVAILABLE"
  | "MISSING_TABLE"
  | "PROFILE_FAILED";

export type AuthResult = {
  user: User | null;
  diagnostic: {
    code: AuthDiagnosticCode;
    message: string;
  };
};

function getBearerToken(req: AuthRequest) {
  const headers = (req.headers ?? {}) as Record<string, string | string[] | undefined>;
  const header = headers.authorization || headers.Authorization;
  const authStr = Array.isArray(header) ? header[0] : typeof header === "string" ? header : null;
  if (!authStr?.startsWith("Bearer ")) return null;
  const token = authStr.slice("Bearer ".length).trim();
  return token || null;
}

function getAuthClient() {
  const url =
    process.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    console.warn("[Supabase Auth] Missing server Supabase configuration", {
      hasUrl: Boolean(url),
      hasServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY),
      hasAnonKey: Boolean(process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY),
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

export async function authenticateSupabaseRequestWithDiagnostic(req: AuthRequest): Promise<AuthResult> {
  const token = getBearerToken(req);
  const client = getAuthClient();
  if (!token) {
    return { user: null, diagnostic: { code: "MISSING_SESSION", message: "No bearer token found in request headers." } };
  }
  if (!client) {
    console.error("[Supabase Auth] Configuration missing: ensure Supabase project URL and key are configured.");
    return { user: null, diagnostic: { code: "CONFIG_MISSING", message: "Server Supabase configuration is missing." } };
  }

  const { data, error } = await (client.auth as unknown as AuthClient).getUser(token);
  if (error || !data.user) {
    const errorMsg = error?.message ?? "Supabase returned no user";
    console.warn("[Supabase Auth] Access token verification failed:", errorMsg);
    return { user: null, diagnostic: { code: "TOKEN_REJECTED", message: errorMsg } };
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
    const user = await upsertSupabaseAuthUser({
      openId: data.user.id,
      email: data.user.email ?? null,
      name: fullName,
      officeName,
    });
    return { user, diagnostic: { code: "AUTHENTICATED", message: "User authenticated successfully." } };
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : "Unknown profile bridge error";
    let code: AuthDiagnosticCode = "PROFILE_FAILED";
    if (errMessage.includes("Database is unavailable") || errMessage.includes("ECONNREFUSED") || errMessage.includes("ETIMEDOUT")) {
      code = "DATABASE_UNAVAILABLE";
    } else if (errMessage.includes("does not exist") || errMessage.includes("42P01")) {
      code = "MISSING_TABLE";
    }
    console.error("[Supabase Auth] Profile bridge failed", {
      code,
      message: errMessage,
      userId: data.user.id,
      email: data.user.email ? `${data.user.email.slice(0, 2)}***@***` : null,
    });
    return { user: null, diagnostic: { code, message: errMessage } };
  }
}

export async function authenticateSupabaseRequest(req: AuthRequest): Promise<User | null> {
  const result = await authenticateSupabaseRequestWithDiagnostic(req);
  return result.user;
}
