import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "..");
const workflow = readFileSync(resolve(projectRoot, ".github/workflows/ci.yml"), "utf8");
const readme = readFileSync(resolve(projectRoot, "README.md"), "utf8");

describe("repository automation and external authentication documentation", () => {
  it("keeps the CI quality checks on pushes and pull requests without exposing integration secrets to pull requests", () => {
    expect(workflow).toContain("push:");
    expect(workflow).toContain("pull_request:");
    expect(workflow).toContain("pnpm check");
    expect(workflow).toContain("pnpm vitest run");
    expect(workflow).toContain("github.event_name == 'push'");
    expect(workflow).toContain("CI_SUPABASE_SERVICE_ROLE_KEY");
  });

  it("documents Supabase Auth deployment, environment boundaries, and role-preserving sign-in verification", () => {
    expect(readme).toContain("## Vercel and Supabase Auth deployment");
    expect(readme).toContain("VITE_SUPABASE_ANON_KEY");
    expect(readme).toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(readme).toContain("Authentication → URL Configuration");
    expect(readme).toContain("retains its assigned");
    expect(readme).toContain("## GitHub Actions continuous integration");
  });
});
