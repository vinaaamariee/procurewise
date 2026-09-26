import { describe, expect, it } from "vitest";
import { canReserveBudget, countValidPreCanvassQuotes, getNextPrStatus, getValidPreCanvassQuotes, hasRequiredSupplierQuotations, hasReservedBudgetCommitment, isValidPreCanvassQuote, normalizeProcurementRole, roleCanAct, selectLowestCompliantQuote } from "../shared/procurementRules";

describe("ProcureWise workflow rules", () => {
  it("only advances a PR through the role assigned to the current gate", () => {
    expect(getNextPrStatus("draft", "end_user")).toBe("procurement_review");
    expect(getNextPrStatus("procurement_review", "procurement_officer")).toBe("approval_review");
    expect(getNextPrStatus("approval_review", "administrative_approver")).toBe("approved");
    expect(getNextPrStatus("approval_review", "procurement_officer")).toBeNull();
    expect(roleCanAct("admin", ["administrative_approver"])).toBe(true);
    // Platform-created accounts use the legacy "user" role and enter ProcureWise as End-Users.
    expect(normalizeProcurementRole("user")).toBe("end_user");
  });

  it("requires at least three supplier quotations and chooses the lowest compliant one", () => {
    const winner = selectLowestCompliantQuote([
      { id: 1, totalPrice: "1000.00", isCompliant: true },
      { id: 2, totalPrice: "850.00", isCompliant: false },
      { id: 3, totalPrice: "920.00", isCompliant: true },
    ]);
    expect(hasRequiredSupplierQuotations(2)).toBe(false);
    expect(hasRequiredSupplierQuotations(3)).toBe(true);
    expect(hasRequiredSupplierQuotations(4)).toBe(true);
    expect(hasRequiredSupplierQuotations(5)).toBe(true);
    expect(winner?.id).toBe(3);
  });

  it("validates and counts valid pre-canvass quotes consistently", () => {
    expect(isValidPreCanvassQuote({ supplierId: 1, totalPrice: "500.00" })).toBe(true);
    expect(isValidPreCanvassQuote({ supplierId: 0, totalPrice: "500.00" })).toBe(false);
    expect(isValidPreCanvassQuote({ supplierId: 1, totalPrice: "0.00" })).toBe(false);
    expect(isValidPreCanvassQuote({ supplierId: 1, totalPrice: "-10.00" })).toBe(false);

    const quotes = [
      { id: 1, preCanvassId: 10, supplierId: 1, totalPrice: "100.00" },
      { id: 2, preCanvassId: 10, supplierId: 2, totalPrice: "200.00" },
      { id: 3, preCanvassId: 10, supplierId: 3, totalPrice: "300.00" },
      { id: 4, preCanvassId: 10, supplierId: 4, totalPrice: "400.00" },
      { id: 5, preCanvassId: 10, supplierId: 0, totalPrice: "500.00" }, // invalid supplier
      { id: 6, preCanvassId: 11, supplierId: 5, totalPrice: "600.00" }, // different preCanvassId
    ];

    expect(countValidPreCanvassQuotes(quotes, 10)).toBe(4);
    expect(hasRequiredSupplierQuotations(countValidPreCanvassQuotes(quotes, 10))).toBe(true);
    expect(getValidPreCanvassQuotes(quotes, 10)).toHaveLength(4);
  });

  it("accepts only Purchase Requests that fit the office-level available budget", () => {
    expect(canReserveBudget("10000.00", "2500.00", "7500.00")).toBe(true);
    expect(canReserveBudget("10000.00", "2500.00", "7500.01")).toBe(false);
    expect(hasReservedBudgetCommitment("7500.00", "7500.00")).toBe(true);
    expect(hasReservedBudgetCommitment("7499.99", "7500.00")).toBe(false);
  });
});
