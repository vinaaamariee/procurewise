export const PROCUREMENT_ROLES = ["end_user", "bac", "supply_officer", "budget_officer", "admin"] as const;
export type ProcurementRole = (typeof PROCUREMENT_ROLES)[number];
export const USER_ROLES = ["user", ...PROCUREMENT_ROLES] as const;
export type PersistedUserRole = (typeof USER_ROLES)[number];

export const PR_STATUSES = ["draft", "budget_review", "supply_review", "bac_review", "approved", "returned", "rfq", "po", "closed"] as const;
export type PrStatus = (typeof PR_STATUSES)[number];

export type QuoteCandidate = { id: number; totalPrice: number | string; isCompliant: boolean };

export function roleCanAct(role: ProcurementRole, permittedRoles: ProcurementRole[]) {
  return role === "admin" || permittedRoles.includes(role);
}

export function normalizeProcurementRole(role: PersistedUserRole): ProcurementRole {
  return role === "user" ? "end_user" : role;
}

export function getNextPrStatus(currentStatus: PrStatus, role: ProcurementRole): PrStatus | null {
  if (currentStatus === "draft" && roleCanAct(role, ["end_user"])) return "budget_review";
  if (currentStatus === "budget_review" && roleCanAct(role, ["budget_officer"])) return "supply_review";
  if (currentStatus === "supply_review" && roleCanAct(role, ["supply_officer"])) return "bac_review";
  if (currentStatus === "bac_review" && roleCanAct(role, ["bac"])) return "approved";
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
