import { randomUUID } from "node:crypto";
import { createHash } from "node:crypto";
import { and, desc, eq, inArray, isNull, like, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { abstractsOfCanvass, appPpmpEntries, auditTrails, bacTransmittals, bestValuePolicies, bestValuePolicyCriteria, budgetAllotments, deliveryReceipts, formTemplates, historicalPrices, InsertUser, lettersOfNotice, mcdmRecommendations, objectsOfExpenditure, offices, pmrLogs, preCanvassQuotes, preCanvasses, procurementCatalogFavorites, procurementCatalogItems, procurementCatalogSavedItems, procurementDocuments, procurementSettings, procurementSignatories, purchaseOrders, purchaseRequestDecisions, purchaseRequestItems, purchaseRequests, quotationAbstracts, rfqNumberAssignments, rfqs, supplierEvaluationApprovals, supplierEvaluations, supplierQuotations, suppliers, supplierTagAssignments, supplierTags, testRecordArchives, User, users, workflowCorrections, workflowNotifications } from "../drizzle/schema";
import { areUnitsCompatible, getEmployeePrStatus, hasRequiredSupplierQuotations, normalizeProcurementRole, OFFICIAL_ROLE_LABELS, roleCanAct, selectLowestCompliantQuote, type ProcurementRole, type PrStatus } from "../shared/procurementRules";
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
  const normalizedEmail = input.email?.trim().toLowerCase() ?? null;
  const existingByOpenId = await db.select().from(users).where(eq(users.openId, input.openId)).limit(1);
  const existingByEmail = !existingByOpenId[0] && normalizedEmail
    ? await db.select().from(users).where(sql`lower(trim(${users.email})) = ${normalizedEmail}`).limit(1)
    : [];
  const existing = existingByOpenId[0] ?? existingByEmail[0];
  const values = { openId: input.openId, email: normalizedEmail, name: input.name, loginMethod: "supabase", lastSignedIn: new Date() };

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

export async function writeAuditEvent(input: { entityType: string; entityId: number; action: string; performedById: number; performedByRole: ProcurementRole; details?: Record<string, unknown> }) {
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
  const [archivedArchives, allDecisions, allAudits] = await Promise.all([
    db.select().from(testRecordArchives).where(isNull(testRecordArchives.cleanedAt)),
    db.select().from(purchaseRequestDecisions),
    db.select().from(auditTrails).where(eq(auditTrails.entityType, "purchase_request")),
  ]);
  const archivedPpmpEntryIds = new Set(archivedArchives.map((archive) => archive.ppmpEntryId));
  const activeRecords = (await records).filter((record) => !record.ppmpEntryId || !archivedPpmpEntryIds.has(record.ppmpEntryId));

  return activeRecords.map((pr) => {
    const prDecisions = allDecisions.filter((d) => d.purchaseRequestId === pr.id);
    const prAudits = allAudits.filter((a) => a.entityId === pr.id);
    const rejections = prDecisions.filter((d) => d.decisionType === "rejected");
    const fallbackAuditRejections = prAudits.filter((a) => a.action === "rejected");
    const rejectionCount = Math.max(rejections.length, fallbackAuditRejections.length);
    const latestRejectionReason = rejections.at(-1)?.reason
      || (fallbackAuditRejections.at(-1)?.details?.reason as string | undefined)
      || null;
    const latestDecisionDate = prDecisions.at(-1)?.createdAt || pr.updatedAt || pr.createdAt;
    return {
      ...pr,
      rejectionCount,
      latestRejectionReason,
      latestDecisionDate,
    };
  });
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

export async function rejectPurchaseRequest(
  input: { purchaseRequestId: number; reason: string; remarks?: string },
  user: User,
  options?: ProcurementWorkflowOptions
) {
  if (!input.reason || input.reason.trim().length < 10) {
    throw new Error("A specific rejection reason of at least 10 characters is required.");
  }
  const db = options?.db ?? await requireDb();
  const recordAudit = options?.recordAudit ?? writeAuditEvent;
  const actorRole = normalizeProcurementRole(user.role);
  if (!roleCanAct(actorRole, ["procurement_officer", "administrative_approver", "admin"])) {
    throw new Error("Your assigned role is not authorized to reject Purchase Requests.");
  }

  const [pr] = await db.select().from(purchaseRequests).where(eq(purchaseRequests.id, input.purchaseRequestId)).limit(1);
  if (!pr) throw new Error("Purchase Request not found.");

  const nonRejectable = new Set(["rejected", "delivered", "pmr_logged", "closed", "completed"]);
  if (nonRejectable.has(pr.status)) {
    throw new Error(`Purchase Request in status "${pr.status}" cannot be rejected.`);
  }

  const hasCommittedBudget = ["procurement_review", "approval_review", "approved", "rfq", "po", "po_issued", "budget_review", "supply_review", "bac_review"].includes(pr.status);
  if (hasCommittedBudget) {
    await db.update(budgetAllotments)
      .set({ committedAmount: sql`GREATEST(0, ${budgetAllotments.committedAmount} - ${pr.totalEstimate})` })
      .where(and(
        eq(budgetAllotments.officeId, pr.officeId),
        eq(budgetAllotments.objectOfExpenditureId, pr.objectOfExpenditureId),
        eq(budgetAllotments.fiscalYear, new Date().getFullYear())
      ));
  }

  await db.update(purchaseRequests).set({ status: "rejected", updatedAt: new Date() }).where(eq(purchaseRequests.id, pr.id));

  await db.insert(purchaseRequestDecisions).values({
    purchaseRequestId: pr.id,
    decisionType: "rejected",
    fromStatus: pr.status,
    toStatus: "rejected",
    reason: input.reason.trim(),
    remarks: input.remarks?.trim() || null,
    performedById: user.id,
    performedByRole: actorRole,
    createdAt: new Date(),
  });

  await recordAudit({
    entityType: "purchase_request",
    entityId: pr.id,
    action: "rejected",
    performedById: user.id,
    performedByRole: actorRole,
    details: {
      prNumber: pr.prNumber,
      reason: input.reason.trim(),
      remarks: input.remarks?.trim() || null,
      previousStatus: pr.status,
      newStatus: "rejected",
    },
  });

  try {
    await createWorkflowNotification({
      recipientUserId: pr.requestedById,
      kind: "status_change",
      title: `Purchase Request ${pr.prNumber} rejected`,
      body: `Your Purchase Request was rejected: ${input.reason.trim()}`,
      entityType: "purchase_request",
      entityId: pr.id,
    });
  } catch {
    // Notification failure should not block transaction
  }

  return { status: "rejected" as const, reason: input.reason.trim() };
}

export async function returnPurchaseRequestForCorrection(
  input: { purchaseRequestId: number; reason: string; remarks?: string },
  user: User,
  options?: ProcurementWorkflowOptions
) {
  if (!input.reason || input.reason.trim().length < 10) {
    throw new Error("A specific correction reason of at least 10 characters is required.");
  }
  const db = options?.db ?? await requireDb();
  const recordAudit = options?.recordAudit ?? writeAuditEvent;
  const actorRole = normalizeProcurementRole(user.role);
  if (!roleCanAct(actorRole, ["procurement_officer", "administrative_approver", "admin"])) {
    throw new Error("Your assigned role is not authorized to return Purchase Requests for correction.");
  }

  const [pr] = await db.select().from(purchaseRequests).where(eq(purchaseRequests.id, input.purchaseRequestId)).limit(1);
  if (!pr) throw new Error("Purchase Request not found.");

  if (["rejected", "delivered", "pmr_logged", "closed"].includes(pr.status)) {
    throw new Error(`Purchase Request in status "${pr.status}" cannot be returned for correction.`);
  }

  await db.update(purchaseRequests).set({ status: "returned", updatedAt: new Date() }).where(eq(purchaseRequests.id, pr.id));

  await db.insert(workflowCorrections).values({
    entityType: "purchase_request",
    entityId: pr.id,
    requestedById: user.id,
    assignedToId: pr.requestedById,
    reason: input.reason.trim(),
    status: "open",
    createdAt: new Date(),
  });

  await db.insert(purchaseRequestDecisions).values({
    purchaseRequestId: pr.id,
    decisionType: "returned",
    fromStatus: pr.status,
    toStatus: "returned",
    reason: input.reason.trim(),
    remarks: input.remarks?.trim() || null,
    performedById: user.id,
    performedByRole: actorRole,
    createdAt: new Date(),
  });

  await recordAudit({
    entityType: "purchase_request",
    entityId: pr.id,
    action: "returned",
    performedById: user.id,
    performedByRole: actorRole,
    details: {
      prNumber: pr.prNumber,
      reason: input.reason.trim(),
      remarks: input.remarks?.trim() || null,
      previousStatus: pr.status,
      newStatus: "returned",
    },
  });

  try {
    await createWorkflowNotification({
      recipientUserId: pr.requestedById,
      kind: "correction",
      title: `Purchase Request ${pr.prNumber} returned for correction`,
      body: `Correction required: ${input.reason.trim()}`,
      entityType: "purchase_request",
      entityId: pr.id,
    });
  } catch {
    // Notification failure should not block transaction
  }

  return { status: "returned" as const, reason: input.reason.trim() };
}

export async function resubmitPurchaseRequest(
  input: { purchaseRequestId: number; remarks?: string },
  user: User,
  options?: ProcurementWorkflowOptions
) {
  const db = options?.db ?? await requireDb();
  const recordAudit = options?.recordAudit ?? writeAuditEvent;
  const [pr] = await db.select().from(purchaseRequests).where(eq(purchaseRequests.id, input.purchaseRequestId)).limit(1);
  if (!pr) throw new Error("Purchase Request not found.");
  if (pr.requestedById !== user.id) {
    throw new Error("You may only resubmit your own Purchase Requests.");
  }
  if (pr.status !== "returned") {
    throw new Error("Only Purchase Requests in returned status can be resubmitted.");
  }

  await db.update(workflowCorrections)
    .set({ status: "resolved", resolvedAt: new Date() })
    .where(and(eq(workflowCorrections.entityType, "purchase_request"), eq(workflowCorrections.entityId, pr.id), eq(workflowCorrections.status, "open")));

  await db.update(purchaseRequests)
    .set({ status: "procurement_review", submittedAt: new Date(), updatedAt: new Date() })
    .where(eq(purchaseRequests.id, pr.id));

  await db.insert(purchaseRequestDecisions).values({
    purchaseRequestId: pr.id,
    decisionType: "resubmitted",
    fromStatus: "returned",
    toStatus: "procurement_review",
    reason: input.remarks?.trim() || "Employee corrected and resubmitted the package.",
    remarks: input.remarks?.trim() || null,
    performedById: user.id,
    performedByRole: normalizeProcurementRole(user.role),
    createdAt: new Date(),
  });

  await recordAudit({
    entityType: "purchase_request",
    entityId: pr.id,
    action: "resubmitted",
    performedById: user.id,
    performedByRole: normalizeProcurementRole(user.role),
    details: { prNumber: pr.prNumber, remarks: input.remarks?.trim() || null },
  });

  try {
    await notifyRoles(["procurement_officer"], {
      kind: "action_required",
      title: "Purchase Request resubmitted",
      body: `PR ${pr.prNumber} has been corrected and resubmitted for verification.`,
      entityType: "purchase_request",
      entityId: pr.id,
    });
  } catch {}

  return { status: "procurement_review" as const };
}

export async function assignPurchaseRequestOfficer(
  input: { purchaseRequestId: number; officerId: number },
  user: User,
  options?: ProcurementWorkflowOptions
) {
  const db = options?.db ?? await requireDb();
  const recordAudit = options?.recordAudit ?? writeAuditEvent;
  const actorRole = normalizeProcurementRole(user.role);
  if (!roleCanAct(actorRole, ["procurement_officer", "admin"])) {
    throw new Error("Your assigned role is not authorized to assign procurement officers.");
  }
  const [pr] = await db.select().from(purchaseRequests).where(eq(purchaseRequests.id, input.purchaseRequestId)).limit(1);
  if (!pr) throw new Error("Purchase Request not found.");

  await db.update(purchaseRequests).set({ assignedOfficerId: input.officerId, updatedAt: new Date() }).where(eq(purchaseRequests.id, pr.id));

  await recordAudit({
    entityType: "purchase_request",
    entityId: pr.id,
    action: "officer_assigned",
    performedById: user.id,
    performedByRole: actorRole,
    details: { prNumber: pr.prNumber, assignedOfficerId: input.officerId },
  });

  return { success: true };
}

export async function getPurchaseRequestHistory(
  purchaseRequestId: number,
  user: User,
  options?: ProcurementWorkflowOptions
) {
  const db = options?.db ?? await requireDb();
  const [pr] = await db.select().from(purchaseRequests).where(eq(purchaseRequests.id, purchaseRequestId)).limit(1);
  if (!pr) throw new Error("Purchase Request not found.");

  const actorRole = normalizeProcurementRole(user.role);
  if (actorRole === "end_user" && pr.requestedById !== user.id) {
    throw new Error("End-Users may access only their own Purchase Request history.");
  }

  const [decisions, audits, corrections, allUsers] = await Promise.all([
    db.select().from(purchaseRequestDecisions).where(eq(purchaseRequestDecisions.purchaseRequestId, pr.id)),
    db.select().from(auditTrails).where(and(eq(auditTrails.entityType, "purchase_request"), eq(auditTrails.entityId, pr.id))),
    db.select().from(workflowCorrections).where(and(eq(workflowCorrections.entityType, "purchase_request"), eq(workflowCorrections.entityId, pr.id))),
    db.select().from(users),
  ]);

  const userMap = new Map(allUsers.map((u) => [u.id, u]));
  const assignedOfficer = pr.assignedOfficerId ? userMap.get(pr.assignedOfficerId) : null;
  const requester = userMap.get(pr.requestedById);

  const rejections = decisions.filter((d) => d.decisionType === "rejected");
  const fallbackAuditRejections = audits.filter((a) => a.action === "rejected");
  const totalRejectionCount = Math.max(rejections.length, fallbackAuditRejections.length);

  const returns = decisions.filter((d) => d.decisionType === "returned");
  const totalCorrectionCount = Math.max(returns.length, corrections.length);

  const latestRejectionReason = rejections.at(-1)?.reason
    || (fallbackAuditRejections.at(-1)?.details?.reason as string | undefined)
    || null;

  const latestCorrectionReason = returns.at(-1)?.reason
    || corrections.at(-1)?.reason
    || null;

  const statusMeta = getEmployeePrStatus(pr.status);

  type TimelineItem = {
    id: string;
    timestamp: Date;
    actorId: number;
    actorName: string;
    actorRole: string;
    action: string;
    fromStatus: string | null;
    toStatus: string | null;
    reason: string | null;
    remarks: string | null;
    documentId: number | null;
  };

  const timeline: TimelineItem[] = [];

  for (const decision of decisions) {
    const actor = userMap.get(decision.performedById);
    timeline.push({
      id: `decision-${decision.id}`,
      timestamp: decision.createdAt,
      actorId: decision.performedById,
      actorName: actor?.name || `User #${decision.performedById}`,
      actorRole: OFFICIAL_ROLE_LABELS[decision.performedByRole as ProcurementRole] ?? decision.performedByRole,
      action: decision.decisionType,
      fromStatus: decision.fromStatus,
      toStatus: decision.toStatus,
      reason: decision.reason,
      remarks: decision.remarks,
      documentId: decision.documentId,
    });
  }

  for (const audit of audits) {
    const isAlreadyRepresented = decisions.some((d) => d.createdAt.getTime() === audit.createdAt.getTime() && d.decisionType === audit.action);
    if (!isAlreadyRepresented) {
      const actor = userMap.get(audit.performedById);
      const details = (audit.details || {}) as Record<string, unknown>;
      timeline.push({
        id: `audit-${audit.id}`,
        timestamp: audit.createdAt,
        actorId: audit.performedById,
        actorName: actor?.name || `User #${audit.performedById}`,
        actorRole: OFFICIAL_ROLE_LABELS[audit.performedByRole as ProcurementRole] ?? audit.performedByRole,
        action: audit.action,
        fromStatus: (details.previousStatus as string) || null,
        toStatus: (details.newStatus as string) || null,
        reason: (details.reason as string) || null,
        remarks: (details.remarks as string) || null,
        documentId: null,
      });
    }
  }

  timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  return {
    purchaseRequest: pr,
    internalStatus: pr.status,
    employeeStatus: statusMeta.label,
    employeeMeaning: statusMeta.meaning,
    totalRejectionCount,
    totalCorrectionCount,
    latestRejectionReason,
    latestCorrectionReason,
    assignedOfficer: assignedOfficer ? { id: assignedOfficer.id, name: assignedOfficer.name, role: assignedOfficer.role } : null,
    requester: requester ? { id: requester.id, name: requester.name, email: requester.email } : null,
    timeline,
  };
}

export async function rejectPreCanvass(
  input: { preCanvassId: number; reason: string; remarks?: string },
  user: User,
  options?: ProcurementWorkflowOptions
) {
  if (!input.reason || input.reason.trim().length < 10) {
    throw new Error("A specific rejection reason of at least 10 characters is required.");
  }
  const db = options?.db ?? await requireDb();
  const recordAudit = options?.recordAudit ?? writeAuditEvent;
  const actorRole = normalizeProcurementRole(user.role);
  if (!roleCanAct(actorRole, ["procurement_officer", "administrative_approver", "admin"])) {
    throw new Error("Your assigned role is not authorized to reject Pre-Canvass packages.");
  }

  const [preCanvass] = await db.select().from(preCanvasses).where(eq(preCanvasses.id, input.preCanvassId)).limit(1);
  if (!preCanvass) throw new Error("Pre-Canvass not found.");

  if (["rejected", "abstracted", "approved"].includes(preCanvass.status)) {
    throw new Error(`Pre-Canvass in status "${preCanvass.status}" cannot be rejected.`);
  }

  await db.update(preCanvasses).set({ status: "rejected", updatedAt: new Date() }).where(eq(preCanvasses.id, preCanvass.id));

  const [pr] = await db.select().from(purchaseRequests).where(eq(purchaseRequests.id, preCanvass.purchaseRequestId)).limit(1);
  if (pr && pr.status !== "rejected") {
    await db.update(purchaseRequests).set({ status: "rejected", updatedAt: new Date() }).where(eq(purchaseRequests.id, pr.id));
    await db.insert(purchaseRequestDecisions).values({
      purchaseRequestId: pr.id,
      decisionType: "rejected",
      fromStatus: pr.status,
      toStatus: "rejected",
      reason: input.reason.trim(),
      remarks: input.remarks?.trim() || `Pre-Canvass ${preCanvass.preCanvassNumber} rejected.`,
      performedById: user.id,
      performedByRole: actorRole,
      createdAt: new Date(),
    });
  }

  await recordAudit({
    entityType: "pre_canvass",
    entityId: preCanvass.id,
    action: "rejected",
    performedById: user.id,
    performedByRole: actorRole,
    details: {
      preCanvassNumber: preCanvass.preCanvassNumber,
      purchaseRequestId: preCanvass.purchaseRequestId,
      reason: input.reason.trim(),
      remarks: input.remarks?.trim() || null,
    },
  });

  try {
    await createWorkflowNotification({
      recipientUserId: preCanvass.preparedById,
      kind: "status_change",
      title: `Pre-Canvass ${preCanvass.preCanvassNumber} rejected`,
      body: `Your Pre-Canvass package was rejected: ${input.reason.trim()}`,
      entityType: "pre_canvass",
      entityId: preCanvass.id,
    });
  } catch {}

  return { status: "rejected" as const, reason: input.reason.trim() };
}

export async function rejectRfq(
  input: { rfqId: number; reason: string; remarks?: string },
  user: User,
  options?: ProcurementWorkflowOptions
) {
  if (!input.reason || input.reason.trim().length < 10) {
    throw new Error("A specific rejection reason of at least 10 characters is required.");
  }
  const db = options?.db ?? await requireDb();
  const recordAudit = options?.recordAudit ?? writeAuditEvent;
  const actorRole = normalizeProcurementRole(user.role);
  if (!roleCanAct(actorRole, ["procurement_officer", "administrative_approver", "admin"])) {
    throw new Error("Your assigned role is not authorized to reject RFQs.");
  }

  const [rfq] = await db.select().from(rfqs).where(eq(rfqs.id, input.rfqId)).limit(1);
  if (!rfq) throw new Error("RFQ not found.");

  if (["rejected", "completed"].includes(rfq.status)) {
    throw new Error(`RFQ in status "${rfq.status}" cannot be rejected.`);
  }

  await db.update(rfqs).set({ status: "rejected", updatedAt: new Date() }).where(eq(rfqs.id, rfq.id));

  const [pr] = await db.select().from(purchaseRequests).where(eq(purchaseRequests.id, rfq.purchaseRequestId)).limit(1);
  if (pr && pr.status !== "rejected") {
    await db.update(purchaseRequests).set({ status: "rejected", updatedAt: new Date() }).where(eq(purchaseRequests.id, pr.id));
    await db.insert(purchaseRequestDecisions).values({
      purchaseRequestId: pr.id,
      decisionType: "rejected",
      fromStatus: pr.status,
      toStatus: "rejected",
      reason: input.reason.trim(),
      remarks: input.remarks?.trim() || `RFQ ${rfq.rfqNumber} rejected.`,
      performedById: user.id,
      performedByRole: actorRole,
      createdAt: new Date(),
    });
  }

  await recordAudit({
    entityType: "rfq",
    entityId: rfq.id,
    action: "rejected",
    performedById: user.id,
    performedByRole: actorRole,
    details: {
      rfqNumber: rfq.rfqNumber,
      purchaseRequestId: rfq.purchaseRequestId,
      reason: input.reason.trim(),
      remarks: input.remarks?.trim() || null,
    },
  });

  try {
    await createWorkflowNotification({
      recipientUserId: rfq.createdById,
      kind: "status_change",
      title: `RFQ ${rfq.rfqNumber} rejected`,
      body: `The RFQ was rejected: ${input.reason.trim()}`,
      entityType: "rfq",
      entityId: rfq.id,
    });
  } catch {}

  return { status: "rejected" as const, reason: input.reason.trim() };
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

export async function assignRfqNumber(
  input: {
    fiscalYear?: number;
    mode: "sequential" | "urgent_manual";
    manualNumber?: string;
    urgentReason?: string;
    purchaseRequestId?: number;
    rfqId?: number;
  },
  user: User,
  options?: ProcurementWorkflowOptions
) {
  const db = options?.db ?? await requireDb();
  const recordAudit = options?.recordAudit ?? writeAuditEvent;
  const actorRole = normalizeProcurementRole(user.role);
  if (!roleCanAct(actorRole, ["procurement_officer", "admin"])) {
    throw new Error("Your assigned role is not authorized to assign RFQ numbers.");
  }

  const fiscalYear = input.fiscalYear ?? new Date().getFullYear();
  let formattedRfqNumber: string;
  let sequenceNumber: number;

  if (input.mode === "urgent_manual") {
    if (!input.urgentReason || input.urgentReason.trim().length < 10) {
      throw new Error("A specific urgent reason of at least 10 characters is required for manual RFQ numbering.");
    }
    if (!input.manualNumber || !input.manualNumber.trim()) {
      throw new Error("A valid manual RFQ number must be provided.");
    }
    formattedRfqNumber = input.manualNumber.trim();
    const [existingAssignment] = await db.select().from(rfqNumberAssignments).where(eq(rfqNumberAssignments.formattedRfqNumber, formattedRfqNumber)).limit(1);
    if (existingAssignment) {
      throw new Error(`RFQ number "${formattedRfqNumber}" has already been assigned.`);
    }
    const existingYear = await db.select().from(rfqNumberAssignments).where(eq(rfqNumberAssignments.fiscalYear, fiscalYear));
    const maxSeq = existingYear.reduce((max, a) => Math.max(max, a.sequenceNumber), 0);
    sequenceNumber = maxSeq + 1;
  } else {
    const existingYear = await db.select().from(rfqNumberAssignments).where(eq(rfqNumberAssignments.fiscalYear, fiscalYear));
    let nextSeq = existingYear.reduce((max, a) => Math.max(max, a.sequenceNumber), 0) + 1;
    let candidate = `RFQ-${fiscalYear}-${String(nextSeq).padStart(4, "0")}`;
    while (existingYear.some((a) => a.formattedRfqNumber === candidate)) {
      nextSeq += 1;
      candidate = `RFQ-${fiscalYear}-${String(nextSeq).padStart(4, "0")}`;
    }
    sequenceNumber = nextSeq;
    formattedRfqNumber = candidate;
  }

  const [created] = await db.insert(rfqNumberAssignments).values({
    fiscalYear,
    sequenceNumber,
    formattedRfqNumber,
    assignmentMode: input.mode,
    urgentReason: input.urgentReason?.trim() || null,
    assignedById: user.id,
    assignedAt: new Date(),
    purchaseRequestId: input.purchaseRequestId ?? null,
    rfqId: input.rfqId ?? null,
    status: "active",
  }).returning();

  if (input.rfqId) {
    await db.update(rfqs).set({ rfqNumber: formattedRfqNumber, updatedAt: new Date() }).where(eq(rfqs.id, input.rfqId));
  }

  await recordAudit({
    entityType: "rfq",
    entityId: input.rfqId ?? created.id,
    action: "rfq_number_assigned",
    performedById: user.id,
    performedByRole: actorRole,
    details: {
      fiscalYear,
      sequenceNumber,
      formattedRfqNumber,
      assignmentMode: input.mode,
      urgentReason: input.urgentReason?.trim() || null,
      purchaseRequestId: input.purchaseRequestId,
      rfqId: input.rfqId,
    },
  });

  return created;
}

export const DEFAULT_FORM_TEMPLATES: Record<string, { displayName: string; configurationJson: Record<string, unknown> }> = {
  purchase_request: {
    displayName: "Purchase Request (Appendix 60)",
    configurationJson: {
      institutionName: "Batanes State College",
      officeUnit: "Procurement Unit",
      headerText: "PURCHASE REQUEST",
      instructionText: "State clearly the purpose, commodity specifications, quantities, and approved unit costs.",
      signatoryLabels: { requester: "Requested By", approver: "Approved By" },
      requiredFields: ["prNumber", "officeId", "fundSource", "purpose", "items"],
    },
  },
  ppmp: {
    displayName: "Project Procurement Management Plan (PPMP)",
    configurationJson: {
      institutionName: "Batanes State College",
      officeUnit: "Procurement Unit",
      headerText: "PROJECT PROCUREMENT MANAGEMENT PLAN",
      instructionText: "Plan procurement projects, schedules, and estimated budgets per object of expenditure.",
      requiredFields: ["fiscalYear", "officeId", "objectOfExpenditureId", "description", "plannedAmount"],
    },
  },
  pre_canvass: {
    displayName: "Pre-Canvass / Preliminary Quotation (Annex D/E)",
    configurationJson: {
      institutionName: "Batanes State College",
      officeUnit: "Procurement Unit",
      headerText: "PRE-CANVASS / MARKET SCOPING",
      instructionText: "Collect three preliminary supplier quotations for market sounding prior to official RFQ.",
      requiredFields: ["preCanvassNumber", "purchaseRequestId", "quotationDeadline", "deliveryPeriodDays"],
    },
  },
  rfq: {
    displayName: "Request for Quotation (Official Annex D)",
    configurationJson: {
      institutionName: "Batanes State College",
      officeUnit: "Procurement Unit",
      headerText: "REQUEST FOR QUOTATION",
      instructionText: "Suppliers must submit quotations within the standard 7 calendar days submission period.",
      responsePeriodDays: 7,
      requiredFields: ["rfqNumber", "purchaseRequestId", "quotationDeadline"],
    },
  },
  abstract_of_quotations: {
    displayName: "Abstract of Quotations (Annex F)",
    configurationJson: {
      institutionName: "Batanes State College",
      officeUnit: "Procurement Unit / BAC",
      headerText: "ABSTRACT OF QUOTATIONS",
      instructionText: "Record lowest compliant quotation, supplier comparison, and BAC certification.",
      requiredFields: ["abstractNumber", "rfqId", "recommendedSupplierId", "certificationText"],
    },
  },
  letter_of_notice: {
    displayName: "Letter of Notice / Canvass Letter",
    configurationJson: {
      institutionName: "Batanes State College",
      officeUnit: "Procurement Unit",
      headerText: "LETTER OF NOTICE",
      instructionText: "Official transmittal and invitation to participate in price canvass.",
      requiredFields: ["noticeNumber", "supplierId", "purchaseRequestId"],
    },
  },
  purchase_order: {
    displayName: "Purchase Order (Appendix 61)",
    configurationJson: {
      institutionName: "Batanes State College",
      officeUnit: "Procurement Unit",
      headerText: "PURCHASE ORDER",
      instructionText: "Prescribed government contract for goods and services delivery under RA 9184.",
      requiredFields: ["poNumber", "supplierId", "totalAmount", "placeOfDelivery", "deliveryTerm", "paymentTerm"],
    },
  },
  pmr: {
    displayName: "Procurement Monitoring Report (PMR)",
    configurationJson: {
      institutionName: "Batanes State College",
      officeUnit: "Bids and Awards Committee / Procurement Office",
      headerText: "PROCUREMENT MONITORING REPORT",
      instructionText: "Comprehensive monitoring log of procurement lifecycle from PPMP to inspection.",
      requiredFields: ["pmrNumber", "purchaseOrderId", "completionDate", "responsibleOfficer"],
    },
  },
  supplier_evaluation_goods: {
    displayName: "Supplier Evaluation Form (Goods)",
    configurationJson: {
      institutionName: "Batanes State College",
      officeUnit: "PROCUREMENT UNIT",
      headerText: "SUPPLIER EVALUATION FORM (Goods)",
      subtitle: "To be accomplished by Procurement Office",
      instructions: "Please rate the supplier according to each criterion provided (1 to 4).",
      requiredFields: ["supplierId", "purchaseOrderId", "respondentName", "criteriaScores"],
    },
  },
};

export async function listFormTemplates(options?: ProcurementWorkflowOptions) {
  const db = options?.db ?? await requireDb();
  return db.select().from(formTemplates).orderBy(formTemplates.templateKey, desc(formTemplates.version));
}

export async function getActiveFormTemplate(templateKey: string, options?: ProcurementWorkflowOptions) {
  const db = options?.db ?? await requireDb();
  const [active] = await db.select().from(formTemplates).where(and(eq(formTemplates.templateKey, templateKey), eq(formTemplates.status, "active"))).limit(1);
  if (active) return active;
  const fallback = DEFAULT_FORM_TEMPLATES[templateKey];
  if (fallback) {
    return {
      id: 0,
      templateKey,
      version: 1,
      displayName: fallback.displayName,
      status: "active" as const,
      configurationJson: fallback.configurationJson,
      createdById: 1,
      updatedById: 1,
      approvedById: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      activatedAt: new Date(),
    };
  }
  return null;
}

export async function saveFormTemplateDraft(
  input: { templateKey: string; displayName: string; configurationJson: Record<string, unknown> },
  user: User,
  options?: ProcurementWorkflowOptions
) {
  const db = options?.db ?? await requireDb();
  const recordAudit = options?.recordAudit ?? writeAuditEvent;
  const actorRole = normalizeProcurementRole(user.role);
  if (actorRole !== "admin") {
    throw new Error("Only an Administrator can create or update form template drafts.");
  }

  const fallback = DEFAULT_FORM_TEMPLATES[input.templateKey];
  if (fallback?.configurationJson.requiredFields && Array.isArray(fallback.configurationJson.requiredFields)) {
    const required = fallback.configurationJson.requiredFields as string[];
    const inputRequired = Array.isArray(input.configurationJson.requiredFields) ? input.configurationJson.requiredFields as string[] : [];
    for (const req of required) {
      if (!inputRequired.includes(req)) {
        throw new Error(`Form template draft cannot omit mandatory workflow field "${req}".`);
      }
    }
  }

  const [existingDraft] = await db.select().from(formTemplates).where(and(eq(formTemplates.templateKey, input.templateKey), eq(formTemplates.status, "draft"))).limit(1);

  let template: typeof formTemplates.$inferSelect;
  if (existingDraft) {
    await db.update(formTemplates).set({
      displayName: input.displayName.trim(),
      configurationJson: input.configurationJson,
      updatedById: user.id,
      updatedAt: new Date(),
    }).where(eq(formTemplates.id, existingDraft.id));
    const [updated] = await db.select().from(formTemplates).where(eq(formTemplates.id, existingDraft.id)).limit(1);
    template = updated!;
  } else {
    const allVersions = await db.select().from(formTemplates).where(eq(formTemplates.templateKey, input.templateKey));
    const maxVersion = allVersions.reduce((max, t) => Math.max(max, t.version), 0);
    const newVersion = maxVersion + 1;
    const [created] = await db.insert(formTemplates).values({
      templateKey: input.templateKey,
      version: newVersion,
      displayName: input.displayName.trim(),
      status: "draft",
      configurationJson: input.configurationJson,
      createdById: user.id,
      updatedById: user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    template = created!;
  }

  await recordAudit({
    entityType: "form_template",
    entityId: template.id,
    action: "draft_saved",
    performedById: user.id,
    performedByRole: actorRole,
    details: { templateKey: input.templateKey, version: template.version, displayName: input.displayName },
  });

  return template;
}

export async function activateFormTemplate(
  templateId: number,
  user: User,
  options?: ProcurementWorkflowOptions
) {
  const db = options?.db ?? await requireDb();
  const recordAudit = options?.recordAudit ?? writeAuditEvent;
  const actorRole = normalizeProcurementRole(user.role);
  if (actorRole !== "admin") {
    throw new Error("Only an Administrator can activate procurement form templates.");
  }

  const [target] = await db.select().from(formTemplates).where(eq(formTemplates.id, templateId)).limit(1);
  if (!target) throw new Error("Form template not found.");

  await db.update(formTemplates).set({ status: "archived", updatedAt: new Date() }).where(and(eq(formTemplates.templateKey, target.templateKey), eq(formTemplates.status, "active")));

  await db.update(formTemplates).set({
    status: "active",
    approvedById: user.id,
    activatedAt: new Date(),
    updatedAt: new Date(),
  }).where(eq(formTemplates.id, target.id));

  const [activated] = await db.select().from(formTemplates).where(eq(formTemplates.id, target.id)).limit(1);

  await recordAudit({
    entityType: "form_template",
    entityId: activated!.id,
    action: "activated",
    performedById: user.id,
    performedByRole: actorRole,
    details: { templateKey: target.templateKey, version: target.version, displayName: target.displayName },
  });

  return activated!;
}

export async function restoreFormTemplateVersion(
  templateId: number,
  user: User,
  options?: ProcurementWorkflowOptions
) {
  const db = options?.db ?? await requireDb();
  const recordAudit = options?.recordAudit ?? writeAuditEvent;
  const actorRole = normalizeProcurementRole(user.role);
  if (actorRole !== "admin") {
    throw new Error("Only an Administrator can restore previous form template versions.");
  }

  const [target] = await db.select().from(formTemplates).where(eq(formTemplates.id, templateId)).limit(1);
  if (!target) throw new Error("Form template version not found.");

  await db.update(formTemplates).set({ status: "archived", updatedAt: new Date() }).where(and(eq(formTemplates.templateKey, target.templateKey), eq(formTemplates.status, "active")));

  await db.update(formTemplates).set({
    status: "active",
    approvedById: user.id,
    activatedAt: new Date(),
    updatedAt: new Date(),
  }).where(eq(formTemplates.id, target.id));

  const [restored] = await db.select().from(formTemplates).where(eq(formTemplates.id, target.id)).limit(1);

  await recordAudit({
    entityType: "form_template",
    entityId: restored!.id,
    action: "version_restored",
    performedById: user.id,
    performedByRole: actorRole,
    details: { templateKey: target.templateKey, version: target.version },
  });

  return restored!;
}

const OPERATIONAL_AUDIT_ENTITY_TYPES = new Set([
  "purchase_request",
  "pre_canvass",
  "pre_canvass_quote",
  "abstract_of_canvass",
  "rfq",
  "supplier",
  "supplier_quotation",
  "quotation_abstract",
  "purchase_order",
  "delivery_receipt",
  "pmr_log",
  "supplier_evaluation",
  "mcdm_recommendation",
  "historical_price",
  "budget_allotment",
  "workflow_correction",
]);

export async function listAuditTrails(
  filters: {
    entityType?: string;
    entityId?: number;
    transactionNumber?: string;
    performedById?: number;
    action?: string;
    fromDate?: Date;
    toDate?: Date;
    limit?: number;
    offset?: number;
  },
  user: User,
  options?: ProcurementWorkflowOptions
) {
  const db = options?.db ?? await requireDb();
  const actorRole = normalizeProcurementRole(user.role);

  const [allAudits, allUsers, allPrs, allPreCanvasses] = await Promise.all([
    db.select().from(auditTrails).orderBy(desc(auditTrails.createdAt)),
    db.select().from(users),
    db.select().from(purchaseRequests),
    db.select().from(preCanvasses),
  ]);

  const userMap = new Map(allUsers.map((u) => [u.id, u]));
  const userPrIds = new Set(allPrs.filter((pr) => pr.requestedById === user.id).map((pr) => pr.id));
  const userPreCanvassIds = new Set(allPreCanvasses.filter((pc) => pc.preparedById === user.id).map((pc) => pc.id));

  const filtered = allAudits.filter((audit) => {
    if (actorRole === "admin") {
      // Full access
    } else if (roleCanAct(actorRole, ["procurement_officer", "procurement_officer_i", "procurement_officer_ii", "procurement_staff", "administrative_approver", "bac_secretariat", "bac", "hope", "budget_officer"])) {
      if (!OPERATIONAL_AUDIT_ENTITY_TYPES.has(audit.entityType)) {
        return false;
      }
    } else {
      const isActor = audit.performedById === user.id;
      const isOwnPr = audit.entityType === "purchase_request" && userPrIds.has(audit.entityId);
      const isOwnPreCanvass = audit.entityType === "pre_canvass" && userPreCanvassIds.has(audit.entityId);
      if (!isActor && !isOwnPr && !isOwnPreCanvass) {
        return false;
      }
    }

    if (filters.entityType && audit.entityType !== filters.entityType) return false;
    if (filters.entityId && audit.entityId !== filters.entityId) return false;
    if (filters.performedById && audit.performedById !== filters.performedById) return false;
    if (filters.action && audit.action !== filters.action) return false;
    if (filters.fromDate && audit.createdAt < filters.fromDate) return false;
    if (filters.toDate && audit.createdAt > filters.toDate) return false;

    if (filters.transactionNumber) {
      const q = filters.transactionNumber.toLowerCase();
      const detailsStr = JSON.stringify(audit.details || {}).toLowerCase();
      if (!detailsStr.includes(q)) return false;
    }

    return true;
  });

  const total = filtered.length;
  const offset = filters.offset ?? 0;
  const limit = filters.limit ?? 100;
  const paged = filtered.slice(offset, offset + limit);

  const items = paged.map((audit) => {
    const actor = userMap.get(audit.performedById);
    return {
      ...audit,
      performerName: actor?.name || `User #${audit.performedById}`,
      performerEmail: actor?.email || null,
      officialRoleLabel: OFFICIAL_ROLE_LABELS[audit.performedByRole as ProcurementRole] ?? audit.performedByRole,
    };
  });

  return { items, total };
}

export async function getHistoricalPriceAnalytics(
  input: { itemDescription: string; unit?: string; evaluatedUnitPrice?: number; fromDate?: Date; toDate?: Date },
  options?: ProcurementWorkflowOptions
) {
  const db = options?.db ?? await requireDb();
  const search = input.itemDescription.trim().toLowerCase();
  const allPrices = await db.select().from(historicalPrices).orderBy(historicalPrices.observedAt);
  const matched = allPrices.filter((hp) => hp.itemDescription.trim().toLowerCase() === search || hp.itemDescription.toLowerCase().includes(search));

  let filtered = matched;
  if (input.fromDate) filtered = filtered.filter((hp) => hp.observedAt >= input.fromDate!);
  if (input.toDate) filtered = filtered.filter((hp) => hp.observedAt <= input.toDate!);

  const points = filtered.map((hp) => ({
    id: hp.id,
    observedAt: hp.observedAt,
    unitPrice: Number(hp.unitPrice),
    unit: hp.unit,
    supplierId: hp.supplierId,
    purchaseOrderId: hp.purchaseOrderId,
  }));

  const numericPrices = points.map((p) => p.unitPrice).sort((a, b) => a - b);
  const count = numericPrices.length;

  let lowestPrice: number | null = null;
  let highestPrice: number | null = null;
  let averagePrice: number | null = null;
  let medianPrice: number | null = null;
  let mostRecentPrice: number | null = null;
  let trendDirection: "increasing" | "stable" | "decreasing" = "stable";
  let trendPercent = 0;

  if (count > 0) {
    lowestPrice = numericPrices[0];
    highestPrice = numericPrices[count - 1];
    averagePrice = numericPrices.reduce((sum, p) => sum + p, 0) / count;
    medianPrice = count % 2 === 1 ? numericPrices[Math.floor(count / 2)] : (numericPrices[count / 2 - 1] + numericPrices[count / 2]) / 2;
    mostRecentPrice = points[points.length - 1].unitPrice;

    if (points.length > 1) {
      const first = points[0].unitPrice;
      const last = points[points.length - 1].unitPrice;
      const diff = last - first;
      trendPercent = Math.round((diff / Math.max(first, 0.01)) * 100);
      if (trendPercent > 3) trendDirection = "increasing";
      else if (trendPercent < -3) trendDirection = "decreasing";
      else trendDirection = "stable";
    }
  }

  const warnings: string[] = [];

  if (input.unit && points.length > 0) {
    const incompatiblePoint = points.find((p) => !areUnitsCompatible(input.unit!, p.unit));
    if (incompatiblePoint) {
      warnings.push(`Unit discrepancy detected: historical prices are based on "${incompatiblePoint.unit}", but current request specifies "${input.unit}". Direct price comparison may be invalid.`);
    }
  }

  if (input.evaluatedUnitPrice && averagePrice !== null && averagePrice > 0) {
    const variance = (input.evaluatedUnitPrice - averagePrice) / averagePrice;
    const variancePct = Math.round(variance * 100);
    if (Math.abs(variancePct) > 25) {
      warnings.push(`Caution: Proposed unit price (${input.evaluatedUnitPrice.toFixed(2)}) deviates significantly (${variancePct > 0 ? "+" : ""}${variancePct}%) from the historical average (${averagePrice.toFixed(2)}).`);
    } else if (Math.abs(variancePct) > 15) {
      warnings.push(`Variance notice: Proposed unit price differs by ${variancePct > 0 ? "+" : ""}${variancePct}% from historical average (${averagePrice.toFixed(2)}).`);
    }
  }

  const decisionSupportDisclaimer = "Historical price analytics are provided as decision support only. Final quotation evaluation and supplier selection must be performed by authorized Procurement personnel in accordance with RA 9184 and BSC procurement guidelines.";

  return {
    itemDescription: input.itemDescription,
    unit: input.unit || (points[0]?.unit ?? "unit"),
    points,
    metrics: {
      count,
      lowestPrice,
      highestPrice,
      averagePrice,
      medianPrice,
      mostRecentPrice,
      trendDirection,
      trendPercent,
    },
    warnings,
    decisionSupportDisclaimer,
  };
}

export async function getPmrStatus(purchaseRequestId: number, options?: ProcurementWorkflowOptions) {
  const db = options?.db ?? await requireDb();
  const [pr] = await db.select().from(purchaseRequests).where(eq(purchaseRequests.id, purchaseRequestId)).limit(1);
  if (!pr) throw new Error("Purchase Request not found.");

  const [po] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.purchaseRequestId, pr.id)).orderBy(desc(purchaseOrders.id)).limit(1);
  if (!po) {
    return {
      status: "not_applicable" as const,
      label: "Not Applicable",
      detail: "No Purchase Order has been awarded for this request yet.",
      pmrNumber: null,
      completionDate: null,
    };
  }

  if (po.status === "issued" || po.status === "pending_approval" || po.status === "returned") {
    return {
      status: "pending_delivery" as const,
      label: "Pending Delivery",
      detail: `PO ${po.poNumber} is active and awaiting delivery receipt.`,
      pmrNumber: null,
      completionDate: null,
    };
  }

  const [pmr] = await db.select().from(pmrLogs).where(eq(pmrLogs.purchaseOrderId, po.id)).limit(1);

  if (po.status === "delivered" && !pmr) {
    return {
      status: "delivery_recorded_pmr_pending" as const,
      label: "Delivery Recorded — PMR Pending",
      detail: `Delivery has been logged for PO ${po.poNumber}. PMR log is required before closing.`,
      pmrNumber: null,
      completionDate: null,
    };
  }

  if (pmr) {
    return {
      status: "pmr_logged" as const,
      label: "PMR Logged",
      detail: `Logged under PMR reference ${pmr.pmrNumber}.`,
      pmrNumber: pmr.pmrNumber,
      completionDate: pmr.loggedAt,
    };
  }

  return {
    status: "closed" as const,
    label: "Closed",
    detail: "Procurement package is completed and archived.",
    pmrNumber: null,
    completionDate: po.updatedAt,
  };
}
