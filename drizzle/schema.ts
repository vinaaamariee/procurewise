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
  offerings: text("offerings"),
  accreditationStatus: mysqlEnum("accreditationStatus", ["pending", "accredited", "suspended"]).default("pending").notNull(),
  isActive: int("isActive").default(1).notNull(),
  createdById: int("createdById").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("supplier_company_idx").on(table.companyName)]);

export const appPpmpEntries = mysqlTable("app_ppmp_entries", {
  id: int("id").autoincrement().primaryKey(),
  fiscalYear: int("fiscalYear").notNull(),
  officeId: int("officeId").notNull(),
  objectOfExpenditureId: int("objectOfExpenditureId").notNull(),
  description: text("description").notNull(),
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
  officeId: int("officeId").notNull(),
  objectOfExpenditureId: int("objectOfExpenditureId").notNull(),
  totalEstimate: decimal("totalEstimate", { precision: 14, scale: 2 }).notNull(),
  status: mysqlEnum("status", PR_STATUSES).default("draft").notNull(),
  requestedById: int("requestedById").notNull(),
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
  description: text("description").notNull(),
  specification: text("specification"),
  quantity: decimal("quantity", { precision: 12, scale: 2 }).notNull(),
  unit: varchar("unit", { length: 40 }).notNull(),
  estimatedUnitCost: decimal("estimatedUnitCost", { precision: 14, scale: 2 }).notNull(),
  totalCost: decimal("totalCost", { precision: 14, scale: 2 }).notNull(),
}, (table) => [index("pr_item_pr_idx").on(table.purchaseRequestId)]);

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
  rfqId: int("rfqId").notNull().unique(),
  supplierId: int("supplierId").notNull(),
  totalAmount: decimal("totalAmount", { precision: 14, scale: 2 }).notNull(),
  status: mysqlEnum("status", ["draft", "pending_approval", "approved", "issued", "delivered", "closed"]).default("draft").notNull(),
  generatedById: int("generatedById").notNull(),
  approvedById: int("approvedById"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

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
