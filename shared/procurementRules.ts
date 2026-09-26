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

export type PreCanvassQuoteCandidate = {
  id?: number;
  preCanvassId?: number;
  supplierId?: number | null;
  totalPrice?: number | string | null;
  deliveryDays?: number | null;
  isCompliant?: number | boolean | null;
};

/**
 * Validates whether an individual pre-canvass quote is complete and valid.
 * A valid quote must have a valid supplier assigned and a positive quoted price (> 0).
 */
export function isValidPreCanvassQuote(quote: PreCanvassQuoteCandidate | null | undefined): boolean {
  if (!quote) return false;
  const hasSupplier = quote.supplierId !== undefined ? quote.supplierId !== null && Number(quote.supplierId) > 0 : true;
  const hasPrice = quote.totalPrice !== undefined ? quote.totalPrice !== null && !isNaN(Number(quote.totalPrice)) && Number(quote.totalPrice) > 0 : true;
  return Boolean(hasSupplier && hasPrice);
}

/**
 * Filters a list of quotes to only those that are valid and (optionally) belong to the specified pre-canvass.
 */
export function getValidPreCanvassQuotes<T extends PreCanvassQuoteCandidate>(quotes: T[], preCanvassId?: number): T[] {
  return quotes.filter((q) => {
    if (preCanvassId !== undefined && q.preCanvassId !== preCanvassId) return false;
    return isValidPreCanvassQuote(q);
  });
}

/**
 * Unified helper to count valid quotes for a given pre-canvass.
 * Used identically for the UI badge count and the submit validation.
 */
export function countValidPreCanvassQuotes(quotes: PreCanvassQuoteCandidate[], preCanvassId?: number): number {
  return getValidPreCanvassQuotes(quotes, preCanvassId).length;
}

/**
 * Submission guard: Verifies whether the pre-canvass has met or exceeded
 * the required quotation threshold (quotes >= 3, allowing 3 or more quotes).
 */
export function hasRequiredSupplierQuotations(quoteCount: number): boolean {
  return quoteCount >= 3;
}

export function canReserveBudget(allottedAmount: number | string, committedAmount: number | string, requestAmount: number | string) {
  return Number(requestAmount) <= Number(allottedAmount) - Number(committedAmount);
}

export function hasReservedBudgetCommitment(committedAmount: number | string, requestAmount: number | string) {
  return Number(committedAmount) >= Number(requestAmount);
}

export const EMPLOYEE_PR_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  procurement_review: "In Progress — Procurement Review",
  returned: "Returned for Correction",
  approval_review: "In Progress — Approval Review",
  budget_review: "In Progress — Approval Review",
  supply_review: "In Progress — Approval Review",
  bac_review: "In Progress — Approval Review",
  approved: "Approved",
  rejected: "Rejected",
  rfq: "RFQ in Progress",
  po: "Purchase Order in Progress",
  po_issued: "Purchase Order in Progress",
  delivered: "Delivered",
  pmr_logged: "Closed — PMR Logged",
  closed: "Closed — PMR Logged",
};

export const EMPLOYEE_PR_STATUS_MEANINGS: Record<string, string> = {
  draft: "Employee is still preparing the package.",
  procurement_review: "Package has been submitted to Procurement.",
  returned: "Employee must correct the package and resubmit.",
  approval_review: "Package is being reviewed by the authorized decision role.",
  budget_review: "Package is being reviewed by the authorized decision role.",
  supply_review: "Package is being reviewed by the authorized decision role.",
  bac_review: "Package is being reviewed by the authorized decision role.",
  approved: "PR passed the required decision stage.",
  rejected: "Current transaction path was rejected and requires a new controlled submission or documented resubmission.",
  rfq: "Final RFQ is being prepared, distributed, or evaluated.",
  po: "PO is being prepared or approved.",
  po_issued: "PO is being prepared or approved.",
  delivered: "Delivery has been recorded.",
  pmr_logged: "PMR requirements are complete.",
  closed: "PMR requirements are complete.",
};

export function getEmployeePrStatus(status: string) {
  const normalized = status.toLowerCase();
  const label = EMPLOYEE_PR_STATUS_LABELS[normalized] ?? status.replaceAll("_", " ");
  const meaning = EMPLOYEE_PR_STATUS_MEANINGS[normalized] ?? "Status is being updated by the procurement workflow.";
  return { label, meaning };
}

const COUNTABLE_UNITS = new Set(["pc", "pcs", "piece", "pieces", "unit", "units", "box", "boxes", "pack", "packs", "ream", "reams", "set", "sets", "roll", "rolls", "pad", "pads", "bundle", "bundles"]);
const VOLUME_UNITS = new Set(["l", "liter", "liters", "ml", "milliliter", "milliliters", "gal", "gallon", "gallons"]);
const WEIGHT_UNITS = new Set(["kg", "kilogram", "kilograms", "g", "gram", "grams", "lb", "lbs", "ton", "tons"]);
const LENGTH_UNITS = new Set(["m", "meter", "meters", "cm", "centimeter", "centimeters", "ft", "foot", "feet", "yard", "yards"]);

export function areUnitsCompatible(unitA: string, unitB: string): boolean {
  const normA = unitA.trim().toLowerCase();
  const normB = unitB.trim().toLowerCase();
  if (normA === normB) return true;
  if (COUNTABLE_UNITS.has(normA) && COUNTABLE_UNITS.has(normB)) return true;
  if (VOLUME_UNITS.has(normA) && VOLUME_UNITS.has(normB)) return true;
  if (WEIGHT_UNITS.has(normA) && WEIGHT_UNITS.has(normB)) return true;
  if (LENGTH_UNITS.has(normA) && LENGTH_UNITS.has(normB)) return true;
  return false;
}
