import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";
import { normalizeProcurementRole, roleCanAct } from "../shared/procurementRules";

describe("BAC Transmittal Register Navigation & RFQ Distribution Lifecycle", () => {
  const dashboardLayoutContent = fs.readFileSync(
    path.resolve(process.cwd(), "client/src/components/DashboardLayout.tsx"),
    "utf-8"
  );
  const appRoutesContent = fs.readFileSync(
    path.resolve(process.cwd(), "client/src/App.tsx"),
    "utf-8"
  );
  const officerPagesContent = fs.readFileSync(
    path.resolve(process.cwd(), "client/src/pages/OfficerPages.tsx"),
    "utf-8"
  );
  const serverDbContent = fs.readFileSync(
    path.resolve(process.cwd(), "server/db.ts"),
    "utf-8"
  );

  it("registers a dedicated Nav Bar item for BAC Resolution Endorsement & Transmittal Register", () => {
    // Check that DashboardLayout has both BAC Resolution and BAC Transmittal Register
    expect(dashboardLayoutContent).toContain('id: "step-3-bac-resolution"');
    expect(dashboardLayoutContent).toContain('path: "/officer/transmittals"');

    expect(dashboardLayoutContent).toContain('id: "bac-transmittal-register"');
    expect(dashboardLayoutContent).toContain('path: "/officer/transmittal-register"');
    expect(dashboardLayoutContent).toContain('label: "BAC Resolution Endorsement & Transmittal Register"');

    // Verify it is accessible to procurement staff and officers
    expect(dashboardLayoutContent).toContain('"/officer/transmittal-register"');
  });

  it("routes /officer/transmittal-register to TransmittalRegisterPage in App.tsx", () => {
    expect(appRoutesContent).toContain('import { ForecastPage, SupplierEvaluationsPage, TransmittalsPage, TransmittalRegisterPage } from "./pages/OfficerPages"');
    expect(appRoutesContent).toContain('<Route path={"/officer/transmittal-register"}>{protectedPage(<TransmittalRegisterPage />)}</Route>');
  });

  it("exports TransmittalRegisterPage with search, status filters, and action triggers", () => {
    expect(officerPagesContent).toContain("export function TransmittalRegisterPage()");
    expect(officerPagesContent).toContain("BAC Resolution Endorsement & Transmittal Register");
    expect(officerPagesContent).toContain("directToPoMutation");
    expect(officerPagesContent).toContain("Print Resolution");
    expect(officerPagesContent).toContain("Print Transmittal");
  });

  it("enforces that listRfqDistributions does NOT confuse BAC-RES- (BAC Resolution) with RFQ transmittal", () => {
    // Verify that BAC-RES- is explicitly excluded from setting RFQ distribution status to transmitted_to_bac
    expect(serverDbContent).toContain('if (t.transmittalNumber.startsWith("BAC-RES-")) return false;');
    expect(serverDbContent).toContain('t.transmittalNumber.startsWith("BAC-T-")');
    expect(serverDbContent).toContain('action: "transmitted_to_bac"');
  });

  it("verifies the 4-stage RFQ distribution lifecycle roles and boundaries", () => {
    const officerRole = normalizeProcurementRole("procurement_officer");
    const staffRole = normalizeProcurementRole("procurement_staff");

    // Both Procurement Officer and Staff are authorized to manage RFQ distribution and transmittals
    expect(roleCanAct(officerRole, ["procurement_officer", "procurement_staff", "admin"])).toBe(true);
    expect(roleCanAct(staffRole, ["procurement_officer", "procurement_staff", "admin"])).toBe(true);

    // End-users cannot manage RFQ outward distribution or BAC transmittals
    const endUserRole = normalizeProcurementRole("end_user");
    expect(roleCanAct(endUserRole, ["procurement_officer", "procurement_staff", "admin"])).toBe(false);
  });
});

