import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { authenticateSupabaseRequestWithDiagnostic, type AuthResult } from "../supabaseAuth";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  authDiagnostic?: AuthResult["diagnostic"];
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;
  let authDiagnostic: AuthResult["diagnostic"] = { code: "MISSING_SESSION", message: "No session token provided" };

  try {
    const result = await authenticateSupabaseRequestWithDiagnostic(
      opts.req as unknown as Parameters<typeof authenticateSupabaseRequestWithDiagnostic>[0],
    );
    user = result.user;
    authDiagnostic = result.diagnostic;

    if (!user && authDiagnostic.code !== "MISSING_SESSION") {
      console.warn(`[Auth Context] User profile not resolved: [${authDiagnostic.code}] ${authDiagnostic.message}`);
    }
  } catch (error) {
    // Authentication is optional for public procedures.
    console.error("[Auth Context] Unexpected authentication failure", {
      message: error instanceof Error ? error.message : "Unknown authentication error",
    });
    user = null;
    authDiagnostic = { code: "PROFILE_FAILED", message: error instanceof Error ? error.message : "Unknown error" };
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
    authDiagnostic,
  };
}
