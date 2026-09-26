import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/StatusBadge";
import { trpc } from "@/lib/trpc";
import { filterSuppliersByTag } from "../../../shared/supplierTagging";
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
    return (dashboard.data?.preCanvassQuotes ?? []).filter(
      (q) => q.preCanvassId === existingPreCanvass.id
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
    submitPackageMutation.mutate({
      purchaseRequestId: purchaseRequest.id,
    });
  };

  const quotesCount = existingQuotes.length;
  const isReadyToForward = quotesCount >= 3;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto border-border dark:border-[#46515c] dark:bg-[#1b2229]">
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
        <div className="mt-4 flex items-center justify-between border-y border-border dark:border-[#46515c] py-2.5 px-2 text-xs">
          <div className={`flex items-center gap-1.5 ${existingPreCanvass ? "text-[#27633b] font-semibold" : "text-[#7b1e1e] font-bold"}`}>
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#eff9f2] text-[#27633b] dark:bg-[#1a3824]">
              {existingPreCanvass ? "✓" : "1"}
            </span>
            <span>1. Canvass Terms</span>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <div className={`flex items-center gap-1.5 ${quotesCount >= 3 ? "text-[#27633b] font-semibold" : existingPreCanvass ? "text-[#7b1e1e] font-bold" : "text-muted-foreground"}`}>
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#f5f3ee] dark:bg-[#232c35]">
              {quotesCount >= 3 ? "✓" : "2"}
            </span>
            <span>2. 3 Supplier Quotes ({quotesCount}/3)</span>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <div className={`flex items-center gap-1.5 ${isReadyToForward ? "text-[#7b1e1e] font-bold" : "text-muted-foreground"}`}>
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#f5f3ee] dark:bg-[#232c35]">
              3
            </span>
            <span>3. Forward Package</span>
          </div>
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
              <div>
                <Label className="text-[11px] font-semibold">Quotation Deadline</Label>
                <Input
                  type="date"
                  value={quotationDeadline}
                  onChange={(e) => setQuotationDeadline(e.target.value)}
                  className="mt-1 h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-[11px] font-semibold">Delivery Period (Days)</Label>
                <Input
                  type="number"
                  min="1"
                  value={deliveryPeriodDays}
                  onChange={(e) => setDeliveryPeriodDays(Number(e.target.value))}
                  className="mt-1 h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-[11px] font-semibold">Evaluation Mode</Label>
                <Select value={priceEvaluationMode} onValueChange={(v: "lot_basis" | "per_item") => setPriceEvaluationMode(v)}>
                  <SelectTrigger className="mt-1 h-8 text-xs">
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

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <Label className="text-[11px] font-semibold">Filter by Category</Label>
                    <Select value={tagFilter} onValueChange={(v) => { setTagFilter(v); setSupplierId(""); }}>
                      <SelectTrigger className="mt-1 h-8 text-xs">
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

                  <div>
                    <Label className="text-[11px] font-semibold">Select Supplier *</Label>
                    <Select value={supplierId} onValueChange={setSupplierId}>
                      <SelectTrigger className="mt-1 h-8 text-xs">
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

                  <div>
                    <Label className="text-[11px] font-semibold">Quoted Total Price (₱) *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="0.00"
                      value={totalPrice}
                      onChange={(e) => setTotalPrice(e.target.value)}
                      className="mt-1 h-8 text-xs"
                    />
                  </div>

                  <div>
                    <Label className="text-[11px] font-semibold">Delivery Time (Days)</Label>
                    <Input
                      type="number"
                      min="1"
                      value={deliveryDays}
                      onChange={(e) => setDeliveryDays(e.target.value)}
                      className="mt-1 h-8 text-xs"
                    />
                  </div>

                  <div>
                    <Label className="text-[11px] font-semibold">Compliance Status</Label>
                    <Select value={isCompliant} onValueChange={setIsCompliant}>
                      <SelectTrigger className="mt-1 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yes">Compliant</SelectItem>
                        <SelectItem value="no">Non-compliant</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-[11px] font-semibold">Quote Reference / Invoice #</Label>
                    <Input
                      placeholder="e.g. Q-2026-001"
                      value={quotationReference}
                      onChange={(e) => setQuotationReference(e.target.value)}
                      className="mt-1 h-8 text-xs"
                    />
                  </div>
                </div>

                <div className="mt-3 flex justify-end">
                  <Button
                    type="submit"
                    size="sm"
                    disabled={addQuoteMutation.isPending || !supplierId || !totalPrice}
                    className="h-8 rounded-[4px] bg-[#7b1e1e] text-xs text-white hover:bg-[#641818]"
                  >
                    {addQuoteMutation.isPending && <LoaderCircle className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                    Record Quote #{quotesCount + 1}
                  </Button>
                </div>
              </form>
            )}

            {/* Step 3: Forward Package action once 3 quotes exist */}
            {isReadyToForward && (
              <div className="rounded-[4px] border border-[#b7d8c4] bg-[#eff9f2] p-4 text-xs dark:border-[#27633b] dark:bg-[#14291a]">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-5 w-5 text-[#27633b] shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-bold text-[#1f4e2f] dark:text-[#a3e3b7]">
                      Pre-Canvass Complete! (3/3 Quotes Recorded)
                    </p>
                    <p className="mt-1 leading-5 text-[#2e5d3c] dark:text-[#c4ecd2]">
                      Your 3-supplier quote package meets government procurement requirements. You can now forward this complete package directly to the Procurement Officer for review and official Abstract preparation.
                    </p>
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
                    disabled={submitPackageMutation.isPending}
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
