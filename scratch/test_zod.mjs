import { z, ZodError } from "zod";

function formatZodIssue(issue) {
  const path = issue.path ?? [];
  if (path[0] === "items" && typeof path[1] === "number") {
    const itemNum = path[1] + 1;
    const field = path[2];
    if (field === "unit") return `Item #${itemNum}: Unit of measurement is required (e.g. pc, box, set, unit, lot).`;
    if (field === "description") return `Item #${itemNum}: Description is required (at least 2 characters).`;
    if (field === "quantity") return `Item #${itemNum}: Quantity must be greater than 0.`;
    if (field === "estimatedUnitCost") return `Item #${itemNum}: Estimated unit cost must be greater than ₱0.00.`;
    return `Item #${itemNum}${field ? ` (${field})` : ""}: ${issue.message}`;
  }

  if (issue.message && !issue.message.startsWith("Too small") && !issue.message.startsWith("Expected") && !issue.message.startsWith("Invalid")) {
    return issue.message;
  }

  const fieldLabel = path.length ? path.join(".") : "Field";
  return `${fieldLabel}: ${issue.message}`;
}

const prCreateSchema = z.object({
  purpose: z.string().trim().min(10, "Purpose must be at least 10 characters"),
  fundSource: z.string().max(160).optional(),
  fundCluster: z.string().max(80).optional(),
  responsibilityCenterCode: z.string().max(80).optional(),
  requesterDesignation: z.string().max(160).optional(),
  requestedSignatoryId: z.number().int().positive().optional(),
  approvedSignatoryId: z.number().int().positive().optional(),
  ppmpEntryId: z.number().int().positive().optional(),
  officeId: z.number().int().positive("Requesting Department/Office is required"),
  objectOfExpenditureId: z.number().int().positive("Object of Expenditure is required"),
  items: z.array(z.object({
    catalogItemId: z.number().int().positive().optional(),
    stockPropertyNo: z.string().max(80).optional(),
    description: z.string().trim().min(2, "Item description must be at least 2 characters"),
    specification: z.string().optional(),
    quantity: z.number().positive("Quantity must be greater than 0"),
    unit: z.string().trim().min(1, "Unit of measurement is required (e.g. pc, box, set, unit, lot)"),
    estimatedUnitCost: z.number().positive("Estimated unit cost must be greater than ₱0.00")
  })).min(1, "At least one line item is required")
});

// Test 1: undefined input
try {
  prCreateSchema.parse(undefined);
} catch (e) {
  console.log("Undefined input:", formatZodIssue(e.issues[0]));
}

// Test 2: empty object
try {
  prCreateSchema.parse({});
} catch (e) {
  console.log("Empty object input:", formatZodIssue(e.issues[0]));
}
