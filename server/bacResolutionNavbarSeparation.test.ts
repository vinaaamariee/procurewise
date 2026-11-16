import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";

describe("BAC Resolution Step 5.3 and Step 5.8 Dedicated Window Separation", () => {
  const dashboardLayoutContent = fs.readFileSync(
    path.resolve(process.cwd(), "client/src/components/DashboardLayout.tsx"),
    "utf-8"
  );
  const officerPagesContent = fs.readFileSync(
    path.resolve(process.cwd(), "client/src/pages/OfficerPages.tsx"),
    "utf-8"
  );
  const appRoutesContent = fs.readFileSync(
    path.resolve(process.cwd(), "client/src/App.tsx"),
    "utf-8"
  );
  const canvasContent = fs.readFileSync(
    path.resolve(process.cwd(), "client/src/components/OfficialBacResolutionCanvas.tsx"),
    "utf-8"
  );

  it("registers independent sidebar navigation items with dedicated paths in DashboardLayout", () => {
    // Step 5.3 navigation has its own window path
    expect(dashboardLayoutContent).toContain('id: "step-3-bac-resolution"');
    expect(dashboardLayoutContent).toContain('path: "/officer/transmittals"');
    expect(dashboardLayoutContent).toContain('label: "Step 5.3: BAC Resolution (Mode of Procurement)"');

    // Step 5.7.1 navigation has its own window path
    expect(dashboardLayoutContent).toContain('id: "step-5-7-bac-aoq"');
    expect(dashboardLayoutContent).toContain('path: "/officer/abstract-of-quotations"');
    expect(dashboardLayoutContent).toContain('label: "Step 5.7.1: Opening & Abstract of Quotations (AOQ)"');

    // Step 5.8 navigation has its own window path
    expect(dashboardLayoutContent).toContain('id: "step-5-8-bac-award-resolution"');
    expect(dashboardLayoutContent).toContain('path: "/officer/award-resolution"');
    expect(dashboardLayoutContent).toContain('label: "Step 5.8: Award of Contract Resolution (S/LCRQ)"');

    // Transmittal Register navigation has its own window path
    expect(dashboardLayoutContent).toContain('id: "bac-transmittal-register"');
    expect(dashboardLayoutContent).toContain('path: "/officer/transmittal-register"');
  });

  it("registers distinct routes for each statutory step in App.tsx", () => {
    expect(appRoutesContent).toContain('<Route path={"/officer/transmittals"}>{protectedPage(<TransmittalsPage />)}</Route>');
    expect(appRoutesContent).toContain('<Route path={"/officer/abstract-of-quotations"}>{protectedPage(<BacAbstractOfQuotationsPage />)}</Route>');
    expect(appRoutesContent).toContain('<Route path={"/officer/award-resolution"}>{protectedPage(<BacAwardResolutionPage />)}</Route>');
    expect(appRoutesContent).toContain('<Route path={"/officer/transmittal-register"}>{protectedPage(<TransmittalRegisterPage />)}</Route>');
  });

  it("exports dedicated page components in OfficerPages without overlapping tabs list", () => {
    expect(officerPagesContent).toContain("export function TransmittalsPage()");
    expect(officerPagesContent).toContain("export function BacAbstractOfQuotationsPage()");
    expect(officerPagesContent).toContain("export function BacAwardResolutionPage()");
    expect(officerPagesContent).toContain("export function TransmittalRegisterPage()");
    expect(officerPagesContent).toContain("export function StatutoryWorkflowNav(");

    // No longer mixes all steps inside a single cramped TabsList on the page
    expect(officerPagesContent).not.toContain('<TabsTrigger value="mode_resolution"');
  });

  it("Step 5.3 TransmittalsPage window is dedicated to Mode of Procurement Resolution & ABC", () => {
    expect(officerPagesContent).toContain('title="Step 5.3: BAC Resolution (Mode of Procurement & ABC)"');
    expect(officerPagesContent).toContain('Procedure 5.3: BAC Secretariat Statutory Mandate — Recommending Mode of Procurement & ABC');
    expect(officerPagesContent).toContain('Step 5.3: Mode of Procurement Resolution Form');
    expect(officerPagesContent).toContain('Live Official Canvas Preview — Step 5.3: Mode of Procurement');
    expect(officerPagesContent).toContain('resolutionCategory="mode_of_procurement"');
  });

  it("Step 5.7.1 BacAbstractOfQuotationsPage window is dedicated to Opening & Abstract of Quotations (AOQ)", () => {
    expect(officerPagesContent).toContain('title="Step 5.7.1: Opening & Abstract of Quotations (AOQ)"');
    expect(officerPagesContent).toContain('Step 5.7.1: BAC Opening & Abstract of Quotations Workbench');
    expect(officerPagesContent).toContain("OfficialBacAbstractOfQuotations");
  });

  it("Step 5.8 BacAwardResolutionPage window is dedicated to Award of Contract Resolution (S/LCRQ to HoPE)", () => {
    expect(officerPagesContent).toContain('title="Step 5.8: Award of Contract Resolution (S/LCRQ to HoPE)"');
    expect(officerPagesContent).toContain('Procedure 5.8: BAC Statutory Mandate — Recommending Award of Contract to HoPE');
    expect(officerPagesContent).toContain('Step 5.8: Award of Contract Resolution Form');
    expect(officerPagesContent).toContain('Recommended Winning Supplier (S/LCRQ Selection) *');
    expect(officerPagesContent).toContain('Live Official Canvas Preview — Step 5.8: Award of Contract (S/LCRQ)');
    expect(officerPagesContent).toContain('resolutionCategory="award_of_contract"');
  });

  it("StatutoryWorkflowNav provides clean, non-overlapping responsive navigation between steps", () => {
    expect(officerPagesContent).toContain('aria-label="Statutory Procurement Procedure"');
    expect(officerPagesContent).toContain('/officer/transmittals');
    expect(officerPagesContent).toContain('/officer/abstract-of-quotations');
    expect(officerPagesContent).toContain('/officer/award-resolution');
    expect(officerPagesContent).toContain('/officer/transmittal-register');
  });

  it("removes confusing in-canvas toggle buttons from OfficialBacResolutionCanvas", () => {
    expect(canvasContent).toContain('Statutory Mandate: Section 5.3');
    expect(canvasContent).toContain('Statutory Mandate: Section 5.8.1');
    expect(canvasContent).not.toContain('<Button\n            type="button"\n            size="sm"\n            variant={resolutionCategory === "mode_of_procurement"');
  });
});
