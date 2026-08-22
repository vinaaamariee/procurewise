import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { END_USER_EVALUATION_CRITERIA, PROCUREMENT_OFFICE_EVALUATION_CRITERIA, deriveSupplierEvaluationSummary, validateSupplierEvaluationResponses } from "../shared/supplierEvaluationForm";
import { createSupplierEvaluationForm } from "./db";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const endUserResponses = Object.fromEntries(END_USER_EVALUATION_CRITERIA.map((criterion) => [criterion.key, 4]));
const procurementResponses = Object.fromEntries(PROCUREMENT_OFFICE_EVALUATION_CRITERIA.map((criterion) => [criterion.key, 4]));

describe("supplied Supplier Evaluation Form criteria", () => {
  it("preserves the nine End-User prompts and five Procurement Office prompts with four-point ratings", () => {
    expect(END_USER_EVALUATION_CRITERIA).toHaveLength(9);
    expect(PROCUREMENT_OFFICE_EVALUATION_CRITERIA).toHaveLength(5);
    expect(validateSupplierEvaluationResponses("end_user", endUserResponses)).toBeNull();
    expect(validateSupplierEvaluationResponses("procurement_office", procurementResponses)).toBeNull();
  });

  it("rejects missing or out-of-range supplied-form responses before persistence", async () => {
    expect(validateSupplierEvaluationResponses("end_user", { ...endUserResponses, quality_standards: 5 })).toContain("integer from 1 to 4");
    const actor = { id: 99, name: "Evaluation Tester", role: "end_user" } as any;
    await expect(createSupplierEvaluationForm({ supplierId: 1, purchaseOrderId: 1, goodsServicesType: "Office supplies", respondentName: "Evaluation Tester", responseScores: { ...endUserResponses, quality_standards: 5 } }, "end_user", actor)).rejects.toThrow("integer from 1 to 4");
  });

  it("derives retained summary metrics from the supplied form rather than inventing responses", () => {
    expect(deriveSupplierEvaluationSummary("end_user", endUserResponses)).toEqual({ qualityScore: 4, deliveryScore: 4, pricingScore: 4, complianceScore: 4 });
    expect(deriveSupplierEvaluationSummary("procurement_office", procurementResponses)).toEqual({ qualityScore: 4, deliveryScore: 4, pricingScore: 4, complianceScore: 4 });
  });
});

describe("Supplier Evaluation Form authorization and rendering", () => {
  it("rejects cross-audience form submissions before database work begins", async () => {
    const endUser = appRouter.createCaller({ user: { id: 44, openId: "end-user-evaluation", name: "End User", email: "end@example.test", loginMethod: "test", role: "end_user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] });
    const officer = appRouter.createCaller({ user: { id: 45, openId: "officer-evaluation", name: "Procurement Officer", email: "officer@example.test", loginMethod: "test", role: "procurement_officer", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] });
    await expect(endUser.procurement.officer.supplierEvaluations.submitProcurementOfficeForm({ supplierId: 1, purchaseOrderId: 1, respondentName: "End User", responseScores: procurementResponses })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(officer.procurement.officer.supplierEvaluations.submitEndUserForm({ supplierId: 1, purchaseOrderId: 1, goodsServicesType: "Office supplies", respondentName: "Procurement Officer", responseScores: endUserResponses })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("keeps the supplied headings, instructions, form audiences, and controlled PDF exporter wired into the application", () => {
    const page = readFileSync(new URL("../client/src/pages/SupplierEvaluationFormPage.tsx", import.meta.url), "utf8");
    const pdf = readFileSync(new URL("../client/src/lib/procurementPdf.ts", import.meta.url), "utf8");
    ["To be accomplished by End-User", "To be accomplished by Procurement Office", "Type of Goods/Services Provided", "Supplier registry reference", "treated with utmost confidentiality", "Thank you very much.", "Strongly Agree", "Additional comments, suggestions, recommendations, and/or feedback", "Submit Supplier Evaluation Form"].forEach((label) => expect(page).toContain(label));
    expect(pdf).toContain("downloadSupplierEvaluationFormPdf");
    expect(pdf).toContain("SUPPLIER EVALUATION FORM");
    expect(pdf).toContain("Name and Signature of Respondent");
  });
});
