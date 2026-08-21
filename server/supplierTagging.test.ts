import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { setSupplierTags, validateSupplierTagInput } from "./db";
import { filterSuppliersByTag } from "../shared/supplierTagging";

describe("ProcureWise supplier tagging", () => {
  it("normalizes valid controlled goods-and-services tag names and rejects invalid names", () => {
    expect(validateSupplierTagInput("  Office   supplies ")).toBe("Office supplies");
    expect(validateSupplierTagInput("A")).toBeNull();
    expect(validateSupplierTagInput(" ")).toBeNull();
  });

  it("filters only suppliers assigned to the selected goods-and-services tag", () => {
    const suppliers = [{ id: 1, name: "Office supplier" }, { id: 2, name: "IT supplier" }, { id: 3, name: "Multi-service supplier" }];
    const assignments = [{ supplierId: 1, supplierTagId: 10 }, { supplierId: 3, supplierTagId: 10 }, { supplierId: 2, supplierTagId: 20 }, { supplierId: 3, supplierTagId: 20 }];
    expect(filterSuppliersByTag(suppliers, assignments, 10).map((supplier) => supplier.id)).toEqual([1, 3]);
    expect(filterSuppliersByTag(suppliers, assignments, 20).map((supplier) => supplier.id)).toEqual([2, 3]);
    expect(filterSuppliersByTag(suppliers, assignments, null)).toEqual(suppliers);
  });

  it("deduplicates valid assignments and records the resulting supplier-tag set", async () => {
    const inserted: unknown[] = []; const audits: unknown[] = []; let selectCall = 0;
    const db = {
      select: () => { const call = selectCall++; const rows = call === 0 ? [{ id: 7 }] : [{ id: 4, isActive: 1 }, { id: 5, isActive: 1 }]; return { from: () => ({ where: () => call === 0 ? { limit: async () => rows } : Promise.resolve(rows) }) }; },
      delete: () => ({ where: async () => undefined }),
      insert: () => ({ values: async (value: unknown) => { inserted.push(value); } }),
    } as any;
    const actor = { id: 99, role: "procurement_officer" } as any;
    const result = await setSupplierTags({ supplierId: 7, tagIds: [4, 5, 4] }, actor, { db, recordAudit: async (event) => { audits.push(event); } });
    expect(result).toEqual({ supplierId: 7, tagIds: [4, 5] });
    expect(inserted).toEqual([[{ supplierId: 7, supplierTagId: 4, assignedById: 99 }, { supplierId: 7, supplierTagId: 5, assignedById: 99 }]]);
    expect(audits).toHaveLength(1);
  });

  it("rejects inactive or missing tag IDs before deleting existing assignments", async () => {
    let deleted = false; let selectCall = 0;
    const db = {
      select: () => ({ from: () => ({ where: () => ({ limit: async () => selectCall++ === 0 ? [{ id: 7 }] : [] }) }) }),
      delete: () => ({ where: async () => { deleted = true; } }),
      insert: () => ({ values: async () => undefined }),
    } as any;
    const actor = { id: 99, role: "procurement_officer" } as any;
    await expect(setSupplierTags({ supplierId: 7, tagIds: [404] }, actor, { db, recordAudit: async () => undefined })).rejects.toThrow("Every selected supplier tag");
    expect(deleted).toBe(false);
  });

  it("protects tag administration and assignment with procurement roles", () => {
    const router = readFileSync(new URL("./routers.ts", import.meta.url), "utf8");
    expect(router).toContain("supplierTags: router");
    expect(router).toContain("setForSupplier");
    expect(router).toContain('assertRole(normalizeProcurementRole(ctx.user.role), ["procurement_officer", "admin"])');
  });

  it("shows controlled tag management and filters Pre-Canvass supplier choices without auto-classification", () => {
    const manager = readFileSync(new URL("../client/src/components/SupplierTagManager.tsx", import.meta.url), "utf8");
    const workflow = readFileSync(new URL("../client/src/pages/WorkflowPages.tsx", import.meta.url), "utf8");
    expect(manager).toContain("NO AUTO-CLASSIFICATION");
    expect(manager).toContain("setForSupplier.useMutation");
    expect(workflow).toContain("Goods/services filter");
    expect(workflow).toContain("filteredSuppliers");
    expect(workflow).toContain("does not change accreditation or role controls");
    expect(workflow).toContain("Pre-Canvass is ready for a Purchase Request");
    expect(workflow).toContain("Create Purchase Request");
  });
});
