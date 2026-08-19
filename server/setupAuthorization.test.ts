import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "..");
const setupSource = readFileSync(resolve(projectRoot, "client/src/pages/Setup.tsx"), "utf8");

describe("setup authorization hydration", () => {
  it("waits for a confirmed administrator role before requesting the protected user directory", () => {
    expect(setupSource).toContain('const isAdmin = user?.role === "admin"');
    expect(setupSource).toContain("enabled: Boolean(isAdmin)");
    expect(setupSource).toContain("Only administrators can view or assign workflow roles.");
  });
});
