import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("official procurement form structure", () => {
  it("preserves the supplied Appendix 60, Annex D, Annex F, and Appendix 61 structural labels in PDF exports", () => {
    const pdf = readFileSync(new URL("../client/src/lib/procurementPdf.ts", import.meta.url), "utf8");
    ["Appendix 60", "PURCHASE REQUEST", "Entity Name:", "Fund Cluster:", "Office/Section:", "Responsibility Center Code:", "Stock/ Property", "Requested by:", "Approved by:", "Annex D", "REQUEST FOR PRICE QUOTATION", "WITHIN SEVEN (7) CALENDAR DAYS", "THE APPROVED BUDGET FOR THIS PROCUREMENT", "Item #", "PARTICULAR", "Printed Name/Signature", "BAC Chairperson", "Annex E", "Acknowledgement for Request for Quotation", "Retrieval of Request for Quotation", "Annex F", "ABSTRACT OF QUOTATION", "Bids opened at", "NAME OF ARTICLES OR SERVICES TO BE", "Lowest calculated bidder", "BAC Vice Chair", "Appendix 61", "PURCHASE ORDER", "Mode of Procurement", "Place of Delivery", "Delivery Term", "Payment Term", "Conforme:", "Very truly yours,", "ORS/BURS No.", "Funds Available", "Date of the ORS/BURS", "downloadRfqAcknowledgementPdf", "ELECTRONIC APPROVAL — SYSTEM RECORD", "PROJECT PROCUREMENT MANAGEMENT PLAN", "OFFICE / EXPENDITURE OBJECT", "ABSTRACT OF QUOTATION — PACKAGE", "LINKED END-USER ITEM SCHEDULE", "downloadPpmpPdf", "downloadAbstractPackagePdf"].forEach((label) => expect(pdf).toContain(label));
  });

  it("uses the Annex F heading and certification blocks in the printable Abstract route", () => {
    const print = readFileSync(new URL("../client/src/pages/PrintPages.tsx", import.meta.url), "utf8");
    expect(print).toContain("Annex F");
    expect(print).toContain("NAME OF ARTICLES OR SERVICES TO BE FURNISHED");
    expect(print).toContain("CERTIFICATION / RECOMMENDATION");
    expect(print).toContain("Prepared by Procurement / BAC");
  });

  it("keeps BSC letterhead print-only and applies it to generated official PDFs", () => {
    const pdf = readFileSync(new URL("../client/src/lib/procurementPdf.ts", import.meta.url), "utf8");
    const print = readFileSync(new URL("../client/src/pages/PrintPages.tsx", import.meta.url), "utf8");
    const styles = readFileSync(new URL("../client/src/index.css", import.meta.url), "utf8");
    ["/manus-storage/bsc-header_31d256ab.png", "/manus-storage/bsc-footer_9296dc8a.png", "addBscLetterhead", "await addBscLetterhead(doc)"].forEach((marker) => expect(pdf).toContain(marker));
    ["print-bsc-header", "print-bsc-footer", "print:hidden"].forEach((marker) => expect(print).toContain(marker));
    expect(styles).toContain(".print-bsc-header");
  });

  it("presents the supplied Appendix 60 and Annex D structure directly in their workspaces", () => {
    const purchaseRequests = readFileSync(new URL("../client/src/components/OfficialPurchaseRequestCanvas.tsx", import.meta.url), "utf8");
    const purchaseRequestWorkspace = readFileSync(new URL("../client/src/pages/Workspace.tsx", import.meta.url), "utf8");
    const preCanvass = readFileSync(new URL("../client/src/pages/WorkflowPages.tsx", import.meta.url), "utf8");
    ["Appendix 60", "PURCHASE REQUEST", "Entity Name:", "Fund Cluster:", "Office/Section :", "PR No.:", "Date:", "Responsibility Center Code :", "Stock/ Property No.", "Item Description", "Quantity", "Unit Cost", "Total Cost", "Purpose:", "Requested by:", "Approved by:", "Signature :", "Printed Name :", "Designation :", "MINIMUM_OFFICIAL_ROWS = 24"].forEach((label) => expect(purchaseRequests).toContain(label));
    expect(purchaseRequestWorkspace).toContain("System controls — not part of Appendix 60");
    expect(purchaseRequestWorkspace).toContain("OfficialPurchaseRequestCanvas");
    expect(purchaseRequestWorkspace).toContain("Item details — system entry workspace");
    expect(purchaseRequestWorkspace).toContain("pr-requested-signatories");
    expect(purchaseRequestWorkspace).toContain("pr-approved-signatories");
    expect(purchaseRequestWorkspace).toContain("pr-fund-cluster-options");
    const styles = readFileSync(new URL("../client/src/index.css", import.meta.url), "utf8");
    expect(styles).toContain("@page");
    expect(styles).toContain("size: A4 portrait");
    expect(styles).toContain(".official-pr-signature");
    ["REQUEST FOR PRICE QUOTATION", "Annex D", "THE APPROVED BUDGET FOR THIS PROCUREMENT", "Item # / Qty. / Unit / PARTICULAR / Unit Price / Total"].forEach((label) => expect(preCanvass).toContain(label));
  });

  it("presents Annex F certification and Appendix 61 signatory hierarchy in the execution workspace", () => {
    const workflow = readFileSync(new URL("../client/src/pages/WorkflowPages.tsx", import.meta.url), "utf8");
    ["Bids opened at location and date", "Prepared by Procurement / BAC", "Recommended / approved by", "Conforme", "Very truly yours", "ORS/BURS No.", "Signature over Printed Name of Chief Accountant"].forEach((label) => expect(workflow).toContain(label));
  });

  it("retains the required Abstract opening-date field in both schema and migration history", () => {
    const schema = readFileSync(new URL("../drizzle/schema.ts", import.meta.url), "utf8");
    const migration = readFileSync(new URL("../drizzle/0003_bright_hemingway.sql", import.meta.url), "utf8");
    expect(schema).toContain('openingDate: timestamp("openingDate").defaultNow().notNull()');
    expect(migration).toContain("ADD `openingDate` timestamp DEFAULT (now()) NOT NULL");
  });

  it("exposes Catalog in the authenticated sidebar and keeps the catalog route protected", () => {
    const navigation = readFileSync(new URL("../client/src/components/DashboardLayout.tsx", import.meta.url), "utf8");
    const routes = readFileSync(new URL("../client/src/App.tsx", import.meta.url), "utf8");
    const catalog = readFileSync(new URL("../client/src/pages/Catalog.tsx", import.meta.url), "utf8");
    expect(navigation).toContain('label: "Catalog"');
    expect(navigation).toContain('path: "/catalog"');
    expect(routes).toContain('<Route path={"/catalog"}>{protectedPage(<CatalogPage />)}</Route>');
    ["trpc.procurement.catalog.list", "trpc.procurement.catalog.codeFamilies", "trpc.procurement.catalog.favorites"].forEach((marker) => expect(catalog).toContain(marker));
    const documents = readFileSync(new URL("../client/src/pages/Documents.tsx", import.meta.url), "utf8");
    const workspace = readFileSync(new URL("../client/src/pages/Workspace.tsx", import.meta.url), "utf8");
    expect(documents).toContain("Preview before printing");
    ["minReference", "maxReference", "reference_low", "reference_high", "Use in new Purchase Request", "catalogItemId=${item.id}"].forEach((marker) => expect(catalog).toContain(marker));
    expect(catalog).not.toContain("Reference price</p>");
    ["useSearch", "catalogItemId", "Catalog item added", "Review and edit the quantity"].forEach((marker) => expect(workspace).toContain(marker));
  });

  it("keeps the Best Value policy history compliance PDF exporter available with version and criteria sections", () => {
    const pdf = readFileSync(new URL("../client/src/lib/procurementPdf.ts", import.meta.url), "utf8");
    expect(pdf).toContain("downloadBestValuePolicyHistoryPdf");
    expect(pdf).toContain("BEST VALUE POLICY HISTORY");
    expect(pdf).toContain("VERSION");
    expect(pdf).toContain("CRITERION");
  });
});
