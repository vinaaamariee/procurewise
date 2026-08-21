import { readFileSync } from "node:fs";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createProcurementDocument, describePreCanvassHandoff, markWorkflowNotificationRead, recordPreCanvassResubmission, requestPreCanvassCorrection, validateProcurementDocumentUpload } from "./db";

const admin = { id: 1, openId: "operational-admin", name: "Admin", email: "admin@example.com", loginMethod: "test", role: "admin", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() } as const;
const procurementOfficer = { ...admin, id: 7, role: "procurement_officer" as const };

function fakeDatabase(selectRows: unknown[][]) {
  let selectIndex = 0;
  const updates: unknown[] = [];
  const inserts: unknown[] = [];
  const db = {
    select: () => ({ from: () => ({ where: () => { const rows = selectRows[selectIndex++] ?? []; return { limit: async () => rows, then: (resolve: (value: unknown[]) => unknown) => Promise.resolve(rows).then(resolve) }; } }) }),
    update: () => ({ set: (value: unknown) => ({ where: async () => { updates.push(value); } }) }),
    insert: () => ({ values: async (value: unknown) => { inserts.push(value); } }),
  };
  return { db, updates, inserts };
}

describe("ProcureWise operational-readiness safeguards", () => {
  it("accepts allowed document types within the 10 MB limit and rejects unsupported or oversized uploads", () => {
    expect(validateProcurementDocumentUpload("application/pdf", 1024)).toBeNull();
    expect(validateProcurementDocumentUpload("text/plain", 1024)).toContain("Only PDF");
    expect(validateProcurementDocumentUpload("application/pdf", 10 * 1024 * 1024 + 1)).toContain("10 MB");
  });

  it("stores document metadata, writes an audit event, and notifies the linked requester without storing file bytes in the database", async () => {
    const document = { id: 31, documentType: "Signed Purchase Request", originalFileName: "signed-pr.pdf", storageKey: "key-31", storageUrl: "/manus-storage/key-31" };
    const fake = fakeDatabase([[{ id: 9, requestedById: 2 }], [document]]);
    const notifications: unknown[] = [];
    const audits: unknown[] = [];
    const result = await createProcurementDocument({ entityType: "purchase_request", entityId: 9, documentType: "Signed Purchase Request", originalFileName: "signed pr.pdf", mimeType: "application/pdf", dataBase64: Buffer.from("procurewise").toString("base64") }, admin, {
      db: fake.db as never,
      putDocument: async () => ({ key: "key-31", url: "/manus-storage/key-31" }),
      recordAudit: async (entry) => { audits.push(entry); },
      notifyUser: async (entry) => { notifications.push(entry); },
    });
    expect(result).toEqual(document);
    expect(fake.inserts[0]).toEqual(expect.objectContaining({ entityType: "purchase_request", entityId: 9, storageKey: "key-31", storageUrl: "/manus-storage/key-31", uploadedById: 1 }));
    expect(audits).toHaveLength(1);
    expect(notifications).toEqual([expect.objectContaining({ recipientUserId: 2, kind: "document" })]);
  });

  it("allows an End-User to attach an approved supporting file only to their own PPMP entry", async () => {
    const endUser = { ...admin, id: 2, role: "end_user" as const };
    const document = { id: 41, documentType: "PPMP supporting document", originalFileName: "approved-ppmp.pdf", storageKey: "key-41", storageUrl: "/manus-storage/key-41" };
    const fake = fakeDatabase([[{ id: 18, preparedById: 2 }], [document]]);
    await expect(createProcurementDocument({ entityType: "app_ppmp_entry", entityId: 18, documentType: "PPMP supporting document", originalFileName: "approved ppmp.pdf", mimeType: "application/pdf", dataBase64: Buffer.from("procurewise").toString("base64") }, endUser, {
      db: fake.db as never,
      putDocument: async () => ({ key: "key-41", url: "/manus-storage/key-41" }),
      recordAudit: async () => undefined,
      notifyUser: async () => undefined,
    })).resolves.toEqual(document);
    expect(fake.inserts[0]).toEqual(expect.objectContaining({ entityType: "app_ppmp_entry", entityId: 18, storageKey: "key-41", uploadedById: 2 }));
  });

  it("wires PPMP supporting-file upload, managed-reference empty states, and a manual procurement-mode field", () => {
    const plans = readFileSync(new URL("../client/src/pages/ManagementPages.tsx", import.meta.url), "utf8");
    expect(plans).toContain("Supporting document");
    expect(plans).toContain('entityType: "app_ppmp_entry"');
    expect(plans).toContain("No managed offices available");
    expect(plans).toContain("No expenditure objects available");
    expect(plans).toContain("Other — enter manually");
    expect(plans).toContain("Enter the applicable mode of procurement");
  });

  it("returns a submitted Pre-Canvass with mandatory comments and creates an End-User correction alert", async () => {
    const fake = fakeDatabase([[{ id: 14, status: "submitted", purchaseRequestId: 9 }], [{ id: 9, status: "procurement_review", requestedById: 2 }], [{ id: 5, status: "open" }]]);
    const notifications: unknown[] = [];
    const audits: unknown[] = [];
    await requestPreCanvassCorrection({ preCanvassId: 14, reason: "Please attach the signed quotation acknowledgement from Supplier B." }, procurementOfficer, { db: fake.db as never, recordAudit: async (entry) => { audits.push(entry); }, notifyUser: async (entry) => { notifications.push(entry); } });
    expect(fake.updates).toContainEqual({ status: "draft" });
    expect(fake.inserts).toContainEqual(expect.objectContaining({ entityType: "pre_canvass", entityId: 14, assignedToId: 2, requestedById: 7, reason: "Please attach the signed quotation acknowledgement from Supplier B." }));
    expect(audits).toEqual([expect.objectContaining({ action: "returned_for_correction" })]);
    expect(notifications).toEqual([expect.objectContaining({ recipientUserId: 2, kind: "correction", title: "Pre-Canvass returned for correction" })]);
  });

  it("marks an open correction as resubmitted and distinguishes it from an initial review handoff", async () => {
    const fake = fakeDatabase([[{ id: 5, status: "open" }]]);
    const groups: unknown[] = [];
    await recordPreCanvassResubmission(14, { ...admin, id: 2, role: "end_user" }, { db: fake.db as never, notifyRoleGroup: async (roles, entry) => { groups.push({ roles, entry }); } });
    expect(fake.updates).toContainEqual(expect.objectContaining({ status: "resubmitted" }));
    expect(groups).toEqual([{ roles: ["procurement_officer"], entry: expect.objectContaining({ title: "Pre-Canvass resubmitted", entityId: 14 }) }]);
    expect(describePreCanvassHandoff(false).title).toBe("Pre-Canvass awaiting review");
  });

  it("marks only the recipient's workflow notification as read", async () => {
    const fake = fakeDatabase([[{ id: 51, recipientUserId: 1, readAt: null }]]);
    await markWorkflowNotificationRead(51, admin, { db: fake.db as never });
    expect(fake.updates).toHaveLength(1);
    await expect(markWorkflowNotificationRead(52, admin, { db: fakeDatabase([[{ id: 52, recipientUserId: 2, readAt: null }]]).db as never })).rejects.toThrow("Notification not found");
  });

  it("requires the guided setup workspace to expose readiness and signatory settings", () => {
    const setupPage = readFileSync(new URL("../client/src/pages/Setup.tsx", import.meta.url), "utf8");
    expect(setupPage).toContain("Configuration readiness");
    expect(setupPage).toContain("Entity and PO signatory defaults");
    expect(setupPage).toContain("updateSettings.mutate");
  });
});
