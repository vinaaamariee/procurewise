import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "..");
const workflowSource = readFileSync(resolve(projectRoot, "client/src/pages/WorkflowPages.tsx"), "utf8");
const requestSource = readFileSync(resolve(projectRoot, "client/src/pages/Workspace.tsx"), "utf8");
const managementSource = readFileSync(resolve(projectRoot, "client/src/pages/ManagementPages.tsx"), "utf8");

describe("ProcureWise PPMP-to-PMR workflow workspaces", () => {
  it("keeps the required package, approval, PO, delivery, and PMR controls in the authenticated UI", () => {
    expect(requestSource).toContain("Linked PPMP entry");
    expect(workflowSource).toContain("Pre-Canvass");
    expect(workflowSource).toContain("official Abstract");
    expect(workflowSource).toContain("Issue PO");
    expect(workflowSource).toContain("Record delivery");
    expect(workflowSource).toContain("Log PMR");
  });

  it("retains official form fields mapped from the supplied workbook", () => {
    expect(requestSource).toContain("Stock / property no.");
    expect(workflowSource).toContain("Approved budget ceiling");
    expect(workflowSource).toContain("Quotation reference");
    expect(workflowSource).toContain("Acknowledged date");
    expect(workflowSource).toContain("Delivery status");
    expect(managementSource).toContain("TIN");
  });

  it("displays PR Numbers and traceability in Budget utilization", () => {
    expect(managementSource).toContain("PR Numbers");
    expect(managementSource).toContain("Search by PR number, office, or object of expenditure");
  });
});
