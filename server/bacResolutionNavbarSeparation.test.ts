import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";

describe("BAC Resolution Step 5.3 and Step 5.8 Navbar & Tab Separation", () => {
  const dashboardLayoutContent = fs.readFileSync(
    path.resolve(process.cwd(), "client/src/components/DashboardLayout.tsx"),
    "utf-8"
  );
  const officerPagesContent = fs.readFileSync(
    path.resolve(process.cwd(), "client/src/pages/OfficerPages.tsx"),
    "utf-8"
  );
  const canvasContent = fs.readFileSync(
    path.resolve(process.cwd(), "client/src/components/OfficialBacResolutionCanvas.tsx"),
    "utf-8"
  );

  it("registers independent sidebar navigation items for Step 5.3 and Step 5.8 in DashboardLayout", () => {
    // Step 5.3 navigation
    expect(dashboardLayoutContent).toContain('id: "step-3-bac-resolution"');
    expect(dashboardLayoutContent).toContain('path: "/officer/transmittals"');
    expect(dashboardLayoutContent).toContain('label: "Step 5.3: BAC Resolution (Mode of Procurement)"');

    // Step 5.7.1 navigation
    expect(dashboardLayoutContent).toContain('id: "step-5-7-bac-aoq"');
    expect(dashboardLayoutContent).toContain('path: "/officer/transmittals?tab=aoq"');
    expect(dashboardLayoutContent).toContain('label: "Step 5.7.1: Opening & Abstract of Quotations (AOQ)"');

    // Step 5.8 navigation
    expect(dashboardLayoutContent).toContain('id: "step-5-8-bac-award-resolution"');
    expect(dashboardLayoutContent).toContain('path: "/officer/transmittals?tab=award_resolution"');
    expect(dashboardLayoutContent).toContain('label: "Step 5.8: Award of Contract Resolution (S/LCRQ)"');

    // Active state highlighting handles query parameters
    expect(dashboardLayoutContent).toContain('tab=mode_resolution');
    expect(dashboardLayoutContent).toContain('tab=award_resolution');
  });

  it("provides distinct top navbar tabs for Step 5.3, Step 5.7.1, and Step 5.8 in OfficerPages TransmittalsPage", () => {
    expect(officerPagesContent).toContain('value="mode_resolution"');
    expect(officerPagesContent).toContain('Step 5.3: BAC Resolution (Mode of Procurement & ABC)');

    expect(officerPagesContent).toContain('value="aoq"');
    expect(officerPagesContent).toContain('Step 5.7.1: Opening & Abstract of Quotations (AOQ)');

    expect(officerPagesContent).toContain('value="award_resolution"');
    expect(officerPagesContent).toContain('Step 5.8: Award of Contract Resolution (S/LCRQ to HoPE)');

    expect(officerPagesContent).toContain('value="transmittals"');
    expect(officerPagesContent).toContain('BAC Transmittals Register');
  });

  it("contains strictly Step 5.3 process in mode_resolution TabContent without internal category switcher", () => {
    expect(officerPagesContent).toContain('<TabsContent value="mode_resolution"');
    expect(officerPagesContent).toContain('Procedure 5.3: BAC Secretariat Statutory Mandate');
    expect(officerPagesContent).toContain('Step 5.3: Mode of Procurement Resolution Form');
    expect(officerPagesContent).toContain('Live Official Canvas Preview — Step 5.3: Mode of Procurement');
    expect(officerPagesContent).toContain('resolutionCategory="mode_of_procurement"');
  });

  it("contains strictly Step 5.8 process in award_resolution TabContent with quote selection and savings", () => {
    expect(officerPagesContent).toContain('<TabsContent value="award_resolution"');
    expect(officerPagesContent).toContain('Procedure 5.8: Recommendation on the Award of Contract');
    expect(officerPagesContent).toContain('Step 5.8: Award of Contract Resolution Form');
    expect(officerPagesContent).toContain('Step 5.8 Award: Choose Winning Supplier (S/LCRQ) *');
    expect(officerPagesContent).toContain('Live Official Canvas Preview — Step 5.8: Award of Contract');
    expect(officerPagesContent).toContain('resolutionCategory="award_of_contract"');
  });

  it("removes confusing in-canvas toggle buttons from OfficialBacResolutionCanvas", () => {
    // Canvas preview now displays a clean statutory badge instead of confusing in-page buttons
    expect(canvasContent).toContain('Statutory Mandate: Section 5.3');
    expect(canvasContent).toContain('Statutory Mandate: Section 5.8.1');
    expect(canvasContent).not.toContain('<Button\n            type="button"\n            size="sm"\n            variant={resolutionCategory === "mode_of_procurement"');
  });
});
