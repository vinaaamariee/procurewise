import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/StatusBadge";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { filterSuppliersByTag } from "../../../shared/supplierTagging";
import { getValidPreCanvassQuotes, hasRequiredSupplierQuotations } from "../../../shared/procurementRules";
import { toast } from "sonner";
import { ArrowRight, CheckCircle2, ChevronRight, ClipboardCheck, FileCheck2, FileSearch, Info, LoaderCircle, Plus, Send, Sparkles, Store, Trash2 } from "lucide-react";

interface IntegratedPreCanvassModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchaseRequest: {
    id: number;
    prNumber: string;
    purpose: string;
    totalEstimate: string;
    officeId?: number;
    status: string;
  };
  onCompleted?: () => void;
}

export function IntegratedPreCanvassModal({
  open,
  onOpenChange,
  purchaseRequest,
  onCompleted,
}: IntegratedPreCanvassModalProps) {
  const utils = trpc.useUtils();
  const dashboard = trpc.procurement.dashboard.useQuery(undefined, { retry: false });
  const setup = trpc.procurement.setup.details.useQuery(undefined, { retry: false });
  const tagData = trpc.procurement.supplierTags.list.useQuery(undefined, { retry: false });

  // Find linked PreCanvass if already created
  const existingPreCanvass = useMemo(() => {
    return dashboard.data?.preCanvasses.find(
      (pc) => pc.purchaseRequestId === purchaseRequest.id
    );
  }, [dashboard.data?.preCanvasses, purchaseRequest.id]);

  const existingQuotes = useMemo(() => {
    if (!existingPreCanvass) return [];
    return getValidPreCanvassQuotes(
      dashboard.data?.preCanvassQuotes ?? [],
      existingPreCanvass.id
    );
  }, [dashboard.data?.preCanvassQuotes, existingPreCanvass]);

  // Form states for Pre-Canvass Settings
  const [quotationDeadline, setQuotationDeadline] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split("T")[0];
  });
  const [deliveryPeriodDays, setDeliveryPeriodDays] = useState<number>(30);
  const [priceEvaluationMode, setPriceEvaluationMode] = useState<"lot_basis" | "per_item">("lot_basis");

  // Form states for Add Quote
  const [supplierId, setSupplierId] = useState<string>("");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [totalPrice, setTotalPrice] = useState<string>("");
  const [deliveryDays, setDeliveryDays] = useState<string>("30");
  const [isCompliant, setIsCompliant] = useState<string>("yes");
  const [quotationReference, setQuotationReference] = useState<string>("");
  const [supplierRepresentative, setSupplierRepresentative] = useState<string>("");
  const [preliminaryAoqFile, setPreliminaryAoqFile] = useState<File | null>(null);

  const suppliers = setup.data?.suppliers ?? [];
  const filteredSuppliers = filterSuppliersByTag(
    suppliers,
    tagData.data?.assignments ?? [],
    tagFilter === "all" ? null : Number(tagFilter)
  );

  const supplierMap = useMemo(() => {
    return new Map(suppliers.map((s) => [s.id, s]));
  }, [suppliers]);

  // Mutations
  const createPreCanvassMutation = trpc.procurement.preCanvasses.create.useMutation({
    onSuccess: (created) => {
      toast.success("Pre-Canvass package initialized. You can now record 3 supplier quotes.");
      void utils.procurement.dashboard.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const addQuoteMutation = trpc.procurement.preCanvasses.addQuote.useMutation({
    onSuccess: () => {
      toast.success("Supplier quote recorded.");
      setSupplierId("");
      setTotalPrice("");
      setQuotationReference("");
      setSupplierRepresentative("");
      void utils.procurement.dashboard.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const submitPackageMutation = trpc.procurement.purchaseRequests.advance.useMutation({
    onSuccess: () => {
      toast.success("Complete procurement package forwarded to the Procurement Officer!");
      void utils.procurement.purchaseRequests.list.invalidate();
      void utils.procurement.dashboard.invalidate();
      onOpenChange(false);
      onCompleted?.();
    },
    onError: (err) => toast.error(err.message),
  });
  const attachDocumentMutation = trpc.procurement.documents.attach.useMutation({
    onSuccess: () => {
      toast.success("Pre-canvass attachment uploaded. The package is ready to forward.");
      setPreliminaryAoqFile(null);
      void utils.procurement.dashboard.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  // Handle initialization of Pre-Canvass
  const handleInitializeCanvass = () => {
    createPreCanvassMutation.mutate({
      purchaseRequestId: purchaseRequest.id,
      approvedBudget: Number(purchaseRequest.totalEstimate),
      quotationDeadline: quotationDeadline ? new Date(`${quotationDeadline}T00:00:00`) : undefined,
      deliveryPeriodDays: deliveryPeriodDays || 30,
      priceEvaluationMode,
    });
  };

  // Handle adding a quote
  const handleAddQuote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!existingPreCanvass) return;
    if (!supplierId || Number(totalPrice) <= 0) {
      toast.error("Please select a supplier and enter a valid quoted price.");
      return;
    }
    // Check if supplier already quoted
    if (existingQuotes.some((q) => q.supplierId === Number(supplierId))) {
      toast.error("This supplier has already provided a quote for this Pre-Canvass.");
      return;
    }

    addQuoteMutation.mutate({
      preCanvassId: existingPreCanvass.id,
      supplierId: Number(supplierId),
      totalPrice: Number(totalPrice),
      deliveryDays: Number(deliveryDays) || 30,
      isCompliant: isCompliant === "yes",
      quotationReference: quotationReference.trim() || undefined,
      supplierRepresentative: supplierRepresentative.trim() || undefined,
    });
  };

  // Handle Forward Package to Procurement
  const handleForwardToProcurement = () => {
    if (!hasPreliminaryAoq) {
      toast.error("Upload the preliminary quotation attachment before forwarding.");
      return;
    }
    submitPackageMutation.mutate({
      purchaseRequestId: purchaseRequest.id,
    });
  };

  const handleUploadPreliminaryAoq = async () => {
    if (!existingPreCanvass || !preliminaryAoqFile) {
      toast.error("Choose the preliminary quotation attachment first.");
      return;
    }
    if (preliminaryAoqFile.size > 10 * 1024 * 1024) {
      toast.error("The pre-canvass attachment must be 10 MB or smaller.");
      return;
    }
    const dataBase64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("The selected attachment could not be read."));
      reader.onload = () => {
        const result = String(reader.result || "");
        resolve(result.includes(",") ? result.split(",")[1] || "" : result);
      };
      reader.readAsDataURL(preliminaryAoqFile);
    });
    attachDocumentMutation.mutate({
      entityType: "pre_canvass",
      entityId: existingPreCanvass.id,
      documentType: "Preliminary Abstract of Quotations",
      originalFileName: preliminaryAoqFile.name,
      mimeType: preliminaryAoqFile.type || "application/octet-stream",
      dataBase64,
    });
  };

  const quotesCount = existingQuotes.length;
  const isReadyToForward = hasRequiredSupplierQuotations(quotesCount);
  const preliminaryAoqDocument = existingPreCanvass
    ? dashboard.data?.documents.find((document) =>
        document.entityType === "pre_canvass" &&
        document.entityId === existingPreCanvass.id &&
        document.documentType === "Preliminary Abstract of Quotations"
      )
    : undefined;
  const hasPreliminaryAoq = Boolean(preliminaryAoqDocument);
  const canForward = isReadyToForward && hasPreliminaryAoq;
  const modalProgress = !existingPreCanvass ? 15 : quotesCount === 0 ? 35 : quotesCount === 1 ? 50 : quotesCount === 2 ? 65 : hasPreliminaryAoq ? 100 : 85;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-4xl sm:max-w-4xl max-h-[90vh] overflow-y-auto border-border dark:border-[#46515c] dark:bg-[#1b2229] p-6">
        <DialogHeader className="border-b border-border dark:border-[#46515c] pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#f8f1e0] text-[#7b1e1e] dark:bg-[#3d2719] dark:text-[#f0c36a]">
                <FileSearch className="h-4 w-4" />
              </span>
              <div>
                <DialogTitle className="text-base font-semibold text-foreground">
                  Complete Supplier Canvass: {purchaseRequest.prNumber}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Follow government procurement guidelines: enter at least 3 supplier quotations before forwarding to Procurement.
                </DialogDescription>
              </div>
            </div>
            <StatusBadge tone={quotesCount >= 3 ? "approved" : "pending"}>
              {quotesCount}/3 Quotes
            </StatusBadge>
          </div>
        </DialogHeader>

        {/* PR Quick Summary Banner */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-[4px] border border-[#e8e2d7] bg-[#fdfcf9] px-4 py-2.5 text-xs dark:border-[#46515c] dark:bg-[#232c35]">
          <div>
            <span className="text-muted-foreground">Purpose: </span>
            <span className="font-semibold text-foreground">{purchaseRequest.purpose}</span>
          </div>
          <div>
            <span className="text-muted-foreground">ABC Ceiling: </span>
            <span className="font-bold text-[#7b1e1e] dark:text-[#ff837a]">
              ₱{Number(purchaseRequest.totalEstimate).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="mt-4 flex items-center justify-between gap-2 overflow-x-auto border-y border-border dark:border-[#46515c] py-2.5 px-2 text-xs whitespace-nowrap">
          <div className={`shrink-0 flex items-center gap-1.5 ${existingPreCanvass ? "text-[#27633b] font-semibold" : "text-[#7b1e1e] font-bold"}`}>
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#eff9f2] text-[#27633b] dark:bg-[#1a3824]">
              {existingPreCanvass ? "✓" : "1"}
            </span>
            <span>1. Canvass Terms</span>
          </div>
          <ChevronRight className="shrink-0 h-4 w-4 text-muted-foreground" />
          <div className={`shrink-0 flex items-center gap-1.5 ${quotesCount >= 3 ? "text-[#27633b] font-semibold" : existingPreCanvass ? "text-[#7b1e1e] font-bold" : "text-muted-foreground"}`}>
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#f5f3ee] dark:bg-[#232c35]">
              {quotesCount >= 3 ? "✓" : "2"}
            </span>
            <span>2. 3 Supplier Quotes ({quotesCount}/3)</span>
          </div>
          <ChevronRight className="shrink-0 h-4 w-4 text-muted-foreground" />
          <div className={`shrink-0 flex items-center gap-1.5 ${canForward ? "text-[#27633b] font-semibold" : isReadyToForward ? "text-[#7b1e1e] font-bold" : "text-muted-foreground"}`}>
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#f5f3ee] dark:bg-[#232c35]">
              {canForward ? "✓" : "3"}
            </span>
            <span>3. Attach &amp; forward</span>
          </div>
        </div>

        {/* Step Progress Bar */}
        <div className="mt-2.5 space-y-1">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Quotes and attachment progress</span>
            <span className="font-semibold text-foreground">
              {canForward ? "Ready to submit" : isReadyToForward ? "Attachment required" : `${quotesCount}/3 quotes recorded`}
            </span>
          </div>
          <Progress value={modalProgress} className="h-1.5" />
        </div>

        {/* Step 1: Initialize Pre-Canvass if not yet done */}
        {!existingPreCanvass ? (
          <div className="mt-4 space-y-4 rounded-[4px] border border-[#e4d4ae] bg-[#fffaf0] p-4 text-xs dark:border-[#635028] dark:bg-[#221c12]">
            <div className="flex items-start gap-2 text-[#72561d] dark:text-[#f0c36a]">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Step 1: Confirm Canvass Baseline</p>
                <p className="mt-1 leading-5 text-muted-foreground">
                  The approved budget ceiling is prefilled from your PR total (₱{Number(purchaseRequest.totalEstimate).toLocaleString("en-PH", { minimumFractionDigits: 2 })}). Set the quotation deadline and expected delivery period.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 pt-2">
              <div className="w-full min-w-0">
                <Label className="text-[11px] font-semibold">Quotation Deadline</Label>
                <Input
                  type="date"
                  value={quotationDeadline}
                  onChange={(e) => setQuotationDeadline(e.target.value)}
                  className="mt-1 h-8 text-xs w-full min-w-0"
                />
              </div>
              <div className="w-full min-w-0">
                <Label className="text-[11px] font-semibold">Delivery Period (Days)</Label>
                <Input
                  type="number"
                  min="1"
                  value={deliveryPeriodDays}
                  onChange={(e) => setDeliveryPeriodDays(Number(e.target.value))}
                  className="mt-1 h-8 text-xs w-full min-w-0"
                />
              </div>
              <div className="w-full min-w-0">
                <Label className="text-[11px] font-semibold">Evaluation Mode</Label>
                <Select value={priceEvaluationMode} onValueChange={(v: "lot_basis" | "per_item") => setPriceEvaluationMode(v)}>
                  <SelectTrigger className="mt-1 h-8 text-xs w-full min-w-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lot_basis">Lot basis (Whole PR)</SelectItem>
                    <SelectItem value="per_item">Per item basis</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="button"
                onClick={handleInitializeCanvass}
                disabled={createPreCanvassMutation.isPending}
                className="h-8 rounded-[4px] bg-[#7b1e1e] text-xs text-white hover:bg-[#641818]"
              >
                {createPreCanvassMutation.isPending && <LoaderCircle className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                Confirm & Record Supplier Quotes
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ) : (
          /* Step 2: Record 3 Supplier Quotes */
          <div className="mt-4 space-y-5">
            {/* List of current recorded quotes */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">
                  Recorded Supplier Quotes ({quotesCount}/3 required):
                </span>
                {quotesCount >= 3 && (
                  <span className="text-[11px] font-semibold text-[#27633b] flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Ready to submit
                  </span>
                )}
              </div>

              {quotesCount === 0 ? (
                <div className="rounded-[4px] border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                  No quotes recorded yet. Use the form below to enter quotes from 3 accredited suppliers.
                </div>
              ) : (
                <div className="grid gap-2">
                  {existingQuotes.map((quote, idx) => {
                    const supp = supplierMap.get(quote.supplierId);
                    return (
                      <div
                        key={quote.id}
                        className="flex items-center justify-between rounded-[4px] border border-border bg-[#fcfaf7] px-3.5 py-2 text-xs dark:border-[#46515c] dark:bg-[#232c35]"
                      >
                        <div className="flex items-center gap-2">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#f8f1e0] text-[10px] font-bold text-[#7b1e1e]">
                            {idx + 1}
                          </span>
                          <div>
                            <span className="font-semibold text-foreground">
                              {supp?.companyName || `Supplier #${quote.supplierId}`}
                            </span>
                            {quote.quotationReference && (
                              <span className="ml-2 text-[10px] text-muted-foreground">
                                Ref: {quote.quotationReference}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="font-bold text-[#7b1e1e] dark:text-[#ff837a]">
                            ₱{Number(quote.totalPrice).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {quote.deliveryDays} days
                          </span>
                          <StatusBadge tone={quote.isCompliant ? "approved" : "returned"}>
                            {quote.isCompliant ? "COMPLIANT" : "NON-COMPLIANT"}
                          </StatusBadge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quote entry form (if less than 3 or adding more) */}
            {quotesCount < 3 && (
              <form onSubmit={handleAddQuote} className="rounded-[4px] border border-border bg-[#faf9f6] p-4 text-xs dark:border-[#46515c] dark:bg-[#20272f]">
                <div className="flex items-center gap-1.5 font-semibold text-foreground mb-3">
                  <Plus className="h-4 w-4 text-[#7b1e1e]" />
                  <span>Add Supplier Quote #{quotesCount + 1}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Row 1, Col 1: Filter by Category */}
                  <div className="w-full min-w-0">
                    <Label className="text-[11px] font-semibold text-foreground">Filter by Category</Label>
                    <Select value={tagFilter} onValueChange={(v) => { setTagFilter(v); setSupplierId(""); }}>
                      <SelectTrigger className="mt-1 h-8 text-xs w-full min-w-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All registered suppliers</SelectItem>
                        {tagData.data?.tags.filter((t) => t.isActive === 1).map((tag) => (
                          <SelectItem key={tag.id} value={String(tag.id)}>
                            {tag.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Row 1, Col 2: Select Supplier * */}
                  <div className="w-full min-w-0">
                    <Label className="text-[11px] font-semibold text-foreground">
                      Select Supplier <span className="text-rose-600">*</span>
                    </Label>
                    <Select value={supplierId} onValueChange={setSupplierId}>
                      <SelectTrigger className="mt-1 h-8 text-xs w-full min-w-0">
                        <SelectValue placeholder="Choose supplier" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredSuppliers.map((s) => (
                          <SelectItem
                            key={s.id}
                            value={String(s.id)}
                            disabled={existingQuotes.some((q) => q.supplierId === s.id)}
                          >
                            {s.companyName} {existingQuotes.some((q) => q.supplierId === s.id) ? "(Added)" : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Row 1, Col 3: Quoted Total Price (₱) * */}
                  <div className="w-full min-w-0">
                    <Label className="text-[11px] font-semibold text-foreground">
                      Quoted Total Price (₱) <span className="text-rose-600">*</span>
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="0.00"
                      value={totalPrice}
                      onChange={(e) => setTotalPrice(e.target.value)}
                      className="mt-1 h-8 text-xs w-full min-w-0"
                    />
                  </div>

                  {/* Row 2, Col 1: Delivery Time (Days) */}
                  <div className="w-full min-w-0">
                    <Label className="text-[11px] font-semibold text-foreground">Delivery Time (Days)</Label>
                    <Input
                      type="number"
                      min="1"
                      value={deliveryDays}
                      onChange={(e) => setDeliveryDays(e.target.value)}
                      className="mt-1 h-8 text-xs w-full min-w-0"
                    />
                  </div>

                  {/* Row 2, Col 2: Compliance Status */}
                  <div className="w-full min-w-0">
                    <Label className="text-[11px] font-semibold text-foreground">Compliance Status</Label>
                    <Select value={isCompliant} onValueChange={setIsCompliant}>
                      <SelectTrigger className="mt-1 h-8 text-xs w-full min-w-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yes">Compliant</SelectItem>
                        <SelectItem value="no">Non-compliant</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Row 2, Col 3: Quote Reference / Invoice # */}
                  <div className="w-full min-w-0">
                    <Label className="text-[11px] font-semibold text-foreground">Quote Reference / Invoice #</Label>
                    <Input
                      placeholder="e.g. Q-2026-001"
                      value={quotationReference}
                      onChange={(e) => setQuotationReference(e.target.value)}
                      className="mt-1 h-8 text-xs w-full min-w-0"
                    />
                  </div>
                </div>

                {/* Full-width bottom action row aligned to the right */}
                <div className="mt-4 flex justify-end pt-3 border-t border-border/50">
                  <Button
                    type="submit"
                    size="sm"
                    disabled={addQuoteMutation.isPending || !supplierId || !totalPrice}
                    className="h-8 px-4 rounded-[4px] bg-[#7b1e1e] text-xs font-semibold text-white hover:bg-[#641818] flex items-center gap-1.5 shadow-sm"
                  >
                    {addQuoteMutation.isPending && <LoaderCircle className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                    <Plus className="h-3.5 w-3.5" />
                    <span>Record Quote #{quotesCount + 1}</span>
                  </Button>
                </div>
              </form>
            )}

            {/* Step 3: Attach the preliminary quotation document and forward */}
            {isReadyToForward && (
              <div className="rounded-[4px] border border-[#b7d8c4] bg-[#eff9f2] p-4 text-xs dark:border-[#27633b] dark:bg-[#14291a]">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-5 w-5 text-[#27633b] shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-bold text-[#1f4e2f] dark:text-[#a3e3b7]">
                      {canForward ? "Pre-Canvass complete" : `All ${quotesCount} supplier quotes recorded`}
                    </p>
                    <p className="mt-1 leading-5 text-[#2e5d3c] dark:text-[#c4ecd2]">
                      {canForward
                        ? "Your quotes and preliminary attachment are ready. Forward the complete package to Procurement for review."
                        : "Upload the preliminary quotation worksheet or document showing your three supplier quotes before forwarding this package."}
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-[4px] border border-[#d5c89f] bg-white p-3 dark:border-[#635028] dark:bg-[#1b2229]">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Label htmlFor="integrated-preliminary-aoq" className="text-xs font-semibold">
                      Preliminary quotation attachment <span className="text-rose-600">Required</span>
                    </Label>
                    {hasPreliminaryAoq && (
                      <StatusBadge tone="approved">ATTACHED</StatusBadge>
                    )}
                  </div>
                  <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
                    Upload the Excel or PDF worksheet that documents your three supplier quotes. Maximum size: 10 MB.
                  </p>
                  {preliminaryAoqDocument && (
                    <p className="mt-2 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                      Attached: {preliminaryAoqDocument.originalFileName}
                    </p>
                  )}
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Input
                      id="integrated-preliminary-aoq"
                      type="file"
                      accept=".xlsx,.xls,.pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,application/pdf"
                      onChange={(event) => setPreliminaryAoqFile(event.target.files?.[0] ?? null)}
                      className="h-9 min-w-0 text-[11px]"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!existingPreCanvass || !preliminaryAoqFile || attachDocumentMutation.isPending}
                      onClick={() => void handleUploadPreliminaryAoq()}
                      className="h-9 shrink-0 text-[11px]"
                    >
                      {attachDocumentMutation.isPending && <LoaderCircle className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                      Upload attachment
                    </Button>
                  </div>
                </div>

                <div className="mt-4 flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onOpenChange(false)}
                    className="h-8 text-xs"
                  >
                    Keep as Draft
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={submitPackageMutation.isPending || !canForward}
                    onClick={handleForwardToProcurement}
                    className="h-8 rounded-[4px] bg-[#27633b] text-xs text-white hover:bg-[#1f4e2f]"
                  >
                    {submitPackageMutation.isPending && <LoaderCircle className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                    <Send className="mr-1.5 h-3.5 w-3.5" />
                    Forward Complete Package to Procurement
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="mt-4 border-t border-border dark:border-[#46515c] pt-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
