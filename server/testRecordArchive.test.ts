import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isEligibleTestOnlyPackage } from "./db";

describe("Admin test-record archive safeguards", () => {
  it("requires every test-only marker before a package becomes eligible for archive or cleanup", () => {
    expect(isEligibleTestOnlyPackage({
      description: "TEST ONLY — PPMP to Abstract verification",
      fundSource: "TEST ONLY — Not for obligation",
      remarks: "Explicitly authorised non-operational test record. Do not use for procurement.",
      officeCode: "TEST-PPMP-2026",
      objectCode: "TEST-EO-2026",
    })).toBe(true);
    expect(isEligibleTestOnlyPackage({
      description: "TEST ONLY — mislabeled operational record",
      fundSource: "General Fund",
      remarks: "Operational procurement record",
      officeCode: "BSC-ADMIN",
      objectCode: "MOOE",
    })).toBe(false);
  });

  it("keeps archive and cleanup procedures Admin-only and requires archive before cleanup", () => {
    const router = readFileSync(new URL("./routers.ts", import.meta.url), "utf8");
    const services = readFileSync(new URL("./db.ts", import.meta.url), "utf8");
    expect(router).toContain('testRecords: router');
    expect(router).toContain('assertRole(normalizeProcurementRole(ctx.user.role), ["admin"])');
    expect(services).toContain("Archive the eligible test package before running cleanup.");
    expect(services).toContain("Only clearly labelled non-operational test packages");
  });

  it("renders explicit archive and destructive cleanup controls only in the dedicated administrator workspace", () => {
    const page = readFileSync(new URL("../client/src/pages/TestRecordManagement.tsx", import.meta.url), "utf8");
    expect(page).toContain("Archive test package");
    expect(page).toContain("Clean up test records");
    expect(page).toContain("Operational records are protected");
  });
});
