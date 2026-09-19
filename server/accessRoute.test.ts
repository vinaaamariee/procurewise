import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "..");
const accessSource = readFileSync(resolve(projectRoot, "client/src/pages/Access.tsx"), "utf8");
const appSource = readFileSync(resolve(projectRoot, "client/src/App.tsx"), "utf8");

describe("ProcureWise account access", () => {
  it("provides a public End-User registration path and registers the access route", () => {
    expect(accessSource).toContain("Create End-User account");
    expect(accessSource).toContain("New profiles begin as End-Users");
    expect(accessSource).toContain("supabaseAuth.auth.signInWithPassword");
    expect(accessSource).toContain("supabaseAuth.auth.signUp");
    expect(accessSource).toContain('get("mode")');
    expect(accessSource).toContain("lg:grid-cols-[1.05fr_0.95fr]");
    expect(accessSource).toContain("sm:text-5xl");
    expect(appSource).toContain('<Route path={"/access"} component={Access} />');
  });
});
