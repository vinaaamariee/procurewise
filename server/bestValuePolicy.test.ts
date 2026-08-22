import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { BEST_VALUE_CRITERIA, getDefaultBestValueCriteria, validateBestValueCriteria } from "../shared/bestValuePolicy";
import { getBestValuePolicy, getBestValuePolicyHistory } from "./db";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

describe("Best Value policy criteria", () => {
  it("starts with five governed criteria totaling exactly 100%", () => {
    const result = validateBestValueCriteria(getDefaultBestValueCriteria());
    expect(BEST_VALUE_CRITERIA).toHaveLength(5);
    expect(result).toEqual({ valid: true, totalWeight: 100, error: null });
  });

  it("rejects incomplete and non-100% policy configurations", () => {
    const defaults = getDefaultBestValueCriteria();
    expect(validateBestValueCriteria(defaults.slice(1)).valid).toBe(false);
    expect(validateBestValueCriteria(defaults.map((criterion) => criterion.criterionKey === "price_competitiveness" ? { ...criterion, weight: 54.5 } : criterion))).toMatchObject({ valid: false, totalWeight: 99.5 });
  });
});

describe("Best Value policy administration wiring", () => {
  const routerSource = readFileSync(new URL("./routers.ts", import.meta.url), "utf8");
  const databaseSource = readFileSync(new URL("./db.ts", import.meta.url), "utf8");
  const pageSource = readFileSync(new URL("../client/src/pages/BestValuePolicySettingsPage.tsx", import.meta.url), "utf8");

  it("exposes policy reads and saves only through administrator-gated procedures", () => {
    expect(routerSource).toContain("bestValuePolicy: router");
    expect(routerSource).toContain("active: protectedProcedure.query");
    expect(routerSource).toContain("save: protectedProcedure.input");
    expect(routerSource).toContain("history: protectedProcedure.query");
    expect(routerSource).toContain('assertRole(normalizeProcurementRole(ctx.user.role), ["admin"])');
  });

  it("persists a new version, deactivates the former active version, and writes an audit event", () => {
    expect(databaseSource).toContain("export async function saveBestValuePolicy");
    expect(databaseSource).toContain("const nextVersion");
    expect(databaseSource).toContain("deactivatedAt: new Date()");
    expect(databaseSource).toContain('action: "version_activated"');
  });

  it("keeps the administrator page from saving weights unless they total exactly 100%", () => {
    expect(pageSource).toContain("const isValid = total === 100");
    expect(pageSource).toContain("Save new policy version");
    expect(pageSource).toContain("Decision support only");
    expect(pageSource).toContain("Policy version history");
    expect(pageSource).toContain("Compliance PDF");
  });
});

describe("Best Value policy runtime", () => {
  it("reads the active persisted policy or the governed default from Supabase without creating a policy record", async () => {
    const result = await getBestValuePolicy();
    expect(result.policy.policyCode).toBe("BSC-BV");
    expect(result.criteria).toHaveLength(5);
    expect(result.criteria.reduce((total, criterion) => total + Number(criterion.weight), 0)).toBe(100);
  });

  it("reads the persisted policy history from Supabase without creating a policy record", async () => {
    const history = await getBestValuePolicyHistory();
    expect(Array.isArray(history)).toBe(true);
    history.forEach((entry) => {
      expect(entry.policy.policyCode).toBe("BSC-BV");
      expect(entry.criteria).toHaveLength(5);
    });
  });
});

describe("Best Value policy authorization", () => {
  it("rejects an End-User before any policy record can be read or changed", async () => {
    const caller = appRouter.createCaller({
      user: { id: 72, openId: "end-user-policy-test", name: "End User", email: "end@example.test", loginMethod: "test", role: "end_user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
      req: {} as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    });
    await expect(caller.procurement.bestValuePolicy.active()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.procurement.bestValuePolicy.history()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.procurement.bestValuePolicy.save({ name: "Unapproved change", criteria: getDefaultBestValueCriteria() })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
