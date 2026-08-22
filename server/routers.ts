import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { acknowledgeBacTransmittal, addPreCanvassQuote, addSupplierQuotation, advancePurchaseRequest, approveQuotationAbstract, archiveTestRecordPackage, cleanupArchivedTestRecordPackage, createAbstractOfCanvass, createAppPpmpEntry, createBacTransmittal, createBudgetAllotment, createLetterOfNotice, createMcdmRecommendation, createObjectOfExpenditure, createOffice, createPreCanvass, createProcurementDocument, createPurchaseOrder, createPurchaseOrderFromPreCanvass, createPurchaseRequest, createPurchaseRequestSignatory, createQuotationAbstract, createRfqFromPreCanvass, createRfqFromPurchaseRequest, createSupplier, createSupplierEvaluation, createSupplierEvaluationForm, createSupplierTag, decideAbstractOfCanvass, getBestValuePolicy, getBestValuePolicyHistory, getBudgetUtilization, getProcurementCatalogItem, getProcurementDashboard, getProcurementForecast, getPublicPurchaseRequestTracking, getPurchaseRequestDetail, getSupplierTagData, getWorkspaceSetup, listAdminTestRecordPackages, listBacTransmittals, listEligibleSupplierEvaluationOrders, listLettersOfNotice, listPendingSupplierEvaluationApprovals, listProcurementCatalogCodeFamilies, listProcurementCatalogFavorites, listProcurementCatalogItems, listPurchaseRequestSignatories, listPurchaseRequests, listSupplierEvaluations, listSupplierEvaluationsForEndUser, listUserProfiles, listWorkflowNotifications, logPmr, markWorkflowNotificationRead, notifyRoles, recordDelivery, recordHistoricalPrice, recordPreCanvassResubmission, requestAbstractCorrection, requestPreCanvassCorrection, requestPurchaseOrderCorrection, resubmitAbstract, resubmitPurchaseOrder, saveBestValuePolicy, setProcurementCatalogFavorite, setSupplierTags, signSupplierEvaluation, submitPreCanvass, updateProcurementSettings, updateSupplierEvaluation, updateUserProcurementRole } from "./db";
import { getSupabaseRealtimePublicConfig, publishProcurementRealtimeUpdate } from "./supabaseRealtime";
import { getNextPrStatus, normalizeProcurementRole, roleCanAct, type ProcurementRole } from "../shared/procurementRules";
import { BEST_VALUE_CRITERION_KEYS } from "../shared/bestValuePolicy";

function assertRole(role: ProcurementRole, permittedRoles: ProcurementRole[]) {
  if (!roleCanAct(role, permittedRoles)) throw new TRPCError({ code: "FORBIDDEN", message: "This procurement action is not permitted for your assigned role." });
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      ctx.res.clearCookie(COOKIE_NAME, { ...getSessionCookieOptions(ctx.req), maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  procurement: router({
    dashboard: protectedProcedure.query(({ ctx }) => getProcurementDashboard(ctx.user)),
    realtime: router({
      config: protectedProcedure.query(() => getSupabaseRealtimePublicConfig()),
    }),
    setup: router({
      details: protectedProcedure.query(() => getWorkspaceSetup()),
      budgetUtilization: protectedProcedure.query(({ ctx }) => { assertRole(normalizeProcurementRole(ctx.user.role), ["administrative_approver", "admin"]); return getBudgetUtilization(); }),
      createOffice: protectedProcedure.input(z.object({ code: z.string().min(2).max(32), name: z.string().min(3).max(160) })).mutation(({ ctx, input }) => { assertRole(normalizeProcurementRole(ctx.user.role), ["admin"]); return createOffice(input, ctx.user); }),
      createObjectOfExpenditure: protectedProcedure.input(z.object({ code: z.string().min(2).max(32), name: z.string().min(3).max(180) })).mutation(({ ctx, input }) => { assertRole(normalizeProcurementRole(ctx.user.role), ["admin"]); return createObjectOfExpenditure(input, ctx.user); }),
      createBudgetAllotment: protectedProcedure.input(z.object({ officeId: z.number().int().positive(), objectOfExpenditureId: z.number().int().positive(), fiscalYear: z.number().int().min(2020).max(2100), allottedAmount: z.number().positive() })).mutation(({ ctx, input }) => { assertRole(normalizeProcurementRole(ctx.user.role), ["administrative_approver", "admin"]); return createBudgetAllotment(input, ctx.user); }),
      createSupplier: protectedProcedure.input(z.object({ supplierCode: z.string().min(2).max(40), companyName: z.string().min(3).max(180), tin: z.string().max(80).optional(), contactPerson: z.string().max(140).optional(), email: z.string().email().optional().or(z.literal("")), phone: z.string().max(80).optional(), address: z.string().optional(), offerings: z.string().optional(), accreditationStatus: z.enum(["pending", "accredited", "suspended"]) })).mutation(({ ctx, input }) => { assertRole(normalizeProcurementRole(ctx.user.role), ["procurement_officer", "admin"]); return createSupplier(input, ctx.user); }),
      createAppPpmpEntry: protectedProcedure.input(z.object({ fiscalYear: z.number().int().min(2020).max(2100), officeId: z.number().int().positive(), objectOfExpenditureId: z.number().int().positive(), catalogItemId: z.number().int().positive().optional(), description: z.string().min(3), plannedAmount: z.number().positive(), papCode: z.string().max(80).optional(), projectTitle: z.string().max(220).optional(), modeOfProcurement: z.string().max(120).optional(), fundSource: z.string().max(160).optional(), procurementSchedule: z.string().max(1000).optional(), remarks: z.string().max(1000).optional() })).mutation(({ ctx, input }) => { assertRole(normalizeProcurementRole(ctx.user.role), ["end_user", "admin"]); return createAppPpmpEntry(input, ctx.user); }),
      createPurchaseRequestSignatory: protectedProcedure.input(z.object({ fullName: z.string().min(3).max(180), designation: z.string().min(2).max(160), mayRequest: z.boolean(), mayApprove: z.boolean() }).refine((input) => input.mayRequest || input.mayApprove, { message: "Authorize the signatory to request or approve Purchase Requests." })).mutation(({ ctx, input }) => { assertRole(normalizeProcurementRole(ctx.user.role), ["admin"]); return createPurchaseRequestSignatory(input, ctx.user); }),
      updateSettings: protectedProcedure.input(z.object({ entityName: z.string().min(3).max(180), authorizedOfficialName: z.string().max(180).optional(), authorizedOfficialDesignation: z.string().max(160).optional(), chiefAccountantName: z.string().max(180).optional(), defaultNoticeSignatory: z.string().max(180).optional(), sessionTimeoutMinutes: z.number().int().min(5).max(240).optional(), enableInAppNotifications: z.boolean().optional(), notificationRefreshSeconds: z.number().int().min(10).max(120).optional() })).mutation(({ ctx, input }) => { assertRole(normalizeProcurementRole(ctx.user.role), ["admin"]); return updateProcurementSettings(input, ctx.user); }),
      users: protectedProcedure.query(({ ctx }) => { assertRole(normalizeProcurementRole(ctx.user.role), ["admin"]); return listUserProfiles(); }),
      updateUserRole: protectedProcedure.input(z.object({ userId: z.number().int().positive(), role: z.enum(["end_user", "procurement_officer", "administrative_approver", "admin"]) })).mutation(({ ctx, input }) => { assertRole(normalizeProcurementRole(ctx.user.role), ["admin"]); return updateUserProcurementRole(input.userId, input.role, ctx.user); }),
    }),
    bestValuePolicy: router({
      active: protectedProcedure.query(({ ctx }) => { assertRole(normalizeProcurementRole(ctx.user.role), ["admin"]); return getBestValuePolicy(); }),
      history: protectedProcedure.query(({ ctx }) => { assertRole(normalizeProcurementRole(ctx.user.role), ["admin"]); return getBestValuePolicyHistory(); }),
      save: protectedProcedure.input(z.object({
        name: z.string().min(3).max(180),
        criteria: z.array(z.object({ criterionKey: z.enum(BEST_VALUE_CRITERION_KEYS), weight: z.number().min(0).max(100) })).length(BEST_VALUE_CRITERION_KEYS.length),
      })).mutation(({ ctx, input }) => { assertRole(normalizeProcurementRole(ctx.user.role), ["admin"]); return saveBestValuePolicy(input, ctx.user); }),
    }),
    supplierTags: router({
      list: protectedProcedure.query(() => getSupplierTagData()),
      create: protectedProcedure.input(z.object({ name: z.string().min(2).max(120), description: z.string().max(320).optional() })).mutation(({ ctx, input }) => { assertRole(normalizeProcurementRole(ctx.user.role), ["procurement_officer", "admin"]); return createSupplierTag(input, ctx.user); }),
      setForSupplier: protectedProcedure.input(z.object({ supplierId: z.number().int().positive(), tagIds: z.array(z.number().int().positive()).max(30) })).mutation(({ ctx, input }) => { assertRole(normalizeProcurementRole(ctx.user.role), ["procurement_officer", "admin"]); return setSupplierTags(input, ctx.user); }),
    }),
    catalog: router({
      list: protectedProcedure.input(z.object({ search: z.string().max(120).optional(), codeFamily: z.string().regex(/^\d{2}$/).optional(), page: z.number().int().positive().optional(), limit: z.number().int().positive().max(100).optional() }).optional()).query(({ input }) => listProcurementCatalogItems(input)),
      get: protectedProcedure.input(z.object({ catalogItemId: z.number().int().positive() })).query(({ input }) => getProcurementCatalogItem(input.catalogItemId)),
      codeFamilies: protectedProcedure.query(() => listProcurementCatalogCodeFamilies()),
      favorites: protectedProcedure.query(({ ctx }) => listProcurementCatalogFavorites(ctx.user)),
      setFavorite: protectedProcedure.input(z.object({ catalogItemId: z.number().int().positive(), isFavorite: z.boolean() })).mutation(({ ctx, input }) => setProcurementCatalogFavorite(input, ctx.user)),
    }),
    testRecords: router({
      list: protectedProcedure.query(({ ctx }) => { assertRole(normalizeProcurementRole(ctx.user.role), ["admin"]); return listAdminTestRecordPackages(); }),
      archive: protectedProcedure.input(z.object({ ppmpEntryId: z.number().int().positive(), reason: z.string().min(12).max(1000) })).mutation(({ ctx, input }) => { assertRole(normalizeProcurementRole(ctx.user.role), ["admin"]); return archiveTestRecordPackage(input, ctx.user); }),
      cleanup: protectedProcedure.input(z.object({ ppmpEntryId: z.number().int().positive() })).mutation(({ ctx, input }) => { assertRole(normalizeProcurementRole(ctx.user.role), ["admin"]); return cleanupArchivedTestRecordPackage(input.ppmpEntryId, ctx.user); }),
    }),
    purchaseRequests: router({
      list: protectedProcedure.query(({ ctx }) => listPurchaseRequests(ctx.user)),
      detail: protectedProcedure.input(z.object({ purchaseRequestId: z.number().int().positive() })).query(({ ctx, input }) => getPurchaseRequestDetail(input.purchaseRequestId, ctx.user)),
      signatories: protectedProcedure.query(() => listPurchaseRequestSignatories()),
      create: protectedProcedure.input(z.object({ purpose: z.string().min(10), fundSource: z.string().max(160).optional(), fundCluster: z.string().max(80).optional(), responsibilityCenterCode: z.string().max(80).optional(), requesterDesignation: z.string().max(160).optional(), requestedSignatoryId: z.number().int().positive().optional(), approvedSignatoryId: z.number().int().positive().optional(), ppmpEntryId: z.number().int().positive().optional(), officeId: z.number().int().positive(), objectOfExpenditureId: z.number().int().positive(), items: z.array(z.object({ catalogItemId: z.number().int().positive().optional(), stockPropertyNo: z.string().max(80).optional(), description: z.string().min(2), specification: z.string().optional(), quantity: z.number().positive(), unit: z.string().min(1), estimatedUnitCost: z.number().positive() })).min(1) })).mutation(({ ctx, input }) => {
        assertRole(normalizeProcurementRole(ctx.user.role), ["end_user"]);
        return createPurchaseRequest(input, ctx.user);
      }),
      advance: protectedProcedure.input(z.object({ purchaseRequestId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
        const role = normalizeProcurementRole(ctx.user.role);
        const records = await listPurchaseRequests(role === "end_user" ? ctx.user : { ...ctx.user, role: "admin" });
        const pr = records.find((record) => record.id === input.purchaseRequestId);
        if (!pr) throw new TRPCError({ code: "NOT_FOUND", message: "Purchase Request not found." });
        if (role === "end_user" && pr.requestedById !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "End-Users may act only on their own Purchase Requests." });
        const nextStatus = getNextPrStatus(pr.status, role);
        if (!nextStatus) throw new TRPCError({ code: "CONFLICT", message: "The Purchase Request cannot advance at your role or its current workflow stage." });
        return advancePurchaseRequest({ purchaseRequestId: pr.id, nextStatus }, ctx.user);
      }),
    }),
    preCanvasses: router({
      create: protectedProcedure.input(z.object({ purchaseRequestId: z.number().int().positive(), approvedBudget: z.number().positive().optional(), quotationDeadline: z.coerce.date().optional(), deliveryPeriodDays: z.number().int().positive().max(365).optional(), priceEvaluationMode: z.enum(["lot_basis", "per_item"]).optional() })).mutation(async ({ ctx, input }) => {
        assertRole(normalizeProcurementRole(ctx.user.role), ["end_user"]);
        const result = await createPreCanvass(input, ctx.user);
        void publishProcurementRealtimeUpdate("pre_canvass");
        return result;
      }),
      addQuote: protectedProcedure.input(z.object({ preCanvassId: z.number().int().positive(), supplierId: z.number().int().positive(), totalPrice: z.number().positive(), deliveryDays: z.number().int().nonnegative(), isCompliant: z.boolean(), quotationReference: z.string().max(80).optional(), supplierRepresentative: z.string().max(160).optional(), acknowledgedAt: z.coerce.date().optional(), receivedBy: z.string().max(160).optional(), notes: z.string().optional() })).mutation(async ({ ctx, input }) => {
        assertRole(normalizeProcurementRole(ctx.user.role), ["end_user"]);
        const result = await addPreCanvassQuote(input, ctx.user);
        void publishProcurementRealtimeUpdate("pre_canvass");
        return result;
      }),
      submit: protectedProcedure.input(z.object({ preCanvassId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
        assertRole(normalizeProcurementRole(ctx.user.role), ["end_user"]);
        const result = await submitPreCanvass(input.preCanvassId, ctx.user);
        await recordPreCanvassResubmission(input.preCanvassId, ctx.user);
        void publishProcurementRealtimeUpdate("pre_canvass");
        return result;
      }),
      requestCorrection: protectedProcedure.input(z.object({ preCanvassId: z.number().int().positive(), reason: z.string().min(10).max(1000) })).mutation(async ({ ctx, input }) => {
        assertRole(normalizeProcurementRole(ctx.user.role), ["procurement_officer"]);
        const result = await requestPreCanvassCorrection(input, ctx.user);
        void publishProcurementRealtimeUpdate("pre_canvass");
        return result;
      }),
      returnAbstract: protectedProcedure.input(z.object({ preCanvassId: z.number().int().positive(), reason: z.string().min(10).max(1000) })).mutation(async ({ ctx, input }) => {
        assertRole(normalizeProcurementRole(ctx.user.role), ["administrative_approver"]);
        const result = await requestAbstractCorrection(input, ctx.user);
        void publishProcurementRealtimeUpdate("abstract_of_canvass");
        return result;
      }),
      resubmitAbstract: protectedProcedure.input(z.object({ preCanvassId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
        assertRole(normalizeProcurementRole(ctx.user.role), ["procurement_officer"]);
        const result = await resubmitAbstract(input.preCanvassId, ctx.user);
        void publishProcurementRealtimeUpdate("abstract_of_canvass");
        return result;
      }),
      createAbstract: protectedProcedure.input(z.object({ preCanvassId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
        assertRole(normalizeProcurementRole(ctx.user.role), ["procurement_officer"]);
        const result = await createAbstractOfCanvass(input.preCanvassId, ctx.user);
        await notifyRoles(["administrative_approver"], { kind: "action_required", title: "Abstract of Canvass awaiting decision", body: "A Procurement Officer recommendation is ready for administrative review.", entityType: "pre_canvass", entityId: input.preCanvassId });
        void publishProcurementRealtimeUpdate("pre_canvass");
        void publishProcurementRealtimeUpdate("abstract_of_canvass");
        return result;
      }),
      decideAbstract: protectedProcedure.input(z.object({ preCanvassId: z.number().int().positive(), decision: z.enum(["approved", "rejected"]), remarks: z.string().max(1000).optional() })).mutation(async ({ ctx, input }) => {
        assertRole(normalizeProcurementRole(ctx.user.role), ["administrative_approver"]);
        const result = await decideAbstractOfCanvass(input, ctx.user);
        await notifyRoles(["procurement_officer"], { kind: "status_change", title: `Abstract ${input.decision}`, body: input.remarks || "The Administrative Approver recorded a decision on the Abstract of Canvass.", entityType: "pre_canvass", entityId: input.preCanvassId });
        void publishProcurementRealtimeUpdate("pre_canvass");
        void publishProcurementRealtimeUpdate("abstract_of_canvass");
        return result;
      }),
      issuePurchaseOrder: protectedProcedure.input(z.object({ preCanvassId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
        assertRole(normalizeProcurementRole(ctx.user.role), ["procurement_officer"]);
        const result = await createPurchaseOrderFromPreCanvass(input.preCanvassId, ctx.user);
        await notifyRoles(["administrative_approver"], { kind: "status_change", title: "Purchase Order issued", body: "A Purchase Order was issued from an approved Abstract of Canvass.", entityType: "purchase_order", entityId: result.id });
        return result;
      }),
      returnPurchaseOrder: protectedProcedure.input(z.object({ purchaseOrderId: z.number().int().positive(), reason: z.string().min(10).max(1000) })).mutation(({ ctx, input }) => {
        assertRole(normalizeProcurementRole(ctx.user.role), ["administrative_approver"]);
        return requestPurchaseOrderCorrection(input, ctx.user);
      }),
      reissuePurchaseOrder: protectedProcedure.input(z.object({ purchaseOrderId: z.number().int().positive() })).mutation(({ ctx, input }) => {
        assertRole(normalizeProcurementRole(ctx.user.role), ["procurement_officer"]);
        return resubmitPurchaseOrder(input.purchaseOrderId, ctx.user);
      }),
      calculateMcdm: protectedProcedure.input(z.object({ preCanvassId: z.number().int().positive() })).mutation(({ ctx, input }) => {
        assertRole(normalizeProcurementRole(ctx.user.role), ["procurement_officer"]);
        return createMcdmRecommendation(input.preCanvassId, ctx.user);
      }),
      createRfqFromMcdm: protectedProcedure.input(z.object({ preCanvassId: z.number().int().positive() })).mutation(({ ctx, input }) => {
        assertRole(normalizeProcurementRole(ctx.user.role), ["procurement_officer"]);
        return createRfqFromPreCanvass(input.preCanvassId, ctx.user);
      }),
      recordDelivery: protectedProcedure.input(z.object({ purchaseOrderId: z.number().int().positive(), receiptNumber: z.string().min(3).max(40), receivedByName: z.string().max(180).optional(), deliveryStatus: z.enum(["complete", "partial"]).optional(), signatureReference: z.string().max(1000).optional(), remarks: z.string().max(1000).optional() })).mutation(({ ctx, input }) => {
        assertRole(normalizeProcurementRole(ctx.user.role), ["procurement_officer"]);
        return recordDelivery(input, ctx.user);
      }),
      logPmr: protectedProcedure.input(z.object({ purchaseOrderId: z.number().int().positive(), pmrNumber: z.string().min(3).max(40), remarks: z.string().max(1000).optional() })).mutation(({ ctx, input }) => {
        assertRole(normalizeProcurementRole(ctx.user.role), ["procurement_officer"]);
        return logPmr(input, ctx.user);
      }),
    }),
    documents: router({
      attach: protectedProcedure.input(z.object({ entityType: z.enum(["app_ppmp_entry", "purchase_request", "pre_canvass", "pre_canvass_quote", "abstract_of_canvass", "purchase_order", "delivery_receipt", "pmr_log"]), entityId: z.number().int().positive(), documentType: z.string().min(2).max(80), originalFileName: z.string().min(1).max(255), mimeType: z.string().min(3).max(120), dataBase64: z.string().min(4).max(14_000_000) })).mutation(({ ctx, input }) => createProcurementDocument(input, ctx.user)),
    }),
    notifications: router({
      list: protectedProcedure.query(({ ctx }) => listWorkflowNotifications(ctx.user)),
      markRead: protectedProcedure.input(z.object({ notificationId: z.number().int().positive() })).mutation(({ ctx, input }) => markWorkflowNotificationRead(input.notificationId, ctx.user)),
    }),
    rfqs: router({
      createFromPurchaseRequest: protectedProcedure.input(z.object({ purchaseRequestId: z.number().int().positive() })).mutation(({ ctx, input }) => {
        assertRole(normalizeProcurementRole(ctx.user.role), ["procurement_officer"]);
        return createRfqFromPurchaseRequest(input.purchaseRequestId, ctx.user);
      }),
      addQuotation: protectedProcedure.input(z.object({ rfqId: z.number().int().positive(), supplierId: z.number().int().positive(), totalPrice: z.number().positive(), deliveryDays: z.number().int().nonnegative(), isCompliant: z.boolean(), notes: z.string().optional() })).mutation(({ ctx, input }) => {
        assertRole(normalizeProcurementRole(ctx.user.role), ["procurement_officer"]);
        return addSupplierQuotation(input, ctx.user);
      }),
      generateAbstract: protectedProcedure.input(z.object({ rfqId: z.number().int().positive() })).mutation(({ ctx, input }) => {
        assertRole(normalizeProcurementRole(ctx.user.role), ["procurement_officer"]);
        return createQuotationAbstract(input.rfqId, ctx.user);
      }),
      approveAbstract: protectedProcedure.input(z.object({ rfqId: z.number().int().positive() })).mutation(({ ctx, input }) => {
        assertRole(normalizeProcurementRole(ctx.user.role), ["administrative_approver"]);
        return approveQuotationAbstract(input.rfqId, ctx.user);
      }),
      createPurchaseOrder: protectedProcedure.input(z.object({ rfqId: z.number().int().positive() })).mutation(({ ctx, input }) => {
        assertRole(normalizeProcurementRole(ctx.user.role), ["procurement_officer"]);
        return createPurchaseOrder(input.rfqId, ctx.user);
      }),
    }),
    officer: router({
      notices: router({
        list: protectedProcedure.query(({ ctx }) => { assertRole(normalizeProcurementRole(ctx.user.role), ["procurement_officer"]); return listLettersOfNotice(); }),
        create: protectedProcedure.input(z.object({ noticeType: z.enum(["award", "disqualification", "clarification", "other"]), purchaseRequestId: z.number().int().positive().optional(), supplierId: z.number().int().positive().optional(), subject: z.string().min(3).max(220), body: z.string().min(10).max(5000), issueNow: z.boolean().optional() })).mutation(({ ctx, input }) => { assertRole(normalizeProcurementRole(ctx.user.role), ["procurement_officer"]); return createLetterOfNotice(input, ctx.user); }),
      }),
      transmittals: router({
        list: protectedProcedure.query(({ ctx }) => { assertRole(normalizeProcurementRole(ctx.user.role), ["procurement_officer"]); return listBacTransmittals(); }),
        create: protectedProcedure.input(z.object({ purchaseRequestId: z.number().int().positive().optional(), fromOffice: z.string().min(3).max(180), toOffice: z.string().min(3).max(180), subject: z.string().min(3).max(220), remarks: z.string().max(5000).optional(), sendNow: z.boolean().optional() })).mutation(({ ctx, input }) => { assertRole(normalizeProcurementRole(ctx.user.role), ["procurement_officer"]); return createBacTransmittal(input, ctx.user); }),
        acknowledge: protectedProcedure.input(z.object({ transmittalId: z.number().int().positive(), acknowledgedByName: z.string().min(3).max(180) })).mutation(({ ctx, input }) => { assertRole(normalizeProcurementRole(ctx.user.role), ["procurement_officer"]); return acknowledgeBacTransmittal(input, ctx.user); }),
      }),
      supplierEvaluations: router({
        list: protectedProcedure.query(({ ctx }) => { assertRole(normalizeProcurementRole(ctx.user.role), ["procurement_officer", "admin"]); return listSupplierEvaluations(); }),
        mine: protectedProcedure.query(({ ctx }) => { assertRole(normalizeProcurementRole(ctx.user.role), ["end_user"]); return listSupplierEvaluationsForEndUser(ctx.user); }),
        eligibleOrders: protectedProcedure.query(({ ctx }) => { assertRole(normalizeProcurementRole(ctx.user.role), ["end_user"]); return listEligibleSupplierEvaluationOrders(ctx.user); }),
        pendingApprovals: protectedProcedure.query(({ ctx }) => { assertRole(normalizeProcurementRole(ctx.user.role), ["administrative_approver", "admin"]); return listPendingSupplierEvaluationApprovals(); }),
        signApproval: protectedProcedure.input(z.object({ supplierEvaluationId: z.number().int().positive(), approverDesignation: z.string().min(2).max(180) })).mutation(({ ctx, input }) => { assertRole(normalizeProcurementRole(ctx.user.role), ["administrative_approver", "admin"]); return signSupplierEvaluation(input, ctx.user); }),
        create: protectedProcedure.input(z.object({ supplierId: z.number().int().positive(), purchaseOrderId: z.number().int().positive().optional(), qualityScore: z.number().int().min(1).max(5), deliveryScore: z.number().int().min(1).max(5), pricingScore: z.number().int().min(1).max(5), complianceScore: z.number().int().min(1).max(5), remarks: z.string().max(3000).optional() })).mutation(({ ctx, input }) => { assertRole(normalizeProcurementRole(ctx.user.role), ["procurement_officer", "admin"]); return createSupplierEvaluation(input, ctx.user); }),
        update: protectedProcedure.input(z.object({ evaluationId: z.number().int().positive(), qualityScore: z.number().int().min(1).max(5), deliveryScore: z.number().int().min(1).max(5), pricingScore: z.number().int().min(1).max(5), complianceScore: z.number().int().min(1).max(5), remarks: z.string().max(3000).optional() })).mutation(({ ctx, input }) => { assertRole(normalizeProcurementRole(ctx.user.role), ["procurement_officer", "admin"]); return updateSupplierEvaluation(input, ctx.user); }),
        submitEndUserForm: protectedProcedure.input(z.object({ supplierId: z.number().int().positive(), purchaseOrderId: z.number().int().positive(), goodsServicesType: z.string().min(2).max(220), responseScores: z.record(z.string().min(1).max(80), z.number().int().min(1).max(4)), remarks: z.string().max(3000).optional(), respondentName: z.string().min(2).max(180) })).mutation(({ ctx, input }) => { assertRole(normalizeProcurementRole(ctx.user.role), ["end_user"]); return createSupplierEvaluationForm(input, "end_user", ctx.user); }),
        submitProcurementOfficeForm: protectedProcedure.input(z.object({ supplierId: z.number().int().positive(), purchaseOrderId: z.number().int().positive(), supplierRegistryReference: z.string().max(160).optional(), supplierRegistryRegisteredAt: z.coerce.date().optional(), supplierRegistryExpiresAt: z.coerce.date().optional(), reportedPurchaseRequestNumber: z.string().min(2).max(80).optional(), urgentPurchaseRequestReason: z.string().min(8).max(1000).optional(), responseScores: z.record(z.string().min(1).max(80), z.number().int().min(1).max(4)), remarks: z.string().max(3000).optional(), respondentName: z.string().min(2).max(180) })).mutation(({ ctx, input }) => { assertRole(normalizeProcurementRole(ctx.user.role), ["procurement_officer", "admin"]); return createSupplierEvaluationForm(input, "procurement_office", ctx.user); }),
      }),
      forecast: router({
        get: protectedProcedure.query(({ ctx }) => { assertRole(normalizeProcurementRole(ctx.user.role), ["procurement_officer"]); return getProcurementForecast(); }),
        recordHistoricalPrice: protectedProcedure.input(z.object({ itemDescription: z.string().min(2).max(220), unit: z.string().min(1).max(40), unitPrice: z.number().positive(), supplierId: z.number().int().positive().optional(), purchaseOrderId: z.number().int().positive().optional(), observedAt: z.coerce.date().optional() })).mutation(({ ctx, input }) => { assertRole(normalizeProcurementRole(ctx.user.role), ["procurement_officer"]); return recordHistoricalPrice(input, ctx.user); }),
      }),
    }),
    publicTracking: router({ lookup: publicProcedure.input(z.object({ token: z.string().min(16).max(48) })).query(({ input }) => getPublicPurchaseRequestTracking(input.token)) }),
  }),
});

export type AppRouter = typeof appRouter;
