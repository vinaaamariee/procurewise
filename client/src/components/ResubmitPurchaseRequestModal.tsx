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
  Upload,
  X,
  FileCheck2,
  LoaderCircle,
  AlertTriangle,
  FileText,
  CheckCircle2,
  ExternalLink,
  Trash2,
  RefreshCw,
  Plus,
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

type ReplacedFile = {
  name: string;
  type: string;
  size: number;
  base64: string;
  category: string;
};

const STANDARD_DOCUMENT_SLOTS = [
  {
    key: "ppmp",
    label: "Approved PPMP Plan",
    sublabel: "Signed Project Procurement Management Plan (Annex B)",
    categoryName: "Approved PPMP Plan",
  },
  {
    key: "market",
    label: "Market Scoping",
    sublabel: "Strategic Market Scoping & Price Sourcing (RA 12009 Art. II)",
    categoryName: "Market Scoping",
  },
  {
    key: "precanvass",
    label: "Pre-Canvass Form",
    sublabel: "Preliminary canvass quotation worksheet / signed form",
    categoryName: "Pre-Canvass Form",
  },
] as const;

export function ResubmitPurchaseRequestModal({
  open,
  onOpenChange,
  purchaseRequest,
  onSuccess,
}: ResubmitPurchaseRequestModalProps) {
  // Map of category -> new replacement file
  const [replacementFiles, setReplacementFiles] = useState<Record<string, ReplacedFile>>({});
  const [resubmitRemarks, setResubmitRemarks] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draggedSlot, setDraggedSlot] = useState<string | null>(null);
  const specificSlotInputRef = useRef<HTMLInputElement>(null);
  const [activeSlotForUpload, setActiveSlotForUpload] = useState<string | null>(null);

  const utils = trpc.useUtils();
  const attachDocumentMutation = trpc.procurement.documents.attach.useMutation();
  const deleteDocumentMutation = trpc.procurement.documents.delete.useMutation();
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

  const handleProcessFileForCategory = (file: File, category: string) => {
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
      setReplacementFiles((prev) => ({
        ...prev,
        [category]: {
          name: file.name,
          type: file.type || "application/octet-stream",
          size: file.size,
          base64,
          category,
        },
      }));
      toast.success(`Selected replacement for ${category}: ${file.name}`);
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteOldDocument = async (docId: number, docName: string) => {
    if (!window.confirm(`Are you sure you want to remove the file "${docName}" from this Purchase Request?`)) {
      return;
    }
    try {
      await deleteDocumentMutation.mutateAsync({ documentId: docId });
      toast.success(`Removed attachment: ${docName}`);
      void detailQuery.refetch();
      void utils.procurement.purchaseRequests.list.invalidate();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete document.");
    }
  };

  const handleResubmit = async () => {
    if (!purchaseRequest) return;

    const filesToUpload = Object.values(replacementFiles);

    if (filesToUpload.length === 0 && !resubmitRemarks.trim()) {
      toast.error("Please replace at least one rejected document or provide explanation remarks before resubmitting.");
      return;
    }

    setIsSubmitting(true);
    try {
      // Attach all re-uploaded / replacement documents, replacing existing files of the same category
      for (const file of filesToUpload) {
        try {
          await attachDocumentMutation.mutateAsync({
            entityType: "purchase_request",
            entityId: purchaseRequest.id,
            documentType: file.category,
            originalFileName: file.name,
            mimeType: file.type,
            dataBase64: file.base64,
            replaceCategory: file.category,
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
      setReplacementFiles({});
      setResubmitRemarks("");
      void utils.procurement.purchaseRequests.list.invalidate();
      void utils.procurement.dashboard.invalidate();
      void detailQuery.refetch();
      onSuccess?.();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to resubmit corrected package.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper to get active document for each standard slot
  const getSlotDoc = (key: string) => {
    if (!detailQuery.data) return null;
    if (key === "ppmp") return detailQuery.data.uploadedPpmpDoc;
    if (key === "market") return detailQuery.data.marketScopingDoc;
    if (key === "precanvass") return detailQuery.data.preCanvassDoc;
    return null;
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const replacementCount = Object.keys(replacementFiles).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="rounded-[4px] bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-900 dark:bg-amber-950/60 dark:text-amber-300">
              RETURNED FOR REVISION
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              {purchaseRequest?.prNumber}
            </span>
          </div>
          <DialogTitle className="text-lg font-bold text-foreground">
            Update &amp; Resubmit Purchase Request
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Replace the rejected documents with your corrected files. The new files will directly replace the returned attachments when resubmitted.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
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

          {/* Standard 3-Document Replacement Slots */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Required PR Package Attachments &amp; Replacements:
              </p>
              {replacementCount > 0 && (
                <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                  {replacementCount} file{replacementCount === 1 ? "" : "s"} ready to replace old attachments
                </span>
              )}
            </div>

            <div className="grid gap-2.5">
              {STANDARD_DOCUMENT_SLOTS.map((slot) => {
                const currentDoc = getSlotDoc(slot.key);
                const replacement = replacementFiles[slot.categoryName];

                return (
                  <div
                    key={slot.key}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDraggedSlot(slot.categoryName);
                    }}
                    onDragLeave={() => setDraggedSlot(null)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDraggedSlot(null);
                      const dropped = e.dataTransfer.files?.[0];
                      if (dropped) handleProcessFileForCategory(dropped, slot.categoryName);
                    }}
                    className={cn(
                      "rounded-lg border p-3 transition-colors",
                      draggedSlot === slot.categoryName
                        ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                        : replacement
                        ? "border-emerald-400 bg-emerald-50/60 dark:border-emerald-800 dark:bg-emerald-950/30"
                        : currentDoc
                        ? "border-border bg-card"
                        : "border-amber-300 bg-amber-50/40 dark:border-amber-900 dark:bg-amber-950/20"
                    )}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-foreground">
                            {slot.label}
                          </span>
                          {replacement ? (
                            <span className="rounded bg-emerald-200 dark:bg-emerald-900 px-1.5 py-0.5 text-[10px] font-bold text-emerald-900 dark:text-emerald-200">
                              REPLACING OLD FILE
                            </span>
                          ) : currentDoc ? (
                            <span className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium text-slate-700 dark:text-slate-300">
                              Current File
                            </span>
                          ) : (
                            <span className="rounded bg-amber-200/80 dark:bg-amber-900/60 px-1.5 py-0.5 text-[10px] font-bold text-amber-950 dark:text-amber-300">
                              Missing / Not Attached
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {slot.sublabel}
                        </p>

                        {/* File Details */}
                        {replacement ? (
                          <div className="mt-2 flex items-center gap-2 text-xs">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                            <span className="font-semibold text-emerald-900 dark:text-emerald-200 truncate">
                              {replacement.name}
                            </span>
                            <span className="text-[11px] text-emerald-700 dark:text-emerald-400 shrink-0">
                              ({formatSize(replacement.size)})
                            </span>
                            {currentDoc && (
                              <span className="text-[11px] text-muted-foreground italic truncate">
                                · will replace &quot;{currentDoc.originalFileName}&quot;
                              </span>
                            )}
                          </div>
                        ) : currentDoc ? (
                          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                            <FileText className="h-3.5 w-3.5 shrink-0" />
                            <span className="font-medium text-foreground truncate" title={currentDoc.originalFileName}>
                              {currentDoc.originalFileName}
                            </span>
                            <span className="text-[11px] shrink-0">
                              ({formatSize(currentDoc.fileSize)})
                            </span>
                            {currentDoc.storageUrl && (
                              <a
                                href={currentDoc.storageUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-primary hover:underline flex items-center gap-0.5 ml-1 shrink-0 text-[11px]"
                              >
                                View <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        ) : (
                          <p className="mt-1.5 text-xs text-amber-800 dark:text-amber-400">
                            No attachment recorded yet. Please upload to resolve return rejection.
                          </p>
                        )}
                      </div>

                      {/* Action Button for this Slot */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        {replacement ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setReplacementFiles((prev) => {
                                const next = { ...prev };
                                delete next[slot.categoryName];
                                return next;
                              })
                            }
                            className="h-7 text-xs border-emerald-300 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:border-emerald-800"
                          >
                            <X className="mr-1 h-3 w-3" />
                            Cancel Replace
                          </Button>
                        ) : (
                          <>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setActiveSlotForUpload(slot.categoryName);
                                specificSlotInputRef.current?.click();
                              }}
                              className="h-7 text-xs"
                            >
                              <Upload className="mr-1.5 h-3 w-3" />
                              {currentDoc ? "Replace File" : "Upload File"}
                            </Button>
                            {currentDoc && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteOldDocument(currentDoc.id, currentDoc.originalFileName)}
                                className="h-7 px-2 text-xs text-rose-600 hover:text-rose-800 hover:bg-rose-50"
                                title="Delete this attachment"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Hidden input for slot-specific upload button */}
          <input
            ref={specificSlotInputRef}
            type="file"
            accept=".pdf,.xlsx,.xls,.docx,.doc,.png,.jpg,.jpeg"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file && activeSlotForUpload) {
                handleProcessFileForCategory(file, activeSlotForUpload);
              }
              e.target.value = "";
            }}
          />

          {/* Remarks for Procurement Officer */}
          <div>
            <Label htmlFor="resubmit-remarks" className="text-xs font-semibold text-foreground">
              Remarks for the Procurement Officer (optional)
            </Label>
            <Textarea
              id="resubmit-remarks"
              value={resubmitRemarks}
              onChange={(e) => setResubmitRemarks(e.target.value)}
              placeholder="Explain the changes or corrections made (e.g., 'Re-uploaded verified Market Scoping form with 3 price references as required')..."
              className="mt-1.5 min-h-[64px] text-xs"
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
