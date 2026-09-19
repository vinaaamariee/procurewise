export const PROCUREMENT_ROLES = ["end_user", "procurement_officer", "administrative_approver", "admin"] as const;
export type ProcurementRole = (typeof PROCUREMENT_ROLES)[number];
export const USER_ROLES = ["user", ...PROCUREMENT_ROLES, "bac", "supply_officer", "budget_officer"] as const;
export type PersistedUserRole = (typeof USER_ROLES)[number];

export const PR_STATUSES = ["draft", "procurement_review", "approval_review", "approved", "rejected", "po_issued", "delivered", "pmr_logged", "closed", "budget_review", "supply_review", "bac_review", "returned", "rfq", "po"] as const;
export type PrStatus = (typeof PR_STATUSES)[number];

export type QuoteCandidate = { id: number; totalPrice: number | string; isCompliant: boolean };

export function roleCanAct(role: ProcurementRole, permittedRoles: ProcurementRole[]) {
  return role === "admin" || permittedRoles.includes(role);
}

export function normalizeProcurementRole(role: PersistedUserRole): ProcurementRole {
  if (role === "user") return "end_user";
  if (role === "supply_officer") return "procurement_officer";
  if (role === "bac" || role === "budget_officer") return "administrative_approver";
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
