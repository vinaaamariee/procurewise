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

// ─────────────────────────────────────────────────────────────────────────────
// Republic Act No. 12009 — New Government Procurement Act (NGPA) Framework
// ─────────────────────────────────────────────────────────────────────────────
export const NGPA_LAW = {
  actNumber: "Republic Act No. 12009",
  shortTitle: "New Government Procurement Act (NGPA)",
  enactmentYear: 2024,
  repealedAct: "Republic Act No. 9184 (Government Procurement Reform Act of 2003)",

  /**
   * Article I, Section 2: 8 Governing Principles of Public Procurement
   */
  governingPrinciples: [
    { name: "Transparency", description: "Public disclosure of all procurement information and electronic access via PhilGEPS." },
    { name: "Competitiveness", description: "Equal opportunity for all eligible and qualified commercial suppliers to participate." },
    { name: "Efficiency", description: "Timely, streamlined procurement processes maximizing resource optimization." },
    { name: "Proportionality", description: "Procurement procedures, requirements, and criteria proportional to the value, complexity, and risk." },
    { name: "Accountability", description: "Direct responsibility of procuring entities, BAC officials, and suppliers under law." },
    { name: "Participatory Procurement", description: "Structured participation of civic organizations, observers, and public monitoring." },
    { name: "Sustainability", description: "Green public procurement integrating environmental, economic, and social life-cycle considerations." },
    { name: "Professionalism", description: "Mandatory qualification, capability building, and ethical standards for procurement personnel." },
  ],

  /**
   * Core Statutory Articles
   */
  articles: [
    { article: "Article I", title: "General Provisions (Sections 1–6)", description: "Scope, definition of terms, and the 8 Governing Principles." },
    { article: "Article II", title: "Strategic Procurement Planning (Sections 7–19)", description: "Mandatory market scoping, life-cycle cost analysis (LCCA), and fit-for-purpose planning." },
    { article: "Article III", title: "Procurement by Electronic Means (Sections 20–25)", description: "Institutionalizes PhilGEPS as the single electronic portal tracking planning to final payment." },
    { article: "Article IV", title: "Modes of Procurement (Sections 26–38)", description: "Competitive Bidding, Small Value Procurement, Direct Acquisition, Competitive Dialogue, and Framework Agreements." },
    { article: "Article V", title: "Evaluation & Award — MEARB / Best Value (Section 43)", description: "Most Economically Advantageous and Responsive Bid (MEARB) evaluating quality, life-cycle cost, and multi-criteria value." },
  ],
} as const;

export const OFFICIAL_ROLE_LABELS: Record<ProcurementRole, string> = {
  end_user: "End-User",
  procurement_officer: "Procurement Officer",
  procurement_officer_i: "Procurement Officer I",
  procurement_officer_ii: "Procurement Officer II",
  procurement_staff: "Procurement Staff",
  administrative_approver: "Administrative Approver",
  bac_secretariat: "BAC Secretariat",
  bac: "Bids and Awards Committee",
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
  if (role === "supply_officer" || role === "procurement_officer_i" || role === "procurement_officer_ii") return "procurement_officer";
  return role as ProcurementRole;
}

export function getNextPrStatus(currentStatus: PrStatus, role: PersistedUserRole): PrStatus | null {
  const norm = normalizeProcurementRole(role);
  const isDecisionRole = roleCanAct(norm, ["administrative_approver", "bac", "bac_secretariat", "hope", "budget_officer"]) || ["administrative_approver", "bac", "bac_secretariat", "hope", "budget_officer"].includes(role as string);
  if (currentStatus === "draft" && (roleCanAct(norm, ["end_user"]) || role === "end_user")) return "procurement_review";
  if (currentStatus === "procurement_review" && roleCanAct(norm, ["procurement_officer"])) return "approval_review";
  if (currentStatus === "approval_review" && isDecisionRole) return "approved";
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
  returned: "Returned for Revision",
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
  returned: "Package was returned for revision by Procurement Officer. Employee must correct and resubmit.",
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

// ─────────────────────────────────────────────────────────────────────────────
// Section 5.1.1 Mandated Category Segregation Rules
// ─────────────────────────────────────────────────────────────────────────────
export const SECTION_5_1_1_CATEGORIES = [
  {
    id: "office_supplies",
    label: "Office Supplies",
    description: "Office stationery, papers, folders, binders, writing materials, desk items",
    keywords: ["paper", "pen", "ballpen", "pencil", "binder", "folder", "stapler", "staple", "envelope", "eraser", "clip", "tape", "desk organizer", "supplies", "marker", "highlighter", "scissors", "fastener", "ink cartridge", "stamp pad", "puncher", "calculator", "carbon paper", "notebook", "pad paper", "columnar", "bond paper"],
  },
  {
    id: "hardware_supplies",
    label: "Hardware Supplies",
    description: "Construction materials, tools, lumber, electrical, plumbing, cement, fixtures",
    keywords: ["hardware", "cement", "lumber", "paint", "pipe", "wire", "steel", "screw", "nail", "hammer", "drill", "plywood", "gravel", "sand", "fitting", "electrical", "bulb", "switch", "outlet", "circuit", "lock", "padlock", "hinge", "wrench", "pliers", "conduit", "saw", "faucet", "valve"],
  },
  {
    id: "ict_supplies",
    label: "ICT Supplies",
    description: "Computers, peripherals, networking equipment, storage media, IT consumables",
    keywords: ["ict", "computer", "desktop", "laptop", "monitor", "printer", "toner", "ink bottle", "keyboard", "mouse", "software", "cable", "ups", "switch", "router", "scanner", "usb", "flash drive", "hard drive", "ssd", "ram", "server", "webcam", "headset", "projector", "ethernet", "wifi", "network"],
  },
  {
    id: "printing_service",
    label: "Printing Service",
    description: "Tarpaulin, publication, brochures, flyers, book binding, IDs, banners",
    keywords: ["printing", "tarpaulin", "tarp", "brochure", "flyer", "banner", "id card", "certificate", "booklet", "manual", "publication", "binding service", "streamer", "poster", "invitation card", "newsletter", "souvenir program"],
  },
  {
    id: "food_ingredients",
    label: "Food Ingredients",
    description: "Culinary items, groceries, fresh produce, meat, spices, cooking staples",
    keywords: ["food", "ingredient", "rice", "meat", "pork", "beef", "chicken", "fish", "vegetable", "cooking oil", "spice", "sugar", "salt", "sauce", "flour", "grocery", "catering", "meal", "milk", "egg", "onion", "garlic", "vinegar", "soy sauce", "pasta", "butter", "cheese", "snack"],
  },
] as const;

export type Section511CategoryId = (typeof SECTION_5_1_1_CATEGORIES)[number]["id"];

export function detectItemCategory(text: string): Section511CategoryId | null {
  const lower = text.toLowerCase();
  for (const cat of SECTION_5_1_1_CATEGORIES) {
    if (lower.includes(cat.label.toLowerCase()) || lower.includes(cat.id.replace("_", " "))) {
      return cat.id;
    }
  }
  for (const cat of SECTION_5_1_1_CATEGORIES) {
    for (const kw of cat.keywords) {
      const escaped = kw.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
      const regex = new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i");
      if (regex.test(lower)) {
        return cat.id;
      }
    }
  }
  return null;
}

export function detectMixedCategories(
  items: Array<{
    description?: string | null;
    specification?: string | null;
    itemDescription?: string | null;
    itemName?: string | null;
    name?: string | null;
    category?: string | null;
  }>
): {
  isMixed: boolean;
  detectedCategories: Section511CategoryId[];
  categoryLabels: string[];
  itemClassifications: Array<{ description: string; categoryId: Section511CategoryId | null; categoryLabel: string }>;
} {
  const catSet = new Set<Section511CategoryId>();
  const classifications = items.map((item) => {
    const desc = item.description || item.specification || item.itemDescription || item.itemName || item.name || "";
    const cat = detectItemCategory(`${desc} ${item.category || ""}`);
    if (cat) catSet.add(cat);
    const catObj = SECTION_5_1_1_CATEGORIES.find((c) => c.id === cat);
    return {
      description: desc,
      categoryId: cat,
      categoryLabel: catObj ? catObj.label : "Unclassified / Other",
    };
  });

  const detectedCategories = Array.from(catSet);
  const isMixed = detectedCategories.length > 1;
  const categoryLabels = detectedCategories.map((id) => SECTION_5_1_1_CATEGORIES.find((c) => c.id === id)?.label || id);

  return {
    isMixed,
    detectedCategories,
    categoryLabels,
    itemClassifications: classifications,
  };
}
