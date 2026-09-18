import { randomUUID } from "node:crypto";
import { createHash } from "node:crypto";
import { and, desc, eq, inArray, isNull, like, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { abstractsOfCanvass, appPpmpEntries, auditTrails, bacTransmittals, bestValuePolicies, bestValuePolicyCriteria, budgetAllotments, deliveryReceipts, historicalPrices, InsertUser, lettersOfNotice, mcdmRecommendations, objectsOfExpenditure, offices, pmrLogs, preCanvassQuotes, preCanvasses, procurementCatalogFavorites, procurementCatalogItems, procurementCatalogSavedItems, procurementDocuments, procurementSettings, procurementSignatories, purchaseOrders, purchaseRequestItems, purchaseRequests, quotationAbstracts, rfqs, supplierEvaluationApprovals, supplierEvaluations, supplierQuotations, suppliers, supplierTagAssignments, supplierTags, testRecordArchives, User, users, workflowCorrections, workflowNotifications } from "../drizzle/schema";
import { hasRequiredSupplierQuotations, normalizeProcurementRole, roleCanAct, selectLowestCompliantQuote, type ProcurementRole, type PrStatus } from "../shared/procurementRules";
import { ENV } from "./_core/env";
import { validatePoBudgetGeneration, validatePrBudgetSubmission } from "./procurementValidation";
import { storagePut } from "./storage";
import { BEST_VALUE_CRITERIA, BEST_VALUE_POLICY_CODE, validateBestValueCriteria, type BestValueCriterionWeight } from "../shared/bestValuePolicy";
import { deriveSupplierEvaluationSummary, validateSupplierEvaluationResponses, type SupplierEvaluationAudience } from "../shared/supplierEvaluationForm";

let _db: ReturnType<typeof drizzle> | null = null;
let _pool: Pool | null = null;
type ProcurementWorkflowOptions = { db?: ReturnType<typeof drizzle>; recordAudit?: typeof writeAuditEvent };
type UserUpsertOptions = { db?: ReturnType<typeof drizzle> | null };
type OperationalServiceOptions = { db?: ReturnType<typeof drizzle>; recordAudit?: typeof writeAuditEvent; putDocument?: typeof storagePut; notifyUser?: typeof createWorkflowNotification; notifyRoleGroup?: typeof notifyRoles };
type DocumentEntityType = "app_ppmp_entry" | "purchase_request" | "pre_canvass" | "pre_canvass_quote" | "abstract_of_canvass" | "purchase_order" | "delivery_receipt" | "pmr_log";
type WorkflowNotificationKind = "action_required" | "status_change" | "correction" | "document";

const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
const TEST_ONLY_PREFIX = "TEST ONLY —";
const PERMITTED_DOCUMENT_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/msword",
  "application/vnd.ms-excel",
]);

export function validateProcurementDocumentUpload(mimeType: string, byteLength: number) {
  if (!PERMITTED_DOCUMENT_TYPES.has(mimeType)) return "Only PDF, JPG, PNG, DOC, DOCX, XLS, and XLSX procurement documents may be attached.";
  if (!byteLength || byteLength > MAX_DOCUMENT_BYTES) return "Document uploads must be between 1 byte and 10 MB.";
  return null;
}

export function isEligibleTestOnlyPackage(input: { description?: string | null; fundSource?: string | null; remarks?: string | null; officeCode?: string | null; objectCode?: string | null }) {
  return Boolean(
    input.description?.startsWith(TEST_ONLY_PREFIX)
    && input.fundSource?.startsWith(TEST_ONLY_PREFIX)
    && input.remarks?.includes("non-operational test record")
    && input.officeCode?.startsWith("TEST-")
    && input.objectCode?.startsWith("TEST-")
  );
}

export function describePreCanvassHandoff(hasOpenCorrections: boolean) {
  return hasOpenCorrections
    ? { title: "Pre-Canvass resubmitted", body: "An End-User has resubmitted a returned Pre-Canvass package for review." }
    : { title: "Pre-Canvass awaiting review", body: "An End-User has forwarded a complete three-supplier Pre-Canvass package for review." };
}

export function calculateMcdmScores(quotes: Array<{ supplierId: number; totalPrice: string | number; deliveryDays: number; isCompliant: number }>) {
  const compliantQuotes = quotes.filter((quote) => quote.isCompliant === 1);
  if (!compliantQuotes.length) return [];
  const lowestPrice = Math.min(...compliantQuotes.map((quote) => Number(quote.totalPrice)));
  const fastestDelivery = Math.min(...compliantQuotes.map((quote) => quote.deliveryDays));
  return compliantQuotes.map((quote) => {
    const priceScore = (lowestPrice / Number(quote.totalPrice)) * 60;
    const deliveryScore = fastestDelivery === 0 ? 20 : (fastestDelivery / Math.max(quote.deliveryDays, 1)) * 20;
    return { quote, priceScore, deliveryScore, complianceScore: 20, totalScore: priceScore + deliveryScore + 20 };
  }).sort((left, right) => right.totalScore - left.totalScore || Number(left.quote.totalPrice) - Number(right.quote.totalPrice));
}

export async function getDb() {
  const password = process.env.SUPABASE_DB_PASSWORD;
  const configuredConnectionString = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;
  if (!_db && (configuredConnectionString || password)) {
    try {
      const connectionString = configuredConnectionString ?? `postgresql://postgres.wchgxpvviebvwuhrsrvj:${encodeURIComponent(password as string)}@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres`;
      _pool = new Pool({ connectionString, ssl: connectionString.startsWith("postgres") ? { rejectUnauthorized: false } : undefined });
      _pool.on("connect", (client) => {
        void client.query("SET search_path TO procurewise, public").catch((error) => {
          console.warn("[Database] Failed to set ProcureWise search_path:", error);
        });
      });
      await _pool.query("SET search_path TO procurewise, public");
      _db = drizzle(_pool);
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
  await db.insert(users).values(values).onConflictDoUpdate({ target: users.openId, set: updateSet });
}

/**
 * Maps a verified Supabase identity to the existing ProcureWise user row. An
 * existing matching email keeps its user ID and role, so its procurement
 * records stay connected after the external-auth conversion.
 */
export async function upsertSupabaseAuthUser(input: { openId: string; email: string | null; name: string | null }): Promise<User> {
  const db = await requireDb();
  const existingByOpenId = await db.select().from(users).where(eq(users.openId, input.openId)).limit(1);
  const existingByEmail = !existingByOpenId[0] && input.email
    ? await db.select().from(users).where(eq(users.email, input.email)).limit(1)
    : [];
  const existing = existingByOpenId[0] ?? existingByEmail[0];
  const values = { openId: input.openId, email: input.email, name: input.name, loginMethod: "supabase", lastSignedIn: new Date() };

  if (existing) {
    const [updated] = await db.update(users).set(values).where(eq(users.id, existing.id)).returning();
    if (!updated) throw new Error("The existing ProcureWise user could not be updated.");
    return updated;
  }

  const [created] = await db.insert(users).values({ ...values, role: "end_user" }).returning();
  if (!created) throw new Error("The Supabase Auth user could not be provisioned.");
  return created;
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
  const [officeRows, objectRows, supplierRows, allotmentRows, settingsRows] = await Promise.all([
    db.select().from(offices).where(eq(offices.isActive, 1)),
    db.select().from(objectsOfExpenditure).where(eq(objectsOfExpenditure.isActive, 1)),
    db.select().from(suppliers).where(eq(suppliers.isActive, 1)),
    db.select().from(budgetAllotments).where(eq(budgetAllotments.fiscalYear, new Date().getFullYear())),
    db.select().from(procurementSettings).limit(1),
  ]);
  const settings = settingsRows[0] ?? null;
  const signatoriesReady = Boolean(settings?.authorizedOfficialName && settings?.authorizedOfficialDesignation && settings?.chiefAccountantName);
  return {
    offices: officeRows,
    objectsOfExpenditure: objectRows,
    suppliers: supplierRows,
    settings,
    readiness: [
      { key: "offices", label: "Requesting office", complete: officeRows.length > 0, detail: officeRows.length ? `${officeRows.length} active office record(s)` : "Add at least one requesting office." },
      { key: "objects", label: "Object of expenditure", complete: objectRows.length > 0, detail: objectRows.length ? `${objectRows.length} active expenditure object(s)` : "Add at least one expenditure object." },
      { key: "suppliers", label: "Supplier registry", complete: supplierRows.length >= 3, detail: supplierRows.length >= 3 ? `${supplierRows.length} active suppliers available for canvass.` : "Register at least three active suppliers for Pre-Canvass." },
      { key: "budget", label: `FY ${new Date().getFullYear()} budget allotment`, complete: allotmentRows.length > 0, detail: allotmentRows.length ? `${allotmentRows.length} current-year allotment record(s)` : "Record at least one current-year budget allotment." },
      { key: "signatories", label: "PO signatories", complete: signatoriesReady, detail: signatoriesReady ? "Authorised official and accounting signatory are recorded." : "Record the authorised official, designation, and Chief Accountant." },
    ],
  };
}

export async function updateProcurementSettings(input: { entityName: string; authorizedOfficialName?: string; authorizedOfficialDesignation?: string; chiefAccountantName?: string; defaultNoticeSignatory?: string; sessionTimeoutMinutes?: number; enableInAppNotifications?: boolean; notificationRefreshSeconds?: number }, user: User) {
  const db = await requireDb();
  const values = {
    entityName: input.entityName.trim() || "Batanes State College",
    authorizedOfficialName: input.authorizedOfficialName?.trim() || null,
    authorizedOfficialDesignation: input.authorizedOfficialDesignation?.trim() || null,
    chiefAccountantName: input.chiefAccountantName?.trim() || null,
    defaultNoticeSignatory: input.defaultNoticeSignatory?.trim() || null,
    sessionTimeoutMinutes: Math.min(240, Math.max(5, input.sessionTimeoutMinutes ?? 30)),
    enableInAppNotifications: input.enableInAppNotifications === false ? 0 : 1,
    notificationRefreshSeconds: Math.min(120, Math.max(10, input.notificationRefreshSeconds ?? 15)),
    updatedById: user.id,
  };
  const [existing] = await db.select().from(procurementSettings).limit(1);
  if (existing) {
    await db.update(procurementSettings).set(values).where(eq(procurementSettings.id, existing.id));
  } else {
    await db.insert(procurementSettings).values(values);
  }
  const [settings] = await db.select().from(procurementSettings).limit(1);
  if (!settings) throw new Error("Procurement settings could not be saved.");
  await writeAuditEvent({ entityType: "procurement_settings", entityId: settings.id, action: "updated", performedById: user.id, performedByRole: normalizeProcurementRole(user.role) });
  return settings;
}

export async function listPurchaseRequestSignatories() {
  const db = await requireDb();
  return db.select().from(procurementSignatories).where(eq(procurementSignatories.isActive, 1)).orderBy(procurementSignatories.fullName);
}

export async function createPurchaseRequestSignatory(input: { fullName: string; designation: string; mayRequest: boolean; mayApprove: boolean }, user: User) {
  const db = await requireDb();
  const [created] = await db.insert(procurementSignatories).values({
    fullName: input.fullName.trim(),
    designation: input.designation.trim(),
    mayRequest: input.mayRequest ? 1 : 0,
    mayApprove: input.mayApprove ? 1 : 0,
    createdById: user.id,
  }).returning();
  if (!created) throw new Error("The authorized signatory could not be saved.");
  await writeAuditEvent({ entityType: "procurement_signatory", entityId: created.id, action: "created", performedById: user.id, performedByRole: normalizeProcurementRole(user.role), details: { mayRequest: created.mayRequest, mayApprove: created.mayApprove } });
  return created;
}

export async function getBestValuePolicy() {
  const db = await requireDb();
  const [activePolicy] = await db.select().from(bestValuePolicies).where(eq(bestValuePolicies.isActive, 1)).orderBy(desc(bestValuePolicies.version)).limit(1);
  if (!activePolicy) {
    return {
      policy: { id: null, policyCode: BEST_VALUE_POLICY_CODE, name: "Initial Best Value Policy", version: 0, isActive: 0, totalWeight: "100.00", createdAt: null, isPersisted: false },
      criteria: BEST_VALUE_CRITERIA.map((criterion) => ({ ...criterion, weight: criterion.defaultWeight })),
    };
  }
  const savedCriteria = await db.select().from(bestValuePolicyCriteria).where(eq(bestValuePolicyCriteria.policyId, activePolicy.id)).orderBy(bestValuePolicyCriteria.sortOrder);
  const savedByKey = new Map(savedCriteria.map((criterion) => [criterion.criterionKey, criterion]));
  return {
    policy: { ...activePolicy, isPersisted: true },
    criteria: BEST_VALUE_CRITERIA.map((criterion) => ({ ...criterion, weight: Number(savedByKey.get(criterion.criterionKey)?.weight ?? criterion.defaultWeight) })),
  };
}

export async function getBestValuePolicyHistory() {
  const db = await requireDb();
  const policies = await db.select().from(bestValuePolicies).orderBy(desc(bestValuePolicies.version));
  if (!policies.length) return [];
  const policyIds = policies.map((policy) => policy.id);
  const creatorIds = Array.from(new Set(policies.map((policy) => policy.createdById)));
  const [criteria, creators, auditEvents] = await Promise.all([
    db.select().from(bestValuePolicyCriteria).where(inArray(bestValuePolicyCriteria.policyId, policyIds)).orderBy(bestValuePolicyCriteria.sortOrder),
    db.select({ id: users.id, name: users.name, email: users.email }).from(users).where(inArray(users.id, creatorIds)),
    db.select().from(auditTrails).where(and(eq(auditTrails.entityType, "best_value_policy"), inArray(auditTrails.entityId, policyIds))).orderBy(desc(auditTrails.createdAt)),
  ]);
  const creatorsById = new Map(creators.map((creator) => [creator.id, creator]));
  return policies.map((policy) => ({
    policy,
    criteria: criteria.filter((criterion) => criterion.policyId === policy.id),
    createdBy: creatorsById.get(policy.createdById) ?? null,
    activationAudit: auditEvents.find((event) => event.entityId === policy.id) ?? null,
  }));
}

export async function saveBestValuePolicy(input: { name: string; criteria: BestValueCriterionWeight[] }, user: User) {
  const validation = validateBestValueCriteria(input.criteria);
  if (!validation.valid) throw new Error(validation.error);
  const policyName = input.name.trim();
  if (policyName.length < 3 || policyName.length > 180) throw new Error("Best Value policy name must be between 3 and 180 characters.");
  const db = await requireDb();
  const created = await db.transaction(async (tx) => {
    const [latest] = await tx.select({ latestVersion: sql<string>`coalesce(max(${bestValuePolicies.version}), 0)` }).from(bestValuePolicies).where(eq(bestValuePolicies.policyCode, BEST_VALUE_POLICY_CODE));
    const nextVersion = Number(latest?.latestVersion ?? 0) + 1;
    await tx.update(bestValuePolicies).set({ isActive: 0, deactivatedAt: new Date() }).where(and(eq(bestValuePolicies.policyCode, BEST_VALUE_POLICY_CODE), eq(bestValuePolicies.isActive, 1)));
    const [policy] = await tx.insert(bestValuePolicies).values({ policyCode: BEST_VALUE_POLICY_CODE, name: policyName, version: nextVersion, isActive: 1, totalWeight: validation.totalWeight.toFixed(2), createdById: user.id }).returning();
    if (!policy) throw new Error("Best Value policy could not be saved.");
    await tx.insert(bestValuePolicyCriteria).values(BEST_VALUE_CRITERIA.map((criterion, index) => ({
      policyId: policy.id,
      criterionKey: criterion.criterionKey,
      label: criterion.label,
      description: criterion.description,
      weight: Number(input.criteria.find((item) => item.criterionKey === criterion.criterionKey)?.weight).toFixed(2),
      sortOrder: index + 1,
    })));
    return policy;
  });
  await writeAuditEvent({ entityType: "best_value_policy", entityId: created.id, action: "version_activated", performedById: user.id, performedByRole: normalizeProcurementRole(user.role), details: { policyCode: created.policyCode, version: created.version, totalWeight: validation.totalWeight, criteria: input.criteria } });
  return getBestValuePolicy();
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

export function getCatalogCodeFamily(productCode: string) {
  return productCode.match(/^\d{2}/)?.[0] ?? "Other";
}

export async function listProcurementCatalogItems(input?: { search?: string; codeFamily?: string; page?: number; limit?: number }, options?: { db?: ReturnType<typeof drizzle> }) {
  const db = options?.db ?? await requireDb();
  const search = input?.search?.trim().slice(0, 120) ?? "";
  const codeFamily = input?.codeFamily?.trim() || "";
  const page = Math.max(1, input?.page ?? 1);
  const limit = Math.min(100, Math.max(1, input?.limit ?? 30));
  const condition = search
    ? and(eq(procurementCatalogItems.isActive, 1), or(like(procurementCatalogItems.description, `%${search}%`), like(procurementCatalogItems.productCode, `%${search}%`)))
    : eq(procurementCatalogItems.isActive, 1);
  const records = await db.select().from(procurementCatalogItems).where(condition).orderBy(procurementCatalogItems.description);
  const categorizedRecords = codeFamily ? records.filter((record) => getCatalogCodeFamily(record.productCode) === codeFamily) : records;
  const start = (page - 1) * limit;
  return { items: categorizedRecords.slice(start, start + limit), total: categorizedRecords.length, page, limit };
}

export async function listProcurementCatalogCodeFamilies(options?: { db?: ReturnType<typeof drizzle> }) {
  const db = options?.db ?? await requireDb();
  const records = await db.select().from(procurementCatalogItems).where(eq(procurementCatalogItems.isActive, 1)).orderBy(procurementCatalogItems.productCode);
  const totals = records.reduce<Record<string, number>>((result, record) => {
    const family = getCatalogCodeFamily(record.productCode);
    result[family] = (result[family] ?? 0) + 1;
    return result;
  }, {});
  return Object.entries(totals).sort(([left], [right]) => left.localeCompare(right, undefined, { numeric: true })).map(([codeFamily, itemCount]) => ({ codeFamily, label: `Source code family ${codeFamily}`, itemCount }));
}

export async function listProcurementCatalogSavedItems(user: User, options?: { db?: ReturnType<typeof drizzle> }) {
  const db = options?.db ?? await requireDb();
  return db.select({
    catalogItemId: procurementCatalogSavedItems.catalogItemId,
    quantity: procurementCatalogSavedItems.quantity,
    productCode: procurementCatalogItems.productCode,
    description: procurementCatalogItems.description,
    unit: procurementCatalogItems.unit,
    referencePrice: procurementCatalogItems.referencePrice,
    remarks: procurementCatalogItems.remarks,
  }).from(procurementCatalogSavedItems).innerJoin(procurementCatalogItems, eq(procurementCatalogSavedItems.catalogItemId, procurementCatalogItems.id)).where(and(eq(procurementCatalogSavedItems.userId, user.id), eq(procurementCatalogItems.isActive, 1))).orderBy(procurementCatalogItems.description);
}

export async function replaceProcurementCatalogSavedItems(input: { items: Array<{ catalogItemId: number; quantity: number }> }, user: User, options?: { db?: ReturnType<typeof drizzle> }) {
  const db = options?.db ?? await requireDb();
  const items = Array.from(new Map(input.items.map((item) => [item.catalogItemId, item])).values());
  await assertActiveCatalogItemIds(items.map((item) => item.catalogItemId), db);
  await db.delete(procurementCatalogSavedItems).where(eq(procurementCatalogSavedItems.userId, user.id));
  if (items.length) await db.insert(procurementCatalogSavedItems).values(items.map((item) => ({ userId: user.id, catalogItemId: item.catalogItemId, quantity: item.quantity.toFixed(2) })));
  return listProcurementCatalogSavedItems(user, { db });
}

export async function clearProcurementCatalogSavedItems(user: User, options?: { db?: ReturnType<typeof drizzle> }) {
  const db = options?.db ?? await requireDb();
  await db.delete(procurementCatalogSavedItems).where(eq(procurementCatalogSavedItems.userId, user.id));
  return { cleared: true as const };
}

export async function listProcurementCatalogFavorites(user: User, options?: { db?: ReturnType<typeof drizzle> }) {
  const db = options?.db ?? await requireDb();
  const rows = await db.select().from(procurementCatalogFavorites).where(eq(procurementCatalogFavorites.userId, user.id));
  const catalogItemIds = rows.map((row) => row.catalogItemId);
  if (!catalogItemIds.length) return [];
  return db.select().from(procurementCatalogItems).where(and(inArray(procurementCatalogItems.id, catalogItemIds), eq(procurementCatalogItems.isActive, 1))).orderBy(procurementCatalogItems.description);
}

export async function setProcurementCatalogFavorite(input: { catalogItemId: number; isFavorite: boolean }, user: User, options?: { db?: ReturnType<typeof drizzle> }) {
  const db = options?.db ?? await requireDb();
  await assertActiveCatalogItemIds([input.catalogItemId], db);
  if (input.isFavorite) {
    await db.insert(procurementCatalogFavorites).values({ userId: user.id, catalogItemId: input.catalogItemId }).onConflictDoNothing();
  } else {
    await db.delete(procurementCatalogFavorites).where(and(eq(procurementCatalogFavorites.userId, user.id), eq(procurementCatalogFavorites.catalogItemId, input.catalogItemId)));
  }
  return { catalogItemId: input.catalogItemId, isFavorite: input.isFavorite };
}

export async function getProcurementCatalogItem(catalogItemId: number) {
  const db = await requireDb();
  const [item] = await db.select().from(procurementCatalogItems).where(and(eq(procurementCatalogItems.id, catalogItemId), eq(procurementCatalogItems.isActive, 1))).limit(1);
  return item ?? null;
}

async function assertActiveCatalogItemIds(catalogItemIds: Array<number | undefined>, db: ReturnType<typeof drizzle>) {
  const ids = Array.from(new Set(catalogItemIds.filter((catalogItemId): catalogItemId is number => typeof catalogItemId === "number")));
  if (!ids.length) return;
  const rows = await db.select({ id: procurementCatalogItems.id }).from(procurementCatalogItems).where(and(inArray(procurementCatalogItems.id, ids), eq(procurementCatalogItems.isActive, 1)));
  if (rows.length !== ids.length) throw new Error("Every selected catalog item must be active and valid.");
}

export function validateSupplierTagInput(name: string) {
  const trimmed = name.trim().replace(/\s+/g, " ");
  if (trimmed.length < 2 || trimmed.length > 120) return null;
  return trimmed;
}

export async function getSupplierTagData() {
  const db = await requireDb();
  const [tags, assignments] = await Promise.all([
    db.select().from(supplierTags).orderBy(supplierTags.name),
    db.select().from(supplierTagAssignments),
  ]);
  return { tags, assignments };
}

export async function createSupplierTag(input: { name: string; description?: string }, user: User) {
  const db = await requireDb();
  const name = validateSupplierTagInput(input.name);
  if (!name) throw new Error("Tag names must contain 2 to 120 characters.");
  await db.insert(supplierTags).values({ name, description: input.description?.trim() || null, createdById: user.id });
  const [tag] = await db.select().from(supplierTags).where(eq(supplierTags.name, name)).limit(1);
  if (!tag) throw new Error("Supplier tag could not be created.");
  await writeAuditEvent({ entityType: "supplier_tag", entityId: tag.id, action: "created", performedById: user.id, performedByRole: normalizeProcurementRole(user.role), details: { name } });
  return tag;
}

export async function setSupplierTags(input: { supplierId: number; tagIds: number[] }, user: User, options?: Pick<OperationalServiceOptions, "db" | "recordAudit">) {
  const db = options?.db ?? await requireDb();
  const recordAudit = options?.recordAudit ?? writeAuditEvent;
  const uniqueTagIds = Array.from(new Set(input.tagIds));
  const [supplier] = await db.select().from(suppliers).where(eq(suppliers.id, input.supplierId)).limit(1);
  if (!supplier) throw new Error("Supplier not found.");
  if (uniqueTagIds.length) {
    const tagRows = await db.select().from(supplierTags).where(and(inArray(supplierTags.id, uniqueTagIds), eq(supplierTags.isActive, 1)));
    if (tagRows.length !== uniqueTagIds.length) throw new Error("Every selected supplier tag must be active and valid.");
  }
  await db.delete(supplierTagAssignments).where(eq(supplierTagAssignments.supplierId, input.supplierId));
  if (uniqueTagIds.length) await db.insert(supplierTagAssignments).values(uniqueTagIds.map((supplierTagId) => ({ supplierId: input.supplierId, supplierTagId, assignedById: user.id })));
  await recordAudit({ entityType: "supplier", entityId: supplier.id, action: "tags_updated", performedById: user.id, performedByRole: normalizeProcurementRole(user.role), details: { tagIds: uniqueTagIds } });
  return { supplierId: supplier.id, tagIds: uniqueTagIds };
}

export function validateSupplierEvaluationScores(scores: number[]) {
  return scores.length === 4 && scores.every((score) => Number.isInteger(score) && score >= 1 && score <= 5);
}

export async function createSupplierEvaluation(input: { supplierId: number; purchaseOrderId?: number; qualityScore: number; deliveryScore: number; pricingScore: number; complianceScore: number; remarks?: string }, user: User) {
  const scores = [input.qualityScore, input.deliveryScore, input.pricingScore, input.complianceScore];
  if (!validateSupplierEvaluationScores(scores)) throw new Error("Each supplier evaluation score must be an integer from 1 to 5.");
  const db = await requireDb();
  await db.insert(supplierEvaluations).values({ ...input, purchaseOrderId: input.purchaseOrderId ?? null, remarks: input.remarks?.trim() || null, evaluatedById: user.id });
  const [created] = await db.select().from(supplierEvaluations).where(and(eq(supplierEvaluations.supplierId, input.supplierId), eq(supplierEvaluations.evaluatedById, user.id))).orderBy(desc(supplierEvaluations.id)).limit(1);
  if (!created) throw new Error("Supplier evaluation could not be saved.");
  await writeAuditEvent({ entityType: "supplier_evaluation", entityId: created.id, action: "created", performedById: user.id, performedByRole: normalizeProcurementRole(user.role), details: { supplierId: input.supplierId } });
  return created;
}

export async function updateSupplierEvaluation(input: { evaluationId: number; qualityScore: number; deliveryScore: number; pricingScore: number; complianceScore: number; remarks?: string }, user: User) {
  const scores = [input.qualityScore, input.deliveryScore, input.pricingScore, input.complianceScore];
  if (!validateSupplierEvaluationScores(scores)) throw new Error("Each supplier evaluation score must be an integer from 1 to 5.");
  const db = await requireDb();
  const [evaluation] = await db.select().from(supplierEvaluations).where(eq(supplierEvaluations.id, input.evaluationId)).limit(1);
  if (!evaluation) throw new Error("Supplier evaluation not found.");
  await db.update(supplierEvaluations).set({ qualityScore: input.qualityScore, deliveryScore: input.deliveryScore, pricingScore: input.pricingScore, complianceScore: input.complianceScore, remarks: input.remarks?.trim() || null }).where(eq(supplierEvaluations.id, evaluation.id));
  await writeAuditEvent({ entityType: "supplier_evaluation", entityId: evaluation.id, action: "updated", performedById: user.id, performedByRole: normalizeProcurementRole(user.role) });
}

export async function listSupplierEvaluations() { const db = await requireDb(); return db.select().from(supplierEvaluations).orderBy(desc(supplierEvaluations.evaluatedAt)); }

type SupplierEvaluationFormInput = {
  supplierId: number;
  purchaseOrderId: number;
  goodsServicesType?: string;
  supplierRegistryReference?: string;
  supplierRegistryRegisteredAt?: Date;
  supplierRegistryExpiresAt?: Date;
  reportedPurchaseRequestNumber?: string;
  urgentPurchaseRequestReason?: string;
  responseScores: Record<string, number>;
  remarks?: string;
  respondentName?: string;
};

async function getVerifiedEvaluationOrder(input: SupplierEvaluationFormInput, user: User, audience: SupplierEvaluationAudience) {
  const db = await requireDb();
  const [order] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, input.purchaseOrderId)).limit(1);
  if (!order || order.supplierId !== input.supplierId) throw new Error("Select a valid Purchase Order for the selected supplier.");
  const [request] = await db.select().from(purchaseRequests).where(eq(purchaseRequests.id, order.purchaseRequestId)).limit(1);
  if (!request) throw new Error("The selected Purchase Order has no linked Purchase Request.");
  if (audience === "end_user" && request.requestedById !== user.id) throw new Error("End-Users may submit supplier feedback only for Purchase Orders linked to their own Purchase Requests.");
  return { order, request };
}

export async function createSupplierEvaluationForm(input: SupplierEvaluationFormInput, audience: SupplierEvaluationAudience, user: User) {
  const responseError = validateSupplierEvaluationResponses(audience, input.responseScores);
  if (responseError) throw new Error(responseError);
  const { order, request } = await getVerifiedEvaluationOrder(input, user, audience);
  const db = await requireDb();
  const summary = deriveSupplierEvaluationSummary(audience, input.responseScores);
  const reportedPurchaseRequestNumber = audience === "procurement_office" ? input.reportedPurchaseRequestNumber?.trim() || request.prNumber : request.prNumber;
  const urgentPurchaseRequestReference = audience === "procurement_office" && reportedPurchaseRequestNumber !== request.prNumber;
  if (urgentPurchaseRequestReference && !input.urgentPurchaseRequestReason?.trim()) throw new Error("Provide the urgent Purchase Request reference reason before submitting the form.");
  const [created] = await db.insert(supplierEvaluations).values({
    supplierId: input.supplierId,
    purchaseOrderId: order.id,
    purchaseRequestId: request.id,
    reportedPurchaseRequestNumber,
    urgentPurchaseRequestReason: urgentPurchaseRequestReference ? input.urgentPurchaseRequestReason?.trim() || null : null,
    urgentPurchaseRequestUpdatedById: urgentPurchaseRequestReference ? user.id : null,
    urgentPurchaseRequestUpdatedAt: urgentPurchaseRequestReference ? new Date() : null,
    officeId: request.officeId,
    evaluationAudience: audience,
    goodsServicesType: audience === "end_user" ? input.goodsServicesType?.trim() || null : null,
    supplierRegistryReference: audience === "procurement_office" ? input.supplierRegistryReference?.trim() || null : null,
    supplierRegistryRegisteredAt: audience === "procurement_office" ? input.supplierRegistryRegisteredAt ?? null : null,
    supplierRegistryExpiresAt: audience === "procurement_office" ? input.supplierRegistryExpiresAt ?? null : null,
    responseScores: input.responseScores,
    ...summary,
    remarks: input.remarks?.trim() || null,
    respondentName: input.respondentName?.trim() || user.name || null,
    respondentSignedAt: new Date(),
    evaluatedById: user.id,
  }).returning();
  if (!created) throw new Error("Supplier Evaluation Form could not be saved.");
  await writeAuditEvent({ entityType: "supplier_evaluation", entityId: created.id, action: `${audience}_form_submitted`, performedById: user.id, performedByRole: normalizeProcurementRole(user.role), details: { supplierId: input.supplierId, purchaseOrderId: order.id, criterionCount: Object.keys(input.responseScores).length, originalPurchaseRequestNumber: request.prNumber, reportedPurchaseRequestNumber, urgentPurchaseRequestReference } });
  return created;
}

export async function listPendingSupplierEvaluationApprovals() {
  const db = await requireDb();
  const evaluations = await db.select().from(supplierEvaluations).orderBy(desc(supplierEvaluations.evaluatedAt));
  if (!evaluations.length) return [];
  const approvals = await db.select().from(supplierEvaluationApprovals);
  const approvedEvaluationIds = new Set(approvals.map((approval) => approval.supplierEvaluationId));
  const pending = evaluations.filter((evaluation) => !approvedEvaluationIds.has(evaluation.id));
  if (!pending.length) return [];
  const supplierRows = await db.select().from(suppliers).where(inArray(suppliers.id, Array.from(new Set(pending.map((evaluation) => evaluation.supplierId)))));
  const orderRows = await db.select().from(purchaseOrders).where(inArray(purchaseOrders.id, Array.from(new Set(pending.map((evaluation) => evaluation.purchaseOrderId).filter((id): id is number => Boolean(id))))));
  return pending.map((evaluation) => ({ evaluation, supplier: supplierRows.find((supplier) => supplier.id === evaluation.supplierId) ?? null, purchaseOrder: orderRows.find((order) => order.id === evaluation.purchaseOrderId) ?? null }));
}

export async function signSupplierEvaluation(input: { supplierEvaluationId: number; approverDesignation: string }, user: User) {
  const db = await requireDb();
  const [evaluation] = await db.select().from(supplierEvaluations).where(eq(supplierEvaluations.id, input.supplierEvaluationId)).limit(1);
  if (!evaluation) throw new Error("Supplier Evaluation Form not found.");
  const [existing] = await db.select().from(supplierEvaluationApprovals).where(eq(supplierEvaluationApprovals.supplierEvaluationId, evaluation.id)).limit(1);
  if (existing) throw new Error("This Supplier Evaluation Form has already been electronically approved.");
  const approvedAt = new Date();
  const consentStatement = "I confirm that I am the authorized approver and electronically approve this completed Supplier Evaluation Form.";
  const approverName = user.name?.trim() || user.email || `User #${user.id}`;
  const signatureDigest = createHash("sha256").update(JSON.stringify({ supplierEvaluationId: evaluation.id, evaluatedAt: evaluation.evaluatedAt.toISOString(), respondentName: evaluation.respondentName, responseScores: evaluation.responseScores, approverId: user.id, approverName, approverDesignation: input.approverDesignation.trim(), consentStatement, approvedAt: approvedAt.toISOString() })).digest("hex");
  const [approval] = await db.insert(supplierEvaluationApprovals).values({ supplierEvaluationId: evaluation.id, approvedById: user.id, approverName, approverDesignation: input.approverDesignation.trim(), consentStatement, signatureDigest, approvedAt }).returning();
  if (!approval) throw new Error("Electronic approval could not be recorded.");
  await writeAuditEvent({ entityType: "supplier_evaluation", entityId: evaluation.id, action: "electronically_approved", performedById: user.id, performedByRole: normalizeProcurementRole(user.role), details: { approvalId: approval.id, approverName, approverDesignation: approval.approverDesignation, signatureDigest } });
  return { evaluation, approval };
}

export async function listSupplierEvaluationsForEndUser(user: User) {
  const db = await requireDb();
  return db.select().from(supplierEvaluations).where(and(eq(supplierEvaluations.evaluatedById, user.id), eq(supplierEvaluations.evaluationAudience, "end_user"))).orderBy(desc(supplierEvaluations.evaluatedAt));
}

export async function listEligibleSupplierEvaluationOrders(user: User) {
  const db = await requireDb();
  const requests = await db.select().from(purchaseRequests).where(eq(purchaseRequests.requestedById, user.id));
  if (!requests.length) return [];
  const requestIds = requests.map((request) => request.id);
  const orders = await db.select().from(purchaseOrders).where(inArray(purchaseOrders.purchaseRequestId, requestIds)).orderBy(desc(purchaseOrders.createdAt));
  return orders.map((order) => ({ order, request: requests.find((request) => request.id === order.purchaseRequestId) ?? null }));
}

export async function createLetterOfNotice(input: { noticeType: "award" | "disqualification" | "clarification" | "other"; purchaseRequestId?: number; supplierId?: number; subject: string; body: string; issueNow?: boolean }, user: User) {
  const db = await requireDb();
  const noticeNumber = `LON-${new Date().getFullYear()}-${Date.now().toString().slice(-7)}`;
  const status = input.issueNow ? "issued" : "draft" as const;
  await db.insert(lettersOfNotice).values({ noticeNumber, noticeType: input.noticeType, purchaseRequestId: input.purchaseRequestId ?? null, supplierId: input.supplierId ?? null, subject: input.subject.trim(), body: input.body.trim(), status, issuedById: user.id, issuedAt: input.issueNow ? new Date() : null });
  const [notice] = await db.select().from(lettersOfNotice).where(eq(lettersOfNotice.noticeNumber, noticeNumber)).limit(1);
  if (!notice) throw new Error("Letter of Notice could not be saved.");
  await writeAuditEvent({ entityType: "letter_of_notice", entityId: notice.id, action: input.issueNow ? "issued" : "created", performedById: user.id, performedByRole: normalizeProcurementRole(user.role), details: { noticeNumber } });
  return notice;
}

export async function listLettersOfNotice() { const db = await requireDb(); return db.select().from(lettersOfNotice).orderBy(desc(lettersOfNotice.createdAt)); }

export async function createBacTransmittal(input: { purchaseRequestId?: number; fromOffice: string; toOffice: string; subject: string; remarks?: string; sendNow?: boolean }, user: User) {
  const db = await requireDb();
  const transmittalNumber = `BAC-T-${new Date().getFullYear()}-${Date.now().toString().slice(-7)}`;
  const status = input.sendNow ? "sent" : "draft" as const;
  await db.insert(bacTransmittals).values({ transmittalNumber, purchaseRequestId: input.purchaseRequestId ?? null, fromOffice: input.fromOffice.trim(), toOffice: input.toOffice.trim(), subject: input.subject.trim(), remarks: input.remarks?.trim() || null, status, preparedById: user.id, sentAt: input.sendNow ? new Date() : null });
  const [transmittal] = await db.select().from(bacTransmittals).where(eq(bacTransmittals.transmittalNumber, transmittalNumber)).limit(1);
  if (!transmittal) throw new Error("BAC Transmittal could not be saved.");
  await writeAuditEvent({ entityType: "bac_transmittal", entityId: transmittal.id, action: input.sendNow ? "sent" : "created", performedById: user.id, performedByRole: normalizeProcurementRole(user.role), details: { transmittalNumber } });
  return transmittal;
}

export async function acknowledgeBacTransmittal(input: { transmittalId: number; acknowledgedByName: string }, user: User) {
  const db = await requireDb();
  const [transmittal] = await db.select().from(bacTransmittals).where(eq(bacTransmittals.id, input.transmittalId)).limit(1);
  if (!transmittal || transmittal.status !== "sent") throw new Error("Only a sent BAC Transmittal can be acknowledged.");
  await db.update(bacTransmittals).set({ status: "acknowledged", acknowledgedByName: input.acknowledgedByName.trim(), acknowledgedAt: new Date() }).where(eq(bacTransmittals.id, input.transmittalId));
  await writeAuditEvent({ entityType: "bac_transmittal", entityId: input.transmittalId, action: "acknowledged", performedById: user.id, performedByRole: normalizeProcurementRole(user.role) });
}

export async function listBacTransmittals() { const db = await requireDb(); return db.select().from(bacTransmittals).orderBy(desc(bacTransmittals.createdAt)); }

export async function createAppPpmpEntry(input: { fiscalYear: number; officeId: number; objectOfExpenditureId: number; catalogItemId?: number; description: string; plannedAmount: number; papCode?: string; projectTitle?: string; modeOfProcurement?: string; fundSource?: string; procurementSchedule?: string; remarks?: string }, user: User) {
  const db = await requireDb();
  await assertActiveCatalogItemIds([input.catalogItemId], db);
  await db.insert(appPpmpEntries).values({ ...input, catalogItemId: input.catalogItemId ?? null, papCode: input.papCode || null, projectTitle: input.projectTitle || null, modeOfProcurement: input.modeOfProcurement || "Small Value Procurement", fundSource: input.fundSource || null, procurementSchedule: input.procurementSchedule || null, remarks: input.remarks || null, plannedAmount: input.plannedAmount.toFixed(2), preparedById: user.id });
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

async function getDocumentEntityRequesterId(entityType: DocumentEntityType, entityId: number, db: ReturnType<typeof drizzle>) {
  if (entityType === "app_ppmp_entry") {
    const [entry] = await db.select().from(appPpmpEntries).where(eq(appPpmpEntries.id, entityId)).limit(1);
    return entry?.preparedById ?? null;
  }
  let purchaseRequestId: number | null = null;
  if (entityType === "purchase_request") purchaseRequestId = entityId;
  if (entityType === "pre_canvass") {
    const [record] = await db.select().from(preCanvasses).where(eq(preCanvasses.id, entityId)).limit(1);
    purchaseRequestId = record?.purchaseRequestId ?? null;
  }
  if (entityType === "pre_canvass_quote") {
    const [quote] = await db.select().from(preCanvassQuotes).where(eq(preCanvassQuotes.id, entityId)).limit(1);
    if (quote) {
      const [record] = await db.select().from(preCanvasses).where(eq(preCanvasses.id, quote.preCanvassId)).limit(1);
      purchaseRequestId = record?.purchaseRequestId ?? null;
    }
  }
  if (entityType === "abstract_of_canvass") {
    const [abstract] = await db.select().from(abstractsOfCanvass).where(eq(abstractsOfCanvass.id, entityId)).limit(1);
    if (abstract) {
      const [record] = await db.select().from(preCanvasses).where(eq(preCanvasses.id, abstract.preCanvassId)).limit(1);
      purchaseRequestId = record?.purchaseRequestId ?? null;
    }
  }
  if (["purchase_order", "delivery_receipt", "pmr_log"].includes(entityType)) {
    let purchaseOrderId: number | null = entityType === "purchase_order" ? entityId : null;
    if (entityType === "delivery_receipt") {
      const [receipt] = await db.select().from(deliveryReceipts).where(eq(deliveryReceipts.id, entityId)).limit(1);
      purchaseOrderId = receipt?.purchaseOrderId ?? null;
    }
    if (entityType === "pmr_log") {
      const [pmr] = await db.select().from(pmrLogs).where(eq(pmrLogs.id, entityId)).limit(1);
      purchaseOrderId = pmr?.purchaseOrderId ?? null;
    }
    if (purchaseOrderId) {
      const [order] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, purchaseOrderId)).limit(1);
      purchaseRequestId = order?.purchaseRequestId ?? null;
    }
  }
  if (!purchaseRequestId) return null;
  const [request] = await db.select().from(purchaseRequests).where(eq(purchaseRequests.id, purchaseRequestId)).limit(1);
  return request?.requestedById ?? null;
}

async function assertDocumentAccess(entityType: DocumentEntityType, entityId: number, user: User, db: ReturnType<typeof drizzle>) {
  const requesterId = await getDocumentEntityRequesterId(entityType, entityId, db);
  if (!requesterId) throw new Error("The procurement record selected for this document could not be found.");
  if (normalizeProcurementRole(user.role) === "end_user" && requesterId !== user.id) throw new Error("End-Users may upload documents only to their own procurement records.");
  return requesterId;
}

export async function createWorkflowNotification(input: { recipientUserId: number; kind: WorkflowNotificationKind; title: string; body: string; entityType: string; entityId: number }) {
  const db = await requireDb();
  await db.insert(workflowNotifications).values(input);
}

export async function notifyRoles(roles: ProcurementRole[], input: Omit<Parameters<typeof createWorkflowNotification>[0], "recipientUserId">) {
  const db = await requireDb();
  const people = await db.select().from(users);
  const recipientIds = Array.from(new Set(people.filter((person) => roleCanAct(normalizeProcurementRole(person.role), roles)).map((person) => person.id)));
  await Promise.all(recipientIds.map((recipientUserId) => createWorkflowNotification({ ...input, recipientUserId })));
}

export async function createProcurementDocument(input: { entityType: DocumentEntityType; entityId: number; documentType: string; originalFileName: string; mimeType: string; dataBase64: string }, user: User, options?: OperationalServiceOptions) {
  const data = Buffer.from(input.dataBase64, "base64");
  const validationError = validateProcurementDocumentUpload(input.mimeType, data.length);
  if (validationError) throw new Error(validationError);
  const db = options?.db ?? await requireDb();
  const recordAudit = options?.recordAudit ?? writeAuditEvent;
  const putDocument = options?.putDocument ?? storagePut;
  const notifyUser = options?.notifyUser ?? createWorkflowNotification;
  const requesterId = await assertDocumentAccess(input.entityType, input.entityId, user, db);
  const safeName = input.originalFileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 180) || "procurement-document";
  const { key, url } = await putDocument(`procurewise/${input.entityType}/${input.entityId}/${Date.now()}_${safeName}`, data, input.mimeType);
  await db.insert(procurementDocuments).values({ entityType: input.entityType, entityId: input.entityId, documentType: input.documentType.trim() || "Supporting document", originalFileName: safeName, mimeType: input.mimeType, storageKey: key, storageUrl: url, fileSize: data.length, uploadedById: user.id });
  const [document] = await db.select().from(procurementDocuments).where(eq(procurementDocuments.storageKey, key)).limit(1);
  if (!document) throw new Error("The document record could not be saved.");
  await recordAudit({ entityType: input.entityType, entityId: input.entityId, action: "document_attached", performedById: user.id, performedByRole: normalizeProcurementRole(user.role), details: { documentType: document.documentType, fileName: safeName } });
  if (requesterId !== user.id) await notifyUser({ recipientUserId: requesterId, kind: "document", title: "A procurement document was attached", body: `${document.documentType}: ${safeName}`, entityType: input.entityType, entityId: input.entityId });
  return document;
}

export async function listProcurementDocuments(user: User) {
  const db = await requireDb();
  const documents = await db.select().from(procurementDocuments);
  if (normalizeProcurementRole(user.role) !== "end_user") return documents;
  const visible = await Promise.all(documents.map(async (document) => ({ document, requesterId: await getDocumentEntityRequesterId(document.entityType as DocumentEntityType, document.entityId, db) })));
  return visible.filter(({ requesterId }) => requesterId === user.id).map(({ document }) => document);
}

export async function listWorkflowCorrections(user: User) {
  const db = await requireDb();
  return normalizeProcurementRole(user.role) === "end_user"
    ? db.select().from(workflowCorrections).where(eq(workflowCorrections.assignedToId, user.id))
    : db.select().from(workflowCorrections);
}

export async function listWorkflowNotifications(user: User) {
  const db = await requireDb();
  return db.select().from(workflowNotifications).where(eq(workflowNotifications.recipientUserId, user.id));
}

export async function markWorkflowNotificationRead(notificationId: number, user: User, options?: OperationalServiceOptions) {
  const db = options?.db ?? await requireDb();
  const [notification] = await db.select().from(workflowNotifications).where(eq(workflowNotifications.id, notificationId)).limit(1);
  if (!notification || notification.recipientUserId !== user.id) throw new Error("Notification not found.");
  if (!notification.readAt) await db.update(workflowNotifications).set({ readAt: new Date() }).where(eq(workflowNotifications.id, notificationId));
}

export async function requestPreCanvassCorrection(input: { preCanvassId: number; reason: string }, user: User, options?: OperationalServiceOptions) {
  const db = options?.db ?? await requireDb();
  const recordAudit = options?.recordAudit ?? writeAuditEvent;
  const notifyUser = options?.notifyUser ?? createWorkflowNotification;
  const [preCanvass] = await db.select().from(preCanvasses).where(eq(preCanvasses.id, input.preCanvassId)).limit(1);
  if (!preCanvass || preCanvass.status !== "submitted") throw new Error("Only a submitted Pre-Canvass package can be returned for correction.");
  const [purchaseRequest] = await db.select().from(purchaseRequests).where(eq(purchaseRequests.id, preCanvass.purchaseRequestId)).limit(1);
  if (!purchaseRequest) throw new Error("The linked Purchase Request could not be found.");
  await db.update(preCanvasses).set({ status: "draft" }).where(eq(preCanvasses.id, preCanvass.id));
  if (purchaseRequest.status === "procurement_review") await db.update(purchaseRequests).set({ status: "draft" }).where(eq(purchaseRequests.id, purchaseRequest.id));
  await db.insert(workflowCorrections).values({ entityType: "pre_canvass", entityId: preCanvass.id, requestedById: user.id, assignedToId: purchaseRequest.requestedById, reason: input.reason.trim() });
  const [correction] = await db.select().from(workflowCorrections).where(and(eq(workflowCorrections.entityType, "pre_canvass"), eq(workflowCorrections.entityId, preCanvass.id), eq(workflowCorrections.assignedToId, purchaseRequest.requestedById), eq(workflowCorrections.status, "open"))).limit(1);
  await recordAudit({ entityType: "pre_canvass", entityId: preCanvass.id, action: "returned_for_correction", performedById: user.id, performedByRole: normalizeProcurementRole(user.role), details: { reason: input.reason.trim() } });
  await notifyUser({ recipientUserId: purchaseRequest.requestedById, kind: "correction", title: "Pre-Canvass returned for correction", body: input.reason.trim(), entityType: "pre_canvass", entityId: preCanvass.id });
  return correction;
}

export async function recordPreCanvassResubmission(preCanvassId: number, user: User, options?: OperationalServiceOptions) {
  const db = options?.db ?? await requireDb();
  const notifyRoleGroup = options?.notifyRoleGroup ?? notifyRoles;
  const openCorrections = await db.select().from(workflowCorrections).where(and(eq(workflowCorrections.entityType, "pre_canvass"), eq(workflowCorrections.entityId, preCanvassId), eq(workflowCorrections.assignedToId, user.id), eq(workflowCorrections.status, "open")));
  if (openCorrections.length) {
    await db.update(workflowCorrections).set({ status: "resubmitted", resolvedAt: new Date() }).where(and(eq(workflowCorrections.entityType, "pre_canvass"), eq(workflowCorrections.entityId, preCanvassId), eq(workflowCorrections.assignedToId, user.id), eq(workflowCorrections.status, "open")));
  }
  await notifyRoleGroup(["procurement_officer"], { kind: "action_required", ...describePreCanvassHandoff(openCorrections.length > 0), entityType: "pre_canvass", entityId: preCanvassId });
}

export async function requestAbstractCorrection(input: { preCanvassId: number; reason: string }, user: User, options?: OperationalServiceOptions) {
  const db = options?.db ?? await requireDb();
  const recordAudit = options?.recordAudit ?? writeAuditEvent;
  const notifyUser = options?.notifyUser ?? createWorkflowNotification;
  const [abstract] = await db.select().from(abstractsOfCanvass).where(eq(abstractsOfCanvass.preCanvassId, input.preCanvassId)).limit(1);
  if (!abstract || abstract.status !== "recommended") throw new Error("Only an Abstract awaiting an administrative decision can be returned for correction.");
  await db.update(abstractsOfCanvass).set({ status: "returned", decidedById: user.id, decisionRemarks: input.reason.trim() }).where(eq(abstractsOfCanvass.id, abstract.id));
  await db.insert(workflowCorrections).values({ entityType: "abstract_of_canvass", entityId: abstract.id, requestedById: user.id, assignedToId: abstract.preparedById, reason: input.reason.trim() });
  const [correction] = await db.select().from(workflowCorrections).where(and(eq(workflowCorrections.entityType, "abstract_of_canvass"), eq(workflowCorrections.entityId, abstract.id), eq(workflowCorrections.assignedToId, abstract.preparedById), eq(workflowCorrections.status, "open"))).limit(1);
  await recordAudit({ entityType: "abstract_of_canvass", entityId: abstract.id, action: "returned_for_correction", performedById: user.id, performedByRole: normalizeProcurementRole(user.role), details: { reason: input.reason.trim() } });
  await notifyUser({ recipientUserId: abstract.preparedById, kind: "correction", title: "Abstract returned for correction", body: input.reason.trim(), entityType: "abstract_of_canvass", entityId: abstract.id });
  return correction;
}

export async function resubmitAbstract(preCanvassId: number, user: User, options?: OperationalServiceOptions) {
  const db = options?.db ?? await requireDb();
  const notifyRoleGroup = options?.notifyRoleGroup ?? notifyRoles;
  const [abstract] = await db.select().from(abstractsOfCanvass).where(eq(abstractsOfCanvass.preCanvassId, preCanvassId)).limit(1);
  if (!abstract || abstract.status !== "returned" || abstract.preparedById !== user.id) throw new Error("Only the assigned Procurement Officer may resubmit this returned Abstract.");
  await db.update(abstractsOfCanvass).set({ status: "recommended", decidedById: null, decisionRemarks: null }).where(eq(abstractsOfCanvass.id, abstract.id));
  await db.update(workflowCorrections).set({ status: "resubmitted", resolvedAt: new Date() }).where(and(eq(workflowCorrections.entityType, "abstract_of_canvass"), eq(workflowCorrections.entityId, abstract.id), eq(workflowCorrections.assignedToId, user.id), eq(workflowCorrections.status, "open")));
  await notifyRoleGroup(["administrative_approver"], { kind: "action_required", title: "Abstract resubmitted", body: "A corrected Abstract of Canvass is ready for a new administrative decision.", entityType: "abstract_of_canvass", entityId: abstract.id });
}

export async function requestPurchaseOrderCorrection(input: { purchaseOrderId: number; reason: string }, user: User, options?: OperationalServiceOptions) {
  const db = options?.db ?? await requireDb();
  const recordAudit = options?.recordAudit ?? writeAuditEvent;
  const notifyUser = options?.notifyUser ?? createWorkflowNotification;
  const [purchaseOrder] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, input.purchaseOrderId)).limit(1);
  if (!purchaseOrder || purchaseOrder.status !== "issued") throw new Error("Only an issued Purchase Order can be returned for correction before delivery is recorded.");
  await db.update(purchaseOrders).set({ status: "returned" }).where(eq(purchaseOrders.id, purchaseOrder.id));
  await db.insert(workflowCorrections).values({ entityType: "purchase_order", entityId: purchaseOrder.id, requestedById: user.id, assignedToId: purchaseOrder.generatedById, reason: input.reason.trim() });
  const [correction] = await db.select().from(workflowCorrections).where(and(eq(workflowCorrections.entityType, "purchase_order"), eq(workflowCorrections.entityId, purchaseOrder.id), eq(workflowCorrections.assignedToId, purchaseOrder.generatedById), eq(workflowCorrections.status, "open"))).limit(1);
  await recordAudit({ entityType: "purchase_order", entityId: purchaseOrder.id, action: "returned_for_correction", performedById: user.id, performedByRole: normalizeProcurementRole(user.role), details: { reason: input.reason.trim() } });
  await notifyUser({ recipientUserId: purchaseOrder.generatedById, kind: "correction", title: "Purchase Order returned for correction", body: input.reason.trim(), entityType: "purchase_order", entityId: purchaseOrder.id });
  return correction;
}

export async function resubmitPurchaseOrder(purchaseOrderId: number, user: User, options?: OperationalServiceOptions) {
  const db = options?.db ?? await requireDb();
  const notifyRoleGroup = options?.notifyRoleGroup ?? notifyRoles;
  const [purchaseOrder] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, purchaseOrderId)).limit(1);
  if (!purchaseOrder || purchaseOrder.status !== "returned" || purchaseOrder.generatedById !== user.id) throw new Error("Only the issuing Procurement Officer may reissue this returned Purchase Order.");
  await db.update(purchaseOrders).set({ status: "issued" }).where(eq(purchaseOrders.id, purchaseOrder.id));
  await db.update(workflowCorrections).set({ status: "resubmitted", resolvedAt: new Date() }).where(and(eq(workflowCorrections.entityType, "purchase_order"), eq(workflowCorrections.entityId, purchaseOrder.id), eq(workflowCorrections.assignedToId, user.id), eq(workflowCorrections.status, "open")));
  await notifyRoleGroup(["administrative_approver"], { kind: "status_change", title: "Purchase Order reissued", body: "A corrected Purchase Order has been reissued and is ready for monitored delivery.", entityType: "purchase_order", entityId: purchaseOrder.id });
}

export async function listPurchaseRequests(user: User) {
  const db = await requireDb();
  const records = normalizeProcurementRole(user.role) === "end_user"
    ? db.select().from(purchaseRequests).where(eq(purchaseRequests.requestedById, user.id))
    : db.select().from(purchaseRequests);
  const archivedPpmpEntryIds = new Set((await db.select().from(testRecordArchives).where(isNull(testRecordArchives.cleanedAt))).map((archive) => archive.ppmpEntryId));
  return (await records).filter((record) => !record.ppmpEntryId || !archivedPpmpEntryIds.has(record.ppmpEntryId));
}

export async function getPurchaseRequestDetail(purchaseRequestId: number, user: User) {
  const db = await requireDb();
  const [purchaseRequest] = await db.select().from(purchaseRequests).where(eq(purchaseRequests.id, purchaseRequestId)).limit(1);
  if (!purchaseRequest) throw new Error("Purchase Request not found.");
  if (normalizeProcurementRole(user.role) === "end_user" && purchaseRequest.requestedById !== user.id) throw new Error("End-Users may access only their own Purchase Requests.");
  const items = await db.select().from(purchaseRequestItems).where(eq(purchaseRequestItems.purchaseRequestId, purchaseRequestId));
  return { purchaseRequest, items };
}

export async function createPurchaseRequest(input: { purpose: string; fundSource?: string; fundCluster?: string; responsibilityCenterCode?: string; requesterDesignation?: string; requestedSignatoryId?: number; approvedSignatoryId?: number; ppmpEntryId?: number; officeId: number; objectOfExpenditureId: number; items: Array<{ catalogItemId?: number; stockPropertyNo?: string; description: string; specification?: string; quantity: number; unit: string; estimatedUnitCost: number }> }, user: User, options?: Pick<OperationalServiceOptions, "db" | "recordAudit">) {
  const db = options?.db ?? await requireDb();
  const recordAudit = options?.recordAudit ?? writeAuditEvent;
  const totalEstimate = input.items.reduce((sum, item) => sum + item.quantity * item.estimatedUnitCost, 0);
  if (totalEstimate <= 0) throw new Error("A Purchase Request must contain at least one item with a positive estimated cost.");
  await assertActiveCatalogItemIds(input.items.map((item) => item.catalogItemId), db);
  const [requestedRows, approvedRows] = await Promise.all([
    input.requestedSignatoryId ? db.select().from(procurementSignatories).where(eq(procurementSignatories.id, input.requestedSignatoryId)).limit(1) : Promise.resolve([]),
    input.approvedSignatoryId ? db.select().from(procurementSignatories).where(eq(procurementSignatories.id, input.approvedSignatoryId)).limit(1) : Promise.resolve([]),
  ]);
  const requestedSignatory = requestedRows[0];
  const approvedSignatory = approvedRows[0];
  if (input.requestedSignatoryId && (!requestedSignatory || !requestedSignatory.isActive || !requestedSignatory.mayRequest)) throw new Error("Select an active signatory authorized to request Purchase Requests.");
  if (input.approvedSignatoryId && (!approvedSignatory || !approvedSignatory.isActive || !approvedSignatory.mayApprove)) throw new Error("Select an active signatory authorized to approve Purchase Requests.");
  const prNumber = `PR-${new Date().getFullYear()}-${Date.now().toString().slice(-7)}`;
  const trackingToken = randomUUID().replaceAll("-", "");
  await db.insert(purchaseRequests).values({
    prNumber,
    purpose: input.purpose,
    fundSource: input.fundSource || null,
    fundCluster: input.fundCluster || "01101101",
    responsibilityCenterCode: input.responsibilityCenterCode || null,
    requesterDesignation: input.requesterDesignation || null,
    requestedSignatoryId: requestedSignatory?.id ?? null,
    requestedSignatoryName: requestedSignatory?.fullName ?? null,
    approvedSignatoryId: approvedSignatory?.id ?? null,
    approvedSignatoryName: approvedSignatory?.fullName ?? null,
    approvedSignatoryDesignation: approvedSignatory?.designation ?? null,
    officeId: input.officeId,
    objectOfExpenditureId: input.objectOfExpenditureId,
    totalEstimate: totalEstimate.toFixed(2),
    requestedById: user.id,
    trackingToken,
    ppmpEntryId: input.ppmpEntryId ?? null,
  });
  const [created] = await db.select().from(purchaseRequests).where(eq(purchaseRequests.prNumber, prNumber)).limit(1);
  if (!created) throw new Error("The Purchase Request could not be created.");
  await db.insert(purchaseRequestItems).values(input.items.map((item) => ({
    purchaseRequestId: created.id,
    catalogItemId: item.catalogItemId ?? null,
    stockPropertyNo: item.stockPropertyNo || null,
    description: item.description,
    specification: item.specification || null,
    quantity: item.quantity.toFixed(2),
    unit: item.unit,
    estimatedUnitCost: item.estimatedUnitCost.toFixed(2),
    totalCost: (item.quantity * item.estimatedUnitCost).toFixed(2),
  })));
  await recordAudit({ entityType: "purchase_request", entityId: created.id, action: "created", performedById: user.id, performedByRole: normalizeProcurementRole(user.role), details: { prNumber, requestedSignatoryId: requestedSignatory?.id ?? null, approvedSignatoryId: approvedSignatory?.id ?? null } });
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
  const [settings] = await db.select().from(procurementSettings).where(sql`1 = 1`).limit(1);
  const poNumber = `PO-${new Date().getFullYear()}-${Date.now().toString().slice(-7)}`;
  const scheduledDeliveryDate = preCanvass.deliveryPeriodDays ? new Date(Date.now() + preCanvass.deliveryPeriodDays * 86_400_000) : null;
  await db.insert(purchaseOrders).values({ poNumber, purchaseRequestId: pr.id, preCanvassId, supplierId: quote.supplierId, totalAmount: quote.totalPrice, placeOfDelivery: settings?.entityName || "Batanes State College", scheduledDeliveryDate, deliveryTerm: "FOB Destination", paymentTerm: "15 days upon complete delivery", modeOfProcurement: "Small Value Procurement", fundCluster: pr.fundCluster, fundsAvailable: pr.totalEstimate, authorizedOfficialName: settings?.authorizedOfficialName || null, authorizedOfficialDesignation: settings?.authorizedOfficialDesignation || null, chiefAccountantName: settings?.chiefAccountantName || null, generatedById: user.id, status: "issued" });
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

export async function createMcdmRecommendation(preCanvassId: number, user: User) {
  const db = await requireDb();
  const [preCanvass] = await db.select().from(preCanvasses).where(eq(preCanvasses.id, preCanvassId)).limit(1);
  if (!preCanvass || !["submitted", "abstracted"].includes(preCanvass.status)) throw new Error("A submitted or abstracted Pre-Canvass is required for MCDM recommendation.");
  const quotes = await db.select().from(preCanvassQuotes).where(eq(preCanvassQuotes.preCanvassId, preCanvassId));
  if (!hasRequiredSupplierQuotations(quotes.length)) throw new Error("Three supplier quotations are required for MCDM recommendation.");
  const scored = calculateMcdmScores(quotes);
  if (!scored.length) throw new Error("At least one compliant supplier quotation is required for MCDM recommendation.");
  const top = scored[0];
  const rationale = "MCDM recommendation based on 60% price, 20% delivery, and 20% compliance. Selected the highest-scoring compliant quotation.";
  const [existing] = await db.select().from(mcdmRecommendations).where(eq(mcdmRecommendations.preCanvassId, preCanvassId)).limit(1);
  const values = { recommendedSupplierId: top.quote.supplierId, priceScore: top.priceScore.toFixed(2), deliveryScore: top.deliveryScore.toFixed(2), complianceScore: "20.00", totalScore: top.totalScore.toFixed(2), rationale, createdById: user.id };
  if (existing) await db.update(mcdmRecommendations).set(values).where(eq(mcdmRecommendations.id, existing.id)); else await db.insert(mcdmRecommendations).values({ preCanvassId, ...values });
  const [recommendation] = await db.select().from(mcdmRecommendations).where(eq(mcdmRecommendations.preCanvassId, preCanvassId)).limit(1);
  if (!recommendation) throw new Error("MCDM recommendation could not be saved.");
  await writeAuditEvent({ entityType: "mcdm_recommendation", entityId: recommendation.id, action: "calculated", performedById: user.id, performedByRole: normalizeProcurementRole(user.role), details: { preCanvassId, recommendedSupplierId: recommendation.recommendedSupplierId, totalScore: recommendation.totalScore } });
  return recommendation;
}

export async function createRfqFromPreCanvass(preCanvassId: number, user: User) {
  const db = await requireDb();
  const [preCanvass] = await db.select().from(preCanvasses).where(eq(preCanvasses.id, preCanvassId)).limit(1);
  if (!preCanvass || preCanvass.status !== "abstracted") throw new Error("Generate an Abstract of Canvass before creating the RFQ from a Pre-Canvass.");
  const [mcdm] = await db.select().from(mcdmRecommendations).where(eq(mcdmRecommendations.preCanvassId, preCanvassId)).limit(1);
  if (!mcdm) throw new Error("Calculate the MCDM recommendation before creating the RFQ.");
  const [existing] = await db.select().from(rfqs).where(eq(rfqs.purchaseRequestId, preCanvass.purchaseRequestId)).limit(1);
  if (existing) return existing;
  const quoteRows = await db.select().from(preCanvassQuotes).where(eq(preCanvassQuotes.preCanvassId, preCanvassId));
  const rfqNumber = `RFQ-${new Date().getFullYear()}-${Date.now().toString().slice(-7)}`;
  await db.insert(rfqs).values({ rfqNumber, purchaseRequestId: preCanvass.purchaseRequestId, status: "canvass", createdById: user.id });
  const [rfq] = await db.select().from(rfqs).where(eq(rfqs.rfqNumber, rfqNumber)).limit(1);
  if (!rfq) throw new Error("RFQ could not be created from the Pre-Canvass.");
  await db.insert(supplierQuotations).values(quoteRows.map((quote) => ({ rfqId: rfq.id, supplierId: quote.supplierId, totalPrice: quote.totalPrice, deliveryDays: quote.deliveryDays, isCompliant: quote.isCompliant, notes: `Imported from ${preCanvass.preCanvassNumber}; MCDM recommended supplier #${mcdm.recommendedSupplierId}.` })));
  await writeAuditEvent({ entityType: "rfq", entityId: rfq.id, action: "created_from_mcdm_pre_canvass", performedById: user.id, performedByRole: normalizeProcurementRole(user.role), details: { preCanvassId, recommendedSupplierId: mcdm.recommendedSupplierId } });
  return rfq;
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

export async function recordHistoricalPrice(input: { itemDescription: string; unit: string; unitPrice: number; supplierId?: number; purchaseOrderId?: number; observedAt?: Date }, user: User) {
  const db = await requireDb();
  if (input.unitPrice <= 0) throw new Error("Historical unit price must be positive.");
  await db.insert(historicalPrices).values({ itemDescription: input.itemDescription.trim(), unit: input.unit.trim(), unitPrice: input.unitPrice.toFixed(2), supplierId: input.supplierId ?? null, purchaseOrderId: input.purchaseOrderId ?? null, observedAt: input.observedAt ?? new Date(), recordedById: user.id });
  const [price] = await db.select().from(historicalPrices).where(and(eq(historicalPrices.itemDescription, input.itemDescription.trim()), eq(historicalPrices.recordedById, user.id))).orderBy(desc(historicalPrices.id)).limit(1);
  if (!price) throw new Error("Historical price could not be recorded.");
  return price;
}

export async function getProcurementForecast() {
  const db = await requireDb();
  const rows = await db.select().from(historicalPrices).orderBy(historicalPrices.itemDescription, historicalPrices.observedAt);
  const byItem = rows.reduce<Record<string, typeof rows>>((grouped, row) => { (grouped[row.itemDescription] ??= []).push(row); return grouped; }, {});
  return Object.entries(byItem).map(([itemDescription, points]) => {
    const prices = points.map((point) => Number(point.unitPrice));
    const average = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    const trend = prices.length > 1 ? (prices[prices.length - 1] - prices[0]) / Math.max(prices[0], 1) : 0;
    return { itemDescription, unit: points[0].unit, points: points.map((point) => ({ observedAt: point.observedAt, unitPrice: Number(point.unitPrice) })), averagePrice: average, forecastPrice: average * (1 + trend), trendPercent: trend * 100 };
  });
}

export async function getPublicPurchaseRequestTracking(trackingToken: string) {
  const db = await requireDb();
  const [purchaseRequest] = await db.select({ id: purchaseRequests.id, prNumber: purchaseRequests.prNumber, purpose: purchaseRequests.purpose, status: purchaseRequests.status, createdAt: purchaseRequests.createdAt, submittedAt: purchaseRequests.submittedAt, updatedAt: purchaseRequests.updatedAt }).from(purchaseRequests).where(eq(purchaseRequests.trackingToken, trackingToken)).limit(1);
  if (!purchaseRequest) throw new Error("Tracking record not found.");
  const [preCanvass] = await db.select().from(preCanvasses).where(eq(preCanvasses.purchaseRequestId, purchaseRequest.id)).limit(1);
  const [purchaseOrder] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.purchaseRequestId, purchaseRequest.id)).limit(1);
  const events = await db.select({ action: auditTrails.action, createdAt: auditTrails.createdAt }).from(auditTrails).where(eq(auditTrails.entityId, purchaseRequest.id)).orderBy(auditTrails.createdAt);
  return { purchaseRequest, preCanvass: preCanvass ? { status: preCanvass.status, updatedAt: preCanvass.updatedAt } : null, purchaseOrder: purchaseOrder ? { poNumber: purchaseOrder.poNumber, status: purchaseOrder.status, updatedAt: purchaseOrder.updatedAt } : null, events };
}

async function getEligibleTestOnlyPackage(ppmpEntryId: number, db: ReturnType<typeof drizzle>) {
  const [record] = await db.select({ ppmp: appPpmpEntries, officeCode: offices.code, objectCode: objectsOfExpenditure.code }).from(appPpmpEntries)
    .innerJoin(offices, eq(offices.id, appPpmpEntries.officeId))
    .innerJoin(objectsOfExpenditure, eq(objectsOfExpenditure.id, appPpmpEntries.objectOfExpenditureId))
    .where(eq(appPpmpEntries.id, ppmpEntryId)).limit(1);
  if (!record || !isEligibleTestOnlyPackage({ description: record.ppmp.description, fundSource: record.ppmp.fundSource, remarks: record.ppmp.remarks, officeCode: record.officeCode, objectCode: record.objectCode })) {
    throw new Error("Only clearly labelled non-operational test packages with dedicated TEST reference records may be managed here.");
  }
  return record;
}

export async function listAdminTestRecordPackages() {
  const db = await requireDb();
  const rows = await db.select({ ppmp: appPpmpEntries, officeCode: offices.code, officeName: offices.name, objectCode: objectsOfExpenditure.code, objectName: objectsOfExpenditure.name, archive: testRecordArchives })
    .from(appPpmpEntries)
    .innerJoin(offices, eq(offices.id, appPpmpEntries.officeId))
    .innerJoin(objectsOfExpenditure, eq(objectsOfExpenditure.id, appPpmpEntries.objectOfExpenditureId))
    .leftJoin(testRecordArchives, eq(testRecordArchives.ppmpEntryId, appPpmpEntries.id))
    .where(like(appPpmpEntries.description, `${TEST_ONLY_PREFIX}%`))
    .orderBy(desc(appPpmpEntries.createdAt));
  const purchaseRequestsByPpmp = await db.select().from(purchaseRequests);
  return rows.filter((row) => isEligibleTestOnlyPackage({ description: row.ppmp.description, fundSource: row.ppmp.fundSource, remarks: row.ppmp.remarks, officeCode: row.officeCode, objectCode: row.objectCode })).map((row) => ({
    ...row,
    purchaseRequests: purchaseRequestsByPpmp.filter((purchaseRequest) => purchaseRequest.ppmpEntryId === row.ppmp.id).map((purchaseRequest) => ({ id: purchaseRequest.id, prNumber: purchaseRequest.prNumber, status: purchaseRequest.status, totalEstimate: purchaseRequest.totalEstimate })),
  }));
}

export async function archiveTestRecordPackage(input: { ppmpEntryId: number; reason: string }, user: User) {
  const db = await requireDb();
  const record = await getEligibleTestOnlyPackage(input.ppmpEntryId, db);
  const [existing] = await db.select().from(testRecordArchives).where(eq(testRecordArchives.ppmpEntryId, record.ppmp.id)).limit(1);
  if (existing) return existing;
  await db.insert(testRecordArchives).values({ ppmpEntryId: record.ppmp.id, archivedById: user.id, archiveReason: input.reason.trim() });
  const [archive] = await db.select().from(testRecordArchives).where(eq(testRecordArchives.ppmpEntryId, record.ppmp.id)).limit(1);
  if (!archive) throw new Error("The test-record archive entry could not be saved.");
  await writeAuditEvent({ entityType: "test_record_package", entityId: record.ppmp.id, action: "archived", performedById: user.id, performedByRole: normalizeProcurementRole(user.role), details: { reason: archive.archiveReason } });
  return archive;
}

export async function cleanupArchivedTestRecordPackage(ppmpEntryId: number, user: User) {
  const db = await requireDb();
  const [archive] = await db.select().from(testRecordArchives).where(eq(testRecordArchives.ppmpEntryId, ppmpEntryId)).limit(1);
  if (!archive) throw new Error("Archive the eligible test package before running cleanup.");
  if (archive.cleanedAt) return { ppmpEntryId, alreadyCleaned: true };
  await getEligibleTestOnlyPackage(ppmpEntryId, db);
  const testPurchaseRequests = await db.select().from(purchaseRequests).where(eq(purchaseRequests.ppmpEntryId, ppmpEntryId));
  const prIds = testPurchaseRequests.map((record) => record.id);
  const testPreCanvasses = prIds.length ? await db.select().from(preCanvasses).where(inArray(preCanvasses.purchaseRequestId, prIds)) : [];
  const preCanvassIds = testPreCanvasses.map((record) => record.id);
  const testPurchaseOrders = prIds.length ? await db.select().from(purchaseOrders).where(inArray(purchaseOrders.purchaseRequestId, prIds)) : [];
  const purchaseOrderIds = testPurchaseOrders.map((record) => record.id);
  const testRfqs = prIds.length ? await db.select().from(rfqs).where(inArray(rfqs.purchaseRequestId, prIds)) : [];
  const rfqIds = testRfqs.map((record) => record.id);
  const testAbstracts = preCanvassIds.length ? await db.select().from(abstractsOfCanvass).where(inArray(abstractsOfCanvass.preCanvassId, preCanvassIds)) : [];
  const abstractIds = testAbstracts.map((record) => record.id);

  for (const purchaseRequest of testPurchaseRequests.filter((record) => record.status === "procurement_review")) {
    await db.update(budgetAllotments).set({ committedAmount: sql`GREATEST(${budgetAllotments.committedAmount} - ${purchaseRequest.totalEstimate}, 0)` }).where(and(eq(budgetAllotments.officeId, purchaseRequest.officeId), eq(budgetAllotments.objectOfExpenditureId, purchaseRequest.objectOfExpenditureId), eq(budgetAllotments.fiscalYear, new Date().getFullYear())));
  }
  if (rfqIds.length) {
    await db.delete(quotationAbstracts).where(inArray(quotationAbstracts.rfqId, rfqIds));
    await db.delete(supplierQuotations).where(inArray(supplierQuotations.rfqId, rfqIds));
  }
  if (purchaseOrderIds.length) {
    await db.delete(deliveryReceipts).where(inArray(deliveryReceipts.purchaseOrderId, purchaseOrderIds));
    await db.delete(pmrLogs).where(inArray(pmrLogs.purchaseOrderId, purchaseOrderIds));
    await db.delete(historicalPrices).where(inArray(historicalPrices.purchaseOrderId, purchaseOrderIds));
    await db.delete(purchaseOrders).where(inArray(purchaseOrders.id, purchaseOrderIds));
  }
  if (preCanvassIds.length) {
    await db.delete(mcdmRecommendations).where(inArray(mcdmRecommendations.preCanvassId, preCanvassIds));
    await db.delete(preCanvassQuotes).where(inArray(preCanvassQuotes.preCanvassId, preCanvassIds));
    await db.delete(abstractsOfCanvass).where(inArray(abstractsOfCanvass.preCanvassId, preCanvassIds));
    await db.delete(preCanvasses).where(inArray(preCanvasses.id, preCanvassIds));
  }
  if (prIds.length) {
    await db.delete(lettersOfNotice).where(inArray(lettersOfNotice.purchaseRequestId, prIds));
    await db.delete(bacTransmittals).where(inArray(bacTransmittals.purchaseRequestId, prIds));
    await db.delete(purchaseRequestItems).where(inArray(purchaseRequestItems.purchaseRequestId, prIds));
    await db.delete(rfqs).where(inArray(rfqs.id, rfqIds));
    await db.delete(purchaseRequests).where(inArray(purchaseRequests.id, prIds));
  }
  const documentConditions = [and(eq(procurementDocuments.entityType, "app_ppmp_entry"), eq(procurementDocuments.entityId, ppmpEntryId)), ...prIds.map((id) => and(eq(procurementDocuments.entityType, "purchase_request"), eq(procurementDocuments.entityId, id))), ...preCanvassIds.map((id) => and(eq(procurementDocuments.entityType, "pre_canvass"), eq(procurementDocuments.entityId, id))), ...abstractIds.map((id) => and(eq(procurementDocuments.entityType, "abstract_of_canvass"), eq(procurementDocuments.entityId, id))), ...purchaseOrderIds.map((id) => and(eq(procurementDocuments.entityType, "purchase_order"), eq(procurementDocuments.entityId, id)))];
  if (documentConditions.length) await db.delete(procurementDocuments).where(or(...documentConditions));
  const notificationConditions = [and(eq(workflowNotifications.entityType, "app_ppmp_entry"), eq(workflowNotifications.entityId, ppmpEntryId)), ...prIds.map((id) => and(eq(workflowNotifications.entityType, "purchase_request"), eq(workflowNotifications.entityId, id))), ...preCanvassIds.map((id) => and(eq(workflowNotifications.entityType, "pre_canvass"), eq(workflowNotifications.entityId, id))), ...abstractIds.map((id) => and(eq(workflowNotifications.entityType, "abstract_of_canvass"), eq(workflowNotifications.entityId, id))), ...purchaseOrderIds.map((id) => and(eq(workflowNotifications.entityType, "purchase_order"), eq(workflowNotifications.entityId, id)))];
  if (notificationConditions.length) await db.delete(workflowNotifications).where(or(...notificationConditions));
  const correctionConditions = [
    ...preCanvassIds.map((id) => and(eq(workflowCorrections.entityType, "pre_canvass"), eq(workflowCorrections.entityId, id))),
    ...abstractIds.map((id) => and(eq(workflowCorrections.entityType, "abstract_of_canvass"), eq(workflowCorrections.entityId, id))),
    ...purchaseOrderIds.map((id) => and(eq(workflowCorrections.entityType, "purchase_order"), eq(workflowCorrections.entityId, id))),
  ];
  if (correctionConditions.length) await db.delete(workflowCorrections).where(or(...correctionConditions));
  await db.delete(appPpmpEntries).where(eq(appPpmpEntries.id, ppmpEntryId));
  await db.update(testRecordArchives).set({ cleanedAt: new Date() }).where(eq(testRecordArchives.id, archive.id));
  await writeAuditEvent({ entityType: "test_record_package", entityId: ppmpEntryId, action: "cleaned", performedById: user.id, performedByRole: normalizeProcurementRole(user.role), details: { prCount: prIds.length, preCanvassCount: preCanvassIds.length, abstractCount: abstractIds.length, purchaseOrderCount: purchaseOrderIds.length } });
  return { ppmpEntryId, purchaseRequestCount: prIds.length, preCanvassCount: preCanvassIds.length, abstractCount: abstractIds.length, purchaseOrderCount: purchaseOrderIds.length };
}

export async function getProcurementDashboard(user: User) {
  const db = await requireDb();
  const isEndUser = normalizeProcurementRole(user.role) === "end_user";
  const activeArchives = await db.select().from(testRecordArchives).where(isNull(testRecordArchives.cleanedAt));
  const archivedPpmpEntryIds = new Set(activeArchives.map((archive) => archive.ppmpEntryId));
  const prRows = (await listPurchaseRequests(user)).filter((record) => !record.ppmpEntryId || !archivedPpmpEntryIds.has(record.ppmpEntryId));
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
  const planRows = (isEndUser ? await db.select().from(appPpmpEntries).where(eq(appPpmpEntries.preparedById, user.id)) : await db.select().from(appPpmpEntries)).filter((record) => !archivedPpmpEntryIds.has(record.id));
  const [documents, corrections, notifications] = await Promise.all([listProcurementDocuments(user), listWorkflowCorrections(user), listWorkflowNotifications(user)]);
  const relatedPrs = prRows;
  const relatedItems = isEndUser
    ? (prRows.length ? await db.select().from(purchaseRequestItems).where(inArray(purchaseRequestItems.purchaseRequestId, prRows.map((pr) => pr.id))) : [])
    : (prRows.length ? await db.select().from(purchaseRequestItems).where(inArray(purchaseRequestItems.purchaseRequestId, prRows.map((pr) => pr.id))) : []);
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
  return { purchaseRequests: prRows, purchaseRequestItems: relatedItems, preCanvasses: preCanvassRows, preCanvassQuotes: preCanvassQuoteRows, abstractsOfCanvass: abstractOfCanvassRows, deliveryReceipts: deliveryRows, pmrLogs: pmrRows, rfqs: rfqRows, supplierQuotations: quotationRows, quotationAbstracts: abstractRows, purchaseOrders: poRows, auditEvents: auditRows, appPpmpEntries: planRows, documents, corrections, notifications, analytics: { averageCycleTimeDays: cycleTimes.length ? cycleTimes.reduce((sum, value) => sum + value, 0) / cycleTimes.length : null, topCommodities } };
}
