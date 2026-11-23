import { createClient } from "@supabase/supabase-js";
import { TRPCError } from "@trpc/server";
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
  const authHeader = Object.entries(headers).find(([k]) => k.toLowerCase() === "authorization")?.[1];
  const authStr = Array.isArray(authHeader) ? authHeader[0] : typeof authHeader === "string" ? authHeader : null;
  if (!authStr) return null;
  const match = authStr.match(/^bearer\s+(\S+)$/i);
  return match ? match[1].trim() : null;
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
    const rawMessage = error instanceof Error ? error.message : "Unknown profile bridge error";
    const cause = error instanceof Error && "cause" in error ? (error.cause as Record<string, unknown> | undefined) : undefined;
    const causeMessage = typeof cause?.message === "string" ? cause.message : "";
    const causeCode = typeof cause?.code === "string" ? cause.code : typeof (error as Record<string, unknown> | undefined)?.code === "string" ? (error as Record<string, unknown>).code as string : "";
    const combinedError = `${rawMessage} ${causeMessage} ${causeCode}`.toLowerCase();

    let code: AuthDiagnosticCode = "PROFILE_FAILED";
    let userFacingMessage = "Database operation failed while loading profile.";

    if (
      causeCode === "42P01" ||
      combinedError.includes("does not exist") ||
      combinedError.includes("42p01")
    ) {
      code = "MISSING_TABLE";
      userFacingMessage = "The workspace users table does not exist in the configured database.";
    } else if (
      causeCode === "28P01" ||
      causeCode === "XX000" ||
      causeCode === "ECONNREFUSED" ||
      causeCode === "ETIMEDOUT" ||
      combinedError.includes("database is unavailable") ||
      combinedError.includes("econnrefused") ||
      combinedError.includes("etimedout") ||
      combinedError.includes("password authentication failed") ||
      combinedError.includes("tenant")
    ) {
      code = "DATABASE_UNAVAILABLE";
      userFacingMessage = "Database connection failed. Please verify that the production database URL and credentials are valid and reachable.";
    }

    console.error("[Supabase Auth] Profile bridge failed", {
      code,
      message: userFacingMessage,
      causeCode,
      causeMessage,
      userId: data.user.id,
      email: data.user.email ? `${data.user.email.slice(0, 2)}***@***` : null,
    });
    return { user: null, diagnostic: { code, message: userFacingMessage } };
  }
}

export async function authenticateSupabaseRequest(req: AuthRequest): Promise<User | null> {
  const result = await authenticateSupabaseRequestWithDiagnostic(req);
  return result.user;
}

export function getSupabaseAdminClient() {
  const url =
    process.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY;
  if (!url || !serviceKey) {
    return null;
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function registerEndUser(input: {
  email: string;
  password: string;
  fullName: string;
  officeName?: string;
}) {
  const normalizedEmail = input.email.trim().toLowerCase();
  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Server admin configuration (SUPABASE_SERVICE_ROLE_KEY) is not set on this environment.",
    });
  }

  // 1. Try finding existing user first to handle previously stuck / unconfirmed accounts
  const { data: listData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
  const existingUser = listData?.users.find(
    (u) => u.email?.toLowerCase() === normalizedEmail
  );

  if (existingUser) {
    if (!existingUser.email_confirmed_at) {
      // User registered previously but confirmation email was never delivered.
      // Auto-confirm the account and sync their latest password and metadata!
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        existingUser.id,
        {
          email_confirm: true,
          password: input.password,
          user_metadata: {
            full_name: input.fullName.trim(),
            office_name: input.officeName?.trim() || null,
            role: "end_user",
          },
        }
      );
      if (updateError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: updateError.message,
        });
      }

      await upsertSupabaseAuthUser({
        openId: existingUser.id,
        email: normalizedEmail,
        name: input.fullName.trim(),
        officeName: input.officeName?.trim() || null,
      });

      return {
        success: true,
        autoConfirmed: true,
        message: "Your account has been confirmed and activated. You can now sign in.",
      };
    } else {
      throw new TRPCError({
        code: "CONFLICT",
        message: "An account with this email is already registered and verified. Please sign in with your password.",
      });
    }
  }

  // 2. Create new user with email_confirm: true so no third-party email delivery is required
  const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email: normalizedEmail,
    password: input.password,
    email_confirm: true,
    user_metadata: {
      full_name: input.fullName.trim(),
      office_name: input.officeName?.trim() || null,
      role: "end_user",
    },
  });

  if (createError) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: createError.message,
    });
  }

  if (!createData.user) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Supabase did not return the created user identity.",
    });
  }

  await upsertSupabaseAuthUser({
    openId: createData.user.id,
    email: normalizedEmail,
    name: input.fullName.trim(),
    officeName: input.officeName?.trim() || null,
  });

  return {
    success: true,
    autoConfirmed: true,
    message: "End-User account created and verified successfully.",
  };
}

export async function confirmUnconfirmedUser(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Server admin configuration (SUPABASE_SERVICE_ROLE_KEY) is not set on this environment.",
    });
  }

  const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
  if (listError) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: listError.message,
    });
  }

  const targetUser = listData?.users.find(
    (u) => u.email?.toLowerCase() === normalizedEmail
  );

  if (!targetUser) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "No registered account found with that email address. Please create an account first.",
    });
  }

  if (!targetUser.email_confirmed_at) {
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      targetUser.id,
      { email_confirm: true }
    );
    if (updateError) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: updateError.message,
      });
    }

    await upsertSupabaseAuthUser({
      openId: targetUser.id,
      email: normalizedEmail,
      name:
        (targetUser.user_metadata?.full_name as string) ||
        (targetUser.user_metadata?.name as string) ||
        null,
      officeName: (targetUser.user_metadata?.office_name as string) || null,
    });

    return {
      success: true,
      confirmed: true,
      message: "Account email confirmed successfully! You can now sign in.",
    };
  }

  return {
    success: true,
    confirmed: false,
    message: "Account is already confirmed. Please sign in with your password.",
  };
}
