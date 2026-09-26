import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "..");
const accessSource = readFileSync(resolve(projectRoot, "client/src/pages/Access.tsx"), "utf8");
const appSource = readFileSync(resolve(projectRoot, "client/src/App.tsx"), "utf8");
const mainSource = readFileSync(resolve(projectRoot, "client/src/main.tsx"), "utf8");
const indexCss = readFileSync(resolve(projectRoot, "client/src/index.css"), "utf8");

describe("ProcureWise account access", () => {
  it("provides a public End-User registration path and registers the access route", () => {
    expect(accessSource).toContain("Create End-User account");
    expect(accessSource).toContain("New profiles begin as End-Users");
    expect(accessSource).toContain("supabaseAuth.auth.signInWithPassword");
    expect(accessSource).toContain("supabaseAuth.auth.signUp");
    expect(accessSource).toContain('get("mode")');
    expect(accessSource).toContain("lg:grid-cols-[1.05fr_0.95fr]");
    expect(accessSource).toContain("sm:text-5xl");
    expect(accessSource).toMatch(/\{registration && \(\s*<div>\s*<Label htmlFor="access-office"/);
    expect(mainSource).toContain('window.location.pathname === "/access"');
    expect(indexCss).toContain("input:-webkit-autofill");
    expect(indexCss).toContain("-webkit-box-shadow: 0 0 0 1000px var(--app-surface) inset");
    expect(appSource).toContain('<Route path={"/access"} component={Access} />');
  });
});
