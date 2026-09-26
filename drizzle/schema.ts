import { decimal, index, integer, json, pgSchema, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";
import { PR_STATUSES, USER_ROLES } from "../shared/procurementRules";

const procurewiseSchema = pgSchema("procurewise");

export const users = procurewiseSchema.table("users", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: varchar("role", { length: 64 }).$type<(typeof USER_ROLES)[number]>().default("end_user").notNull(),
  officeName: varchar("officeName", { length: 180 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const offices = procurewiseSchema.table("offices", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  code: varchar("code", { length: 32 }).notNull().unique(),
  name: varchar("name", { length: 160 }).notNull(),
  isActive: integer("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const objectsOfExpenditure = procurewiseSchema.table("objects_of_expenditure", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  code: varchar("code", { length: 32 }).notNull().unique(),
  name: varchar("name", { length: 180 }).notNull(),
  isActive: integer("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const budgetAllotments = procurewiseSchema.table("budget_allotments", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  officeId: integer("officeId").notNull().references(() => offices.id, { onDelete: "restrict" }),
  objectOfExpenditureId: integer("objectOfExpenditureId").notNull().references(() => objectsOfExpenditure.id, { onDelete: "restrict" }),
  fiscalYear: integer("fiscalYear").notNull(),
  allottedAmount: decimal("allottedAmount", { precision: 14, scale: 2 }).notNull(),
  committedAmount: decimal("committedAmount", { precision: 14, scale: 2 }).default("0.00").notNull(),
  createdById: integer("createdById").notNull().references(() => users.id, { onDelete: "restrict" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("budget_allotment_office_object_year_unique").on(table.officeId, table.objectOfExpenditureId, table.fiscalYear),
  index("budget_allotment_office_year_idx").on(table.officeId, table.fiscalYear),
]);

export const suppliers = procurewiseSchema.table("suppliers", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  supplierCode: varchar("supplierCode", { length: 40 }).notNull().unique(),
  companyName: varchar("companyName", { length: 180 }).notNull(),
  contactPerson: varchar("contactPerson", { length: 140 }),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 80 }),
  address: text("address"),
  tin: varchar("tin", { length: 80 }),
  philgepsRegistrationNumber: varchar("philgepsRegistrationNumber", { length: 120 }),
  philgepsRegistrationDate: timestamp("philgepsRegistrationDate"),
  philgepsExpirationDate: timestamp("philgepsExpirationDate"),
  offerings: text("offerings"),
  accreditationStatus: varchar("accreditationStatus", { length: 64 }).default("pending").notNull(),
  isActive: integer("isActive").default(1).notNull(),
  createdById: integer("createdById").notNull().references(() => users.id, { onDelete: "restrict" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("supplier_company_idx").on(table.companyName)]);

export const supplierTags = procurewiseSchema.table("supplier_tags", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  name: varchar("name", { length: 120 }).notNull().unique(),
  description: varchar("description", { length: 320 }),
  isActive: integer("isActive").default(1).notNull(),
  createdById: integer("createdById").notNull().references(() => users.id, { onDelete: "restrict" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("supplier_tag_active_idx").on(table.isActive)]);

export const supplierTagAssignments = procurewiseSchema.table("supplier_tag_assignments", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  supplierId: integer("supplierId").notNull().references(() => suppliers.id, { onDelete: "cascade" }),
  supplierTagId: integer("supplierTagId").notNull().references(() => supplierTags.id, { onDelete: "cascade" }),
  assignedById: integer("assignedById").notNull().references(() => users.id, { onDelete: "restrict" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("supplier_tag_assignment_unique").on(table.supplierId, table.supplierTagId),
  index("supplier_tag_assignment_supplier_idx").on(table.supplierId),
  index("supplier_tag_assignment_tag_idx").on(table.supplierTagId),
]);

export const procurementCatalogItems = procurewiseSchema.table("procurement_catalog_items", {
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

export const procurementCatalogFavorites = procurewiseSchema.table("procurement_catalog_favorites", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  userId: integer("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  catalogItemId: integer("catalogItemId").notNull().references(() => procurementCatalogItems.id, { onDelete: "cascade" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("procurement_catalog_favorite_user_item_unique").on(table.userId, table.catalogItemId),
  index("procurement_catalog_favorite_user_idx").on(table.userId),
  index("procurement_catalog_favorite_item_idx").on(table.catalogItemId),
]);

export const procurementCatalogSavedItems = procurewiseSchema.table("procurement_catalog_saved_items", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  userId: integer("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  catalogItemId: integer("catalogItemId").notNull().references(() => procurementCatalogItems.id, { onDelete: "cascade" }),
  quantity: decimal("quantity", { precision: 12, scale: 2 }).default("1.00").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("procurement_catalog_saved_user_item_unique").on(table.userId, table.catalogItemId),
  index("procurement_catalog_saved_user_idx").on(table.userId),
  index("procurement_catalog_saved_item_idx").on(table.catalogItemId),
]);

export const appPpmpEntries = procurewiseSchema.table("app_ppmp_entries", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  fiscalYear: integer("fiscalYear").notNull(),
  officeId: integer("officeId").notNull().references(() => offices.id, { onDelete: "restrict" }),
  objectOfExpenditureId: integer("objectOfExpenditureId").notNull().references(() => objectsOfExpenditure.id, { onDelete: "restrict" }),
  catalogItemId: integer("catalogItemId").references(() => procurementCatalogItems.id, { onDelete: "set null" }),
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
  preparedById: integer("preparedById").notNull().references(() => users.id, { onDelete: "restrict" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => [index("app_ppmp_office_year_idx").on(table.officeId, table.fiscalYear)]);

export const testRecordArchives = procurewiseSchema.table("test_record_archives", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  ppmpEntryId: integer("ppmpEntryId").notNull().unique().references(() => appPpmpEntries.id, { onDelete: "cascade" }),
  archivedById: integer("archivedById").notNull().references(() => users.id, { onDelete: "restrict" }),
  archiveReason: text("archiveReason").notNull(),
  archivedAt: timestamp("archivedAt").defaultNow().notNull(),
  cleanedAt: timestamp("cleanedAt"),
}, (table) => [index("test_record_archive_status_idx").on(table.cleanedAt, table.archivedAt)]);

export const procurementSignatories = procurewiseSchema.table("procurement_signatories", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  fullName: varchar("fullName", { length: 180 }).notNull(),
  designation: varchar("designation", { length: 160 }).notNull(),
  mayRequest: integer("mayRequest").default(0).notNull(),
  mayApprove: integer("mayApprove").default(0).notNull(),
  isActive: integer("isActive").default(1).notNull(),
  createdById: integer("createdById").notNull().references(() => users.id, { onDelete: "restrict" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("procurement_signatory_active_idx").on(table.isActive, table.mayRequest, table.mayApprove)]);

export const purchaseRequests = procurewiseSchema.table("purchase_requests", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  prNumber: varchar("prNumber", { length: 40 }).notNull().unique(),
  purpose: text("purpose").notNull(),
  fundSource: varchar("fundSource", { length: 160 }),
  entityName: varchar("entityName", { length: 180 }).default("Batanes State College").notNull(),
  fundCluster: varchar("fundCluster", { length: 80 }).default("01101101").notNull(),
  responsibilityCenterCode: varchar("responsibilityCenterCode", { length: 80 }),
  requesterDesignation: varchar("requesterDesignation", { length: 160 }),
  requestedSignatoryId: integer("requestedSignatoryId").references(() => procurementSignatories.id, { onDelete: "set null" }),
  requestedSignatoryName: varchar("requestedSignatoryName", { length: 180 }),
  approvedSignatoryId: integer("approvedSignatoryId").references(() => procurementSignatories.id, { onDelete: "set null" }),
  approvedSignatoryName: varchar("approvedSignatoryName", { length: 180 }),
  approvedSignatoryDesignation: varchar("approvedSignatoryDesignation", { length: 160 }),
  officeId: integer("officeId").notNull().references(() => offices.id, { onDelete: "restrict" }),
  objectOfExpenditureId: integer("objectOfExpenditureId").notNull().references(() => objectsOfExpenditure.id, { onDelete: "restrict" }),
  totalEstimate: decimal("totalEstimate", { precision: 14, scale: 2 }).notNull(),
  status: varchar("status", { length: 64 }).$type<(typeof PR_STATUSES)[number]>().default("draft").notNull(),
  requestedById: integer("requestedById").notNull().references(() => users.id, { onDelete: "restrict" }),
  trackingToken: varchar("trackingToken", { length: 48 }).notNull().unique(),
  ppmpEntryId: integer("ppmpEntryId").references(() => appPpmpEntries.id, { onDelete: "set null" }),
  procurementReviewedById: integer("procurementReviewedById").references(() => users.id, { onDelete: "set null" }),
  assignedOfficerId: integer("assignedOfficerId").references(() => users.id, { onDelete: "set null" }),
  administrativeApprovedById: integer("administrativeApprovedById").references(() => users.id, { onDelete: "set null" }),
  budgetReviewedById: integer("budgetReviewedById").references(() => users.id, { onDelete: "set null" }),
  supplyReviewedById: integer("supplyReviewedById").references(() => users.id, { onDelete: "set null" }),
  bacReviewedById: integer("bacReviewedById").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  submittedAt: timestamp("submittedAt"),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => [
  index("pr_requester_status_idx").on(table.requestedById, table.status),
  index("pr_office_status_idx").on(table.officeId, table.status),
]);

export const purchaseRequestItems = procurewiseSchema.table("purchase_request_items", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  purchaseRequestId: integer("purchaseRequestId").notNull().references(() => purchaseRequests.id, { onDelete: "cascade" }),
  catalogItemId: integer("catalogItemId").references(() => procurementCatalogItems.id, { onDelete: "set null" }),
  description: text("description").notNull(),
  stockPropertyNo: varchar("stockPropertyNo", { length: 80 }),
  specification: text("specification"),
  quantity: decimal("quantity", { precision: 12, scale: 2 }).notNull(),
  unit: varchar("unit", { length: 40 }).notNull(),
  estimatedUnitCost: decimal("estimatedUnitCost", { precision: 14, scale: 2 }).notNull(),
  totalCost: decimal("totalCost", { precision: 14, scale: 2 }).notNull(),
}, (table) => [index("pr_item_pr_idx").on(table.purchaseRequestId), index("pr_item_catalog_idx").on(table.catalogItemId)]);

export const preCanvasses = procurewiseSchema.table("pre_canvasses", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  preCanvassNumber: varchar("preCanvassNumber", { length: 40 }).notNull().unique(),
  purchaseRequestId: integer("purchaseRequestId").notNull().unique().references(() => purchaseRequests.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 64 }).default("draft").notNull(),
  approvedBudget: decimal("approvedBudget", { precision: 14, scale: 2 }),
  quotationDeadline: timestamp("quotationDeadline"),
  deliveryPeriodDays: integer("deliveryPeriodDays"),
  priceEvaluationMode: varchar("priceEvaluationMode", { length: 80 }).default("lot_basis"),
  preparedById: integer("preparedById").notNull().references(() => users.id, { onDelete: "restrict" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const preCanvassQuotes = procurewiseSchema.table("pre_canvass_quotes", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  preCanvassId: integer("preCanvassId").notNull().references(() => preCanvasses.id, { onDelete: "cascade" }),
  supplierId: integer("supplierId").notNull().references(() => suppliers.id, { onDelete: "restrict" }),
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

export const abstractsOfCanvass = procurewiseSchema.table("abstracts_of_canvass", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  abstractNumber: varchar("abstractNumber", { length: 40 }).notNull().unique(),
  preCanvassId: integer("preCanvassId").notNull().unique().references(() => preCanvasses.id, { onDelete: "cascade" }),
  recommendedSupplierId: integer("recommendedSupplierId").notNull().references(() => suppliers.id, { onDelete: "restrict" }),
  recommendationReason: text("recommendationReason").notNull(),
  openingDate: timestamp("openingDate").defaultNow().notNull(),
  openingLocation: varchar("openingLocation", { length: 160 }).default("Basco, Batanes").notNull(),
  procurementCategory: varchar("procurementCategory", { length: 120 }).default("Supplies and materials").notNull(),
  status: varchar("status", { length: 64 }).default("recommended").notNull(),
  preparedById: integer("preparedById").notNull().references(() => users.id, { onDelete: "restrict" }),
  decidedById: integer("decidedById").references(() => users.id, { onDelete: "set null" }),
  decisionRemarks: text("decisionRemarks"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const rfqs = procurewiseSchema.table("rfqs", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  rfqNumber: varchar("rfqNumber", { length: 40 }).notNull().unique(),
  purchaseRequestId: integer("purchaseRequestId").notNull().unique().references(() => purchaseRequests.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 64 }).default("draft").notNull(),
  createdById: integer("createdById").notNull().references(() => users.id, { onDelete: "restrict" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const supplierQuotations = procurewiseSchema.table("supplier_quotations", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  rfqId: integer("rfqId").notNull().references(() => rfqs.id, { onDelete: "cascade" }),
  supplierId: integer("supplierId").notNull().references(() => suppliers.id, { onDelete: "restrict" }),
  totalPrice: decimal("totalPrice", { precision: 14, scale: 2 }).notNull(),
  deliveryDays: integer("deliveryDays").notNull(),
  isCompliant: integer("isCompliant").default(1).notNull(),
  notes: text("notes"),
  submittedAt: timestamp("submittedAt").defaultNow().notNull(),
}, (table) => [uniqueIndex("supplier_quote_rfq_supplier_unique").on(table.rfqId, table.supplierId)]);

export const quotationAbstracts = procurewiseSchema.table("quotation_abstracts", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  rfqId: integer("rfqId").notNull().unique().references(() => rfqs.id, { onDelete: "cascade" }),
  recommendedSupplierId: integer("recommendedSupplierId").notNull().references(() => suppliers.id, { onDelete: "restrict" }),
  recommendationReason: text("recommendationReason").notNull(),
  status: varchar("status", { length: 64 }).default("draft").notNull(),
  preparedById: integer("preparedById").notNull().references(() => users.id, { onDelete: "restrict" }),
  approvedById: integer("approvedById").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const purchaseOrders = procurewiseSchema.table("purchase_orders", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  poNumber: varchar("poNumber", { length: 40 }).notNull().unique(),
  purchaseRequestId: integer("purchaseRequestId").notNull().unique().references(() => purchaseRequests.id, { onDelete: "restrict" }),
  rfqId: integer("rfqId").unique().references(() => rfqs.id, { onDelete: "set null" }),
  preCanvassId: integer("preCanvassId").unique().references(() => preCanvasses.id, { onDelete: "set null" }),
  supplierId: integer("supplierId").notNull().references(() => suppliers.id, { onDelete: "restrict" }),
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
  generatedById: integer("generatedById").notNull().references(() => users.id, { onDelete: "restrict" }),
  approvedById: integer("approvedById").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const deliveryReceipts = procurewiseSchema.table("delivery_receipts", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  purchaseOrderId: integer("purchaseOrderId").notNull().unique().references(() => purchaseOrders.id, { onDelete: "cascade" }),
  receiptNumber: varchar("receiptNumber", { length: 40 }).notNull().unique(),
  deliveredAt: timestamp("deliveredAt").defaultNow().notNull(),
  receivedById: integer("receivedById").notNull().references(() => users.id, { onDelete: "restrict" }),
  receivedByName: varchar("receivedByName", { length: 180 }),
  deliveryStatus: varchar("deliveryStatus", { length: 64 }).default("complete").notNull(),
  signatureReference: text("signatureReference"),
  remarks: text("remarks"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const pmrLogs = procurewiseSchema.table("pmr_logs", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  purchaseOrderId: integer("purchaseOrderId").notNull().unique().references(() => purchaseOrders.id, { onDelete: "cascade" }),
  pmrNumber: varchar("pmrNumber", { length: 40 }).notNull().unique(),
  remarks: text("remarks"),
  loggedById: integer("loggedById").notNull().references(() => users.id, { onDelete: "restrict" }),
  loggedAt: timestamp("loggedAt").defaultNow().notNull(),
});

export const pmrHistoricalRecords = procurewiseSchema.table("pmr_historical_records", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  recordKey: varchar("recordKey", { length: 80 }).notNull().unique(),
  sourceWorkbook: varchar("sourceWorkbook", { length: 255 }).notNull(),
  sourceRow: integer("sourceRow").notNull(),
  fiscalYear: integer("fiscalYear").notNull(),
  month: varchar("month", { length: 24 }),
  endUser: varchar("endUser", { length: 180 }),
  positionDesignation: varchar("positionDesignation", { length: 180 }),
  fundCode: varchar("fundCode", { length: 80 }),
  fundClass: varchar("fundClass", { length: 80 }),
  prNumber: varchar("prNumber", { length: 80 }).notNull(),
  modality: varchar("modality", { length: 120 }),
  item: text("item"),
  quantity: decimal("quantity", { precision: 14, scale: 3 }),
  unitOfIssue: varchar("unitOfIssue", { length: 60 }),
  unitBudget: decimal("unitBudget", { precision: 14, scale: 2 }),
  estimatedTotal: decimal("estimatedTotal", { precision: 14, scale: 2 }),
  unitLcrb: decimal("unitLcrb", { precision: 14, scale: 2 }),
  total: decimal("total", { precision: 14, scale: 2 }),
  purpose: text("purpose"),
  office: varchar("office", { length: 180 }),
  lonReceivedDate: varchar("lonReceivedDate", { length: 80 }),
  bacAwardApprovedDate: varchar("bacAwardApprovedDate", { length: 80 }),
  poContractDate: varchar("poContractDate", { length: 80 }),
  poContractDateReceived: varchar("poContractDateReceived", { length: 80 }),
  deliveryDate: varchar("deliveryDate", { length: 80 }),
  supplier: varchar("supplier", { length: 240 }),
  iarDate: varchar("iarDate", { length: 80 }),
  sectionCodeDepartment: varchar("sectionCodeDepartment", { length: 120 }),
  releasedDate: varchar("releasedDate", { length: 80 }),
  status: varchar("status", { length: 80 }),
  remarks: text("remarks"),
  obrNumber: varchar("obrNumber", { length: 120 }),
  rfqsPrinted: varchar("rfqsPrinted", { length: 80 }),
  salesChargeInvoice: varchar("salesChargeInvoice", { length: 160 }),
  importedAt: timestamp("importedAt").defaultNow().notNull(),
}, (table) => [
  index("pmr_history_year_idx").on(table.fiscalYear),
  index("pmr_history_pr_idx").on(table.prNumber),
  index("pmr_history_supplier_idx").on(table.supplier),
]);

export const procurementSettings = procurewiseSchema.table("procurement_settings", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  entityName: varchar("entityName", { length: 180 }).default("Batanes State College").notNull(),
  authorizedOfficialName: varchar("authorizedOfficialName", { length: 180 }),
  authorizedOfficialDesignation: varchar("authorizedOfficialDesignation", { length: 160 }),
  chiefAccountantName: varchar("chiefAccountantName", { length: 180 }),
  defaultNoticeSignatory: varchar("defaultNoticeSignatory", { length: 180 }),
  sessionTimeoutMinutes: integer("sessionTimeoutMinutes").default(30).notNull(),
  enableInAppNotifications: integer("enableInAppNotifications").default(1).notNull(),
  notificationRefreshSeconds: integer("notificationRefreshSeconds").default(15).notNull(),
  appearanceTheme: varchar("appearanceTheme", { length: 32 }).default("light").notNull(),
  appearanceFont: varchar("appearanceFont", { length: 40 }).default("public_sans").notNull(),
  appearanceFontScale: varchar("appearanceFontScale", { length: 16 }).default("100").notNull(),
  appearanceDensity: varchar("appearanceDensity", { length: 16 }).default("comfortable").notNull(),
  appearanceAccent: varchar("appearanceAccent", { length: 16 }).default("maroon").notNull(),
  appearanceCorners: varchar("appearanceCorners", { length: 16 }).default("sharp").notNull(),
  appearanceReducedMotion: integer("appearanceReducedMotion").default(0).notNull(),
  updatedById: integer("updatedById").references(() => users.id, { onDelete: "set null" }),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const procurementDocuments = procurewiseSchema.table("procurement_documents", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  entityType: varchar("entityType", { length: 64 }).notNull(),
  entityId: integer("entityId").notNull(),
  documentType: varchar("documentType", { length: 80 }).notNull(),
  originalFileName: varchar("originalFileName", { length: 255 }).notNull(),
  mimeType: varchar("mimeType", { length: 120 }).notNull(),
  storageKey: varchar("storageKey", { length: 512 }).notNull().unique(),
  storageUrl: varchar("storageUrl", { length: 512 }).notNull(),
  fileSize: integer("fileSize").notNull(),
  uploadedById: integer("uploadedById").notNull().references(() => users.id, { onDelete: "restrict" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("document_entity_created_idx").on(table.entityType, table.entityId, table.createdAt), index("document_uploader_created_idx").on(table.uploadedById, table.createdAt)]);

export const workflowCorrections = procurewiseSchema.table("workflow_corrections", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  entityType: varchar("entityType", { length: 64 }).notNull(),
  entityId: integer("entityId").notNull(),
  requestedById: integer("requestedById").notNull().references(() => users.id, { onDelete: "restrict" }),
  assignedToId: integer("assignedToId").notNull().references(() => users.id, { onDelete: "restrict" }),
  reason: text("reason").notNull(),
  status: varchar("status", { length: 64 }).default("open").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  resolvedAt: timestamp("resolvedAt"),
}, (table) => [index("correction_entity_created_idx").on(table.entityType, table.entityId, table.createdAt), index("correction_assignee_status_idx").on(table.assignedToId, table.status)]);

export const workflowNotifications = procurewiseSchema.table("workflow_notifications", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  recipientUserId: integer("recipientUserId").notNull().references(() => users.id, { onDelete: "cascade" }),
  kind: varchar("kind", { length: 64 }).notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  body: text("body").notNull(),
  entityType: varchar("entityType", { length: 64 }).notNull(),
  entityId: integer("entityId").notNull(),
  readAt: timestamp("readAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("notification_recipient_read_created_idx").on(table.recipientUserId, table.readAt, table.createdAt)]);

export const lettersOfNotice = procurewiseSchema.table("letters_of_notice", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  noticeNumber: varchar("noticeNumber", { length: 48 }).notNull().unique(),
  noticeType: varchar("noticeType", { length: 64 }).default("other").notNull(),
  purchaseRequestId: integer("purchaseRequestId").references(() => purchaseRequests.id, { onDelete: "cascade" }),
  supplierId: integer("supplierId").references(() => suppliers.id, { onDelete: "set null" }),
  subject: varchar("subject", { length: 220 }).notNull(),
  body: text("body").notNull(),
  status: varchar("status", { length: 64 }).default("draft").notNull(),
  issuedById: integer("issuedById").notNull().references(() => users.id, { onDelete: "restrict" }),
  issuedAt: timestamp("issuedAt"),
  demandDueDate: timestamp("demandDueDate"),
  demandReminderDate: timestamp("demandReminderDate"),
  demandReminderSentAt: timestamp("demandReminderSentAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => [index("notice_pr_created_idx").on(table.purchaseRequestId, table.createdAt)]);

export const bacTransmittals = procurewiseSchema.table("bac_transmittals", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  transmittalNumber: varchar("transmittalNumber", { length: 48 }).notNull().unique(),
  purchaseRequestId: integer("purchaseRequestId").references(() => purchaseRequests.id, { onDelete: "cascade" }),
  fromOffice: varchar("fromOffice", { length: 180 }).notNull(),
  toOffice: varchar("toOffice", { length: 180 }).notNull(),
  subject: varchar("subject", { length: 220 }).notNull(),
  remarks: text("remarks"),
  status: varchar("status", { length: 64 }).default("draft").notNull(),
  preparedById: integer("preparedById").notNull().references(() => users.id, { onDelete: "restrict" }),
  sentAt: timestamp("sentAt"),
  acknowledgedByName: varchar("acknowledgedByName", { length: 180 }),
  acknowledgedAt: timestamp("acknowledgedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => [index("transmittal_pr_created_idx").on(table.purchaseRequestId, table.createdAt)]);

export const supplierEvaluations = procurewiseSchema.table("supplier_evaluations", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  supplierId: integer("supplierId").notNull().references(() => suppliers.id, { onDelete: "restrict" }),
  purchaseOrderId: integer("purchaseOrderId").references(() => purchaseOrders.id, { onDelete: "set null" }),
  purchaseRequestId: integer("purchaseRequestId").references(() => purchaseRequests.id, { onDelete: "set null" }),
  reportedPurchaseRequestNumber: varchar("reportedPurchaseRequestNumber", { length: 80 }),
  urgentPurchaseRequestReason: text("urgentPurchaseRequestReason"),
  urgentPurchaseRequestUpdatedById: integer("urgentPurchaseRequestUpdatedById").references(() => users.id, { onDelete: "set null" }),
  urgentPurchaseRequestUpdatedAt: timestamp("urgentPurchaseRequestUpdatedAt"),
  officeId: integer("officeId").references(() => offices.id, { onDelete: "set null" }),
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
  evaluatedById: integer("evaluatedById").notNull().references(() => users.id, { onDelete: "restrict" }),
  evaluatedAt: timestamp("evaluatedAt").defaultNow().notNull(),
}, (table) => [index("supplier_evaluation_supplier_date_idx").on(table.supplierId, table.evaluatedAt)]);

export const supplierEvaluationApprovals = procurewiseSchema.table("supplier_evaluation_approvals", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  supplierEvaluationId: integer("supplierEvaluationId").notNull().unique().references(() => supplierEvaluations.id, { onDelete: "cascade" }),
  approvedById: integer("approvedById").notNull().references(() => users.id, { onDelete: "restrict" }),
  approverName: varchar("approverName", { length: 180 }).notNull(),
  approverDesignation: varchar("approverDesignation", { length: 180 }).notNull(),
  consentStatement: text("consentStatement").notNull(),
  signatureDigest: varchar("signatureDigest", { length: 128 }).notNull(),
  approvedAt: timestamp("approvedAt").defaultNow().notNull(),
}, (table) => [index("supplier_evaluation_approval_approver_date_idx").on(table.approvedById, table.approvedAt)]);

export const mcdmRecommendations = procurewiseSchema.table("mcdm_recommendations", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  preCanvassId: integer("preCanvassId").notNull().unique().references(() => preCanvasses.id, { onDelete: "cascade" }),
  recommendedSupplierId: integer("recommendedSupplierId").notNull().references(() => suppliers.id, { onDelete: "restrict" }),
  priceScore: decimal("priceScore", { precision: 7, scale: 2 }).notNull(),
  deliveryScore: decimal("deliveryScore", { precision: 7, scale: 2 }).notNull(),
  complianceScore: decimal("complianceScore", { precision: 7, scale: 2 }).notNull(),
  totalScore: decimal("totalScore", { precision: 7, scale: 2 }).notNull(),
  rationale: text("rationale").notNull(),
  createdById: integer("createdById").notNull().references(() => users.id, { onDelete: "restrict" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const bestValuePolicies = procurewiseSchema.table("best_value_policies", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  policyCode: varchar("policyCode", { length: 64 }).notNull(),
  name: varchar("name", { length: 180 }).notNull(),
  version: integer("version").notNull(),
  isActive: integer("isActive").default(1).notNull(),
  totalWeight: decimal("totalWeight", { precision: 7, scale: 2 }).notNull(),
  createdById: integer("createdById").notNull().references(() => users.id, { onDelete: "restrict" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  deactivatedAt: timestamp("deactivatedAt"),
}, (table) => [
  uniqueIndex("best_value_policy_code_version_unique").on(table.policyCode, table.version),
  index("best_value_policy_active_created_idx").on(table.isActive, table.createdAt),
]);

export const bestValuePolicyCriteria = procurewiseSchema.table("best_value_policy_criteria", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  policyId: integer("policyId").notNull().references(() => bestValuePolicies.id, { onDelete: "cascade" }),
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

export const historicalPrices = procurewiseSchema.table("historical_prices", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  itemDescription: varchar("itemDescription", { length: 220 }).notNull(),
  unit: varchar("unit", { length: 40 }).notNull(),
  unitPrice: decimal("unitPrice", { precision: 14, scale: 2 }).notNull(),
  supplierId: integer("supplierId").references(() => suppliers.id, { onDelete: "set null" }),
  purchaseOrderId: integer("purchaseOrderId").references(() => purchaseOrders.id, { onDelete: "set null" }),
  observedAt: timestamp("observedAt").defaultNow().notNull(),
  recordedById: integer("recordedById").notNull().references(() => users.id, { onDelete: "restrict" }),
}, (table) => [index("historical_price_item_observed_idx").on(table.itemDescription, table.observedAt)]);

export const auditTrails = procurewiseSchema.table("audit_trails", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  entityType: varchar("entityType", { length: 64 }).notNull(),
  entityId: integer("entityId").notNull(),
  action: varchar("action", { length: 100 }).notNull(),
  performedById: integer("performedById").notNull().references(() => users.id, { onDelete: "restrict" }),
  performedByRole: varchar("performedByRole", { length: 64 }).notNull(),
  details: json("details").$type<Record<string, unknown>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("audit_entity_created_idx").on(table.entityType, table.entityId, table.createdAt)]);

export const purchaseRequestDecisions = procurewiseSchema.table("purchase_request_decisions", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  purchaseRequestId: integer("purchaseRequestId").notNull().references(() => purchaseRequests.id, { onDelete: "cascade" }),
  decisionType: varchar("decisionType", { length: 64 }).notNull(),
  fromStatus: varchar("fromStatus", { length: 64 }).notNull(),
  toStatus: varchar("toStatus", { length: 64 }).notNull(),
  reason: text("reason").notNull(),
  remarks: text("remarks"),
  performedById: integer("performedById").notNull().references(() => users.id, { onDelete: "restrict" }),
  performedByRole: varchar("performedByRole", { length: 64 }).notNull(),
  documentId: integer("documentId").references(() => procurementDocuments.id, { onDelete: "set null" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  index("pr_decision_pr_idx").on(table.purchaseRequestId, table.createdAt),
]);

export const rfqNumberAssignments = procurewiseSchema.table("rfq_number_assignments", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  fiscalYear: integer("fiscalYear").notNull(),
  sequenceNumber: integer("sequenceNumber").notNull(),
  formattedRfqNumber: varchar("formattedRfqNumber", { length: 48 }).notNull().unique(),
  assignmentMode: varchar("assignmentMode", { length: 32 }).notNull(),
  urgentReason: text("urgentReason"),
  assignedById: integer("assignedById").notNull().references(() => users.id, { onDelete: "restrict" }),
  assignedAt: timestamp("assignedAt").defaultNow().notNull(),
  purchaseRequestId: integer("purchaseRequestId").references(() => purchaseRequests.id, { onDelete: "cascade" }),
  rfqId: integer("rfqId").references(() => rfqs.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 32 }).default("active").notNull(),
}, (table) => [
  index("rfq_num_year_seq_idx").on(table.fiscalYear, table.sequenceNumber),
  index("rfq_num_pr_idx").on(table.purchaseRequestId),
]);

export const formTemplates = procurewiseSchema.table("form_templates", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  templateKey: varchar("templateKey", { length: 64 }).notNull(),
  version: integer("version").notNull(),
  displayName: varchar("displayName", { length: 180 }).notNull(),
  status: varchar("status", { length: 32 }).$type<"draft" | "active" | "archived">().default("draft").notNull(),
  configurationJson: json("configurationJson").$type<Record<string, unknown>>().notNull(),
  createdById: integer("createdById").notNull().references(() => users.id, { onDelete: "restrict" }),
  updatedById: integer("updatedById").notNull().references(() => users.id, { onDelete: "restrict" }),
  approvedById: integer("approvedById").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  activatedAt: timestamp("activatedAt"),
}, (table) => [
  uniqueIndex("form_template_key_version_unique").on(table.templateKey, table.version),
  index("form_template_key_status_idx").on(table.templateKey, table.status),
]);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type PurchaseRequest = typeof purchaseRequests.$inferSelect;
export type PurchaseRequestDecision = typeof purchaseRequestDecisions.$inferSelect;
export type RfqNumberAssignment = typeof rfqNumberAssignments.$inferSelect;
export type FormTemplate = typeof formTemplates.$inferSelect;
