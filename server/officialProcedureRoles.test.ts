import { describe, expect, it } from "vitest";
import {
  OFFICIAL_ROLE_LABELS,
  normalizeProcurementRole,
} from "../shared/procurementRules";

describe("official procedure role model", () => {
  it("exposes the official role labels", () => {
    expect(OFFICIAL_ROLE_LABELS.procurement_officer_i).toBe("Procurement Officer I");
    expect(OFFICIAL_ROLE_LABELS.procurement_officer_ii).toBe("Procurement Officer II");
    expect(OFFICIAL_ROLE_LABELS.procurement_staff).toBe("Procurement Staff");
    expect(OFFICIAL_ROLE_LABELS.bac_secretariat).toBe("BAC Secretariat");
    expect(OFFICIAL_ROLE_LABELS.hope).toBe("HoPE");
    expect(OFFICIAL_ROLE_LABELS.supplier_contractor).toBe("Supplier/Contractor");
  });

  it("maps official operational roles to existing officer capability gates", () => {
    expect(normalizeProcurementRole("procurement_officer_i")).toBe("procurement_officer");
    expect(normalizeProcurementRole("procurement_officer_ii")).toBe("procurement_officer");
    expect(normalizeProcurementRole("procurement_staff")).toBe("procurement_staff");
  });

  it("preserves BAC, HoPE, and Budget Officer roles as distinct official roles", () => {
    expect(normalizeProcurementRole("bac_secretariat")).toBe("bac_secretariat");
    expect(normalizeProcurementRole("bac")).toBe("bac");
    expect(normalizeProcurementRole("hope")).toBe("hope");
    expect(normalizeProcurementRole("budget_officer")).toBe("budget_officer");
  });
});
