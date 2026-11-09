import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createProcurementCatalogItem, createPurchaseRequest, getCatalogCodeFamily, listProcurementCatalogFavorites, listProcurementCatalogItems, setProcurementCatalogFavorite } from "./db";

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

  it("uses case-insensitive ILIKE conditions for catalog description and product code search", async () => {
    let capturedWhere: any = null;
    const db = {
      select: () => ({
        from: () => ({
          where: (cond: any) => {
            capturedWhere = cond;
            return {
              orderBy: async () => [
                { id: 10, productCode: "43211507-DS-C01", description: "COMPUTER MOUSE, Wireless", unit: "Piece", referencePrice: "350.00", isActive: 1 },
              ],
            };
          },
        }),
      }),
    } as any;
    const result = await listProcurementCatalogItems({ search: "computer" }, { db });
    expect(result.items).toHaveLength(1);
    expect(result.items[0].description).toBe("COMPUTER MOUSE, Wireless");
    expect(capturedWhere).toBeTruthy();
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

  it("permits PO and Procurement Staff to create catalog items with complete metadata and rejects incomplete items", async () => {
    const inserts: any[] = [];
    let selectCall = 0;
    const supplierRow = { id: 5, supplierCode: "SUP-005", companyName: "Batanes Office Depot", isActive: 1 };
    const createdItemRow = { id: 101, productCode: "CAT-2026-000101", description: "BINDING RING/COMB, plastic, 32mm", unit: "Bundle", referencePrice: "250.00", isActive: 1 };
    const db = {
      select: () => {
        const call = selectCall++;
        return { from: () => ({ where: () => ({ limit: async () => call === 0 ? [supplierRow] : [createdItemRow] }) }) };
      },
      insert: () => ({ values: async (val: unknown) => { inserts.push(val); } }),
    } as any;

    const poUser = { id: 2, role: "procurement_officer" } as any;
    const staffUser = { id: 3, role: "procurement_staff" } as any;
    const audits: any[] = [];
    const mockAudit = async (audit: any) => { audits.push(audit); };

    // 1. PO creates item with complete metadata
    const poResult = await createProcurementCatalogItem({
      description: "BINDING RING/COMB, plastic, 32mm",
      technicalSpecifications: "Durable PVC plastic, 21 rings, compatible with standard comb-binding machine, 10 pcs/bundle",
      unit: "Bundle",
      referencePrice: 250,
      supplierId: 5,
    }, poUser, { db, recordAudit: mockAudit as any });

    expect(poResult).toEqual(createdItemRow);
    expect(inserts[0]).toMatchObject({
      description: "BINDING RING/COMB, plastic, 32mm",
      unit: "Bundle",
      referencePrice: "250.00",
      source: "Designated Supplier: Batanes Office Depot",
    });
    expect(inserts[0].remarks).toContain("Technical Specifications: Durable PVC plastic");
    expect(inserts[0].remarks).toContain("Designated Supplier: Batanes Office Depot (SUP-005)");
    expect(audits).toHaveLength(1);
    expect(audits[0]).toMatchObject({ entityType: "procurement_catalog_item", action: "created" });

    // 2. Reject incomplete metadata: missing specifications
    await expect(createProcurementCatalogItem({
      description: "BINDING RING",
      technicalSpecifications: "   ",
      unit: "Piece",
      referencePrice: 100,
      supplierId: 5,
    }, staffUser, { db, recordAudit: mockAudit as any })).rejects.toThrow("Complete technical specifications are required");

    // 3. Reject incomplete metadata: zero or invalid unit price
    await expect(createProcurementCatalogItem({
      description: "BINDING RING",
      technicalSpecifications: "Complete technical specs here",
      unit: "Piece",
      referencePrice: 0,
      supplierId: 5,
    }, staffUser, { db, recordAudit: mockAudit as any })).rejects.toThrow("Unit price must be a valid positive amount");

    // 4. Reject incomplete metadata: missing/unselected supplier
    const dbNoSupplier = {
      select: () => ({ from: () => ({ where: () => ({ limit: async () => [] }) }) }),
      insert: () => ({ values: async () => undefined }),
    } as any;
    await expect(createProcurementCatalogItem({
      description: "BINDING RING",
      technicalSpecifications: "Complete technical specs here",
      unit: "Piece",
      referencePrice: 150,
      supplierId: 999,
    }, staffUser, { db: dbNoSupplier, recordAudit: mockAudit as any })).rejects.toThrow("A valid active designated supplier must be selected");
  });
});
