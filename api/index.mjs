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
import { decimal, index, integer, json, pgTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";
var users = pgTable("users", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: varchar("role", { length: 64 }).$type().default("end_user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull()
});
var offices = pgTable("offices", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  code: varchar("code", { length: 32 }).notNull().unique(),
  name: varchar("name", { length: 160 }).notNull(),
  isActive: integer("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var objectsOfExpenditure = pgTable("objects_of_expenditure", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  code: varchar("code", { length: 32 }).notNull().unique(),
  name: varchar("name", { length: 180 }).notNull(),
  isActive: integer("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var budgetAllotments = pgTable("budget_allotments", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  officeId: integer("officeId").notNull(),
  objectOfExpenditureId: integer("objectOfExpenditureId").notNull(),
  fiscalYear: integer("fiscalYear").notNull(),
  allottedAmount: decimal("allottedAmount", { precision: 14, scale: 2 }).notNull(),
  committedAmount: decimal("committedAmount", { precision: 14, scale: 2 }).default("0.00").notNull(),
  createdById: integer("createdById").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull()
}, (table) => [
  uniqueIndex("budget_allotment_office_object_year_unique").on(table.officeId, table.objectOfExpenditureId, table.fiscalYear),
  index("budget_allotment_office_year_idx").on(table.officeId, table.fiscalYear)
]);
var suppliers = pgTable("suppliers", {
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
  createdAt: timestamp("createdAt").defaultNow().notNull()
}, (table) => [index("supplier_company_idx").on(table.companyName)]);
var supplierTags = pgTable("supplier_tags", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  name: varchar("name", { length: 120 }).notNull().unique(),
  description: varchar("description", { length: 320 }),
  isActive: integer("isActive").default(1).notNull(),
  createdById: integer("createdById").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
}, (table) => [index("supplier_tag_active_idx").on(table.isActive)]);
var supplierTagAssignments = pgTable("supplier_tag_assignments", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  supplierId: integer("supplierId").notNull(),
  supplierTagId: integer("supplierTagId").notNull(),
  assignedById: integer("assignedById").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
}, (table) => [
  uniqueIndex("supplier_tag_assignment_unique").on(table.supplierId, table.supplierTagId),
  index("supplier_tag_assignment_supplier_idx").on(table.supplierId),
  index("supplier_tag_assignment_tag_idx").on(table.supplierTagId)
]);
var procurementCatalogItems = pgTable("procurement_catalog_items", {
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
var procurementCatalogFavorites = pgTable("procurement_catalog_favorites", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  userId: integer("userId").notNull(),
  catalogItemId: integer("catalogItemId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
}, (table) => [
  uniqueIndex("procurement_catalog_favorite_user_item_unique").on(table.userId, table.catalogItemId),
  index("procurement_catalog_favorite_user_idx").on(table.userId),
  index("procurement_catalog_favorite_item_idx").on(table.catalogItemId)
]);
var procurementCatalogSavedItems = pgTable("procurement_catalog_saved_items", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  userId: integer("userId").notNull(),
  catalogItemId: integer("catalogItemId").notNull(),
  quantity: decimal("quantity", { precision: 12, scale: 2 }).default("1.00").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull()
}, (table) => [
  uniqueIndex("procurement_catalog_saved_user_item_unique").on(table.userId, table.catalogItemId),
  index("procurement_catalog_saved_user_idx").on(table.userId),
  index("procurement_catalog_saved_item_idx").on(table.catalogItemId)
]);
var appPpmpEntries = pgTable("app_ppmp_entries", {
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
  updatedAt: timestamp("updatedAt").defaultNow().notNull()
}, (table) => [index("app_ppmp_office_year_idx").on(table.officeId, table.fiscalYear)]);
var testRecordArchives = pgTable("test_record_archives", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  ppmpEntryId: integer("ppmpEntryId").notNull().unique(),
  archivedById: integer("archivedById").notNull(),
  archiveReason: text("archiveReason").notNull(),
  archivedAt: timestamp("archivedAt").defaultNow().notNull(),
  cleanedAt: timestamp("cleanedAt")
}, (table) => [index("test_record_archive_status_idx").on(table.cleanedAt, table.archivedAt)]);
var purchaseRequests = pgTable("purchase_requests", {
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
  status: varchar("status", { length: 64 }).$type().default("draft").notNull(),
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
  updatedAt: timestamp("updatedAt").defaultNow().notNull()
}, (table) => [
  index("pr_requester_status_idx").on(table.requestedById, table.status),
  index("pr_office_status_idx").on(table.officeId, table.status)
]);
var purchaseRequestItems = pgTable("purchase_request_items", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  purchaseRequestId: integer("purchaseRequestId").notNull(),
  catalogItemId: integer("catalogItemId"),
  description: text("description").notNull(),
  stockPropertyNo: varchar("stockPropertyNo", { length: 80 }),
  specification: text("specification"),
  quantity: decimal("quantity", { precision: 12, scale: 2 }).notNull(),
  unit: varchar("unit", { length: 40 }).notNull(),
  estimatedUnitCost: decimal("estimatedUnitCost", { precision: 14, scale: 2 }).notNull(),
  totalCost: decimal("totalCost", { precision: 14, scale: 2 }).notNull()
}, (table) => [index("pr_item_pr_idx").on(table.purchaseRequestId), index("pr_item_catalog_idx").on(table.catalogItemId)]);
var preCanvasses = pgTable("pre_canvasses", {
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
  updatedAt: timestamp("updatedAt").defaultNow().notNull()
});
var preCanvassQuotes = pgTable("pre_canvass_quotes", {
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
  submittedAt: timestamp("submittedAt").defaultNow().notNull()
}, (table) => [uniqueIndex("pre_canvass_quote_supplier_unique").on(table.preCanvassId, table.supplierId)]);
var abstractsOfCanvass = pgTable("abstracts_of_canvass", {
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
  updatedAt: timestamp("updatedAt").defaultNow().notNull()
});
var rfqs = pgTable("rfqs", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  rfqNumber: varchar("rfqNumber", { length: 40 }).notNull().unique(),
  purchaseRequestId: integer("purchaseRequestId").notNull().unique(),
  status: varchar("status", { length: 64 }).default("draft").notNull(),
  createdById: integer("createdById").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull()
});
var supplierQuotations = pgTable("supplier_quotations", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  rfqId: integer("rfqId").notNull(),
  supplierId: integer("supplierId").notNull(),
  totalPrice: decimal("totalPrice", { precision: 14, scale: 2 }).notNull(),
  deliveryDays: integer("deliveryDays").notNull(),
  isCompliant: integer("isCompliant").default(1).notNull(),
  notes: text("notes"),
  submittedAt: timestamp("submittedAt").defaultNow().notNull()
}, (table) => [uniqueIndex("supplier_quote_rfq_supplier_unique").on(table.rfqId, table.supplierId)]);
var quotationAbstracts = pgTable("quotation_abstracts", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  rfqId: integer("rfqId").notNull().unique(),
  recommendedSupplierId: integer("recommendedSupplierId").notNull(),
  recommendationReason: text("recommendationReason").notNull(),
  status: varchar("status", { length: 64 }).default("draft").notNull(),
  preparedById: integer("preparedById").notNull(),
  approvedById: integer("approvedById"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull()
});
var purchaseOrders = pgTable("purchase_orders", {
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
  updatedAt: timestamp("updatedAt").defaultNow().notNull()
});
var deliveryReceipts = pgTable("delivery_receipts", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  purchaseOrderId: integer("purchaseOrderId").notNull().unique(),
  receiptNumber: varchar("receiptNumber", { length: 40 }).notNull().unique(),
  deliveredAt: timestamp("deliveredAt").defaultNow().notNull(),
  receivedById: integer("receivedById").notNull(),
  receivedByName: varchar("receivedByName", { length: 180 }),
  deliveryStatus: varchar("deliveryStatus", { length: 64 }).default("complete").notNull(),
  signatureReference: text("signatureReference"),
  remarks: text("remarks"),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var pmrLogs = pgTable("pmr_logs", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  purchaseOrderId: integer("purchaseOrderId").notNull().unique(),
  pmrNumber: varchar("pmrNumber", { length: 40 }).notNull().unique(),
  remarks: text("remarks"),
  loggedById: integer("loggedById").notNull(),
  loggedAt: timestamp("loggedAt").defaultNow().notNull()
});
var procurementSettings = pgTable("procurement_settings", {
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
  updatedAt: timestamp("updatedAt").defaultNow().notNull()
});
var procurementSignatories = pgTable("procurement_signatories", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  fullName: varchar("fullName", { length: 180 }).notNull(),
  designation: varchar("designation", { length: 160 }).notNull(),
  mayRequest: integer("mayRequest").default(0).notNull(),
  mayApprove: integer("mayApprove").default(0).notNull(),
  isActive: integer("isActive").default(1).notNull(),
  createdById: integer("createdById").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
}, (table) => [index("procurement_signatory_active_idx").on(table.isActive, table.mayRequest, table.mayApprove)]);
var procurementDocuments = pgTable("procurement_documents", {
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
  createdAt: timestamp("createdAt").defaultNow().notNull()
}, (table) => [index("document_entity_created_idx").on(table.entityType, table.entityId, table.createdAt), index("document_uploader_created_idx").on(table.uploadedById, table.createdAt)]);
var workflowCorrections = pgTable("workflow_corrections", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  entityType: varchar("entityType", { length: 64 }).notNull(),
  entityId: integer("entityId").notNull(),
  requestedById: integer("requestedById").notNull(),
  assignedToId: integer("assignedToId").notNull(),
  reason: text("reason").notNull(),
  status: varchar("status", { length: 64 }).default("open").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  resolvedAt: timestamp("resolvedAt")
}, (table) => [index("correction_entity_created_idx").on(table.entityType, table.entityId, table.createdAt), index("correction_assignee_status_idx").on(table.assignedToId, table.status)]);
var workflowNotifications = pgTable("workflow_notifications", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  recipientUserId: integer("recipientUserId").notNull(),
  kind: varchar("kind", { length: 64 }).notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  body: text("body").notNull(),
  entityType: varchar("entityType", { length: 64 }).notNull(),
  entityId: integer("entityId").notNull(),
  readAt: timestamp("readAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull()
}, (table) => [index("notification_recipient_read_created_idx").on(table.recipientUserId, table.readAt, table.createdAt)]);
var lettersOfNotice = pgTable("letters_of_notice", {
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
  updatedAt: timestamp("updatedAt").defaultNow().notNull()
}, (table) => [index("notice_pr_created_idx").on(table.purchaseRequestId, table.createdAt)]);
var bacTransmittals = pgTable("bac_transmittals", {
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
  updatedAt: timestamp("updatedAt").defaultNow().notNull()
}, (table) => [index("transmittal_pr_created_idx").on(table.purchaseRequestId, table.createdAt)]);
var supplierEvaluations = pgTable("supplier_evaluations", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  supplierId: integer("supplierId").notNull(),
  purchaseOrderId: integer("purchaseOrderId"),
  purchaseRequestId: integer("purchaseRequestId"),
  reportedPurchaseRequestNumber: varchar("reportedPurchaseRequestNumber", { length: 80 }),
  urgentPurchaseRequestReason: text("urgentPurchaseRequestReason"),
  urgentPurchaseRequestUpdatedById: integer("urgentPurchaseRequestUpdatedById"),
  urgentPurchaseRequestUpdatedAt: timestamp("urgentPurchaseRequestUpdatedAt"),
  officeId: integer("officeId"),
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
  evaluatedById: integer("evaluatedById").notNull(),
  evaluatedAt: timestamp("evaluatedAt").defaultNow().notNull()
}, (table) => [index("supplier_evaluation_supplier_date_idx").on(table.supplierId, table.evaluatedAt)]);
var supplierEvaluationApprovals = pgTable("supplier_evaluation_approvals", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  supplierEvaluationId: integer("supplierEvaluationId").notNull().unique(),
  approvedById: integer("approvedById").notNull(),
  approverName: varchar("approverName", { length: 180 }).notNull(),
  approverDesignation: varchar("approverDesignation", { length: 180 }).notNull(),
  consentStatement: text("consentStatement").notNull(),
  signatureDigest: varchar("signatureDigest", { length: 128 }).notNull(),
  approvedAt: timestamp("approvedAt").defaultNow().notNull()
}, (table) => [index("supplier_evaluation_approval_approver_date_idx").on(table.approvedById, table.approvedAt)]);
var mcdmRecommendations = pgTable("mcdm_recommendations", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  preCanvassId: integer("preCanvassId").notNull().unique(),
  recommendedSupplierId: integer("recommendedSupplierId").notNull(),
  priceScore: decimal("priceScore", { precision: 7, scale: 2 }).notNull(),
  deliveryScore: decimal("deliveryScore", { precision: 7, scale: 2 }).notNull(),
  complianceScore: decimal("complianceScore", { precision: 7, scale: 2 }).notNull(),
  totalScore: decimal("totalScore", { precision: 7, scale: 2 }).notNull(),
  rationale: text("rationale").notNull(),
  createdById: integer("createdById").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var bestValuePolicies = pgTable("best_value_policies", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  policyCode: varchar("policyCode", { length: 64 }).notNull(),
  name: varchar("name", { length: 180 }).notNull(),
  version: integer("version").notNull(),
  isActive: integer("isActive").default(1).notNull(),
  totalWeight: decimal("totalWeight", { precision: 7, scale: 2 }).notNull(),
  createdById: integer("createdById").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  deactivatedAt: timestamp("deactivatedAt")
}, (table) => [
  uniqueIndex("best_value_policy_code_version_unique").on(table.policyCode, table.version),
  index("best_value_policy_active_created_idx").on(table.isActive, table.createdAt)
]);
var bestValuePolicyCriteria = pgTable("best_value_policy_criteria", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  policyId: integer("policyId").notNull(),
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
var historicalPrices = pgTable("historical_prices", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  itemDescription: varchar("itemDescription", { length: 220 }).notNull(),
  unit: varchar("unit", { length: 40 }).notNull(),
  unitPrice: decimal("unitPrice", { precision: 14, scale: 2 }).notNull(),
  supplierId: integer("supplierId"),
  purchaseOrderId: integer("purchaseOrderId"),
  observedAt: timestamp("observedAt").defaultNow().notNull(),
  recordedById: integer("recordedById").notNull()
}, (table) => [index("historical_price_item_observed_idx").on(table.itemDescription, table.observedAt)]);
var auditTrails = pgTable("audit_trails", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  entityType: varchar("entityType", { length: 64 }).notNull(),
  entityId: integer("entityId").notNull(),
  action: varchar("action", { length: 100 }).notNull(),
  performedById: integer("performedById").notNull(),
  performedByRole: varchar("performedByRole", { length: 64 }).notNull(),
  details: json("details").$type(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
}, (table) => [index("audit_entity_created_idx").on(table.entityType, table.entityId, table.createdAt)]);

// shared/procurementRules.ts
var PROCUREMENT_ROLES = ["end_user", "procurement_officer", "administrative_approver", "admin"];
var USER_ROLES = ["user", ...PROCUREMENT_ROLES, "bac", "supply_officer", "budget_officer"];
function roleCanAct(role, permittedRoles) {
  return role === "admin" || permittedRoles.includes(role);
}
function normalizeProcurementRole(role) {
  if (role === "user") return "end_user";
  if (role === "supply_officer") return "procurement_officer";
  if (role === "bac" || role === "budget_officer") return "administrative_approver";
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
function hasRequiredSupplierQuotations(quoteCount) {
  return quoteCount >= 3;
}
function canReserveBudget(allottedAmount, committedAmount, requestAmount) {
  return Number(requestAmount) <= Number(allottedAmount) - Number(committedAmount);
}
function hasReservedBudgetCommitment(committedAmount, requestAmount) {
  return Number(committedAmount) >= Number(requestAmount);
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
  { key: "recommend_supplier", section: "Overall satisfaction", label: "I would recommend this supplier provider to others within the institution." }
];
var PROCUREMENT_OFFICE_EVALUATION_CRITERIA = [
  { key: "rfq_timeliness", section: "Procurement Office assessment", label: "Responds to the Request for Quotation (RFQ) within the specified date." },
  { key: "competitive_price", section: "Procurement Office assessment", label: "Products are offered at a competitive price with other suppliers/bidders." },
  { key: "specification_conformance", section: "Procurement Office assessment", label: "Offer conforms to product sample/specification requirements." },
  { key: "documentary_requirements", section: "Procurement Office assessment", label: "Submit all prescribed documentary requirements within 1\u20132 days upon Procurement Officer request or coordination." },
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
      const source = configuredConnectionString ? process.env.SUPABASE_DATABASE_URL ? "SUPABASE_DATABASE_URL" : "DATABASE_URL" : "SUPABASE_DB_PASSWORD (built-in template)";
      console.log(`[Database] Connecting via ${source} \u2026`);
      _pool = new Pool({ connectionString, ssl: connectionString.startsWith("postgres") ? { rejectUnauthorized: false } : void 0 });
      _pool.on("connect", (client) => {
        void client.query("SET search_path TO procurewise, public").catch((error) => {
          console.warn("[Database] Failed to set ProcureWise search_path:", error);
        });
      });
      await _pool.query("SET search_path TO procurewise, public");
      _db = drizzle(_pool);
    } catch (error) {
      console.error("[Database] Failed to initialise pool:", error instanceof Error ? error.message : error);
      _db = null;
    }
  }
  if (!_db && !configuredConnectionString && !password) {
    console.error("[Database] No DB env var found. Set SUPABASE_DATABASE_URL, DATABASE_URL, or SUPABASE_DB_PASSWORD in Vercel.");
  }
  return _db;
}
async function upsertSupabaseAuthUser(input) {
  const db = await requireDb();
  const existingByOpenId = await db.select().from(users).where(eq(users.openId, input.openId)).limit(1);
  const existingByEmail = !existingByOpenId[0] && input.email ? await db.select().from(users).where(eq(users.email, input.email)).limit(1) : [];
  const existing = existingByOpenId[0] ?? existingByEmail[0];
  const values = { openId: input.openId, email: input.email, name: input.name, loginMethod: "supabase", lastSignedIn: /* @__PURE__ */ new Date() };
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
async function getWorkspaceSetup() {
  const db = await requireDb();
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
  const [allotments, officeRows, objectRows] = await Promise.all([db.select().from(budgetAllotments), db.select().from(offices), db.select().from(objectsOfExpenditure)]);
  return allotments.map((allotment) => ({
    ...allotment,
    office: officeRows.find((office) => office.id === allotment.officeId) ?? null,
    objectOfExpenditure: objectRows.find((object) => object.id === allotment.objectOfExpenditureId) ?? null,
    availableAmount: (Number(allotment.allottedAmount) - Number(allotment.committedAmount)).toFixed(2)
  }));
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
    supplierRegistryReference: audience === "procurement_office" ? input.supplierRegistryReference?.trim() || null : null,
    supplierRegistryRegisteredAt: audience === "procurement_office" ? input.supplierRegistryRegisteredAt ?? null : null,
    supplierRegistryExpiresAt: audience === "procurement_office" ? input.supplierRegistryExpiresAt ?? null : null,
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
  await db.insert(lettersOfNotice).values({ noticeNumber, noticeType: input.noticeType, purchaseRequestId: input.purchaseRequestId ?? null, supplierId: input.supplierId ?? null, subject: input.subject.trim(), body: input.body.trim(), status, issuedById: user.id, issuedAt: input.issueNow ? /* @__PURE__ */ new Date() : null });
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
  return db.select({ id: users.id, name: users.name, email: users.email, role: users.role, lastSignedIn: users.lastSignedIn }).from(users);
}
async function updateUserProcurementRole(userId, role, actor) {
  const db = await requireDb();
  await db.update(users).set({ role }).where(eq(users.id, userId));
  await writeAuditEvent({ entityType: "user_profile", entityId: userId, action: "role_updated", performedById: actor.id, performedByRole: normalizeProcurementRole(actor.role), details: { assignedRole: role } });
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
  const archivedPpmpEntryIds = new Set((await db.select().from(testRecordArchives).where(isNull(testRecordArchives.cleanedAt))).map((archive) => archive.ppmpEntryId));
  return (await records).filter((record) => !record.ppmpEntryId || !archivedPpmpEntryIds.has(record.ppmpEntryId));
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
    if (!preCanvass || preCanvass.status !== "submitted") throw new Error("Submit a complete three-supplier Pre-Canvass before forwarding the procurement package.");
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
  if (!hasRequiredSupplierQuotations(quotes.length)) throw new Error("Three supplier quotes are required before forwarding the Pre-Canvass to the Procurement Officer.");
  await db.update(preCanvasses).set({ status: "submitted" }).where(eq(preCanvasses.id, preCanvassId));
  await recordAudit({ entityType: "pre_canvass", entityId: preCanvassId, action: "submitted_to_procurement", performedById: user.id, performedByRole: normalizeProcurementRole(user.role), details: { quoteCount: quotes.length } });
}
async function createAbstractOfCanvass(preCanvassId, user) {
  const db = await requireDb();
  const [preCanvass] = await db.select().from(preCanvasses).where(eq(preCanvasses.id, preCanvassId)).limit(1);
  if (!preCanvass || preCanvass.status !== "submitted") throw new Error("A submitted Pre-Canvass is required before an Abstract of Canvass can be generated.");
  const quotes = await db.select().from(preCanvassQuotes).where(eq(preCanvassQuotes.preCanvassId, preCanvassId));
  if (!hasRequiredSupplierQuotations(quotes.length)) throw new Error("Three supplier quotes are required before an Abstract of Canvass can be generated.");
  const recommendation = selectLowestCompliantQuote(quotes.map((quote) => ({ ...quote, isCompliant: quote.isCompliant === 1 })));
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
  const auditRows = isEndUser ? await db.select().from(auditTrails).where(eq(auditTrails.performedById, user.id)) : await db.select().from(auditTrails);
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

// server/routers.ts
function assertRole(role, permittedRoles) {
  if (!roleCanAct(role, permittedRoles)) throw new TRPCError3({ code: "FORBIDDEN", message: "This procurement action is not permitted for your assigned role." });
}
var appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => {
      if (opts.ctx.dbError) {
        throw new TRPCError3({
          code: "INTERNAL_SERVER_ERROR",
          message: "Your Supabase sign-in succeeded, but ProcureWise could not load your workspace profile. Please contact an administrator or verify the production database configuration."
        });
      }
      return opts.ctx.user;
    }),
    logout: publicProcedure.mutation(() => ({ success: true }))
  }),
  procurement: router({
    dashboard: protectedProcedure.query(({ ctx }) => getProcurementDashboard(ctx.user)),
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
      createSupplier: protectedProcedure.input(z2.object({ supplierCode: z2.string().min(2).max(40), companyName: z2.string().min(3).max(180), tin: z2.string().max(80).optional(), contactPerson: z2.string().max(140).optional(), email: z2.string().email().optional().or(z2.literal("")), phone: z2.string().max(80).optional(), address: z2.string().optional(), offerings: z2.string().optional(), accreditationStatus: z2.enum(["pending", "accredited", "suspended"]) })).mutation(({ ctx, input }) => {
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
      updateSettings: protectedProcedure.input(z2.object({ entityName: z2.string().min(3).max(180), authorizedOfficialName: z2.string().max(180).optional(), authorizedOfficialDesignation: z2.string().max(160).optional(), chiefAccountantName: z2.string().max(180).optional(), defaultNoticeSignatory: z2.string().max(180).optional(), sessionTimeoutMinutes: z2.number().int().min(5).max(240).optional(), enableInAppNotifications: z2.boolean().optional(), notificationRefreshSeconds: z2.number().int().min(10).max(120).optional() })).mutation(({ ctx, input }) => {
        assertRole(normalizeProcurementRole(ctx.user.role), ["admin"]);
        return updateProcurementSettings(input, ctx.user);
      }),
      users: protectedProcedure.query(({ ctx }) => {
        assertRole(normalizeProcurementRole(ctx.user.role), ["admin"]);
        return listUserProfiles();
      }),
      updateUserRole: protectedProcedure.input(z2.object({ userId: z2.number().int().positive(), role: z2.enum(["end_user", "procurement_officer", "administrative_approver", "admin"]) })).mutation(({ ctx, input }) => {
        assertRole(normalizeProcurementRole(ctx.user.role), ["admin"]);
        return updateUserProcurementRole(input.userId, input.role, ctx.user);
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
      })
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
        await notifyRoles(["administrative_approver"], { kind: "action_required", title: "Abstract of Canvass awaiting decision", body: "A Procurement Officer recommendation is ready for administrative review.", entityType: "pre_canvass", entityId: input.preCanvassId });
        void publishProcurementRealtimeUpdate("pre_canvass");
        void publishProcurementRealtimeUpdate("abstract_of_canvass");
        return result;
      }),
      decideAbstract: protectedProcedure.input(z2.object({ preCanvassId: z2.number().int().positive(), decision: z2.enum(["approved", "rejected"]), remarks: z2.string().max(1e3).optional() })).mutation(async ({ ctx, input }) => {
        assertRole(normalizeProcurementRole(ctx.user.role), ["administrative_approver"]);
        const result = await decideAbstractOfCanvass(input, ctx.user);
        await notifyRoles(["procurement_officer"], { kind: "status_change", title: `Abstract ${input.decision}`, body: input.remarks || "The Administrative Approver recorded a decision on the Abstract of Canvass.", entityType: "pre_canvass", entityId: input.preCanvassId });
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
      })
    }),
    officer: router({
      notices: router({
        list: protectedProcedure.query(({ ctx }) => {
          assertRole(normalizeProcurementRole(ctx.user.role), ["procurement_officer"]);
          return listLettersOfNotice();
        }),
        create: protectedProcedure.input(z2.object({ noticeType: z2.enum(["award", "disqualification", "clarification", "other"]), purchaseRequestId: z2.number().int().positive().optional(), supplierId: z2.number().int().positive().optional(), subject: z2.string().min(3).max(220), body: z2.string().min(10).max(5e3), issueNow: z2.boolean().optional() })).mutation(({ ctx, input }) => {
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
    console.error("[SupabaseAuth] Missing env vars \u2014 VITE_SUPABASE_URL:", Boolean(url), "key (service role or anon):", Boolean(key));
    return null;
  }
  return createClient2(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}
async function authenticateSupabaseRequest(req) {
  const token = getBearerToken(req);
  const client = getAuthClient();
  if (!token || !client) return null;
  const { data, error } = await client.auth.getUser(token);
  if (error) {
    console.error("[SupabaseAuth] getUser error:", error.message);
    throw new Error(`Supabase API error: ${error.message}. Check SUPABASE_SERVICE_ROLE_KEY in Vercel environment variables.`);
  }
  if (!data.user) return null;
  const fullName = typeof data.user.user_metadata?.full_name === "string" ? data.user.user_metadata.full_name : typeof data.user.user_metadata?.name === "string" ? data.user.user_metadata.name : null;
  return upsertSupabaseAuthUser({
    openId: data.user.id,
    email: data.user.email ?? null,
    name: fullName
  });
}

// server/_core/context.ts
async function createContext(opts) {
  let user = null;
  let dbError = null;
  try {
    user = await authenticateSupabaseRequest(
      opts.req
    );
  } catch (error) {
    const authHeader = opts.req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      const message = error instanceof Error ? error.message : "Database is unavailable.";
      dbError = message;
      console.error("[Auth] DB error during Supabase auth bridge:", message);
      console.error(
        "[Auth] Env check \u2014 SUPABASE_DATABASE_URL:",
        Boolean(process.env.SUPABASE_DATABASE_URL),
        "DATABASE_URL:",
        Boolean(process.env.DATABASE_URL),
        "SUPABASE_DB_PASSWORD:",
        Boolean(process.env.SUPABASE_DB_PASSWORD),
        "SUPABASE_SERVICE_ROLE_KEY:",
        Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
        "VITE_SUPABASE_URL:",
        Boolean(process.env.VITE_SUPABASE_URL)
      );
    }
    user = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user,
    dbError
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
