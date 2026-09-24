export const PROCUREMENT_ROLES = [
  "end_user",
  "procurement_officer",
  "procurement_officer_i",
  "procurement_officer_ii",
  "procurement_staff",
  "administrative_approver",
  "bac_secretariat",
  "bac",
  "hope",
  "budget_officer",
  "supplier_contractor",
  "admin",
] as const;
export type ProcurementRole = (typeof PROCUREMENT_ROLES)[number];
export const USER_ROLES = ["user", ...PROCUREMENT_ROLES, "supply_officer"] as const;
export type PersistedUserRole = (typeof USER_ROLES)[number];

export const OFFICIAL_ROLE_LABELS: Record<ProcurementRole, string> = {
  end_user: "End-User",
  procurement_officer: "Procurement Office",
  procurement_officer_i: "Procurement Officer I",
  procurement_officer_ii: "Procurement Officer II",
  procurement_staff: "Procurement Staff",
  administrative_approver: "Administrative Approver (legacy)",
  bac_secretariat: "BAC Secretariat",
  bac: "BAC",
  hope: "HoPE",
  budget_officer: "Budget Officer",
  supplier_contractor: "Supplier/Contractor",
  admin: "System Administrator",
};

export const PR_STATUSES = ["draft", "procurement_review", "approval_review", "approved", "rejected", "po_issued", "delivered", "pmr_logged", "closed", "budget_review", "supply_review", "bac_review", "returned", "rfq", "po"] as const;
export type PrStatus = (typeof PR_STATUSES)[number];

export type QuoteCandidate = { id: number; totalPrice: number | string; isCompliant: boolean };

export function roleCanAct(role: ProcurementRole, permittedRoles: ProcurementRole[]) {
  return role === "admin" || permittedRoles.includes(role);
}

/**
 * Maps official procedure roles to the existing application capability gates.
 * The persisted role is retained for display; this normalized capability keeps
 * existing server procedures backward-compatible while the official role model
 * is introduced incrementally.
 */
export function normalizeProcurementRole(role: PersistedUserRole): ProcurementRole {
  if (role === "user") return "end_user";
  if (role === "supply_officer" || role === "procurement_officer_i" || role === "procurement_officer_ii" || role === "procurement_staff") return "procurement_officer";
  if (role === "bac_secretariat" || role === "bac" || role === "hope" || role === "budget_officer") return "administrative_approver";
  return role;
}

export function getNextPrStatus(currentStatus: PrStatus, role: ProcurementRole): PrStatus | null {
  if (currentStatus === "draft" && roleCanAct(role, ["end_user"])) return "procurement_review";
  if (currentStatus === "procurement_review" && roleCanAct(role, ["procurement_officer"])) return "approval_review";
  if (currentStatus === "approval_review" && roleCanAct(role, ["administrative_approver"])) return "approved";
  return null;
}

export function selectLowestCompliantQuote<T extends QuoteCandidate>(quotes: T[]): T | null {
  const compliantQuotes = quotes.filter((quote) => quote.isCompliant);
  if (!compliantQuotes.length) return null;
  return compliantQuotes.reduce((lowest, quote) => Number(quote.totalPrice) < Number(lowest.totalPrice) ? quote : lowest);
}

export function hasRequiredSupplierQuotations(quoteCount: number) {
  return quoteCount >= 3;
}

export function canReserveBudget(allottedAmount: number | string, committedAmount: number | string, requestAmount: number | string) {
  return Number(requestAmount) <= Number(allottedAmount) - Number(committedAmount);
}

export function hasReservedBudgetCommitment(committedAmount: number | string, requestAmount: number | string) {
  return Number(committedAmount) >= Number(requestAmount);
}
