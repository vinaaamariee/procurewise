import { describe, expect, it } from "vitest";
import type { User } from "../drizzle/schema";
import {
  advancePurchaseRequest,
  verifyPurchaseRequestPackage,
  returnPurchaseRequestForRevision,
  recordPurchaseRequestToPmr,
  createPurchaseOrderFromPreCanvass,
  decideAbstractOfCanvass,
  logPmr,
  recordDelivery,
  submitPreCanvass,
  transmitRfqToBac,
} from "./db";
import {
  detectItemCategory,
  detectMixedCategories,
  hasRequiredSupplierQuotations,
  normalizeProcurementRole,
  roleCanAct,
  SECTION_5_1_1_CATEGORIES,
} from "../shared/procurementRules";

// Demo personas according to system setup
const endUser: User = {
  id: 101,
  openId: "enduser-demo",
  name: "End-User Demo",
  email: "enduser.demo@bsc.edu.ph",
  loginMethod: "demo",
  role: "end_user",
  officeName: "General Education Department",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

const officer: User = {
  id: 102,
  openId: "officer-demo",
  name: "Procurement Officer Demo",
  email: "officer.demo@bsc.edu.ph",
  loginMethod: "demo",
  role: "procurement_officer",
  officeName: "Procurement Office",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

const staff: User = {
  id: 103,
  openId: "staff-demo",
  name: "Procurement Staff Demo",
  email: "staff.demo@bsc.edu.ph",
  loginMethod: "demo",
  role: "procurement_staff",
  officeName: "Procurement Office",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

const bac: User = {
  id: 104,
  openId: "bac-demo",
  name: "BAC Secretariat Demo",
  email: "bac.demo@bsc.edu.ph",
  loginMethod: "demo",
  role: "bac",
  officeName: "Bids and Awards Committee",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

const hope: User = {
  id: 105,
  openId: "hope-demo",
  name: "HoPE Demo",
  email: "hope.demo@bsc.edu.ph",
  loginMethod: "demo",
  role: "hope",
  officeName: "Office of the College President",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

const budgetOfficer: User = {
  id: 106,
  openId: "budget-demo",
  name: "Budget Officer Demo",
  email: "budget.demo@bsc.edu.ph",
  loginMethod: "demo",
  role: "budget_officer",
  officeName: "Budget and Finance Office",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

function fakeDb(selectQueue: unknown[][]) {
  let selectIdx = 0;
  const updates: unknown[] = [];
  const inserts: unknown[] = [];
  const auditLogs: unknown[] = [];

  const db = {
    select: () => ({
      from: () => ({
        where: () => {
          const rows = selectQueue[selectIdx++] ?? [];
          return {
            limit: async () => rows,
            orderBy: () => ({
              limit: async () => rows,
            }),
            then: (resolve: (val: unknown[]) => unknown) => Promise.resolve(rows).then(resolve),
          };
        },
      }),
    }),
    update: () => ({
      set: (val: unknown) => ({
        where: async () => {
          updates.push(val);
        },
      }),
    }),
    insert: () => ({
      values: async (val: unknown) => {
        inserts.push(val);
      },
    }),
  };

  const recordAudit = async (evt: unknown) => {
    auditLogs.push(evt);
  };

  return { db, updates, inserts, auditLogs, recordAudit };
}

describe("Automated End-to-End Procurement Lifecycle & Workflow Audit", () => {
  // --------------------------------------------------------------------------
  // STAGE 1: End-User PR Creation & Package Forwarding
  // --------------------------------------------------------------------------
  describe("Stage 1: End-User (enduser.demo@bsc.edu.ph)", () => {
    it("successfully submits PR ('Procurement of Office Supplies', ABC: ₱85,000.00) with PPMP and 3 valid quotes", async () => {
      const pr = {
        id: 501,
        prNumber: "PR-2026-00085",
        officeId: 1,
        objectOfExpenditureId: 1,
        totalEstimate: "85000.00",
        status: "draft",
        ppmpEntryId: 10,
        purpose: "Procurement of Office Supplies",
      };

      const preCanvass = {
        id: 601,
        purchaseRequestId: 501,
        status: "draft",
      };

      const quotes = [
        { id: 1, preCanvassId: 601, supplierId: 10, totalPrice: "83500.00", deliveryDays: 7, isCompliant: 1 },
        { id: 2, preCanvassId: 601, supplierId: 11, totalPrice: "84200.00", deliveryDays: 5, isCompliant: 1 },
        { id: 3, preCanvassId: 601, supplierId: 12, totalPrice: "85000.00", deliveryDays: 10, isCompliant: 1 },
      ];
      const attachment = { id: 1, entityType: "pre_canvass", entityId: 601, documentType: "Preliminary Abstract of Quotations" };

      const allotment = {
        officeId: 1,
        objectOfExpenditureId: 1,
        fiscalYear: new Date().getFullYear(),
        allottedAmount: "250000.00",
        committedAmount: "0.00",
      };

      const fake = fakeDb([[pr], [preCanvass], quotes, [attachment], [allotment]]);

      const result = await advancePurchaseRequest(
        { purchaseRequestId: 501, nextStatus: "procurement_review" },
        endUser,
        { db: fake.db as never, recordAudit: fake.recordAudit }
      );

      expect(result.status).toBe("procurement_review");
      expect(fake.updates).toContainEqual(expect.objectContaining({ status: "submitted" }));
      expect(fake.updates).toContainEqual(expect.objectContaining({ status: "procurement_review" }));
    });

    it("blocks package forwarding when pre-canvass has fewer than 3 supplier quotes", async () => {
      const pr = {
        id: 501,
        prNumber: "PR-2026-00085",
        officeId: 1,
        objectOfExpenditureId: 1,
        totalEstimate: "85000.00",
        status: "draft",
        ppmpEntryId: 10,
      };

      const preCanvass = { id: 601, purchaseRequestId: 501, status: "draft" };
      const insufficientQuotes = [
        { id: 1, preCanvassId: 601, supplierId: 10, totalPrice: "83500.00", deliveryDays: 7, isCompliant: 1 },
        { id: 2, preCanvassId: 601, supplierId: 11, totalPrice: "84200.00", deliveryDays: 5, isCompliant: 1 },
      ];

      const fake = fakeDb([[pr], [preCanvass], insufficientQuotes]);

      await expect(
        advancePurchaseRequest(
          { purchaseRequestId: 501, nextStatus: "procurement_review" },
          endUser,
          { db: fake.db as never, recordAudit: fake.recordAudit }
        )
      ).rejects.toThrow("Submit a complete three-supplier Pre-Canvass before forwarding the procurement package.");
    });
  });

  // --------------------------------------------------------------------------
  // STAGE 2: Procurement Officer Verification & Section 5.1.1 Segregation
  // --------------------------------------------------------------------------
  describe("Stage 2: Procurement Officer (officer.demo@bsc.edu.ph)", () => {
    it("accurately detects Section 5.1.1 category segregation across Office Supplies vs ICT/Hardware/Catering/Printing", () => {
      // Clean office supplies
      const officeSupplies = [
        { description: "Bond Paper A4 70gsm" },
        { description: "Ballpen Black 0.5mm" },
        { description: "Heavy Duty Stapler" },
      ];
      const officeCheck = detectMixedCategories(officeSupplies);
      expect(officeCheck.isMixed).toBe(false);
      expect(officeCheck.detectedCategories).toEqual(["office_supplies"]);

      // Mixed: Office supplies + ICT equipment
      const mixedItems = [
        { description: "Bond Paper A4 70gsm" },
        { description: "Laptop Core i7 16GB RAM" },
        { description: "Heavy Duty Stapler" },
      ];
      const mixedCheck = detectMixedCategories(mixedItems);
      expect(mixedCheck.isMixed).toBe(true);
      expect(mixedCheck.detectedCategories).toContain("office_supplies");
      expect(mixedCheck.detectedCategories).toContain("ict_supplies");

      // Mixed: Hardware + Catering/Food
      const hardwareFood = [
        { description: "Portland Cement 40kg" },
        { description: "Jasmine Rice 50kg Sack" },
      ];
      const hardwareFoodCheck = detectMixedCategories(hardwareFood);
      expect(hardwareFoodCheck.isMixed).toBe(true);
      expect(hardwareFoodCheck.detectedCategories).toContain("hardware_supplies");
      expect(hardwareFoodCheck.detectedCategories).toContain("food_ingredients");
    });

    it("verifies and clears compliant PR package for Staff PMR recording", async () => {
      const pr = {
        id: 501,
        prNumber: "PR-2026-00085",
        status: "procurement_review",
        procurementReviewedById: null,
      };

      const fake = fakeDb([[pr]]);

      const verified = await verifyPurchaseRequestPackage(501, officer, {
        db: fake.db as never,
        recordAudit: fake.recordAudit,
        categorySegregationVerified: true,
      });

      expect(verified.procurementReviewedById).toBe(officer.id);
      expect(fake.updates).toContainEqual(
        expect.objectContaining({ procurementReviewedById: officer.id })
      );
      expect(fake.auditLogs).toContainEqual(
        expect.objectContaining({
          action: "officer_verified",
          details: expect.objectContaining({
            categorySegregationVerified: true,
            section511Compliant: true,
          }),
        })
      );
    });

    it("returns non-compliant (mixed category) PR back to End-User with remarks", async () => {
      const pr = {
        id: 502,
        prNumber: "PR-2026-00086",
        status: "procurement_review",
      };

      const fake = fakeDb([[pr]]);

      await returnPurchaseRequestForRevision(
        {
          purchaseRequestId: 502,
          reason: "Mixed item categories detected (Non-compliant with Section 5.1.1). Please separate items into individual requests per category.",
          remarks: "Item 2 (Laptop) belongs to ICT Supplies; please remove and file under ICT category.",
        },
        officer,
        { db: fake.db as never, recordAudit: fake.recordAudit }
      );

      expect(fake.updates).toContainEqual(expect.objectContaining({ status: "returned" }));
      expect(fake.auditLogs).toContainEqual(
        expect.objectContaining({
          action: "returned_for_revision",
          details: expect.objectContaining({
            section511NonCompliant: true,
          }),
        })
      );
    });

    it("blocks unauthorized roles (e.g. End-User or BAC) from executing PR verification", async () => {
      const fake = fakeDb([[]]);
      await expect(
        verifyPurchaseRequestPackage(501, endUser, { db: fake.db as never, recordAudit: fake.recordAudit })
      ).rejects.toThrow("Your assigned role is not authorized to verify Purchase Requests.");
    });
  });

  // --------------------------------------------------------------------------
  // STAGE 3: Procurement Staff PMR Logging & RFQ Handoff
  // --------------------------------------------------------------------------
  describe("Stage 3: Procurement Staff (staff.demo@bsc.edu.ph)", () => {
    it("successfully records verified PR to PMR and auto-populates metadata", async () => {
      const pr = {
        id: 501,
        prNumber: "PR-2026-00085",
        trackingToken: "TRK-2026-85000-ABC",
        ppmpEntryId: 10,
        procurementReviewedById: officer.id,
        status: "procurement_review",
      };

      const fake = fakeDb([[pr]]);

      const pmrResult = await recordPurchaseRequestToPmr(
        { purchaseRequestId: 501, remarks: "Recorded for FY2026 Q1 procurement schedule" },
        staff,
        { db: fake.db as never, recordAudit: fake.recordAudit }
      );

      expect(pmrResult.success).toBe(true);
      expect(pmrResult.prNumber).toBe("PR-2026-00085");
      expect(pmrResult.pmrReference).toMatch(/^PMR-\d{4}-00501$/);
      expect(fake.auditLogs).toContainEqual(
        expect.objectContaining({
          action: "recorded_to_pmr",
          performedByRole: "procurement_staff",
        })
      );
    });

    it("blocks PMR recording if the PR was NOT verified by the Procurement Officer", async () => {
      const unverifiedPr = {
        id: 503,
        prNumber: "PR-2026-00087",
        procurementReviewedById: null,
        status: "procurement_review",
      };

      const fake = fakeDb([[unverifiedPr]]);

      await expect(
        recordPurchaseRequestToPmr({ purchaseRequestId: 503 }, staff, {
          db: fake.db as never,
          recordAudit: fake.recordAudit,
        })
      ).rejects.toThrow("permitted only after the Procurement Officer has received and verified the PR & PPMP");
    });
  });

  // --------------------------------------------------------------------------
  // STAGE 4: BAC Secretariat & Member Annex F AOQ & LCRB Recommendation
  // --------------------------------------------------------------------------
  describe("Stage 4: BAC Secretariat & Members (bac.demo@bsc.edu.ph)", () => {
    it("verifies minimum 3-quote requirement on Abstract of Canvass (AOQ)", () => {
      const quotes2 = [{ id: 1 }, { id: 2 }];
      const quotes3 = [{ id: 1 }, { id: 2 }, { id: 3 }];
      expect(hasRequiredSupplierQuotations(quotes2.length)).toBe(false);
      expect(hasRequiredSupplierQuotations(quotes3.length)).toBe(true);
    });

    it("records BAC resolution recommending Lowest Calculated & Responsive Bidder (LCRB)", async () => {
      const abstract = { id: 701, preCanvassId: 601, status: "recommended" };
      const preCanvass = { id: 601, purchaseRequestId: 501 };

      const fake = fakeDb([[abstract], [preCanvass]]);

      await decideAbstractOfCanvass(
        {
          preCanvassId: 601,
          decision: "approved",
          remarks: "BAC Resolution No. 2026-042 recommending award to Lowest Calculated & Responsive Bidder",
        },
        bac,
        { db: fake.db as never, recordAudit: fake.recordAudit }
      );

      expect(fake.updates).toContainEqual(
        expect.objectContaining({
          status: "approved",
          decidedById: bac.id,
        })
      );
    });
  });

  // --------------------------------------------------------------------------
  // STAGE 5: Head of Procuring Entity (HoPE) Approval
  // --------------------------------------------------------------------------
  describe("Stage 5: HoPE (hope.demo@bsc.edu.ph)", () => {
    it("reviews and executes official administrative approval of BAC award recommendation", async () => {
      const abstract = { id: 701, preCanvassId: 601, status: "recommended" };
      const preCanvass = { id: 601, purchaseRequestId: 501 };

      const fake = fakeDb([[abstract], [preCanvass]]);

      await decideAbstractOfCanvass(
        {
          preCanvassId: 601,
          decision: "approved",
          remarks: "Approved for contract issuance and PO generation per RA 12009 (NGPA).",
        },
        hope,
        { db: fake.db as never, recordAudit: fake.recordAudit }
      );

      expect(fake.updates).toContainEqual(
        expect.objectContaining({
          status: "approved",
          administrativeApprovedById: hope.id,
        })
      );
    });
  });

  // --------------------------------------------------------------------------
  // STAGE 6: Budget Officer Allotment & Funds Certification
  // --------------------------------------------------------------------------
  describe("Stage 6: Budget Officer (budget.demo@bsc.edu.ph)", () => {
    it("verifies budget availability and normalizes role permissions correctly", () => {
      const normalized = normalizeProcurementRole(budgetOfficer.role);
      expect(normalized).toBe("administrative_approver");
      expect(roleCanAct(normalized, ["administrative_approver", "admin"])).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // STAGE 7: Procurement Officer Notice Serving, PO Release & Delivery
  // --------------------------------------------------------------------------
  describe("Stage 7: Procurement Officer PO Releasing & Milestone Tracking", () => {
    it("successfully creates PO from approved abstract and advances to delivery and PMR close-out", async () => {
      const abstract = { id: 701, preCanvassId: 601, status: "approved", recommendedSupplierId: 10 };
      const preCanvass = { id: 601, purchaseRequestId: 501 };
      const pr = { id: 501, status: "approved" };
      const quote = { supplierId: 10, totalPrice: "83500.00" };
      const po = { id: 801, poNumber: "PO-2026-00085", purchaseRequestId: 501, status: "issued" };
      const poForPmr = { ...po, status: "delivered" };

      const fake = fakeDb([
        [abstract],
        [preCanvass],
        [pr],
        [quote],
        [],
        [po],
        [po],
        [poForPmr],
      ]);

      const createdPo = await createPurchaseOrderFromPreCanvass(601, officer, {
        db: fake.db as never,
        recordAudit: fake.recordAudit,
      });

      expect(createdPo).toBeDefined();

      await recordDelivery(
        { purchaseOrderId: 801, receiptNumber: "DR-2026-0085", deliveryStatus: "complete" },
        officer,
        { db: fake.db as never, recordAudit: fake.recordAudit }
      );

      await logPmr(
        { purchaseOrderId: 801, pmrNumber: "PMR-2026-0085" },
        officer,
        { db: fake.db as never, recordAudit: fake.recordAudit }
      );

      expect(fake.updates).toContainEqual({ status: "closed" });
    });
  });

  // --------------------------------------------------------------------------
  // OPERATIONAL & WORKFLOW RED FLAG AUDIT
  // --------------------------------------------------------------------------
  describe("Operational & Workflow Red Flag Audit", () => {
    it("flags that End-Users are NOT blocked during initial PR creation if items are mixed across categories", () => {
      // Line items with mixed Office Supplies and Hardware Supplies
      const mixedItems = [
        { description: "Bond Paper Sub 20 A4", quantity: 10, unit: "reams", estimatedUnitCost: 250 },
        { description: "Portland Cement 40kg", quantity: 20, unit: "bags", estimatedUnitCost: 280 },
      ];

      // Detection utility correctly identifies the violation
      const detection = detectMixedCategories(mixedItems);
      expect(detection.isMixed).toBe(true);
      expect(detection.detectedCategories).toEqual(["office_supplies", "hardware_supplies"]);

      // AUDIT FINDING:
      // The End-User creation form does not reject detectMixedCategories before submission.
      // Category segregation is only validated downstream by the Procurement Officer on OfficerPrVerificationPage.
    });

    it("verifies cross-stage data handoff continuity without manual re-typing", async () => {
      const pr = {
        id: 555,
        prNumber: "PR-2026-00555",
        purpose: "Procurement of Office Supplies and Stationery",
        totalEstimate: "85000.00",
        officeId: 2,
        trackingToken: "TRK-2026-00555-XYZ",
        procurementReviewedById: officer.id,
        status: "procurement_review",
      };

      // 1. Staff PMR logging auto-populates PR number and auto-generates PMR reference
      const fake = fakeDb([[pr]]);
      const pmrResult = await recordPurchaseRequestToPmr({ purchaseRequestId: 555 }, staff, {
        db: fake.db as never,
        recordAudit: fake.recordAudit,
      });

      expect(pmrResult.prNumber).toBe(pr.prNumber);
      expect(pmrResult.trackingToken).toBe(pr.trackingToken);
      expect(pmrResult.pmrReference).toBe(`PMR-${new Date().getFullYear()}-00555`);
    });

    it("enforces PhilGEPS mandatory threshold (> ₱50,000.00) before transmitting RFQ to BAC", async () => {
      const rfqAboveThreshold = { id: 10, rfqNumber: "RFQ-2026-0010", purchaseRequestId: 555 };
      const prAboveThreshold = { id: 555, prNumber: "PR-2026-00555", totalEstimate: "85000.00" };

      // Case 1: Package > ₱50,000 without PhilGEPS posting -> BLOCKED
      const fakeBlocked = fakeDb([
        [rfqAboveThreshold], // rfq query
        [prAboveThreshold],  // pr query
        [],                  // auditTrails query (no philgeps_posted records)
      ]);

      await expect(
        transmitRfqToBac({ rfqId: 10 }, officer, {
          db: fakeBlocked.db as never,
          recordAudit: fakeBlocked.recordAudit,
        })
      ).rejects.toThrow(
        "Under RA 12009 (NGPA) Article III / PhilGEPS electronic posting rules, procurement packages with ABC exceeding ₱50,000.00 require a documented PhilGEPS posting reference number before transmittal to BAC."
      );

      // Case 2: Package > ₱50,000 WITH PhilGEPS posting -> ALLOWED
      const mockTransmittal = { id: 801, transmittalNumber: "BAC-T-2026-0001001", purchaseRequestId: 555, status: "sent" };
      const fakeAllowed = fakeDb([
        [rfqAboveThreshold], // rfq query
        [prAboveThreshold],  // pr query
        [{ entityId: 555, action: "philgeps_posted", details: { philgepsReferenceNumber: "PHILGEPS-2026-88123" } }], // auditTrails query
        [mockTransmittal],   // bacTransmittals select
      ]);

      const result = await transmitRfqToBac({ rfqId: 10 }, officer, {
        db: fakeAllowed.db as never,
        recordAudit: fakeAllowed.recordAudit,
      });

      expect(result).toBeDefined();
      expect(result?.transmittalNumber).toBe(mockTransmittal.transmittalNumber);

      // Case 3: Package <= ₱50,000 without PhilGEPS posting -> ALLOWED (Small value below threshold)
      const rfqBelowThreshold = { id: 11, rfqNumber: "RFQ-2026-0011", purchaseRequestId: 556 };
      const prBelowThreshold = { id: 556, prNumber: "PR-2026-00556", totalEstimate: "35000.00" };
      const mockTransmittalBelow = { id: 802, transmittalNumber: "BAC-T-2026-0001002", purchaseRequestId: 556, status: "sent" };

      const fakeBelow = fakeDb([
        [rfqBelowThreshold], // rfq query
        [prBelowThreshold],   // pr query (<= 50k, does not query auditTrails for philgeps)
        [mockTransmittalBelow], // bacTransmittals select
      ]);

      const resultBelow = await transmitRfqToBac({ rfqId: 11 }, officer, {
        db: fakeBelow.db as never,
        recordAudit: fakeBelow.recordAudit,
      });

      expect(resultBelow).toBeDefined();
      expect(resultBelow?.transmittalNumber).toBe(mockTransmittalBelow.transmittalNumber);
    });

    it("enforces button & state actionability: blocks PO issuance before administrative approval", async () => {
      const unapprovedAbstract = { id: 777, preCanvassId: 888, status: "recommended", recommendedSupplierId: 10 };
      const preCanvass = { id: 888, purchaseRequestId: 555 };
      const unapprovedPr = { id: 555, status: "procurement_review" };

      const fake = fakeDb([[unapprovedAbstract], [preCanvass], [unapprovedPr]]);

      await expect(
        createPurchaseOrderFromPreCanvass(888, officer, { db: fake.db as never, recordAudit: fake.recordAudit })
      ).rejects.toThrow("An approved Abstract of Canvass is required before a Purchase Order can be issued.");
    });
  });

  // --------------------------------------------------------------------------
  // PRINT PREVIEW & DOCUMENT GENERATION AUDIT
  // --------------------------------------------------------------------------
  describe("Print Preview & Document Generation Audit", () => {
    it("verifies A4 dimensions, margins, and header/footer flush styling in CSS", () => {
      const fs = require("node:fs");
      const path = require("node:path");
      const indexCss = fs.readFileSync(path.resolve(__dirname, "../client/src/index.css"), "utf8");

      // Verify A4 Portrait dimensions
      expect(indexCss).toContain("width: 210mm !important");
      expect(indexCss).toContain("min-height: 297mm !important");

      // Verify A4 Landscape dimensions
      expect(indexCss).toContain("width: 297mm !important");
      expect(indexCss).toContain("min-height: 210mm !important");
      expect(indexCss).toContain("size: A4 landscape");

      // Verify flush edge-to-edge header & footer without double margins
      expect(indexCss).toContain(".evaluation-header-container");
      expect(indexCss).toContain(".evaluation-footer-container");
      expect(indexCss).toContain("margin: 0 !important");
      expect(indexCss).toContain("padding: 0 !important");

      // Verify table cell word breaking to prevent table boundary blowout
      expect(indexCss).toContain("word-break: break-word");
      expect(indexCss).toContain("overflow-wrap: anywhere");
    });

    it("verifies single-page print integrity preventing signature overflow", () => {
      const fs = require("node:fs");
      const path = require("node:path");
      const indexCss = fs.readFileSync(path.resolve(__dirname, "../client/src/index.css"), "utf8");

      expect(indexCss).toContain("page-break-after: avoid !important");
      expect(indexCss).toContain("page-break-inside: avoid !important");
    });
  });

  // --------------------------------------------------------------------------
  // UI/UX & RESPONSIVE LAYOUT AUDIT
  // --------------------------------------------------------------------------
  describe("UI/UX & Responsive Layout Audit", () => {
    it("verifies sidebar collapse behavior, rail width, and icon centering", () => {
      const fs = require("node:fs");
      const path = require("node:path");
      const dashboardLayout = fs.readFileSync(path.resolve(__dirname, "../client/src/components/DashboardLayout.tsx"), "utf8");

      // Collapsed rail width w-[72px] vs expanded w-64
      expect(dashboardLayout).toContain('isCollapsed ? "w-[72px]" : "w-64"');

      // Collapsed centered logo & navigation icons
      expect(dashboardLayout).toContain('mx-auto my-3 flex h-9 w-9 shrink-0 items-center justify-center');
      expect(dashboardLayout).toContain('w-full flex justify-center items-center px-0 my-2 rounded-xl py-2');

      // Centered folder tab toggle button with directional chevrons
      expect(dashboardLayout).toContain('absolute top-1/2 -translate-y-1/2 -right-3.5 z-40');
      expect(dashboardLayout).toContain('ChevronRight');
      expect(dashboardLayout).toContain('ChevronLeft');

      // Pinned profile card in viewport at all times
      expect(dashboardLayout).toContain('shrink-0 border-t border-slate-200 dark:border-slate-800 p-3 bg-inherit space-y-2');

      // Viewport-locked height: flex-col with scrollable nav area only
      expect(dashboardLayout).toContain('flex flex-col justify-between h-screen max-h-screen overflow-hidden border-r');
      expect(dashboardLayout).toContain('flex-1 min-h-0 overflow-y-auto px-3 py-2');

      // Top padding breathing room on main content
      expect(dashboardLayout).toContain('pt-20 lg:pt-10 px-4 sm:px-6 md:px-8 pb-12');
    });

    it("verifies single-spot theme toggle and decoupled notification center", () => {
      const fs = require("node:fs");
      const path = require("node:path");
      const dashboardLayout = fs.readFileSync(path.resolve(__dirname, "../client/src/components/DashboardLayout.tsx"), "utf8");

      // Verify ThemeToggle and NotificationCenterDrawer are integrated together in sidebar header
      expect(dashboardLayout).toContain('<NotificationCenterDrawer triggerVariant="minimal" />');
      expect(dashboardLayout).toContain('<ThemeToggle />');
    });
  });
});

