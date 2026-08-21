import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createPurchaseRequest, getCatalogCodeFamily, listProcurementCatalogFavorites, listProcurementCatalogItems, setProcurementCatalogFavorite } from "./db";

describe("ProcureWise common-use procurement catalog", () => {
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

  it("filters catalog records by the source product-code family without inventing descriptive categories", async () => {
    const rows = [
      { id: 1, productCode: "44121708-MP-B01", description: "MARKER", unit: "Piece", referencePrice: "15.84", isActive: 1 },
      { id: 2, productCode: "14111507-PP-C01", description: "PAPER", unit: "REAM", referencePrice: "139.80", isActive: 1 },
    ];
    const db = { select: () => ({ from: () => ({ where: () => ({ orderBy: async () => rows }) }) }) } as any;
    const result = await listProcurementCatalogItems({ codeFamily: "44", limit: 30 }, { db });
    expect(getCatalogCodeFamily(rows[0].productCode)).toBe("44");
    expect(result).toMatchObject({ total: 1 });
    expect(result.items.map((item) => item.id)).toEqual([1]);
  });

  it("keeps favorites scoped to the authenticated user and validates the catalog item before saving", async () => {
    const actor = { id: 12, role: "end_user" } as any;
    let selectCall = 0;
    const favoriteRows = [{ id: 1, userId: 12, catalogItemId: 901 }];
    const catalogRows = [{ id: 901, productCode: "14111507-PP-C01", description: "PAPER, Multi-Purpose, A4", isActive: 1 }];
    const db = {
      select: () => {
        const call = selectCall++;
        return { from: () => ({ where: () => call === 0 ? Promise.resolve(favoriteRows) : call === 1 ? { orderBy: async () => catalogRows } : Promise.resolve([{ id: 901 }]) }) };
      },
      insert: () => ({ values: () => ({ onConflictDoNothing: async () => undefined }) }),
      delete: () => ({ where: async () => undefined }),
    } as any;
    await expect(listProcurementCatalogFavorites(actor, { db })).resolves.toEqual(catalogRows);
    await expect(setProcurementCatalogFavorite({ catalogItemId: 901, isFavorite: true }, actor, { db })).resolves.toEqual({ catalogItemId: 901, isFavorite: true });
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
    const styles = readFileSync(new URL("../client/src/index.css", import.meta.url), "utf8");
    const workflow = readFileSync(new URL("../client/src/pages/WorkflowPages.tsx", import.meta.url), "utf8");
    expect(router).toContain("catalog: router");
    expect(router).toContain("codeFamilies");
    expect(router).toContain("setFavorite");
    expect(router).toContain("catalogItemId: z.number().int().positive().optional()");
    expect(purchaseRequests).toContain("Find a common-use catalog item");
    expect(purchaseRequests).toContain("Source code family");
    expect(purchaseRequests).toContain("Favorites (");
    expect(styles).toContain("Common-use procurement catalog (optional)");
    expect(plans).toContain("All source code families");
    expect(workflow).toContain("Linked End-User item schedule");
  });
});
