import { describe, expect, it } from "vitest";
import { z, ZodError } from "zod";
import { formatFriendlyError } from "../client/src/lib/formatError";

describe("Purchase Request Item Validation & Error Formatting", () => {
  const prItemSchema = z.object({
    catalogItemId: z.number().int().positive().optional(),
    stockPropertyNo: z.string().max(80).optional(),
    description: z.string().trim().min(2, "Item description must be at least 2 characters"),
    specification: z.string().optional(),
    quantity: z.number().positive("Quantity must be greater than 0"),
    unit: z.string().trim().min(1, "Unit of measurement is required (e.g. pc, box, set, unit, lot)"),
    estimatedUnitCost: z.number().positive("Estimated unit cost must be greater than ₱0.00"),
  });

  const prCreateSchema = z.object({
    purpose: z.string().trim().min(10, "Purpose must be at least 10 characters"),
    officeId: z.number().int().positive("Requesting Department/Office is required"),
    objectOfExpenditureId: z.number().int().positive("Object of Expenditure is required"),
    items: z.array(prItemSchema).min(1, "At least one line item is required"),
  });

  it("fails validation when item at index 2 (item #3) has an empty unit", () => {
    const invalidPayload = {
      purpose: "Procurement of office supplies for department operations",
      officeId: 1,
      objectOfExpenditureId: 1,
      items: [
        { description: "Bond Paper A4", quantity: 5, unit: "ream", estimatedUnitCost: 250 },
        { description: "Ballpen Black", quantity: 10, unit: "box", estimatedUnitCost: 120 },
        { description: "Stapler Heavy Duty", quantity: 2, unit: "", estimatedUnitCost: 350 }, // empty unit!
      ],
    };

    const result = prCreateSchema.safeParse(invalidPayload);
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues[0];
      expect(issue.path).toEqual(["items", 2, "unit"]);
      expect(issue.message).toContain("Unit of measurement is required");
    }
  });

  it("formatFriendlyError decodes raw Zod JSON issue array for items path", () => {
    const rawZodJson = JSON.stringify([
      {
        origin: "string",
        code: "too_small",
        minimum: 1,
        inclusive: true,
        path: ["items", 2, "unit"],
        message: "Too small: expected string to have >=1 characters",
      },
    ]);

    const formatted = formatFriendlyError(rawZodJson);
    expect(formatted).toBe("Item #3: Unit of measurement is required (e.g. pc, box, set, unit, lot).");
  });

  it("formatFriendlyError decodes quantity and description errors properly", () => {
    const qtyErrorJson = JSON.stringify([
      {
        code: "custom",
        path: ["items", 0, "quantity"],
        message: "Quantity must be greater than 0",
      },
    ]);
    expect(formatFriendlyError(qtyErrorJson)).toBe("Item #1: Quantity must be greater than 0.");

    const descErrorJson = JSON.stringify([
      {
        code: "custom",
        path: ["items", 1, "description"],
        message: "Item description must be at least 2 characters",
      },
    ]);
    expect(formatFriendlyError(descErrorJson)).toBe("Item #2: Description is required (at least 2 characters).");
  });

  it("passes validation when all items have valid units and required fields", () => {
    const validPayload = {
      purpose: "Procurement of office supplies for department operations",
      officeId: 1,
      objectOfExpenditureId: 1,
      items: [
        { description: "Bond Paper A4", quantity: 5, unit: "ream", estimatedUnitCost: 250 },
        { description: "Ballpen Black", quantity: 10, unit: "box", estimatedUnitCost: 120 },
        { description: "Stapler Heavy Duty", quantity: 2, unit: "pc", estimatedUnitCost: 350 },
      ],
    };

    const result = prCreateSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it("enforces PPMP budget ceiling and blocks creating PR when total estimate exceeds ceiling", async () => {
    const { createPurchaseRequest } = await import("./db");
    const mockActor = { id: 10, role: "end_user" } as any;

    const mockDb = {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => [{ id: 50, plannedAmount: "1000.00" }],
          }),
        }),
      }),
      insert: () => ({
        values: async () => [{ id: 1, prNumber: "PR-2026-TEST" }],
      }),
    } as any;

    // Total: 6 * 168.96 = 1013.76 > 1000.00 ceiling
    await expect(
      createPurchaseRequest(
        {
          purpose: "Test Request that exceeds ceiling",
          officeId: 1,
          objectOfExpenditureId: 1,
          ppmpEntryId: 50,
          items: [
            {
              description: "FURNITURE CLEANER",
              quantity: 6,
              unit: "Piece",
              estimatedUnitCost: 168.96,
            },
          ],
        },
        mockActor,
        { db: mockDb, recordAudit: async () => undefined }
      )
    ).rejects.toThrow(/exceeds the Approved PPMP Budget Ceiling of ₱1,000.00/);
  });
});
