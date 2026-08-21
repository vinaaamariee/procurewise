import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createPurchaseRequest, listProcurementCatalogItems } from "./db";

describe("ProcureWise PhilGEPS procurement catalog", () => {
  it("retains exactly the validated user-supplied catalog records without product images", () => {
    const items = JSON.parse(readFileSync(new URL("../imports/philgeps_catalog_items.json", import.meta.url), "utf8"));
    expect(items).toHaveLength(242);
    expect(new Set(items.map((item: { productCode: string }) => item.productCode)).size).toBe(242);
    expect(items.every((item: { imageUrl: null }) => item.imageUrl === null)).toBe(true);
    expect(items.find((item: { productCode: string }) => item.productCode === "14111507-PP-C01")).toMatchObject({ description: "PAPER, Multi-Purpose, A4", referencePrice: 139.8 });
  });

  it("returns a bounded, paginated active catalog result for catalog search inputs", async () => {
    const rows = Array.from({ length: 3 }, (_, index) => ({ id: index + 1, productCode: `CODE-${index + 1}`, description: `Catalog item ${index + 1}`, unit: "Piece", referencePrice: "10.00", isActive: 1 }));
    const db = { select: () => ({ from: () => ({ where: () => ({ orderBy: async () => rows }) }) }) } as any;
    const result = await listProcurementCatalogItems({ search: "catalog", page: 2, limit: 2 }, { db });
    expect(result).toMatchObject({ total: 3, page: 2, limit: 2 });
    expect(result.items.map((item) => item.id)).toEqual([3]);
  });

  it("persists an active catalog reference on a Purchase Request item without changing editable request values", async () => {
    const inserts: unknown[] = [];
    let selectCall = 0;
    const db = {
      select: () => {
        const call = selectCall++;
        return { from: () => ({ where: () => call === 0 ? Promise.resolve([{ id: 901 }]) : { limit: async () => [{ id: 77, prNumber: "PR-2026-0001" }] } }) };
      },
      insert: () => ({ values: async (value: unknown) => { inserts.push(value); } }),
    } as any;
    const actor = { id: 9, role: "end_user" } as any;
    await createPurchaseRequest({ purpose: "Acquire A4 paper for approved office activities", officeId: 1, objectOfExpenditureId: 2, items: [{ catalogItemId: 901, stockPropertyNo: "14111507-PP-C01", description: "PAPER, Multi-Purpose, A4", quantity: 4, unit: "REAM", estimatedUnitCost: 150 }] }, actor, { db, recordAudit: async () => undefined });
    expect(inserts).toHaveLength(2);
    expect(inserts[1]).toEqual([expect.objectContaining({ purchaseRequestId: 77, catalogItemId: 901, quantity: "4.00", unit: "REAM", estimatedUnitCost: "150.00", totalCost: "600.00" })]);
  });

  it("wires protected catalog queries, End-User PPMP/PR pickers, and the linked Annex F item schedule", () => {
    const router = readFileSync(new URL("./routers.ts", import.meta.url), "utf8");
    const purchaseRequests = readFileSync(new URL("../client/src/pages/Workspace.tsx", import.meta.url), "utf8");
    const plans = readFileSync(new URL("../client/src/pages/ManagementPages.tsx", import.meta.url), "utf8");
    const workflow = readFileSync(new URL("../client/src/pages/WorkflowPages.tsx", import.meta.url), "utf8");
    expect(router).toContain("catalog: router");
    expect(router).toContain("catalogItemId: z.number().int().positive().optional()");
    expect(purchaseRequests).toContain("Find a PhilGEPS common-use item");
    expect(plans).toContain("PhilGEPS common-use catalog");
    expect(workflow).toContain("Linked End-User item schedule");
  });
});
