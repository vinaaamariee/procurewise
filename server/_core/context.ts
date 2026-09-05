import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { authenticateSupabaseRequest } from "../supabaseAuth";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  /** Set when Supabase auth succeeded but the database was unavailable. */
  dbError: string | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;
  let dbError: string | null = null;

  try {
    user = await authenticateSupabaseRequest(
      opts.req as unknown as Parameters<typeof authenticateSupabaseRequest>[0],
    );
  } catch (error) {
    // If the request carried a Bearer token but we still got an error, it
    // means Supabase auth itself succeeded but the database was unavailable.
    // Capture the message so auth.me can surface it to the client.
    const authHeader = opts.req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      const message = error instanceof Error ? error.message : "Database is unavailable.";
      dbError = message;
      // Log the full error so it appears in Vercel function logs.
      console.error("[Auth] DB error during Supabase auth bridge:", message);
      console.error("[Auth] Env check — SUPABASE_DATABASE_URL:", Boolean(process.env.SUPABASE_DATABASE_URL),
        "DATABASE_URL:", Boolean(process.env.DATABASE_URL),
        "SUPABASE_DB_PASSWORD:", Boolean(process.env.SUPABASE_DB_PASSWORD),
        "SUPABASE_SERVICE_ROLE_KEY:", Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
        "VITE_SUPABASE_URL:", Boolean(process.env.VITE_SUPABASE_URL));
    }
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
    dbError,
  };
}
