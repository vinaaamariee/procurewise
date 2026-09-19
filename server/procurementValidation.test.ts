import { describe, expect, it } from "vitest";
import { validatePoBudgetGeneration, validatePrBudgetSubmission } from "./procurementValidation";

describe("ProcureWise server budget validation", () => {
  it("allows PR submission when the specific office-object allotment has sufficient available funds", () => {
    expect(validatePrBudgetSubmission({ allottedAmount: "10000.00", committedAmount: "1250.00", purchaseRequestAmount: "8750.00" })).toEqual({ allowed: true, availableAmount: 8750 });
  });

  it("rejects PR submission and PO generation when the required commitment is not available", () => {
    expect(validatePrBudgetSubmission({ allottedAmount: "10000.00", committedAmount: "1250.00", purchaseRequestAmount: "8750.01" }).allowed).toBe(false);
    expect(validatePoBudgetGeneration({ committedAmount: "6000.00", purchaseRequestAmount: "6500.00" }).allowed).toBe(false);
  });
});
