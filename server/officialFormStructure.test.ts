import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("official procurement form structure", () => {
  it("preserves the supplied Appendix 60, Annex D, Annex F, and Appendix 61 structural labels in PDF exports", () => {
    const pdf = readFileSync(new URL("../client/src/lib/procurementPdf.ts", import.meta.url), "utf8");
    ["Appendix 60", "PURCHASE REQUEST", "Entity Name:", "Fund Cluster:", "Office/Section:", "Responsibility Center Code:", "Stock/ Property No.", "Requested by:", "Approved by:", "Annex D", "REQUEST FOR PRICE QUOTATION", "THE APPROVED BUDGET FOR THIS PROCUREMENT", "Item #", "PARTICULAR", "Annex F", "ABSTRACT OF QUOTATION", "Bids opened at", "NAME OF ARTICLES OR SERVICES TO BE FURNISHED", "CERTIFICATION / RECOMMENDATION", "Appendix 61", "PURCHASE ORDER", "Mode of Procurement:", "Place of Delivery:", "Delivery Term:", "Payment Term:", "Conforme:", "Very truly yours,", "ORS/BURS No.:", "Funds Available:"].forEach((label) => expect(pdf).toContain(label));
  });

  it("uses the Annex F heading and certification blocks in the printable Abstract route", () => {
    const print = readFileSync(new URL("../client/src/pages/PrintPages.tsx", import.meta.url), "utf8");
    expect(print).toContain("Annex F");
    expect(print).toContain("NAME OF ARTICLES OR SERVICES TO BE FURNISHED");
    expect(print).toContain("CERTIFICATION / RECOMMENDATION");
    expect(print).toContain("Prepared by Procurement / BAC");
  });

  it("presents the supplied Appendix 60 and Annex D structure directly in their workspaces", () => {
    const purchaseRequests = readFileSync(new URL("../client/src/pages/Workspace.tsx", import.meta.url), "utf8");
    const preCanvass = readFileSync(new URL("../client/src/pages/WorkflowPages.tsx", import.meta.url), "utf8");
    ["Appendix 60 — Purchase Request", "Entity Name:", "Office/Section:", "Responsibility Center Code:", "Requested by / Approved by:"].forEach((label) => expect(purchaseRequests).toContain(label));
    ["REQUEST FOR PRICE QUOTATION", "Annex D", "THE APPROVED BUDGET FOR THIS PROCUREMENT", "Item # / Qty. / Unit / PARTICULAR / Unit Price / Total"].forEach((label) => expect(preCanvass).toContain(label));
  });

  it("presents Annex F certification and Appendix 61 signatory hierarchy in the execution workspace", () => {
    const workflow = readFileSync(new URL("../client/src/pages/WorkflowPages.tsx", import.meta.url), "utf8");
    ["Bids opened at location and date", "Prepared by Procurement / BAC", "Recommended / approved by", "Conforme", "Very truly yours", "ORS/BURS No.", "Signature over Printed Name of Chief Accountant"].forEach((label) => expect(workflow).toContain(label));
  });
});
