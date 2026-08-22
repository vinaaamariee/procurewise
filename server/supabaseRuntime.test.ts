import { describe, expect, it } from "vitest";
import { procurementSignatories, users } from "../drizzle/schema";
import { getDb, getProcurementDashboard } from "./db";

describe("Supabase PostgreSQL runtime", () => {
  it("loads the migrated PPMP-to-Abstract package through the active Drizzle application client", async () => {
    const db = await getDb();
    expect(db).toBeTruthy();
    const [admin] = await db!.select().from(users).orderBy(users.id).limit(1);
    expect(admin).toBeTruthy();
    const dashboard = await getProcurementDashboard(admin!);
    expect(dashboard.purchaseRequests.some((request) => request.prNumber === "PR-2026-2721129")).toBe(true);
    expect(dashboard.preCanvasses.some((record) => record.preCanvassNumber === "PC-2026-2721324")).toBe(true);
    expect(dashboard.abstractsOfCanvass.some((record) => record.abstractNumber === "AOC-2026-2804717")).toBe(true);
  }, 30_000);

  it("can read the migrated managed Purchase Request signatory register without creating a record", async () => {
    const db = await getDb();
    expect(db).toBeTruthy();
    const signatories = await db!.select({ id: procurementSignatories.id }).from(procurementSignatories).limit(1);
    expect(Array.isArray(signatories)).toBe(true);
  }, 30_000);
});
