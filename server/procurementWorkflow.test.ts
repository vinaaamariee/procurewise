import { describe, expect, it } from "vitest";
import { advancePurchaseRequest, createPurchaseOrderFromPreCanvass, decideAbstractOfCanvass, logPmr, recordDelivery, submitPreCanvass } from "./db";

const user = { id: 1, openId: "workflow-test", name: "Workflow Test", email: "workflow@example.com", loginMethod: "test", role: "admin", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() } as const;

function fakeDatabase(selectRows: unknown[][]) {
  let selectIndex = 0;
  const updates: unknown[] = [];
  const inserts: unknown[] = [];
  const db = {
    select: () => ({ from: () => ({ where: () => { const rows = selectRows[selectIndex++]; return { limit: async () => rows, then: (resolve: (value: unknown[]) => unknown) => Promise.resolve(rows).then(resolve) }; } }) }),
    update: () => ({ set: (value: unknown) => ({ where: async () => { updates.push(value); } }) }),
    insert: () => ({ values: async (value: unknown) => { inserts.push(value); } }),
  };
  return { db, updates, inserts };
}

const silentAudit = async () => undefined;

describe("ProcureWise PPMP-to-PMR workflow gates", () => {
  it("forwards a PPMP-linked PR with a submitted three-supplier Pre-Canvass to Procurement review and records its commitment", async () => {
    const pr = { id: 9, prNumber: "PR-2026-00001", officeId: 2, objectOfExpenditureId: 3, totalEstimate: "600.00", status: "draft", ppmpEntryId: 5 };
    const preCanvass = { id: 14, purchaseRequestId: 9, status: "submitted" };
    const allotment = { officeId: 2, objectOfExpenditureId: 3, fiscalYear: new Date().getFullYear(), allottedAmount: "1000.00", committedAmount: "300.00" };
    const fake = fakeDatabase([[pr], [preCanvass], [allotment]]);
    const result = await advancePurchaseRequest({ purchaseRequestId: 9, nextStatus: "procurement_review" }, user, { db: fake.db as never, recordAudit: silentAudit });
    expect(result.status).toBe("procurement_review");
    expect(fake.updates).toHaveLength(2);
  });

  it("rejects package forwarding when the selected office-object allotment is insufficient", async () => {
    const pr = { id: 9, prNumber: "PR-2026-00001", officeId: 2, objectOfExpenditureId: 3, totalEstimate: "800.00", status: "draft", ppmpEntryId: 5 };
    const preCanvass = { id: 14, purchaseRequestId: 9, status: "submitted" };
    const allotment = { officeId: 2, objectOfExpenditureId: 3, fiscalYear: new Date().getFullYear(), allottedAmount: "1000.00", committedAmount: "300.00" };
    const fake = fakeDatabase([[pr], [preCanvass], [allotment]]);
    await expect(advancePurchaseRequest({ purchaseRequestId: 9, nextStatus: "procurement_review" }, user, { db: fake.db as never, recordAudit: silentAudit })).rejects.toThrow("exceeds the available office-level budget");
    expect(fake.updates).toHaveLength(0);
  });

  it("rejects PO issue when the linked PR has not received administrative approval", async () => {
    const abstract = { id: 8, preCanvassId: 14, status: "approved", recommendedSupplierId: 4 };
    const preCanvass = { id: 14, purchaseRequestId: 9 };
    const pr = { id: 9, status: "procurement_review" };
    const fake = fakeDatabase([[abstract], [preCanvass], [pr]]);
    await expect(createPurchaseOrderFromPreCanvass(14, user, { db: fake.db as never, recordAudit: silentAudit })).rejects.toThrow("administratively approved");
    expect(fake.inserts).toHaveLength(0);
  });

  it("forwards a three-supplier Pre-Canvass to Procurement only when all mandatory quotes exist", async () => {
    const preCanvass = { id: 14, preparedById: 1, status: "draft" };
    const quotes = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const fake = fakeDatabase([[preCanvass], quotes]);
    await submitPreCanvass(14, user, { db: fake.db as never, recordAudit: silentAudit });
    expect(fake.updates).toContainEqual({ status: "submitted" });
  });

  it("records the Administrative Approver's rejection decision against a Procurement Officer abstract", async () => {
    const abstract = { id: 8, preCanvassId: 14, status: "recommended" };
    const preCanvass = { id: 14, purchaseRequestId: 9 };
    const fake = fakeDatabase([[abstract], [preCanvass]]);
    await decideAbstractOfCanvass({ preCanvassId: 14, decision: "rejected", remarks: "Incomplete supporting basis." }, user, { db: fake.db as never, recordAudit: silentAudit });
    expect(fake.updates).toContainEqual(expect.objectContaining({ status: "rejected" }));
  });

  it("records the Administrative Approver's approval decision and advances the linked PR", async () => {
    const abstract = { id: 8, preCanvassId: 14, status: "recommended" };
    const preCanvass = { id: 14, purchaseRequestId: 9 };
    const fake = fakeDatabase([[abstract], [preCanvass]]);
    await decideAbstractOfCanvass({ preCanvassId: 14, decision: "approved", remarks: "Lowest compliant supplier approved." }, user, { db: fake.db as never, recordAudit: silentAudit });
    expect(fake.updates).toContainEqual(expect.objectContaining({ status: "approved", decidedById: 1 }));
    expect(fake.updates).toContainEqual(expect.objectContaining({ status: "approved", administrativeApprovedById: 1 }));
  });

  it("issues a PO from an approved Abstract of Canvass, then records delivery and PMR close-out", async () => {
    const abstract = { id: 8, preCanvassId: 14, status: "approved", recommendedSupplierId: 4 };
    const preCanvass = { id: 14, purchaseRequestId: 9 };
    const pr = { id: 9, status: "approved" };
    const quote = { supplierId: 4, totalPrice: "950.00" };
    const po = { id: 21, poNumber: "PO-2026-00001", purchaseRequestId: 9, status: "issued" };
    const poForPmr = { ...po, status: "delivered" };
    const fake = fakeDatabase([[abstract], [preCanvass], [pr], [quote], [po], [po], [poForPmr]]);
    await createPurchaseOrderFromPreCanvass(14, user, { db: fake.db as never, recordAudit: silentAudit });
    await recordDelivery({ purchaseOrderId: 21, receiptNumber: "DR-2026-01" }, user, { db: fake.db as never, recordAudit: silentAudit });
    await logPmr({ purchaseOrderId: 21, pmrNumber: "PMR-2026-01" }, user, { db: fake.db as never, recordAudit: silentAudit });
    expect(fake.inserts).toHaveLength(3);
    expect(fake.updates).toContainEqual({ status: "closed" });
  });
});
