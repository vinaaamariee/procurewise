// server/vercelApiEntrypoint.ts
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// server/_core/env.ts
var ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? ""
};

// server/_core/storageProxy.ts
function registerStorageProxy(app2) {
  app2.get("/manus-storage/*", async (req, res) => {
    const key = req.params[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }
    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      res.status(500).send("Storage proxy not configured");
      return;
    }
    try {
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/"
      );
      forgeUrl.searchParams.set("path", key);
      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` }
      });
      if (!forgeResp.ok) {
        const body = await forgeResp.text().catch(() => "");
        console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
        res.status(502).send("Storage backend error");
        return;
      }
      const { url } = await forgeResp.json();
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }
      res.set("Cache-Control", "no-store");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}

// server/routers.ts
import { TRPCError as TRPCError3 } from "@trpc/server";
import { z as z2 } from "zod";

// server/_core/systemRouter.ts
import { z } from "zod";

// server/_core/notification.ts
import { TRPCError } from "@trpc/server";
var TITLE_MAX_LENGTH = 1200;
var CONTENT_MAX_LENGTH = 2e4;
var trimValue = (value) => value.trim();
var isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;
var buildEndpointUrl = (baseUrl) => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(
    "webdevtoken.v1.WebDevService/SendNotification",
    normalizedBase
  ).toString();
};
var validatePayload = (input) => {
  if (!isNonEmptyString(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required."
    });
  }
  if (!isNonEmptyString(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required."
    });
  }
  const title = trimValue(input.title);
  const content = trimValue(input.content);
  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
    });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
    });
  }
  return { title, content };
};
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  if (!ENV.forgeApiUrl) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service URL is not configured."
    });
  }
  if (!ENV.forgeApiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service API key is not configured."
    });
  }
  const endpoint = buildEndpointUrl(ENV.forgeApiUrl);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1"
      },
      body: JSON.stringify({ title, content })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Notification] Failed to notify owner (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Error calling notification service:", error);
    return false;
  }
}

// shared/const.ts
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";

// server/_core/trpc.ts
import { initTRPC, TRPCError as TRPCError2 } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError2({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError2({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(
    z.object({
      timestamp: z.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
  notifyOwner: adminProcedure.input(
    z.object({
      title: z.string().min(1, "title is required"),
      content: z.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    const delivered = await notifyOwner(input);
    return {
      success: delivered
    };
  })
});

// server/db.ts
import { randomUUID } from "node:crypto";
import { createHash } from "node:crypto";
import { and, desc, eq, inArray, isNull, like, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

// drizzle/schema.ts
import { decimal, index, integer, json, pgSchema, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";
var procurewiseSchema = pgSchema("procurewise");
var users = procurewiseSchema.table("users", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: varchar("role", { length: 64 }).$type().default("end_user").notNull(),
  officeName: varchar("officeName", { length: 180 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull()
});
var offices = procurewiseSchema.table("offices", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  code: varchar("code", { length: 32 }).notNull().unique(),
  name: varchar("name", { length: 160 }).notNull(),
  isActive: integer("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var objectsOfExpenditure = procurewiseSchema.table("objects_of_expenditure", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  code: varchar("code", { length: 32 }).notNull().unique(),
  name: varchar("name", { length: 180 }).notNull(),
  isActive: integer("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var budgetAllotments = procurewiseSchema.table("budget_allotments", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  officeId: integer("officeId").notNull().references(() => offices.id, { onDelete: "restrict" }),
  objectOfExpenditureId: integer("objectOfExpenditureId").notNull().references(() => objectsOfExpenditure.id, { onDelete: "restrict" }),
  fiscalYear: integer("fiscalYear").notNull(),
  allottedAmount: decimal("allottedAmount", { precision: 14, scale: 2 }).notNull(),
  committedAmount: decimal("committedAmount", { precision: 14, scale: 2 }).default("0.00").notNull(),
  createdById: integer("createdById").notNull().references(() => users.id, { onDelete: "restrict" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull()
}, (table) => [
  uniqueIndex("budget_allotment_office_object_year_unique").on(table.officeId, table.objectOfExpenditureId, table.fiscalYear),
  index("budget_allotment_office_year_idx").on(table.officeId, table.fiscalYear)
]);
var suppliers = procurewiseSchema.table("suppliers", {
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
  createdAt: timestamp("createdAt").defaultNow().notNull()
}, (table) => [index("supplier_company_idx").on(table.companyName)]);
var supplierTags = procurewiseSchema.table("supplier_tags", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  name: varchar("name", { length: 120 }).notNull().unique(),
  description: varchar("description", { length: 320 }),
  isActive: integer("isActive").default(1).notNull(),
  createdById: integer("createdById").notNull().references(() => users.id, { onDelete: "restrict" }),
  createdAt: timestamp("createdAt").defaultNow().notNull()
}, (table) => [index("supplier_tag_active_idx").on(table.isActive)]);
var supplierTagAssignments = procurewiseSchema.table("supplier_tag_assignments", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  supplierId: integer("supplierId").notNull().references(() => suppliers.id, { onDelete: "cascade" }),
  supplierTagId: integer("supplierTagId").notNull().references(() => supplierTags.id, { onDelete: "cascade" }),
  assignedById: integer("assignedById").notNull().references(() => users.id, { onDelete: "restrict" }),
  createdAt: timestamp("createdAt").defaultNow().notNull()
}, (table) => [
  uniqueIndex("supplier_tag_assignment_unique").on(table.supplierId, table.supplierTagId),
  index("supplier_tag_assignment_supplier_idx").on(table.supplierId),
  index("supplier_tag_assignment_tag_idx").on(table.supplierTagId)
]);
var procurementCatalogItems = procurewiseSchema.table("procurement_catalog_items", {
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
  updatedAt: timestamp("updatedAt").defaultNow().notNull()
}, (table) => [index("procurement_catalog_active_idx").on(table.isActive)]);
var procurementCatalogFavorites = procurewiseSchema.table("procurement_catalog_favorites", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  userId: integer("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  catalogItemId: integer("catalogItemId").notNull().references(() => procurementCatalogItems.id, { onDelete: "cascade" }),
  createdAt: timestamp("createdAt").defaultNow().notNull()
}, (table) => [
  uniqueIndex("procurement_catalog_favorite_user_item_unique").on(table.userId, table.catalogItemId),
  index("procurement_catalog_favorite_user_idx").on(table.userId),
  index("procurement_catalog_favorite_item_idx").on(table.catalogItemId)
]);
var procurementCatalogSavedItems = procurewiseSchema.table("procurement_catalog_saved_items", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  userId: integer("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  catalogItemId: integer("catalogItemId").notNull().references(() => procurementCatalogItems.id, { onDelete: "cascade" }),
  quantity: decimal("quantity", { precision: 12, scale: 2 }).default("1.00").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull()
}, (table) => [
  uniqueIndex("procurement_catalog_saved_user_item_unique").on(table.userId, table.catalogItemId),
  index("procurement_catalog_saved_user_idx").on(table.userId),
  index("procurement_catalog_saved_item_idx").on(table.catalogItemId)
]);
var appPpmpEntries = procurewiseSchema.table("app_ppmp_entries", {
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
  updatedAt: timestamp("updatedAt").defaultNow().notNull()
}, (table) => [index("app_ppmp_office_year_idx").on(table.officeId, table.fiscalYear)]);
var testRecordArchives = procurewiseSchema.table("test_record_archives", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  ppmpEntryId: integer("ppmpEntryId").notNull().unique().references(() => appPpmpEntries.id, { onDelete: "cascade" }),
  archivedById: integer("archivedById").notNull().references(() => users.id, { onDelete: "restrict" }),
  archiveReason: text("archiveReason").notNull(),
  archivedAt: timestamp("archivedAt").defaultNow().notNull(),
  cleanedAt: timestamp("cleanedAt")
}, (table) => [index("test_record_archive_status_idx").on(table.cleanedAt, table.archivedAt)]);
var procurementSignatories = procurewiseSchema.table("procurement_signatories", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  fullName: varchar("fullName", { length: 180 }).notNull(),
  designation: varchar("designation", { length: 160 }).notNull(),
  mayRequest: integer("mayRequest").default(0).notNull(),
  mayApprove: integer("mayApprove").default(0).notNull(),
  isActive: integer("isActive").default(1).notNull(),
  createdById: integer("createdById").notNull().references(() => users.id, { onDelete: "restrict" }),
  createdAt: timestamp("createdAt").defaultNow().notNull()
}, (table) => [index("procurement_signatory_active_idx").on(table.isActive, table.mayRequest, table.mayApprove)]);
var purchaseRequests = procurewiseSchema.table("purchase_requests", {
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
  status: varchar("status", { length: 64 }).$type().default("draft").notNull(),
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
  updatedAt: timestamp("updatedAt").defaultNow().notNull()
}, (table) => [
  index("pr_requester_status_idx").on(table.requestedById, table.status),
  index("pr_office_status_idx").on(table.officeId, table.status)
]);
var purchaseRequestItems = procurewiseSchema.table("purchase_request_items", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  purchaseRequestId: integer("purchaseRequestId").notNull().references(() => purchaseRequests.id, { onDelete: "cascade" }),
  catalogItemId: integer("catalogItemId").references(() => procurementCatalogItems.id, { onDelete: "set null" }),
  description: text("description").notNull(),
  stockPropertyNo: varchar("stockPropertyNo", { length: 80 }),
  specification: text("specification"),
  quantity: decimal("quantity", { precision: 12, scale: 2 }).notNull(),
  unit: varchar("unit", { length: 40 }).notNull(),
  estimatedUnitCost: decimal("estimatedUnitCost", { precision: 14, scale: 2 }).notNull(),
  totalCost: decimal("totalCost", { precision: 14, scale: 2 }).notNull()
}, (table) => [index("pr_item_pr_idx").on(table.purchaseRequestId), index("pr_item_catalog_idx").on(table.catalogItemId)]);
var preCanvasses = procurewiseSchema.table("pre_canvasses", {
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
  updatedAt: timestamp("updatedAt").defaultNow().notNull()
});
var preCanvassQuotes = procurewiseSchema.table("pre_canvass_quotes", {
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
  submittedAt: timestamp("submittedAt").defaultNow().notNull()
}, (table) => [uniqueIndex("pre_canvass_quote_supplier_unique").on(table.preCanvassId, table.supplierId)]);
var abstractsOfCanvass = procurewiseSchema.table("abstracts_of_canvass", {
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
  updatedAt: timestamp("updatedAt").defaultNow().notNull()
});
var rfqs = procurewiseSchema.table("rfqs", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  rfqNumber: varchar("rfqNumber", { length: 40 }).notNull().unique(),
  purchaseRequestId: integer("purchaseRequestId").notNull().unique().references(() => purchaseRequests.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 64 }).default("draft").notNull(),
  createdById: integer("createdById").notNull().references(() => users.id, { onDelete: "restrict" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull()
});
var supplierQuotations = procurewiseSchema.table("supplier_quotations", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  rfqId: integer("rfqId").notNull().references(() => rfqs.id, { onDelete: "cascade" }),
  supplierId: integer("supplierId").notNull().references(() => suppliers.id, { onDelete: "restrict" }),
  totalPrice: decimal("totalPrice", { precision: 14, scale: 2 }).notNull(),
  deliveryDays: integer("deliveryDays").notNull(),
  isCompliant: integer("isCompliant").default(1).notNull(),
  notes: text("notes"),
  submittedAt: timestamp("submittedAt").defaultNow().notNull()
}, (table) => [uniqueIndex("supplier_quote_rfq_supplier_unique").on(table.rfqId, table.supplierId)]);
var quotationAbstracts = procurewiseSchema.table("quotation_abstracts", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  rfqId: integer("rfqId").notNull().unique().references(() => rfqs.id, { onDelete: "cascade" }),
  recommendedSupplierId: integer("recommendedSupplierId").notNull().references(() => suppliers.id, { onDelete: "restrict" }),
  recommendationReason: text("recommendationReason").notNull(),
  status: varchar("status", { length: 64 }).default("draft").notNull(),
  preparedById: integer("preparedById").notNull().references(() => users.id, { onDelete: "restrict" }),
  approvedById: integer("approvedById").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull()
});
var purchaseOrders = procurewiseSchema.table("purchase_orders", {
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
  updatedAt: timestamp("updatedAt").defaultNow().notNull()
});
var deliveryReceipts = procurewiseSchema.table("delivery_receipts", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  purchaseOrderId: integer("purchaseOrderId").notNull().unique().references(() => purchaseOrders.id, { onDelete: "cascade" }),
  receiptNumber: varchar("receiptNumber", { length: 40 }).notNull().unique(),
  deliveredAt: timestamp("deliveredAt").defaultNow().notNull(),
  receivedById: integer("receivedById").notNull().references(() => users.id, { onDelete: "restrict" }),
  receivedByName: varchar("receivedByName", { length: 180 }),
  deliveryStatus: varchar("deliveryStatus", { length: 64 }).default("complete").notNull(),
  signatureReference: text("signatureReference"),
  remarks: text("remarks"),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var pmrLogs = procurewiseSchema.table("pmr_logs", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  purchaseOrderId: integer("purchaseOrderId").notNull().unique().references(() => purchaseOrders.id, { onDelete: "cascade" }),
  pmrNumber: varchar("pmrNumber", { length: 40 }).notNull().unique(),
  remarks: text("remarks"),
  loggedById: integer("loggedById").notNull().references(() => users.id, { onDelete: "restrict" }),
  loggedAt: timestamp("loggedAt").defaultNow().notNull()
});
var pmrHistoricalRecords = procurewiseSchema.table("pmr_historical_records", {
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
  importedAt: timestamp("importedAt").defaultNow().notNull()
}, (table) => [
  index("pmr_history_year_idx").on(table.fiscalYear),
  index("pmr_history_pr_idx").on(table.prNumber),
  index("pmr_history_supplier_idx").on(table.supplier)
]);
var procurementSettings = procurewiseSchema.table("procurement_settings", {
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
  updatedAt: timestamp("updatedAt").defaultNow().notNull()
});
var procurementDocuments = procurewiseSchema.table("procurement_documents", {
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
  createdAt: timestamp("createdAt").defaultNow().notNull()
}, (table) => [index("document_entity_created_idx").on(table.entityType, table.entityId, table.createdAt), index("document_uploader_created_idx").on(table.uploadedById, table.createdAt)]);
var workflowCorrections = procurewiseSchema.table("workflow_corrections", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  entityType: varchar("entityType", { length: 64 }).notNull(),
  entityId: integer("entityId").notNull(),
  requestedById: integer("requestedById").notNull().references(() => users.id, { onDelete: "restrict" }),
  assignedToId: integer("assignedToId").notNull().references(() => users.id, { onDelete: "restrict" }),
  reason: text("reason").notNull(),
  status: varchar("status", { length: 64 }).default("open").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  resolvedAt: timestamp("resolvedAt")
}, (table) => [index("correction_entity_created_idx").on(table.entityType, table.entityId, table.createdAt), index("correction_assignee_status_idx").on(table.assignedToId, table.status)]);
var workflowNotifications = procurewiseSchema.table("workflow_notifications", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  recipientUserId: integer("recipientUserId").notNull().references(() => users.id, { onDelete: "cascade" }),
  kind: varchar("kind", { length: 64 }).notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  body: text("body").notNull(),
  entityType: varchar("entityType", { length: 64 }).notNull(),
  entityId: integer("entityId").notNull(),
  readAt: timestamp("readAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull()
}, (table) => [index("notification_recipient_read_created_idx").on(table.recipientUserId, table.readAt, table.createdAt)]);
var lettersOfNotice = procurewiseSchema.table("letters_of_notice", {
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
  updatedAt: timestamp("updatedAt").defaultNow().notNull()
}, (table) => [index("notice_pr_created_idx").on(table.purchaseRequestId, table.createdAt)]);
var bacTransmittals = procurewiseSchema.table("bac_transmittals", {
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
  updatedAt: timestamp("updatedAt").defaultNow().notNull()
}, (table) => [index("transmittal_pr_created_idx").on(table.purchaseRequestId, table.createdAt)]);
var supplierEvaluations = procurewiseSchema.table("supplier_evaluations", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  supplierId: integer("supplierId").notNull().references(() => suppliers.id, { onDelete: "restrict" }),
  purchaseOrderId: integer("purchaseOrderId").references(() => purchaseOrders.id, { onDelete: "set null" }),
  purchaseRequestId: integer("purchaseRequestId").references(() => purchaseRequests.id, { onDelete: "set null" }),
  reportedPurchaseRequestNumber: varchar("reportedPurchaseRequestNumber", { length: 80 }),
  urgentPurchaseRequestReason: text("urgentPurchaseRequestReason"),
  urgentPurchaseRequestUpdatedById: integer("urgentPurchaseRequestUpdatedById").references(() => users.id, { onDelete: "set null" }),
  urgentPurchaseRequestUpdatedAt: timestamp("urgentPurchaseRequestUpdatedAt"),
  officeId: integer("officeId").references(() => offices.id, { onDelete: "set null" }),
  evaluationAudience: varchar("evaluationAudience", { length: 32 }).$type().default("procurement_office").notNull(),
  goodsServicesType: varchar("goodsServicesType", { length: 220 }),
  supplierRegistryReference: varchar("supplierRegistryReference", { length: 160 }),
  supplierRegistryRegisteredAt: timestamp("supplierRegistryRegisteredAt"),
  supplierRegistryExpiresAt: timestamp("supplierRegistryExpiresAt"),
  responseScores: json("responseScores").$type(),
  qualityScore: integer("qualityScore").notNull(),
  deliveryScore: integer("deliveryScore").notNull(),
  pricingScore: integer("pricingScore").notNull(),
  complianceScore: integer("complianceScore").notNull(),
  remarks: text("remarks"),
  respondentName: varchar("respondentName", { length: 180 }),
  respondentSignedAt: timestamp("respondentSignedAt"),
  evaluatedById: integer("evaluatedById").notNull().references(() => users.id, { onDelete: "restrict" }),
  evaluatedAt: timestamp("evaluatedAt").defaultNow().notNull()
}, (table) => [index("supplier_evaluation_supplier_date_idx").on(table.supplierId, table.evaluatedAt)]);
var supplierEvaluationApprovals = procurewiseSchema.table("supplier_evaluation_approvals", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  supplierEvaluationId: integer("supplierEvaluationId").notNull().unique().references(() => supplierEvaluations.id, { onDelete: "cascade" }),
  approvedById: integer("approvedById").notNull().references(() => users.id, { onDelete: "restrict" }),
  approverName: varchar("approverName", { length: 180 }).notNull(),
  approverDesignation: varchar("approverDesignation", { length: 180 }).notNull(),
  consentStatement: text("consentStatement").notNull(),
  signatureDigest: varchar("signatureDigest", { length: 128 }).notNull(),
  approvedAt: timestamp("approvedAt").defaultNow().notNull()
}, (table) => [index("supplier_evaluation_approval_approver_date_idx").on(table.approvedById, table.approvedAt)]);
var mcdmRecommendations = procurewiseSchema.table("mcdm_recommendations", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  preCanvassId: integer("preCanvassId").notNull().unique().references(() => preCanvasses.id, { onDelete: "cascade" }),
  recommendedSupplierId: integer("recommendedSupplierId").notNull().references(() => suppliers.id, { onDelete: "restrict" }),
  priceScore: decimal("priceScore", { precision: 7, scale: 2 }).notNull(),
  deliveryScore: decimal("deliveryScore", { precision: 7, scale: 2 }).notNull(),
  complianceScore: decimal("complianceScore", { precision: 7, scale: 2 }).notNull(),
  totalScore: decimal("totalScore", { precision: 7, scale: 2 }).notNull(),
  rationale: text("rationale").notNull(),
  createdById: integer("createdById").notNull().references(() => users.id, { onDelete: "restrict" }),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var bestValuePolicies = procurewiseSchema.table("best_value_policies", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  policyCode: varchar("policyCode", { length: 64 }).notNull(),
  name: varchar("name", { length: 180 }).notNull(),
  version: integer("version").notNull(),
  isActive: integer("isActive").default(1).notNull(),
  totalWeight: decimal("totalWeight", { precision: 7, scale: 2 }).notNull(),
  createdById: integer("createdById").notNull().references(() => users.id, { onDelete: "restrict" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  deactivatedAt: timestamp("deactivatedAt")
}, (table) => [
  uniqueIndex("best_value_policy_code_version_unique").on(table.policyCode, table.version),
  index("best_value_policy_active_created_idx").on(table.isActive, table.createdAt)
]);
var bestValuePolicyCriteria = procurewiseSchema.table("best_value_policy_criteria", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  policyId: integer("policyId").notNull().references(() => bestValuePolicies.id, { onDelete: "cascade" }),
  criterionKey: varchar("criterionKey", { length: 80 }).notNull(),
  label: varchar("label", { length: 180 }).notNull(),
  description: text("description"),
  weight: decimal("weight", { precision: 7, scale: 2 }).notNull(),
  sortOrder: integer("sortOrder").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
}, (table) => [
  uniqueIndex("best_value_policy_criterion_unique").on(table.policyId, table.criterionKey),
  index("best_value_policy_criteria_policy_order_idx").on(table.policyId, table.sortOrder)
]);
var historicalPrices = procurewiseSchema.table("historical_prices", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  itemDescription: varchar("itemDescription", { length: 220 }).notNull(),
  unit: varchar("unit", { length: 40 }).notNull(),
  unitPrice: decimal("unitPrice", { precision: 14, scale: 2 }).notNull(),
  supplierId: integer("supplierId").references(() => suppliers.id, { onDelete: "set null" }),
  purchaseOrderId: integer("purchaseOrderId").references(() => purchaseOrders.id, { onDelete: "set null" }),
  observedAt: timestamp("observedAt").defaultNow().notNull(),
  recordedById: integer("recordedById").notNull().references(() => users.id, { onDelete: "restrict" })
}, (table) => [index("historical_price_item_observed_idx").on(table.itemDescription, table.observedAt)]);
var auditTrails = procurewiseSchema.table("audit_trails", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  entityType: varchar("entityType", { length: 64 }).notNull(),
  entityId: integer("entityId").notNull(),
  action: varchar("action", { length: 100 }).notNull(),
  performedById: integer("performedById").notNull().references(() => users.id, { onDelete: "restrict" }),
  performedByRole: varchar("performedByRole", { length: 64 }).notNull(),
  details: json("details").$type(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
}, (table) => [index("audit_entity_created_idx").on(table.entityType, table.entityId, table.createdAt)]);
var purchaseRequestDecisions = procurewiseSchema.table("purchase_request_decisions", {
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
  createdAt: timestamp("createdAt").defaultNow().notNull()
}, (table) => [
  index("pr_decision_pr_idx").on(table.purchaseRequestId, table.createdAt)
]);
var rfqNumberAssignments = procurewiseSchema.table("rfq_number_assignments", {
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
  status: varchar("status", { length: 32 }).default("active").notNull()
}, (table) => [
  index("rfq_num_year_seq_idx").on(table.fiscalYear, table.sequenceNumber),
  index("rfq_num_pr_idx").on(table.purchaseRequestId)
]);
var formTemplates = procurewiseSchema.table("form_templates", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  templateKey: varchar("templateKey", { length: 64 }).notNull(),
  version: integer("version").notNull(),
  displayName: varchar("displayName", { length: 180 }).notNull(),
  status: varchar("status", { length: 32 }).$type().default("draft").notNull(),
  configurationJson: json("configurationJson").$type().notNull(),
  createdById: integer("createdById").notNull().references(() => users.id, { onDelete: "restrict" }),
  updatedById: integer("updatedById").notNull().references(() => users.id, { onDelete: "restrict" }),
  approvedById: integer("approvedById").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  activatedAt: timestamp("activatedAt")
}, (table) => [
  uniqueIndex("form_template_key_version_unique").on(table.templateKey, table.version),
  index("form_template_key_status_idx").on(table.templateKey, table.status)
]);

// shared/procurementRules.ts
var PROCUREMENT_ROLES = [
  "end_user",
  "procurement_officer",
  "procurement_officer_i",
  "procurement_officer_ii",
  "procurement_staff",
  "administrative_approver",
  "bac_secretariat",
  "bac",
  "hope",
  "budget_officer",
  "supplier_contractor",
  "admin"
];
var USER_ROLES = ["user", ...PROCUREMENT_ROLES, "supply_officer"];
var OFFICIAL_ROLE_LABELS = {
  end_user: "End-User",
  procurement_officer: "Procurement Office",
  procurement_officer_i: "Procurement Officer I",
  procurement_officer_ii: "Procurement Officer II",
  procurement_staff: "Procurement Staff",
  administrative_approver: "Administrative Approver (legacy)",
  bac_secretariat: "BAC Secretariat",
  bac: "BAC",
  hope: "HoPE",
  budget_officer: "Budget Officer",
  supplier_contractor: "Supplier/Contractor",
  admin: "System Administrator"
};
function roleCanAct(role, permittedRoles) {
  return role === "admin" || permittedRoles.includes(role);
}
function normalizeProcurementRole(role) {
  if (role === "user") return "end_user";
  if (role === "supply_officer" || role === "procurement_officer_i" || role === "procurement_officer_ii" || role === "procurement_staff") return "procurement_officer";
  if (role === "bac_secretariat" || role === "bac" || role === "hope" || role === "budget_officer") return "administrative_approver";
  return role;
}
function getNextPrStatus(currentStatus, role) {
  if (currentStatus === "draft" && roleCanAct(role, ["end_user"])) return "procurement_review";
  if (currentStatus === "procurement_review" && roleCanAct(role, ["procurement_officer"])) return "approval_review";
  if (currentStatus === "approval_review" && roleCanAct(role, ["administrative_approver"])) return "approved";
  return null;
}
function selectLowestCompliantQuote(quotes) {
  const compliantQuotes = quotes.filter((quote) => quote.isCompliant);
  if (!compliantQuotes.length) return null;
  return compliantQuotes.reduce((lowest, quote) => Number(quote.totalPrice) < Number(lowest.totalPrice) ? quote : lowest);
}
function isValidPreCanvassQuote(quote) {
  if (!quote) return false;
  const hasSupplier = quote.supplierId !== void 0 ? quote.supplierId !== null && Number(quote.supplierId) > 0 : true;
  const hasPrice = quote.totalPrice !== void 0 ? quote.totalPrice !== null && !isNaN(Number(quote.totalPrice)) && Number(quote.totalPrice) > 0 : true;
  return Boolean(hasSupplier && hasPrice);
}
function getValidPreCanvassQuotes(quotes, preCanvassId) {
  return quotes.filter((q) => {
    if (preCanvassId !== void 0 && q.preCanvassId !== preCanvassId) return false;
    return isValidPreCanvassQuote(q);
  });
}
function hasRequiredSupplierQuotations(quoteCount) {
  return quoteCount >= 3;
}
function canReserveBudget(allottedAmount, committedAmount, requestAmount) {
  return Number(requestAmount) <= Number(allottedAmount) - Number(committedAmount);
}
function hasReservedBudgetCommitment(committedAmount, requestAmount) {
  return Number(committedAmount) >= Number(requestAmount);
}
var EMPLOYEE_PR_STATUS_LABELS = {
  draft: "Draft",
  procurement_review: "In Progress \u2014 Procurement Review",
  returned: "Returned for Correction",
  approval_review: "In Progress \u2014 Approval Review",
  budget_review: "In Progress \u2014 Approval Review",
  supply_review: "In Progress \u2014 Approval Review",
  bac_review: "In Progress \u2014 Approval Review",
  approved: "Approved",
  rejected: "Rejected",
  rfq: "RFQ in Progress",
  po: "Purchase Order in Progress",
  po_issued: "Purchase Order in Progress",
  delivered: "Delivered",
  pmr_logged: "Closed \u2014 PMR Logged",
  closed: "Closed \u2014 PMR Logged"
};
var EMPLOYEE_PR_STATUS_MEANINGS = {
  draft: "Employee is still preparing the package.",
  procurement_review: "Package has been submitted to Procurement.",
  returned: "Employee must correct the package and resubmit.",
  approval_review: "Package is being reviewed by the authorized decision role.",
  budget_review: "Package is being reviewed by the authorized decision role.",
  supply_review: "Package is being reviewed by the authorized decision role.",
  bac_review: "Package is being reviewed by the authorized decision role.",
  approved: "PR passed the required decision stage.",
  rejected: "Current transaction path was rejected and requires a new controlled submission or documented resubmission.",
  rfq: "Final RFQ is being prepared, distributed, or evaluated.",
  po: "PO is being prepared or approved.",
  po_issued: "PO is being prepared or approved.",
  delivered: "Delivery has been recorded.",
  pmr_logged: "PMR requirements are complete.",
  closed: "PMR requirements are complete."
};
function getEmployeePrStatus(status) {
  const normalized = status.toLowerCase();
  const label = EMPLOYEE_PR_STATUS_LABELS[normalized] ?? status.replaceAll("_", " ");
  const meaning = EMPLOYEE_PR_STATUS_MEANINGS[normalized] ?? "Status is being updated by the procurement workflow.";
  return { label, meaning };
}
var COUNTABLE_UNITS = /* @__PURE__ */ new Set(["pc", "pcs", "piece", "pieces", "unit", "units", "box", "boxes", "pack", "packs", "ream", "reams", "set", "sets", "roll", "rolls", "pad", "pads", "bundle", "bundles"]);
var VOLUME_UNITS = /* @__PURE__ */ new Set(["l", "liter", "liters", "ml", "milliliter", "milliliters", "gal", "gallon", "gallons"]);
var WEIGHT_UNITS = /* @__PURE__ */ new Set(["kg", "kilogram", "kilograms", "g", "gram", "grams", "lb", "lbs", "ton", "tons"]);
var LENGTH_UNITS = /* @__PURE__ */ new Set(["m", "meter", "meters", "cm", "centimeter", "centimeters", "ft", "foot", "feet", "yard", "yards"]);
function areUnitsCompatible(unitA, unitB) {
  const normA = unitA.trim().toLowerCase();
  const normB = unitB.trim().toLowerCase();
  if (normA === normB) return true;
  if (COUNTABLE_UNITS.has(normA) && COUNTABLE_UNITS.has(normB)) return true;
  if (VOLUME_UNITS.has(normA) && VOLUME_UNITS.has(normB)) return true;
  if (WEIGHT_UNITS.has(normA) && WEIGHT_UNITS.has(normB)) return true;
  if (LENGTH_UNITS.has(normA) && LENGTH_UNITS.has(normB)) return true;
  return false;
}

// server/procurementValidation.ts
function validatePrBudgetSubmission(input) {
  const allowed = canReserveBudget(input.allottedAmount, input.committedAmount, input.purchaseRequestAmount);
  return { allowed, availableAmount: Number(input.allottedAmount) - Number(input.committedAmount) };
}
function validatePoBudgetGeneration(input) {
  const allowed = hasReservedBudgetCommitment(input.committedAmount, input.purchaseRequestAmount);
  return { allowed };
}

// server/storage.ts
function getForgeConfig() {
  const forgeUrl = ENV.forgeApiUrl;
  const forgeKey = ENV.forgeApiKey;
  if (!forgeUrl || !forgeKey) {
    throw new Error(
      "Storage config missing: set BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY"
    );
  }
  return { forgeUrl: forgeUrl.replace(/\/+$/, ""), forgeKey };
}
function normalizeKey(relKey) {
  return relKey.replace(/^\/+/, "");
}
function appendHashSuffix(relKey) {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}
async function storagePut(relKey, data, contentType = "application/octet-stream") {
  const { forgeUrl, forgeKey } = getForgeConfig();
  const key = appendHashSuffix(normalizeKey(relKey));
  const presignUrl = new URL("v1/storage/presign/put", forgeUrl + "/");
  presignUrl.searchParams.set("path", key);
  const presignResp = await fetch(presignUrl, {
    headers: { Authorization: `Bearer ${forgeKey}` }
  });
  if (!presignResp.ok) {
    const msg = await presignResp.text().catch(() => presignResp.statusText);
    throw new Error(`Storage presign failed (${presignResp.status}): ${msg}`);
  }
  const { url: s3Url } = await presignResp.json();
  if (!s3Url) throw new Error("Forge returned empty presign URL");
  const blob = typeof data === "string" ? new Blob([data], { type: contentType }) : new Blob([data], { type: contentType });
  const uploadResp = await fetch(s3Url, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: blob
  });
  if (!uploadResp.ok) {
    throw new Error(`Storage upload to S3 failed (${uploadResp.status})`);
  }
  return { key, url: `/manus-storage/${key}` };
}

// shared/bestValuePolicy.ts
var BEST_VALUE_POLICY_CODE = "BSC-BV";
var BEST_VALUE_CRITERIA = [
  {
    criterionKey: "price_competitiveness",
    label: "Quoted price competitiveness",
    description: "Comparable eligible quotation price.",
    defaultWeight: 55
  },
  {
    criterionKey: "delivery_commitment",
    label: "Delivery commitment",
    description: "Supplier delivery commitment against the package requirement.",
    defaultWeight: 15
  },
  {
    criterionKey: "historical_price_reasonableness",
    label: "Historical price reasonableness",
    description: "Verified comparable historical-price evidence where sufficient data exists.",
    defaultWeight: 10
  },
  {
    criterionKey: "delivery_performance",
    label: "Verified delivery performance",
    description: "Verified on-time and complete delivery evidence where sufficient data exists.",
    defaultWeight: 10
  },
  {
    criterionKey: "quality_performance",
    label: "Verified quality and contract performance",
    description: "Evidence-backed post-award quality, pricing, and compliance evaluation history.",
    defaultWeight: 10
  }
];
var BEST_VALUE_CRITERION_KEYS = BEST_VALUE_CRITERIA.map((criterion) => criterion.criterionKey);
function validateBestValueCriteria(criteria) {
  const expectedKeys = new Set(BEST_VALUE_CRITERIA.map((criterion) => criterion.criterionKey));
  const suppliedKeys = criteria.map((criterion) => criterion.criterionKey);
  const hasExpectedCriteria = criteria.length === BEST_VALUE_CRITERIA.length && suppliedKeys.every((key) => expectedKeys.has(key)) && new Set(suppliedKeys).size === BEST_VALUE_CRITERIA.length;
  if (!hasExpectedCriteria) return { valid: false, totalWeight: 0, error: "All required Best Value criteria must be supplied exactly once." };
  if (criteria.some((criterion) => !Number.isFinite(criterion.weight) || criterion.weight < 0 || criterion.weight > 100)) {
    return { valid: false, totalWeight: 0, error: "Each Best Value criterion weight must be between 0 and 100." };
  }
  const totalWeight = Math.round(criteria.reduce((sum, criterion) => sum + criterion.weight, 0) * 100) / 100;
  if (totalWeight !== 100) return { valid: false, totalWeight, error: "Best Value criteria weights must total exactly 100%." };
  return { valid: true, totalWeight, error: null };
}

// shared/supplierEvaluationForm.ts
var END_USER_EVALUATION_CRITERIA = [
  { key: "quality_standards", section: "Quality of products/services", label: "The products/services met our quality standards." },
  { key: "delivery_term", section: "Quality of products/services", label: "The products/services were delivered following the delivery term specified." },
  { key: "accuracy_completeness", section: "Quality of products/services", label: "The products/services were accurate and complete according to the specifications." },
  { key: "responsiveness", section: "Communication and responsiveness", label: "The supplier is responsive to inquiries and requests for information." },
  { key: "issue_resolution", section: "Communication and responsiveness", label: "The supplier is willing to address issues and provide solutions." },
  { key: "communication", section: "Communication and responsiveness", label: "The supplier provides clear and concise communication throughout the ordering process." },
  { key: "competitive_pricing", section: "Cost and pricing", label: "The supplier offers competitive pricing of the products/services." },
  { key: "cost_justification", section: "Cost and pricing", label: "The products/services justify the cost." },
  { key: "recommend_supplier", section: "Overall satisfaction", label: "I would recommend this supplier to others within the institution." }
];
var PROCUREMENT_OFFICE_EVALUATION_CRITERIA = [
  { key: "rfq_timeliness", section: "Procurement Office assessment", label: "Responds to the Request for Quotation (RFQ) within the specified date." },
  { key: "competitive_price", section: "Procurement Office assessment", label: "Products are offered at a competitive price compared with other suppliers/bidders." },
  { key: "specification_conformance", section: "Procurement Office assessment", label: "Offer conforms to product sample/specification requirements." },
  { key: "documentary_requirements", section: "Procurement Office assessment", label: "The supplier submits all prescribed documentary requirements within 1\u20132 days upon request or coordination by the Procurement Officer." },
  { key: "delivery_term", section: "Procurement Office assessment", label: "Delivers the goods following the delivery term specified in the Purchase Order/Contract." }
];
function criteriaForSupplierEvaluation(audience) {
  return audience === "end_user" ? END_USER_EVALUATION_CRITERIA : PROCUREMENT_OFFICE_EVALUATION_CRITERIA;
}
function validateSupplierEvaluationResponses(audience, responses) {
  const criteria = criteriaForSupplierEvaluation(audience);
  const expectedKeys = criteria.map((criterion) => criterion.key);
  const receivedKeys = Object.keys(responses).sort();
  if (receivedKeys.length !== expectedKeys.length || expectedKeys.some((key) => !receivedKeys.includes(key))) return "Every supplied evaluation criterion must receive one rating.";
  if (!expectedKeys.every((key) => Number.isInteger(responses[key]) && responses[key] >= 1 && responses[key] <= 4)) return "Every supplier evaluation rating must be an integer from 1 to 4.";
  return null;
}
function average(values) {
  return Math.max(1, Math.min(5, Math.round(values.reduce((total, value) => total + value, 0) / values.length)));
}
function deriveSupplierEvaluationSummary(audience, responses) {
  if (audience === "end_user") {
    return {
      qualityScore: average([responses.quality_standards, responses.accuracy_completeness]),
      deliveryScore: responses.delivery_term,
      pricingScore: average([responses.competitive_pricing, responses.cost_justification]),
      complianceScore: average([responses.responsiveness, responses.issue_resolution, responses.communication, responses.recommend_supplier])
    };
  }
  return {
    qualityScore: responses.specification_conformance,
    deliveryScore: responses.delivery_term,
    pricingScore: responses.competitive_price,
    complianceScore: average([responses.rfq_timeliness, responses.documentary_requirements])
  };
}

// shared/institutionalOffices.ts
var INSTITUTIONAL_OFFICES = [
  // Executive & Administrative
  {
    code: "OOP",
    name: "Office of the President (OOP)",
    category: "Executive & Administrative"
  },
  {
    code: "OVP",
    name: "Office of the Vice President (OVP)",
    category: "Executive & Administrative"
  },
  {
    code: "OVPAA",
    name: "Office of the Vice President for Academic Affairs (OVPAA)",
    category: "Executive & Administrative"
  },
  {
    code: "OVPA",
    name: "Office of the Vice President for Administration (OVPA)",
    category: "Executive & Administrative"
  },
  {
    code: "PROC",
    name: "Procurement Office",
    category: "Executive & Administrative"
  },
  {
    code: "BAC",
    name: "Bids and Awards Committee (BAC)",
    category: "Executive & Administrative"
  },
  {
    code: "LEGAL",
    name: "Legal Affairs Office",
    category: "Executive & Administrative"
  },
  {
    code: "PLANNING",
    name: "Planning and Development Office",
    category: "Executive & Administrative"
  },
  {
    code: "DAFS",
    name: "Department of Accounting & Financial Services (DAFS)",
    category: "Executive & Administrative"
  },
  {
    code: "GSO",
    name: "General Services Office (GSO)",
    category: "Executive & Administrative"
  },
  {
    code: "ICT",
    name: "Information & Communications Technology (ICT) Unit",
    category: "Executive & Administrative"
  },
  {
    code: "GAD",
    name: "Gender and Development (GAD)",
    category: "Executive & Administrative"
  },
  // Academic & Departments
  {
    code: "CBAO",
    name: "College of Business and Accountancy (CBAO)",
    category: "Academic & Departments"
  },
  {
    code: "TED",
    name: "Teacher Education Department (TED)",
    category: "Academic & Departments"
  },
  {
    code: "HTM",
    name: "Hospitality & Tourism Management (HTM)",
    category: "Academic & Departments"
  },
  {
    code: "AGRI",
    name: "Department of Agriculture",
    category: "Academic & Departments"
  },
  {
    code: "IT",
    name: "Information Technology Department (IT)",
    category: "Academic & Departments"
  },
  {
    code: "DI",
    name: "Department of Instruction (DI)",
    category: "Academic & Departments"
  },
  // Research & Extension
  {
    code: "RDET",
    name: "Research, Development, Extension & Training (RDET)",
    category: "Research & Extension"
  },
  {
    code: "RDET-ST",
    name: "RDET - Science & Technology",
    category: "Research & Extension"
  },
  {
    code: "RDET-FT",
    name: "RDET - Futures Thinking",
    category: "Research & Extension"
  },
  {
    code: "RDET-TOUR",
    name: "RDET - Sustainable Tourism",
    category: "Research & Extension"
  },
  {
    code: "DOST-PCAARRD",
    name: "Agriculture - DOST PCAARRD Projects",
    category: "Research & Extension"
  },
  // Student & Support Services
  {
    code: "REG",
    name: "Office of the College Registrar",
    category: "Student & Support Services"
  },
  {
    code: "LIB",
    name: "College Library",
    category: "Student & Support Services"
  },
  {
    code: "SSC",
    name: "Supreme Student Council (SSC)",
    category: "Student & Support Services"
  },
  {
    code: "PUB",
    name: "Student Publication Office",
    category: "Student & Support Services"
  },
  {
    code: "SSO-MED",
    name: "Student Services - Medical Clinic",
    category: "Student & Support Services"
  },
  {
    code: "SOCIO-CUL",
    name: "Socio-Cultural Affairs Office",
    category: "Student & Support Services"
  },
  // Auxiliary & Projects
  {
    code: "CBAO-IGP",
    name: "CBAO - Income Generating Projects",
    category: "Auxiliary & Projects"
  }
];

// server/db.ts
var _db = null;
var _pool = null;
var MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
var TEST_ONLY_PREFIX = "TEST ONLY \u2014";
var PERMITTED_DOCUMENT_TYPES = /* @__PURE__ */ new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/msword",
  "application/vnd.ms-excel"
]);
function validateProcurementDocumentUpload(mimeType, byteLength) {
  if (!PERMITTED_DOCUMENT_TYPES.has(mimeType)) return "Only PDF, JPG, PNG, DOC, DOCX, XLS, and XLSX procurement documents may be attached.";
  if (!byteLength || byteLength > MAX_DOCUMENT_BYTES) return "Document uploads must be between 1 byte and 10 MB.";
  return null;
}
function isEligibleTestOnlyPackage(input) {
  return Boolean(
    input.description?.startsWith(TEST_ONLY_PREFIX) && input.fundSource?.startsWith(TEST_ONLY_PREFIX) && input.remarks?.includes("non-operational test record") && input.officeCode?.startsWith("TEST-") && input.objectCode?.startsWith("TEST-")
  );
}
function describePreCanvassHandoff(hasOpenCorrections) {
  return hasOpenCorrections ? { title: "Pre-Canvass resubmitted", body: "An End-User has resubmitted a returned Pre-Canvass package for review." } : { title: "Pre-Canvass awaiting review", body: "An End-User has forwarded a complete three-supplier Pre-Canvass package for review." };
}
function calculateMcdmScores(quotes) {
  const compliantQuotes = quotes.filter((quote) => quote.isCompliant === 1);
  if (!compliantQuotes.length) return [];
  const lowestPrice = Math.min(...compliantQuotes.map((quote) => Number(quote.totalPrice)));
  const fastestDelivery = Math.min(...compliantQuotes.map((quote) => quote.deliveryDays));
  return compliantQuotes.map((quote) => {
    const priceScore = lowestPrice / Number(quote.totalPrice) * 60;
    const deliveryScore = fastestDelivery === 0 ? 20 : fastestDelivery / Math.max(quote.deliveryDays, 1) * 20;
    return { quote, priceScore, deliveryScore, complianceScore: 20, totalScore: priceScore + deliveryScore + 20 };
  }).sort((left, right) => right.totalScore - left.totalScore || Number(left.quote.totalPrice) - Number(right.quote.totalPrice));
}
async function getDb() {
  const password = process.env.SUPABASE_DB_PASSWORD;
  const configuredConnectionString = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;
  if (!_db && (configuredConnectionString || password)) {
    try {
      const connectionString = configuredConnectionString ?? `postgresql://postgres.wchgxpvviebvwuhrsrvj:${encodeURIComponent(password)}@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres`;
      _pool = new Pool({ connectionString, ssl: connectionString.startsWith("postgres") ? { rejectUnauthorized: false } : void 0 });
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
async function upsertSupabaseAuthUser(input) {
  const db = await requireDb();
  const normalizedEmail = input.email?.trim().toLowerCase() ?? null;
  const existingByOpenId = await db.select().from(users).where(eq(users.openId, input.openId)).limit(1);
  const existingByEmail = !existingByOpenId[0] && normalizedEmail ? await db.select().from(users).where(sql`lower(trim(${users.email})) = ${normalizedEmail}`).limit(1) : [];
  const existing = existingByOpenId[0] ?? existingByEmail[0];
  const values = { openId: input.openId, email: normalizedEmail, name: input.name, ...input.officeName !== void 0 ? { officeName: input.officeName?.trim() || null } : {}, loginMethod: "supabase", lastSignedIn: /* @__PURE__ */ new Date() };
  if (existing) {
    const [updated] = await db.update(users).set(values).where(eq(users.id, existing.id)).returning();
    if (!updated) throw new Error("The existing ProcureWise user could not be updated.");
    return updated;
  }
  const [created] = await db.insert(users).values({ ...values, role: "end_user" }).returning();
  if (!created) throw new Error("The Supabase Auth user could not be provisioned.");
  return created;
}
async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable. Configure the database before processing procurement records.");
  return db;
}
async function writeAuditEvent(input) {
  const db = await requireDb();
  await db.insert(auditTrails).values({ ...input, details: input.details ?? null });
}
async function ensureInstitutionalOfficesSeeded() {
  const db = await requireDb();
  for (const item of INSTITUTIONAL_OFFICES) {
    const existing = await db.select().from(offices).where(eq(offices.code, item.code)).limit(1);
    if (!existing.length) {
      await db.insert(offices).values({
        code: item.code,
        name: item.name,
        isActive: 1
      }).onConflictDoNothing();
    }
  }
}
async function getWorkspaceSetup() {
  const db = await requireDb();
  try {
    const existingCount = await db.select({ count: sql`count(*)` }).from(offices);
    if (Number(existingCount[0]?.count ?? 0) < INSTITUTIONAL_OFFICES.length) {
      await ensureInstitutionalOfficesSeeded();
    }
  } catch (err) {
    console.error("Failed to verify/seed institutional offices:", err);
  }
  const [officeRows, objectRows, supplierRows, allotmentRows, settingsRows] = await Promise.all([
    db.select().from(offices).where(eq(offices.isActive, 1)),
    db.select().from(objectsOfExpenditure).where(eq(objectsOfExpenditure.isActive, 1)),
    db.select().from(suppliers).where(eq(suppliers.isActive, 1)),
    db.select().from(budgetAllotments).where(eq(budgetAllotments.fiscalYear, (/* @__PURE__ */ new Date()).getFullYear())),
    db.select().from(procurementSettings).limit(1)
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
      { key: "budget", label: `FY ${(/* @__PURE__ */ new Date()).getFullYear()} budget allotment`, complete: allotmentRows.length > 0, detail: allotmentRows.length ? `${allotmentRows.length} current-year allotment record(s)` : "Record at least one current-year budget allotment." },
      { key: "signatories", label: "PO signatories", complete: signatoriesReady, detail: signatoriesReady ? "Authorised official and accounting signatory are recorded." : "Record the authorised official, designation, and Chief Accountant." }
    ]
  };
}
async function updateProcurementSettings(input, user) {
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
    appearanceTheme: input.appearanceTheme ?? "light",
    appearanceFont: input.appearanceFont ?? "public_sans",
    appearanceFontScale: input.appearanceFontScale ?? "100",
    appearanceDensity: input.appearanceDensity ?? "comfortable",
    appearanceAccent: input.appearanceAccent ?? "maroon",
    appearanceCorners: input.appearanceCorners ?? "sharp",
    appearanceReducedMotion: input.appearanceReducedMotion ? 1 : 0,
    updatedById: user.id
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
async function listPurchaseRequestSignatories() {
  const db = await requireDb();
  return db.select().from(procurementSignatories).where(eq(procurementSignatories.isActive, 1)).orderBy(procurementSignatories.fullName);
}
async function createPurchaseRequestSignatory(input, user) {
  const db = await requireDb();
  const [created] = await db.insert(procurementSignatories).values({
    fullName: input.fullName.trim(),
    designation: input.designation.trim(),
    mayRequest: input.mayRequest ? 1 : 0,
    mayApprove: input.mayApprove ? 1 : 0,
    createdById: user.id
  }).returning();
  if (!created) throw new Error("The authorized signatory could not be saved.");
  await writeAuditEvent({ entityType: "procurement_signatory", entityId: created.id, action: "created", performedById: user.id, performedByRole: normalizeProcurementRole(user.role), details: { mayRequest: created.mayRequest, mayApprove: created.mayApprove } });
  return created;
}
async function getBestValuePolicy() {
  const db = await requireDb();
  const [activePolicy] = await db.select().from(bestValuePolicies).where(eq(bestValuePolicies.isActive, 1)).orderBy(desc(bestValuePolicies.version)).limit(1);
  if (!activePolicy) {
    return {
      policy: { id: null, policyCode: BEST_VALUE_POLICY_CODE, name: "Initial Best Value Policy", version: 0, isActive: 0, totalWeight: "100.00", createdAt: null, isPersisted: false },
      criteria: BEST_VALUE_CRITERIA.map((criterion) => ({ ...criterion, weight: criterion.defaultWeight }))
    };
  }
  const savedCriteria = await db.select().from(bestValuePolicyCriteria).where(eq(bestValuePolicyCriteria.policyId, activePolicy.id)).orderBy(bestValuePolicyCriteria.sortOrder);
  const savedByKey = new Map(savedCriteria.map((criterion) => [criterion.criterionKey, criterion]));
  return {
    policy: { ...activePolicy, isPersisted: true },
    criteria: BEST_VALUE_CRITERIA.map((criterion) => ({ ...criterion, weight: Number(savedByKey.get(criterion.criterionKey)?.weight ?? criterion.defaultWeight) }))
  };
}
async function getBestValuePolicyHistory() {
  const db = await requireDb();
  const policies = await db.select().from(bestValuePolicies).orderBy(desc(bestValuePolicies.version));
  if (!policies.length) return [];
  const policyIds = policies.map((policy) => policy.id);
  const creatorIds = Array.from(new Set(policies.map((policy) => policy.createdById)));
  const [criteria, creators, auditEvents] = await Promise.all([
    db.select().from(bestValuePolicyCriteria).where(inArray(bestValuePolicyCriteria.policyId, policyIds)).orderBy(bestValuePolicyCriteria.sortOrder),
    db.select({ id: users.id, name: users.name, email: users.email }).from(users).where(inArray(users.id, creatorIds)),
    db.select().from(auditTrails).where(and(eq(auditTrails.entityType, "best_value_policy"), inArray(auditTrails.entityId, policyIds))).orderBy(desc(auditTrails.createdAt))
  ]);
  const creatorsById = new Map(creators.map((creator) => [creator.id, creator]));
  return policies.map((policy) => ({
    policy,
    criteria: criteria.filter((criterion) => criterion.policyId === policy.id),
    createdBy: creatorsById.get(policy.createdById) ?? null,
    activationAudit: auditEvents.find((event) => event.entityId === policy.id) ?? null
  }));
}
async function saveBestValuePolicy(input, user) {
  const validation = validateBestValueCriteria(input.criteria);
  if (!validation.valid) throw new Error(validation.error);
  const policyName = input.name.trim();
  if (policyName.length < 3 || policyName.length > 180) throw new Error("Best Value policy name must be between 3 and 180 characters.");
  const db = await requireDb();
  const created = await db.transaction(async (tx) => {
    const [latest] = await tx.select({ latestVersion: sql`coalesce(max(${bestValuePolicies.version}), 0)` }).from(bestValuePolicies).where(eq(bestValuePolicies.policyCode, BEST_VALUE_POLICY_CODE));
    const nextVersion = Number(latest?.latestVersion ?? 0) + 1;
    await tx.update(bestValuePolicies).set({ isActive: 0, deactivatedAt: /* @__PURE__ */ new Date() }).where(and(eq(bestValuePolicies.policyCode, BEST_VALUE_POLICY_CODE), eq(bestValuePolicies.isActive, 1)));
    const [policy] = await tx.insert(bestValuePolicies).values({ policyCode: BEST_VALUE_POLICY_CODE, name: policyName, version: nextVersion, isActive: 1, totalWeight: validation.totalWeight.toFixed(2), createdById: user.id }).returning();
    if (!policy) throw new Error("Best Value policy could not be saved.");
    await tx.insert(bestValuePolicyCriteria).values(BEST_VALUE_CRITERIA.map((criterion, index2) => ({
      policyId: policy.id,
      criterionKey: criterion.criterionKey,
      label: criterion.label,
      description: criterion.description,
      weight: Number(input.criteria.find((item) => item.criterionKey === criterion.criterionKey)?.weight).toFixed(2),
      sortOrder: index2 + 1
    })));
    return policy;
  });
  await writeAuditEvent({ entityType: "best_value_policy", entityId: created.id, action: "version_activated", performedById: user.id, performedByRole: normalizeProcurementRole(user.role), details: { policyCode: created.policyCode, version: created.version, totalWeight: validation.totalWeight, criteria: input.criteria } });
  return getBestValuePolicy();
}
async function getBudgetUtilization() {
  const db = await requireDb();
  const [allotments, officeRows, objectRows, prRows] = await Promise.all([
    db.select().from(budgetAllotments),
    db.select().from(offices),
    db.select().from(objectsOfExpenditure),
    db.select({
      id: purchaseRequests.id,
      prNumber: purchaseRequests.prNumber,
      officeId: purchaseRequests.officeId,
      objectOfExpenditureId: purchaseRequests.objectOfExpenditureId,
      totalEstimate: purchaseRequests.totalEstimate,
      status: purchaseRequests.status,
      purpose: purchaseRequests.purpose,
      createdAt: purchaseRequests.createdAt
    }).from(purchaseRequests)
  ]);
  return allotments.map((allotment) => {
    let linkedPrs = prRows.filter((pr) => {
      if (pr.officeId !== allotment.officeId || pr.objectOfExpenditureId !== allotment.objectOfExpenditureId) {
        return false;
      }
      if (!allotment.fiscalYear) return true;
      const createdYear = pr.createdAt ? new Date(pr.createdAt).getFullYear() : null;
      return createdYear === allotment.fiscalYear || pr.prNumber.includes(String(allotment.fiscalYear));
    });
    if (linkedPrs.length === 0) {
      linkedPrs = prRows.filter(
        (pr) => pr.officeId === allotment.officeId && pr.objectOfExpenditureId === allotment.objectOfExpenditureId
      );
    }
    return {
      ...allotment,
      office: officeRows.find((office) => office.id === allotment.officeId) ?? null,
      objectOfExpenditure: objectRows.find((object) => object.id === allotment.objectOfExpenditureId) ?? null,
      availableAmount: (Number(allotment.allottedAmount) - Number(allotment.committedAmount)).toFixed(2),
      purchaseRequests: linkedPrs.map((pr) => ({
        id: pr.id,
        prNumber: pr.prNumber,
        status: pr.status,
        totalEstimate: pr.totalEstimate,
        purpose: pr.purpose
      })),
      prNumbers: linkedPrs.map((pr) => pr.prNumber)
    };
  });
}
async function createOffice(input, user) {
  const db = await requireDb();
  await db.insert(offices).values(input);
  const [office] = await db.select().from(offices).where(eq(offices.code, input.code)).limit(1);
  if (!office) throw new Error("Office could not be created.");
  await writeAuditEvent({ entityType: "office", entityId: office.id, action: "created", performedById: user.id, performedByRole: normalizeProcurementRole(user.role), details: { code: office.code } });
  return office;
}
async function createObjectOfExpenditure(input, user) {
  const db = await requireDb();
  await db.insert(objectsOfExpenditure).values(input);
  const [object] = await db.select().from(objectsOfExpenditure).where(eq(objectsOfExpenditure.code, input.code)).limit(1);
  if (!object) throw new Error("Object of expenditure could not be created.");
  await writeAuditEvent({ entityType: "object_of_expenditure", entityId: object.id, action: "created", performedById: user.id, performedByRole: normalizeProcurementRole(user.role), details: { code: object.code } });
  return object;
}
async function createBudgetAllotment(input, user) {
  const db = await requireDb();
  await db.insert(budgetAllotments).values({ ...input, allottedAmount: input.allottedAmount.toFixed(2), createdById: user.id });
  const [allotment] = await db.select().from(budgetAllotments).where(and(eq(budgetAllotments.officeId, input.officeId), eq(budgetAllotments.objectOfExpenditureId, input.objectOfExpenditureId), eq(budgetAllotments.fiscalYear, input.fiscalYear))).limit(1);
  if (!allotment) throw new Error("Budget allotment could not be created.");
  await writeAuditEvent({ entityType: "budget_allotment", entityId: allotment.id, action: "created", performedById: user.id, performedByRole: normalizeProcurementRole(user.role), details: { fiscalYear: input.fiscalYear } });
  return allotment;
}
async function createSupplier(input, user) {
  const db = await requireDb();
  await db.insert(suppliers).values({ ...input, tin: input.tin || null, contactPerson: input.contactPerson || null, email: input.email || null, phone: input.phone || null, address: input.address || null, offerings: input.offerings || null, createdById: user.id });
  const [supplier] = await db.select().from(suppliers).where(eq(suppliers.supplierCode, input.supplierCode)).limit(1);
  if (!supplier) throw new Error("Supplier could not be registered.");
  await writeAuditEvent({ entityType: "supplier", entityId: supplier.id, action: "registered", performedById: user.id, performedByRole: normalizeProcurementRole(user.role), details: { supplierCode: supplier.supplierCode } });
  return supplier;
}
function getCatalogCodeFamily(productCode) {
  return productCode.match(/^\d{2}/)?.[0] ?? "Other";
}
async function listProcurementCatalogItems(input, options) {
  const db = options?.db ?? await requireDb();
  const search = input?.search?.trim().slice(0, 120) ?? "";
  const codeFamily = input?.codeFamily?.trim() || "";
  const page = Math.max(1, input?.page ?? 1);
  const limit = Math.min(100, Math.max(1, input?.limit ?? 30));
  const condition = search ? and(eq(procurementCatalogItems.isActive, 1), or(like(procurementCatalogItems.description, `%${search}%`), like(procurementCatalogItems.productCode, `%${search}%`))) : eq(procurementCatalogItems.isActive, 1);
  const records = await db.select().from(procurementCatalogItems).where(condition).orderBy(procurementCatalogItems.description);
  const categorizedRecords = codeFamily ? records.filter((record) => getCatalogCodeFamily(record.productCode) === codeFamily) : records;
  const start = (page - 1) * limit;
  return { items: categorizedRecords.slice(start, start + limit), total: categorizedRecords.length, page, limit };
}
async function listProcurementCatalogCodeFamilies(options) {
  const db = options?.db ?? await requireDb();
  const records = await db.select().from(procurementCatalogItems).where(eq(procurementCatalogItems.isActive, 1)).orderBy(procurementCatalogItems.productCode);
  const totals = records.reduce((result, record) => {
    const family = getCatalogCodeFamily(record.productCode);
    result[family] = (result[family] ?? 0) + 1;
    return result;
  }, {});
  return Object.entries(totals).sort(([left], [right]) => left.localeCompare(right, void 0, { numeric: true })).map(([codeFamily, itemCount]) => ({ codeFamily, label: `Source code family ${codeFamily}`, itemCount }));
}
async function listProcurementCatalogSavedItems(user, options) {
  const db = options?.db ?? await requireDb();
  return db.select({
    catalogItemId: procurementCatalogSavedItems.catalogItemId,
    quantity: procurementCatalogSavedItems.quantity,
    productCode: procurementCatalogItems.productCode,
    description: procurementCatalogItems.description,
    unit: procurementCatalogItems.unit,
    referencePrice: procurementCatalogItems.referencePrice,
    remarks: procurementCatalogItems.remarks
  }).from(procurementCatalogSavedItems).innerJoin(procurementCatalogItems, eq(procurementCatalogSavedItems.catalogItemId, procurementCatalogItems.id)).where(and(eq(procurementCatalogSavedItems.userId, user.id), eq(procurementCatalogItems.isActive, 1))).orderBy(procurementCatalogItems.description);
}
async function replaceProcurementCatalogSavedItems(input, user, options) {
  const db = options?.db ?? await requireDb();
  const items = Array.from(new Map(input.items.map((item) => [item.catalogItemId, item])).values());
  await assertActiveCatalogItemIds(items.map((item) => item.catalogItemId), db);
  await db.delete(procurementCatalogSavedItems).where(eq(procurementCatalogSavedItems.userId, user.id));
  if (items.length) await db.insert(procurementCatalogSavedItems).values(items.map((item) => ({ userId: user.id, catalogItemId: item.catalogItemId, quantity: item.quantity.toFixed(2) })));
  return listProcurementCatalogSavedItems(user, { db });
}
async function clearProcurementCatalogSavedItems(user, options) {
  const db = options?.db ?? await requireDb();
  await db.delete(procurementCatalogSavedItems).where(eq(procurementCatalogSavedItems.userId, user.id));
  return { cleared: true };
}
async function listProcurementCatalogFavorites(user, options) {
  const db = options?.db ?? await requireDb();
  const rows = await db.select().from(procurementCatalogFavorites).where(eq(procurementCatalogFavorites.userId, user.id));
  const catalogItemIds = rows.map((row) => row.catalogItemId);
  if (!catalogItemIds.length) return [];
  return db.select().from(procurementCatalogItems).where(and(inArray(procurementCatalogItems.id, catalogItemIds), eq(procurementCatalogItems.isActive, 1))).orderBy(procurementCatalogItems.description);
}
async function setProcurementCatalogFavorite(input, user, options) {
  const db = options?.db ?? await requireDb();
  await assertActiveCatalogItemIds([input.catalogItemId], db);
  if (input.isFavorite) {
    await db.insert(procurementCatalogFavorites).values({ userId: user.id, catalogItemId: input.catalogItemId }).onConflictDoNothing();
  } else {
    await db.delete(procurementCatalogFavorites).where(and(eq(procurementCatalogFavorites.userId, user.id), eq(procurementCatalogFavorites.catalogItemId, input.catalogItemId)));
  }
  return { catalogItemId: input.catalogItemId, isFavorite: input.isFavorite };
}
async function getProcurementCatalogItem(catalogItemId) {
  const db = await requireDb();
  const [item] = await db.select().from(procurementCatalogItems).where(and(eq(procurementCatalogItems.id, catalogItemId), eq(procurementCatalogItems.isActive, 1))).limit(1);
  return item ?? null;
}
async function assertActiveCatalogItemIds(catalogItemIds, db) {
  const ids = Array.from(new Set(catalogItemIds.filter((catalogItemId) => typeof catalogItemId === "number")));
  if (!ids.length) return;
  const rows = await db.select({ id: procurementCatalogItems.id }).from(procurementCatalogItems).where(and(inArray(procurementCatalogItems.id, ids), eq(procurementCatalogItems.isActive, 1)));
  if (rows.length !== ids.length) throw new Error("Every selected catalog item must be active and valid.");
}
function validateSupplierTagInput(name) {
  const trimmed = name.trim().replace(/\s+/g, " ");
  if (trimmed.length < 2 || trimmed.length > 120) return null;
  return trimmed;
}
async function getSupplierTagData() {
  const db = await requireDb();
  const [tags, assignments] = await Promise.all([
    db.select().from(supplierTags).orderBy(supplierTags.name),
    db.select().from(supplierTagAssignments)
  ]);
  return { tags, assignments };
}
async function createSupplierTag(input, user) {
  const db = await requireDb();
  const name = validateSupplierTagInput(input.name);
  if (!name) throw new Error("Tag names must contain 2 to 120 characters.");
  await db.insert(supplierTags).values({ name, description: input.description?.trim() || null, createdById: user.id });
  const [tag] = await db.select().from(supplierTags).where(eq(supplierTags.name, name)).limit(1);
  if (!tag) throw new Error("Supplier tag could not be created.");
  await writeAuditEvent({ entityType: "supplier_tag", entityId: tag.id, action: "created", performedById: user.id, performedByRole: normalizeProcurementRole(user.role), details: { name } });
  return tag;
}
async function setSupplierTags(input, user, options) {
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
function validateSupplierEvaluationScores(scores) {
  return scores.length === 4 && scores.every((score) => Number.isInteger(score) && score >= 1 && score <= 5);
}
async function createSupplierEvaluation(input, user) {
  const scores = [input.qualityScore, input.deliveryScore, input.pricingScore, input.complianceScore];
  if (!validateSupplierEvaluationScores(scores)) throw new Error("Each supplier evaluation score must be an integer from 1 to 5.");
  const db = await requireDb();
  await db.insert(supplierEvaluations).values({ ...input, purchaseOrderId: input.purchaseOrderId ?? null, remarks: input.remarks?.trim() || null, evaluatedById: user.id });
  const [created] = await db.select().from(supplierEvaluations).where(and(eq(supplierEvaluations.supplierId, input.supplierId), eq(supplierEvaluations.evaluatedById, user.id))).orderBy(desc(supplierEvaluations.id)).limit(1);
  if (!created) throw new Error("Supplier evaluation could not be saved.");
  await writeAuditEvent({ entityType: "supplier_evaluation", entityId: created.id, action: "created", performedById: user.id, performedByRole: normalizeProcurementRole(user.role), details: { supplierId: input.supplierId } });
  return created;
}
async function updateSupplierEvaluation(input, user) {
  const scores = [input.qualityScore, input.deliveryScore, input.pricingScore, input.complianceScore];
  if (!validateSupplierEvaluationScores(scores)) throw new Error("Each supplier evaluation score must be an integer from 1 to 5.");
  const db = await requireDb();
  const [evaluation] = await db.select().from(supplierEvaluations).where(eq(supplierEvaluations.id, input.evaluationId)).limit(1);
  if (!evaluation) throw new Error("Supplier evaluation not found.");
  await db.update(supplierEvaluations).set({ qualityScore: input.qualityScore, deliveryScore: input.deliveryScore, pricingScore: input.pricingScore, complianceScore: input.complianceScore, remarks: input.remarks?.trim() || null }).where(eq(supplierEvaluations.id, evaluation.id));
  await writeAuditEvent({ entityType: "supplier_evaluation", entityId: evaluation.id, action: "updated", performedById: user.id, performedByRole: normalizeProcurementRole(user.role) });
}
async function listSupplierEvaluations() {
  const db = await requireDb();
  return db.select().from(supplierEvaluations).orderBy(desc(supplierEvaluations.evaluatedAt));
}
async function getVerifiedEvaluationOrder(input, user, audience) {
  const db = await requireDb();
  const [order] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, input.purchaseOrderId)).limit(1);
  if (!order || order.supplierId !== input.supplierId) throw new Error("Select a valid Purchase Order for the selected supplier.");
  const [request] = await db.select().from(purchaseRequests).where(eq(purchaseRequests.id, order.purchaseRequestId)).limit(1);
  if (!request) throw new Error("The selected Purchase Order has no linked Purchase Request.");
  if (audience === "end_user" && request.requestedById !== user.id) throw new Error("End-Users may submit supplier feedback only for Purchase Orders linked to their own Purchase Requests.");
  return { order, request };
}
async function createSupplierEvaluationForm(input, audience, user) {
  const responseError = validateSupplierEvaluationResponses(audience, input.responseScores);
  if (responseError) throw new Error(responseError);
  const { order, request } = await getVerifiedEvaluationOrder(input, user, audience);
  const db = await requireDb();
  const [supplier] = await db.select().from(suppliers).where(eq(suppliers.id, input.supplierId)).limit(1);
  if (!supplier) throw new Error("The selected supplier could not be found.");
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
    urgentPurchaseRequestUpdatedAt: urgentPurchaseRequestReference ? /* @__PURE__ */ new Date() : null,
    officeId: request.officeId,
    evaluationAudience: audience,
    goodsServicesType: audience === "end_user" ? input.goodsServicesType?.trim() || null : null,
    supplierRegistryReference: supplier.philgepsRegistrationNumber?.trim() || (audience === "procurement_office" ? input.supplierRegistryReference?.trim() || null : null),
    supplierRegistryRegisteredAt: supplier.philgepsRegistrationDate ?? (audience === "procurement_office" ? input.supplierRegistryRegisteredAt ?? null : null),
    supplierRegistryExpiresAt: supplier.philgepsExpirationDate ?? (audience === "procurement_office" ? input.supplierRegistryExpiresAt ?? null : null),
    responseScores: input.responseScores,
    ...summary,
    remarks: input.remarks?.trim() || null,
    respondentName: input.respondentName?.trim() || user.name || null,
    respondentSignedAt: /* @__PURE__ */ new Date(),
    evaluatedById: user.id
  }).returning();
  if (!created) throw new Error("Supplier Evaluation Form could not be saved.");
  await writeAuditEvent({ entityType: "supplier_evaluation", entityId: created.id, action: `${audience}_form_submitted`, performedById: user.id, performedByRole: normalizeProcurementRole(user.role), details: { supplierId: input.supplierId, purchaseOrderId: order.id, criterionCount: Object.keys(input.responseScores).length, originalPurchaseRequestNumber: request.prNumber, reportedPurchaseRequestNumber, urgentPurchaseRequestReference } });
  return created;
}
async function listPendingSupplierEvaluationApprovals() {
  const db = await requireDb();
  const evaluations = await db.select().from(supplierEvaluations).orderBy(desc(supplierEvaluations.evaluatedAt));
  if (!evaluations.length) return [];
  const approvals = await db.select().from(supplierEvaluationApprovals);
  const approvedEvaluationIds = new Set(approvals.map((approval) => approval.supplierEvaluationId));
  const pending = evaluations.filter((evaluation) => !approvedEvaluationIds.has(evaluation.id));
  if (!pending.length) return [];
  const supplierRows = await db.select().from(suppliers).where(inArray(suppliers.id, Array.from(new Set(pending.map((evaluation) => evaluation.supplierId)))));
  const orderRows = await db.select().from(purchaseOrders).where(inArray(purchaseOrders.id, Array.from(new Set(pending.map((evaluation) => evaluation.purchaseOrderId).filter((id) => Boolean(id))))));
  return pending.map((evaluation) => ({ evaluation, supplier: supplierRows.find((supplier) => supplier.id === evaluation.supplierId) ?? null, purchaseOrder: orderRows.find((order) => order.id === evaluation.purchaseOrderId) ?? null }));
}
async function signSupplierEvaluation(input, user) {
  const db = await requireDb();
  const [evaluation] = await db.select().from(supplierEvaluations).where(eq(supplierEvaluations.id, input.supplierEvaluationId)).limit(1);
  if (!evaluation) throw new Error("Supplier Evaluation Form not found.");
  const [existing] = await db.select().from(supplierEvaluationApprovals).where(eq(supplierEvaluationApprovals.supplierEvaluationId, evaluation.id)).limit(1);
  if (existing) throw new Error("This Supplier Evaluation Form has already been electronically approved.");
  const approvedAt = /* @__PURE__ */ new Date();
  const consentStatement = "I confirm that I am the authorized approver and electronically approve this completed Supplier Evaluation Form.";
  const approverName = user.name?.trim() || user.email || `User #${user.id}`;
  const signatureDigest = createHash("sha256").update(JSON.stringify({ supplierEvaluationId: evaluation.id, evaluatedAt: evaluation.evaluatedAt.toISOString(), respondentName: evaluation.respondentName, responseScores: evaluation.responseScores, approverId: user.id, approverName, approverDesignation: input.approverDesignation.trim(), consentStatement, approvedAt: approvedAt.toISOString() })).digest("hex");
  const [approval] = await db.insert(supplierEvaluationApprovals).values({ supplierEvaluationId: evaluation.id, approvedById: user.id, approverName, approverDesignation: input.approverDesignation.trim(), consentStatement, signatureDigest, approvedAt }).returning();
  if (!approval) throw new Error("Electronic approval could not be recorded.");
  await writeAuditEvent({ entityType: "supplier_evaluation", entityId: evaluation.id, action: "electronically_approved", performedById: user.id, performedByRole: normalizeProcurementRole(user.role), details: { approvalId: approval.id, approverName, approverDesignation: approval.approverDesignation, signatureDigest } });
  return { evaluation, approval };
}
async function listSupplierEvaluationsForEndUser(user) {
  const db = await requireDb();
  return db.select().from(supplierEvaluations).where(and(eq(supplierEvaluations.evaluatedById, user.id), eq(supplierEvaluations.evaluationAudience, "end_user"))).orderBy(desc(supplierEvaluations.evaluatedAt));
}
async function listEligibleSupplierEvaluationOrders(user) {
  const db = await requireDb();
  const requests = await db.select().from(purchaseRequests).where(eq(purchaseRequests.requestedById, user.id));
  if (!requests.length) return [];
  const requestIds = requests.map((request) => request.id);
  const orders = await db.select().from(purchaseOrders).where(inArray(purchaseOrders.purchaseRequestId, requestIds)).orderBy(desc(purchaseOrders.createdAt));
  return orders.map((order) => ({ order, request: requests.find((request) => request.id === order.purchaseRequestId) ?? null }));
}
async function createLetterOfNotice(input, user) {
  const db = await requireDb();
  const noticeNumber = `LON-${(/* @__PURE__ */ new Date()).getFullYear()}-${Date.now().toString().slice(-7)}`;
  const status = input.issueNow ? "issued" : "draft";
  const reminderDate = input.demandDueDate ? new Date(input.demandDueDate.getTime() - 3 * 24 * 60 * 60 * 1e3) : null;
  await db.insert(lettersOfNotice).values({ noticeNumber, noticeType: input.noticeType, purchaseRequestId: input.purchaseRequestId ?? null, supplierId: input.supplierId ?? null, subject: input.subject.trim(), body: input.body.trim(), status, issuedById: user.id, issuedAt: input.issueNow ? /* @__PURE__ */ new Date() : null, demandDueDate: input.demandDueDate ?? null, demandReminderDate: reminderDate });
  const [notice] = await db.select().from(lettersOfNotice).where(eq(lettersOfNotice.noticeNumber, noticeNumber)).limit(1);
  if (!notice) throw new Error("Letter of Notice could not be saved.");
  await writeAuditEvent({ entityType: "letter_of_notice", entityId: notice.id, action: input.issueNow ? "issued" : "created", performedById: user.id, performedByRole: normalizeProcurementRole(user.role), details: { noticeNumber } });
  return notice;
}
async function listLettersOfNotice() {
  const db = await requireDb();
  return db.select().from(lettersOfNotice).orderBy(desc(lettersOfNotice.createdAt));
}
async function createBacTransmittal(input, user) {
  const db = await requireDb();
  const transmittalNumber = `BAC-T-${(/* @__PURE__ */ new Date()).getFullYear()}-${Date.now().toString().slice(-7)}`;
  const status = input.sendNow ? "sent" : "draft";
  await db.insert(bacTransmittals).values({ transmittalNumber, purchaseRequestId: input.purchaseRequestId ?? null, fromOffice: input.fromOffice.trim(), toOffice: input.toOffice.trim(), subject: input.subject.trim(), remarks: input.remarks?.trim() || null, status, preparedById: user.id, sentAt: input.sendNow ? /* @__PURE__ */ new Date() : null });
  const [transmittal] = await db.select().from(bacTransmittals).where(eq(bacTransmittals.transmittalNumber, transmittalNumber)).limit(1);
  if (!transmittal) throw new Error("BAC Transmittal could not be saved.");
  await writeAuditEvent({ entityType: "bac_transmittal", entityId: transmittal.id, action: input.sendNow ? "sent" : "created", performedById: user.id, performedByRole: normalizeProcurementRole(user.role), details: { transmittalNumber } });
  return transmittal;
}
async function acknowledgeBacTransmittal(input, user) {
  const db = await requireDb();
  const [transmittal] = await db.select().from(bacTransmittals).where(eq(bacTransmittals.id, input.transmittalId)).limit(1);
  if (!transmittal || transmittal.status !== "sent") throw new Error("Only a sent BAC Transmittal can be acknowledged.");
  await db.update(bacTransmittals).set({ status: "acknowledged", acknowledgedByName: input.acknowledgedByName.trim(), acknowledgedAt: /* @__PURE__ */ new Date() }).where(eq(bacTransmittals.id, input.transmittalId));
  await writeAuditEvent({ entityType: "bac_transmittal", entityId: input.transmittalId, action: "acknowledged", performedById: user.id, performedByRole: normalizeProcurementRole(user.role) });
}
async function listBacTransmittals() {
  const db = await requireDb();
  return db.select().from(bacTransmittals).orderBy(desc(bacTransmittals.createdAt));
}
async function createAppPpmpEntry(input, user) {
  const db = await requireDb();
  await assertActiveCatalogItemIds([input.catalogItemId], db);
  await db.insert(appPpmpEntries).values({ ...input, catalogItemId: input.catalogItemId ?? null, papCode: input.papCode || null, projectTitle: input.projectTitle || null, modeOfProcurement: input.modeOfProcurement || "Small Value Procurement", fundSource: input.fundSource || null, procurementSchedule: input.procurementSchedule || null, remarks: input.remarks || null, plannedAmount: input.plannedAmount.toFixed(2), preparedById: user.id });
  const [entry] = await db.select().from(appPpmpEntries).where(and(eq(appPpmpEntries.officeId, input.officeId), eq(appPpmpEntries.description, input.description), eq(appPpmpEntries.fiscalYear, input.fiscalYear))).limit(1);
  if (!entry) throw new Error("APP/PPMP entry could not be created.");
  await writeAuditEvent({ entityType: "app_ppmp_entry", entityId: entry.id, action: "created", performedById: user.id, performedByRole: normalizeProcurementRole(user.role), details: { fiscalYear: input.fiscalYear } });
  return entry;
}
async function listUserProfiles() {
  const db = await requireDb();
  return db.select({ id: users.id, name: users.name, email: users.email, role: users.role, officeName: users.officeName, lastSignedIn: users.lastSignedIn }).from(users);
}
async function updateUserProcurementRole(userId, role, actor) {
  const db = await requireDb();
  await db.update(users).set({ role }).where(eq(users.id, userId));
  await writeAuditEvent({ entityType: "user_profile", entityId: userId, action: "role_updated", performedById: actor.id, performedByRole: normalizeProcurementRole(actor.role), details: { assignedRole: role } });
}
async function updateUserOffice(userId, officeName, actor) {
  const db = await requireDb();
  await db.update(users).set({ officeName: officeName.trim() || null }).where(eq(users.id, userId));
  await writeAuditEvent({ entityType: "user_profile", entityId: userId, action: "office_assigned", performedById: actor.id, performedByRole: normalizeProcurementRole(actor.role), details: { assignedOffice: officeName.trim() } });
}
async function updateMyOffice(officeName, user) {
  const db = await requireDb();
  const [updated] = await db.update(users).set({ officeName: officeName.trim() || null }).where(eq(users.id, user.id)).returning();
  await writeAuditEvent({ entityType: "user_profile", entityId: user.id, action: "profile_office_updated", performedById: user.id, performedByRole: normalizeProcurementRole(user.role), details: { officeName: officeName.trim() } });
  return updated;
}
async function getDocumentEntityRequesterId(entityType, entityId, db) {
  if (entityType === "app_ppmp_entry") {
    const [entry] = await db.select().from(appPpmpEntries).where(eq(appPpmpEntries.id, entityId)).limit(1);
    return entry?.preparedById ?? null;
  }
  let purchaseRequestId = null;
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
    let purchaseOrderId = entityType === "purchase_order" ? entityId : null;
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
async function assertDocumentAccess(entityType, entityId, user, db) {
  const requesterId = await getDocumentEntityRequesterId(entityType, entityId, db);
  if (!requesterId) throw new Error("The procurement record selected for this document could not be found.");
  if (normalizeProcurementRole(user.role) === "end_user" && requesterId !== user.id) throw new Error("End-Users may upload documents only to their own procurement records.");
  return requesterId;
}
async function createWorkflowNotification(input) {
  const db = await requireDb();
  await db.insert(workflowNotifications).values(input);
}
async function notifyRoles(roles, input) {
  const db = await requireDb();
  const people = await db.select().from(users);
  const recipientIds = Array.from(new Set(people.filter((person) => roleCanAct(normalizeProcurementRole(person.role), roles)).map((person) => person.id)));
  await Promise.all(recipientIds.map((recipientUserId) => createWorkflowNotification({ ...input, recipientUserId })));
}
async function createProcurementDocument(input, user, options) {
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
async function listProcurementDocuments(user) {
  const db = await requireDb();
  const documents = await db.select().from(procurementDocuments);
  if (normalizeProcurementRole(user.role) !== "end_user") return documents;
  const visible = await Promise.all(documents.map(async (document) => ({ document, requesterId: await getDocumentEntityRequesterId(document.entityType, document.entityId, db) })));
  return visible.filter(({ requesterId }) => requesterId === user.id).map(({ document }) => document);
}
async function listWorkflowCorrections(user) {
  const db = await requireDb();
  return normalizeProcurementRole(user.role) === "end_user" ? db.select().from(workflowCorrections).where(eq(workflowCorrections.assignedToId, user.id)) : db.select().from(workflowCorrections);
}
async function listWorkflowNotifications(user) {
  const db = await requireDb();
  return db.select().from(workflowNotifications).where(eq(workflowNotifications.recipientUserId, user.id));
}
async function markWorkflowNotificationRead(notificationId, user, options) {
  const db = options?.db ?? await requireDb();
  const [notification] = await db.select().from(workflowNotifications).where(eq(workflowNotifications.id, notificationId)).limit(1);
  if (!notification || notification.recipientUserId !== user.id) throw new Error("Notification not found.");
  if (!notification.readAt) await db.update(workflowNotifications).set({ readAt: /* @__PURE__ */ new Date() }).where(eq(workflowNotifications.id, notificationId));
}
async function requestPreCanvassCorrection(input, user, options) {
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
async function rejectPreCanvass(input, user, options) {
  const db = options?.db ?? await requireDb();
  const recordAudit = options?.recordAudit ?? writeAuditEvent;
  const notifyUser = options?.notifyUser ?? createWorkflowNotification;
  const reason = input.reason.trim();
  if (reason.length < 10) throw new Error("An RFQ rejection reason of at least 10 characters is required.");
  const [preCanvass] = await db.select().from(preCanvasses).where(eq(preCanvasses.id, input.preCanvassId)).limit(1);
  if (!preCanvass || !["submitted", "draft"].includes(preCanvass.status)) throw new Error("Only an active Pre-Canvass package can be rejected.");
  const [pr] = await db.select().from(purchaseRequests).where(eq(purchaseRequests.id, preCanvass.purchaseRequestId)).limit(1);
  if (!pr) throw new Error("The linked Purchase Request could not be found.");
  await db.update(preCanvasses).set({ status: "rejected", updatedAt: /* @__PURE__ */ new Date() }).where(eq(preCanvasses.id, preCanvass.id));
  await db.update(purchaseRequests).set({ status: "rejected", updatedAt: /* @__PURE__ */ new Date() }).where(eq(purchaseRequests.id, pr.id));
  await recordAudit({ entityType: "pre_canvass", entityId: preCanvass.id, action: "rejected", performedById: user.id, performedByRole: normalizeProcurementRole(user.role), details: { preCanvassNumber: preCanvass.preCanvassNumber, purchaseRequestId: pr.id, reason, remarks: input.remarks?.trim() || null } });
  await recordAudit({ entityType: "purchase_request", entityId: pr.id, action: "rejected", performedById: user.id, performedByRole: normalizeProcurementRole(user.role), details: { prNumber: pr.prNumber, source: "rfq", reason, remarks: input.remarks?.trim() || null } });
  await notifyUser({ recipientUserId: pr.requestedById, kind: "status_change", title: `RFQ ${preCanvass.preCanvassNumber} rejected`, body: input.remarks?.trim() ? `${reason} \u2014 ${input.remarks.trim()}` : reason, entityType: "pre_canvass", entityId: preCanvass.id });
  return { ...preCanvass, status: "rejected" };
}
async function rejectRfq(input, user, options) {
  const db = options?.db ?? await requireDb();
  const recordAudit = options?.recordAudit ?? writeAuditEvent;
  const notifyUser = options?.notifyUser ?? createWorkflowNotification;
  const reason = input.reason.trim();
  if (reason.length < 10) throw new Error("An RFQ rejection reason of at least 10 characters is required.");
  const [rfq] = await db.select().from(rfqs).where(eq(rfqs.id, input.rfqId)).limit(1);
  if (!rfq || ["rejected", "closed"].includes(rfq.status)) throw new Error("Only an active RFQ can be rejected.");
  const [pr] = await db.select().from(purchaseRequests).where(eq(purchaseRequests.id, rfq.purchaseRequestId)).limit(1);
  if (!pr) throw new Error("The linked Purchase Request could not be found.");
  await db.update(rfqs).set({ status: "rejected", updatedAt: /* @__PURE__ */ new Date() }).where(eq(rfqs.id, rfq.id));
  await db.update(purchaseRequests).set({ status: "rejected", updatedAt: /* @__PURE__ */ new Date() }).where(eq(purchaseRequests.id, pr.id));
  await recordAudit({ entityType: "rfq", entityId: rfq.id, action: "rejected", performedById: user.id, performedByRole: normalizeProcurementRole(user.role), details: { rfqNumber: rfq.rfqNumber, purchaseRequestId: pr.id, reason, remarks: input.remarks?.trim() || null } });
  await recordAudit({ entityType: "purchase_request", entityId: pr.id, action: "rejected", performedById: user.id, performedByRole: normalizeProcurementRole(user.role), details: { prNumber: pr.prNumber, source: "rfq", reason, remarks: input.remarks?.trim() || null } });
  await notifyUser({ recipientUserId: pr.requestedById, kind: "status_change", title: `RFQ ${rfq.rfqNumber} rejected`, body: input.remarks?.trim() ? `${reason} \u2014 ${input.remarks.trim()}` : reason, entityType: "rfq", entityId: rfq.id });
  return { ...rfq, status: "rejected" };
}
async function recordPreCanvassResubmission(preCanvassId, user, options) {
  const db = options?.db ?? await requireDb();
  const notifyRoleGroup = options?.notifyRoleGroup ?? notifyRoles;
  const openCorrections = await db.select().from(workflowCorrections).where(and(eq(workflowCorrections.entityType, "pre_canvass"), eq(workflowCorrections.entityId, preCanvassId), eq(workflowCorrections.assignedToId, user.id), eq(workflowCorrections.status, "open")));
  if (openCorrections.length) {
    await db.update(workflowCorrections).set({ status: "resubmitted", resolvedAt: /* @__PURE__ */ new Date() }).where(and(eq(workflowCorrections.entityType, "pre_canvass"), eq(workflowCorrections.entityId, preCanvassId), eq(workflowCorrections.assignedToId, user.id), eq(workflowCorrections.status, "open")));
  }
  await notifyRoleGroup(["procurement_officer"], { kind: "action_required", ...describePreCanvassHandoff(openCorrections.length > 0), entityType: "pre_canvass", entityId: preCanvassId });
}
async function requestAbstractCorrection(input, user, options) {
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
async function resubmitAbstract(preCanvassId, user, options) {
  const db = options?.db ?? await requireDb();
  const notifyRoleGroup = options?.notifyRoleGroup ?? notifyRoles;
  const [abstract] = await db.select().from(abstractsOfCanvass).where(eq(abstractsOfCanvass.preCanvassId, preCanvassId)).limit(1);
  if (!abstract || abstract.status !== "returned" || abstract.preparedById !== user.id) throw new Error("Only the assigned Procurement Officer may resubmit this returned Abstract.");
  await db.update(abstractsOfCanvass).set({ status: "recommended", decidedById: null, decisionRemarks: null }).where(eq(abstractsOfCanvass.id, abstract.id));
  await db.update(workflowCorrections).set({ status: "resubmitted", resolvedAt: /* @__PURE__ */ new Date() }).where(and(eq(workflowCorrections.entityType, "abstract_of_canvass"), eq(workflowCorrections.entityId, abstract.id), eq(workflowCorrections.assignedToId, user.id), eq(workflowCorrections.status, "open")));
  await notifyRoleGroup(["administrative_approver"], { kind: "action_required", title: "Abstract resubmitted", body: "A corrected Abstract of Canvass is ready for a new administrative decision.", entityType: "abstract_of_canvass", entityId: abstract.id });
}
async function requestPurchaseOrderCorrection(input, user, options) {
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
async function resubmitPurchaseOrder(purchaseOrderId, user, options) {
  const db = options?.db ?? await requireDb();
  const notifyRoleGroup = options?.notifyRoleGroup ?? notifyRoles;
  const [purchaseOrder] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, purchaseOrderId)).limit(1);
  if (!purchaseOrder || purchaseOrder.status !== "returned" || purchaseOrder.generatedById !== user.id) throw new Error("Only the issuing Procurement Officer may reissue this returned Purchase Order.");
  await db.update(purchaseOrders).set({ status: "issued" }).where(eq(purchaseOrders.id, purchaseOrder.id));
  await db.update(workflowCorrections).set({ status: "resubmitted", resolvedAt: /* @__PURE__ */ new Date() }).where(and(eq(workflowCorrections.entityType, "purchase_order"), eq(workflowCorrections.entityId, purchaseOrder.id), eq(workflowCorrections.assignedToId, user.id), eq(workflowCorrections.status, "open")));
  await notifyRoleGroup(["administrative_approver"], { kind: "status_change", title: "Purchase Order reissued", body: "A corrected Purchase Order has been reissued and is ready for monitored delivery.", entityType: "purchase_order", entityId: purchaseOrder.id });
}
async function listPurchaseRequests(user) {
  const db = await requireDb();
  const records = normalizeProcurementRole(user.role) === "end_user" ? db.select().from(purchaseRequests).where(eq(purchaseRequests.requestedById, user.id)) : db.select().from(purchaseRequests);
  const [archivedArchives, allDecisions, allAudits] = await Promise.all([
    db.select().from(testRecordArchives).where(isNull(testRecordArchives.cleanedAt)),
    db.select().from(purchaseRequestDecisions),
    db.select().from(auditTrails).where(eq(auditTrails.entityType, "purchase_request"))
  ]);
  const archivedPpmpEntryIds = new Set(archivedArchives.map((archive) => archive.ppmpEntryId));
  const activeRecords = (await records).filter((record) => !record.ppmpEntryId || !archivedPpmpEntryIds.has(record.ppmpEntryId));
  return activeRecords.map((pr) => {
    const prDecisions = allDecisions.filter((d) => d.purchaseRequestId === pr.id);
    const prAudits = allAudits.filter((a) => a.entityId === pr.id);
    const rejections = prDecisions.filter((d) => d.decisionType === "rejected");
    const fallbackAuditRejections = prAudits.filter((a) => a.action === "rejected");
    const rejectionCount = Math.max(rejections.length, fallbackAuditRejections.length);
    const latestRejectionReason = rejections.at(-1)?.reason || rejections.at(-1)?.remarks || fallbackAuditRejections.at(-1)?.details?.reason || null;
    const returns = prDecisions.filter((d) => d.decisionType === "returned");
    const fallbackAuditReturns = prAudits.filter((a) => a.action === "returned");
    const returnCount = Math.max(returns.length, fallbackAuditReturns.length);
    const latestReturnReason = returns.at(-1)?.reason || returns.at(-1)?.remarks || fallbackAuditReturns.at(-1)?.details?.reason || null;
    const latestDecisionDate = prDecisions.at(-1)?.createdAt || pr.updatedAt || pr.createdAt;
    return {
      ...pr,
      rejectionCount,
      latestRejectionReason,
      returnCount,
      latestReturnReason,
      latestDecisionDate
    };
  });
}
async function getPurchaseRequestDetail(purchaseRequestId, user) {
  const db = await requireDb();
  const [purchaseRequest] = await db.select().from(purchaseRequests).where(eq(purchaseRequests.id, purchaseRequestId)).limit(1);
  if (!purchaseRequest) throw new Error("Purchase Request not found.");
  if (normalizeProcurementRole(user.role) === "end_user" && purchaseRequest.requestedById !== user.id) throw new Error("End-Users may access only their own Purchase Requests.");
  const items = await db.select().from(purchaseRequestItems).where(eq(purchaseRequestItems.purchaseRequestId, purchaseRequestId));
  return { purchaseRequest, items };
}
async function createPurchaseRequest(input, user, options) {
  const db = options?.db ?? await requireDb();
  const recordAudit = options?.recordAudit ?? writeAuditEvent;
  const totalEstimate = input.items.reduce((sum, item) => sum + item.quantity * item.estimatedUnitCost, 0);
  if (totalEstimate <= 0) throw new Error("A Purchase Request must contain at least one item with a positive estimated cost.");
  await assertActiveCatalogItemIds(input.items.map((item) => item.catalogItemId), db);
  const [requestedRows, approvedRows] = await Promise.all([
    input.requestedSignatoryId ? db.select().from(procurementSignatories).where(eq(procurementSignatories.id, input.requestedSignatoryId)).limit(1) : Promise.resolve([]),
    input.approvedSignatoryId ? db.select().from(procurementSignatories).where(eq(procurementSignatories.id, input.approvedSignatoryId)).limit(1) : Promise.resolve([])
  ]);
  const requestedSignatory = requestedRows[0];
  const approvedSignatory = approvedRows[0];
  if (input.requestedSignatoryId && (!requestedSignatory || !requestedSignatory.isActive || !requestedSignatory.mayRequest)) throw new Error("Select an active signatory authorized to request Purchase Requests.");
  if (input.approvedSignatoryId && (!approvedSignatory || !approvedSignatory.isActive || !approvedSignatory.mayApprove)) throw new Error("Select an active signatory authorized to approve Purchase Requests.");
  const prNumber = `PR-${(/* @__PURE__ */ new Date()).getFullYear()}-${Date.now().toString().slice(-7)}`;
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
    ppmpEntryId: input.ppmpEntryId ?? null
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
    totalCost: (item.quantity * item.estimatedUnitCost).toFixed(2)
  })));
  await recordAudit({ entityType: "purchase_request", entityId: created.id, action: "created", performedById: user.id, performedByRole: normalizeProcurementRole(user.role), details: { prNumber, requestedSignatoryId: requestedSignatory?.id ?? null, approvedSignatoryId: approvedSignatory?.id ?? null } });
  return created;
}
async function advancePurchaseRequest(input, user, options) {
  const db = options?.db ?? await requireDb();
  const recordAudit = options?.recordAudit ?? writeAuditEvent;
  const [pr] = await db.select().from(purchaseRequests).where(eq(purchaseRequests.id, input.purchaseRequestId)).limit(1);
  if (!pr) throw new Error("Purchase Request not found.");
  const update = { status: input.nextStatus };
  if (input.nextStatus === "procurement_review") {
    if (!pr.ppmpEntryId) throw new Error("Link the Purchase Request to a PPMP entry before forwarding the procurement package.");
    const [preCanvass] = await db.select().from(preCanvasses).where(eq(preCanvasses.purchaseRequestId, pr.id)).limit(1);
    if (!preCanvass) throw new Error("Submit a complete three-supplier Pre-Canvass before forwarding the procurement package.");
    const quotes = await db.select().from(preCanvassQuotes).where(eq(preCanvassQuotes.preCanvassId, preCanvass.id));
    const validQuotes = getValidPreCanvassQuotes(quotes);
    if (!hasRequiredSupplierQuotations(validQuotes.length)) {
      throw new Error("Submit a complete three-supplier Pre-Canvass before forwarding the procurement package.");
    }
    if (preCanvass.status === "draft") {
      await db.update(preCanvasses).set({ status: "submitted", updatedAt: /* @__PURE__ */ new Date() }).where(eq(preCanvasses.id, preCanvass.id));
      await recordAudit({
        entityType: "pre_canvass",
        entityId: preCanvass.id,
        action: "submitted_to_procurement",
        performedById: user.id,
        performedByRole: normalizeProcurementRole(user.role),
        details: { quoteCount: validQuotes.length, autoSubmittedOnPrForward: true }
      });
    } else if (preCanvass.status !== "submitted" && preCanvass.status !== "abstracted" && preCanvass.status !== "approved") {
      throw new Error(`The linked Pre-Canvass is currently in "${preCanvass.status}" status and cannot be forwarded.`);
    }
    const [allotment] = await db.select().from(budgetAllotments).where(and(eq(budgetAllotments.officeId, pr.officeId), eq(budgetAllotments.objectOfExpenditureId, pr.objectOfExpenditureId), eq(budgetAllotments.fiscalYear, (/* @__PURE__ */ new Date()).getFullYear()))).limit(1);
    if (!allotment) throw new Error("No matching budget allotment exists for this office and object of expenditure.");
    if (!validatePrBudgetSubmission({ allottedAmount: allotment.allottedAmount, committedAmount: allotment.committedAmount, purchaseRequestAmount: pr.totalEstimate }).allowed) throw new Error("The Purchase Request exceeds the available office-level budget allotment.");
    update.submittedAt = /* @__PURE__ */ new Date();
  }
  if (input.nextStatus === "approval_review") update.procurementReviewedById = user.id;
  if (input.nextStatus === "approved") update.administrativeApprovedById = user.id;
  await db.update(purchaseRequests).set(update).where(eq(purchaseRequests.id, pr.id));
  if (input.nextStatus === "procurement_review") {
    await db.update(budgetAllotments).set({ committedAmount: sql`${budgetAllotments.committedAmount} + ${pr.totalEstimate}` }).where(and(eq(budgetAllotments.officeId, pr.officeId), eq(budgetAllotments.objectOfExpenditureId, pr.objectOfExpenditureId), eq(budgetAllotments.fiscalYear, (/* @__PURE__ */ new Date()).getFullYear())));
  }
  await recordAudit({ entityType: "purchase_request", entityId: pr.id, action: `status:${input.nextStatus}`, performedById: user.id, performedByRole: normalizeProcurementRole(user.role), details: { prNumber: pr.prNumber } });
  return { ...pr, ...update };
}
async function rejectPurchaseRequest(input, user, options) {
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
  const nonRejectable = /* @__PURE__ */ new Set(["rejected", "delivered", "pmr_logged", "closed", "completed"]);
  if (nonRejectable.has(pr.status)) {
    throw new Error(`Purchase Request in status "${pr.status}" cannot be rejected.`);
  }
  const hasCommittedBudget = ["procurement_review", "approval_review", "approved", "rfq", "po", "po_issued", "budget_review", "supply_review", "bac_review"].includes(pr.status);
  if (hasCommittedBudget) {
    await db.update(budgetAllotments).set({ committedAmount: sql`GREATEST(0, ${budgetAllotments.committedAmount} - ${pr.totalEstimate})` }).where(and(
      eq(budgetAllotments.officeId, pr.officeId),
      eq(budgetAllotments.objectOfExpenditureId, pr.objectOfExpenditureId),
      eq(budgetAllotments.fiscalYear, (/* @__PURE__ */ new Date()).getFullYear())
    ));
  }
  await db.update(purchaseRequests).set({ status: "rejected", updatedAt: /* @__PURE__ */ new Date() }).where(eq(purchaseRequests.id, pr.id));
  await db.insert(purchaseRequestDecisions).values({
    purchaseRequestId: pr.id,
    decisionType: "rejected",
    fromStatus: pr.status,
    toStatus: "rejected",
    reason: input.reason.trim(),
    remarks: input.remarks?.trim() || null,
    performedById: user.id,
    performedByRole: actorRole,
    createdAt: /* @__PURE__ */ new Date()
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
      newStatus: "rejected"
    }
  });
  try {
    await createWorkflowNotification({
      recipientUserId: pr.requestedById,
      kind: "status_change",
      title: `Purchase Request ${pr.prNumber} rejected`,
      body: `Your Purchase Request was rejected: ${input.reason.trim()}`,
      entityType: "purchase_request",
      entityId: pr.id
    });
  } catch {
  }
  return { status: "rejected", reason: input.reason.trim() };
}
async function returnPurchaseRequestForCorrection(input, user, options) {
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
  await db.update(purchaseRequests).set({ status: "returned", updatedAt: /* @__PURE__ */ new Date() }).where(eq(purchaseRequests.id, pr.id));
  await db.insert(workflowCorrections).values({
    entityType: "purchase_request",
    entityId: pr.id,
    requestedById: user.id,
    assignedToId: pr.requestedById,
    reason: input.reason.trim(),
    status: "open",
    createdAt: /* @__PURE__ */ new Date()
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
    createdAt: /* @__PURE__ */ new Date()
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
      newStatus: "returned"
    }
  });
  try {
    await createWorkflowNotification({
      recipientUserId: pr.requestedById,
      kind: "correction",
      title: `Purchase Request ${pr.prNumber} returned for correction`,
      body: `Correction required: ${input.reason.trim()}`,
      entityType: "purchase_request",
      entityId: pr.id
    });
  } catch {
  }
  return { status: "returned", reason: input.reason.trim() };
}
async function resubmitPurchaseRequest(input, user, options) {
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
  await db.update(workflowCorrections).set({ status: "resolved", resolvedAt: /* @__PURE__ */ new Date() }).where(and(eq(workflowCorrections.entityType, "purchase_request"), eq(workflowCorrections.entityId, pr.id), eq(workflowCorrections.status, "open")));
  await db.update(purchaseRequests).set({ status: "procurement_review", submittedAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() }).where(eq(purchaseRequests.id, pr.id));
  await db.insert(purchaseRequestDecisions).values({
    purchaseRequestId: pr.id,
    decisionType: "resubmitted",
    fromStatus: "returned",
    toStatus: "procurement_review",
    reason: input.remarks?.trim() || "Employee corrected and resubmitted the package.",
    remarks: input.remarks?.trim() || null,
    performedById: user.id,
    performedByRole: normalizeProcurementRole(user.role),
    createdAt: /* @__PURE__ */ new Date()
  });
  await recordAudit({
    entityType: "purchase_request",
    entityId: pr.id,
    action: "resubmitted",
    performedById: user.id,
    performedByRole: normalizeProcurementRole(user.role),
    details: { prNumber: pr.prNumber, remarks: input.remarks?.trim() || null }
  });
  try {
    await notifyRoles(["procurement_officer"], {
      kind: "action_required",
      title: "Purchase Request resubmitted",
      body: `PR ${pr.prNumber} has been corrected and resubmitted for verification.`,
      entityType: "purchase_request",
      entityId: pr.id
    });
  } catch {
  }
  return { status: "procurement_review" };
}
async function assignPurchaseRequestOfficer(input, user, options) {
  const db = options?.db ?? await requireDb();
  const recordAudit = options?.recordAudit ?? writeAuditEvent;
  const actorRole = normalizeProcurementRole(user.role);
  if (!roleCanAct(actorRole, ["procurement_officer", "admin"])) {
    throw new Error("Your assigned role is not authorized to assign procurement officers.");
  }
  const [pr] = await db.select().from(purchaseRequests).where(eq(purchaseRequests.id, input.purchaseRequestId)).limit(1);
  if (!pr) throw new Error("Purchase Request not found.");
  await db.update(purchaseRequests).set({ assignedOfficerId: input.officerId, updatedAt: /* @__PURE__ */ new Date() }).where(eq(purchaseRequests.id, pr.id));
  await recordAudit({
    entityType: "purchase_request",
    entityId: pr.id,
    action: "officer_assigned",
    performedById: user.id,
    performedByRole: actorRole,
    details: { prNumber: pr.prNumber, assignedOfficerId: input.officerId }
  });
  return { success: true };
}
async function getPurchaseRequestHistory(purchaseRequestId, user, options) {
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
    db.select().from(users)
  ]);
  const userMap = new Map(allUsers.map((u) => [u.id, u]));
  const assignedOfficer = pr.assignedOfficerId ? userMap.get(pr.assignedOfficerId) : null;
  const requester = userMap.get(pr.requestedById);
  const rejections = decisions.filter((d) => d.decisionType === "rejected");
  const fallbackAuditRejections = audits.filter((a) => a.action === "rejected");
  const totalRejectionCount = Math.max(rejections.length, fallbackAuditRejections.length);
  const returns = decisions.filter((d) => d.decisionType === "returned");
  const totalCorrectionCount = Math.max(returns.length, corrections.length);
  const latestRejectionReason = rejections.at(-1)?.reason || fallbackAuditRejections.at(-1)?.details?.reason || null;
  const latestCorrectionReason = returns.at(-1)?.reason || corrections.at(-1)?.reason || null;
  const statusMeta = getEmployeePrStatus(pr.status);
  const timeline = [];
  for (const decision of decisions) {
    const actor = userMap.get(decision.performedById);
    timeline.push({
      id: `decision-${decision.id}`,
      timestamp: decision.createdAt,
      actorId: decision.performedById,
      actorName: actor?.name || `User #${decision.performedById}`,
      actorRole: OFFICIAL_ROLE_LABELS[decision.performedByRole] ?? decision.performedByRole,
      action: decision.decisionType,
      fromStatus: decision.fromStatus,
      toStatus: decision.toStatus,
      reason: decision.reason,
      remarks: decision.remarks,
      documentId: decision.documentId
    });
  }
  for (const audit of audits) {
    const isAlreadyRepresented = decisions.some((d) => d.createdAt.getTime() === audit.createdAt.getTime() && d.decisionType === audit.action);
    if (!isAlreadyRepresented) {
      const actor = userMap.get(audit.performedById);
      const details = audit.details || {};
      timeline.push({
        id: `audit-${audit.id}`,
        timestamp: audit.createdAt,
        actorId: audit.performedById,
        actorName: actor?.name || `User #${audit.performedById}`,
        actorRole: OFFICIAL_ROLE_LABELS[audit.performedByRole] ?? audit.performedByRole,
        action: audit.action,
        fromStatus: details.previousStatus || null,
        toStatus: details.newStatus || null,
        reason: details.reason || null,
        remarks: details.remarks || null,
        documentId: null
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
    timeline
  };
}
async function createPreCanvass(input, user) {
  const db = await requireDb();
  const [pr] = await db.select().from(purchaseRequests).where(eq(purchaseRequests.id, input.purchaseRequestId)).limit(1);
  if (!pr || pr.requestedById !== user.id) throw new Error("End-Users may prepare a Pre-Canvass only for their own Purchase Request.");
  const preCanvassNumber = `PC-${(/* @__PURE__ */ new Date()).getFullYear()}-${Date.now().toString().slice(-7)}`;
  await db.insert(preCanvasses).values({ preCanvassNumber, purchaseRequestId: input.purchaseRequestId, approvedBudget: (input.approvedBudget ?? Number(pr.totalEstimate)).toFixed(2), quotationDeadline: input.quotationDeadline ?? null, deliveryPeriodDays: input.deliveryPeriodDays ?? 30, priceEvaluationMode: input.priceEvaluationMode ?? "lot_basis", preparedById: user.id });
  const [created] = await db.select().from(preCanvasses).where(eq(preCanvasses.preCanvassNumber, preCanvassNumber)).limit(1);
  if (!created) throw new Error("The Pre-Canvass could not be created.");
  await writeAuditEvent({ entityType: "pre_canvass", entityId: created.id, action: "created", performedById: user.id, performedByRole: normalizeProcurementRole(user.role), details: { preCanvassNumber, purchaseRequestId: input.purchaseRequestId } });
  return created;
}
async function addPreCanvassQuote(input, user) {
  const db = await requireDb();
  const [preCanvass] = await db.select().from(preCanvasses).where(eq(preCanvasses.id, input.preCanvassId)).limit(1);
  if (!preCanvass || preCanvass.preparedById !== user.id || preCanvass.status !== "draft") throw new Error("Supplier quotes may be entered only by the End-User before the Pre-Canvass is submitted.");
  await db.insert(preCanvassQuotes).values({ ...input, totalPrice: input.totalPrice.toFixed(2), isCompliant: input.isCompliant ? 1 : 0, quotationReference: input.quotationReference || null, supplierRepresentative: input.supplierRepresentative || null, acknowledgedAt: input.acknowledgedAt ?? null, receivedBy: input.receivedBy || null, notes: input.notes || null });
  await writeAuditEvent({ entityType: "pre_canvass", entityId: input.preCanvassId, action: "supplier_quote_added", performedById: user.id, performedByRole: normalizeProcurementRole(user.role), details: { supplierId: input.supplierId } });
}
async function submitPreCanvass(preCanvassId, user, options) {
  const db = options?.db ?? await requireDb();
  const recordAudit = options?.recordAudit ?? writeAuditEvent;
  const [preCanvass] = await db.select().from(preCanvasses).where(eq(preCanvasses.id, preCanvassId)).limit(1);
  if (!preCanvass || preCanvass.preparedById !== user.id || preCanvass.status !== "draft") throw new Error("This Pre-Canvass cannot be submitted by the current user.");
  const quotes = await db.select().from(preCanvassQuotes).where(eq(preCanvassQuotes.preCanvassId, preCanvassId));
  const validQuotes = getValidPreCanvassQuotes(quotes);
  if (!hasRequiredSupplierQuotations(validQuotes.length)) throw new Error("Three supplier quotes are required before forwarding the Pre-Canvass to the Procurement Officer.");
  await db.update(preCanvasses).set({ status: "submitted" }).where(eq(preCanvasses.id, preCanvassId));
  await recordAudit({ entityType: "pre_canvass", entityId: preCanvassId, action: "submitted_to_procurement", performedById: user.id, performedByRole: normalizeProcurementRole(user.role), details: { quoteCount: validQuotes.length } });
}
async function createAbstractOfCanvass(preCanvassId, user) {
  const db = await requireDb();
  const [preCanvass] = await db.select().from(preCanvasses).where(eq(preCanvasses.id, preCanvassId)).limit(1);
  if (!preCanvass || preCanvass.status !== "submitted") throw new Error("A submitted Pre-Canvass is required before an Abstract of Canvass can be generated.");
  const quotes = await db.select().from(preCanvassQuotes).where(eq(preCanvassQuotes.preCanvassId, preCanvassId));
  const validQuotes = getValidPreCanvassQuotes(quotes);
  if (!hasRequiredSupplierQuotations(validQuotes.length)) throw new Error("Three supplier quotes are required before an Abstract of Canvass can be generated.");
  const recommendation = selectLowestCompliantQuote(validQuotes.map((quote) => ({ ...quote, isCompliant: quote.isCompliant === 1 })));
  if (!recommendation) throw new Error("No compliant supplier quote is available for recommendation.");
  const abstractNumber = `AOC-${(/* @__PURE__ */ new Date()).getFullYear()}-${Date.now().toString().slice(-7)}`;
  await db.insert(abstractsOfCanvass).values({ abstractNumber, preCanvassId, recommendedSupplierId: recommendation.supplierId, recommendationReason: "Lowest compliant supplier selected from the End-User's mandatory three-supplier Pre-Canvass.", preparedById: user.id });
  await db.update(preCanvasses).set({ status: "abstracted" }).where(eq(preCanvasses.id, preCanvassId));
  await writeAuditEvent({ entityType: "abstract_of_canvass", entityId: preCanvassId, action: "recommended", performedById: user.id, performedByRole: normalizeProcurementRole(user.role), details: { abstractNumber, recommendedSupplierId: recommendation.supplierId } });
}
async function decideAbstractOfCanvass(input, user, options) {
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
async function createPurchaseOrderFromPreCanvass(preCanvassId, user, options) {
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
  const poNumber = `PO-${(/* @__PURE__ */ new Date()).getFullYear()}-${Date.now().toString().slice(-7)}`;
  const scheduledDeliveryDate = preCanvass.deliveryPeriodDays ? new Date(Date.now() + preCanvass.deliveryPeriodDays * 864e5) : null;
  await db.insert(purchaseOrders).values({ poNumber, purchaseRequestId: pr.id, preCanvassId, supplierId: quote.supplierId, totalAmount: quote.totalPrice, placeOfDelivery: settings?.entityName || "Batanes State College", scheduledDeliveryDate, deliveryTerm: "FOB Destination", paymentTerm: "15 days upon complete delivery", modeOfProcurement: "Small Value Procurement", fundCluster: pr.fundCluster, fundsAvailable: pr.totalEstimate, authorizedOfficialName: settings?.authorizedOfficialName || null, authorizedOfficialDesignation: settings?.authorizedOfficialDesignation || null, chiefAccountantName: settings?.chiefAccountantName || null, generatedById: user.id, status: "issued" });
  await db.update(purchaseRequests).set({ status: "po_issued" }).where(eq(purchaseRequests.id, pr.id));
  const [po] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.poNumber, poNumber)).limit(1);
  if (!po) throw new Error("The Purchase Order could not be issued.");
  await recordAudit({ entityType: "purchase_order", entityId: po.id, action: "issued", performedById: user.id, performedByRole: normalizeProcurementRole(user.role), details: { poNumber, preCanvassId } });
  return po;
}
async function recordDelivery(input, user, options) {
  const db = options?.db ?? await requireDb();
  const recordAudit = options?.recordAudit ?? writeAuditEvent;
  const [po] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, input.purchaseOrderId)).limit(1);
  if (!po || po.status !== "issued") throw new Error("Only an issued Purchase Order may be recorded as delivered.");
  await db.insert(deliveryReceipts).values({ purchaseOrderId: po.id, receiptNumber: input.receiptNumber, receivedByName: input.receivedByName || null, deliveryStatus: input.deliveryStatus ?? "complete", signatureReference: input.signatureReference || null, remarks: input.remarks || null, receivedById: user.id });
  await db.update(purchaseOrders).set({ status: "delivered" }).where(eq(purchaseOrders.id, po.id));
  await db.update(purchaseRequests).set({ status: "delivered" }).where(eq(purchaseRequests.id, po.purchaseRequestId));
  await recordAudit({ entityType: "purchase_order", entityId: po.id, action: "delivery_logged", performedById: user.id, performedByRole: normalizeProcurementRole(user.role), details: { receiptNumber: input.receiptNumber } });
}
async function logPmr(input, user, options) {
  const db = options?.db ?? await requireDb();
  const recordAudit = options?.recordAudit ?? writeAuditEvent;
  const [po] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, input.purchaseOrderId)).limit(1);
  if (!po || po.status !== "delivered") throw new Error("A delivered Purchase Order is required before PMR logging.");
  await db.insert(pmrLogs).values({ purchaseOrderId: po.id, pmrNumber: input.pmrNumber, remarks: input.remarks || null, loggedById: user.id });
  await db.update(purchaseOrders).set({ status: "closed" }).where(eq(purchaseOrders.id, po.id));
  await db.update(purchaseRequests).set({ status: "pmr_logged" }).where(eq(purchaseRequests.id, po.purchaseRequestId));
  await recordAudit({ entityType: "purchase_order", entityId: po.id, action: "pmr_logged", performedById: user.id, performedByRole: normalizeProcurementRole(user.role), details: { pmrNumber: input.pmrNumber } });
}
async function createRfqFromPurchaseRequest(purchaseRequestId, user) {
  const db = await requireDb();
  const [pr] = await db.select().from(purchaseRequests).where(eq(purchaseRequests.id, purchaseRequestId)).limit(1);
  if (!pr || pr.status !== "approved") throw new Error("Only an approved Purchase Request can be converted to an RFQ.");
  const rfqNumber = `RFQ-${(/* @__PURE__ */ new Date()).getFullYear()}-${Date.now().toString().slice(-7)}`;
  await db.insert(rfqs).values({ rfqNumber, purchaseRequestId, status: "canvass", createdById: user.id });
  await db.update(purchaseRequests).set({ status: "rfq" }).where(eq(purchaseRequests.id, purchaseRequestId));
  const [created] = await db.select().from(rfqs).where(eq(rfqs.rfqNumber, rfqNumber)).limit(1);
  if (!created) throw new Error("The RFQ could not be created.");
  await writeAuditEvent({ entityType: "rfq", entityId: created.id, action: "created_from_approved_pr", performedById: user.id, performedByRole: normalizeProcurementRole(user.role), details: { rfqNumber, prNumber: pr.prNumber } });
  return created;
}
async function createMcdmRecommendation(preCanvassId, user) {
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
  if (existing) await db.update(mcdmRecommendations).set(values).where(eq(mcdmRecommendations.id, existing.id));
  else await db.insert(mcdmRecommendations).values({ preCanvassId, ...values });
  const [recommendation] = await db.select().from(mcdmRecommendations).where(eq(mcdmRecommendations.preCanvassId, preCanvassId)).limit(1);
  if (!recommendation) throw new Error("MCDM recommendation could not be saved.");
  await writeAuditEvent({ entityType: "mcdm_recommendation", entityId: recommendation.id, action: "calculated", performedById: user.id, performedByRole: normalizeProcurementRole(user.role), details: { preCanvassId, recommendedSupplierId: recommendation.recommendedSupplierId, totalScore: recommendation.totalScore } });
  return recommendation;
}
async function createRfqFromPreCanvass(preCanvassId, user) {
  const db = await requireDb();
  const [preCanvass] = await db.select().from(preCanvasses).where(eq(preCanvasses.id, preCanvassId)).limit(1);
  if (!preCanvass || preCanvass.status !== "abstracted") throw new Error("Generate an Abstract of Canvass before creating the RFQ from a Pre-Canvass.");
  const [mcdm] = await db.select().from(mcdmRecommendations).where(eq(mcdmRecommendations.preCanvassId, preCanvassId)).limit(1);
  if (!mcdm) throw new Error("Calculate the MCDM recommendation before creating the RFQ.");
  const [existing] = await db.select().from(rfqs).where(eq(rfqs.purchaseRequestId, preCanvass.purchaseRequestId)).limit(1);
  if (existing) return existing;
  const quoteRows = await db.select().from(preCanvassQuotes).where(eq(preCanvassQuotes.preCanvassId, preCanvassId));
  const rfqNumber = `RFQ-${(/* @__PURE__ */ new Date()).getFullYear()}-${Date.now().toString().slice(-7)}`;
  await db.insert(rfqs).values({ rfqNumber, purchaseRequestId: preCanvass.purchaseRequestId, status: "canvass", createdById: user.id });
  const [rfq] = await db.select().from(rfqs).where(eq(rfqs.rfqNumber, rfqNumber)).limit(1);
  if (!rfq) throw new Error("RFQ could not be created from the Pre-Canvass.");
  await db.insert(supplierQuotations).values(quoteRows.map((quote) => ({ rfqId: rfq.id, supplierId: quote.supplierId, totalPrice: quote.totalPrice, deliveryDays: quote.deliveryDays, isCompliant: quote.isCompliant, notes: `Imported from ${preCanvass.preCanvassNumber}; MCDM recommended supplier #${mcdm.recommendedSupplierId}.` })));
  await writeAuditEvent({ entityType: "rfq", entityId: rfq.id, action: "created_from_mcdm_pre_canvass", performedById: user.id, performedByRole: normalizeProcurementRole(user.role), details: { preCanvassId, recommendedSupplierId: mcdm.recommendedSupplierId } });
  return rfq;
}
async function addSupplierQuotation(input, user) {
  const db = await requireDb();
  await db.insert(supplierQuotations).values({ ...input, totalPrice: input.totalPrice.toFixed(2), isCompliant: input.isCompliant ? 1 : 0, notes: input.notes || null });
  await writeAuditEvent({ entityType: "rfq", entityId: input.rfqId, action: "supplier_quotation_added", performedById: user.id, performedByRole: normalizeProcurementRole(user.role), details: { supplierId: input.supplierId } });
}
async function createQuotationAbstract(rfqId, user) {
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
async function approveQuotationAbstract(rfqId, user) {
  const db = await requireDb();
  const [abstract] = await db.select().from(quotationAbstracts).where(eq(quotationAbstracts.rfqId, rfqId)).limit(1);
  if (!abstract || abstract.status !== "recommended") throw new Error("A recommended quotation abstract is required before approval.");
  await db.update(quotationAbstracts).set({ status: "approved", approvedById: user.id }).where(eq(quotationAbstracts.id, abstract.id));
  await db.update(rfqs).set({ status: "approved" }).where(eq(rfqs.id, rfqId));
  await writeAuditEvent({ entityType: "quotation_abstract", entityId: abstract.id, action: "approved", performedById: user.id, performedByRole: normalizeProcurementRole(user.role) });
  return { ...abstract, status: "approved", approvedById: user.id };
}
async function createPurchaseOrder(rfqId, user, options) {
  const db = options?.db ?? await requireDb();
  const recordAudit = options?.recordAudit ?? writeAuditEvent;
  const [rfq] = await db.select().from(rfqs).where(eq(rfqs.id, rfqId)).limit(1);
  const [abstract] = await db.select().from(quotationAbstracts).where(eq(quotationAbstracts.rfqId, rfqId)).limit(1);
  if (!rfq || !abstract || abstract.status !== "approved") throw new Error("An approved quotation abstract is required before a Purchase Order can be generated.");
  const [pr] = await db.select().from(purchaseRequests).where(eq(purchaseRequests.id, rfq.purchaseRequestId)).limit(1);
  if (!pr) throw new Error("The Purchase Request linked to this RFQ could not be found.");
  const [allotment] = await db.select().from(budgetAllotments).where(and(eq(budgetAllotments.officeId, pr.officeId), eq(budgetAllotments.objectOfExpenditureId, pr.objectOfExpenditureId), eq(budgetAllotments.fiscalYear, (/* @__PURE__ */ new Date()).getFullYear()))).limit(1);
  if (!allotment || !validatePoBudgetGeneration({ committedAmount: allotment.committedAmount, purchaseRequestAmount: pr.totalEstimate }).allowed) throw new Error("The Purchase Order cannot be generated because the linked PR does not have a valid office-level budget commitment.");
  const [quote] = await db.select().from(supplierQuotations).where(and(eq(supplierQuotations.rfqId, rfqId), eq(supplierQuotations.supplierId, abstract.recommendedSupplierId))).limit(1);
  if (!quote) throw new Error("The recommended supplier quotation could not be found.");
  const poNumber = `PO-${(/* @__PURE__ */ new Date()).getFullYear()}-${Date.now().toString().slice(-7)}`;
  await db.insert(purchaseOrders).values({ poNumber, purchaseRequestId: rfq.purchaseRequestId, rfqId, supplierId: quote.supplierId, totalAmount: quote.totalPrice, generatedById: user.id, status: "pending_approval" });
  await db.update(purchaseRequests).set({ status: "po" }).where(eq(purchaseRequests.id, rfq.purchaseRequestId));
  const [po] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.poNumber, poNumber)).limit(1);
  if (!po) throw new Error("Purchase Order could not be created.");
  await recordAudit({ entityType: "purchase_order", entityId: po.id, action: "generated", performedById: user.id, performedByRole: normalizeProcurementRole(user.role), details: { poNumber } });
  return po;
}
async function recordHistoricalPrice(input, user) {
  const db = await requireDb();
  if (input.unitPrice <= 0) throw new Error("Historical unit price must be positive.");
  await db.insert(historicalPrices).values({ itemDescription: input.itemDescription.trim(), unit: input.unit.trim(), unitPrice: input.unitPrice.toFixed(2), supplierId: input.supplierId ?? null, purchaseOrderId: input.purchaseOrderId ?? null, observedAt: input.observedAt ?? /* @__PURE__ */ new Date(), recordedById: user.id });
  const [price] = await db.select().from(historicalPrices).where(and(eq(historicalPrices.itemDescription, input.itemDescription.trim()), eq(historicalPrices.recordedById, user.id))).orderBy(desc(historicalPrices.id)).limit(1);
  if (!price) throw new Error("Historical price could not be recorded.");
  return price;
}
async function listHistoricalPmrRecords(filters = {}) {
  const db = await requireDb();
  const conditions = [];
  if (filters.fiscalYear) conditions.push(eq(pmrHistoricalRecords.fiscalYear, filters.fiscalYear));
  if (filters.month) conditions.push(eq(pmrHistoricalRecords.month, filters.month));
  if (filters.office) conditions.push(eq(pmrHistoricalRecords.office, filters.office));
  if (filters.supplier) conditions.push(eq(pmrHistoricalRecords.supplier, filters.supplier));
  if (filters.status) conditions.push(eq(pmrHistoricalRecords.status, filters.status));
  if (filters.search) {
    const term = `%${filters.search.trim()}%`;
    conditions.push(or(like(pmrHistoricalRecords.prNumber, term), like(pmrHistoricalRecords.item, term), like(pmrHistoricalRecords.endUser, term), like(pmrHistoricalRecords.supplier, term)));
  }
  return db.select().from(pmrHistoricalRecords).where(conditions.length ? and(...conditions) : void 0).orderBy(desc(pmrHistoricalRecords.prNumber), pmrHistoricalRecords.id).limit(Math.min(filters.limit ?? 500, 2e3));
}
async function getHistoricalPmrSummary(fiscalYear = 2025) {
  const db = await requireDb();
  const rows = await db.select().from(pmrHistoricalRecords).where(eq(pmrHistoricalRecords.fiscalYear, fiscalYear));
  const offices2 = new Set(rows.map((row) => row.office).filter(Boolean));
  const suppliers2 = new Set(rows.map((row) => row.supplier).filter(Boolean));
  const prs = new Set(rows.map((row) => row.prNumber));
  const total = rows.reduce((sum, row) => sum + Number(row.total ?? 0), 0);
  const estimated = rows.reduce((sum, row) => sum + Number(row.estimatedTotal ?? 0), 0);
  return { fiscalYear, records: rows.length, purchaseRequests: prs.size, offices: offices2.size, suppliers: suppliers2.size, estimatedTotal: estimated, actualTotal: total };
}
async function getProcurementForecast() {
  const db = await requireDb();
  const rows = await db.select().from(historicalPrices).orderBy(historicalPrices.itemDescription, historicalPrices.observedAt);
  const byItem = rows.reduce((grouped, row) => {
    (grouped[row.itemDescription] ??= []).push(row);
    return grouped;
  }, {});
  return Object.entries(byItem).map(([itemDescription, points]) => {
    const prices = points.map((point) => Number(point.unitPrice));
    const average2 = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    const trend = prices.length > 1 ? (prices[prices.length - 1] - prices[0]) / Math.max(prices[0], 1) : 0;
    return { itemDescription, unit: points[0].unit, points: points.map((point) => ({ observedAt: point.observedAt, unitPrice: Number(point.unitPrice) })), averagePrice: average2, forecastPrice: average2 * (1 + trend), trendPercent: trend * 100 };
  });
}
async function getPublicPurchaseRequestTracking(trackingToken) {
  const db = await requireDb();
  const [purchaseRequest] = await db.select({ id: purchaseRequests.id, prNumber: purchaseRequests.prNumber, purpose: purchaseRequests.purpose, status: purchaseRequests.status, createdAt: purchaseRequests.createdAt, submittedAt: purchaseRequests.submittedAt, updatedAt: purchaseRequests.updatedAt }).from(purchaseRequests).where(eq(purchaseRequests.trackingToken, trackingToken)).limit(1);
  if (!purchaseRequest) throw new Error("Tracking record not found.");
  const [preCanvass] = await db.select().from(preCanvasses).where(eq(preCanvasses.purchaseRequestId, purchaseRequest.id)).limit(1);
  const [purchaseOrder] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.purchaseRequestId, purchaseRequest.id)).limit(1);
  const events = await db.select({ action: auditTrails.action, createdAt: auditTrails.createdAt }).from(auditTrails).where(eq(auditTrails.entityId, purchaseRequest.id)).orderBy(auditTrails.createdAt);
  return { purchaseRequest, preCanvass: preCanvass ? { status: preCanvass.status, updatedAt: preCanvass.updatedAt } : null, purchaseOrder: purchaseOrder ? { poNumber: purchaseOrder.poNumber, status: purchaseOrder.status, updatedAt: purchaseOrder.updatedAt } : null, events };
}
async function getEligibleTestOnlyPackage(ppmpEntryId, db) {
  const [record] = await db.select({ ppmp: appPpmpEntries, officeCode: offices.code, objectCode: objectsOfExpenditure.code }).from(appPpmpEntries).innerJoin(offices, eq(offices.id, appPpmpEntries.officeId)).innerJoin(objectsOfExpenditure, eq(objectsOfExpenditure.id, appPpmpEntries.objectOfExpenditureId)).where(eq(appPpmpEntries.id, ppmpEntryId)).limit(1);
  if (!record || !isEligibleTestOnlyPackage({ description: record.ppmp.description, fundSource: record.ppmp.fundSource, remarks: record.ppmp.remarks, officeCode: record.officeCode, objectCode: record.objectCode })) {
    throw new Error("Only clearly labelled non-operational test packages with dedicated TEST reference records may be managed here.");
  }
  return record;
}
async function listAdminTestRecordPackages() {
  const db = await requireDb();
  const rows = await db.select({ ppmp: appPpmpEntries, officeCode: offices.code, officeName: offices.name, objectCode: objectsOfExpenditure.code, objectName: objectsOfExpenditure.name, archive: testRecordArchives }).from(appPpmpEntries).innerJoin(offices, eq(offices.id, appPpmpEntries.officeId)).innerJoin(objectsOfExpenditure, eq(objectsOfExpenditure.id, appPpmpEntries.objectOfExpenditureId)).leftJoin(testRecordArchives, eq(testRecordArchives.ppmpEntryId, appPpmpEntries.id)).where(like(appPpmpEntries.description, `${TEST_ONLY_PREFIX}%`)).orderBy(desc(appPpmpEntries.createdAt));
  const purchaseRequestsByPpmp = await db.select().from(purchaseRequests);
  return rows.filter((row) => isEligibleTestOnlyPackage({ description: row.ppmp.description, fundSource: row.ppmp.fundSource, remarks: row.ppmp.remarks, officeCode: row.officeCode, objectCode: row.objectCode })).map((row) => ({
    ...row,
    purchaseRequests: purchaseRequestsByPpmp.filter((purchaseRequest) => purchaseRequest.ppmpEntryId === row.ppmp.id).map((purchaseRequest) => ({ id: purchaseRequest.id, prNumber: purchaseRequest.prNumber, status: purchaseRequest.status, totalEstimate: purchaseRequest.totalEstimate }))
  }));
}
async function archiveTestRecordPackage(input, user) {
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
async function cleanupArchivedTestRecordPackage(ppmpEntryId, user) {
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
    await db.update(budgetAllotments).set({ committedAmount: sql`GREATEST(${budgetAllotments.committedAmount} - ${purchaseRequest.totalEstimate}, 0)` }).where(and(eq(budgetAllotments.officeId, purchaseRequest.officeId), eq(budgetAllotments.objectOfExpenditureId, purchaseRequest.objectOfExpenditureId), eq(budgetAllotments.fiscalYear, (/* @__PURE__ */ new Date()).getFullYear())));
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
    ...purchaseOrderIds.map((id) => and(eq(workflowCorrections.entityType, "purchase_order"), eq(workflowCorrections.entityId, id)))
  ];
  if (correctionConditions.length) await db.delete(workflowCorrections).where(or(...correctionConditions));
  await db.delete(appPpmpEntries).where(eq(appPpmpEntries.id, ppmpEntryId));
  await db.update(testRecordArchives).set({ cleanedAt: /* @__PURE__ */ new Date() }).where(eq(testRecordArchives.id, archive.id));
  await writeAuditEvent({ entityType: "test_record_package", entityId: ppmpEntryId, action: "cleaned", performedById: user.id, performedByRole: normalizeProcurementRole(user.role), details: { prCount: prIds.length, preCanvassCount: preCanvassIds.length, abstractCount: abstractIds.length, purchaseOrderCount: purchaseOrderIds.length } });
  return { ppmpEntryId, purchaseRequestCount: prIds.length, preCanvassCount: preCanvassIds.length, abstractCount: abstractIds.length, purchaseOrderCount: purchaseOrderIds.length };
}
async function getProcurementDashboard(user) {
  const db = await requireDb();
  const isEndUser = normalizeProcurementRole(user.role) === "end_user";
  const activeArchives = await db.select().from(testRecordArchives).where(isNull(testRecordArchives.cleanedAt));
  const archivedPpmpEntryIds = new Set(activeArchives.map((archive) => archive.ppmpEntryId));
  const prRows = (await listPurchaseRequests(user)).filter((record) => !record.ppmpEntryId || !archivedPpmpEntryIds.has(record.ppmpEntryId));
  const preCanvassRows = isEndUser ? prRows.length ? await db.select().from(preCanvasses).where(inArray(preCanvasses.purchaseRequestId, prRows.map((pr) => pr.id))) : [] : await db.select().from(preCanvasses);
  const preCanvassIds = preCanvassRows.map((record) => record.id);
  const preCanvassQuoteRows = preCanvassIds.length ? await db.select().from(preCanvassQuotes).where(inArray(preCanvassQuotes.preCanvassId, preCanvassIds)) : [];
  const abstractOfCanvassRows = preCanvassIds.length ? await db.select().from(abstractsOfCanvass).where(inArray(abstractsOfCanvass.preCanvassId, preCanvassIds)) : [];
  const rfqRows = isEndUser ? [] : await db.select().from(rfqs);
  const quotationRows = isEndUser ? [] : await db.select().from(supplierQuotations);
  const abstractRows = isEndUser ? [] : await db.select().from(quotationAbstracts);
  const poRows = isEndUser ? prRows.length ? await db.select().from(purchaseOrders).where(inArray(purchaseOrders.purchaseRequestId, prRows.map((pr) => pr.id))) : [] : await db.select().from(purchaseOrders);
  const poIds = poRows.map((po) => po.id);
  const deliveryRows = poIds.length ? await db.select().from(deliveryReceipts).where(inArray(deliveryReceipts.purchaseOrderId, poIds)) : [];
  const pmrRows = poIds.length ? await db.select().from(pmrLogs).where(inArray(pmrLogs.purchaseOrderId, poIds)) : [];
  const auditRows = isEndUser ? (await listAuditTrails({}, user)).items : await db.select().from(auditTrails);
  const planRows = (isEndUser ? await db.select().from(appPpmpEntries).where(eq(appPpmpEntries.preparedById, user.id)) : await db.select().from(appPpmpEntries)).filter((record) => !archivedPpmpEntryIds.has(record.id));
  const [documents, corrections, notifications] = await Promise.all([listProcurementDocuments(user), listWorkflowCorrections(user), listWorkflowNotifications(user)]);
  const relatedPrs = prRows;
  const relatedItems = isEndUser ? prRows.length ? await db.select().from(purchaseRequestItems).where(inArray(purchaseRequestItems.purchaseRequestId, prRows.map((pr) => pr.id))) : [] : prRows.length ? await db.select().from(purchaseRequestItems).where(inArray(purchaseRequestItems.purchaseRequestId, prRows.map((pr) => pr.id))) : [];
  const closedPurchaseOrders = poRows.filter((po) => po.status === "closed");
  const cycleTimes = closedPurchaseOrders.map((po) => {
    const pr = relatedPrs.find((record) => record.id === po.purchaseRequestId);
    return pr ? (po.updatedAt.getTime() - pr.createdAt.getTime()) / 864e5 : null;
  }).filter((value) => value !== null);
  const completedPrIds = new Set(closedPurchaseOrders.map((po) => po.purchaseRequestId));
  const commodityTotals = relatedItems.filter((item) => completedPrIds.has(item.purchaseRequestId)).reduce((totals, item) => {
    totals[item.description] = (totals[item.description] ?? 0) + Number(item.totalCost);
    return totals;
  }, {});
  const topCommodities = Object.entries(commodityTotals).sort(([, a], [, b]) => b - a).slice(0, 5).map(([description, amount]) => ({ description, amount: amount.toFixed(2) }));
  return { purchaseRequests: prRows, purchaseRequestItems: relatedItems, preCanvasses: preCanvassRows, preCanvassQuotes: preCanvassQuoteRows, abstractsOfCanvass: abstractOfCanvassRows, deliveryReceipts: deliveryRows, pmrLogs: pmrRows, rfqs: rfqRows, supplierQuotations: quotationRows, quotationAbstracts: abstractRows, purchaseOrders: poRows, auditEvents: auditRows, appPpmpEntries: planRows, documents, corrections, notifications, analytics: { averageCycleTimeDays: cycleTimes.length ? cycleTimes.reduce((sum, value) => sum + value, 0) / cycleTimes.length : null, topCommodities } };
}
async function assignRfqNumber(input, user, options) {
  const db = options?.db ?? await requireDb();
  const recordAudit = options?.recordAudit ?? writeAuditEvent;
  const actorRole = normalizeProcurementRole(user.role);
  if (!roleCanAct(actorRole, ["procurement_officer", "admin"])) {
    throw new Error("Your assigned role is not authorized to assign RFQ numbers.");
  }
  const fiscalYear = input.fiscalYear ?? (/* @__PURE__ */ new Date()).getFullYear();
  let formattedRfqNumber;
  let sequenceNumber;
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
    assignedAt: /* @__PURE__ */ new Date(),
    purchaseRequestId: input.purchaseRequestId ?? null,
    rfqId: input.rfqId ?? null,
    status: "active"
  }).returning();
  if (input.rfqId) {
    await db.update(rfqs).set({ rfqNumber: formattedRfqNumber, updatedAt: /* @__PURE__ */ new Date() }).where(eq(rfqs.id, input.rfqId));
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
      rfqId: input.rfqId
    }
  });
  return created;
}
var DEFAULT_FORM_TEMPLATES = {
  purchase_request: {
    displayName: "Purchase Request (Appendix 60)",
    configurationJson: {
      institutionName: "Batanes State College",
      officeUnit: "Procurement Unit",
      headerText: "PURCHASE REQUEST",
      instructionText: "State clearly the purpose, commodity specifications, quantities, and approved unit costs.",
      signatoryLabels: { requester: "Requested By", approver: "Approved By" },
      requiredFields: ["prNumber", "officeId", "fundSource", "purpose", "items"]
    }
  },
  ppmp: {
    displayName: "Project Procurement Management Plan (PPMP)",
    configurationJson: {
      institutionName: "Batanes State College",
      officeUnit: "Procurement Unit",
      headerText: "PROJECT PROCUREMENT MANAGEMENT PLAN",
      instructionText: "Plan procurement projects, schedules, and estimated budgets per object of expenditure.",
      requiredFields: ["fiscalYear", "officeId", "objectOfExpenditureId", "description", "plannedAmount"]
    }
  },
  pre_canvass: {
    displayName: "Pre-Canvass / Preliminary Quotation (Annex D/E)",
    configurationJson: {
      institutionName: "Batanes State College",
      officeUnit: "Procurement Unit",
      headerText: "PRE-CANVASS / MARKET SCOPING",
      instructionText: "Collect three preliminary supplier quotations for market sounding prior to official RFQ.",
      requiredFields: ["preCanvassNumber", "purchaseRequestId", "quotationDeadline", "deliveryPeriodDays"]
    }
  },
  rfq: {
    displayName: "Request for Quotation (Official Annex D)",
    configurationJson: {
      institutionName: "Batanes State College",
      officeUnit: "Procurement Unit",
      headerText: "REQUEST FOR QUOTATION",
      instructionText: "Suppliers must submit quotations within the standard 7 calendar days submission period.",
      responsePeriodDays: 7,
      requiredFields: ["rfqNumber", "purchaseRequestId", "quotationDeadline"]
    }
  },
  abstract_of_quotations: {
    displayName: "Abstract of Quotations (Annex F)",
    configurationJson: {
      institutionName: "Batanes State College",
      officeUnit: "Procurement Unit / BAC",
      headerText: "ABSTRACT OF QUOTATIONS",
      instructionText: "Record lowest compliant quotation, supplier comparison, and BAC certification.",
      requiredFields: ["abstractNumber", "rfqId", "recommendedSupplierId", "certificationText"]
    }
  },
  letter_of_notice: {
    displayName: "Letter of Notice / Canvass Letter",
    configurationJson: {
      institutionName: "Batanes State College",
      officeUnit: "Procurement Unit",
      headerText: "LETTER OF NOTICE",
      instructionText: "Official transmittal and invitation to participate in price canvass.",
      requiredFields: ["noticeNumber", "supplierId", "purchaseRequestId"]
    }
  },
  purchase_order: {
    displayName: "Purchase Order (Appendix 61)",
    configurationJson: {
      institutionName: "Batanes State College",
      officeUnit: "Procurement Unit",
      headerText: "PURCHASE ORDER",
      instructionText: "Prescribed government contract for goods and services delivery under RA 9184.",
      requiredFields: ["poNumber", "supplierId", "totalAmount", "placeOfDelivery", "deliveryTerm", "paymentTerm"]
    }
  },
  pmr: {
    displayName: "Procurement Monitoring Report (PMR)",
    configurationJson: {
      institutionName: "Batanes State College",
      officeUnit: "Bids and Awards Committee / Procurement Office",
      headerText: "PROCUREMENT MONITORING REPORT",
      instructionText: "Comprehensive monitoring log of procurement lifecycle from PPMP to inspection.",
      requiredFields: ["pmrNumber", "purchaseOrderId", "completionDate", "responsibleOfficer"]
    }
  },
  supplier_evaluation_goods: {
    displayName: "Supplier Evaluation Form (Goods)",
    configurationJson: {
      institutionName: "Batanes State College",
      officeUnit: "PROCUREMENT UNIT",
      headerText: "SUPPLIER EVALUATION FORM (Goods)",
      subtitle: "To be accomplished by Procurement Office",
      instructions: "Please rate the supplier according to each criterion provided (1 to 4).",
      requiredFields: ["supplierId", "purchaseOrderId", "respondentName", "criteriaScores"]
    }
  },
  acknowledgement_receipt: {
    displayName: "Acknowledgement Receipt for Property / Inventory (PAR/ICS)",
    configurationJson: {
      institutionName: "Batanes State College",
      officeUnit: "Property and Supply Unit",
      headerText: "ACKNOWLEDGEMENT RECEIPT FOR PROPERTY",
      instructionText: "Official property acknowledgement of custody and accountability for acquired equipment and supplies.",
      requiredFields: ["receiptNumber", "receivingOffice", "items"]
    }
  }
};
async function listFormTemplates(options) {
  const db = options?.db ?? await requireDb();
  return db.select().from(formTemplates).orderBy(formTemplates.templateKey, desc(formTemplates.version));
}
async function getActiveFormTemplate(templateKey, options) {
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
      status: "active",
      configurationJson: fallback.configurationJson,
      createdById: 1,
      updatedById: 1,
      approvedById: 1,
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date(),
      activatedAt: /* @__PURE__ */ new Date()
    };
  }
  return null;
}
async function saveFormTemplateDraft(input, user, options) {
  const db = options?.db ?? await requireDb();
  const recordAudit = options?.recordAudit ?? writeAuditEvent;
  const actorRole = normalizeProcurementRole(user.role);
  if (actorRole !== "admin") {
    throw new Error("Only an Administrator can create or update form template drafts.");
  }
  const fallback = DEFAULT_FORM_TEMPLATES[input.templateKey];
  if (fallback?.configurationJson.requiredFields && Array.isArray(fallback.configurationJson.requiredFields)) {
    const required = fallback.configurationJson.requiredFields;
    const inputRequired = Array.isArray(input.configurationJson.requiredFields) ? input.configurationJson.requiredFields : [];
    for (const req of required) {
      if (!inputRequired.includes(req)) {
        throw new Error(`Form template draft cannot omit mandatory workflow field "${req}".`);
      }
    }
  }
  const [existingDraft] = await db.select().from(formTemplates).where(and(eq(formTemplates.templateKey, input.templateKey), eq(formTemplates.status, "draft"))).limit(1);
  let template;
  if (existingDraft) {
    await db.update(formTemplates).set({
      displayName: input.displayName.trim(),
      configurationJson: input.configurationJson,
      updatedById: user.id,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(formTemplates.id, existingDraft.id));
    const [updated] = await db.select().from(formTemplates).where(eq(formTemplates.id, existingDraft.id)).limit(1);
    template = updated;
  } else {
    const allVersions = await db.select().from(formTemplates).where(eq(formTemplates.templateKey, input.templateKey));
    const maxVersion = allVersions.reduce((max, t2) => Math.max(max, t2.version), 0);
    const newVersion = maxVersion + 1;
    const [created] = await db.insert(formTemplates).values({
      templateKey: input.templateKey,
      version: newVersion,
      displayName: input.displayName.trim(),
      status: "draft",
      configurationJson: input.configurationJson,
      createdById: user.id,
      updatedById: user.id,
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    }).returning();
    template = created;
  }
  await recordAudit({
    entityType: "form_template",
    entityId: template.id,
    action: "draft_saved",
    performedById: user.id,
    performedByRole: actorRole,
    details: { templateKey: input.templateKey, version: template.version, displayName: input.displayName }
  });
  return template;
}
async function activateFormTemplate(templateId, user, options) {
  const db = options?.db ?? await requireDb();
  const recordAudit = options?.recordAudit ?? writeAuditEvent;
  const actorRole = normalizeProcurementRole(user.role);
  if (actorRole !== "admin") {
    throw new Error("Only an Administrator can activate procurement form templates.");
  }
  const [target] = await db.select().from(formTemplates).where(eq(formTemplates.id, templateId)).limit(1);
  if (!target) throw new Error("Form template not found.");
  await db.update(formTemplates).set({ status: "archived", updatedAt: /* @__PURE__ */ new Date() }).where(and(eq(formTemplates.templateKey, target.templateKey), eq(formTemplates.status, "active")));
  await db.update(formTemplates).set({
    status: "active",
    approvedById: user.id,
    activatedAt: /* @__PURE__ */ new Date(),
    updatedAt: /* @__PURE__ */ new Date()
  }).where(eq(formTemplates.id, target.id));
  const [activated] = await db.select().from(formTemplates).where(eq(formTemplates.id, target.id)).limit(1);
  await recordAudit({
    entityType: "form_template",
    entityId: activated.id,
    action: "activated",
    performedById: user.id,
    performedByRole: actorRole,
    details: { templateKey: target.templateKey, version: target.version, displayName: target.displayName }
  });
  return activated;
}
async function restoreFormTemplateVersion(templateId, user, options) {
  const db = options?.db ?? await requireDb();
  const recordAudit = options?.recordAudit ?? writeAuditEvent;
  const actorRole = normalizeProcurementRole(user.role);
  if (actorRole !== "admin") {
    throw new Error("Only an Administrator can restore previous form template versions.");
  }
  const [target] = await db.select().from(formTemplates).where(eq(formTemplates.id, templateId)).limit(1);
  if (!target) throw new Error("Form template version not found.");
  await db.update(formTemplates).set({ status: "archived", updatedAt: /* @__PURE__ */ new Date() }).where(and(eq(formTemplates.templateKey, target.templateKey), eq(formTemplates.status, "active")));
  await db.update(formTemplates).set({
    status: "active",
    approvedById: user.id,
    activatedAt: /* @__PURE__ */ new Date(),
    updatedAt: /* @__PURE__ */ new Date()
  }).where(eq(formTemplates.id, target.id));
  const [restored] = await db.select().from(formTemplates).where(eq(formTemplates.id, target.id)).limit(1);
  await recordAudit({
    entityType: "form_template",
    entityId: restored.id,
    action: "version_restored",
    performedById: user.id,
    performedByRole: actorRole,
    details: { templateKey: target.templateKey, version: target.version }
  });
  return restored;
}
var OPERATIONAL_AUDIT_ENTITY_TYPES = /* @__PURE__ */ new Set([
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
  "workflow_correction"
]);
async function listAuditTrails(filters, user, options) {
  const db = options?.db ?? await requireDb();
  const actorRole = normalizeProcurementRole(user.role);
  const [allAudits, allUsers, allPrs, allPreCanvasses] = await Promise.all([
    db.select().from(auditTrails).orderBy(desc(auditTrails.createdAt)),
    db.select().from(users),
    db.select().from(purchaseRequests),
    db.select().from(preCanvasses)
  ]);
  const userMap = new Map(allUsers.map((u) => [u.id, u]));
  const userPrIds = new Set(allPrs.filter((pr) => pr.requestedById === user.id).map((pr) => pr.id));
  const userPreCanvassIds = new Set(allPreCanvasses.filter((pc) => pc.preparedById === user.id).map((pc) => pc.id));
  const filtered = allAudits.filter((audit) => {
    if (actorRole === "admin") {
    } else if (roleCanAct(actorRole, ["procurement_officer", "procurement_officer_i", "procurement_officer_ii", "procurement_staff", "administrative_approver", "bac_secretariat", "bac", "hope", "budget_officer"])) {
      if (!OPERATIONAL_AUDIT_ENTITY_TYPES.has(audit.entityType)) {
        return false;
      }
    } else {
      const isOwnPr = audit.entityType === "purchase_request" && userPrIds.has(audit.entityId);
      const isOwnPreCanvass = audit.entityType === "pre_canvass" && userPreCanvassIds.has(audit.entityId);
      if (actorRole === "end_user" && !isOwnPr && !isOwnPreCanvass) {
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
      officialRoleLabel: OFFICIAL_ROLE_LABELS[audit.performedByRole] ?? audit.performedByRole
    };
  });
  return { items, total };
}
async function getHistoricalPriceAnalytics(input, options) {
  const db = options?.db ?? await requireDb();
  const search = input.itemDescription.trim().toLowerCase();
  const allPrices = await db.select().from(historicalPrices).orderBy(historicalPrices.observedAt);
  const matched = allPrices.filter((hp) => hp.itemDescription.trim().toLowerCase() === search || hp.itemDescription.toLowerCase().includes(search));
  let filtered = matched;
  if (input.fromDate) filtered = filtered.filter((hp) => hp.observedAt >= input.fromDate);
  if (input.toDate) filtered = filtered.filter((hp) => hp.observedAt <= input.toDate);
  const points = filtered.map((hp) => ({
    id: hp.id,
    observedAt: hp.observedAt,
    unitPrice: Number(hp.unitPrice),
    unit: hp.unit,
    supplierId: hp.supplierId,
    purchaseOrderId: hp.purchaseOrderId
  }));
  const numericPrices = points.map((p) => p.unitPrice).sort((a, b) => a - b);
  const count = numericPrices.length;
  let lowestPrice = null;
  let highestPrice = null;
  let averagePrice = null;
  let medianPrice = null;
  let mostRecentPrice = null;
  let trendDirection = "stable";
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
      trendPercent = Math.round(diff / Math.max(first, 0.01) * 100);
      if (trendPercent > 3) trendDirection = "increasing";
      else if (trendPercent < -3) trendDirection = "decreasing";
      else trendDirection = "stable";
    }
  }
  const warnings = [];
  if (input.unit && points.length > 0) {
    const incompatiblePoint = points.find((p) => !areUnitsCompatible(input.unit, p.unit));
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
      trendPercent
    },
    warnings,
    decisionSupportDisclaimer
  };
}
async function getPmrStatus(purchaseRequestId, options) {
  const db = options?.db ?? await requireDb();
  const [pr] = await db.select().from(purchaseRequests).where(eq(purchaseRequests.id, purchaseRequestId)).limit(1);
  if (!pr) throw new Error("Purchase Request not found.");
  const [po] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.purchaseRequestId, pr.id)).orderBy(desc(purchaseOrders.id)).limit(1);
  if (!po) {
    return {
      status: "not_applicable",
      label: "Not Applicable",
      detail: "No Purchase Order has been awarded for this request yet.",
      pmrNumber: null,
      completionDate: null
    };
  }
  if (po.status === "issued" || po.status === "pending_approval" || po.status === "returned") {
    return {
      status: "pending_delivery",
      label: "Pending Delivery",
      detail: `PO ${po.poNumber} is active and awaiting delivery receipt.`,
      pmrNumber: null,
      completionDate: null
    };
  }
  const [pmr] = await db.select().from(pmrLogs).where(eq(pmrLogs.purchaseOrderId, po.id)).limit(1);
  if (po.status === "delivered" && !pmr) {
    return {
      status: "delivery_recorded_pmr_pending",
      label: "Delivery Recorded \u2014 PMR Pending",
      detail: `Delivery has been logged for PO ${po.poNumber}. PMR log is required before closing.`,
      pmrNumber: null,
      completionDate: null
    };
  }
  if (pmr) {
    return {
      status: "pmr_logged",
      label: "PMR Logged",
      detail: `Logged under PMR reference ${pmr.pmrNumber}.`,
      pmrNumber: pmr.pmrNumber,
      completionDate: pmr.loggedAt
    };
  }
  return {
    status: "closed",
    label: "Closed",
    detail: "Procurement package is completed and archived.",
    pmrNumber: null,
    completionDate: po.updatedAt
  };
}
var END_USER_OFFICE_NAME_MAP = {
  OOP: "Office of the President (OOP)",
  OVP: "Office of the Vice President (OVP)",
  OVPAA: "Office of the Vice President for Academic Affairs (OVPAA)",
  OVPA: "Office of the Vice President for Administration (OVPA)",
  ICT: "Information & Communications Technology (ICT) Unit",
  "ICT Unit": "Information & Communications Technology (ICT) Unit",
  GSO: "General Services Office (GSO)",
  DAFS: "Department of Accounting & Financial Services (DAFS)",
  SSC: "Supreme Student Council (SSC)",
  GAD: "Gender and Development (GAD)",
  CBAO: "College of Business and Accountancy (CBAO)",
  "CBAO-IGP": "CBAO - Income Generating Projects",
  TED: "Teacher Education Department (TED)",
  RDET: "Research, Development, Extension & Training (RDET)",
  "RDET-S & T": "RDET - Science & Technology",
  "RDET-Futures Thinking": "RDET - Futures Thinking",
  "RDET-Sustainable Tourism": "RDET - Sustainable Tourism",
  "BSC-RDET": "BSC - RDET",
  HTM: "Hospitality & Tourism Management (HTM)",
  Library: "College Library",
  Registrar: "Office of the College Registrar",
  Planning: "Planning and Development Office",
  Publication: "Student Publication Office",
  Procurement: "Procurement Office",
  Agriculture: "Department of Agriculture",
  "Agri-DOST-PCAARRD": "Agriculture - DOST PCAARRD",
  "DOST-PCAARRD": "DOST - PCAARRD Projects",
  "SSO-Medical": "Student Services - Medical Clinic",
  "Socio-cultural": "Socio-Cultural Affairs Office",
  Legal: "Legal Affairs Office",
  DI: "Department of Instruction (DI)",
  IT: "Information Technology Department (IT)"
};
async function getEndUserPerformanceAnalytics(input) {
  const db = await requireDb();
  const source = input?.source ?? "all";
  const fiscalYear = input?.fiscalYear ?? 2025;
  const prEntries = /* @__PURE__ */ new Map();
  if (source === "all" || source === "live") {
    const [officeRows, livePrs, livePos, deliveryRows] = await Promise.all([
      db.select().from(offices),
      db.select().from(purchaseRequests),
      db.select().from(purchaseOrders),
      db.select().from(deliveryReceipts)
    ]);
    const officeById = new Map(officeRows.map((o) => [o.id, o]));
    const poByPrId = new Map(livePos.map((po) => [po.purchaseRequestId, po]));
    const receiptByPoId = new Map(deliveryRows.map((dr) => [dr.purchaseOrderId, dr]));
    for (const pr of livePrs) {
      const office = officeById.get(pr.officeId);
      const rawName = office?.name || office?.code || "Unassigned Office";
      const officeName = END_USER_OFFICE_NAME_MAP[rawName] || rawName;
      const po = poByPrId.get(pr.id);
      const receipt = po ? receiptByPoId.get(po.id) : null;
      const estimatedTotal = Number(pr.totalEstimate || 0);
      const contractTotal = po ? Number(po.totalAmount || 0) : 0;
      const poStatus = po?.status?.toLowerCase() || "";
      const prStatus = pr.status?.toLowerCase() || "";
      const delStatus = receipt?.deliveryStatus?.toLowerCase() || "";
      const isFailed = prStatus === "rejected";
      const isPartial = delStatus === "partial";
      const isCancelled = prStatus === "returned" || poStatus === "cancelled";
      const now = Date.now();
      const isOverduePo = Boolean(
        po?.scheduledDeliveryDate && new Date(po.scheduledDeliveryDate).getTime() < now && poStatus !== "closed" && delStatus !== "complete"
      );
      const isDelayedPr = Boolean(
        prStatus === "returned" || !po && pr.submittedAt && now - new Date(pr.submittedAt).getTime() > 30 * 864e5 || isOverduePo
      );
      const key = `live_${pr.id}_${officeName}`;
      prEntries.set(key, {
        prNumber: pr.prNumber,
        office: officeName,
        officeId: pr.officeId,
        estimatedTotal,
        total: contractTotal,
        statuses: new Set([pr.status, poStatus, delStatus].filter(Boolean)),
        isDelayed: isDelayedPr,
        isFailed,
        isPartial,
        isCancelled
      });
    }
  }
  if (source === "all" || source === "historical") {
    const pmrConditions = fiscalYear ? [eq(pmrHistoricalRecords.fiscalYear, fiscalYear)] : [];
    const pmrRows = await db.select({
      office: pmrHistoricalRecords.office,
      endUser: pmrHistoricalRecords.endUser,
      prNumber: pmrHistoricalRecords.prNumber,
      estimatedTotal: pmrHistoricalRecords.estimatedTotal,
      total: pmrHistoricalRecords.total,
      status: pmrHistoricalRecords.status,
      remarks: pmrHistoricalRecords.remarks
    }).from(pmrHistoricalRecords).where(pmrConditions.length ? pmrConditions[0] : void 0);
    for (const row of pmrRows) {
      const rawOffice = (row.office || row.endUser || "Unassigned Office").trim();
      const officeName = END_USER_OFFICE_NAME_MAP[rawOffice] || rawOffice;
      const key = `pmr_${row.prNumber}__${officeName}`;
      if (!prEntries.has(key)) {
        prEntries.set(key, {
          prNumber: row.prNumber,
          office: officeName,
          officeId: null,
          estimatedTotal: 0,
          total: 0,
          statuses: /* @__PURE__ */ new Set(),
          isDelayed: false,
          isFailed: false,
          isPartial: false,
          isCancelled: false
        });
      }
      const entry = prEntries.get(key);
      entry.estimatedTotal += Number(row.estimatedTotal || 0);
      entry.total += Number(row.total || 0);
      if (row.status) entry.statuses.add(row.status.trim());
      if (row.remarks) entry.statuses.add(row.remarks.trim());
      const s = (row.status || "").toLowerCase();
      const r = (row.remarks || "").toLowerCase();
      if (s.includes("fail") || s.includes("exceeded the budget") || s.includes("no supplier quoted")) {
        entry.isFailed = true;
      }
      if (s.includes("inc. delivery") || s.includes("partial") || r.includes("partial")) {
        entry.isPartial = true;
      }
      if (s.includes("cancel") || s.includes("terminat") || r.includes("cancel")) {
        entry.isCancelled = true;
      }
      if (s.includes("delay") || s.includes("late") || s.includes("overdue") || s.includes("inc. delivery") || r.includes("delay") || r.includes("late")) {
        entry.isDelayed = true;
      }
    }
  }
  const officeMap = /* @__PURE__ */ new Map();
  let failedCount = 0;
  let partialDeliveryCount = 0;
  let cancelledCount = 0;
  let totalDelayedPrs = 0;
  for (const entry of Array.from(prEntries.values())) {
    if (entry.isFailed) failedCount++;
    if (entry.isPartial) partialDeliveryCount++;
    if (entry.isCancelled) cancelledCount++;
    if (entry.isDelayed) totalDelayedPrs++;
    if (!officeMap.has(entry.office)) {
      officeMap.set(entry.office, {
        officeId: entry.officeId ?? null,
        endUser: entry.office,
        prCount: 0,
        totalAbc: 0,
        totalContract: 0,
        savings: 0,
        delayedPrs: 0
      });
    }
    const o = officeMap.get(entry.office);
    o.prCount++;
    o.totalAbc += entry.estimatedTotal;
    o.totalContract += entry.total;
    if (entry.isDelayed) o.delayedPrs++;
  }
  const officePerformance = Array.from(officeMap.values()).map((o) => {
    const totalAbc = Math.round(o.totalAbc * 100) / 100;
    const totalContract = Math.round(o.totalContract * 100) / 100;
    const savings = Math.round((totalAbc - totalContract) * 100) / 100;
    return {
      ...o,
      totalAbc,
      totalContract,
      savings
    };
  }).sort((a, b) => b.prCount - a.prCount || b.totalAbc - a.totalAbc);
  const totals = officePerformance.reduce(
    (acc, row) => ({
      prCount: acc.prCount + row.prCount,
      totalAbc: Math.round((acc.totalAbc + row.totalAbc) * 100) / 100,
      totalContract: Math.round((acc.totalContract + row.totalContract) * 100) / 100,
      savings: Math.round((acc.savings + row.savings) * 100) / 100,
      delayedPrs: acc.delayedPrs + row.delayedPrs
    }),
    { prCount: 0, totalAbc: 0, totalContract: 0, savings: 0, delayedPrs: 0 }
  );
  return {
    kpiSummary: {
      failedCount,
      partialDeliveryCount,
      cancelledCount,
      totalDelayedPrs,
      totalSavings: totals.savings
    },
    officePerformance,
    totals
  };
}

// server/supabaseRealtime.ts
import { createClient } from "@supabase/supabase-js";
var REALTIME_TOPIC = "procurewise:workflow";
function getSupabaseRealtimePublicConfig() {
  const url = process.env.VITE_SUPABASE_URL ?? "";
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY ?? "";
  return { url, anonKey, isConfigured: Boolean(url && anonKey) };
}
function buildProcurementRealtimePayload(recordType) {
  return { recordType, occurredAt: (/* @__PURE__ */ new Date()).toISOString() };
}
async function publishProcurementRealtimeUpdate(recordType) {
  const url = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return { published: false, reason: "not_configured" };
  const client = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const channel = client.channel(REALTIME_TOPIC, { config: { broadcast: { ack: true, self: false } } });
  try {
    const subscribed = await new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(false), 2500);
      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          clearTimeout(timeout);
          resolve(true);
        }
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          clearTimeout(timeout);
          resolve(false);
        }
      });
    });
    if (!subscribed) return { published: false, reason: "unavailable" };
    const response = await channel.send({ type: "broadcast", event: "record_changed", payload: buildProcurementRealtimePayload(recordType) });
    return { published: response === "ok", reason: response === "ok" ? "published" : "unavailable" };
  } finally {
    await client.removeChannel(channel);
  }
}

// server/excelTemplateEngine.ts
import ExcelJS from "exceljs";
var SUPPORTED_FORM_TEMPLATES = {
  purchase_request: {
    key: "purchase_request",
    code: "PR",
    displayName: "Purchase Request (Appendix 60)",
    regulatoryStandard: "GAM for SUCs / RA 9184 Appendix 60",
    category: "Requisition",
    description: "Official government purchase request for supplies, materials, and equipment requisitions.",
    sampleFileName: "Purchase_Request_Template.xlsx",
    placeholders: [
      { token: "{{pr_no}}", label: "PR Number", example: "PR-2026-03-014", description: "System generated Purchase Request tracking number" },
      { token: "{{office}}", label: "Office / Department", example: "ICT Unit", description: "Requesting department or operating unit" },
      { token: "{{date}}", label: "Request Date", example: "March 26, 2026", description: "Official requisition submission date" },
      { token: "{{fund_cluster}}", label: "Fund Cluster", example: "Regular Agency Fund (01101101)", description: "Funding source / GAA allotment" },
      { token: "{{responsibility_code}}", label: "Responsibility Center Code", example: "BSC-ICT-2026", description: "Accounting responsibility center" },
      { token: "{{purpose}}", label: "Purpose", example: "Procurement of office and IT supplies for 1st Quarter", description: "Justification and requisition purpose" },
      { token: "{{abc_amount}}", label: "Total ABC Amount", example: "\u20B1145,250.00", description: "Approved Budget for the Contract total" },
      { token: "{{amount_in_words}}", label: "Amount in Words", example: "One Hundred Forty-Five Thousand Two Hundred Fifty Pesos Only", description: "Spelled-out total monetary value" },
      { token: "{{signatory_1_name}}", label: "Requested By (Name)", example: "Prof. Maria Santos", description: "End-user requisitioner full name" },
      { token: "{{signatory_1_title}}", label: "Requested By (Title)", example: "Head, ICT Unit", description: "Requisitioner official position" },
      { token: "{{signatory_2_name}}", label: "Approved By (Name)", example: "Dr. Roberto C. Reyes", description: "Authorizing administrative official" },
      { token: "{{signatory_2_title}}", label: "Approved By (Title)", example: "College President / VP Administration", description: "Authorizing official title" },
      // Table repeating placeholders
      { token: "{{item_no}}", label: "Item / Stock No.", example: "1", description: "Line item sequence number" },
      { token: "{{unit}}", label: "Unit of Issue", example: "ream", description: "Unit of measurement" },
      { token: "{{item_desc}}", label: "Item Description", example: "Multi-purpose Bond Paper A4 (70gsm)", description: "Technical specifications of item" },
      { token: "{{qty}}", label: "Quantity", example: "50", description: "Quantity requested" },
      { token: "{{unit_cost}}", label: "Unit Cost", example: "\u20B1285.00", description: "Estimated cost per unit" },
      { token: "{{total_cost}}", label: "Total Cost", example: "\u20B114,250.00", description: "Line item total amount" }
    ]
  },
  rfq: {
    key: "rfq",
    code: "RFQ",
    displayName: "Request for Quotation (Official Annex D)",
    regulatoryStandard: "RA 9184 IRR Annex D",
    category: "Canvass & Market Scoping",
    description: "Prescribed request for quotation sent to eligible commercial suppliers for price sounding.",
    sampleFileName: "Request_For_Quotation_Template.xlsx",
    placeholders: [
      { token: "{{rfq_no}}", label: "RFQ Number", example: "RFQ-2026-03-088", description: "Official Request for Quotation sequence code" },
      { token: "{{pr_no}}", label: "Associated PR No.", example: "PR-2026-03-014", description: "Linked Purchase Request identification" },
      { token: "{{date}}", label: "Issuance Date", example: "March 26, 2026", description: "Date of RFQ transmission" },
      { token: "{{deadline}}", label: "Submission Deadline", example: "April 02, 2026 (5:00 PM)", description: "Deadline for supplier quotation submission" },
      { token: "{{delivery_term}}", label: "Delivery Period", example: "15 Calendar Days", description: "Required days to deliver post-PO" },
      { token: "{{place_of_delivery}}", label: "Place of Delivery", example: "Batanes State College, San Antonio, Basco", description: "Designated receiving location" },
      { token: "{{supplier_name}}", label: "Supplier / Bidder Name", example: "Batanes Commercial Hub", description: "Name of invited or responding supplier" },
      { token: "{{supplier_address}}", label: "Supplier Address", example: "National Road, Basco, Batanes", description: "Supplier business address" },
      { token: "{{philgeps_no}}", label: "PhilGEPS Registration No.", example: "2024-89312", description: "Supplier PhilGEPS registry code" },
      { token: "{{abc_amount}}", label: "Total ABC Amount", example: "\u20B1145,250.00", description: "Maximum budget limit for the procurement" },
      { token: "{{canvasser_name}}", label: "Canvasser Name", example: "Juan Dela Cruz", description: "Procurement staff / canvasser" },
      { token: "{{canvasser_title}}", label: "Canvasser Title", example: "Procurement Officer I", description: "Canvasser designation" },
      // Table repeating placeholders
      { token: "{{item_no}}", label: "Item No.", example: "1", description: "Item sequence number" },
      { token: "{{qty}}", label: "Quantity", example: "50", description: "Required quantity" },
      { token: "{{unit}}", label: "Unit", example: "ream", description: "Unit of measurement" },
      { token: "{{item_desc}}", label: "Item & Specifications", example: "Multi-purpose Bond Paper A4 (70gsm)", description: "Detailed specification" },
      { token: "{{compliance}}", label: "Compliance Statement", example: "Compliant", description: "Supplier technical compliance" },
      { token: "{{bid_unit_price}}", label: "Bidder Unit Price", example: "\u20B1275.00", description: "Offered price per unit" },
      { token: "{{bid_total_price}}", label: "Bidder Total Price", example: "\u20B113,750.00", description: "Calculated item quotation total" }
    ]
  },
  abstract_of_quotations: {
    key: "abstract_of_quotations",
    code: "AOQ",
    displayName: "Abstract of Quotations / Canvass (Annex F)",
    regulatoryStandard: "RA 9184 IRR Annex F",
    category: "BAC Evaluation & Award",
    description: "Official comparison matrix evaluating commercial quotations to establish the lowest calculated bid.",
    sampleFileName: "Abstract_Of_Quotations_Template.xlsx",
    placeholders: [
      { token: "{{aoq_no}}", label: "Abstract Number", example: "AOQ-2026-03-042", description: "Official BAC Abstract identification" },
      { token: "{{rfq_no}}", label: "RFQ Number", example: "RFQ-2026-03-088", description: "Associated quotation canvass reference" },
      { token: "{{pr_no}}", label: "PR Number", example: "PR-2026-03-014", description: "Originating Purchase Request number" },
      { token: "{{date}}", label: "Opening Date", example: "April 03, 2026", description: "Date of official canvass opening" },
      { token: "{{opening_location}}", label: "Opening Location", example: "Procurement Office / BAC Conference Room", description: "Canvass opening room" },
      { token: "{{abc_amount}}", label: "Approved Budget (ABC)", example: "\u20B1145,250.00", description: "Approved budget threshold" },
      { token: "{{recommended_supplier}}", label: "Recommended Awardee", example: "Ivatan Trading & General Supplies", description: "Supplier evaluated as lowest calculated compliant bid" },
      { token: "{{awarded_amount}}", label: "Awarded Contract Total", example: "\u20B1138,400.00", description: "Recommended contract price" },
      { token: "{{savings}}", label: "Government Savings", example: "\u20B16,850.00", description: "Difference between ABC and Awarded Amount" },
      { token: "{{recommendation_reason}}", label: "Evaluation Basis / Reason", example: "Lowest calculated responsive quotation complying with all specifications.", description: "Justification for award recommendation" },
      { token: "{{bac_chairperson}}", label: "BAC Chairperson", example: "Dr. Elena G. Martinez", description: "Chairperson of Bids and Awards Committee" },
      { token: "{{bac_vice_chair}}", label: "BAC Vice-Chairperson", example: "Engr. Leo V. Fernandez", description: "Vice-Chairperson of BAC" },
      { token: "{{bac_members}}", label: "BAC Members", example: "Atty. Clara Ramos, Dr. Samuel Cruz", description: "Participating BAC Committee Members" },
      // Table repeating placeholders
      { token: "{{item_no}}", label: "Item No.", example: "1", description: "Item sequence number" },
      { token: "{{item_desc}}", label: "Item Description", example: "Multi-purpose Bond Paper A4 (70gsm)", description: "Article or commodity specification" },
      { token: "{{qty}}", label: "Quantity", example: "50", description: "Quantity" },
      { token: "{{unit}}", label: "Unit", example: "ream", description: "Measurement unit" },
      { token: "{{supplier_1_name}}", label: "Supplier 1 Name", example: "Ivatan Trading", description: "First evaluated bidder name" },
      { token: "{{supplier_1_bid}}", label: "Supplier 1 Bid", example: "\u20B113,750.00", description: "First bidder total quote" },
      { token: "{{supplier_2_name}}", label: "Supplier 2 Name", example: "Northern Goods Co.", description: "Second evaluated bidder name" },
      { token: "{{supplier_2_bid}}", label: "Supplier 2 Bid", example: "\u20B114,100.00", description: "Second bidder total quote" },
      { token: "{{lowest_bidder}}", label: "Lowest Bidder for Item", example: "Ivatan Trading", description: "Winning item offer" }
    ]
  },
  purchase_order: {
    key: "purchase_order",
    code: "PO",
    displayName: "Purchase Order (Appendix 61)",
    regulatoryStandard: "GAM for SUCs / RA 9184 Appendix 61",
    category: "Contract & Award",
    description: "Prescribed government contract binding the institution and awarded supplier for goods delivery.",
    sampleFileName: "Purchase_Order_Template.xlsx",
    placeholders: [
      { token: "{{po_no}}", label: "PO Number", example: "PO-2026-03-019", description: "Legally binding Purchase Order number" },
      { token: "{{date}}", label: "PO Date", example: "April 05, 2026", description: "Contract issuance date" },
      { token: "{{pr_no}}", label: "Linked PR Number", example: "PR-2026-03-014", description: "Associated Purchase Request" },
      { token: "{{supplier_name}}", label: "Supplier Name", example: "Ivatan Trading & General Supplies", description: "Awarded contractor business name" },
      { token: "{{supplier_address}}", label: "Supplier Address", example: "National Road, San Antonio, Basco, Batanes", description: "Contractor official address" },
      { token: "{{tin_no}}", label: "TIN", example: "123-456-789-000", description: "Taxpayer Identification Number" },
      { token: "{{philgeps_no}}", label: "PhilGEPS Registration No.", example: "2024-89312", description: "PhilGEPS merchant identification" },
      { token: "{{procurement_mode}}", label: "Mode of Procurement", example: "NP-53.9 Small Value Procurement", description: "RA 9184 statutory method" },
      { token: "{{place_of_delivery}}", label: "Place of Delivery", example: "Batanes State College Supply Office", description: "Physical delivery destination" },
      { token: "{{delivery_date}}", label: "Delivery Date", example: "Within 15 days upon receipt of NTP/PO", description: "Expected delivery deadline" },
      { token: "{{delivery_term}}", label: "Delivery Term", example: "FOB Destination", description: "Shipping and risk transfer term" },
      { token: "{{payment_term}}", label: "Payment Term", example: "Government Terms (Check / LDDAP upon inspection)", description: "Payment processing terms" },
      { token: "{{total_amount}}", label: "Total PO Amount", example: "\u20B1138,400.00", description: "Total contract value in Philippine Peso" },
      { token: "{{amount_in_words}}", label: "Amount in Words", example: "One Hundred Thirty-Eight Thousand Four Hundred Pesos Only", description: "Spelled out total amount" },
      { token: "{{authorized_official}}", label: "Authorized Official (HOPE)", example: "Dr. Roberto C. Reyes", description: "Head of Procuring Entity full name" },
      { token: "{{authorized_official_title}}", label: "HOPE Title", example: "College President", description: "Title of signing official" },
      { token: "{{accountant_name}}", label: "Chief Accountant", example: "Ms. Teresa M. Valiente, CPA", description: "Head of Accounting Unit certifying funds" },
      { token: "{{supplier_representative}}", label: "Supplier Conforme (Name)", example: "Mr. Arnold B. Gomez", description: "Authorized representative of contractor" },
      // Table repeating placeholders
      { token: "{{item_no}}", label: "Stock / Property No.", example: "1", description: "Sequence number" },
      { token: "{{unit}}", label: "Unit", example: "ream", description: "Unit of issue" },
      { token: "{{item_desc}}", label: "Description", example: "Multi-purpose Bond Paper A4 (70gsm)", description: "Procured item description" },
      { token: "{{qty}}", label: "Quantity", example: "50", description: "Delivered quantity" },
      { token: "{{unit_cost}}", label: "Unit Cost", example: "\u20B1275.00", description: "Awarded unit price" },
      { token: "{{total_cost}}", label: "Amount", example: "\u20B113,750.00", description: "Item line total" }
    ]
  },
  acknowledgement_receipt: {
    key: "acknowledgement_receipt",
    code: "AR",
    displayName: "Acknowledgement Receipt for Property / Inventory (PAR/ICS)",
    regulatoryStandard: "GAM for SUCs Appendix 71 / Property Management",
    category: "Property & Inspection",
    description: "Official acknowledgement certificate documenting receipt, custody, and physical handover of procured goods.",
    sampleFileName: "Acknowledgement_Receipt_Template.xlsx",
    placeholders: [
      { token: "{{receipt_no}}", label: "Receipt / PAR No.", example: "AR-2026-04-007", description: "Property acknowledgement tracking number" },
      { token: "{{date}}", label: "Receipt Date", example: "April 18, 2026", description: "Date items were physically accepted" },
      { token: "{{po_no}}", label: "Linked PO Number", example: "PO-2026-03-019", description: "Originating Purchase Order" },
      { token: "{{supplier_name}}", label: "Supplier Name", example: "Ivatan Trading & General Supplies", description: "Delivering contractor" },
      { token: "{{receiving_office}}", label: "Receiving Office / Custodian", example: "ICT Unit", description: "End-user office accepting property custody" },
      { token: "{{fund_cluster}}", label: "Fund Cluster", example: "Regular Agency Fund (01101101)", description: "Funding code" },
      { token: "{{physical_location}}", label: "Physical Location", example: "College Library & Computer Laboratories", description: "Physical deployment area" },
      { token: "{{total_amount}}", label: "Total Asset Value", example: "\u20B1138,400.00", description: "Cumulative valuation of accepted assets" },
      { token: "{{received_by_name}}", label: "Received By (Custodian)", example: "Prof. Maria Santos", description: "End-user custodian receiving property" },
      { token: "{{received_by_designation}}", label: "Custodian Title", example: "Head, ICT Unit", description: "Custodian job designation" },
      { token: "{{received_date}}", label: "Received Date", example: "April 18, 2026", description: "Custodian signing date" },
      { token: "{{issued_by_name}}", label: "Issued By (Supply Officer)", example: "Engr. Michael D. Tan", description: "Property & Supply Officer" },
      { token: "{{issued_by_designation}}", label: "Supply Officer Title", example: "Administrative Officer V (Supply)", description: "Supply officer designation" },
      { token: "{{issued_date}}", label: "Issued Date", example: "April 18, 2026", description: "Issuing officer date" },
      // Table repeating placeholders
      { token: "{{item_no}}", label: "Item No.", example: "1", description: "Sequential index" },
      { token: "{{qty}}", label: "Quantity", example: "50", description: "Accepted quantity" },
      { token: "{{unit}}", label: "Unit", example: "ream", description: "Unit of issue" },
      { token: "{{item_desc}}", label: "Description", example: "Multi-purpose Bond Paper A4 (70gsm)", description: "Commodity description" },
      { token: "{{property_no}}", label: "Property / Inventory Tag No.", example: "BSC-INV-2026-0041", description: "Institutional inventory sticker number" },
      { token: "{{date_acquired}}", label: "Date Acquired", example: "2026-04-18", description: "Official acquisition date" },
      { token: "{{unit_cost}}", label: "Unit Value", example: "\u20B1275.00", description: "Unit capitalization cost" },
      { token: "{{total_cost}}", label: "Total Value", example: "\u20B113,750.00", description: "Extended item valuation" }
    ]
  }
};
function getSampleFormData(key) {
  const commonItems = [
    { item_no: 1, unit: "ream", item_desc: "Multi-purpose Bond Paper A4 (70gsm, 500 sheets/ream)", qty: 50, unit_cost: "\u20B1285.00", total_cost: "\u20B114,250.00", property_no: "BSC-PROP-2026-001", date_acquired: "2026-04-15" },
    { item_no: 2, unit: "cartridge", item_desc: "Original HP Toner Cartridge 85A Black", qty: 4, unit_cost: "\u20B13,450.00", total_cost: "\u20B113,800.00", property_no: "BSC-PROP-2026-002", date_acquired: "2026-04-15" },
    { item_no: 3, unit: "unit", item_desc: "Heavy-Duty 2-Hole Paper Puncher (Metal Chassis)", qty: 6, unit_cost: "\u20B1750.00", total_cost: "\u20B14,500.00", property_no: "BSC-PROP-2026-003", date_acquired: "2026-04-15" },
    { item_no: 4, unit: "box", item_desc: "Permanent Marker Pen (Black, Fine Bullet Tip, 12s)", qty: 10, unit_cost: "\u20B1420.00", total_cost: "\u20B14,200.00", property_no: "BSC-PROP-2026-004", date_acquired: "2026-04-15" },
    { item_no: 5, unit: "unit", item_desc: "Uninterruptible Power Supply (UPS 650VA / 360W)", qty: 8, unit_cost: "\u20B13,200.00", total_cost: "\u20B125,600.00", property_no: "BSC-PROP-2026-005", date_acquired: "2026-04-15" }
  ];
  switch (key) {
    case "purchase_request":
      return {
        pr_no: "PR-2026-03-014",
        office: "ICT Unit / Office of the Vice President for Administration",
        date: "March 26, 2026",
        fund_cluster: "Regular Agency Fund (01101101)",
        responsibility_code: "BSC-ICT-2026",
        purpose: "Urgent procurement of standard office, printing, and ICT supplies for 1st Semester operations.",
        abc_amount: "\u20B162,350.00",
        amount_in_words: "Sixty-Two Thousand Three Hundred Fifty Pesos Only",
        signatory_1_name: "Prof. Maria Santos",
        signatory_1_title: "Head, ICT Unit",
        signatory_2_name: "Dr. Roberto C. Reyes",
        signatory_2_title: "College President / Authorized HOPE",
        items: commonItems
      };
    case "rfq":
      return {
        rfq_no: "RFQ-2026-03-088",
        pr_no: "PR-2026-03-014",
        date: "March 26, 2026",
        deadline: "April 02, 2026 (5:00 PM)",
        delivery_term: "15 Calendar Days",
        place_of_delivery: "Batanes State College Supply & Property Office, San Antonio, Basco",
        supplier_name: "Ivatan Trading & General Supplies",
        supplier_address: "National Road, San Antonio, Basco, Batanes",
        philgeps_no: "2024-89312",
        abc_amount: "\u20B162,350.00",
        canvasser_name: "Juan Dela Cruz",
        canvasser_title: "Procurement Officer I",
        items: commonItems.map((item) => ({
          ...item,
          compliance: "Comply",
          bid_unit_price: item.unit_cost,
          bid_total_price: item.total_cost
        }))
      };
    case "abstract_of_quotations":
      return {
        aoq_no: "AOQ-2026-03-042",
        rfq_no: "RFQ-2026-03-088",
        pr_no: "PR-2026-03-014",
        date: "April 03, 2026",
        opening_location: "BAC Conference Room, Administration Building, Batanes State College",
        abc_amount: "\u20B162,350.00",
        recommended_supplier: "Ivatan Trading & General Supplies",
        awarded_amount: "\u20B159,800.00",
        savings: "\u20B12,550.00",
        recommendation_reason: "Evaluated as the Lowest Calculated Responsive Quotation meeting all technical specifications and compliance criteria.",
        bac_chairperson: "Dr. Elena G. Martinez",
        bac_vice_chair: "Engr. Leo V. Fernandez",
        bac_members: "Atty. Clara Ramos, Dr. Samuel Cruz, Prof. Alan Perez",
        items: commonItems.map((item, idx) => ({
          ...item,
          supplier_1_name: "Ivatan Trading",
          supplier_1_bid: item.total_cost,
          supplier_2_name: "Northern Goods",
          supplier_2_bid: `\u20B1${(Number(item.total_cost.replace(/[^0-9.]/g, "")) * 1.05).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`,
          lowest_bidder: "Ivatan Trading"
        }))
      };
    case "purchase_order":
      return {
        po_no: "PO-2026-03-019",
        date: "April 05, 2026",
        pr_no: "PR-2026-03-014",
        supplier_name: "Ivatan Trading & General Supplies",
        supplier_address: "National Road, San Antonio, Basco, Batanes",
        tin_no: "123-456-789-000",
        philgeps_no: "2024-89312",
        procurement_mode: "NP-53.9 Small Value Procurement (RA 9184)",
        place_of_delivery: "Batanes State College Supply Office, San Antonio, Basco",
        delivery_date: "Within 15 days upon receipt of PO",
        delivery_term: "FOB Destination",
        payment_term: "Government Terms (Check / LDDAP after final inspection)",
        total_amount: "\u20B159,800.00",
        amount_in_words: "Fifty-Nine Thousand Eight Hundred Pesos Only",
        authorized_official: "Dr. Roberto C. Reyes",
        authorized_official_title: "College President",
        accountant_name: "Ms. Teresa M. Valiente, CPA",
        supplier_representative: "Mr. Arnold B. Gomez",
        items: commonItems
      };
    case "acknowledgement_receipt":
      return {
        receipt_no: "AR-2026-04-007",
        date: "April 18, 2026",
        po_no: "PO-2026-03-019",
        supplier_name: "Ivatan Trading & General Supplies",
        receiving_office: "ICT Unit / Department of Information Technology",
        fund_cluster: "Regular Agency Fund (01101101)",
        physical_location: "College Library & Computer Laboratory 2",
        total_amount: "\u20B159,800.00",
        received_by_name: "Prof. Maria Santos",
        received_by_designation: "Head, ICT Unit",
        received_date: "April 18, 2026",
        issued_by_name: "Engr. Michael D. Tan",
        issued_by_designation: "Administrative Officer V (Property & Supply)",
        issued_date: "April 18, 2026",
        items: commonItems
      };
  }
}
async function createMasterExcelWorkbook(key) {
  const mod = ExcelJS.default || ExcelJS;
  const Workbook = mod.Workbook;
  const wb = new Workbook();
  wb.creator = "ProcureWise Government Forms Engine";
  wb.created = /* @__PURE__ */ new Date();
  const meta = SUPPORTED_FORM_TEMPLATES[key];
  const ws = wb.addWorksheet(meta.code, {
    views: [{ showGridLines: true }],
    pageSetup: {
      paperSize: 9,
      // A4
      orientation: key === "abstract_of_quotations" ? "landscape" : "portrait",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 }
    }
  });
  const thinBorder = {
    top: { style: "thin", color: { argb: "FF333333" } },
    bottom: { style: "thin", color: { argb: "FF333333" } },
    left: { style: "thin", color: { argb: "FF333333" } },
    right: { style: "thin", color: { argb: "FF333333" } }
  };
  const headerFill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF3F1EC" }
  };
  const maroonText = {
    name: "Arial",
    size: 10,
    bold: true,
    color: { argb: "FF7B1E1E" }
  };
  const boldText = {
    name: "Arial",
    size: 9,
    bold: true,
    color: { argb: "FF202833" }
  };
  const normalText = {
    name: "Arial",
    size: 9,
    color: { argb: "FF202833" }
  };
  switch (key) {
    case "purchase_request": {
      ws.columns = [
        { width: 12 },
        // A: Item No.
        { width: 10 },
        // B: Unit
        { width: 38 },
        // C: Description
        { width: 10 },
        // D: Qty
        { width: 16 },
        // E: Unit Cost
        { width: 18 }
        // F: Total Cost
      ];
      ws.mergeCells("A1:F1");
      ws.getCell("A1").value = "Republic of the Philippines";
      ws.getCell("A1").font = { name: "Arial", size: 9, italic: true };
      ws.getCell("A1").alignment = { horizontal: "center" };
      ws.mergeCells("A2:F2");
      ws.getCell("A2").value = "BATANES STATE COLLEGE";
      ws.getCell("A2").font = { name: "Arial", size: 12, bold: true, color: { argb: "FF7B1E1E" } };
      ws.getCell("A2").alignment = { horizontal: "center" };
      ws.mergeCells("A3:F3");
      ws.getCell("A3").value = "PURCHASE REQUEST (Appendix 60)";
      ws.getCell("A3").font = { name: "Arial", size: 11, bold: true };
      ws.getCell("A3").alignment = { horizontal: "center" };
      ws.getCell("A5").value = "Entity Name:";
      ws.getCell("A5").font = boldText;
      ws.getCell("B5").value = "Batanes State College";
      ws.getCell("B5").font = normalText;
      ws.getCell("E5").value = "Fund Cluster:";
      ws.getCell("E5").font = boldText;
      ws.getCell("F5").value = "{{fund_cluster}}";
      ws.getCell("F5").font = normalText;
      ws.getCell("A6").value = "Office/Section:";
      ws.getCell("A6").font = boldText;
      ws.mergeCells("B6:C6");
      ws.getCell("B6").value = "{{office}}";
      ws.getCell("B6").font = normalText;
      ws.getCell("E6").value = "PR No.:";
      ws.getCell("E6").font = boldText;
      ws.getCell("F6").value = "{{pr_no}}";
      ws.getCell("F6").font = normalText;
      ws.getCell("A7").value = "Responsibility:";
      ws.getCell("A7").font = boldText;
      ws.getCell("B7").value = "{{responsibility_code}}";
      ws.getCell("B7").font = normalText;
      ws.getCell("E7").value = "Date:";
      ws.getCell("E7").font = boldText;
      ws.getCell("F7").value = "{{date}}";
      ws.getCell("F7").font = normalText;
      const colHeaders = ["Stock / Item No.", "Unit", "Item Description & Specifications", "Quantity", "Estimated Unit Cost", "Estimated Total Cost"];
      const headerRow = ws.getRow(9);
      colHeaders.forEach((title, idx) => {
        const cell = headerRow.getCell(idx + 1);
        cell.value = title;
        cell.font = maroonText;
        cell.fill = headerFill;
        cell.border = thinBorder;
        cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      });
      headerRow.height = 24;
      const itemRow = ws.getRow(10);
      itemRow.getCell(1).value = "{{item_no}}";
      itemRow.getCell(1).alignment = { horizontal: "center" };
      itemRow.getCell(2).value = "{{unit}}";
      itemRow.getCell(2).alignment = { horizontal: "center" };
      itemRow.getCell(3).value = "{{item_desc}}";
      itemRow.getCell(3).alignment = { horizontal: "left" };
      itemRow.getCell(4).value = "{{qty}}";
      itemRow.getCell(4).alignment = { horizontal: "center" };
      itemRow.getCell(5).value = "{{unit_cost}}";
      itemRow.getCell(5).alignment = { horizontal: "right" };
      itemRow.getCell(6).value = "{{total_cost}}";
      itemRow.getCell(6).alignment = { horizontal: "right" };
      for (let c = 1; c <= 6; c++) {
        itemRow.getCell(c).border = thinBorder;
        itemRow.getCell(c).font = normalText;
      }
      ws.mergeCells("A11:E11");
      ws.getCell("A11").value = "TOTAL APPROVED BUDGET FOR THE CONTRACT (ABC):";
      ws.getCell("A11").font = boldText;
      ws.getCell("A11").alignment = { horizontal: "right" };
      ws.getCell("A11").border = thinBorder;
      ws.getCell("F11").value = "{{abc_amount}}";
      ws.getCell("F11").font = { ...boldText, color: { argb: "FF7B1E1E" } };
      ws.getCell("F11").alignment = { horizontal: "right" };
      ws.getCell("F11").border = thinBorder;
      ws.mergeCells("A12:F12");
      ws.getCell("A12").value = "Purpose: {{purpose}}";
      ws.getCell("A12").font = normalText;
      ws.getCell("A12").alignment = { horizontal: "left", wrapText: true };
      ws.getCell("A12").border = thinBorder;
      ws.getRow(12).height = 30;
      ws.mergeCells("A14:C14");
      ws.getCell("A14").value = "Requested by:";
      ws.getCell("A14").font = boldText;
      ws.mergeCells("D14:F14");
      ws.getCell("D14").value = "Approved by:";
      ws.getCell("D14").font = boldText;
      ws.mergeCells("A16:C16");
      ws.getCell("A16").value = "{{signatory_1_name}}";
      ws.getCell("A16").font = { ...boldText, underline: true };
      ws.getCell("A16").alignment = { horizontal: "center" };
      ws.mergeCells("D16:F16");
      ws.getCell("D16").value = "{{signatory_2_name}}";
      ws.getCell("D16").font = { ...boldText, underline: true };
      ws.getCell("D16").alignment = { horizontal: "center" };
      ws.mergeCells("A17:C17");
      ws.getCell("A17").value = "{{signatory_1_title}}";
      ws.getCell("A17").font = normalText;
      ws.getCell("A17").alignment = { horizontal: "center" };
      ws.mergeCells("D17:F17");
      ws.getCell("D17").value = "{{signatory_2_title}}";
      ws.getCell("D17").font = normalText;
      ws.getCell("D17").alignment = { horizontal: "center" };
      break;
    }
    case "rfq": {
      ws.columns = [
        { width: 10 },
        // A: Item No.
        { width: 8 },
        // B: Qty
        { width: 10 },
        // C: Unit
        { width: 34 },
        // D: Specs
        { width: 14 },
        // E: Compliance
        { width: 16 },
        // F: Unit Price
        { width: 16 }
        // G: Total Price
      ];
      ws.mergeCells("A1:G1");
      ws.getCell("A1").value = "BATANES STATE COLLEGE \u2014 PROCUREMENT UNIT";
      ws.getCell("A1").font = { name: "Arial", size: 11, bold: true, color: { argb: "FF7B1E1E" } };
      ws.getCell("A1").alignment = { horizontal: "center" };
      ws.mergeCells("A2:G2");
      ws.getCell("A2").value = "REQUEST FOR QUOTATION (Official Annex D)";
      ws.getCell("A2").font = { name: "Arial", size: 10, bold: true };
      ws.getCell("A2").alignment = { horizontal: "center" };
      ws.getCell("A4").value = "Supplier Name:";
      ws.getCell("A4").font = boldText;
      ws.mergeCells("B4:D4");
      ws.getCell("B4").value = "{{supplier_name}}";
      ws.getCell("B4").font = normalText;
      ws.getCell("E4").value = "RFQ No.:";
      ws.getCell("E4").font = boldText;
      ws.mergeCells("F4:G4");
      ws.getCell("F4").value = "{{rfq_no}}";
      ws.getCell("F4").font = normalText;
      ws.getCell("A5").value = "Address / TIN:";
      ws.getCell("A5").font = boldText;
      ws.mergeCells("B5:D5");
      ws.getCell("B5").value = "{{supplier_address}}";
      ws.getCell("B5").font = normalText;
      ws.getCell("E5").value = "Date:";
      ws.getCell("E5").font = boldText;
      ws.mergeCells("F5:G5");
      ws.getCell("F5").value = "{{date}}";
      ws.getCell("F5").font = normalText;
      ws.getCell("A6").value = "PhilGEPS Reg No.:";
      ws.getCell("A6").font = boldText;
      ws.getCell("B6").value = "{{philgeps_no}}";
      ws.getCell("B6").font = normalText;
      ws.getCell("E6").value = "Deadline:";
      ws.getCell("E6").font = boldText;
      ws.mergeCells("F6:G6");
      ws.getCell("F6").value = "{{deadline}}";
      ws.getCell("F6").font = normalText;
      const rfqHeaders = ["Item No.", "Qty", "Unit", "Item Description & Specifications", "Compliance", "Unit Price", "Total Amount"];
      const headerRow = ws.getRow(8);
      rfqHeaders.forEach((title, idx) => {
        const cell = headerRow.getCell(idx + 1);
        cell.value = title;
        cell.font = maroonText;
        cell.fill = headerFill;
        cell.border = thinBorder;
        cell.alignment = { horizontal: "center", vertical: "middle" };
      });
      const itemRow = ws.getRow(9);
      itemRow.getCell(1).value = "{{item_no}}";
      itemRow.getCell(1).alignment = { horizontal: "center" };
      itemRow.getCell(2).value = "{{qty}}";
      itemRow.getCell(2).alignment = { horizontal: "center" };
      itemRow.getCell(3).value = "{{unit}}";
      itemRow.getCell(3).alignment = { horizontal: "center" };
      itemRow.getCell(4).value = "{{item_desc}}";
      itemRow.getCell(4).alignment = { horizontal: "left" };
      itemRow.getCell(5).value = "{{compliance}}";
      itemRow.getCell(5).alignment = { horizontal: "center" };
      itemRow.getCell(6).value = "{{bid_unit_price}}";
      itemRow.getCell(6).alignment = { horizontal: "right" };
      itemRow.getCell(7).value = "{{bid_total_price}}";
      itemRow.getCell(7).alignment = { horizontal: "right" };
      for (let c = 1; c <= 7; c++) {
        itemRow.getCell(c).border = thinBorder;
        itemRow.getCell(c).font = normalText;
      }
      ws.mergeCells("A10:E10");
      ws.getCell("A10").value = "TOTAL BID / QUOTATION AMOUNT:";
      ws.getCell("A10").font = boldText;
      ws.getCell("A10").alignment = { horizontal: "right" };
      ws.getCell("A10").border = thinBorder;
      ws.mergeCells("F10:G10");
      ws.getCell("F10").value = "{{abc_amount}}";
      ws.getCell("F10").font = { ...boldText, color: { argb: "FF7B1E1E" } };
      ws.getCell("F10").alignment = { horizontal: "right" };
      ws.getCell("F10").border = thinBorder;
      ws.mergeCells("A12:D12");
      ws.getCell("A12").value = "Canvassed by: {{canvasser_name}} ({{canvasser_title}})";
      ws.getCell("A12").font = boldText;
      ws.mergeCells("E12:G12");
      ws.getCell("E12").value = "Supplier Conforme / Signature over Printed Name";
      ws.getCell("E12").font = boldText;
      break;
    }
    case "abstract_of_quotations": {
      ws.columns = [
        { width: 8 },
        // Item No
        { width: 30 },
        // Specs
        { width: 8 },
        // Qty
        { width: 8 },
        // Unit
        { width: 14 },
        // ABC Total
        { width: 18 },
        // Supplier 1
        { width: 18 },
        // Supplier 2
        { width: 18 }
        // Lowest Bidder
      ];
      ws.mergeCells("A1:H1");
      ws.getCell("A1").value = "BATANES STATE COLLEGE \u2014 BIDS AND AWARDS COMMITTEE";
      ws.getCell("A1").font = { name: "Arial", size: 12, bold: true, color: { argb: "FF7B1E1E" } };
      ws.getCell("A1").alignment = { horizontal: "center" };
      ws.mergeCells("A2:H2");
      ws.getCell("A2").value = "ABSTRACT OF QUOTATIONS (Annex F)";
      ws.getCell("A2").font = { name: "Arial", size: 10, bold: true };
      ws.getCell("A2").alignment = { horizontal: "center" };
      ws.getCell("A4").value = "Abstract No.:";
      ws.getCell("A4").font = boldText;
      ws.getCell("B4").value = "{{aoq_no}}";
      ws.getCell("B4").font = normalText;
      ws.getCell("E4").value = "Date:";
      ws.getCell("E4").font = boldText;
      ws.getCell("F4").value = "{{date}}";
      ws.getCell("F4").font = normalText;
      ws.getCell("A5").value = "Linked RFQ / PR:";
      ws.getCell("A5").font = boldText;
      ws.getCell("B5").value = "{{rfq_no}} / {{pr_no}}";
      ws.getCell("B5").font = normalText;
      ws.getCell("E5").value = "Total ABC:";
      ws.getCell("E5").font = boldText;
      ws.getCell("F5").value = "{{abc_amount}}";
      ws.getCell("F5").font = normalText;
      const aoqHeaders = ["Item", "Item Description", "Qty", "Unit", "ABC Limit", "Bidder 1: {{supplier_1_name}}", "Bidder 2: {{supplier_2_name}}", "Lowest Compliant Bidder"];
      const headerRow = ws.getRow(7);
      aoqHeaders.forEach((title, idx) => {
        const cell = headerRow.getCell(idx + 1);
        cell.value = title;
        cell.font = maroonText;
        cell.fill = headerFill;
        cell.border = thinBorder;
        cell.alignment = { horizontal: "center", vertical: "middle" };
      });
      const itemRow = ws.getRow(8);
      itemRow.getCell(1).value = "{{item_no}}";
      itemRow.getCell(1).alignment = { horizontal: "center" };
      itemRow.getCell(2).value = "{{item_desc}}";
      itemRow.getCell(2).alignment = { horizontal: "left" };
      itemRow.getCell(3).value = "{{qty}}";
      itemRow.getCell(3).alignment = { horizontal: "center" };
      itemRow.getCell(4).value = "{{unit}}";
      itemRow.getCell(4).alignment = { horizontal: "center" };
      itemRow.getCell(5).value = "{{abc_amount}}";
      itemRow.getCell(5).alignment = { horizontal: "right" };
      itemRow.getCell(6).value = "{{supplier_1_bid}}";
      itemRow.getCell(6).alignment = { horizontal: "right" };
      itemRow.getCell(7).value = "{{supplier_2_bid}}";
      itemRow.getCell(7).alignment = { horizontal: "right" };
      itemRow.getCell(8).value = "{{lowest_bidder}}";
      itemRow.getCell(8).alignment = { horizontal: "center" };
      for (let c = 1; c <= 8; c++) {
        itemRow.getCell(c).border = thinBorder;
        itemRow.getCell(c).font = normalText;
      }
      ws.mergeCells("A10:H10");
      ws.getCell("A10").value = "RECOMMENDATION OF AWARD:";
      ws.getCell("A10").font = boldText;
      ws.getCell("A10").fill = headerFill;
      ws.getCell("A10").border = thinBorder;
      ws.mergeCells("A11:H11");
      ws.getCell("A11").value = "Awarded Supplier: {{recommended_supplier}} | Awarded Contract Total: {{awarded_amount}} | Savings: {{savings}}";
      ws.getCell("A11").font = boldText;
      ws.getCell("A11").border = thinBorder;
      ws.mergeCells("A12:H12");
      ws.getCell("A12").value = "Reason / Justification: {{recommendation_reason}}";
      ws.getCell("A12").font = normalText;
      ws.getCell("A12").border = thinBorder;
      ws.mergeCells("A14:C14");
      ws.getCell("A14").value = "BAC Chairperson: {{bac_chairperson}}";
      ws.getCell("A14").font = boldText;
      ws.mergeCells("D14:F14");
      ws.getCell("D14").value = "BAC Vice-Chair: {{bac_vice_chair}}";
      ws.getCell("D14").font = boldText;
      ws.mergeCells("G14:H14");
      ws.getCell("G14").value = "BAC Members: {{bac_members}}";
      ws.getCell("G14").font = normalText;
      break;
    }
    case "purchase_order": {
      ws.columns = [
        { width: 12 },
        // Item No
        { width: 10 },
        // Unit
        { width: 36 },
        // Description
        { width: 10 },
        // Qty
        { width: 16 },
        // Unit Cost
        { width: 18 }
        // Total Cost
      ];
      ws.mergeCells("A1:F1");
      ws.getCell("A1").value = "Republic of the Philippines";
      ws.getCell("A1").font = { name: "Arial", size: 9, italic: true };
      ws.getCell("A1").alignment = { horizontal: "center" };
      ws.mergeCells("A2:F2");
      ws.getCell("A2").value = "BATANES STATE COLLEGE";
      ws.getCell("A2").font = { name: "Arial", size: 12, bold: true, color: { argb: "FF7B1E1E" } };
      ws.getCell("A2").alignment = { horizontal: "center" };
      ws.mergeCells("A3:F3");
      ws.getCell("A3").value = "PURCHASE ORDER (Appendix 61)";
      ws.getCell("A3").font = { name: "Arial", size: 11, bold: true };
      ws.getCell("A3").alignment = { horizontal: "center" };
      ws.getCell("A5").value = "Supplier:";
      ws.getCell("A5").font = boldText;
      ws.mergeCells("B5:C5");
      ws.getCell("B5").value = "{{supplier_name}}";
      ws.getCell("B5").font = normalText;
      ws.getCell("E5").value = "P.O. No.:";
      ws.getCell("E5").font = boldText;
      ws.getCell("F5").value = "{{po_no}}";
      ws.getCell("F5").font = normalText;
      ws.getCell("A6").value = "Address:";
      ws.getCell("A6").font = boldText;
      ws.mergeCells("B6:C6");
      ws.getCell("B6").value = "{{supplier_address}}";
      ws.getCell("B6").font = normalText;
      ws.getCell("E6").value = "Date:";
      ws.getCell("E6").font = boldText;
      ws.getCell("F6").value = "{{date}}";
      ws.getCell("F6").font = normalText;
      ws.getCell("A7").value = "TIN / PhilGEPS:";
      ws.getCell("A7").font = boldText;
      ws.getCell("B7").value = "{{tin_no}} / {{philgeps_no}}";
      ws.getCell("B7").font = normalText;
      ws.getCell("E7").value = "Procurement Mode:";
      ws.getCell("E7").font = boldText;
      ws.getCell("F7").value = "{{procurement_mode}}";
      ws.getCell("F7").font = normalText;
      ws.mergeCells("A9:F9");
      ws.getCell("A9").value = "Gentlemen: Please furnish this Office the following articles subject to the terms and conditions contained herein:";
      ws.getCell("A9").font = { name: "Arial", size: 9, italic: true };
      const poHeaders = ["Stock / Property No.", "Unit", "Description", "Quantity", "Unit Cost", "Amount"];
      const headerRow = ws.getRow(11);
      poHeaders.forEach((title, idx) => {
        const cell = headerRow.getCell(idx + 1);
        cell.value = title;
        cell.font = maroonText;
        cell.fill = headerFill;
        cell.border = thinBorder;
        cell.alignment = { horizontal: "center", vertical: "middle" };
      });
      const itemRow = ws.getRow(12);
      itemRow.getCell(1).value = "{{item_no}}";
      itemRow.getCell(1).alignment = { horizontal: "center" };
      itemRow.getCell(2).value = "{{unit}}";
      itemRow.getCell(2).alignment = { horizontal: "center" };
      itemRow.getCell(3).value = "{{item_desc}}";
      itemRow.getCell(3).alignment = { horizontal: "left" };
      itemRow.getCell(4).value = "{{qty}}";
      itemRow.getCell(4).alignment = { horizontal: "center" };
      itemRow.getCell(5).value = "{{unit_cost}}";
      itemRow.getCell(5).alignment = { horizontal: "right" };
      itemRow.getCell(6).value = "{{total_cost}}";
      itemRow.getCell(6).alignment = { horizontal: "right" };
      for (let c = 1; c <= 6; c++) {
        itemRow.getCell(c).border = thinBorder;
        itemRow.getCell(c).font = normalText;
      }
      ws.mergeCells("A13:E13");
      ws.getCell("A13").value = "TOTAL AMOUNT (Figures):";
      ws.getCell("A13").font = boldText;
      ws.getCell("A13").alignment = { horizontal: "right" };
      ws.getCell("A13").border = thinBorder;
      ws.getCell("F13").value = "{{total_amount}}";
      ws.getCell("F13").font = { ...boldText, color: { argb: "FF7B1E1E" } };
      ws.getCell("F13").alignment = { horizontal: "right" };
      ws.getCell("F13").border = thinBorder;
      ws.mergeCells("A14:F14");
      ws.getCell("A14").value = "Amount in Words: {{amount_in_words}}";
      ws.getCell("A14").font = normalText;
      ws.getCell("A14").border = thinBorder;
      ws.mergeCells("A16:C16");
      ws.getCell("A16").value = "Conforme: {{supplier_representative}}";
      ws.getCell("A16").font = boldText;
      ws.mergeCells("D16:F16");
      ws.getCell("D16").value = "Very truly yours: {{authorized_official}} ({{authorized_official_title}})";
      ws.getCell("D16").font = boldText;
      break;
    }
    case "acknowledgement_receipt": {
      ws.columns = [
        { width: 8 },
        // Item No
        { width: 8 },
        // Qty
        { width: 8 },
        // Unit
        { width: 34 },
        // Specs
        { width: 18 },
        // Property No
        { width: 12 },
        // Date Acquired
        { width: 14 },
        // Unit Cost
        { width: 16 }
        // Total Cost
      ];
      ws.mergeCells("A1:H1");
      ws.getCell("A1").value = "Republic of the Philippines";
      ws.getCell("A1").font = { name: "Arial", size: 9, italic: true };
      ws.getCell("A1").alignment = { horizontal: "center" };
      ws.mergeCells("A2:H2");
      ws.getCell("A2").value = "BATANES STATE COLLEGE";
      ws.getCell("A2").font = { name: "Arial", size: 12, bold: true, color: { argb: "FF7B1E1E" } };
      ws.getCell("A2").alignment = { horizontal: "center" };
      ws.mergeCells("A3:H3");
      ws.getCell("A3").value = "ACKNOWLEDGEMENT RECEIPT FOR PROPERTY (PAR / ICS)";
      ws.getCell("A3").font = { name: "Arial", size: 11, bold: true };
      ws.getCell("A3").alignment = { horizontal: "center" };
      ws.getCell("A5").value = "Entity Name:";
      ws.getCell("A5").font = boldText;
      ws.getCell("B5").value = "Batanes State College";
      ws.getCell("B5").font = normalText;
      ws.getCell("F5").value = "Fund Cluster:";
      ws.getCell("F5").font = boldText;
      ws.mergeCells("G5:H5");
      ws.getCell("G5").value = "{{fund_cluster}}";
      ws.getCell("G5").font = normalText;
      ws.getCell("A6").value = "Receiving Office:";
      ws.getCell("A6").font = boldText;
      ws.mergeCells("B6:D6");
      ws.getCell("B6").value = "{{receiving_office}}";
      ws.getCell("B6").font = normalText;
      ws.getCell("F6").value = "Receipt No.:";
      ws.getCell("F6").font = boldText;
      ws.mergeCells("G6:H6");
      ws.getCell("G6").value = "{{receipt_no}}";
      ws.getCell("G6").font = normalText;
      const arHeaders = ["Item No.", "Qty", "Unit", "Item Description", "Property No.", "Date Acquired", "Unit Cost", "Total Amount"];
      const headerRow = ws.getRow(8);
      arHeaders.forEach((title, idx) => {
        const cell = headerRow.getCell(idx + 1);
        cell.value = title;
        cell.font = maroonText;
        cell.fill = headerFill;
        cell.border = thinBorder;
        cell.alignment = { horizontal: "center", vertical: "middle" };
      });
      const itemRow = ws.getRow(9);
      itemRow.getCell(1).value = "{{item_no}}";
      itemRow.getCell(1).alignment = { horizontal: "center" };
      itemRow.getCell(2).value = "{{qty}}";
      itemRow.getCell(2).alignment = { horizontal: "center" };
      itemRow.getCell(3).value = "{{unit}}";
      itemRow.getCell(3).alignment = { horizontal: "center" };
      itemRow.getCell(4).value = "{{item_desc}}";
      itemRow.getCell(4).alignment = { horizontal: "left" };
      itemRow.getCell(5).value = "{{property_no}}";
      itemRow.getCell(5).alignment = { horizontal: "center" };
      itemRow.getCell(6).value = "{{date_acquired}}";
      itemRow.getCell(6).alignment = { horizontal: "center" };
      itemRow.getCell(7).value = "{{unit_cost}}";
      itemRow.getCell(7).alignment = { horizontal: "right" };
      itemRow.getCell(8).value = "{{total_cost}}";
      itemRow.getCell(8).alignment = { horizontal: "right" };
      for (let c = 1; c <= 8; c++) {
        itemRow.getCell(c).border = thinBorder;
        itemRow.getCell(c).font = normalText;
      }
      ws.mergeCells("A10:G10");
      ws.getCell("A10").value = "TOTAL PROPERTY VALUE:";
      ws.getCell("A10").font = boldText;
      ws.getCell("A10").alignment = { horizontal: "right" };
      ws.getCell("A10").border = thinBorder;
      ws.getCell("H10").value = "{{total_amount}}";
      ws.getCell("H10").font = { ...boldText, color: { argb: "FF7B1E1E" } };
      ws.getCell("H10").alignment = { horizontal: "right" };
      ws.getCell("H10").border = thinBorder;
      ws.mergeCells("A12:D12");
      ws.getCell("A12").value = "Received by: {{received_by_name}} ({{received_by_designation}})";
      ws.getCell("A12").font = boldText;
      ws.mergeCells("E12:H12");
      ws.getCell("E12").value = "Issued by: {{issued_by_name}} ({{issued_by_designation}})";
      ws.getCell("E12").font = boldText;
      break;
    }
  }
  return wb;
}
async function parseExcelTemplate(buffer) {
  const mod = ExcelJS.default || ExcelJS;
  const Workbook = mod.Workbook;
  const wb = new Workbook();
  await wb.xlsx.load(buffer);
  const ws = wb.worksheets[0];
  if (!ws) throw new Error("The uploaded Excel workbook contains no worksheets.");
  const placeholders = /* @__PURE__ */ new Set();
  let repeatingItemRowIndex = null;
  ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    let hasItemToken = false;
    row.eachCell({ includeEmpty: false }, (cell) => {
      const text2 = cell.text ?? String(cell.value ?? "");
      const matches = text2.match(/\{\{([a-zA-Z0-9_]+)\}\}/g);
      if (matches) {
        matches.forEach((m) => {
          placeholders.add(m);
          if (m === "{{item_no}}" || m === "{{item_desc}}" || m === "{{unit_cost}}") {
            hasItemToken = true;
          }
        });
      }
    });
    if (hasItemToken && repeatingItemRowIndex === null) {
      repeatingItemRowIndex = rowNumber;
    }
  });
  return {
    sheetName: ws.name,
    rowCount: ws.rowCount,
    columnCount: ws.columnCount,
    placeholdersDetected: Array.from(placeholders),
    repeatingItemRowIndex,
    base64: buffer.toString("base64")
  };
}
async function injectDataIntoExcelTemplate(templateBuffer, templateKey, data) {
  const mod = ExcelJS.default || ExcelJS;
  const Workbook = mod.Workbook;
  const wb = new Workbook();
  await wb.xlsx.load(templateBuffer);
  const ws = wb.worksheets[0];
  if (!ws) throw new Error("No worksheet found in template");
  let injectedTokensCount = 0;
  const items = Array.isArray(data.items) && data.items.length > 0 ? data.items : getSampleFormData(templateKey).items || [];
  let templateItemRowNumber = null;
  ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (templateItemRowNumber !== null) return;
    row.eachCell((cell) => {
      const text2 = cell.text ?? String(cell.value ?? "");
      if (text2.includes("{{item_no}}") || text2.includes("{{item_desc}}")) {
        templateItemRowNumber = rowNumber;
      }
    });
  });
  if (templateItemRowNumber !== null && items.length > 0) {
    const templateRow = ws.getRow(templateItemRowNumber);
    const templateCellFormats = [];
    const colCount = Math.max(ws.columnCount, 8);
    for (let c = 1; c <= colCount; c++) {
      const cell = templateRow.getCell(c);
      templateCellFormats.push({
        font: cell.font ? { ...cell.font } : void 0,
        alignment: cell.alignment ? { ...cell.alignment } : void 0,
        border: cell.border ? { ...cell.border } : void 0,
        fill: cell.fill ? { ...cell.fill } : void 0,
        numFmt: cell.numFmt,
        templateText: cell.text ?? String(cell.value ?? "")
      });
    }
    if (items.length > 1) {
      ws.spliceRows(templateItemRowNumber + 1, 0, ...new Array(items.length - 1).fill([]));
    }
    items.forEach((item, itemIdx) => {
      const currentRow = ws.getRow(templateItemRowNumber + itemIdx);
      templateCellFormats.forEach((fmt, colIdx) => {
        const cell = currentRow.getCell(colIdx + 1);
        let cellVal = fmt.templateText;
        Object.entries(item).forEach(([k, v]) => {
          const placeholder = `{{${k}}}`;
          if (cellVal.includes(placeholder)) {
            cellVal = cellVal.replace(placeholder, v === null || v === void 0 ? "" : String(v));
            injectedTokensCount++;
          }
        });
        cell.value = cellVal;
        if (fmt.font) cell.font = fmt.font;
        if (fmt.alignment) cell.alignment = fmt.alignment;
        if (fmt.border) cell.border = fmt.border;
        if (fmt.fill) cell.fill = fmt.fill;
        if (fmt.numFmt) cell.numFmt = fmt.numFmt;
      });
    });
  }
  ws.eachRow({ includeEmpty: false }, (row) => {
    row.eachCell({ includeEmpty: false }, (cell) => {
      const text2 = cell.text ?? String(cell.value ?? "");
      if (typeof text2 === "string" && text2.includes("{{")) {
        let updated = text2;
        Object.entries(data).forEach(([key, val]) => {
          if (key === "items") return;
          const token = `{{${key}}}`;
          if (updated.includes(token)) {
            updated = updated.replace(token, val === null || val === void 0 ? "\u2014" : String(val));
            injectedTokensCount++;
          }
        });
        updated = updated.replace(/\{\{[a-zA-Z0-9_]+\}\}/g, "\u2014");
        cell.value = updated;
      }
    });
  });
  const xlsxBuffer = Buffer.from(await wb.xlsx.writeBuffer());
  const htmlTable = convertWorksheetToHtml(ws);
  return {
    xlsxBuffer,
    xlsxBase64: xlsxBuffer.toString("base64"),
    htmlTable,
    sheetName: ws.name,
    meta: {
      injectedTokensCount,
      itemsCount: items.length,
      templateKey
    }
  };
}
function convertWorksheetToHtml(ws) {
  const mergedMap = /* @__PURE__ */ new Map();
  const skipCells = /* @__PURE__ */ new Set();
  if (ws._merges) {
    const merges = ws._merges;
    Object.keys(merges).forEach((key) => {
      const range = merges[key];
      const model = range.model;
      if (model) {
        const { top, bottom, left, right } = model;
        const rowspan = bottom - top + 1;
        const colspan = right - left + 1;
        const masterKey = `${top}:${left}`;
        mergedMap.set(masterKey, { rowspan, colspan });
        for (let r = top; r <= bottom; r++) {
          for (let c = left; c <= right; c++) {
            if (!(r === top && c === left)) {
              skipCells.add(`${r}:${c}`);
            }
          }
        }
      }
    });
  }
  const rowsHtml = [];
  const maxCols = Math.max(ws.columnCount, 6);
  ws.eachRow({ includeEmpty: true }, (row, rowNumber) => {
    const cellsHtml = [];
    let hasContentInRow = false;
    for (let colNumber = 1; colNumber <= maxCols; colNumber++) {
      const cellKey = `${rowNumber}:${colNumber}`;
      if (skipCells.has(cellKey)) {
        continue;
      }
      const cell = row.getCell(colNumber);
      const val = cell.text ?? String(cell.value ?? "");
      if (val.trim()) hasContentInRow = true;
      const mergeInfo = mergedMap.get(cellKey);
      const spanAttrs = mergeInfo ? `${mergeInfo.rowspan > 1 ? ` rowspan="${mergeInfo.rowspan}"` : ""}${mergeInfo.colspan > 1 ? ` colspan="${mergeInfo.colspan}"` : ""}` : "";
      const styles = [];
      if (cell.border) {
        if (cell.border.top) styles.push("border-top: 1px solid #202833");
        if (cell.border.bottom) styles.push("border-bottom: 1px solid #202833");
        if (cell.border.left) styles.push("border-left: 1px solid #202833");
        if (cell.border.right) styles.push("border-right: 1px solid #202833");
      }
      if (cell.font) {
        if (cell.font.bold) styles.push("font-weight: 700");
        if (cell.font.italic) styles.push("font-style: italic");
        if (cell.font.size) {
          const pt = Math.max(cell.font.size, 8);
          styles.push(`font-size: ${pt}pt`);
        }
        if (cell.font.color && cell.font.color.argb) {
          const argb = cell.font.color.argb;
          const hex = `#${argb.slice(2)}`;
          styles.push(`color: ${hex}`);
        }
      }
      if (cell.alignment) {
        if (cell.alignment.horizontal) styles.push(`text-align: ${cell.alignment.horizontal}`);
        if (cell.alignment.vertical) styles.push(`vertical-align: ${cell.alignment.vertical}`);
      }
      if (cell.fill && cell.fill.type === "pattern" && cell.fill.fgColor?.argb) {
        const argb = cell.fill.fgColor.argb;
        styles.push(`background-color: #${argb.slice(2)}`);
      }
      styles.push("padding: 4px 6px");
      const styleStr = styles.length ? ` style="${styles.join("; ")}"` : "";
      cellsHtml.push(`<td${spanAttrs}${styleStr}>${escapeHtml(val)}</td>`);
    }
    if (hasContentInRow || rowNumber <= 20) {
      rowsHtml.push(`<tr>${cellsHtml.join("")}</tr>`);
    }
  });
  return `
    <table class="excel-rendered-table w-full border-collapse text-xs" style="table-layout: auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.35; color: #202833;">
      <tbody>
        ${rowsHtml.join("\n")}
      </tbody>
    </table>
  `;
}
function escapeHtml(str) {
  if (!str) return "&nbsp;";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;").replace(/\n/g, "<br/>");
}

// server/routers.ts
function assertRole(role, permittedRoles) {
  if (!roleCanAct(role, permittedRoles)) throw new TRPCError3({ code: "FORBIDDEN", message: "This procurement action is not permitted for your assigned role." });
}
var appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(() => ({ success: true })),
    updateMyOffice: protectedProcedure.input(z2.object({ officeName: z2.string().max(180) })).mutation(({ ctx, input }) => updateMyOffice(input.officeName, ctx.user))
  }),
  procurement: router({
    dashboard: protectedProcedure.query(({ ctx }) => getProcurementDashboard(ctx.user)),
    analytics: router({
      endUserPerformance: protectedProcedure.input(
        z2.object({
          source: z2.enum(["all", "live", "historical"]).optional(),
          fiscalYear: z2.number().int().optional()
        }).optional()
      ).query(({ ctx, input }) => {
        assertRole(normalizeProcurementRole(ctx.user.role), ["procurement_officer", "admin"]);
        return getEndUserPerformanceAnalytics(input);
      })
    }),
    realtime: router({
      config: protectedProcedure.query(() => getSupabaseRealtimePublicConfig())
    }),
    setup: router({
      details: protectedProcedure.query(() => getWorkspaceSetup()),
      budgetUtilization: protectedProcedure.query(({ ctx }) => {
        assertRole(normalizeProcurementRole(ctx.user.role), ["administrative_approver", "admin"]);
        return getBudgetUtilization();
      }),
      createOffice: protectedProcedure.input(z2.object({ code: z2.string().min(2).max(32), name: z2.string().min(3).max(160) })).mutation(({ ctx, input }) => {
        assertRole(normalizeProcurementRole(ctx.user.role), ["admin"]);
        return createOffice(input, ctx.user);
      }),
      createObjectOfExpenditure: protectedProcedure.input(z2.object({ code: z2.string().min(2).max(32), name: z2.string().min(3).max(180) })).mutation(({ ctx, input }) => {
        assertRole(normalizeProcurementRole(ctx.user.role), ["admin"]);
        return createObjectOfExpenditure(input, ctx.user);
      }),
      createBudgetAllotment: protectedProcedure.input(z2.object({ officeId: z2.number().int().positive(), objectOfExpenditureId: z2.number().int().positive(), fiscalYear: z2.number().int().min(2020).max(2100), allottedAmount: z2.number().positive() })).mutation(({ ctx, input }) => {
        assertRole(normalizeProcurementRole(ctx.user.role), ["administrative_approver", "admin"]);
        return createBudgetAllotment(input, ctx.user);
      }),
      createSupplier: protectedProcedure.input(z2.object({ supplierCode: z2.string().min(2).max(40), companyName: z2.string().min(3).max(180), tin: z2.string().max(80).optional(), contactPerson: z2.string().max(140).optional(), email: z2.string().email().optional().or(z2.literal("")), phone: z2.string().max(80).optional(), address: z2.string().optional(), offerings: z2.string().optional(), philgepsRegistrationNumber: z2.string().max(120).optional(), philgepsRegistrationDate: z2.coerce.date().optional(), philgepsExpirationDate: z2.coerce.date().optional(), accreditationStatus: z2.enum(["pending", "accredited", "suspended"]) })).mutation(({ ctx, input }) => {
        assertRole(normalizeProcurementRole(ctx.user.role), ["procurement_officer", "admin"]);
        return createSupplier(input, ctx.user);
      }),
      createAppPpmpEntry: protectedProcedure.input(z2.object({ fiscalYear: z2.number().int().min(2020).max(2100), officeId: z2.number().int().positive(), objectOfExpenditureId: z2.number().int().positive(), catalogItemId: z2.number().int().positive().optional(), description: z2.string().min(3), plannedAmount: z2.number().positive(), papCode: z2.string().max(80).optional(), projectTitle: z2.string().max(220).optional(), modeOfProcurement: z2.string().max(120).optional(), fundSource: z2.string().max(160).optional(), procurementSchedule: z2.string().max(1e3).optional(), remarks: z2.string().max(1e3).optional() })).mutation(({ ctx, input }) => {
        assertRole(normalizeProcurementRole(ctx.user.role), ["end_user", "admin"]);
        return createAppPpmpEntry(input, ctx.user);
      }),
      createPurchaseRequestSignatory: protectedProcedure.input(z2.object({ fullName: z2.string().min(3).max(180), designation: z2.string().min(2).max(160), mayRequest: z2.boolean(), mayApprove: z2.boolean() }).refine((input) => input.mayRequest || input.mayApprove, { message: "Authorize the signatory to request or approve Purchase Requests." })).mutation(({ ctx, input }) => {
        assertRole(normalizeProcurementRole(ctx.user.role), ["admin"]);
        return createPurchaseRequestSignatory(input, ctx.user);
      }),
      updateSettings: protectedProcedure.input(z2.object({ entityName: z2.string().min(3).max(180), authorizedOfficialName: z2.string().max(180).optional(), authorizedOfficialDesignation: z2.string().max(160).optional(), chiefAccountantName: z2.string().max(180).optional(), defaultNoticeSignatory: z2.string().max(180).optional(), sessionTimeoutMinutes: z2.number().int().min(5).max(240).optional(), enableInAppNotifications: z2.boolean().optional(), notificationRefreshSeconds: z2.number().int().min(10).max(120).optional(), appearanceTheme: z2.enum(["light", "dark", "high_contrast"]).optional(), appearanceFont: z2.enum(["public_sans", "system", "serif", "mono", "humanist"]).optional(), appearanceFontScale: z2.enum(["90", "100", "110", "120"]).optional(), appearanceDensity: z2.enum(["compact", "comfortable", "spacious"]).optional(), appearanceAccent: z2.enum(["maroon", "teal", "blue", "forest"]).optional(), appearanceCorners: z2.enum(["sharp", "soft", "round"]).optional(), appearanceReducedMotion: z2.boolean().optional() })).mutation(({ ctx, input }) => {
        assertRole(normalizeProcurementRole(ctx.user.role), ["admin"]);
        return updateProcurementSettings(input, ctx.user);
      }),
      offices: publicProcedure.query(async () => {
        try {
          const setup = await getWorkspaceSetup();
          return setup.offices;
        } catch {
          return INSTITUTIONAL_OFFICES.map((o, idx) => ({ id: idx + 1, code: o.code, name: o.name, isActive: 1 }));
        }
      }),
      users: protectedProcedure.query(({ ctx }) => {
        assertRole(normalizeProcurementRole(ctx.user.role), ["admin", "procurement_officer"]);
        return listUserProfiles();
      }),
      updateUserRole: protectedProcedure.input(z2.object({ userId: z2.number().int().positive(), role: z2.enum(["end_user", "procurement_officer", "procurement_officer_i", "procurement_officer_ii", "procurement_staff", "administrative_approver", "bac_secretariat", "bac", "hope", "budget_officer", "supplier_contractor", "admin"]) })).mutation(({ ctx, input }) => {
        assertRole(normalizeProcurementRole(ctx.user.role), ["admin"]);
        return updateUserProcurementRole(input.userId, input.role, ctx.user);
      }),
      updateUserOffice: protectedProcedure.input(z2.object({ userId: z2.number().int().positive(), officeName: z2.string().max(180) })).mutation(({ ctx, input }) => {
        assertRole(normalizeProcurementRole(ctx.user.role), ["admin"]);
        return updateUserOffice(input.userId, input.officeName, ctx.user);
      })
    }),
    bestValuePolicy: router({
      active: protectedProcedure.query(({ ctx }) => {
        assertRole(normalizeProcurementRole(ctx.user.role), ["admin"]);
        return getBestValuePolicy();
      }),
      history: protectedProcedure.query(({ ctx }) => {
        assertRole(normalizeProcurementRole(ctx.user.role), ["admin"]);
        return getBestValuePolicyHistory();
      }),
      save: protectedProcedure.input(z2.object({
        name: z2.string().min(3).max(180),
        criteria: z2.array(z2.object({ criterionKey: z2.enum(BEST_VALUE_CRITERION_KEYS), weight: z2.number().min(0).max(100) })).length(BEST_VALUE_CRITERION_KEYS.length)
      })).mutation(({ ctx, input }) => {
        assertRole(normalizeProcurementRole(ctx.user.role), ["admin"]);
        return saveBestValuePolicy(input, ctx.user);
      })
    }),
    supplierTags: router({
      list: protectedProcedure.query(() => getSupplierTagData()),
      create: protectedProcedure.input(z2.object({ name: z2.string().min(2).max(120), description: z2.string().max(320).optional() })).mutation(({ ctx, input }) => {
        assertRole(normalizeProcurementRole(ctx.user.role), ["procurement_officer", "admin"]);
        return createSupplierTag(input, ctx.user);
      }),
      setForSupplier: protectedProcedure.input(z2.object({ supplierId: z2.number().int().positive(), tagIds: z2.array(z2.number().int().positive()).max(30) })).mutation(({ ctx, input }) => {
        assertRole(normalizeProcurementRole(ctx.user.role), ["procurement_officer", "admin"]);
        return setSupplierTags(input, ctx.user);
      })
    }),
    catalog: router({
      list: protectedProcedure.input(z2.object({ search: z2.string().max(120).optional(), codeFamily: z2.string().regex(/^\d{2}$/).optional(), page: z2.number().int().positive().optional(), limit: z2.number().int().positive().max(100).optional() }).optional()).query(({ input }) => listProcurementCatalogItems(input)),
      get: protectedProcedure.input(z2.object({ catalogItemId: z2.number().int().positive() })).query(({ input }) => getProcurementCatalogItem(input.catalogItemId)),
      codeFamilies: protectedProcedure.query(() => listProcurementCatalogCodeFamilies()),
      favorites: protectedProcedure.query(({ ctx }) => listProcurementCatalogFavorites(ctx.user)),
      saved: protectedProcedure.query(({ ctx }) => listProcurementCatalogSavedItems(ctx.user)),
      save: protectedProcedure.input(z2.object({ items: z2.array(z2.object({ catalogItemId: z2.number().int().positive(), quantity: z2.number().positive().max(1e6) })).max(500) })).mutation(({ ctx, input }) => replaceProcurementCatalogSavedItems(input, ctx.user)),
      clearSaved: protectedProcedure.mutation(({ ctx }) => clearProcurementCatalogSavedItems(ctx.user)),
      setFavorite: protectedProcedure.input(z2.object({ catalogItemId: z2.number().int().positive(), isFavorite: z2.boolean() })).mutation(({ ctx, input }) => setProcurementCatalogFavorite(input, ctx.user))
    }),
    testRecords: router({
      list: protectedProcedure.query(({ ctx }) => {
        assertRole(normalizeProcurementRole(ctx.user.role), ["admin"]);
        return listAdminTestRecordPackages();
      }),
      archive: protectedProcedure.input(z2.object({ ppmpEntryId: z2.number().int().positive(), reason: z2.string().min(12).max(1e3) })).mutation(({ ctx, input }) => {
        assertRole(normalizeProcurementRole(ctx.user.role), ["admin"]);
        return archiveTestRecordPackage(input, ctx.user);
      }),
      cleanup: protectedProcedure.input(z2.object({ ppmpEntryId: z2.number().int().positive() })).mutation(({ ctx, input }) => {
        assertRole(normalizeProcurementRole(ctx.user.role), ["admin"]);
        return cleanupArchivedTestRecordPackage(input.ppmpEntryId, ctx.user);
      })
    }),
    purchaseRequests: router({
      list: protectedProcedure.query(({ ctx }) => listPurchaseRequests(ctx.user)),
      detail: protectedProcedure.input(z2.object({ purchaseRequestId: z2.number().int().positive() })).query(({ ctx, input }) => getPurchaseRequestDetail(input.purchaseRequestId, ctx.user)),
      signatories: protectedProcedure.query(() => listPurchaseRequestSignatories()),
      create: protectedProcedure.input(z2.object({ purpose: z2.string().min(10), fundSource: z2.string().max(160).optional(), fundCluster: z2.string().max(80).optional(), responsibilityCenterCode: z2.string().max(80).optional(), requesterDesignation: z2.string().max(160).optional(), requestedSignatoryId: z2.number().int().positive().optional(), approvedSignatoryId: z2.number().int().positive().optional(), ppmpEntryId: z2.number().int().positive().optional(), officeId: z2.number().int().positive(), objectOfExpenditureId: z2.number().int().positive(), items: z2.array(z2.object({ catalogItemId: z2.number().int().positive().optional(), stockPropertyNo: z2.string().max(80).optional(), description: z2.string().min(2), specification: z2.string().optional(), quantity: z2.number().positive(), unit: z2.string().min(1), estimatedUnitCost: z2.number().positive() })).min(1) })).mutation(({ ctx, input }) => {
        assertRole(normalizeProcurementRole(ctx.user.role), ["end_user"]);
        return createPurchaseRequest(input, ctx.user);
      }),
      advance: protectedProcedure.input(z2.object({ purchaseRequestId: z2.number().int().positive() })).mutation(async ({ ctx, input }) => {
        const role = normalizeProcurementRole(ctx.user.role);
        const records = await listPurchaseRequests(role === "end_user" ? ctx.user : { ...ctx.user, role: "admin" });
        const pr = records.find((record) => record.id === input.purchaseRequestId);
        if (!pr) throw new TRPCError3({ code: "NOT_FOUND", message: "Purchase Request not found." });
        if (role === "end_user" && pr.requestedById !== ctx.user.id) throw new TRPCError3({ code: "FORBIDDEN", message: "End-Users may act only on their own Purchase Requests." });
        const nextStatus = getNextPrStatus(pr.status, role);
        if (!nextStatus) throw new TRPCError3({ code: "CONFLICT", message: "The Purchase Request cannot advance at your role or its current workflow stage." });
        return advancePurchaseRequest({ purchaseRequestId: pr.id, nextStatus }, ctx.user);
      }),
      reject: protectedProcedure.input(z2.object({
        purchaseRequestId: z2.number().int().positive(),
        reason: z2.string().min(10, "Reason must be at least 10 characters.").max(1e3),
        remarks: z2.string().max(1e3).optional()
      })).mutation(async ({ ctx, input }) => {
        const role = normalizeProcurementRole(ctx.user.role);
        assertRole(role, ["procurement_officer", "administrative_approver", "admin"]);
        const result = await rejectPurchaseRequest(input, ctx.user);
        void publishProcurementRealtimeUpdate("purchase_request");
        return result;
      }),
      returnForCorrection: protectedProcedure.input(z2.object({
        purchaseRequestId: z2.number().int().positive(),
        reason: z2.string().min(10, "Reason must be at least 10 characters.").max(1e3),
        remarks: z2.string().max(1e3).optional()
      })).mutation(async ({ ctx, input }) => {
        const role = normalizeProcurementRole(ctx.user.role);
        assertRole(role, ["procurement_officer", "administrative_approver", "admin"]);
        const result = await returnPurchaseRequestForCorrection(input, ctx.user);
        void publishProcurementRealtimeUpdate("purchase_request");
        return result;
      }),
      resubmit: protectedProcedure.input(z2.object({
        purchaseRequestId: z2.number().int().positive(),
        remarks: z2.string().max(1e3).optional()
      })).mutation(async ({ ctx, input }) => {
        const result = await resubmitPurchaseRequest(input, ctx.user);
        void publishProcurementRealtimeUpdate("purchase_request");
        return result;
      }),
      assignOfficer: protectedProcedure.input(z2.object({
        purchaseRequestId: z2.number().int().positive(),
        officerId: z2.number().int().positive()
      })).mutation(async ({ ctx, input }) => {
        const role = normalizeProcurementRole(ctx.user.role);
        assertRole(role, ["procurement_officer", "admin"]);
        const result = await assignPurchaseRequestOfficer(input, ctx.user);
        void publishProcurementRealtimeUpdate("purchase_request");
        return result;
      }),
      history: protectedProcedure.input(z2.object({
        purchaseRequestId: z2.number().int().positive()
      })).query(({ ctx, input }) => getPurchaseRequestHistory(input.purchaseRequestId, ctx.user)),
      pmrStatus: protectedProcedure.input(z2.object({
        purchaseRequestId: z2.number().int().positive()
      })).query(({ input }) => getPmrStatus(input.purchaseRequestId))
    }),
    preCanvasses: router({
      create: protectedProcedure.input(z2.object({ purchaseRequestId: z2.number().int().positive(), approvedBudget: z2.number().positive().optional(), quotationDeadline: z2.coerce.date().optional(), deliveryPeriodDays: z2.number().int().positive().max(365).optional(), priceEvaluationMode: z2.enum(["lot_basis", "per_item"]).optional() })).mutation(async ({ ctx, input }) => {
        assertRole(normalizeProcurementRole(ctx.user.role), ["end_user"]);
        const result = await createPreCanvass(input, ctx.user);
        void publishProcurementRealtimeUpdate("pre_canvass");
        return result;
      }),
      addQuote: protectedProcedure.input(z2.object({ preCanvassId: z2.number().int().positive(), supplierId: z2.number().int().positive(), totalPrice: z2.number().positive(), deliveryDays: z2.number().int().nonnegative(), isCompliant: z2.boolean(), quotationReference: z2.string().max(80).optional(), supplierRepresentative: z2.string().max(160).optional(), acknowledgedAt: z2.coerce.date().optional(), receivedBy: z2.string().max(160).optional(), notes: z2.string().optional() })).mutation(async ({ ctx, input }) => {
        assertRole(normalizeProcurementRole(ctx.user.role), ["end_user"]);
        const result = await addPreCanvassQuote(input, ctx.user);
        void publishProcurementRealtimeUpdate("pre_canvass");
        return result;
      }),
      submit: protectedProcedure.input(z2.object({ preCanvassId: z2.number().int().positive() })).mutation(async ({ ctx, input }) => {
        assertRole(normalizeProcurementRole(ctx.user.role), ["end_user"]);
        const result = await submitPreCanvass(input.preCanvassId, ctx.user);
        await recordPreCanvassResubmission(input.preCanvassId, ctx.user);
        void publishProcurementRealtimeUpdate("pre_canvass");
        return result;
      }),
      requestCorrection: protectedProcedure.input(z2.object({ preCanvassId: z2.number().int().positive(), reason: z2.string().min(10).max(1e3) })).mutation(async ({ ctx, input }) => {
        assertRole(normalizeProcurementRole(ctx.user.role), ["procurement_officer"]);
        const result = await requestPreCanvassCorrection(input, ctx.user);
        void publishProcurementRealtimeUpdate("pre_canvass");
        return result;
      }),
      reject: protectedProcedure.input(z2.object({ preCanvassId: z2.number().int().positive(), reason: z2.string().min(10).max(2e3), remarks: z2.string().max(2e3).optional() })).mutation(async ({ ctx, input }) => {
        assertRole(normalizeProcurementRole(ctx.user.role), ["procurement_officer", "administrative_approver", "admin"]);
        const result = await rejectPreCanvass(input, ctx.user);
        void publishProcurementRealtimeUpdate("pre_canvass");
        return result;
      }),
      returnAbstract: protectedProcedure.input(z2.object({ preCanvassId: z2.number().int().positive(), reason: z2.string().min(10).max(1e3) })).mutation(async ({ ctx, input }) => {
        assertRole(normalizeProcurementRole(ctx.user.role), ["administrative_approver"]);
        const result = await requestAbstractCorrection(input, ctx.user);
        void publishProcurementRealtimeUpdate("abstract_of_canvass");
        return result;
      }),
      resubmitAbstract: protectedProcedure.input(z2.object({ preCanvassId: z2.number().int().positive() })).mutation(async ({ ctx, input }) => {
        assertRole(normalizeProcurementRole(ctx.user.role), ["procurement_officer"]);
        const result = await resubmitAbstract(input.preCanvassId, ctx.user);
        void publishProcurementRealtimeUpdate("abstract_of_canvass");
        return result;
      }),
      createAbstract: protectedProcedure.input(z2.object({ preCanvassId: z2.number().int().positive() })).mutation(async ({ ctx, input }) => {
        assertRole(normalizeProcurementRole(ctx.user.role), ["procurement_officer"]);
        const result = await createAbstractOfCanvass(input.preCanvassId, ctx.user);
        await notifyRoles(["administrative_approver"], { kind: "action_required", title: "Official Abstract awaiting BAC/HoPE decision", body: "Procurement Staff/BAC final canvass validation is complete and the official Abstract of Quotations is ready for BAC/HoPE review.", entityType: "pre_canvass", entityId: input.preCanvassId });
        void publishProcurementRealtimeUpdate("pre_canvass");
        void publishProcurementRealtimeUpdate("abstract_of_canvass");
        await notifyRoles(["administrative_approver"], { kind: "action_required", title: "Official Abstract awaiting BAC/HoPE decision", body: "Procurement Staff/BAC final canvass validation is complete and the official Abstract of Quotations is ready for BAC/HoPE review.", entityType: "pre_canvass", entityId: input.preCanvassId });
        void publishProcurementRealtimeUpdate("pre_canvass");
        void publishProcurementRealtimeUpdate("abstract_of_canvass");
        return result;
      }),
      decideAbstract: protectedProcedure.input(z2.object({ preCanvassId: z2.number().int().positive(), decision: z2.enum(["approved", "rejected"]), remarks: z2.string().max(1e3).optional() })).mutation(async ({ ctx, input }) => {
        assertRole(normalizeProcurementRole(ctx.user.role), ["administrative_approver"]);
        const result = await decideAbstractOfCanvass(input, ctx.user);
        await notifyRoles(["procurement_officer"], { kind: "status_change", title: `Official Abstract ${input.decision}`, body: input.remarks || "BAC/HoPE recorded a decision on the official Abstract of Quotations.", entityType: "pre_canvass", entityId: input.preCanvassId });
        void publishProcurementRealtimeUpdate("pre_canvass");
        void publishProcurementRealtimeUpdate("abstract_of_canvass");
        return result;
      }),
      issuePurchaseOrder: protectedProcedure.input(z2.object({ preCanvassId: z2.number().int().positive() })).mutation(async ({ ctx, input }) => {
        assertRole(normalizeProcurementRole(ctx.user.role), ["procurement_officer"]);
        const result = await createPurchaseOrderFromPreCanvass(input.preCanvassId, ctx.user);
        await notifyRoles(["administrative_approver"], { kind: "status_change", title: "Purchase Order issued", body: "A Purchase Order was issued from an approved Abstract of Canvass.", entityType: "purchase_order", entityId: result.id });
        return result;
      }),
      returnPurchaseOrder: protectedProcedure.input(z2.object({ purchaseOrderId: z2.number().int().positive(), reason: z2.string().min(10).max(1e3) })).mutation(({ ctx, input }) => {
        assertRole(normalizeProcurementRole(ctx.user.role), ["administrative_approver"]);
        return requestPurchaseOrderCorrection(input, ctx.user);
      }),
      reissuePurchaseOrder: protectedProcedure.input(z2.object({ purchaseOrderId: z2.number().int().positive() })).mutation(({ ctx, input }) => {
        assertRole(normalizeProcurementRole(ctx.user.role), ["procurement_officer"]);
        return resubmitPurchaseOrder(input.purchaseOrderId, ctx.user);
      }),
      calculateMcdm: protectedProcedure.input(z2.object({ preCanvassId: z2.number().int().positive() })).mutation(({ ctx, input }) => {
        assertRole(normalizeProcurementRole(ctx.user.role), ["procurement_officer"]);
        return createMcdmRecommendation(input.preCanvassId, ctx.user);
      }),
      createRfqFromMcdm: protectedProcedure.input(z2.object({ preCanvassId: z2.number().int().positive() })).mutation(({ ctx, input }) => {
        assertRole(normalizeProcurementRole(ctx.user.role), ["procurement_officer"]);
        return createRfqFromPreCanvass(input.preCanvassId, ctx.user);
      }),
      recordDelivery: protectedProcedure.input(z2.object({ purchaseOrderId: z2.number().int().positive(), receiptNumber: z2.string().min(3).max(40), receivedByName: z2.string().max(180).optional(), deliveryStatus: z2.enum(["complete", "partial"]).optional(), signatureReference: z2.string().max(1e3).optional(), remarks: z2.string().max(1e3).optional() })).mutation(({ ctx, input }) => {
        assertRole(normalizeProcurementRole(ctx.user.role), ["procurement_officer"]);
        return recordDelivery(input, ctx.user);
      }),
      logPmr: protectedProcedure.input(z2.object({ purchaseOrderId: z2.number().int().positive(), pmrNumber: z2.string().min(3).max(40), remarks: z2.string().max(1e3).optional() })).mutation(({ ctx, input }) => {
        assertRole(normalizeProcurementRole(ctx.user.role), ["procurement_officer"]);
        return logPmr(input, ctx.user);
      })
    }),
    documents: router({
      attach: protectedProcedure.input(z2.object({ entityType: z2.enum(["app_ppmp_entry", "purchase_request", "pre_canvass", "pre_canvass_quote", "abstract_of_canvass", "purchase_order", "delivery_receipt", "pmr_log"]), entityId: z2.number().int().positive(), documentType: z2.string().min(2).max(80), originalFileName: z2.string().min(1).max(255), mimeType: z2.string().min(3).max(120), dataBase64: z2.string().min(4).max(14e6) })).mutation(({ ctx, input }) => createProcurementDocument(input, ctx.user))
    }),
    notifications: router({
      list: protectedProcedure.query(({ ctx }) => listWorkflowNotifications(ctx.user)),
      markRead: protectedProcedure.input(z2.object({ notificationId: z2.number().int().positive() })).mutation(({ ctx, input }) => markWorkflowNotificationRead(input.notificationId, ctx.user))
    }),
    rfqs: router({
      createFromPurchaseRequest: protectedProcedure.input(z2.object({ purchaseRequestId: z2.number().int().positive() })).mutation(({ ctx, input }) => {
        assertRole(normalizeProcurementRole(ctx.user.role), ["procurement_officer"]);
        return createRfqFromPurchaseRequest(input.purchaseRequestId, ctx.user);
      }),
      addQuotation: protectedProcedure.input(z2.object({ rfqId: z2.number().int().positive(), supplierId: z2.number().int().positive(), totalPrice: z2.number().positive(), deliveryDays: z2.number().int().nonnegative(), isCompliant: z2.boolean(), notes: z2.string().optional() })).mutation(({ ctx, input }) => {
        assertRole(normalizeProcurementRole(ctx.user.role), ["procurement_officer"]);
        return addSupplierQuotation(input, ctx.user);
      }),
      generateAbstract: protectedProcedure.input(z2.object({ rfqId: z2.number().int().positive() })).mutation(({ ctx, input }) => {
        assertRole(normalizeProcurementRole(ctx.user.role), ["procurement_officer"]);
        return createQuotationAbstract(input.rfqId, ctx.user);
      }),
      approveAbstract: protectedProcedure.input(z2.object({ rfqId: z2.number().int().positive() })).mutation(({ ctx, input }) => {
        assertRole(normalizeProcurementRole(ctx.user.role), ["administrative_approver"]);
        return approveQuotationAbstract(input.rfqId, ctx.user);
      }),
      createPurchaseOrder: protectedProcedure.input(z2.object({ rfqId: z2.number().int().positive() })).mutation(({ ctx, input }) => {
        assertRole(normalizeProcurementRole(ctx.user.role), ["procurement_officer"]);
        return createPurchaseOrder(input.rfqId, ctx.user);
      }),
      reject: protectedProcedure.input(z2.object({
        rfqId: z2.number().int().positive(),
        reason: z2.string().min(10, "Reason must be at least 10 characters.").max(1e3),
        remarks: z2.string().max(1e3).optional()
      })).mutation(async ({ ctx, input }) => {
        const role = normalizeProcurementRole(ctx.user.role);
        assertRole(role, ["procurement_officer", "administrative_approver", "admin"]);
        const result = await rejectRfq(input, ctx.user);
        void publishProcurementRealtimeUpdate("rfq");
        void publishProcurementRealtimeUpdate("purchase_request");
        return result;
      }),
      assignNumber: protectedProcedure.input(z2.object({
        fiscalYear: z2.number().int().min(2020).max(2100).optional(),
        mode: z2.enum(["sequential", "urgent_manual"]),
        manualNumber: z2.string().optional(),
        urgentReason: z2.string().optional(),
        purchaseRequestId: z2.number().int().positive().optional(),
        rfqId: z2.number().int().positive().optional()
      })).mutation(async ({ ctx, input }) => {
        const role = normalizeProcurementRole(ctx.user.role);
        assertRole(role, ["procurement_officer", "admin"]);
        const result = await assignRfqNumber(input, ctx.user);
        void publishProcurementRealtimeUpdate("rfq");
        return result;
      })
    }),
    audit: router({
      list: protectedProcedure.input(z2.object({
        entityType: z2.string().optional(),
        entityId: z2.number().int().positive().optional(),
        transactionNumber: z2.string().optional(),
        performedById: z2.number().int().positive().optional(),
        action: z2.string().optional(),
        fromDate: z2.coerce.date().optional(),
        toDate: z2.coerce.date().optional(),
        limit: z2.number().int().positive().max(500).optional(),
        offset: z2.number().int().nonnegative().optional()
      }).optional()).query(({ ctx, input }) => listAuditTrails(input || {}, ctx.user))
    }),
    templates: router({
      list: protectedProcedure.query(() => listFormTemplates()),
      get: protectedProcedure.input(z2.object({ templateKey: z2.string() })).query(({ input }) => getActiveFormTemplate(input.templateKey)),
      listSupportedForms: protectedProcedure.query(() => Object.values(SUPPORTED_FORM_TEMPLATES)),
      downloadMasterXlsx: protectedProcedure.input(z2.object({ templateKey: z2.string() })).mutation(async ({ input }) => {
        const key = input.templateKey;
        const meta = SUPPORTED_FORM_TEMPLATES[key];
        if (!meta) throw new TRPCError3({ code: "BAD_REQUEST", message: `Unsupported form template key: ${input.templateKey}` });
        const wb = await createMasterExcelWorkbook(key);
        const buffer = Buffer.from(await wb.xlsx.writeBuffer());
        return {
          fileName: meta.sampleFileName,
          base64: buffer.toString("base64"),
          meta
        };
      }),
      uploadXlsxTemplate: protectedProcedure.input(z2.object({
        templateKey: z2.string(),
        displayName: z2.string().min(2).max(180),
        fileBase64: z2.string(),
        fileName: z2.string(),
        activateNow: z2.boolean().optional()
      })).mutation(async ({ ctx, input }) => {
        assertRole(normalizeProcurementRole(ctx.user.role), ["admin"]);
        const buffer = Buffer.from(input.fileBase64, "base64");
        const parsed = await parseExcelTemplate(buffer);
        const key = input.templateKey;
        const meta = SUPPORTED_FORM_TEMPLATES[key];
        const configurationJson = {
          templateType: "excel",
          fileName: input.fileName,
          fileBase64: input.fileBase64,
          sheetName: parsed.sheetName,
          rowCount: parsed.rowCount,
          columnCount: parsed.columnCount,
          placeholdersDetected: parsed.placeholdersDetected,
          repeatingItemRowIndex: parsed.repeatingItemRowIndex,
          uploadedByName: ctx.user.name || ctx.user.email,
          updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
          // Preserve mandatory workflow fields expected by db.ts validation
          requiredFields: meta ? meta.placeholders.slice(0, 3).map((p) => p.token.replace(/[{}]/g, "")) : []
        };
        const draft = await saveFormTemplateDraft({
          templateKey: input.templateKey,
          displayName: input.displayName.trim(),
          configurationJson
        }, ctx.user);
        if (input.activateNow) {
          return activateFormTemplate(draft.id, ctx.user);
        }
        return draft;
      }),
      previewPopulatedTemplate: protectedProcedure.input(z2.object({
        templateKey: z2.string(),
        templateId: z2.number().int().optional(),
        customData: z2.record(z2.string(), z2.unknown()).optional()
      })).query(async ({ input }) => {
        const key = input.templateKey;
        const meta = SUPPORTED_FORM_TEMPLATES[key];
        if (!meta) throw new TRPCError3({ code: "BAD_REQUEST", message: `Unsupported form template key: ${input.templateKey}` });
        let templateBuffer;
        let activeRecord = null;
        if (input.templateId) {
          try {
            const list = await listFormTemplates();
            const target = list.find((t2) => t2.id === input.templateId);
            if (target && target.configurationJson && target.configurationJson.fileBase64) {
              templateBuffer = Buffer.from(target.configurationJson.fileBase64, "base64");
              activeRecord = target;
            } else {
              const wb = await createMasterExcelWorkbook(key);
              templateBuffer = Buffer.from(await wb.xlsx.writeBuffer());
            }
          } catch {
            const wb = await createMasterExcelWorkbook(key);
            templateBuffer = Buffer.from(await wb.xlsx.writeBuffer());
          }
        } else {
          try {
            const active = await getActiveFormTemplate(key);
            if (active && active.configurationJson && active.configurationJson.fileBase64) {
              templateBuffer = Buffer.from(active.configurationJson.fileBase64, "base64");
              activeRecord = active;
            } else {
              const wb = await createMasterExcelWorkbook(key);
              templateBuffer = Buffer.from(await wb.xlsx.writeBuffer());
            }
          } catch {
            const wb = await createMasterExcelWorkbook(key);
            templateBuffer = Buffer.from(await wb.xlsx.writeBuffer());
          }
        }
        const transactionData = input.customData && Object.keys(input.customData).length > 0 ? input.customData : getSampleFormData(key);
        const injected = await injectDataIntoExcelTemplate(templateBuffer, key, transactionData);
        return {
          ...injected,
          metaInfo: meta,
          activeRecord,
          sampleData: transactionData
        };
      }),
      saveDraft: protectedProcedure.input(z2.object({
        templateKey: z2.string(),
        displayName: z2.string().min(2).max(180),
        configurationJson: z2.record(z2.string(), z2.unknown())
      })).mutation(({ ctx, input }) => {
        assertRole(normalizeProcurementRole(ctx.user.role), ["admin"]);
        return saveFormTemplateDraft(input, ctx.user);
      }),
      activate: protectedProcedure.input(z2.object({ templateId: z2.number().int().positive() })).mutation(({ ctx, input }) => {
        assertRole(normalizeProcurementRole(ctx.user.role), ["admin"]);
        return activateFormTemplate(input.templateId, ctx.user);
      }),
      restoreVersion: protectedProcedure.input(z2.object({ templateId: z2.number().int().positive() })).mutation(({ ctx, input }) => {
        assertRole(normalizeProcurementRole(ctx.user.role), ["admin"]);
        return restoreFormTemplateVersion(input.templateId, ctx.user);
      })
    }),
    historicalPrices: router({
      analytics: protectedProcedure.input(z2.object({
        itemDescription: z2.string().min(1),
        unit: z2.string().optional(),
        evaluatedUnitPrice: z2.number().positive().optional(),
        fromDate: z2.coerce.date().optional(),
        toDate: z2.coerce.date().optional()
      })).query(({ input }) => getHistoricalPriceAnalytics(input))
    }),
    historicalPmr: router({
      summary: protectedProcedure.input(z2.object({ fiscalYear: z2.number().int().min(2e3).max(2100).optional() }).optional()).query(({ ctx, input }) => {
        assertRole(normalizeProcurementRole(ctx.user.role), ["procurement_officer", "administrative_approver", "supplier_contractor"]);
        return getHistoricalPmrSummary(input?.fiscalYear ?? 2025);
      }),
      list: protectedProcedure.input(z2.object({ fiscalYear: z2.number().int().min(2e3).max(2100).optional(), month: z2.string().max(24).optional(), office: z2.string().max(180).optional(), supplier: z2.string().max(240).optional(), status: z2.string().max(80).optional(), search: z2.string().max(180).optional(), limit: z2.number().int().min(1).max(2e3).optional() }).optional()).query(({ ctx, input }) => {
        assertRole(normalizeProcurementRole(ctx.user.role), ["procurement_officer", "administrative_approver", "supplier_contractor"]);
        return listHistoricalPmrRecords(input);
      })
    }),
    officer: router({
      notices: router({
        list: protectedProcedure.query(({ ctx }) => {
          assertRole(normalizeProcurementRole(ctx.user.role), ["procurement_officer"]);
          return listLettersOfNotice();
        }),
        create: protectedProcedure.input(z2.object({ noticeType: z2.enum(["award", "disqualification", "clarification", "demand", "other"]), purchaseRequestId: z2.number().int().positive().optional(), supplierId: z2.number().int().positive().optional(), subject: z2.string().min(3).max(220), body: z2.string().min(10).max(5e3), demandDueDate: z2.coerce.date().optional(), issueNow: z2.boolean().optional() })).mutation(({ ctx, input }) => {
          assertRole(normalizeProcurementRole(ctx.user.role), ["procurement_officer"]);
          return createLetterOfNotice(input, ctx.user);
        })
      }),
      transmittals: router({
        list: protectedProcedure.query(({ ctx }) => {
          assertRole(normalizeProcurementRole(ctx.user.role), ["procurement_officer"]);
          return listBacTransmittals();
        }),
        create: protectedProcedure.input(z2.object({ purchaseRequestId: z2.number().int().positive().optional(), fromOffice: z2.string().min(3).max(180), toOffice: z2.string().min(3).max(180), subject: z2.string().min(3).max(220), remarks: z2.string().max(5e3).optional(), sendNow: z2.boolean().optional() })).mutation(({ ctx, input }) => {
          assertRole(normalizeProcurementRole(ctx.user.role), ["procurement_officer"]);
          return createBacTransmittal(input, ctx.user);
        }),
        acknowledge: protectedProcedure.input(z2.object({ transmittalId: z2.number().int().positive(), acknowledgedByName: z2.string().min(3).max(180) })).mutation(({ ctx, input }) => {
          assertRole(normalizeProcurementRole(ctx.user.role), ["procurement_officer"]);
          return acknowledgeBacTransmittal(input, ctx.user);
        })
      }),
      supplierEvaluations: router({
        list: protectedProcedure.query(({ ctx }) => {
          assertRole(normalizeProcurementRole(ctx.user.role), ["procurement_officer", "admin"]);
          return listSupplierEvaluations();
        }),
        mine: protectedProcedure.query(({ ctx }) => {
          assertRole(normalizeProcurementRole(ctx.user.role), ["end_user"]);
          return listSupplierEvaluationsForEndUser(ctx.user);
        }),
        eligibleOrders: protectedProcedure.query(({ ctx }) => {
          assertRole(normalizeProcurementRole(ctx.user.role), ["end_user"]);
          return listEligibleSupplierEvaluationOrders(ctx.user);
        }),
        pendingApprovals: protectedProcedure.query(({ ctx }) => {
          assertRole(normalizeProcurementRole(ctx.user.role), ["administrative_approver", "admin"]);
          return listPendingSupplierEvaluationApprovals();
        }),
        signApproval: protectedProcedure.input(z2.object({ supplierEvaluationId: z2.number().int().positive(), approverDesignation: z2.string().min(2).max(180) })).mutation(({ ctx, input }) => {
          assertRole(normalizeProcurementRole(ctx.user.role), ["administrative_approver", "admin"]);
          return signSupplierEvaluation(input, ctx.user);
        }),
        create: protectedProcedure.input(z2.object({ supplierId: z2.number().int().positive(), purchaseOrderId: z2.number().int().positive().optional(), qualityScore: z2.number().int().min(1).max(5), deliveryScore: z2.number().int().min(1).max(5), pricingScore: z2.number().int().min(1).max(5), complianceScore: z2.number().int().min(1).max(5), remarks: z2.string().max(3e3).optional() })).mutation(({ ctx, input }) => {
          assertRole(normalizeProcurementRole(ctx.user.role), ["procurement_officer", "admin"]);
          return createSupplierEvaluation(input, ctx.user);
        }),
        update: protectedProcedure.input(z2.object({ evaluationId: z2.number().int().positive(), qualityScore: z2.number().int().min(1).max(5), deliveryScore: z2.number().int().min(1).max(5), pricingScore: z2.number().int().min(1).max(5), complianceScore: z2.number().int().min(1).max(5), remarks: z2.string().max(3e3).optional() })).mutation(({ ctx, input }) => {
          assertRole(normalizeProcurementRole(ctx.user.role), ["procurement_officer", "admin"]);
          return updateSupplierEvaluation(input, ctx.user);
        }),
        submitEndUserForm: protectedProcedure.input(z2.object({ supplierId: z2.number().int().positive(), purchaseOrderId: z2.number().int().positive(), goodsServicesType: z2.string().min(2).max(220), responseScores: z2.record(z2.string().min(1).max(80), z2.number().int().min(1).max(4)), remarks: z2.string().max(3e3).optional(), respondentName: z2.string().min(2).max(180) })).mutation(({ ctx, input }) => {
          assertRole(normalizeProcurementRole(ctx.user.role), ["end_user"]);
          return createSupplierEvaluationForm(input, "end_user", ctx.user);
        }),
        submitProcurementOfficeForm: protectedProcedure.input(z2.object({ supplierId: z2.number().int().positive(), purchaseOrderId: z2.number().int().positive(), supplierRegistryReference: z2.string().max(160).optional(), supplierRegistryRegisteredAt: z2.coerce.date().optional(), supplierRegistryExpiresAt: z2.coerce.date().optional(), reportedPurchaseRequestNumber: z2.string().min(2).max(80).optional(), urgentPurchaseRequestReason: z2.string().min(8).max(1e3).optional(), responseScores: z2.record(z2.string().min(1).max(80), z2.number().int().min(1).max(4)), remarks: z2.string().max(3e3).optional(), respondentName: z2.string().min(2).max(180) })).mutation(({ ctx, input }) => {
          assertRole(normalizeProcurementRole(ctx.user.role), ["procurement_officer", "admin"]);
          return createSupplierEvaluationForm(input, "procurement_office", ctx.user);
        })
      }),
      forecast: router({
        get: protectedProcedure.query(({ ctx }) => {
          assertRole(normalizeProcurementRole(ctx.user.role), ["procurement_officer"]);
          return getProcurementForecast();
        }),
        recordHistoricalPrice: protectedProcedure.input(z2.object({ itemDescription: z2.string().min(2).max(220), unit: z2.string().min(1).max(40), unitPrice: z2.number().positive(), supplierId: z2.number().int().positive().optional(), purchaseOrderId: z2.number().int().positive().optional(), observedAt: z2.coerce.date().optional() })).mutation(({ ctx, input }) => {
          assertRole(normalizeProcurementRole(ctx.user.role), ["procurement_officer"]);
          return recordHistoricalPrice(input, ctx.user);
        })
      })
    }),
    publicTracking: router({ lookup: publicProcedure.input(z2.object({ token: z2.string().min(16).max(48) })).query(({ input }) => getPublicPurchaseRequestTracking(input.token)) })
  })
});

// server/supabaseAuth.ts
import { createClient as createClient2 } from "@supabase/supabase-js";
function getBearerToken(req) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length).trim();
  return token || null;
}
function getAuthClient() {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.warn("[Supabase Auth] Missing server Supabase configuration", {
      hasUrl: Boolean(url),
      hasServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      hasAnonKey: Boolean(process.env.VITE_SUPABASE_ANON_KEY)
    });
    return null;
  }
  return createClient2(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}
async function authenticateSupabaseRequest(req) {
  const token = getBearerToken(req);
  const client = getAuthClient();
  if (!token) {
    console.warn("[Supabase Auth] Request did not include a bearer token");
    return null;
  }
  if (!client) return null;
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) {
    console.warn("[Supabase Auth] Access token verification failed", {
      message: error?.message ?? "Supabase returned no user"
    });
    return null;
  }
  const fullName = typeof data.user.user_metadata?.full_name === "string" ? data.user.user_metadata.full_name : typeof data.user.user_metadata?.name === "string" ? data.user.user_metadata.name : null;
  const officeName = typeof data.user.user_metadata?.office_name === "string" ? data.user.user_metadata.office_name : null;
  try {
    return await upsertSupabaseAuthUser({
      openId: data.user.id,
      email: data.user.email ?? null,
      name: fullName,
      officeName
    });
  } catch (error2) {
    console.error("[Supabase Auth] Profile bridge failed", {
      message: error2 instanceof Error ? error2.message : "Unknown profile bridge error",
      userId: data.user.id,
      email: data.user.email ?? null
    });
    return null;
  }
}

// server/_core/context.ts
async function createContext(opts) {
  let user = null;
  try {
    user = await authenticateSupabaseRequest(
      opts.req
    );
  } catch (error) {
    console.error("[Auth Context] Unexpected authentication failure", {
      message: error instanceof Error ? error.message : "Unknown authentication error"
    });
    user = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user
  };
}

// server/vercelApiEntrypoint.ts
var app = express();
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
registerStorageProxy(app);
app.use("/api/trpc", createExpressMiddleware({ router: appRouter, createContext }));
var vercelApiEntrypoint_default = app;
export {
  vercelApiEntrypoint_default as default
};
