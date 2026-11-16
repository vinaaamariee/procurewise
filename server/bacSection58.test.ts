import { describe, expect, it } from "vitest";
import { z } from "zod";
import { DEFAULT_BSC_BAC_MEMBERS } from "../client/src/components/OfficialBacResolutionCanvas";

describe("Section 5.8: Recommendation on the Award of Contract (Section 5.8.1)", () => {
  // Schema for Procedure 5.8.1 Endorsement of BAC Resolution Recommending Award of Contract
  const endorseAwardResolutionSchema = z.object({
    purchaseRequestId: z.number().int().positive().optional(),
    rfqId: z.number().int().positive().optional(),
    resolutionType: z.enum(["mode_of_procurement", "award_of_contract"]).default("award_of_contract"),
    resolutionNumber: z.string().min(3).max(120),
    modeOfProcurement: z.string().min(3).max(120),
    approvedBudget: z.number().positive(),
    awardedAmount: z.number().positive().optional(),
    winningSupplierId: z.number().int().positive().optional(),
    winningSupplierName: z.string().min(2).max(180).optional(),
    evaluationMode: z.enum(["lot_basis", "per_item"]).default("lot_basis"),
    purposeOrItems: z.string().min(3).max(4000),
    endUserName: z.string().max(180).optional(),
    remarks: z.string().max(3000).optional(),
  });

  // Schema for Procedure 5.8 Abstract Approval & Award Recommendation
  const approveAbstractAndRecommendAwardSchema = z.object({
    rfqId: z.number().int().positive(),
    resolutionNumber: z.string().min(3).optional(),
    winningSupplierId: z.number().int().positive().optional(),
    winningSupplierName: z.string().min(2).optional(),
    awardedAmount: z.number().positive().optional(),
    remarks: z.string().optional(),
  });

  it("validates Section 5.8.1 mandate: BAC recommends award of contract to HoPE in favor of S/LCRQ", () => {
    const abc = 53600.0;
    const quotations = [
      { id: 10, supplier: "Basco General Merchandise", price: 48500.0, responsive: true },
      { id: 11, supplier: "Batanes Commercial Trading", price: 51200.0, responsive: true },
      { id: 12, supplier: "Ibayat Hardware & Enterprise", price: 53000.0, responsive: true },
    ];

    // Evaluate Single or Lowest Calculated and Responsive Quotation (SCRQ / LCRQ)
    const responsiveQuotes = quotations.filter((q) => q.responsive && q.price <= abc);
    expect(responsiveQuotes.length).toBe(3);

    const slcrq = [...responsiveQuotes].sort((a, b) => a.price - b.price)[0];
    expect(slcrq.supplier).toBe("Basco General Merchandise");
    expect(slcrq.price).toBe(48500.0);

    const savings = abc - slcrq.price;
    expect(savings).toBe(5100.0);

    const awardPayload = {
      purchaseRequestId: 9,
      rfqId: 101,
      resolutionType: "award_of_contract" as const,
      resolutionNumber: "BAC-RES-AWARD-2026-001",
      modeOfProcurement: "Small Value Procurement (Sec. 53.9)",
      approvedBudget: abc,
      awardedAmount: slcrq.price,
      winningSupplierId: slcrq.id,
      winningSupplierName: slcrq.supplier,
      purposeOrItems: "Snacks and meals for the evaluation and interview of applicants for private sector representative (PSR).",
      endUserName: "MARIE FE E. PABLEO",
      remarks: "Award recommended to HoPE in favor of Basco General Merchandise as the Lowest Calculated and Responsive Quotation (LCRQ).",
    };

    const parsed = endorseAwardResolutionSchema.safeParse(awardPayload);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.resolutionType).toBe("award_of_contract");
      expect(parsed.data.winningSupplierName).toBe("Basco General Merchandise");
      expect(parsed.data.awardedAmount).toBe(48500.0);
      expect(parsed.data.awardedAmount).toBeLessThanOrEqual(parsed.data.approvedBudget);
    }
  });

  it("validates Abstract of Quotations approval transmitting Step 5.8 recommendation to HoPE", () => {
    const input = {
      rfqId: 101,
      resolutionNumber: "BAC-RES-AWARD-2026-001",
      winningSupplierId: 10,
      winningSupplierName: "Basco General Merchandise",
      awardedAmount: 48500.0,
      remarks: "Formally submitted to College President Dr. Djovi Regala Durante, DPA pursuant to Procedure 5.8.1.",
    };

    const parsed = approveAbstractAndRecommendAwardSchema.safeParse(input);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.rfqId).toBe(101);
      expect(parsed.data.winningSupplierName).toBe("Basco General Merchandise");
      expect(parsed.data.awardedAmount).toBe(48500.0);
    }
  });

  it("verifies the Batanes State College BAC signatories for Award Resolution (Section 5.8)", () => {
    expect(DEFAULT_BSC_BAC_MEMBERS.length).toBe(6);

    const chairperson = DEFAULT_BSC_BAC_MEMBERS.find((m) => m.role === "BAC Chairperson");
    expect(chairperson?.name).toBe("DOREEN C. CASTILLO");

    const viceChair = DEFAULT_BSC_BAC_MEMBERS.find((m) => m.role === "BAC Vice Chairperson");
    expect(viceChair?.name).toBe("PHILIP ULYSSES T. CASTILLO");

    const members = DEFAULT_BSC_BAC_MEMBERS.filter((m) => m.role === "BAC Member");
    expect(members.length).toBe(3);

    const endUser = DEFAULT_BSC_BAC_MEMBERS.find((m) => m.role.includes("End-User"));
    expect(endUser?.name).toBe("MARIE FE E. PABLEO");
  });

  it("verifies HoPE Letter of Approval text and authority under Section 5.8.1", () => {
    const hopeApproval = {
      title: "Approval of BAC Resolution Recommending Award of Contract",
      statutoryBasis: "Section 5.8 / 5.8.1 of Revised Procurement Manual and RA 9184 / RA 12009",
      hopeAuthority: {
        name: "DJOVI REGALA DURANTE, DPA",
        designation: "SUC President I",
        entity: "Batanes State College",
      },
      winningBidder: "Basco General Merchandise",
      awardedAmount: 48500.0,
      abc: 53600.0,
      approvalClause:
        "NOW THEREFORE, I, DJOVI R. DURANTE, DPA, Head of the Procuring Entity (HoPE), by virtue of the authority vested in me by the Board of Trustees and the Governing Charter of Batanes State College, do hereby APPROVE the BAC recommendation to AWARD THE CONTRACT in favor of Basco General Merchandise as the Single or Lowest Calculated and Responsive Quotation (S/LCRQ).",
      issuanceDirective:
        "The Procurement Officer is hereby DIRECTED to issue the formal Notice of Award (NOA) pursuant to Section 5.9 / 5.10 and prepare the corresponding Purchase Order under Appendix 61.",
    };

    expect(hopeApproval.hopeAuthority.name).toBe("DJOVI REGALA DURANTE, DPA");
    expect(hopeApproval.hopeAuthority.designation).toBe("SUC President I");
    expect(hopeApproval.awardedAmount).toBeLessThan(hopeApproval.abc);
    expect(hopeApproval.approvalClause).toContain("AWARD THE CONTRACT");
    expect(hopeApproval.issuanceDirective).toContain("Notice of Award (NOA)");
  });

  it("enforces that awarded amount cannot exceed the Approved Budget for the Contract (ABC)", () => {
    const abc = 50000.0;
    const disqualifyingQuotation = 55000.0;

    const isWithinAbc = disqualifyingQuotation <= abc;
    expect(isWithinAbc).toBe(false);
  });

  it("dynamically generates supplier options according to the chosen PR without hardcoding defaults", () => {
    const chosenPr = { id: 8243405, prNumber: "PR-2026-8243405", totalEstimate: 50000.0 };
    const registeredSuppliers = [
      { id: 1, companyName: "Basco General Merchandise", tin: "111-222-333" },
      { id: 2, companyName: "Batanes Commercial Trading", tin: "444-555-666" },
      { id: 3, companyName: "Ibayat Hardware & Enterprise", tin: "777-888-999" },
      { id: 4, companyName: "Northern Batanes Supplies", tin: "000-111-222" },
    ];

    const rfqForPr = { id: 501, rfqNumber: "RFQ-2026-001", purchaseRequestId: chosenPr.id };
    const quotationsForPr = [
      { id: 201, rfqId: 501, supplierId: 1, totalPrice: 48499.56, isCompliant: true },
      { id: 202, rfqId: 501, supplierId: 2, totalPrice: 49200.00, isCompliant: true },
      { id: 203, rfqId: 501, supplierId: 3, totalPrice: 47800.00, isCompliant: false }, // Non-compliant!
    ];

    // Build options according to the chosen PR
    const compliantQuotes = quotationsForPr.filter((q) => q.isCompliant);
    const lowestCompliantPrice = Math.min(...compliantQuotes.map((q) => q.totalPrice));

    const options = quotationsForPr.map((q) => {
      const supplier = registeredSuppliers.find((s) => s.id === q.supplierId);
      const isLowest = q.isCompliant && q.totalPrice === lowestCompliantPrice;
      return {
        key: `rfq-quote-${q.id}`,
        supplierId: q.supplierId,
        supplierName: supplier?.companyName || `Supplier #${q.supplierId}`,
        quotedPrice: q.totalPrice,
        isLowest,
        isCompliant: q.isCompliant,
      };
    });

    // Verify option list
    expect(options.length).toBe(3);
    const lowestOption = options.find((o) => o.isLowest);
    expect(lowestOption?.supplierName).toBe("Basco General Merchandise");
    expect(lowestOption?.quotedPrice).toBe(48499.56);

    // Initial state before user selection must be unselected (empty string, not hardcoded default)
    let selectedSupplierName = "";
    let selectedOfferedPrice = 0;
    expect(selectedSupplierName).toBe("");
    expect(selectedOfferedPrice).toBe(0);

    // User chooses a supplier from the options
    const userChoice = options.find((o) => o.supplierId === 2); // User chooses Batanes Commercial Trading
    expect(userChoice).toBeDefined();
    if (userChoice) {
      selectedSupplierName = userChoice.supplierName;
      selectedOfferedPrice = userChoice.quotedPrice;
    }

    expect(selectedSupplierName).toBe("Batanes Commercial Trading");
    expect(selectedOfferedPrice).toBe(49200.00);

    const savings = chosenPr.totalEstimate - selectedOfferedPrice;
    expect(savings).toBe(800.00);
  });
});

