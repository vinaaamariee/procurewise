import { describe, expect, it } from "vitest";
import { buildAbstractPackageCsv, buildBestValuePolicyHistoryCsv, buildCsv, buildPpmpCsv } from "../client/src/lib/procurementExports";

describe("procurement CSV exports", () => {
  it("quotes special CSV characters and preserves a UTF-8 BOM for spreadsheet-compatible downloads", () => {
    expect(buildCsv(["Description", "Notes"], [["Printer, laser", 'He said "approved"']])).toBe("\uFEFFDescription,Notes\r\n\"Printer, laser\",\"He said \"\"approved\"\"\"\r\n");
  });

  it("includes the PPMP fields visible to the signed-in user with reference-table names", () => {
    const csv = buildPpmpCsv([{ fiscalYear: 2026, description: "Office printer", plannedAmount: "12500.00", actualAmount: "0.00", status: "draft", officeId: 4, objectOfExpenditureId: 7, papCode: "PAP-1", projectTitle: "ICT support", modeOfProcurement: "Small Value Procurement", fundSource: "General Fund", procurementSchedule: "Q1", remarks: "" }], new Map([[4, "ADMIN — Administration"]]), new Map([[7, "50203010 — Office equipment"]]));
    expect(csv).toContain("Fiscal year,Office,Object of expenditure");
    expect(csv).toContain("ADMIN — Administration");
    expect(csv).toContain("Office printer,12500.00,0.00,draft");
  });

  it("includes each linked supplier quote and recommendation in an Abstract package export", () => {
    const csv = buildAbstractPackageCsv({ abstract: { abstractNumber: "AOC-2026-001", status: "recommended", openingDate: new Date("2026-08-22T00:00:00Z"), openingLocation: "Basco, Batanes", procurementCategory: "Supplies", recommendationReason: "Lowest compliant supplier", recommendedSupplierId: 11 }, preCanvassNumber: "PC-2026-001", quotes: [{ supplierId: 11, totalPrice: "100.00", deliveryDays: 3, isCompliant: 1, quotationReference: "Q-11" }, { supplierId: 12, totalPrice: "110.00", deliveryDays: 4, isCompliant: 1, quotationReference: "Q-12" }], supplierNames: new Map([[11, "Supplier A"], [12, "Supplier B"]]), items: [{ description: "Bond paper", quantity: "10", unit: "ream", estimatedUnitCost: "100.00" }] });
    expect(csv).toContain("AOC-2026-001,PC-2026-001");
    expect(csv).toContain("Supplier A,Q-11,100.00,3,Yes");
    expect(csv).toContain("Supplier B,Q-12,110.00,4,Yes");
    expect(csv).toContain("Bond paper (10 ream)");
  });

  it("includes policy version, activation context, and each criterion weight in a Best Value compliance export", () => {
    const csv = buildBestValuePolicyHistoryCsv([{ policy: { policyCode: "BSC-BV", name: "Initial Best Value Policy", version: 2, isActive: 1, totalWeight: "100.00", createdAt: new Date("2026-08-22T00:00:00Z"), deactivatedAt: null }, criteria: [{ criterionKey: "price_competitiveness", label: "Quoted price competitiveness", description: "Comparable eligible quotation price.", weight: "55.00", sortOrder: 1 }, { criterionKey: "delivery_commitment", label: "Delivery commitment", description: "Compliant delivery commitment.", weight: "45.00", sortOrder: 2 }], createdBy: { name: "Policy Administrator", email: "admin@example.test" }, activationAudit: { action: "version_activated", createdAt: new Date("2026-08-22T00:00:00Z"), performedByRole: "admin" } }]);
    expect(csv).toContain("Policy code,Policy name,Version,Status,Total weight");
    expect(csv).toContain("BSC-BV,Initial Best Value Policy,2,Active,100.00");
    expect(csv).toContain("version_activated");
    expect(csv).toContain("price_competitiveness,Quoted price competitiveness");
    expect(csv).toContain("delivery_commitment,Delivery commitment");
  });
});
