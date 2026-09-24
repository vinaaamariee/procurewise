import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { calculateMcdmScores, createSupplierEvaluation, updateSupplierEvaluation, validateSupplierEvaluationScores } from "./db";
import { invokeOfficialPdfDownload, officialFormFileName } from "../client/src/lib/procurementPdf";

describe("ProcureWise expanded officer workflows", () => {
  it("uses transparent 60/20/20 MCDM weighting and excludes non-compliant quotes", () => {
    const scores = calculateMcdmScores([
      { supplierId: 1, totalPrice: "100", deliveryDays: 5, isCompliant: 1 },
      { supplierId: 2, totalPrice: "110", deliveryDays: 2, isCompliant: 1 },
      { supplierId: 3, totalPrice: "90", deliveryDays: 1, isCompliant: 0 },
    ]);
    expect(scores).toHaveLength(2);
    expect(scores[0].quote.supplierId).toBe(2);
    expect(scores[0].priceScore).toBeCloseTo(100 / 110 * 60, 6);
    expect(scores[0].complianceScore).toBe(20);
    expect(scores.every((score) => score.quote.supplierId !== 3)).toBe(true);
  });

  it("registers active-browser notification refresh and unread badge behavior", () => {
    const listener = readFileSync(new URL("../client/src/components/NotificationToastListener.tsx", import.meta.url), "utf8");
    const layout = readFileSync(new URL("../client/src/components/DashboardLayout.tsx", import.meta.url), "utf8");
    expect(listener).toContain("refetchInterval: 15_000");
    expect(listener).toContain("toast.info(notification.title");
    expect(layout).toContain("unreadCount > 0");
    expect(layout).toContain("9+");
  });

  it("exposes correction return and resubmission actions for Abstracts and Purchase Orders", () => {
    const router = readFileSync(new URL("./routers.ts", import.meta.url), "utf8");
    const execution = readFileSync(new URL("../client/src/pages/WorkflowPages.tsx", import.meta.url), "utf8");
    expect(router).toContain("returnAbstract");
    expect(router).toContain("resubmitAbstract");
    expect(router).toContain("returnPurchaseOrder");
    expect(router).toContain("reissuePurchaseOrder");
    expect(execution).toContain("Correction and resubmission controls");
  });

  it("registers notices, transmittals, forecasting, public tracking, and all requested print routes while keeping officer settings absent", () => {
    const app = readFileSync(new URL("../client/src/App.tsx", import.meta.url), "utf8");
    const pdf = readFileSync(new URL("../client/src/lib/procurementPdf.ts", import.meta.url), "utf8");
    const appearanceControls = readFileSync(new URL("../client/src/components/GlobalAppearanceControls.tsx", import.meta.url), "utf8");
    ["/officer/notices", "/officer/transmittals", "/officer/forecast", "/track", "/print/notice", "/print/transmittal", "/print/pre-canvass-abstract"].forEach((route) => expect(app).toContain(route));
    expect(app).not.toContain("/officer/settings");
    expect(appearanceControls).toContain("Light");
    expect(appearanceControls).toContain("Dark");
    ["downloadPurchaseRequestPdf", "downloadPreCanvassPdf", "downloadAbstractPdf", "downloadPurchaseOrderPdf"].forEach((name) => expect(pdf).toContain(name));
  });

  it("provides a prefilled Supplier Evaluation edit mode backed by the update procedure", () => {
    const officerPages = readFileSync(new URL("../client/src/pages/OfficerPages.tsx", import.meta.url), "utf8");
    expect(officerPages).toContain("supplierEvaluations.update.useMutation");
    expect(officerPages).toContain("Edit evaluation");
    expect(officerPages).toContain(">Edit</Button>");
    expect(officerPages).toContain("Update evaluation");
  });

  it("validates Supplier Evaluation score inputs before create or update services persist a record", () => {
    expect(validateSupplierEvaluationScores([1, 3, 5, 4])).toBe(true);
    expect(validateSupplierEvaluationScores([0, 3, 5, 4])).toBe(false);
    expect(validateSupplierEvaluationScores([1, 3.5, 5, 4])).toBe(false);
    expect(validateSupplierEvaluationScores([1, 3, 5])).toBe(false);
  });

  it("rejects invalid Supplier Evaluation scores through both persistence service paths", async () => {
    const actor = { id: 99, role: "procurement_officer" } as any;
    await expect(createSupplierEvaluation({ supplierId: 1, qualityScore: 0, deliveryScore: 5, pricingScore: 5, complianceScore: 5 }, actor)).rejects.toThrow("Each supplier evaluation score");
    await expect(updateSupplierEvaluation({ evaluationId: 1, qualityScore: 5, deliveryScore: 5.5, pricingScore: 5, complianceScore: 5 }, actor)).rejects.toThrow("Each supplier evaluation score");
  });

  it("uses deterministic official-form PDF names for download triggers", () => {
    expect(officialFormFileName("purchase_request", "PR-2026-0001")).toBe("PR-2026-0001_Appendix60.pdf");
    expect(officialFormFileName("pre_canvass", "PC-2026-0001")).toBe("PC-2026-0001_AnnexD.pdf");
    expect(officialFormFileName("abstract", "AOC-2026-0001")).toBe("AOC-2026-0001_AnnexF.pdf");
    expect(officialFormFileName("purchase_order", "PO-2026-0001")).toBe("PO-2026-0001_Appendix61.pdf");
  });

  it("invokes the PDF download trigger with the official output name for each form", () => {
    const save = vi.fn(); const doc = { save } as unknown as Pick<jsPDF, "save">;
    ["PR-2026-0001_Appendix60.pdf", "PC-2026-0001_AnnexD.pdf", "AOC-2026-0001_AnnexF.pdf", "PO-2026-0001_Appendix61.pdf"].forEach((fileName) => invokeOfficialPdfDownload(doc, fileName));
    expect(save).toHaveBeenNthCalledWith(1, "PR-2026-0001_Appendix60.pdf");
    expect(save).toHaveBeenNthCalledWith(2, "PC-2026-0001_AnnexD.pdf");
    expect(save).toHaveBeenNthCalledWith(3, "AOC-2026-0001_AnnexF.pdf");
    expect(save).toHaveBeenNthCalledWith(4, "PO-2026-0001_Appendix61.pdf");
  });
});
