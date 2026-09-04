// Generated from drizzle/schema.ts for Supabase PostgreSQL. Do not edit manually; rerun scripts/generate-postgres-schema.mjs.
import { decimal, index, integer, json, pgTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";
import { PR_STATUSES, USER_ROLES } from "../shared/procurementRules";

export const users = pgTable("users", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: varchar("role", { length: 64 }).$type<(typeof USER_ROLES)[number]>().default("end_user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const offices = pgTable("offices", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  code: varchar("code", { length: 32 }).notNull().unique(),
  name: varchar("name", { length: 160 }).notNull(),
  isActive: integer("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const objectsOfExpenditure = pgTable("objects_of_expenditure", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  code: varchar("code", { length: 32 }).notNull().unique(),
  name: varchar("name", { length: 180 }).notNull(),
  isActive: integer("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const budgetAllotments = pgTable("budget_allotments", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  officeId: integer("officeId").notNull(),
  objectOfExpenditureId: integer("objectOfExpenditureId").notNull(),
  fiscalYear: integer("fiscalYear").notNull(),
  allottedAmount: decimal("allottedAmount", { precision: 14, scale: 2 }).notNull(),
  committedAmount: decimal("committedAmount", { precision: 14, scale: 2 }).default("0.00").notNull(),
  createdById: integer("createdById").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("budget_allotment_office_object_year_unique").on(table.officeId, table.objectOfExpenditureId, table.fiscalYear),
  index("budget_allotment_office_year_idx").on(table.officeId, table.fiscalYear),
]);

export const suppliers = pgTable("suppliers", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  supplierCode: varchar("supplierCode", { length: 40 }).notNull().unique(),
  companyName: varchar("companyName", { length: 180 }).notNull(),
  contactPerson: varchar("contactPerson", { length: 140 }),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 80 }),
  address: text("address"),
  tin: varchar("tin", { length: 80 }),
  offerings: text("offerings"),
  accreditationStatus: varchar("accreditationStatus", { length: 64 }).default("pending").notNull(),
  isActive: integer("isActive").default(1).notNull(),
  createdById: integer("createdById").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("supplier_company_idx").on(table.companyName)]);

export const supplierTags = pgTable("supplier_tags", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  name: varchar("name", { length: 120 }).notNull().unique(),
  description: varchar("description", { length: 320 }),
  isActive: integer("isActive").default(1).notNull(),
  createdById: integer("createdById").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("supplier_tag_active_idx").on(table.isActive)]);

export const supplierTagAssignments = pgTable("supplier_tag_assignments", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  supplierId: integer("supplierId").notNull(),
  supplierTagId: integer("supplierTagId").notNull(),
  assignedById: integer("assignedById").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("supplier_tag_assignment_unique").on(table.supplierId, table.supplierTagId),
  index("supplier_tag_assignment_supplier_idx").on(table.supplierId),
  index("supplier_tag_assignment_tag_idx").on(table.supplierTagId),
]);

export const procurementCatalogItems = pgTable("procurement_catalog_items", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  source: varchar("source", { length: 80 }).default("Common-use supplies and equipment catalog").notNull(),
  productCode: varchar("productCode", { length: 80 }).notNull().unique(),
  description: text("description").notNull(),
  unit: varchar("unit", { length: 40 }),
  referencePrice: decimal("referencePrice", { precision: 14, scale: 2 }).notNull(),
  remarks: text("remarks"),
  imageUrl: varchar("imageUrl", { length: 500 }),
  sourceAsOfDate: varchar("sourceAsOfDate", { length: 40 }).default("2026-08-17").notNull(),
  isActive: integer("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => [index("procurement_catalog_active_idx").on(table.isActive)]);

export const procurementCatalogFavorites = pgTable("procurement_catalog_favorites", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  userId: integer("userId").notNull(),
  catalogItemId: integer("catalogItemId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("procurement_catalog_favorite_user_item_unique").on(table.userId, table.catalogItemId),
  index("procurement_catalog_favorite_user_idx").on(table.userId),
  index("procurement_catalog_favorite_item_idx").on(table.catalogItemId),
]);

export const procurementCatalogSavedItems = pgTable("procurement_catalog_saved_items", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  userId: integer("userId").notNull(),
  catalogItemId: integer("catalogItemId").notNull(),
  quantity: decimal("quantity", { precision: 12, scale: 2 }).default("1.00").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("procurement_catalog_saved_user_item_unique").on(table.userId, table.catalogItemId),
  index("procurement_catalog_saved_user_idx").on(table.userId),
  index("procurement_catalog_saved_item_idx").on(table.catalogItemId),
]);

export const appPpmpEntries = pgTable("app_ppmp_entries", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  fiscalYear: integer("fiscalYear").notNull(),
  officeId: integer("officeId").notNull(),
  objectOfExpenditureId: integer("objectOfExpenditureId").notNull(),
  catalogItemId: integer("catalogItemId"),
  description: text("description").notNull(),
  papCode: varchar("papCode", { length: 80 }),
  projectTitle: varchar("projectTitle", { length: 220 }),
  modeOfProcurement: varchar("modeOfProcurement", { length: 120 }).default("Small Value Procurement"),
  fundSource: varchar("fundSource", { length: 160 }),
  procurementSchedule: text("procurementSchedule"),
  remarks: text("remarks"),
  plannedAmount: decimal("plannedAmount", { precision: 14, scale: 2 }).notNull(),
  actualAmount: decimal("actualAmount", { precision: 14, scale: 2 }).default("0.00").notNull(),
  status: varchar("status", { length: 64 }).default("draft").notNull(),
  preparedById: integer("preparedById").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => [index("app_ppmp_office_year_idx").on(table.officeId, table.fiscalYear)]);

export const testRecordArchives = pgTable("test_record_archives", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  ppmpEntryId: integer("ppmpEntryId").notNull().unique(),
  archivedById: integer("archivedById").notNull(),
  archiveReason: text("archiveReason").notNull(),
  archivedAt: timestamp("archivedAt").defaultNow().notNull(),
  cleanedAt: timestamp("cleanedAt"),
}, (table) => [index("test_record_archive_status_idx").on(table.cleanedAt, table.archivedAt)]);

export const purchaseRequests = pgTable("purchase_requests", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  prNumber: varchar("prNumber", { length: 40 }).notNull().unique(),
  purpose: text("purpose").notNull(),
  fundSource: varchar("fundSource", { length: 160 }),
  entityName: varchar("entityName", { length: 180 }).default("Batanes State College").notNull(),
  fundCluster: varchar("fundCluster", { length: 80 }).default("01101101").notNull(),
  responsibilityCenterCode: varchar("responsibilityCenterCode", { length: 80 }),
  requesterDesignation: varchar("requesterDesignation", { length: 160 }),
  requestedSignatoryId: integer("requestedSignatoryId"),
  requestedSignatoryName: varchar("requestedSignatoryName", { length: 180 }),
  approvedSignatoryId: integer("approvedSignatoryId"),
  approvedSignatoryName: varchar("approvedSignatoryName", { length: 180 }),
  approvedSignatoryDesignation: varchar("approvedSignatoryDesignation", { length: 160 }),
  officeId: integer("officeId").notNull(),
  objectOfExpenditureId: integer("objectOfExpenditureId").notNull(),
  totalEstimate: decimal("totalEstimate", { precision: 14, scale: 2 }).notNull(),
  status: varchar("status", { length: 64 }).$type<(typeof PR_STATUSES)[number]>().default("draft").notNull(),
  requestedById: integer("requestedById").notNull(),
  trackingToken: varchar("trackingToken", { length: 48 }).notNull().unique(),
  ppmpEntryId: integer("ppmpEntryId"),
  procurementReviewedById: integer("procurementReviewedById"),
  administrativeApprovedById: integer("administrativeApprovedById"),
  budgetReviewedById: integer("budgetReviewedById"),
  supplyReviewedById: integer("supplyReviewedById"),
  bacReviewedById: integer("bacReviewedById"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  submittedAt: timestamp("submittedAt"),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => [
  index("pr_requester_status_idx").on(table.requestedById, table.status),
  index("pr_office_status_idx").on(table.officeId, table.status),
]);

export const purchaseRequestItems = pgTable("purchase_request_items", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  purchaseRequestId: integer("purchaseRequestId").notNull(),
  catalogItemId: integer("catalogItemId"),
  description: text("description").notNull(),
  stockPropertyNo: varchar("stockPropertyNo", { length: 80 }),
  specification: text("specification"),
  quantity: decimal("quantity", { precision: 12, scale: 2 }).notNull(),
  unit: varchar("unit", { length: 40 }).notNull(),
  estimatedUnitCost: decimal("estimatedUnitCost", { precision: 14, scale: 2 }).notNull(),
  totalCost: decimal("totalCost", { precision: 14, scale: 2 }).notNull(),
}, (table) => [index("pr_item_pr_idx").on(table.purchaseRequestId), index("pr_item_catalog_idx").on(table.catalogItemId)]);

export const preCanvasses = pgTable("pre_canvasses", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  preCanvassNumber: varchar("preCanvassNumber", { length: 40 }).notNull().unique(),
  purchaseRequestId: integer("purchaseRequestId").notNull().unique(),
  status: varchar("status", { length: 64 }).default("draft").notNull(),
  approvedBudget: decimal("approvedBudget", { precision: 14, scale: 2 }),
  quotationDeadline: timestamp("quotationDeadline"),
  deliveryPeriodDays: integer("deliveryPeriodDays"),
  priceEvaluationMode: varchar("priceEvaluationMode", { length: 80 }).default("lot_basis"),
  preparedById: integer("preparedById").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const preCanvassQuotes = pgTable("pre_canvass_quotes", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  preCanvassId: integer("preCanvassId").notNull(),
  supplierId: integer("supplierId").notNull(),
  totalPrice: decimal("totalPrice", { precision: 14, scale: 2 }).notNull(),
  deliveryDays: integer("deliveryDays").notNull(),
  isCompliant: integer("isCompliant").default(1).notNull(),
  notes: text("notes"),
  quotationReference: varchar("quotationReference", { length: 80 }),
  supplierRepresentative: varchar("supplierRepresentative", { length: 160 }),
  acknowledgedAt: timestamp("acknowledgedAt"),
  receivedBy: varchar("receivedBy", { length: 160 }),
  submittedAt: timestamp("submittedAt").defaultNow().notNull(),
}, (table) => [uniqueIndex("pre_canvass_quote_supplier_unique").on(table.preCanvassId, table.supplierId)]);

export const abstractsOfCanvass = pgTable("abstracts_of_canvass", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  abstractNumber: varchar("abstractNumber", { length: 40 }).notNull().unique(),
  preCanvassId: integer("preCanvassId").notNull().unique(),
  recommendedSupplierId: integer("recommendedSupplierId").notNull(),
  recommendationReason: text("recommendationReason").notNull(),
  openingDate: timestamp("openingDate").defaultNow().notNull(),
  openingLocation: varchar("openingLocation", { length: 160 }).default("Basco, Batanes").notNull(),
  procurementCategory: varchar("procurementCategory", { length: 120 }).default("Supplies and materials").notNull(),
  status: varchar("status", { length: 64 }).default("recommended").notNull(),
  preparedById: integer("preparedById").notNull(),
  decidedById: integer("decidedById"),
  decisionRemarks: text("decisionRemarks"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const rfqs = pgTable("rfqs", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  rfqNumber: varchar("rfqNumber", { length: 40 }).notNull().unique(),
  purchaseRequestId: integer("purchaseRequestId").notNull().unique(),
  status: varchar("status", { length: 64 }).default("draft").notNull(),
  createdById: integer("createdById").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const supplierQuotations = pgTable("supplier_quotations", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  rfqId: integer("rfqId").notNull(),
  supplierId: integer("supplierId").notNull(),
  totalPrice: decimal("totalPrice", { precision: 14, scale: 2 }).notNull(),
  deliveryDays: integer("deliveryDays").notNull(),
  isCompliant: integer("isCompliant").default(1).notNull(),
  notes: text("notes"),
  submittedAt: timestamp("submittedAt").defaultNow().notNull(),
}, (table) => [uniqueIndex("supplier_quote_rfq_supplier_unique").on(table.rfqId, table.supplierId)]);

export const quotationAbstracts = pgTable("quotation_abstracts", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  rfqId: integer("rfqId").notNull().unique(),
  recommendedSupplierId: integer("recommendedSupplierId").notNull(),
  recommendationReason: text("recommendationReason").notNull(),
  status: varchar("status", { length: 64 }).default("draft").notNull(),
  preparedById: integer("preparedById").notNull(),
  approvedById: integer("approvedById"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const purchaseOrders = pgTable("purchase_orders", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  poNumber: varchar("poNumber", { length: 40 }).notNull().unique(),
  purchaseRequestId: integer("purchaseRequestId").notNull().unique(),
  rfqId: integer("rfqId").unique(),
  preCanvassId: integer("preCanvassId").unique(),
  supplierId: integer("supplierId").notNull(),
  totalAmount: decimal("totalAmount", { precision: 14, scale: 2 }).notNull(),
  placeOfDelivery: varchar("placeOfDelivery", { length: 220 }),
  scheduledDeliveryDate: timestamp("scheduledDeliveryDate"),
  deliveryTerm: varchar("deliveryTerm", { length: 120 }).default("FOB Destination"),
  paymentTerm: varchar("paymentTerm", { length: 160 }).default("15 days upon complete delivery"),
  modeOfProcurement: varchar("modeOfProcurement", { length: 120 }),
  fundCluster: varchar("fundCluster", { length: 80 }),
  orsBursNumber: varchar("orsBursNumber", { length: 80 }),
  fundsAvailable: decimal("fundsAvailable", { precision: 14, scale: 2 }),
  authorizedOfficialName: varchar("authorizedOfficialName", { length: 180 }),
  authorizedOfficialDesignation: varchar("authorizedOfficialDesignation", { length: 160 }),
  chiefAccountantName: varchar("chiefAccountantName", { length: 180 }),
  status: varchar("status", { length: 64 }).default("draft").notNull(),
  generatedById: integer("generatedById").notNull(),
  approvedById: integer("approvedById"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const deliveryReceipts = pgTable("delivery_receipts", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  purchaseOrderId: integer("purchaseOrderId").notNull().unique(),
  receiptNumber: varchar("receiptNumber", { length: 40 }).notNull().unique(),
  deliveredAt: timestamp("deliveredAt").defaultNow().notNull(),
  receivedById: integer("receivedById").notNull(),
  receivedByName: varchar("receivedByName", { length: 180 }),
  deliveryStatus: varchar("deliveryStatus", { length: 64 }).default("complete").notNull(),
  signatureReference: text("signatureReference"),
  remarks: text("remarks"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const pmrLogs = pgTable("pmr_logs", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  purchaseOrderId: integer("purchaseOrderId").notNull().unique(),
  pmrNumber: varchar("pmrNumber", { length: 40 }).notNull().unique(),
  remarks: text("remarks"),
  loggedById: integer("loggedById").notNull(),
  loggedAt: timestamp("loggedAt").defaultNow().notNull(),
});

export const procurementSettings = pgTable("procurement_settings", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  entityName: varchar("entityName", { length: 180 }).default("Batanes State College").notNull(),
  authorizedOfficialName: varchar("authorizedOfficialName", { length: 180 }),
  authorizedOfficialDesignation: varchar("authorizedOfficialDesignation", { length: 160 }),
  chiefAccountantName: varchar("chiefAccountantName", { length: 180 }),
  defaultNoticeSignatory: varchar("defaultNoticeSignatory", { length: 180 }),
  sessionTimeoutMinutes: integer("sessionTimeoutMinutes").default(30).notNull(),
  enableInAppNotifications: integer("enableInAppNotifications").default(1).notNull(),
  notificationRefreshSeconds: integer("notificationRefreshSeconds").default(15).notNull(),
  updatedById: integer("updatedById"),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const procurementSignatories = pgTable("procurement_signatories", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  fullName: varchar("fullName", { length: 180 }).notNull(),
  designation: varchar("designation", { length: 160 }).notNull(),
  mayRequest: integer("mayRequest").default(0).notNull(),
  mayApprove: integer("mayApprove").default(0).notNull(),
  isActive: integer("isActive").default(1).notNull(),
  createdById: integer("createdById").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("procurement_signatory_active_idx").on(table.isActive, table.mayRequest, table.mayApprove)]);

export const procurementDocuments = pgTable("procurement_documents", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  entityType: varchar("entityType", { length: 64 }).notNull(),
  entityId: integer("entityId").notNull(),
  documentType: varchar("documentType", { length: 80 }).notNull(),
  originalFileName: varchar("originalFileName", { length: 255 }).notNull(),
  mimeType: varchar("mimeType", { length: 120 }).notNull(),
  storageKey: varchar("storageKey", { length: 512 }).notNull().unique(),
  storageUrl: varchar("storageUrl", { length: 512 }).notNull(),
  fileSize: integer("fileSize").notNull(),
  uploadedById: integer("uploadedById").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("document_entity_created_idx").on(table.entityType, table.entityId, table.createdAt), index("document_uploader_created_idx").on(table.uploadedById, table.createdAt)]);

export const workflowCorrections = pgTable("workflow_corrections", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  entityType: varchar("entityType", { length: 64 }).notNull(),
  entityId: integer("entityId").notNull(),
  requestedById: integer("requestedById").notNull(),
  assignedToId: integer("assignedToId").notNull(),
  reason: text("reason").notNull(),
  status: varchar("status", { length: 64 }).default("open").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  resolvedAt: timestamp("resolvedAt"),
}, (table) => [index("correction_entity_created_idx").on(table.entityType, table.entityId, table.createdAt), index("correction_assignee_status_idx").on(table.assignedToId, table.status)]);

export const workflowNotifications = pgTable("workflow_notifications", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  recipientUserId: integer("recipientUserId").notNull(),
  kind: varchar("kind", { length: 64 }).notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  body: text("body").notNull(),
  entityType: varchar("entityType", { length: 64 }).notNull(),
  entityId: integer("entityId").notNull(),
  readAt: timestamp("readAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("notification_recipient_read_created_idx").on(table.recipientUserId, table.readAt, table.createdAt)]);

export const lettersOfNotice = pgTable("letters_of_notice", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  noticeNumber: varchar("noticeNumber", { length: 48 }).notNull().unique(),
  noticeType: varchar("noticeType", { length: 64 }).default("other").notNull(),
  purchaseRequestId: integer("purchaseRequestId"),
  supplierId: integer("supplierId"),
  subject: varchar("subject", { length: 220 }).notNull(),
  body: text("body").notNull(),
  status: varchar("status", { length: 64 }).default("draft").notNull(),
  issuedById: integer("issuedById").notNull(),
  issuedAt: timestamp("issuedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => [index("notice_pr_created_idx").on(table.purchaseRequestId, table.createdAt)]);

export const bacTransmittals = pgTable("bac_transmittals", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  transmittalNumber: varchar("transmittalNumber", { length: 48 }).notNull().unique(),
  purchaseRequestId: integer("purchaseRequestId"),
  fromOffice: varchar("fromOffice", { length: 180 }).notNull(),
  toOffice: varchar("toOffice", { length: 180 }).notNull(),
  subject: varchar("subject", { length: 220 }).notNull(),
  remarks: text("remarks"),
  status: varchar("status", { length: 64 }).default("draft").notNull(),
  preparedById: integer("preparedById").notNull(),
  sentAt: timestamp("sentAt"),
  acknowledgedByName: varchar("acknowledgedByName", { length: 180 }),
  acknowledgedAt: timestamp("acknowledgedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => [index("transmittal_pr_created_idx").on(table.purchaseRequestId, table.createdAt)]);

export const supplierEvaluations = pgTable("supplier_evaluations", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  supplierId: integer("supplierId").notNull(),
  purchaseOrderId: integer("purchaseOrderId"),
  purchaseRequestId: integer("purchaseRequestId"),
  reportedPurchaseRequestNumber: varchar("reportedPurchaseRequestNumber", { length: 80 }),
  urgentPurchaseRequestReason: text("urgentPurchaseRequestReason"),
  urgentPurchaseRequestUpdatedById: integer("urgentPurchaseRequestUpdatedById"),
  urgentPurchaseRequestUpdatedAt: timestamp("urgentPurchaseRequestUpdatedAt"),
  officeId: integer("officeId"),
  evaluationAudience: varchar("evaluationAudience", { length: 32 }).$type<"end_user" | "procurement_office">().default("procurement_office").notNull(),
  goodsServicesType: varchar("goodsServicesType", { length: 220 }),
  supplierRegistryReference: varchar("supplierRegistryReference", { length: 160 }),
  supplierRegistryRegisteredAt: timestamp("supplierRegistryRegisteredAt"),
  supplierRegistryExpiresAt: timestamp("supplierRegistryExpiresAt"),
  responseScores: json("responseScores").$type<Record<string, number>>(),
  qualityScore: integer("qualityScore").notNull(),
  deliveryScore: integer("deliveryScore").notNull(),
  pricingScore: integer("pricingScore").notNull(),
  complianceScore: integer("complianceScore").notNull(),
  remarks: text("remarks"),
  respondentName: varchar("respondentName", { length: 180 }),
  respondentSignedAt: timestamp("respondentSignedAt"),
  evaluatedById: integer("evaluatedById").notNull(),
  evaluatedAt: timestamp("evaluatedAt").defaultNow().notNull(),
}, (table) => [index("supplier_evaluation_supplier_date_idx").on(table.supplierId, table.evaluatedAt)]);

export const supplierEvaluationApprovals = pgTable("supplier_evaluation_approvals", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  supplierEvaluationId: integer("supplierEvaluationId").notNull().unique(),
  approvedById: integer("approvedById").notNull(),
  approverName: varchar("approverName", { length: 180 }).notNull(),
  approverDesignation: varchar("approverDesignation", { length: 180 }).notNull(),
  consentStatement: text("consentStatement").notNull(),
  signatureDigest: varchar("signatureDigest", { length: 128 }).notNull(),
  approvedAt: timestamp("approvedAt").defaultNow().notNull(),
}, (table) => [index("supplier_evaluation_approval_approver_date_idx").on(table.approvedById, table.approvedAt)]);

export const mcdmRecommendations = pgTable("mcdm_recommendations", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  preCanvassId: integer("preCanvassId").notNull().unique(),
  recommendedSupplierId: integer("recommendedSupplierId").notNull(),
  priceScore: decimal("priceScore", { precision: 7, scale: 2 }).notNull(),
  deliveryScore: decimal("deliveryScore", { precision: 7, scale: 2 }).notNull(),
  complianceScore: decimal("complianceScore", { precision: 7, scale: 2 }).notNull(),
  totalScore: decimal("totalScore", { precision: 7, scale: 2 }).notNull(),
  rationale: text("rationale").notNull(),
  createdById: integer("createdById").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const bestValuePolicies = pgTable("best_value_policies", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  policyCode: varchar("policyCode", { length: 64 }).notNull(),
  name: varchar("name", { length: 180 }).notNull(),
  version: integer("version").notNull(),
  isActive: integer("isActive").default(1).notNull(),
  totalWeight: decimal("totalWeight", { precision: 7, scale: 2 }).notNull(),
  createdById: integer("createdById").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  deactivatedAt: timestamp("deactivatedAt"),
}, (table) => [
  uniqueIndex("best_value_policy_code_version_unique").on(table.policyCode, table.version),
  index("best_value_policy_active_created_idx").on(table.isActive, table.createdAt),
]);

export const bestValuePolicyCriteria = pgTable("best_value_policy_criteria", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  policyId: integer("policyId").notNull(),
  criterionKey: varchar("criterionKey", { length: 80 }).notNull(),
  label: varchar("label", { length: 180 }).notNull(),
  description: text("description"),
  weight: decimal("weight", { precision: 7, scale: 2 }).notNull(),
  sortOrder: integer("sortOrder").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("best_value_policy_criterion_unique").on(table.policyId, table.criterionKey),
  index("best_value_policy_criteria_policy_order_idx").on(table.policyId, table.sortOrder),
]);

export const historicalPrices = pgTable("historical_prices", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  itemDescription: varchar("itemDescription", { length: 220 }).notNull(),
  unit: varchar("unit", { length: 40 }).notNull(),
  unitPrice: decimal("unitPrice", { precision: 14, scale: 2 }).notNull(),
  supplierId: integer("supplierId"),
  purchaseOrderId: integer("purchaseOrderId"),
  observedAt: timestamp("observedAt").defaultNow().notNull(),
  recordedById: integer("recordedById").notNull(),
}, (table) => [index("historical_price_item_observed_idx").on(table.itemDescription, table.observedAt)]);

export const auditTrails = pgTable("audit_trails", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  entityType: varchar("entityType", { length: 64 }).notNull(),
  entityId: integer("entityId").notNull(),
  action: varchar("action", { length: 100 }).notNull(),
  performedById: integer("performedById").notNull(),
  performedByRole: varchar("performedByRole", { length: 64 }).notNull(),
  details: json("details").$type<Record<string, unknown>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("audit_entity_created_idx").on(table.entityType, table.entityId, table.createdAt)]);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type PurchaseRequest = typeof purchaseRequests.$inferSelect;
