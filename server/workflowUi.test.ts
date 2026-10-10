import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "..");
const workflowSource = readFileSync(resolve(projectRoot, "client/src/pages/WorkflowPages.tsx"), "utf8");
const integratedCanvassSource = readFileSync(resolve(projectRoot, "client/src/components/IntegratedPreCanvassModal.tsx"), "utf8");
const requestSource = readFileSync(resolve(projectRoot, "client/src/pages/Workspace.tsx"), "utf8");
const managementSource = readFileSync(resolve(projectRoot, "client/src/pages/ManagementPages.tsx"), "utf8");
const dashboardSource = readFileSync(resolve(projectRoot, "client/src/pages/Dashboard.tsx"), "utf8");

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

  it("shows accessible request preparation steps for End-Users", () => {
    expect(dashboardSource).toContain("getWorkflowStageInfo(pr.status)");
    expect(requestSource).toContain('aria-label="Request setup progress"');
    expect(requestSource.indexOf('aria-label="Request setup progress"')).toBeGreaterThan(requestSource.indexOf("Save Purchase Request"));
    expect(requestSource).toContain('label: "Market Scoping"');
    expect(requestSource).toContain('label: "PP + PPMP"');
    expect(requestSource).toContain('label: "Purchase Request"');
    expect(requestSource).toContain('label: "Three supplier quotes"');
    expect(requestSource).toContain('label: "Attach & submit"');
    expect(requestSource).toContain("Upload the preliminary quotation document");
    expect(requestSource).toContain("complete: Boolean(marketScopingFile)");
    expect(requestSource).toContain("aria-valuenow={currentProgressNumber * 20}");
    expect(requestSource).toContain("Market Scoping document");
    expect(requestSource).toContain('documentType: "Market Scoping"');
    expect(workflowSource).toContain("Upload pre-canvass attachment");
    expect(workflowSource).toContain("REQUIRED BEFORE SUBMISSION");
    expect(workflowSource).toContain("Create a request and pre-canvass package first");
    expect(dashboardSource).toContain('role="progressbar"');
    expect(dashboardSource).toContain("Step ${workflowStageInfo.stageIndex + 1} of ${workflowStageInfo.stageCount}");
    expect(dashboardSource).toContain("workflowStageInfo.stageIndex === workflowStageInfo.stageCount - 1");
    expect(dashboardSource).toContain("Action needed · make changes and resubmit");
  });

  it("prevents returning to the previous request step while saving", () => {
    const saveLockedBackButtons = requestSource.match(
      /disabled=\{isSaving\}\s+onClick=\{\(\) => setCurrentStep\("ppmp"\)\}/g
    ) ?? [];
    expect(saveLockedBackButtons).toHaveLength(2);
  });

  it("leaves supplier compliance decisions to Procurement in the End-User comparison", () => {
    const comparisonStart = workflowSource.indexOf("function PreCanvassComparison");
    const comparisonEnd = workflowSource.indexOf("export function ExecutionPage", comparisonStart);
    const comparisonSource = workflowSource.slice(comparisonStart, comparisonEnd);

    expect(comparisonSource).toContain("The Procurement Officer");
    expect(comparisonSource).not.toContain("Compliance</th>");
    expect(comparisonSource).not.toContain("LOWEST COMPLIANT");
  });

  it("requires the pre-canvass attachment in the immediate post-PR modal", () => {
    expect(integratedCanvassSource).toContain('id="integrated-preliminary-aoq"');
    expect(integratedCanvassSource).toContain('documentType: "Preliminary Abstract of Quotations"');
    expect(integratedCanvassSource).toContain("disabled={submitPackageMutation.isPending || !canForward}");
  });

  it("keeps dashboard alert gradient midpoints dark when dark mode is active", () => {
    expect(dashboardSource).toContain("dark:via-[#2a2418]");
    expect(dashboardSource).toContain("dark:via-[#2d1b1d]");
    expect(dashboardSource).toContain("dark:via-[#173522]");
  });
});
