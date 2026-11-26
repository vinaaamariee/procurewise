import * as React from "react";
import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Upload,
  X,
  FileCheck2,
  LoaderCircle,
  AlertTriangle,
  FileText,
  CheckCircle2,
  ExternalLink,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

export interface ResubmitPurchaseRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchaseRequest: {
    id: number;
    prNumber: string;
    purpose: string;
    totalEstimate?: string | number;
    status: string;
    createdAt?: string | Date;
  } | null;
  onSuccess?: () => void;
}

const DOCUMENT_CATEGORIES = [
  { value: "Approved PPMP Plan", label: "Approved PPMP Plan (Annex B)" },
  { value: "Market Scoping", label: "Market Scoping Document (RA 12009 Art. II)" },
  { value: "Pre-Canvass Form", label: "Pre-Canvass Form / Worksheet" },
  { value: "Corrected Attachment", label: "Corrected Supporting Attachment / Other" },
] as const;

export function ResubmitPurchaseRequestModal({
  open,
  onOpenChange,
  purchaseRequest,
  onSuccess,
}: ResubmitPurchaseRequestModalProps) {
  const [resubmitCategory, setResubmitCategory] = useState<string>("Approved PPMP Plan");
  const [resubmitFiles, setResubmitFiles] = useState<
    Array<{ name: string; type: string; size: number; base64: string; category: string }>
  >([]);
  const [resubmitRemarks, setResubmitRemarks] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();
  const attachDocumentMutation = trpc.procurement.documents.attach.useMutation();
  const resubmitRequestMutation = trpc.procurement.purchaseRequests.resubmit.useMutation();

  // Load history to display the PO's return remarks and reason
  const historyQuery = trpc.procurement.purchaseRequests.history.useQuery(
    { purchaseRequestId: purchaseRequest?.id ?? 0 },
    { enabled: Boolean(open && purchaseRequest?.id), retry: false }
  );

  // Load PR detail to show current attachments
  const detailQuery = trpc.procurement.purchaseRequests.detail.useQuery(
    { purchaseRequestId: purchaseRequest?.id ?? 0 },
    { enabled: Boolean(open && purchaseRequest?.id), retry: false }
  );

  // Extract latest return reason / decision
  const returnEvent = React.useMemo(() => {
    if (!historyQuery.data?.timeline) return null;
    const returnedItems = historyQuery.data.timeline.filter(
      (item) => item.action === "returned" || item.toStatus === "returned"
    );
    return returnedItems.length ? returnedItems[returnedItems.length - 1] : null;
  }, [historyQuery.data?.timeline]);

  const handleProcessFile = (file: File) => {
    if (!/\.(pdf|xlsx|xls|docx|doc|png|jpe?g)$/i.test(file.name)) {
      toast.error("Choose a PDF, Excel, Word, or image document.");
      return;
    }
    if (file.size > 14 * 1024 * 1024) {
      toast.error("File exceeds 14MB limit. Please upload a smaller document.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      setResubmitFiles((prev) => [
        ...prev,
        {
          name: file.name,
          type: file.type || "application/octet-stream",
          size: file.size,
          base64,
          category: resubmitCategory,
        },
      ]);
      toast.success(`Attached corrected document: ${file.name} (${resubmitCategory})`);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      handleProcessFile(droppedFile);
    }
  };

  const handleResubmit = async () => {
    if (!purchaseRequest) return;

    if (resubmitFiles.length === 0 && !resubmitRemarks.trim()) {
      toast.error("Please attach at least one corrected document or provide explanation remarks before resubmitting.");
      return;
    }

    setIsSubmitting(true);
    try {
      // Attach all re-uploaded / corrected documents
      for (const file of resubmitFiles) {
        try {
          await attachDocumentMutation.mutateAsync({
            entityType: "purchase_request",
            entityId: purchaseRequest.id,
            documentType: file.category,
            originalFileName: file.name,
            mimeType: file.type,
            dataBase64: file.base64,
          });
        } catch (attachErr: any) {
          toast.warning(`Notice for ${file.name}: ${attachErr.message || "upload issue"}`);
        }
      }

      // Execute resubmission mutation
      await resubmitRequestMutation.mutateAsync({
        purchaseRequestId: purchaseRequest.id,
        remarks: resubmitRemarks.trim() || undefined,
      });

      toast.success("Corrected package resubmitted to the Procurement Officer.");
      setResubmitFiles([]);
      setResubmitRemarks("");
      void utils.procurement.purchaseRequests.list.invalidate();
      void utils.procurement.dashboard.invalidate();
      onSuccess?.();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to resubmit corrected package.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="rounded-[4px] bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-900 dark:bg-amber-950/60 dark:text-amber-300">
              RETURNED FOR REVISION
            </span>
            <span className="text-xs text-muted-foreground">
              {purchaseRequest?.prNumber}
            </span>
          </div>
          <DialogTitle className="text-lg font-bold text-foreground">
            Update &amp; Resubmit Purchase Request
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Replace rejected attachments or upload corrected documents requested by the Procurement Officer, then resubmit for Step 5.1 verification.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Reviewer Return Feedback Box */}
          <div className="rounded-[4px] border border-amber-300 bg-amber-50/80 p-3.5 dark:border-amber-800 dark:bg-amber-950/30">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" />
              <div className="flex-1 text-xs">
                <p className="font-bold text-amber-950 dark:text-amber-200">
                  Procurement Officer Review Feedback:
                </p>
                {historyQuery.isLoading ? (
                  <div className="mt-1 flex items-center gap-2 text-amber-800 dark:text-amber-400">
                    <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                    <span>Loading reviewer feedback...</span>
                  </div>
                ) : returnEvent?.reason || returnEvent?.remarks ? (
                  <div className="mt-1 space-y-1">
                    {returnEvent.reason && (
                      <p className="text-amber-900 font-semibold dark:text-amber-300">
                        {returnEvent.reason}
                      </p>
                    )}
                    {returnEvent.remarks && returnEvent.remarks !== returnEvent.reason && (
                      <p className="text-amber-800 italic dark:text-amber-400">
                        Remarks: {returnEvent.remarks}
                      </p>
                    )}
                    <p className="text-[11px] text-amber-700/80 dark:text-amber-500">
                      Returned by {returnEvent.actorName} ({returnEvent.actorRole}) on{" "}
                      {new Date(returnEvent.timestamp).toLocaleString("en-PH")}
                    </p>
                  </div>
                ) : (
                  <p className="mt-1 text-amber-900 dark:text-amber-300">
                    Package was returned for revision. Please review your attached budget documents and line item categories before resubmitting.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Current Documents Info */}
          {detailQuery.data?.documents && detailQuery.data.documents.length > 0 && (
            <div className="rounded-[4px] border border-border bg-muted/40 p-3">
              <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                Current Attachments on File:
              </p>
              <div className="grid gap-2 sm:grid-cols-2 text-xs">
                {detailQuery.data.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between gap-2 rounded border border-border bg-background px-2.5 py-1.5"
                  >
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        {doc.documentType}
                      </p>
                      <p className="truncate text-xs font-medium text-foreground" title={doc.originalFileName}>
                        {doc.originalFileName}
                      </p>
                    </div>
                    {doc.storageUrl && (
                      <a
                        href={doc.storageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="shrink-0 text-primary hover:underline"
                        title="View file"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Re-upload Document Section */}
          <div className="space-y-3 rounded-[4px] border border-border p-3.5 bg-background">
            <p className="text-xs font-bold text-foreground">
              Re-upload / Replace Rejected Document:
            </p>

            <div className="grid gap-2 sm:grid-cols-3">
              <div className="sm:col-span-1">
                <Label className="text-[11px] font-semibold text-muted-foreground">
                  Target Document Type
                </Label>
                <Select value={resubmitCategory} onValueChange={setResubmitCategory}>
                  <SelectTrigger className="mt-1 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value} className="text-xs">
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="sm:col-span-2">
                <Label className="text-[11px] font-semibold text-muted-foreground">
                  Choose Corrected File
                </Label>
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  className={cn(
                    "mt-1 flex items-center justify-between rounded-[4px] border-2 border-dashed px-3 py-2 text-xs transition-colors",
                    isDragging
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50 bg-muted/20"
                  )}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Upload className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate text-[11px] text-muted-foreground">
                      Drag &amp; drop or browse replacement file (.pdf, .xlsx, .docx)
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-7 text-xs shrink-0 ml-2"
                  >
                    Browse
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.xlsx,.xls,.docx,.doc,.png,.jpg,.jpeg"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleProcessFile(file);
                      e.target.value = "";
                    }}
                  />
                </div>
              </div>
            </div>

            {/* List of New Corrected Files to Attach */}
            {resubmitFiles.length > 0 && (
              <div className="mt-3 space-y-1.5">
                <p className="text-[11px] font-semibold text-muted-foreground">
                  New Documents to Upload with Resubmission ({resubmitFiles.length}):
                </p>
                <ul className="space-y-1">
                  {resubmitFiles.map((file, idx) => (
                    <li
                      key={idx}
                      className="flex items-center justify-between gap-2 rounded border border-emerald-300 bg-emerald-50/70 px-2.5 py-1.5 text-xs text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                        <span className="rounded bg-emerald-200/60 dark:bg-emerald-800/60 px-1.5 py-0.5 text-[10px] font-bold">
                          {file.category}
                        </span>
                        <span className="truncate font-medium">{file.name}</span>
                        <span className="text-[10px] text-muted-foreground">
                          · {(file.size / 1024).toFixed(0)} KB
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setResubmitFiles((prev) => prev.filter((_, i) => i !== idx))
                        }
                        className="shrink-0 text-rose-600 hover:text-rose-800 p-0.5"
                        title="Remove file"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Remarks for Procurement Officer */}
          <div>
            <Label htmlFor="resubmit-remarks" className="text-xs font-semibold text-foreground">
              Remarks for the Procurement Officer
            </Label>
            <Textarea
              id="resubmit-remarks"
              value={resubmitRemarks}
              onChange={(e) => setResubmitRemarks(e.target.value)}
              placeholder="Explain the changes or corrections you made (e.g., 'Re-uploaded verified Market Scoping form with 3 price references as required')..."
              className="mt-1.5 min-h-[72px] text-xs"
            />
          </div>
        </div>

        <DialogFooter className="flex flex-row items-center justify-between gap-2 pt-2 border-t">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isSubmitting}
            onClick={() => onOpenChange(false)}
            className="text-xs"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={isSubmitting}
            onClick={handleResubmit}
            className="bg-[#9a6d19] text-xs font-semibold text-white hover:bg-[#7e5712] dark:bg-[#b98a2b] dark:hover:bg-[#a1771f]"
          >
            {isSubmitting ? (
              <LoaderCircle className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <FileCheck2 className="mr-1.5 h-3.5 w-3.5" />
            )}
            Submit Corrected Package
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
export default ResubmitPurchaseRequestModal;
