import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { normalizeProcurementRole, roleCanAct } from "../shared/procurementRules";
import type { TrpcContext } from "./_core/context";

describe("Procurement Staff RBAC & Procedure 5.2 Boundaries", () => {
  it("enforces normalizeProcurementRole preserves procurement_staff as distinct capability role", () => {
    expect(normalizeProcurementRole("procurement_staff")).toBe("procurement_staff");
    expect(normalizeProcurementRole("procurement_officer")).toBe("procurement_officer");
    expect(normalizeProcurementRole("end_user")).toBe("end_user");
  });

  it("permits procurement_staff strictly for their 5 assigned duties and blocks administrative approvals", () => {
    const staffRole = normalizeProcurementRole("procurement_staff");

    // 1. Record PR to PMR
    expect(roleCanAct(staffRole, ["procurement_staff", "procurement_officer", "admin"])).toBe(true);

    // 2. Prepare RFQ & Recommend Approval
    expect(roleCanAct(staffRole, ["procurement_officer", "procurement_staff", "admin"])).toBe(true);

    // 3. Forward to BAC for AOQ Preparation (Transmittals)
    expect(roleCanAct(staffRole, ["procurement_officer", "procurement_staff", "admin"])).toBe(true);

    // 4. Prepare Letter of Notice
    expect(roleCanAct(staffRole, ["procurement_officer", "procurement_staff", "admin"])).toBe(true);

    // 5. Prepare Purchase Order (PO)
    expect(roleCanAct(staffRole, ["procurement_officer", "procurement_staff", "admin"])).toBe(true);

    // Blocked administrative & approval actions:
    // Administrative Approver decisions
    expect(roleCanAct(staffRole, ["administrative_approver"])).toBe(false);

    // Procurement Officer only actions (verification, PR assign, officer analytics)
    expect(roleCanAct(staffRole, ["procurement_officer", "admin"])).toBe(false);

    // Pre-canvass creation (End-User only)
    expect(roleCanAct(staffRole, ["end_user"])).toBe(false);

    // Purchase Request creation (End-User only)
    expect(roleCanAct(staffRole, ["end_user"])).toBe(false);
  });

  it("blocks procurement_staff from verifying PR packages and blocks unverified PR recording", async () => {
    const staffCaller = appRouter.createCaller({
      user: {
        id: 99,
        openId: "staff-demo",
        name: "Procurement Staff",
        email: "staff.demo@bsc.edu.ph",
        loginMethod: "test",
        role: "procurement_staff",
        officeName: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
      req: {} as unknown as TrpcContext["req"],
      res: {} as unknown as TrpcContext["res"],
    });

    // verifyPackage is strictly for procurement_officer and admin
    await expect(
      staffCaller.procurement.purchaseRequests.verifyPackage({ purchaseRequestId: 1 })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    // Pre-Canvass creation is strictly for end_user
    await expect(
      staffCaller.procurement.preCanvasses.create({ purchaseRequestId: 1 })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    // Purchase Request creation is strictly for end_user
    await expect(
      staffCaller.procurement.purchaseRequests.create({
        purpose: "Test purpose with enough characters",
        officeId: 1,
        objectOfExpenditureId: 1,
        items: [{ description: "Pens", quantity: 10, unit: "box", estimatedUnitCost: 50 }],
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    await expect(
      staffCaller.procurement.officer.transmittals.directLetterToPo({
        purchaseRequestId: 1,
        resolutionNumber: "BAC-2026-001",
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    await expect(
      staffCaller.procurement.officer.notices.approve({ noticeId: 1 })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows procurement_staff to call their scoped endpoints: notices, transmittals, PMR list, RFQ actions", async () => {
    const staffCaller = appRouter.createCaller({
      user: {
        id: 99,
        openId: "staff-demo",
        name: "Procurement Staff",
        email: "staff.demo@bsc.edu.ph",
        loginMethod: "test",
        role: "procurement_staff",
        officeName: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
      req: {} as unknown as TrpcContext["req"],
      res: {} as unknown as TrpcContext["res"],
    });

    // Role assertions for notices list, transmittals list, historical PMR summary
    // should not fail with FORBIDDEN (may fail with DB unavailable if offline, but NOT FORBIDDEN)
    try {
      await staffCaller.procurement.officer.notices.list();
    } catch (err: any) {
      expect(err.code).not.toBe("FORBIDDEN");
    }

    try {
      await staffCaller.procurement.officer.transmittals.list();
    } catch (err: any) {
      expect(err.code).not.toBe("FORBIDDEN");
    }

    try {
      await staffCaller.procurement.historicalPmr.summary();
    } catch (err: any) {
      expect(err.code).not.toBe("FORBIDDEN");
    }
  });
});
