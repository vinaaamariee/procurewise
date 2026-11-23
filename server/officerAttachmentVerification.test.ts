import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Procurement Officer Attachment Transparency and Correction Capabilities", () => {
  it("includes all uploaded documents, market scoping, PPMP, and preliminary quotes in officer verification query", () => {
    const dbSource = readFileSync(new URL("./db.ts", import.meta.url), "utf8");

    // listOfficerPrVerifications checks
    expect(dbSource).toContain("uploadedPpmpDoc");
    expect(dbSource).toContain("marketScopingDoc");
    expect(dbSource).toContain("preCanvassDoc");
    expect(dbSource).toContain("otherDocuments");
    expect(dbSource).toContain("linkedQuotes");
    expect(dbSource).toContain("linkedPreCanvass");
    expect(dbSource).toContain("procurementDocuments");
    expect(dbSource).toContain("preCanvassQuotes");

    // getPurchaseRequestDetail checks
    expect(dbSource).toContain("getPurchaseRequestDetail");
    expect(dbSource).toContain("linkedPpmp: linkedPpmp || null");
    expect(dbSource).toContain("preCanvassQuotes: mappedQuotes");
  });

  it("provides comprehensive transparency controls and in-app document preview in OfficerPrVerificationPage", () => {
    const pageSource = readFileSync(
      new URL("../client/src/pages/OfficerPrVerificationPage.tsx", import.meta.url),
      "utf8"
    );

    // Transparency panel and document cards
    expect(pageSource).toContain("End-User Uploaded Attachments");
    expect(pageSource).toContain("Market Scoping");
    expect(pageSource).toContain("RA 12009");
    expect(pageSource).toContain("End-User Preliminary Supplier Quotes");
    expect(pageSource).toContain("Additional Supporting Attachments");

    // Actionable preview and download links
    expect(pageSource).toContain("previewDoc");
    expect(pageSource).toContain("setPreviewDoc");
    expect(pageSource).toContain("Document In-App Preview Dialog");
    expect(pageSource).toContain("Download Original");
  });

  it("empowers officers with structured return presets for corrections (Market Scoping, Quotes, PPMP, Sec 5.1.1)", () => {
    const pageSource = readFileSync(
      new URL("../client/src/pages/OfficerPrVerificationPage.tsx", import.meta.url),
      "utf8"
    );

    // Preset list definition
    expect(pageSource).toContain("RETURN_REASON_PRESETS");
    expect(pageSource).toContain("Missing Market Scoping");
    expect(pageSource).toContain("Missing Pre-Canvass AOQ");
    expect(pageSource).toContain("Incomplete 3 Quotes");
    expect(pageSource).toContain("PPMP Mismatch");
    expect(pageSource).toContain("Mixed Categories (Sec. 5.1.1)");
    expect(pageSource).toContain("Unclear Specifications");

    // Return dialog controls
    expect(pageSource).toContain("Return PR for Revision & Corrections");
    expect(pageSource).toContain("Quick Action Presets (Common Correction Reasons)");
    expect(pageSource).toContain("handleOpenReturnModal");
    expect(pageSource).toContain("handleConfirmReturn");
  });

  it("exposes uploaded attachment transparency in PMR Registry PR details view", () => {
    const pmrSource = readFileSync(
      new URL("../client/src/pages/PmrRegistryPage.tsx", import.meta.url),
      "utf8"
    );

    expect(pmrSource).toContain("End-User Uploaded Attachments & Transparency");
    expect(pmrSource).toContain("marketScopingDoc");
    expect(pmrSource).toContain("uploadedPpmpDoc");
    expect(pmrSource).toContain("preCanvassDoc");
    expect(pmrSource).toContain("preCanvassQuotes");
  });

  it("blocks Procurement Officer from proceeding in Step 5.1 until Pre-Canvass & 3 Quotes is performed", () => {
    const pageSource = readFileSync(
      new URL("../client/src/pages/OfficerPrVerificationPage.tsx", import.meta.url),
      "utf8"
    );
    const dbSource = readFileSync(new URL("./db.ts", import.meta.url), "utf8");

    expect(pageSource).toContain("isPreCanvassComplete");
    expect(pageSource).toContain("disabled={!categorySegregationConfirmed || !isPreCanvassComplete || verifyMutation.isPending}");
    expect(pageSource).toContain('mode="officer_review"');
    expect(dbSource).toContain("Pre-Canvass & ${MIN_PRE_CANVASS_QUOTES} Quotes must be performed before proceeding to the next step.");
  });
});
