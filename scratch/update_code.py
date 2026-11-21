import os

def update_db():
    path = "server/db.ts"
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    # 1. advancePurchaseRequest: don't require 3 quotes for advancing to procurement_review
    target1 = """    const [preCanvass] = await db.select().from(preCanvasses).where(eq(preCanvasses.purchaseRequestId, pr.id)).limit(1);
    if (!preCanvass) throw new Error("Submit a complete three-supplier Pre-Canvass before forwarding the procurement package.");

    const quotes = await db.select().from(preCanvassQuotes).where(eq(preCanvassQuotes.preCanvassId, preCanvass.id));
    const validQuotes = getValidPreCanvassQuotes(quotes);
    if (!hasRequiredSupplierQuotations(validQuotes.length)) {
      throw new Error("Submit a complete three-supplier Pre-Canvass before forwarding the procurement package.");
    }
    await requirePreliminaryQuotationAttachment(db, preCanvass.id);

    if (preCanvass.status === "draft") {
      await db.update(preCanvasses).set({ status: "submitted", updatedAt: new Date() }).where(eq(preCanvasses.id, preCanvass.id));
      await recordAudit({
        entityType: "pre_canvass",
        entityId: preCanvass.id,
        action: "submitted_to_procurement",
        performedById: user.id,
        performedByRole: normalizeProcurementRole(user.role),
        details: { quoteCount: validQuotes.length, autoSubmittedOnPrForward: true },
      });
    } else if (preCanvass.status !== "submitted" && preCanvass.status !== "abstracted" && preCanvass.status !== "approved") {
      throw new Error(`The linked Pre-Canvass is currently in "${preCanvass.status}" status and cannot be forwarded.`);
    }"""

    replacement1 = """    const [preCanvass] = await db.select().from(preCanvasses).where(eq(preCanvasses.purchaseRequestId, pr.id)).limit(1);
    if (preCanvass && preCanvass.status === "draft") {
      await db.update(preCanvasses).set({ status: "submitted", updatedAt: new Date() }).where(eq(preCanvasses.id, preCanvass.id));
      await recordAudit({
        entityType: "pre_canvass",
        entityId: preCanvass.id,
        action: "submitted_to_procurement",
        performedById: user.id,
        performedByRole: normalizeProcurementRole(user.role),
        details: { autoSubmittedOnPrForward: true },
      });
    }"""

    # Normalize newlines for matching
    content_norm = content.replace("\r\n", "\n")
    if target1 not in content_norm:
        print("ERROR: target1 not found in server/db.ts")
    else:
        content_norm = content_norm.replace(target1, replacement1)
        print("SUCCESS: target1 replaced in server/db.ts")

    # 2. createPreCanvass role check
    target2 = """export async function createPreCanvass(input: { purchaseRequestId: number; approvedBudget?: number; quotationDeadline?: Date; deliveryPeriodDays?: number; priceEvaluationMode?: "lot_basis" | "per_item" }, user: User) {
  const db = await requireDb();
  const [pr] = await db.select().from(purchaseRequests).where(eq(purchaseRequests.id, input.purchaseRequestId)).limit(1);
  if (!pr || pr.requestedById !== user.id) throw new Error("End-Users may prepare a Pre-Canvass only for their own Purchase Request.");"""

    replacement2 = """export async function createPreCanvass(input: { purchaseRequestId: number; approvedBudget?: number; quotationDeadline?: Date; deliveryPeriodDays?: number; priceEvaluationMode?: "lot_basis" | "per_item" }, user: User) {
  const db = await requireDb();
  const [pr] = await db.select().from(purchaseRequests).where(eq(purchaseRequests.id, input.purchaseRequestId)).limit(1);
  const actorRole = normalizeProcurementRole(user.role);
  const isOfficerOrAdmin = roleCanAct(actorRole, ["procurement_officer", "procurement_officer_i", "procurement_officer_ii", "procurement_staff", "admin"]);
  if (!pr || (pr.requestedById !== user.id && !isOfficerOrAdmin)) throw new Error("You are not authorized to prepare a Pre-Canvass for this Purchase Request.");"""

    if target2 not in content_norm:
        print("ERROR: target2 not found in server/db.ts")
    else:
        content_norm = content_norm.replace(target2, replacement2)
        print("SUCCESS: target2 replaced in server/db.ts")

    # 3. addPreCanvassQuote role check
    target3 = """export async function addPreCanvassQuote(input: { preCanvassId: number; supplierId: number; totalPrice: number; deliveryDays: number; isCompliant: boolean; quotationReference?: string; supplierRepresentative?: string; acknowledgedAt?: Date; receivedBy?: string; notes?: string }, user: User) {
  const db = await requireDb();
  const [preCanvass] = await db.select().from(preCanvasses).where(eq(preCanvasses.id, input.preCanvassId)).limit(1);
  if (!preCanvass || preCanvass.preparedById !== user.id || preCanvass.status !== "draft") throw new Error("Supplier quotes may be entered only by the End-User before the Pre-Canvass is submitted.");"""

    replacement3 = """export async function addPreCanvassQuote(input: { preCanvassId: number; supplierId: number; totalPrice: number; deliveryDays: number; isCompliant: boolean; quotationReference?: string; supplierRepresentative?: string; acknowledgedAt?: Date; receivedBy?: string; notes?: string }, user: User) {
  const db = await requireDb();
  const [preCanvass] = await db.select().from(preCanvasses).where(eq(preCanvasses.id, input.preCanvassId)).limit(1);
  const actorRole = normalizeProcurementRole(user.role);
  const isOfficerOrAdmin = roleCanAct(actorRole, ["procurement_officer", "procurement_officer_i", "procurement_officer_ii", "procurement_staff", "admin"]);
  if (!preCanvass || (preCanvass.preparedById !== user.id && !isOfficerOrAdmin)) throw new Error("You are not authorized to enter supplier quotes for this Pre-Canvass.");"""

    if target3 not in content_norm:
        print("ERROR: target3 not found in server/db.ts")
    else:
        content_norm = content_norm.replace(target3, replacement3)
        print("SUCCESS: target3 replaced in server/db.ts")

    # 4. submitPreCanvass role check
    target4 = """export async function submitPreCanvass(preCanvassId: number, user: User, options?: ProcurementWorkflowOptions) {
  const db = options?.db ?? await requireDb();
  const recordAudit = options?.recordAudit ?? writeAuditEvent;
  const [preCanvass] = await db.select().from(preCanvasses).where(eq(preCanvasses.id, preCanvassId)).limit(1);
  if (!preCanvass || preCanvass.preparedById !== user.id || preCanvass.status !== "draft") throw new Error("This Pre-Canvass cannot be submitted by the current user.");"""

    replacement4 = """export async function submitPreCanvass(preCanvassId: number, user: User, options?: ProcurementWorkflowOptions) {
  const db = options?.db ?? await requireDb();
  const recordAudit = options?.recordAudit ?? writeAuditEvent;
  const [preCanvass] = await db.select().from(preCanvasses).where(eq(preCanvasses.id, preCanvassId)).limit(1);
  const actorRole = normalizeProcurementRole(user.role);
  const isOfficerOrAdmin = roleCanAct(actorRole, ["procurement_officer", "procurement_officer_i", "procurement_officer_ii", "procurement_staff", "admin"]);
  if (!preCanvass || (preCanvass.preparedById !== user.id && !isOfficerOrAdmin)) throw new Error("This Pre-Canvass cannot be submitted by the current user.");"""

    if target4 not in content_norm:
        print("ERROR: target4 not found in server/db.ts")
    else:
        content_norm = content_norm.replace(target4, replacement4)
        print("SUCCESS: target4 replaced in server/db.ts")

    # 5. preCanvassDoc lookup in listOfficerPrVerifications
    target5 = """    const preCanvassDoc =
      preCanvassDocuments.find((d) =>
        d.documentType.toLowerCase().includes("abstract") ||
        d.documentType.toLowerCase().includes("pre-canvass") ||
        d.documentType.toLowerCase().includes("preliminary")
      ) ||
      preCanvassDocuments[0] ||
      null;"""

    replacement5 = """    const preCanvassDoc =
      preCanvassDocuments.find((d) =>
        d.documentType.toLowerCase().includes("abstract") ||
        d.documentType.toLowerCase().includes("pre-canvass") ||
        d.documentType.toLowerCase().includes("preliminary")
      ) ||
      prDocuments.find((d) =>
        d.documentType.toLowerCase().includes("abstract") ||
        d.documentType.toLowerCase().includes("pre-canvass") ||
        d.documentType.toLowerCase().includes("preliminary")
      ) ||
      preCanvassDocuments[0] ||
      null;"""

    if target5 not in content_norm:
        print("ERROR: target5 not found in server/db.ts")
    else:
        content_norm = content_norm.replace(target5, replacement5)
        print("SUCCESS: target5 replaced in server/db.ts")

    with open(path, "w", encoding="utf-8") as f:
        f.write(content_norm)

def update_routers():
    path = "server/routers.ts"
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    content_norm = content.replace("\r\n", "\n")

    # Update preCanvasses create, addQuote, submit roles
    old_create = """      create: protectedProcedure.input(z.object({ purchaseRequestId: z.number().int().positive(), approvedBudget: z.number().positive().optional(), quotationDeadline: z.coerce.date().optional(), deliveryPeriodDays: z.number().int().positive().max(365).optional(), priceEvaluationMode: z.enum(["lot_basis", "per_item"]).optional() })).mutation(async ({ ctx, input }) => {
        assertRole(normalizeProcurementRole(ctx.user.role), ["end_user"]);"""

    new_create = """      create: protectedProcedure.input(z.object({ purchaseRequestId: z.number().int().positive(), approvedBudget: z.number().positive().optional(), quotationDeadline: z.coerce.date().optional(), deliveryPeriodDays: z.number().int().positive().max(365).optional(), priceEvaluationMode: z.enum(["lot_basis", "per_item"]).optional() })).mutation(async ({ ctx, input }) => {
        assertRole(normalizeProcurementRole(ctx.user.role), ["end_user", "procurement_officer", "procurement_officer_i", "procurement_officer_ii", "procurement_staff", "admin"]);"""

    old_add_quote = """      addQuote: protectedProcedure.input(z.object({ preCanvassId: z.number().int().positive(), supplierId: z.number().int().positive(), totalPrice: z.number().positive(), deliveryDays: z.number().int().nonnegative(), isCompliant: z.boolean(), quotationReference: z.string().max(80).optional(), supplierRepresentative: z.string().max(160).optional(), acknowledgedAt: z.coerce.date().optional(), receivedBy: z.string().max(160).optional(), notes: z.string().optional() })).mutation(async ({ ctx, input }) => {
        assertRole(normalizeProcurementRole(ctx.user.role), ["end_user"]);"""

    new_add_quote = """      addQuote: protectedProcedure.input(z.object({ preCanvassId: z.number().int().positive(), supplierId: z.number().int().positive(), totalPrice: z.number().positive(), deliveryDays: z.number().int().nonnegative(), isCompliant: z.boolean(), quotationReference: z.string().max(80).optional(), supplierRepresentative: z.string().max(160).optional(), acknowledgedAt: z.coerce.date().optional(), receivedBy: z.string().max(160).optional(), notes: z.string().optional() })).mutation(async ({ ctx, input }) => {
        assertRole(normalizeProcurementRole(ctx.user.role), ["end_user", "procurement_officer", "procurement_officer_i", "procurement_officer_ii", "procurement_staff", "admin"]);"""

    old_submit = """      submit: protectedProcedure.input(z.object({ preCanvassId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
        assertRole(normalizeProcurementRole(ctx.user.role), ["end_user"]);"""

    new_submit = """      submit: protectedProcedure.input(z.object({ preCanvassId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
        assertRole(normalizeProcurementRole(ctx.user.role), ["end_user", "procurement_officer", "procurement_officer_i", "procurement_officer_ii", "procurement_staff", "admin"]);"""

    if old_create in content_norm:
        content_norm = content_norm.replace(old_create, new_create)
        print("SUCCESS: routers.create updated")
    else:
        print("ERROR: old_create not found in routers.ts")

    if old_add_quote in content_norm:
        content_norm = content_norm.replace(old_add_quote, new_add_quote)
        print("SUCCESS: routers.addQuote updated")
    else:
        print("ERROR: old_add_quote not found in routers.ts")

    if old_submit in content_norm:
        content_norm = content_norm.replace(old_submit, new_submit)
        print("SUCCESS: routers.submit updated")
    else:
        print("ERROR: old_submit not found in routers.ts")

    with open(path, "w", encoding="utf-8") as f:
        f.write(content_norm)

if __name__ == "__main__":
    update_db()
    update_routers()
