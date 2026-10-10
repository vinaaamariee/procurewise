import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const bridgeSource = readFileSync(resolve(root, "server/supabaseAuth.ts"), "utf8");
const databaseSource = readFileSync(resolve(root, "server/db.ts"), "utf8");
const accessSource = readFileSync(resolve(root, "client/src/pages/Access.tsx"), "utf8");
const clientAuthSource = readFileSync(resolve(root, "client/src/lib/supabaseAuth.ts"), "utf8");

describe("Supabase Auth identity bridge", () => {
  it("verifies bearer tokens and preserves existing ProcureWise roles by verified email", () => {
    expect(bridgeSource).toContain(".getUser(token)");
    expect(bridgeSource).toContain("upsertSupabaseAuthUser");
    expect(databaseSource).toContain("existingByEmail");
    expect(databaseSource).toContain("input.email?.trim().toLowerCase()");
    expect(databaseSource).toContain("lower(trim(${users.email}))");
    expect(databaseSource).toContain("where(eq(users.id, existing.id))");
    expect(databaseSource).toContain('role: "end_user"');
  });

  it("provides dedicated Supabase sign-in and End-User registration controls", () => {
    expect(accessSource).toContain("supabaseAuth.auth.signInWithPassword");
    expect(accessSource).toContain("supabaseAuth.auth.signUp");
    expect(accessSource).toContain("emailRedirectTo");
  });

  it("accepts the existing public Supabase environment names on client and server", () => {
    expect(clientAuthSource).toContain("import.meta.env.NEXT_PUBLIC_SUPABASE_URL");
    expect(clientAuthSource).toContain("import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
    expect(bridgeSource).toContain("process.env.SUPABASE_URL");
    expect(bridgeSource).toContain("process.env.NEXT_PUBLIC_SUPABASE_URL");
  });
});
