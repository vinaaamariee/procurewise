import { and, eq, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { abstractsOfCanvass, appPpmpEntries, auditTrails, budgetAllotments, deliveryReceipts, InsertUser, objectsOfExpenditure, offices, pmrLogs, preCanvassQuotes, preCanvasses, purchaseOrders, purchaseRequestItems, purchaseRequests, quotationAbstracts, rfqs, supplierQuotations, suppliers, User, users } from "../drizzle/schema";
import { hasRequiredSupplierQuotations, normalizeProcurementRole, selectLowestCompliantQuote, type ProcurementRole, type PrStatus } from "../shared/procurementRules";
import { ENV } from "./_core/env";
import { validatePoBudgetGeneration, validatePrBudgetSubmission } from "./procurementValidation";

let _db: ReturnType<typeof drizzle> | null = null;
type ProcurementWorkflowOptions = { db?: ReturnType<typeof drizzle>; recordAudit?: typeof writeAuditEvent };
type UserUpsertOptions = { db?: ReturnType<typeof drizzle> | null };

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser, options?: UserUpsertOptions): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = options?.db ?? await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId, lastSignedIn: new Date() };
  const updateSet: Record<string, unknown> = { lastSignedIn: new Date() };
  (["name", "email", "loginMethod"] as const).forEach((field) => {
    if (user[field] !== undefined) {
      values[field] = user[field];
      updateSet[field] = user[field] ?? null;
    }
  });
  if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  } else if (user.role) {
    values.role = user.role;
    updateSet.role = user.role;
  } else {
    // Explicitly provision new OAuth identities as End-Users while preserving any existing assigned role on later sign-ins.
    values.role = "end_user";
  }
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable. Configure the database before processing procurement records.");
  return db;
}

async function writeAuditEvent(input: { entityType: string; entityId: number; action: string; performedById: number; performedByRole: ProcurementRole; details?: Record<string, unknown> }) {
  const db = await requireDb();
  await db.insert(auditTrails).values({ ...input, details: input.details ?? null });
}

export async function getWorkspaceSetup() {
  const db = await requireDb();
  const [officeRows, objectRows, supplierRows] = await Promise.all([
    db.select().from(offices).where(eq(offices.isActive, 1)),
    db.select().from(objectsOfExpenditure).where(eq(objectsOfExpenditure.isActive, 1)),
    db.select().from(suppliers).where(eq(suppliers.isActive, 1)),
  ]);
  return { offices: officeRows, objectsOfExpenditure: objectRows, suppliers: supplierRows };
}

export async function getBudgetUtilization() {
  const db = await requireDb();
  const [allotments, officeRows, objectRows] = await Promise.all([db.select().from(budgetAllotments), db.select().from(offices), db.select().from(objectsOfExpenditure)]);
  return allotments.map((allotment) => ({
    ...allotment,
    office: officeRows.find((office) => office.id === allotment.officeId) ?? null,
    objectOfExpenditure: objectRows.find((object) => object.id === allotment.objectOfExpenditureId) ?? null,
    availableAmount: (Number(allotment.allottedAmount) - Number(allotment.committedAmount)).toFixed(2),
  }));
}

export async function createOffice(input: { code: string; name: string }, user: User) {
  const db = await requireDb();
  await db.insert(offices).values(input);
  const [office] = await db.select().from(offices).where(eq(offices.code, input.code)).limit(1);
  if (!office) throw new Error("Office could not be created.");
  await writeAuditEvent({ entityType: "office", entityId: office.id, action: "created", performedById: user.id, performedByRole: normalizeProcurementRole(user.role), details: { code: office.code } });
  return office;
}

export async function createObjectOfExpenditure(input: { code: string; name: string }, user: User) {
  const db = await requireDb();
  await db.insert(objectsOfExpenditure).values(input);
  const [object] = await db.select().from(objectsOfExpenditure).where(eq(objectsOfExpenditure.code, input.code)).limit(1);
  if (!object) throw new Error("Object of expenditure could not be created.");
  await writeAuditEvent({ entityType: "object_of_expenditure", entityId: object.id, action: "created", performedById: user.id, performedByRole: normalizeProcurementRole(user.role), details: { code: object.code } });
  return object;
}

export async function createBudgetAllotment(input: { officeId: number; objectOfExpenditureId: number; fiscalYear: number; allottedAmount: number }, user: User) {
  const db = await requireDb();
  await db.insert(budgetAllotments).values({ ...input, allottedAmount: input.allottedAmount.toFixed(2), createdById: user.id });
  const [allotment] = await db.select().from(budgetAllotments).where(and(eq(budgetAllotments.officeId, input.officeId), eq(budgetAllotments.objectOfExpenditureId, input.objectOfExpenditureId), eq(budgetAllotments.fiscalYear, input.fiscalYear))).limit(1);
  if (!allotment) throw new Error("Budget allotment could not be created.");
  await writeAuditEvent({ entityType: "budget_allotment", entityId: allotment.id, action: "created", performedById: user.id, performedByRole: normalizeProcurementRole(user.role), details: { fiscalYear: input.fiscalYear } });
  return allotment;
}

export async function createSupplier(input: { supplierCode: string; companyName: string; tin?: string; contactPerson?: string; email?: string; phone?: string; address?: string; offerings?: string; accreditationStatus: "pending" | "accredited" | "suspended" }, user: User) {
  const db = await requireDb();
  await db.insert(suppliers).values({ ...input, tin: input.tin || null, contactPerson: input.contactPerson || null, email: input.email || null, phone: input.phone || null, address: input.address || null, offerings: input.offerings || null, createdById: user.id });
  const [supplier] = await db.select().from(suppliers).where(eq(suppliers.supplierCode, input.supplierCode)).limit(1);
  if (!supplier) throw new Error("Supplier could not be registered.");
  await writeAuditEvent({ entityType: "supplier", entityId: supplier.id, action: "registered", performedById: user.id, performedByRole: normalizeProcurementRole(user.role), details: { supplierCode: supplier.supplierCode } });
  return supplier;
}

export async function createAppPpmpEntry(input: { fiscalYear: number; officeId: number; objectOfExpenditureId: number; description: string; plannedAmount: number; papCode?: string; projectTitle?: string; modeOfProcurement?: string; fundSource?: string; procurementSchedule?: string; remarks?: string }, user: User) {
  const db = await requireDb();
  await db.insert(appPpmpEntries).values({ ...input, papCode: input.papCode || null, projectTitle: input.projectTitle || null, modeOfProcurement: input.modeOfProcurement || "Small Value Procurement", fundSource: input.fundSource || null, procurementSchedule: input.procurementSchedule || null, remarks: input.remarks || null, plannedAmount: input.plannedAmount.toFixed(2), preparedById: user.id });
  const [entry] = await db.select().from(appPpmpEntries).where(and(eq(appPpmpEntries.officeId, input.officeId), eq(appPpmpEntries.description, input.description), eq(appPpmpEntries.fiscalYear, input.fiscalYear))).limit(1);
  if (!entry) throw new Error("APP/PPMP entry could not be created.");
  await writeAuditEvent({ entityType: "app_ppmp_entry", entityId: entry.id, action: "created", performedById: user.id, performedByRole: normalizeProcurementRole(user.role), details: { fiscalYear: input.fiscalYear } });
  return entry;
}

export async function listUserProfiles() {
  const db = await requireDb();
  return db.select({ id: users.id, name: users.name, email: users.email, role: users.role, lastSignedIn: users.lastSignedIn }).from(users);
}

export async function updateUserProcurementRole(userId: number, role: ProcurementRole, actor: User) {
  const db = await requireDb();
  await db.update(users).set({ role }).where(eq(users.id, userId));
  await writeAuditEvent({ entityType: "user_profile", entityId: userId, action: "role_updated", performedById: actor.id, performedByRole: normalizeProcurementRole(actor.role), details: { assignedRole: role } });
}

export async function listPurchaseRequests(user: User) {
  const db = await requireDb();
  return normalizeProcurementRole(user.role) === "end_user"
    ? db.select().from(purchaseRequests).where(eq(purchaseRequests.requestedById, user.id))
    : db.select().from(purchaseRequests);
}

export async function createPurchaseRequest(input: { purpose: string; fundSource?: string; fundCluster?: string; responsibilityCenterCode?: string; requesterDesignation?: string; ppmpEntryId?: number; officeId: number; objectOfExpenditureId: number; items: Array<{ stockPropertyNo?: string; description: string; specification?: string; quantity: number; unit: string; estimatedUnitCost: number }> }, user: User) {
  const db = await requireDb();
  const totalEstimate = input.items.reduce((sum, item) => sum + item.quantity * item.estimatedUnitCost, 0);
  if (totalEstimate <= 0) throw new Error("A Purchase Request must contain at least one item with a positive estimated cost.");
  const prNumber = `PR-${new Date().getFullYear()}-${Date.now().toString().slice(-7)}`;
  await db.insert(purchaseRequests).values({
    prNumber,
    purpose: input.purpose,
    fundSource: input.fundSource || null,
    fundCluster: input.fundCluster || "01101101",
    responsibilityCenterCode: input.responsibilityCenterCode || null,
    requesterDesignation: input.requesterDesignation || null,
    officeId: input.officeId,
    objectOfExpenditureId: input.objectOfExpenditureId,
    totalEstimate: totalEstimate.toFixed(2),
    requestedById: user.id,
    ppmpEntryId: input.ppmpEntryId ?? null,
  });
  const [created] = await db.select().from(purchaseRequests).where(eq(purchaseRequests.prNumber, prNumber)).limit(1);
  if (!created) throw new Error("The Purchase Request could not be created.");
  await db.insert(purchaseRequestItems).values(input.items.map((item) => ({
    purchaseRequestId: created.id,
    stockPropertyNo: item.stockPropertyNo || null,
    description: item.description,
    specification: item.specification || null,
    quantity: item.quantity.toFixed(2),
    unit: item.unit,
    estimatedUnitCost: item.estimatedUnitCost.toFixed(2),
    totalCost: (item.quantity * item.estimatedUnitCost).toFixed(2),
  })));
  await writeAuditEvent({ entityType: "purchase_request", entityId: created.id, action: "created", performedById: user.id, performedByRole: normalizeProcurementRole(user.role), details: { prNumber } });
  return created;
}

export async function advancePurchaseRequest(input: { purchaseRequestId: number; nextStatus: PrStatus }, user: User, options?: ProcurementWorkflowOptions) {
  const db = options?.db ?? await requireDb();
  const recordAudit = options?.recordAudit ?? writeAuditEvent;
  const [pr] = await db.select().from(purchaseRequests).where(eq(purchaseRequests.id, input.purchaseRequestId)).limit(1);
  if (!pr) throw new Error("Purchase Request not found.");
  const update: Partial<typeof purchaseRequests.$inferInsert> = { status: input.nextStatus };
  if (input.nextStatus === "procurement_review") {
    if (!pr.ppmpEntryId) throw new Error("Link the Purchase Request to a PPMP entry before forwarding the procurement package.");
    const [preCanvass] = await db.select().from(preCanvasses).where(eq(preCanvasses.purchaseRequestId, pr.id)).limit(1);
    if (!preCanvass || preCanvass.status !== "submitted") throw new Error("Submit a complete three-supplier Pre-Canvass before forwarding the procurement package.");
    const [allotment] = await db.select().from(budgetAllotments).where(and(eq(budgetAllotments.officeId, pr.officeId), eq(budgetAllotments.objectOfExpenditureId, pr.objectOfExpenditureId), eq(budgetAllotments.fiscalYear, new Date().getFullYear()))).limit(1);
    if (!allotment) throw new Error("No matching budget allotment exists for this office and object of expenditure.");
    if (!validatePrBudgetSubmission({ allottedAmount: allotment.allottedAmount, committedAmount: allotment.committedAmount, purchaseRequestAmount: pr.totalEstimate }).allowed) throw new Error("The Purchase Request exceeds the available office-level budget allotment.");
    update.submittedAt = new Date();
  }
  if (input.nextStatus === "approval_review") update.procurementReviewedById = user.id;
  if (input.nextStatus === "approved") update.administrativeApprovedById = user.id;
  await db.update(purchaseRequests).set(update).where(eq(purchaseRequests.id, pr.id));
  if (input.nextStatus === "procurement_review") {
    await db.update(budgetAllotments).set({ committedAmount: sql`${budgetAllotments.committedAmount} + ${pr.totalEstimate}` }).where(and(eq(budgetAllotments.officeId, pr.officeId), eq(budgetAllotments.objectOfExpenditureId, pr.objectOfExpenditureId), eq(budgetAllotments.fiscalYear, new Date().getFullYear())));
  }
  await recordAudit({ entityType: "purchase_request", entityId: pr.id, action: `status:${input.nextStatus}`, performedById: user.id, performedByRole: normalizeProcurementRole(user.role), details: { prNumber: pr.prNumber } });
  return { ...pr, ...update };
}

export async function createPreCanvass(input: { purchaseRequestId: number; approvedBudget?: number; quotationDeadline?: Date; deliveryPeriodDays?: number; priceEvaluationMode?: "lot_basis" | "per_item" }, user: User) {
  const db = await requireDb();
  const [pr] = await db.select().from(purchaseRequests).where(eq(purchaseRequests.id, input.purchaseRequestId)).limit(1);
  if (!pr || pr.requestedById !== user.id) throw new Error("End-Users may prepare a Pre-Canvass only for their own Purchase Request.");
  const preCanvassNumber = `PC-${new Date().getFullYear()}-${Date.now().toString().slice(-7)}`;
  await db.insert(preCanvasses).values({ preCanvassNumber, purchaseRequestId: input.purchaseRequestId, approvedBudget: (input.approvedBudget ?? Number(pr.totalEstimate)).toFixed(2), quotationDeadline: input.quotationDeadline ?? null, deliveryPeriodDays: input.deliveryPeriodDays ?? 30, priceEvaluationMode: input.priceEvaluationMode ?? "lot_basis", preparedById: user.id });
  const [created] = await db.select().from(preCanvasses).where(eq(preCanvasses.preCanvassNumber, preCanvassNumber)).limit(1);
  if (!created) throw new Error("The Pre-Canvass could not be created.");
  await writeAuditEvent({ entityType: "pre_canvass", entityId: created.id, action: "created", performedById: user.id, performedByRole: normalizeProcurementRole(user.role), details: { preCanvassNumber, purchaseRequestId: input.purchaseRequestId } });
  return created;
}

export async function addPreCanvassQuote(input: { preCanvassId: number; supplierId: number; totalPrice: number; deliveryDays: number; isCompliant: boolean; quotationReference?: string; supplierRepresentative?: string; acknowledgedAt?: Date; receivedBy?: string; notes?: string }, user: User) {
  const db = await requireDb();
  const [preCanvass] = await db.select().from(preCanvasses).where(eq(preCanvasses.id, input.preCanvassId)).limit(1);
  if (!preCanvass || preCanvass.preparedById !== user.id || preCanvass.status !== "draft") throw new Error("Supplier quotes may be entered only by the End-User before the Pre-Canvass is submitted.");
  await db.insert(preCanvassQuotes).values({ ...input, totalPrice: input.totalPrice.toFixed(2), isCompliant: input.isCompliant ? 1 : 0, quotationReference: input.quotationReference || null, supplierRepresentative: input.supplierRepresentative || null, acknowledgedAt: input.acknowledgedAt ?? null, receivedBy: input.receivedBy || null, notes: input.notes || null });
  await writeAuditEvent({ entityType: "pre_canvass", entityId: input.preCanvassId, action: "supplier_quote_added", performedById: user.id, performedByRole: normalizeProcurementRole(user.role), details: { supplierId: input.supplierId } });
}

export async function submitPreCanvass(preCanvassId: number, user: User, options?: ProcurementWorkflowOptions) {
  const db = options?.db ?? await requireDb();
  const recordAudit = options?.recordAudit ?? writeAuditEvent;
  const [preCanvass] = await db.select().from(preCanvasses).where(eq(preCanvasses.id, preCanvassId)).limit(1);
  if (!preCanvass || preCanvass.preparedById !== user.id || preCanvass.status !== "draft") throw new Error("This Pre-Canvass cannot be submitted by the current user.");
  const quotes = await db.select().from(preCanvassQuotes).where(eq(preCanvassQuotes.preCanvassId, preCanvassId));
  if (!hasRequiredSupplierQuotations(quotes.length)) throw new Error("Three supplier quotes are required before forwarding the Pre-Canvass to the Procurement Officer.");
  await db.update(preCanvasses).set({ status: "submitted" }).where(eq(preCanvasses.id, preCanvassId));
  await recordAudit({ entityType: "pre_canvass", entityId: preCanvassId, action: "submitted_to_procurement", performedById: user.id, performedByRole: normalizeProcurementRole(user.role), details: { quoteCount: quotes.length } });
}

export async function createAbstractOfCanvass(preCanvassId: number, user: User) {
  const db = await requireDb();
  const [preCanvass] = await db.select().from(preCanvasses).where(eq(preCanvasses.id, preCanvassId)).limit(1);
  if (!preCanvass || preCanvass.status !== "submitted") throw new Error("A submitted Pre-Canvass is required before an Abstract of Canvass can be generated.");
  const quotes = await db.select().from(preCanvassQuotes).where(eq(preCanvassQuotes.preCanvassId, preCanvassId));
  if (!hasRequiredSupplierQuotations(quotes.length)) throw new Error("Three supplier quotes are required before an Abstract of Canvass can be generated.");
  const recommendation = selectLowestCompliantQuote(quotes.map((quote) => ({ ...quote, isCompliant: quote.isCompliant === 1 })));
  if (!recommendation) throw new Error("No compliant supplier quote is available for recommendation.");
  const abstractNumber = `AOC-${new Date().getFullYear()}-${Date.now().toString().slice(-7)}`;
  await db.insert(abstractsOfCanvass).values({ abstractNumber, preCanvassId, recommendedSupplierId: recommendation.supplierId, recommendationReason: "Lowest compliant supplier selected from the End-User's mandatory three-supplier Pre-Canvass.", preparedById: user.id });
  await db.update(preCanvasses).set({ status: "abstracted" }).where(eq(preCanvasses.id, preCanvassId));
  await writeAuditEvent({ entityType: "abstract_of_canvass", entityId: preCanvassId, action: "recommended", performedById: user.id, performedByRole: normalizeProcurementRole(user.role), details: { abstractNumber, recommendedSupplierId: recommendation.supplierId } });
}

export async function decideAbstractOfCanvass(input: { preCanvassId: number; decision: "approved" | "rejected"; remarks?: string }, user: User, options?: ProcurementWorkflowOptions) {
  const db = options?.db ?? await requireDb();
  const recordAudit = options?.recordAudit ?? writeAuditEvent;
  const [abstract] = await db.select().from(abstractsOfCanvass).where(eq(abstractsOfCanvass.preCanvassId, input.preCanvassId)).limit(1);
  const [preCanvass] = await db.select().from(preCanvasses).where(eq(preCanvasses.id, input.preCanvassId)).limit(1);
  if (!abstract || abstract.status !== "recommended" || !preCanvass) throw new Error("A Procurement Officer recommendation is required before an administrative decision.");
  await db.update(abstractsOfCanvass).set({ status: input.decision, decidedById: user.id, decisionRemarks: input.remarks || null }).where(eq(abstractsOfCanvass.id, abstract.id));
  await db.update(preCanvasses).set({ status: input.decision }).where(eq(preCanvasses.id, preCanvass.id));
  await db.update(purchaseRequests).set({ status: input.decision, administrativeApprovedById: user.id }).where(eq(purchaseRequests.id, preCanvass.purchaseRequestId));
  await recordAudit({ entityType: "abstract_of_canvass", entityId: abstract.id, action: input.decision, performedById: user.id, performedByRole: normalizeProcurementRole(user.role), details: { remarks: input.remarks || null } });
}

export async function createPurchaseOrderFromPreCanvass(preCanvassId: number, user: User, options?: ProcurementWorkflowOptions) {
  const db = options?.db ?? await requireDb();
  const recordAudit = options?.recordAudit ?? writeAuditEvent;
  const [abstract] = await db.select().from(abstractsOfCanvass).where(eq(abstractsOfCanvass.preCanvassId, preCanvassId)).limit(1);
  const [preCanvass] = await db.select().from(preCanvasses).where(eq(preCanvasses.id, preCanvassId)).limit(1);
  if (!abstract || abstract.status !== "approved" || !preCanvass) throw new Error("An approved Abstract of Canvass is required before a Purchase Order can be issued.");
  const [pr] = await db.select().from(purchaseRequests).where(eq(purchaseRequests.id, preCanvass.purchaseRequestId)).limit(1);
  if (!pr || pr.status !== "approved") throw new Error("The linked Purchase Request must be administratively approved before PO issue.");
  const [quote] = await db.select().from(preCanvassQuotes).where(and(eq(preCanvassQuotes.preCanvassId, preCanvassId), eq(preCanvassQuotes.supplierId, abstract.recommendedSupplierId))).limit(1);
  if (!quote) throw new Error("The recommended Pre-Canvass quote could not be found.");
  const poNumber = `PO-${new Date().getFullYear()}-${Date.now().toString().slice(-7)}`;
  const scheduledDeliveryDate = preCanvass.deliveryPeriodDays ? new Date(Date.now() + preCanvass.deliveryPeriodDays * 86_400_000) : null;
  await db.insert(purchaseOrders).values({ poNumber, purchaseRequestId: pr.id, preCanvassId, supplierId: quote.supplierId, totalAmount: quote.totalPrice, placeOfDelivery: "Batanes State College", scheduledDeliveryDate, deliveryTerm: "FOB Destination", paymentTerm: "15 days upon complete delivery", modeOfProcurement: "Small Value Procurement", fundCluster: pr.fundCluster, fundsAvailable: pr.totalEstimate, generatedById: user.id, status: "issued" });
  await db.update(purchaseRequests).set({ status: "po_issued" }).where(eq(purchaseRequests.id, pr.id));
  const [po] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.poNumber, poNumber)).limit(1);
  if (!po) throw new Error("The Purchase Order could not be issued.");
  await recordAudit({ entityType: "purchase_order", entityId: po.id, action: "issued", performedById: user.id, performedByRole: normalizeProcurementRole(user.role), details: { poNumber, preCanvassId } });
  return po;
}

export async function recordDelivery(input: { purchaseOrderId: number; receiptNumber: string; receivedByName?: string; deliveryStatus?: "complete" | "partial"; signatureReference?: string; remarks?: string }, user: User, options?: ProcurementWorkflowOptions) {
  const db = options?.db ?? await requireDb();
  const recordAudit = options?.recordAudit ?? writeAuditEvent;
  const [po] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, input.purchaseOrderId)).limit(1);
  if (!po || po.status !== "issued") throw new Error("Only an issued Purchase Order may be recorded as delivered.");
  await db.insert(deliveryReceipts).values({ purchaseOrderId: po.id, receiptNumber: input.receiptNumber, receivedByName: input.receivedByName || null, deliveryStatus: input.deliveryStatus ?? "complete", signatureReference: input.signatureReference || null, remarks: input.remarks || null, receivedById: user.id });
  await db.update(purchaseOrders).set({ status: "delivered" }).where(eq(purchaseOrders.id, po.id));
  await db.update(purchaseRequests).set({ status: "delivered" }).where(eq(purchaseRequests.id, po.purchaseRequestId));
  await recordAudit({ entityType: "purchase_order", entityId: po.id, action: "delivery_logged", performedById: user.id, performedByRole: normalizeProcurementRole(user.role), details: { receiptNumber: input.receiptNumber } });
}

export async function logPmr(input: { purchaseOrderId: number; pmrNumber: string; remarks?: string }, user: User, options?: ProcurementWorkflowOptions) {
  const db = options?.db ?? await requireDb();
  const recordAudit = options?.recordAudit ?? writeAuditEvent;
  const [po] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, input.purchaseOrderId)).limit(1);
  if (!po || po.status !== "delivered") throw new Error("A delivered Purchase Order is required before PMR logging.");
  await db.insert(pmrLogs).values({ purchaseOrderId: po.id, pmrNumber: input.pmrNumber, remarks: input.remarks || null, loggedById: user.id });
  await db.update(purchaseOrders).set({ status: "closed" }).where(eq(purchaseOrders.id, po.id));
  await db.update(purchaseRequests).set({ status: "pmr_logged" }).where(eq(purchaseRequests.id, po.purchaseRequestId));
  await recordAudit({ entityType: "purchase_order", entityId: po.id, action: "pmr_logged", performedById: user.id, performedByRole: normalizeProcurementRole(user.role), details: { pmrNumber: input.pmrNumber } });
}

export async function createRfqFromPurchaseRequest(purchaseRequestId: number, user: User) {
  const db = await requireDb();
  const [pr] = await db.select().from(purchaseRequests).where(eq(purchaseRequests.id, purchaseRequestId)).limit(1);
  if (!pr || pr.status !== "approved") throw new Error("Only an approved Purchase Request can be converted to an RFQ.");
  const rfqNumber = `RFQ-${new Date().getFullYear()}-${Date.now().toString().slice(-7)}`;
  await db.insert(rfqs).values({ rfqNumber, purchaseRequestId, status: "canvass", createdById: user.id });
  await db.update(purchaseRequests).set({ status: "rfq" }).where(eq(purchaseRequests.id, purchaseRequestId));
  const [created] = await db.select().from(rfqs).where(eq(rfqs.rfqNumber, rfqNumber)).limit(1);
  if (!created) throw new Error("The RFQ could not be created.");
  await writeAuditEvent({ entityType: "rfq", entityId: created.id, action: "created_from_approved_pr", performedById: user.id, performedByRole: normalizeProcurementRole(user.role), details: { rfqNumber, prNumber: pr.prNumber } });
  return created;
}

export async function addSupplierQuotation(input: { rfqId: number; supplierId: number; totalPrice: number; deliveryDays: number; isCompliant: boolean; notes?: string }, user: User) {
  const db = await requireDb();
  await db.insert(supplierQuotations).values({ ...input, totalPrice: input.totalPrice.toFixed(2), isCompliant: input.isCompliant ? 1 : 0, notes: input.notes || null });
  await writeAuditEvent({ entityType: "rfq", entityId: input.rfqId, action: "supplier_quotation_added", performedById: user.id, performedByRole: normalizeProcurementRole(user.role), details: { supplierId: input.supplierId } });
}

export async function createQuotationAbstract(rfqId: number, user: User) {
  const db = await requireDb();
  const quotes = await db.select().from(supplierQuotations).where(eq(supplierQuotations.rfqId, rfqId));
  if (quotes.length < 3) throw new Error("At least three supplier quotations are required before an Abstract of Quotation can be generated.");
  const compliant = quotes.filter((quote) => quote.isCompliant === 1).sort((a, b) => Number(a.totalPrice) - Number(b.totalPrice));
  const recommended = compliant[0];
  if (!recommended) throw new Error("No compliant supplier quotation is available for recommendation.");
  await db.insert(quotationAbstracts).values({ rfqId, recommendedSupplierId: recommended.supplierId, recommendationReason: "Lowest compliant quotation selected from the mandatory three-supplier canvass.", status: "recommended", preparedById: user.id });
  await db.update(rfqs).set({ status: "abstracted" }).where(eq(rfqs.id, rfqId));
  await writeAuditEvent({ entityType: "rfq", entityId: rfqId, action: "quotation_abstract_generated", performedById: user.id, performedByRole: normalizeProcurementRole(user.role), details: { recommendedSupplierId: recommended.supplierId } });
}

export async function approveQuotationAbstract(rfqId: number, user: User) {
  const db = await requireDb();
  const [abstract] = await db.select().from(quotationAbstracts).where(eq(quotationAbstracts.rfqId, rfqId)).limit(1);
  if (!abstract || abstract.status !== "recommended") throw new Error("A recommended quotation abstract is required before approval.");
  await db.update(quotationAbstracts).set({ status: "approved", approvedById: user.id }).where(eq(quotationAbstracts.id, abstract.id));
  await db.update(rfqs).set({ status: "approved" }).where(eq(rfqs.id, rfqId));
  await writeAuditEvent({ entityType: "quotation_abstract", entityId: abstract.id, action: "approved", performedById: user.id, performedByRole: normalizeProcurementRole(user.role) });
  return { ...abstract, status: "approved" as const, approvedById: user.id };
}

export async function createPurchaseOrder(rfqId: number, user: User, options?: ProcurementWorkflowOptions) {
  const db = options?.db ?? await requireDb();
  const recordAudit = options?.recordAudit ?? writeAuditEvent;
  const [rfq] = await db.select().from(rfqs).where(eq(rfqs.id, rfqId)).limit(1);
  const [abstract] = await db.select().from(quotationAbstracts).where(eq(quotationAbstracts.rfqId, rfqId)).limit(1);
  if (!rfq || !abstract || abstract.status !== "approved") throw new Error("An approved quotation abstract is required before a Purchase Order can be generated.");
  const [pr] = await db.select().from(purchaseRequests).where(eq(purchaseRequests.id, rfq.purchaseRequestId)).limit(1);
  if (!pr) throw new Error("The Purchase Request linked to this RFQ could not be found.");
  const [allotment] = await db.select().from(budgetAllotments).where(and(eq(budgetAllotments.officeId, pr.officeId), eq(budgetAllotments.objectOfExpenditureId, pr.objectOfExpenditureId), eq(budgetAllotments.fiscalYear, new Date().getFullYear()))).limit(1);
  if (!allotment || !validatePoBudgetGeneration({ committedAmount: allotment.committedAmount, purchaseRequestAmount: pr.totalEstimate }).allowed) throw new Error("The Purchase Order cannot be generated because the linked PR does not have a valid office-level budget commitment.");
  const [quote] = await db.select().from(supplierQuotations).where(and(eq(supplierQuotations.rfqId, rfqId), eq(supplierQuotations.supplierId, abstract.recommendedSupplierId))).limit(1);
  if (!quote) throw new Error("The recommended supplier quotation could not be found.");
  const poNumber = `PO-${new Date().getFullYear()}-${Date.now().toString().slice(-7)}`;
  await db.insert(purchaseOrders).values({ poNumber, purchaseRequestId: rfq.purchaseRequestId, rfqId, supplierId: quote.supplierId, totalAmount: quote.totalPrice, generatedById: user.id, status: "pending_approval" });
  await db.update(purchaseRequests).set({ status: "po" }).where(eq(purchaseRequests.id, rfq.purchaseRequestId));
  const [po] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.poNumber, poNumber)).limit(1);
  if (!po) throw new Error("Purchase Order could not be created.");
  await recordAudit({ entityType: "purchase_order", entityId: po.id, action: "generated", performedById: user.id, performedByRole: normalizeProcurementRole(user.role), details: { poNumber } });
  return po;
}

export async function getProcurementDashboard(user: User) {
  const db = await requireDb();
  const isEndUser = normalizeProcurementRole(user.role) === "end_user";
  const prRows = await listPurchaseRequests(user);
  const preCanvassRows = isEndUser ? (prRows.length ? await db.select().from(preCanvasses).where(inArray(preCanvasses.purchaseRequestId, prRows.map((pr) => pr.id))) : []) : await db.select().from(preCanvasses);
  const preCanvassIds = preCanvassRows.map((record) => record.id);
  const preCanvassQuoteRows = preCanvassIds.length ? await db.select().from(preCanvassQuotes).where(inArray(preCanvassQuotes.preCanvassId, preCanvassIds)) : [];
  const abstractOfCanvassRows = preCanvassIds.length ? await db.select().from(abstractsOfCanvass).where(inArray(abstractsOfCanvass.preCanvassId, preCanvassIds)) : [];
  const rfqRows = isEndUser ? [] : await db.select().from(rfqs);
  const quotationRows = isEndUser ? [] : await db.select().from(supplierQuotations);
  const abstractRows = isEndUser ? [] : await db.select().from(quotationAbstracts);
  const poRows = isEndUser ? (prRows.length ? await db.select().from(purchaseOrders).where(inArray(purchaseOrders.purchaseRequestId, prRows.map((pr) => pr.id))) : []) : await db.select().from(purchaseOrders);
  const poIds = poRows.map((po) => po.id);
  const deliveryRows = poIds.length ? await db.select().from(deliveryReceipts).where(inArray(deliveryReceipts.purchaseOrderId, poIds)) : [];
  const pmrRows = poIds.length ? await db.select().from(pmrLogs).where(inArray(pmrLogs.purchaseOrderId, poIds)) : [];
  const auditRows = isEndUser ? await db.select().from(auditTrails).where(eq(auditTrails.performedById, user.id)) : await db.select().from(auditTrails);
  const planRows = isEndUser ? await db.select().from(appPpmpEntries).where(eq(appPpmpEntries.preparedById, user.id)) : await db.select().from(appPpmpEntries);
  const relatedPrs = isEndUser ? prRows : await db.select().from(purchaseRequests);
  const relatedItems = isEndUser ? [] : await db.select().from(purchaseRequestItems);
  const closedPurchaseOrders = poRows.filter((po) => po.status === "closed");
  const cycleTimes = closedPurchaseOrders.map((po) => {
    const pr = relatedPrs.find((record) => record.id === po.purchaseRequestId);
    return pr ? (po.updatedAt.getTime() - pr.createdAt.getTime()) / 86_400_000 : null;
  }).filter((value): value is number => value !== null);
  const completedPrIds = new Set(closedPurchaseOrders.map((po) => po.purchaseRequestId));
  const commodityTotals = relatedItems.filter((item) => completedPrIds.has(item.purchaseRequestId)).reduce<Record<string, number>>((totals, item) => {
    totals[item.description] = (totals[item.description] ?? 0) + Number(item.totalCost);
    return totals;
  }, {});
  const topCommodities = Object.entries(commodityTotals).sort(([, a], [, b]) => b - a).slice(0, 5).map(([description, amount]) => ({ description, amount: amount.toFixed(2) }));
  return { purchaseRequests: prRows, preCanvasses: preCanvassRows, preCanvassQuotes: preCanvassQuoteRows, abstractsOfCanvass: abstractOfCanvassRows, deliveryReceipts: deliveryRows, pmrLogs: pmrRows, rfqs: rfqRows, supplierQuotations: quotationRows, quotationAbstracts: abstractRows, purchaseOrders: poRows, auditEvents: auditRows, appPpmpEntries: planRows, analytics: { averageCycleTimeDays: cycleTimes.length ? cycleTimes.reduce((sum, value) => sum + value, 0) / cycleTimes.length : null, topCommodities } };
}
