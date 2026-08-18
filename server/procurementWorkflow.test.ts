import { describe, expect, it } from "vitest";
import { advancePurchaseRequest, createPurchaseOrder } from "./db";

const user = { id: 1, openId: "workflow-test", name: "Workflow Test", email: "workflow@example.com", loginMethod: "test", role: "admin", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() } as const;

function fakeDatabase(selectRows: unknown[][]) {
  let selectIndex = 0;
  const updates: unknown[] = [];
  const inserts: unknown[] = [];
  const db = {
    select: () => ({ from: () => ({ where: () => ({ limit: async () => selectRows[selectIndex++] }) }) }),
    update: () => ({ set: (value: unknown) => ({ where: async () => { updates.push(value); } }) }),
    insert: () => ({ values: async (value: unknown) => { inserts.push(value); } }),
  };
  return { db, updates, inserts };
}

const silentAudit = async () => undefined;

describe("ProcureWise real workflow budget gates", () => {
  it("advances a PR to budget review and records its commitment when the office-object allotment is sufficient", async () => {
    const pr = { id: 9, prNumber: "PR-2026-00001", officeId: 2, objectOfExpenditureId: 3, totalEstimate: "600.00", status: "draft" };
    const allotment = { officeId: 2, objectOfExpenditureId: 3, fiscalYear: new Date().getFullYear(), allottedAmount: "1000.00", committedAmount: "300.00" };
    const fake = fakeDatabase([[pr], [allotment]]);
    const result = await advancePurchaseRequest({ purchaseRequestId: 9, nextStatus: "budget_review" }, user, { db: fake.db as never, recordAudit: silentAudit });
    expect(result.status).toBe("budget_review");
    expect(fake.updates).toHaveLength(2);
  });

  it("rejects PR budget review when the selected office-object allotment is insufficient", async () => {
    const pr = { id: 9, prNumber: "PR-2026-00001", officeId: 2, objectOfExpenditureId: 3, totalEstimate: "800.00", status: "draft" };
    const allotment = { officeId: 2, objectOfExpenditureId: 3, fiscalYear: new Date().getFullYear(), allottedAmount: "1000.00", committedAmount: "300.00" };
    const fake = fakeDatabase([[pr], [allotment]]);
    await expect(advancePurchaseRequest({ purchaseRequestId: 9, nextStatus: "budget_review" }, user, { db: fake.db as never, recordAudit: silentAudit })).rejects.toThrow("exceeds the available office-level budget");
    expect(fake.updates).toHaveLength(0);
  });

  it("rejects PO generation when the linked PR lacks a valid reserved budget commitment", async () => {
    const rfq = { id: 7, purchaseRequestId: 9 };
    const abstract = { id: 8, rfqId: 7, status: "approved", recommendedSupplierId: 4 };
    const pr = { id: 9, officeId: 2, objectOfExpenditureId: 3, totalEstimate: "900.00" };
    const allotment = { officeId: 2, objectOfExpenditureId: 3, fiscalYear: new Date().getFullYear(), allottedAmount: "1200.00", committedAmount: "500.00" };
    const fake = fakeDatabase([[rfq], [abstract], [pr], [allotment]]);
    await expect(createPurchaseOrder(7, user, { db: fake.db as never, recordAudit: silentAudit })).rejects.toThrow("does not have a valid office-level budget commitment");
    expect(fake.inserts).toHaveLength(0);
  });
});
