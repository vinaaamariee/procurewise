import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { addSupplierQuotation, advancePurchaseRequest, approveQuotationAbstract, createAppPpmpEntry, createBudgetAllotment, createObjectOfExpenditure, createOffice, createPurchaseOrder, createPurchaseRequest, createQuotationAbstract, createRfqFromPurchaseRequest, createSupplier, getBudgetUtilization, getProcurementDashboard, getWorkspaceSetup, listPurchaseRequests, listUserProfiles, updateUserProcurementRole } from "./db";
import { getNextPrStatus, normalizeProcurementRole, roleCanAct, type ProcurementRole } from "../shared/procurementRules";

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
    setup: router({
      details: protectedProcedure.query(() => getWorkspaceSetup()),
      budgetUtilization: protectedProcedure.query(({ ctx }) => { assertRole(normalizeProcurementRole(ctx.user.role), ["budget_officer", "admin"]); return getBudgetUtilization(); }),
      createOffice: protectedProcedure.input(z.object({ code: z.string().min(2).max(32), name: z.string().min(3).max(160) })).mutation(({ ctx, input }) => { assertRole(normalizeProcurementRole(ctx.user.role), ["admin"]); return createOffice(input, ctx.user); }),
      createObjectOfExpenditure: protectedProcedure.input(z.object({ code: z.string().min(2).max(32), name: z.string().min(3).max(180) })).mutation(({ ctx, input }) => { assertRole(normalizeProcurementRole(ctx.user.role), ["admin"]); return createObjectOfExpenditure(input, ctx.user); }),
      createBudgetAllotment: protectedProcedure.input(z.object({ officeId: z.number().int().positive(), objectOfExpenditureId: z.number().int().positive(), fiscalYear: z.number().int().min(2020).max(2100), allottedAmount: z.number().positive() })).mutation(({ ctx, input }) => { assertRole(normalizeProcurementRole(ctx.user.role), ["budget_officer", "admin"]); return createBudgetAllotment(input, ctx.user); }),
      createSupplier: protectedProcedure.input(z.object({ supplierCode: z.string().min(2).max(40), companyName: z.string().min(3).max(180), contactPerson: z.string().max(140).optional(), email: z.string().email().optional().or(z.literal("")), phone: z.string().max(80).optional(), address: z.string().optional(), offerings: z.string().optional(), accreditationStatus: z.enum(["pending", "accredited", "suspended"]) })).mutation(({ ctx, input }) => { assertRole(normalizeProcurementRole(ctx.user.role), ["supply_officer", "admin"]); return createSupplier(input, ctx.user); }),
      createAppPpmpEntry: protectedProcedure.input(z.object({ fiscalYear: z.number().int().min(2020).max(2100), officeId: z.number().int().positive(), objectOfExpenditureId: z.number().int().positive(), description: z.string().min(3), plannedAmount: z.number().positive() })).mutation(({ ctx, input }) => { assertRole(normalizeProcurementRole(ctx.user.role), ["budget_officer", "admin"]); return createAppPpmpEntry(input, ctx.user); }),
      users: protectedProcedure.query(({ ctx }) => { assertRole(normalizeProcurementRole(ctx.user.role), ["admin"]); return listUserProfiles(); }),
      updateUserRole: protectedProcedure.input(z.object({ userId: z.number().int().positive(), role: z.enum(["end_user", "bac", "supply_officer", "budget_officer", "admin"]) })).mutation(({ ctx, input }) => { assertRole(normalizeProcurementRole(ctx.user.role), ["admin"]); return updateUserProcurementRole(input.userId, input.role, ctx.user); }),
    }),
    purchaseRequests: router({
      list: protectedProcedure.query(({ ctx }) => listPurchaseRequests(ctx.user)),
      create: protectedProcedure.input(z.object({ purpose: z.string().min(10), fundSource: z.string().max(160).optional(), officeId: z.number().int().positive(), objectOfExpenditureId: z.number().int().positive(), items: z.array(z.object({ description: z.string().min(2), specification: z.string().optional(), quantity: z.number().positive(), unit: z.string().min(1), estimatedUnitCost: z.number().positive() })).min(1) })).mutation(({ ctx, input }) => {
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
    rfqs: router({
      createFromPurchaseRequest: protectedProcedure.input(z.object({ purchaseRequestId: z.number().int().positive() })).mutation(({ ctx, input }) => {
        assertRole(normalizeProcurementRole(ctx.user.role), ["supply_officer"]);
        return createRfqFromPurchaseRequest(input.purchaseRequestId, ctx.user);
      }),
      addQuotation: protectedProcedure.input(z.object({ rfqId: z.number().int().positive(), supplierId: z.number().int().positive(), totalPrice: z.number().positive(), deliveryDays: z.number().int().nonnegative(), isCompliant: z.boolean(), notes: z.string().optional() })).mutation(({ ctx, input }) => {
        assertRole(normalizeProcurementRole(ctx.user.role), ["supply_officer"]);
        return addSupplierQuotation(input, ctx.user);
      }),
      generateAbstract: protectedProcedure.input(z.object({ rfqId: z.number().int().positive() })).mutation(({ ctx, input }) => {
        assertRole(normalizeProcurementRole(ctx.user.role), ["supply_officer"]);
        return createQuotationAbstract(input.rfqId, ctx.user);
      }),
      approveAbstract: protectedProcedure.input(z.object({ rfqId: z.number().int().positive() })).mutation(({ ctx, input }) => {
        assertRole(normalizeProcurementRole(ctx.user.role), ["bac"]);
        return approveQuotationAbstract(input.rfqId, ctx.user);
      }),
      createPurchaseOrder: protectedProcedure.input(z.object({ rfqId: z.number().int().positive() })).mutation(({ ctx, input }) => {
        assertRole(normalizeProcurementRole(ctx.user.role), ["supply_officer"]);
        return createPurchaseOrder(input.rfqId, ctx.user);
      }),
    }),
  }),
});

export type AppRouter = typeof appRouter;
