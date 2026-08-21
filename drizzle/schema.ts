import { decimal, index, int, json, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";
import { PR_STATUSES, USER_ROLES } from "../shared/procurementRules";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", USER_ROLES).default("end_user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const offices = mysqlTable("offices", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 32 }).notNull().unique(),
  name: varchar("name", { length: 160 }).notNull(),
  isActive: int("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const objectsOfExpenditure = mysqlTable("objects_of_expenditure", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 32 }).notNull().unique(),
  name: varchar("name", { length: 180 }).notNull(),
  isActive: int("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const budgetAllotments = mysqlTable("budget_allotments", {
  id: int("id").autoincrement().primaryKey(),
  officeId: int("officeId").notNull(),
  objectOfExpenditureId: int("objectOfExpenditureId").notNull(),
  fiscalYear: int("fiscalYear").notNull(),
  allottedAmount: decimal("allottedAmount", { precision: 14, scale: 2 }).notNull(),
  committedAmount: decimal("committedAmount", { precision: 14, scale: 2 }).default("0.00").notNull(),
  createdById: int("createdById").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  uniqueIndex("budget_allotment_office_object_year_unique").on(table.officeId, table.objectOfExpenditureId, table.fiscalYear),
  index("budget_allotment_office_year_idx").on(table.officeId, table.fiscalYear),
]);

export const suppliers = mysqlTable("suppliers", {
  id: int("id").autoincrement().primaryKey(),
  supplierCode: varchar("supplierCode", { length: 40 }).notNull().unique(),
  companyName: varchar("companyName", { length: 180 }).notNull(),
  contactPerson: varchar("contactPerson", { length: 140 }),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 80 }),
  address: text("address"),
  tin: varchar("tin", { length: 80 }),
  offerings: text("offerings"),
  accreditationStatus: mysqlEnum("accreditationStatus", ["pending", "accredited", "suspended"]).default("pending").notNull(),
  isActive: int("isActive").default(1).notNull(),
  createdById: int("createdById").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("supplier_company_idx").on(table.companyName)]);

export const supplierTags = mysqlTable("supplier_tags", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 120 }).notNull().unique(),
  description: varchar("description", { length: 320 }),
  isActive: int("isActive").default(1).notNull(),
  createdById: int("createdById").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("supplier_tag_active_idx").on(table.isActive)]);

export const supplierTagAssignments = mysqlTable("supplier_tag_assignments", {
  id: int("id").autoincrement().primaryKey(),
  supplierId: int("supplierId").notNull(),
  supplierTagId: int("supplierTagId").notNull(),
  assignedById: int("assignedById").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("supplier_tag_assignment_unique").on(table.supplierId, table.supplierTagId),
  index("supplier_tag_assignment_supplier_idx").on(table.supplierId),
  index("supplier_tag_assignment_tag_idx").on(table.supplierTagId),
]);

export const procurementCatalogItems = mysqlTable("procurement_catalog_items", {
  id: int("id").autoincrement().primaryKey(),
  source: varchar("source", { length: 80 }).default("PhilGEPS common-use supplies and equipment").notNull(),
  productCode: varchar("productCode", { length: 80 }).notNull().unique(),
  description: text("description").notNull(),
  unit: varchar("unit", { length: 40 }),
  referencePrice: decimal("referencePrice", { precision: 14, scale: 2 }).notNull(),
  remarks: text("remarks"),
  imageUrl: varchar("imageUrl", { length: 500 }),
  sourceAsOfDate: varchar("sourceAsOfDate", { length: 40 }).default("2026-08-17").notNull(),
  isActive: int("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("procurement_catalog_active_idx").on(table.isActive)]);

export const procurementCatalogFavorites = mysqlTable("procurement_catalog_favorites", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  catalogItemId: int("catalogItemId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("procurement_catalog_favorite_user_item_unique").on(table.userId, table.catalogItemId),
  index("procurement_catalog_favorite_user_idx").on(table.userId),
  index("procurement_catalog_favorite_item_idx").on(table.catalogItemId),
]);

export const appPpmpEntries = mysqlTable("app_ppmp_entries", {
  id: int("id").autoincrement().primaryKey(),
  fiscalYear: int("fiscalYear").notNull(),
  officeId: int("officeId").notNull(),
  objectOfExpenditureId: int("objectOfExpenditureId").notNull(),
  catalogItemId: int("catalogItemId"),
  description: text("description").notNull(),
  papCode: varchar("papCode", { length: 80 }),
  projectTitle: varchar("projectTitle", { length: 220 }),
  modeOfProcurement: varchar("modeOfProcurement", { length: 120 }).default("Small Value Procurement"),
  fundSource: varchar("fundSource", { length: 160 }),
  procurementSchedule: text("procurementSchedule"),
  remarks: text("remarks"),
  plannedAmount: decimal("plannedAmount", { precision: 14, scale: 2 }).notNull(),
  actualAmount: decimal("actualAmount", { precision: 14, scale: 2 }).default("0.00").notNull(),
  status: mysqlEnum("status", ["draft", "submitted", "approved", "monitored"]).default("draft").notNull(),
  preparedById: int("preparedById").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("app_ppmp_office_year_idx").on(table.officeId, table.fiscalYear)]);

export const purchaseRequests = mysqlTable("purchase_requests", {
  id: int("id").autoincrement().primaryKey(),
  prNumber: varchar("prNumber", { length: 40 }).notNull().unique(),
  purpose: text("purpose").notNull(),
  fundSource: varchar("fundSource", { length: 160 }),
  entityName: varchar("entityName", { length: 180 }).default("Batanes State College").notNull(),
  fundCluster: varchar("fundCluster", { length: 80 }).default("01101101").notNull(),
  responsibilityCenterCode: varchar("responsibilityCenterCode", { length: 80 }),
  requesterDesignation: varchar("requesterDesignation", { length: 160 }),
  officeId: int("officeId").notNull(),
  objectOfExpenditureId: int("objectOfExpenditureId").notNull(),
  totalEstimate: decimal("totalEstimate", { precision: 14, scale: 2 }).notNull(),
  status: mysqlEnum("status", PR_STATUSES).default("draft").notNull(),
  requestedById: int("requestedById").notNull(),
  trackingToken: varchar("trackingToken", { length: 48 }).notNull().unique(),
  ppmpEntryId: int("ppmpEntryId"),
  procurementReviewedById: int("procurementReviewedById"),
  administrativeApprovedById: int("administrativeApprovedById"),
  budgetReviewedById: int("budgetReviewedById"),
  supplyReviewedById: int("supplyReviewedById"),
  bacReviewedById: int("bacReviewedById"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  submittedAt: timestamp("submittedAt"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("pr_requester_status_idx").on(table.requestedById, table.status),
  index("pr_office_status_idx").on(table.officeId, table.status),
]);

export const purchaseRequestItems = mysqlTable("purchase_request_items", {
  id: int("id").autoincrement().primaryKey(),
  purchaseRequestId: int("purchaseRequestId").notNull(),
  catalogItemId: int("catalogItemId"),
  description: text("description").notNull(),
  stockPropertyNo: varchar("stockPropertyNo", { length: 80 }),
  specification: text("specification"),
  quantity: decimal("quantity", { precision: 12, scale: 2 }).notNull(),
  unit: varchar("unit", { length: 40 }).notNull(),
  estimatedUnitCost: decimal("estimatedUnitCost", { precision: 14, scale: 2 }).notNull(),
  totalCost: decimal("totalCost", { precision: 14, scale: 2 }).notNull(),
}, (table) => [index("pr_item_pr_idx").on(table.purchaseRequestId), index("pr_item_catalog_idx").on(table.catalogItemId)]);

export const preCanvasses = mysqlTable("pre_canvasses", {
  id: int("id").autoincrement().primaryKey(),
  preCanvassNumber: varchar("preCanvassNumber", { length: 40 }).notNull().unique(),
  purchaseRequestId: int("purchaseRequestId").notNull().unique(),
  status: mysqlEnum("status", ["draft", "submitted", "reviewed", "abstracted", "approved", "rejected"]).default("draft").notNull(),
  approvedBudget: decimal("approvedBudget", { precision: 14, scale: 2 }),
  quotationDeadline: timestamp("quotationDeadline"),
  deliveryPeriodDays: int("deliveryPeriodDays"),
  priceEvaluationMode: varchar("priceEvaluationMode", { length: 80 }).default("lot_basis"),
  preparedById: int("preparedById").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const preCanvassQuotes = mysqlTable("pre_canvass_quotes", {
  id: int("id").autoincrement().primaryKey(),
  preCanvassId: int("preCanvassId").notNull(),
  supplierId: int("supplierId").notNull(),
  totalPrice: decimal("totalPrice", { precision: 14, scale: 2 }).notNull(),
  deliveryDays: int("deliveryDays").notNull(),
  isCompliant: int("isCompliant").default(1).notNull(),
  notes: text("notes"),
  quotationReference: varchar("quotationReference", { length: 80 }),
  supplierRepresentative: varchar("supplierRepresentative", { length: 160 }),
  acknowledgedAt: timestamp("acknowledgedAt"),
  receivedBy: varchar("receivedBy", { length: 160 }),
  submittedAt: timestamp("submittedAt").defaultNow().notNull(),
}, (table) => [uniqueIndex("pre_canvass_quote_supplier_unique").on(table.preCanvassId, table.supplierId)]);

export const abstractsOfCanvass = mysqlTable("abstracts_of_canvass", {
  id: int("id").autoincrement().primaryKey(),
  abstractNumber: varchar("abstractNumber", { length: 40 }).notNull().unique(),
  preCanvassId: int("preCanvassId").notNull().unique(),
  recommendedSupplierId: int("recommendedSupplierId").notNull(),
  recommendationReason: text("recommendationReason").notNull(),
  openingDate: timestamp("openingDate").defaultNow().notNull(),
  openingLocation: varchar("openingLocation", { length: 160 }).default("Basco, Batanes").notNull(),
  procurementCategory: varchar("procurementCategory", { length: 120 }).default("Supplies and materials").notNull(),
  status: mysqlEnum("status", ["recommended", "returned", "approved", "rejected"]).default("recommended").notNull(),
  preparedById: int("preparedById").notNull(),
  decidedById: int("decidedById"),
  decisionRemarks: text("decisionRemarks"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const rfqs = mysqlTable("rfqs", {
  id: int("id").autoincrement().primaryKey(),
  rfqNumber: varchar("rfqNumber", { length: 40 }).notNull().unique(),
  purchaseRequestId: int("purchaseRequestId").notNull().unique(),
  status: mysqlEnum("status", ["draft", "canvass", "abstracted", "approved", "closed"]).default("draft").notNull(),
  createdById: int("createdById").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const supplierQuotations = mysqlTable("supplier_quotations", {
  id: int("id").autoincrement().primaryKey(),
  rfqId: int("rfqId").notNull(),
  supplierId: int("supplierId").notNull(),
  totalPrice: decimal("totalPrice", { precision: 14, scale: 2 }).notNull(),
  deliveryDays: int("deliveryDays").notNull(),
  isCompliant: int("isCompliant").default(1).notNull(),
  notes: text("notes"),
  submittedAt: timestamp("submittedAt").defaultNow().notNull(),
}, (table) => [uniqueIndex("supplier_quote_rfq_supplier_unique").on(table.rfqId, table.supplierId)]);

export const quotationAbstracts = mysqlTable("quotation_abstracts", {
  id: int("id").autoincrement().primaryKey(),
  rfqId: int("rfqId").notNull().unique(),
  recommendedSupplierId: int("recommendedSupplierId").notNull(),
  recommendationReason: text("recommendationReason").notNull(),
  status: mysqlEnum("status", ["draft", "recommended", "approved", "rejected"]).default("draft").notNull(),
  preparedById: int("preparedById").notNull(),
  approvedById: int("approvedById"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const purchaseOrders = mysqlTable("purchase_orders", {
  id: int("id").autoincrement().primaryKey(),
  poNumber: varchar("poNumber", { length: 40 }).notNull().unique(),
  purchaseRequestId: int("purchaseRequestId").notNull().unique(),
  rfqId: int("rfqId").unique(),
  preCanvassId: int("preCanvassId").unique(),
  supplierId: int("supplierId").notNull(),
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
  status: mysqlEnum("status", ["draft", "pending_approval", "approved", "issued", "returned", "delivered", "closed"]).default("draft").notNull(),
  generatedById: int("generatedById").notNull(),
  approvedById: int("approvedById"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const deliveryReceipts = mysqlTable("delivery_receipts", {
  id: int("id").autoincrement().primaryKey(),
  purchaseOrderId: int("purchaseOrderId").notNull().unique(),
  receiptNumber: varchar("receiptNumber", { length: 40 }).notNull().unique(),
  deliveredAt: timestamp("deliveredAt").defaultNow().notNull(),
  receivedById: int("receivedById").notNull(),
  receivedByName: varchar("receivedByName", { length: 180 }),
  deliveryStatus: mysqlEnum("deliveryStatus", ["complete", "partial"]).default("complete").notNull(),
  signatureReference: text("signatureReference"),
  remarks: text("remarks"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const pmrLogs = mysqlTable("pmr_logs", {
  id: int("id").autoincrement().primaryKey(),
  purchaseOrderId: int("purchaseOrderId").notNull().unique(),
  pmrNumber: varchar("pmrNumber", { length: 40 }).notNull().unique(),
  remarks: text("remarks"),
  loggedById: int("loggedById").notNull(),
  loggedAt: timestamp("loggedAt").defaultNow().notNull(),
});

export const procurementSettings = mysqlTable("procurement_settings", {
  id: int("id").autoincrement().primaryKey(),
  entityName: varchar("entityName", { length: 180 }).default("Batanes State College").notNull(),
  authorizedOfficialName: varchar("authorizedOfficialName", { length: 180 }),
  authorizedOfficialDesignation: varchar("authorizedOfficialDesignation", { length: 160 }),
  chiefAccountantName: varchar("chiefAccountantName", { length: 180 }),
  defaultNoticeSignatory: varchar("defaultNoticeSignatory", { length: 180 }),
  sessionTimeoutMinutes: int("sessionTimeoutMinutes").default(30).notNull(),
  enableInAppNotifications: int("enableInAppNotifications").default(1).notNull(),
  notificationRefreshSeconds: int("notificationRefreshSeconds").default(15).notNull(),
  updatedById: int("updatedById"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const procurementDocuments = mysqlTable("procurement_documents", {
  id: int("id").autoincrement().primaryKey(),
  entityType: mysqlEnum("entityType", ["app_ppmp_entry", "purchase_request", "pre_canvass", "pre_canvass_quote", "abstract_of_canvass", "purchase_order", "delivery_receipt", "pmr_log"]).notNull(),
  entityId: int("entityId").notNull(),
  documentType: varchar("documentType", { length: 80 }).notNull(),
  originalFileName: varchar("originalFileName", { length: 255 }).notNull(),
  mimeType: varchar("mimeType", { length: 120 }).notNull(),
  storageKey: varchar("storageKey", { length: 512 }).notNull().unique(),
  storageUrl: varchar("storageUrl", { length: 512 }).notNull(),
  fileSize: int("fileSize").notNull(),
  uploadedById: int("uploadedById").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("document_entity_created_idx").on(table.entityType, table.entityId, table.createdAt), index("document_uploader_created_idx").on(table.uploadedById, table.createdAt)]);

export const workflowCorrections = mysqlTable("workflow_corrections", {
  id: int("id").autoincrement().primaryKey(),
  entityType: mysqlEnum("entityType", ["purchase_request", "pre_canvass", "abstract_of_canvass", "purchase_order"]).notNull(),
  entityId: int("entityId").notNull(),
  requestedById: int("requestedById").notNull(),
  assignedToId: int("assignedToId").notNull(),
  reason: text("reason").notNull(),
  status: mysqlEnum("status", ["open", "resubmitted", "resolved"]).default("open").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  resolvedAt: timestamp("resolvedAt"),
}, (table) => [index("correction_entity_created_idx").on(table.entityType, table.entityId, table.createdAt), index("correction_assignee_status_idx").on(table.assignedToId, table.status)]);

export const workflowNotifications = mysqlTable("workflow_notifications", {
  id: int("id").autoincrement().primaryKey(),
  recipientUserId: int("recipientUserId").notNull(),
  kind: mysqlEnum("kind", ["action_required", "status_change", "correction", "document"]).notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  body: text("body").notNull(),
  entityType: varchar("entityType", { length: 64 }).notNull(),
  entityId: int("entityId").notNull(),
  readAt: timestamp("readAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("notification_recipient_read_created_idx").on(table.recipientUserId, table.readAt, table.createdAt)]);

export const lettersOfNotice = mysqlTable("letters_of_notice", {
  id: int("id").autoincrement().primaryKey(),
  noticeNumber: varchar("noticeNumber", { length: 48 }).notNull().unique(),
  noticeType: mysqlEnum("noticeType", ["award", "disqualification", "clarification", "other"]).default("other").notNull(),
  purchaseRequestId: int("purchaseRequestId"),
  supplierId: int("supplierId"),
  subject: varchar("subject", { length: 220 }).notNull(),
  body: text("body").notNull(),
  status: mysqlEnum("status", ["draft", "issued", "cancelled"]).default("draft").notNull(),
  issuedById: int("issuedById").notNull(),
  issuedAt: timestamp("issuedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("notice_pr_created_idx").on(table.purchaseRequestId, table.createdAt)]);

export const bacTransmittals = mysqlTable("bac_transmittals", {
  id: int("id").autoincrement().primaryKey(),
  transmittalNumber: varchar("transmittalNumber", { length: 48 }).notNull().unique(),
  purchaseRequestId: int("purchaseRequestId"),
  fromOffice: varchar("fromOffice", { length: 180 }).notNull(),
  toOffice: varchar("toOffice", { length: 180 }).notNull(),
  subject: varchar("subject", { length: 220 }).notNull(),
  remarks: text("remarks"),
  status: mysqlEnum("status", ["draft", "sent", "acknowledged"]).default("draft").notNull(),
  preparedById: int("preparedById").notNull(),
  sentAt: timestamp("sentAt"),
  acknowledgedByName: varchar("acknowledgedByName", { length: 180 }),
  acknowledgedAt: timestamp("acknowledgedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("transmittal_pr_created_idx").on(table.purchaseRequestId, table.createdAt)]);

export const supplierEvaluations = mysqlTable("supplier_evaluations", {
  id: int("id").autoincrement().primaryKey(),
  supplierId: int("supplierId").notNull(),
  purchaseOrderId: int("purchaseOrderId"),
  qualityScore: int("qualityScore").notNull(),
  deliveryScore: int("deliveryScore").notNull(),
  pricingScore: int("pricingScore").notNull(),
  complianceScore: int("complianceScore").notNull(),
  remarks: text("remarks"),
  evaluatedById: int("evaluatedById").notNull(),
  evaluatedAt: timestamp("evaluatedAt").defaultNow().notNull(),
}, (table) => [index("supplier_evaluation_supplier_date_idx").on(table.supplierId, table.evaluatedAt)]);

export const mcdmRecommendations = mysqlTable("mcdm_recommendations", {
  id: int("id").autoincrement().primaryKey(),
  preCanvassId: int("preCanvassId").notNull().unique(),
  recommendedSupplierId: int("recommendedSupplierId").notNull(),
  priceScore: decimal("priceScore", { precision: 7, scale: 2 }).notNull(),
  deliveryScore: decimal("deliveryScore", { precision: 7, scale: 2 }).notNull(),
  complianceScore: decimal("complianceScore", { precision: 7, scale: 2 }).notNull(),
  totalScore: decimal("totalScore", { precision: 7, scale: 2 }).notNull(),
  rationale: text("rationale").notNull(),
  createdById: int("createdById").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const historicalPrices = mysqlTable("historical_prices", {
  id: int("id").autoincrement().primaryKey(),
  itemDescription: varchar("itemDescription", { length: 220 }).notNull(),
  unit: varchar("unit", { length: 40 }).notNull(),
  unitPrice: decimal("unitPrice", { precision: 14, scale: 2 }).notNull(),
  supplierId: int("supplierId"),
  purchaseOrderId: int("purchaseOrderId"),
  observedAt: timestamp("observedAt").defaultNow().notNull(),
  recordedById: int("recordedById").notNull(),
}, (table) => [index("historical_price_item_observed_idx").on(table.itemDescription, table.observedAt)]);

export const auditTrails = mysqlTable("audit_trails", {
  id: int("id").autoincrement().primaryKey(),
  entityType: varchar("entityType", { length: 64 }).notNull(),
  entityId: int("entityId").notNull(),
  action: varchar("action", { length: 100 }).notNull(),
  performedById: int("performedById").notNull(),
  performedByRole: mysqlEnum("performedByRole", USER_ROLES).notNull(),
  details: json("details").$type<Record<string, unknown>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("audit_entity_created_idx").on(table.entityType, table.entityId, table.createdAt)]);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type PurchaseRequest = typeof purchaseRequests.$inferSelect;
