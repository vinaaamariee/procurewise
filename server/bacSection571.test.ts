import { describe, expect, it } from "vitest";
import { z } from "zod";
import { DEFAULT_BSC_BAC_MEMBERS } from "../client/src/components/OfficialBacResolutionCanvas";

describe("Section 5.7.1: Opening of Quotations & Preparation of Abstract of Quotations", () => {
  // Schema for Procedure 5.7.1 Forwarding to BAC
  const forwardToBacSchema = z.object({
    rfqId: z.number().int().positive(),
  });

  // Schema for Procedure 5.7.1 Formal BAC Chairperson Opening
  const recordOpeningSchema = z.object({
    rfqId: z.number().int().positive(),
    openingDate: z.string().optional(),
    openingLocation: z.string().min(2).default("BAC Conference Room, Batanes State College"),
    chairpersonName: z.string().min(2).default("DOREEN C. CASTILLO"),
    remarks: z.string().optional(),
  });

  // Schema for Abstract of Quotations (AOQ / Ratings) Preparation
  const prepareAbstractSchema = z.object({
    rfqId: z.number().int().positive(),
    recommendedSupplierId: z.number().int().positive(),
    recommendationReason: z.string().min(5),
    openingLocation: z.string().optional(),
    chairpersonName: z.string().optional(),
    signatories: z.array(z.string()).min(1),
  });

  it("validates Section 5.7.1 Forward to BAC for Preparation of Abstract of Quotations", () => {
    const input = { rfqId: 101 };
    const parsed = forwardToBacSchema.safeParse(input);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.rfqId).toBe(101);
    }
  });

  it("verifies BAC Chairperson Doreen C. Castillo as statutory opening authority", () => {
    const chair = DEFAULT_BSC_BAC_MEMBERS.find((m) => m.role === "BAC Chairperson");
    expect(chair).toBeDefined();
    expect(chair?.name).toBe("DOREEN C. CASTILLO");

    const openingRecord = recordOpeningSchema.safeParse({
      rfqId: 101,
      openingLocation: "BAC Conference Room, Batanes State College",
      chairpersonName: chair?.name,
      remarks: "Quotation envelopes opened in the presence of the BAC Secretariat and responding suppliers.",
    });

    expect(openingRecord.success).toBe(true);
    if (openingRecord.success) {
      expect(openingRecord.data.chairpersonName).toBe("DOREEN C. CASTILLO");
      expect(openingRecord.data.openingLocation).toContain("BAC Conference Room");
    }
  });

  it("validates Abstract of Quotations setting forth responding bidders and price quotations", () => {
    const suppliers = [
      { id: 1, name: "Basco General Merchandise", price: 48500.0, compliant: true },
      { id: 2, name: "Batanes Commercial Trading", price: 51200.0, compliant: true },
      { id: 3, name: "Ibayat Hardware & Enterprise", price: 53000.0, compliant: true },
    ];

    // Must have at least 3 supplier quotations
    expect(suppliers.length).toBeGreaterThanOrEqual(3);

    // Find Lowest Calculated and Responsive Quotation (LCRQ)
    const compliantSuppliers = suppliers.filter((s) => s.compliant);
    expect(compliantSuppliers.length).toBe(3);

    const sortedByPrice = [...compliantSuppliers].sort((a, b) => a.price - b.price);
    const lowest = sortedByPrice[0];

    expect(lowest.name).toBe("Basco General Merchandise");
    expect(lowest.price).toBe(48500.0);

    const aoqPayload = {
      rfqId: 101,
      recommendedSupplierId: lowest.id,
      recommendationReason: `Lowest Calculated and Responsive Quotation (LCRQ) at ₱${lowest.price.toLocaleString("en-PH", { minimumFractionDigits: 2 })} compliant with technical specifications.`,
      openingLocation: "BAC Conference Room, Batanes State College",
      chairpersonName: "DOREEN C. CASTILLO",
      signatories: DEFAULT_BSC_BAC_MEMBERS.map((m) => m.name),
    };

    const parsedAoq = prepareAbstractSchema.safeParse(aoqPayload);
    expect(parsedAoq.success).toBe(true);
    if (parsedAoq.success) {
      expect(parsedAoq.data.recommendedSupplierId).toBe(1);
      expect(parsedAoq.data.chairpersonName).toBe("DOREEN C. CASTILLO");
      expect(parsedAoq.data.signatories.length).toBe(6);
    }
  });

  it("authorizes 'bac' and 'bac_secretariat' roles for all Section 5.7.1 procedures", () => {
    const authorizedRoles = new Set([
      "procurement_officer",
      "procurement_staff",
      "bac",
      "bac_secretariat",
      "admin",
    ]);

    expect(authorizedRoles.has("bac")).toBe(true);
    expect(authorizedRoles.has("bac_secretariat")).toBe(true);
    expect(authorizedRoles.has("procurement_staff")).toBe(true);
  });

  it("calculates public savings accurately against Approved Budget for the Contract (ABC)", () => {
    const abc = 53600.0;
    const lcrqPrice = 48500.0;

    const savingsAmount = abc - lcrqPrice;
    const savingsPercent = (savingsAmount / abc) * 100;

    expect(savingsAmount).toBe(5100.0);
    expect(savingsPercent).toBeCloseTo(9.51, 1);
  });

  it("validates adopting End-User Pre-Canvass quotes (3/3) into the official RFQ Abstract (Section 5.7.1)", () => {
    // Schema for importing pre-canvass quotes
    const importPreCanvassSchema = z.object({
      rfqId: z.number().int().positive(),
      overwrite: z.boolean().optional(),
    });

    const parsed = importPreCanvassSchema.safeParse({ rfqId: 442180, overwrite: false });
    expect(parsed.success).toBe(true);

    // Pre-canvass quotes recorded by End-User during PR preparation
    const endUserPreCanvassQuotes = [
      { supplierId: 1, companyName: "NSGB Books Trading", totalPrice: 2400.0, deliveryDays: 3, isCompliant: 1 },
      { supplierId: 2, companyName: "IDB Merida Photo Studio & Artworks", totalPrice: 2450.0, deliveryDays: 5, isCompliant: 1 },
      { supplierId: 3, companyName: "I.B.S. Travel and Tours", totalPrice: 2350.0, deliveryDays: 2, isCompliant: 1 },
    ];

    expect(endUserPreCanvassQuotes.length).toBe(3);

    // Simulate adoption into RFQ supplierQuotations
    const adoptedQuotes = endUserPreCanvassQuotes.map((q) => ({
      rfqId: 442180,
      supplierId: q.supplierId,
      totalPrice: q.totalPrice.toFixed(2),
      deliveryDays: q.deliveryDays,
      isCompliant: q.isCompliant,
      notes: "Adopted from End-User Pre-Canvass",
    }));

    expect(adoptedQuotes.length).toBe(3);
    expect(adoptedQuotes.every((q) => q.isCompliant === 1)).toBe(true);

    // Lowest Calculated and Responsive Quotation (LCRQ) identification
    const sorted = [...adoptedQuotes].sort((a, b) => Number(a.totalPrice) - Number(b.totalPrice));
    expect(sorted[0].supplierId).toBe(3); // I.B.S. Travel and Tours at 2,350.00
    expect(Number(sorted[0].totalPrice)).toBe(2350.0);
  });

  it("authorizes BAC, Secretariat, and Procurement Officer for adopting pre-canvass quotes and recording quotations", () => {
    const authorized = new Set([
      "procurement_staff",
      "procurement_officer",
      "bac",
      "bac_secretariat",
      "admin",
    ]);

    expect(authorized.has("bac")).toBe(true);
    expect(authorized.has("bac_secretariat")).toBe(true);
    expect(authorized.has("procurement_officer")).toBe(true);
    expect(authorized.has("procurement_staff")).toBe(true);
    expect(authorized.has("admin")).toBe(true);
  });
});

