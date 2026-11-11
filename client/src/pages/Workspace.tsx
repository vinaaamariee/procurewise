import { EmptyWorkspace } from "@/components/EmptyWorkspace";
import { PurchaseRequestHistory } from "@/components/PurchaseRequestHistory";
import { useAuth } from "@/_core/hooks/useAuth";
import { OfficialPurchaseRequestCanvas } from "@/components/OfficialPurchaseRequestCanvas";
import { PageHeader } from "@/components/PageHeader";
import { RecordTable, RecordTableHeader } from "@/components/RecordTable";
import { StatusBadge } from "@/components/StatusBadge";
import { WorkflowTimeline } from "@/components/WorkflowTimeline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { OfficeSelect } from "@/components/OfficeSelect";
import { IntegratedPreCanvassModal } from "@/components/IntegratedPreCanvassModal";
import { AuditHistoryDrawer, QuietCompliancePill } from "@/components/compliance";
import { trpc } from "@/lib/trpc";
import { formatFriendlyError } from "@/lib/formatError";
import { countValidPreCanvassQuotes, detectMixedCategories, hasRequiredSupplierQuotations, normalizeProcurementRole, SECTION_5_1_1_CATEGORIES } from "../../../shared/procurementRules";
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, CircleAlert, ChevronDown, ChevronUp, ExternalLink, FileCheck, FileCheck2, FileSearch, FileText, Folder, Info, LoaderCircle, MailCheck, Plus, PlusCircle, Search, Send, ShieldAlert, Star, Trash2, Upload, UploadCloud, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearch } from "wouter";
import { toast } from "sonner";

type WorkspaceKind = "rfq" | "po" | "plans" | "suppliers" | "budgets" | "analytics" | "audit";
type RequestItem = { catalogItemId: string; stockPropertyNo: string; description: string; specification: string; quantity: string; unit: string; estimatedUnitCost: string };

const content: Record<WorkspaceKind, { eyebrow: string; title: string; description: string; emptyTitle: string; emptyDescription: string }> = {
  rfq: { eyebrow: "Quotation management", title: "RFQs & quotation canvass", description: "Prepare procurement canvasses, compare supplier quotations, and document compliant selection.", emptyTitle: "No RFQ or supplier quotation records yet.", emptyDescription: "RFQs appear here after an approved PR is endorsed to Supply for canvassing." },
  po: { eyebrow: "Purchase execution", title: "Abstracts & Purchase Orders", description: "Compile quotation abstracts and generate purchase orders only after the required approvals.", emptyTitle: "No quotation abstract or purchase order records yet.", emptyDescription: "Approved selection recommendations will be available here for PO processing." },
  plans: { eyebrow: "Annual planning", title: "APP / PPMP monitoring", description: "Manage annual procurement plans and department PPMP entries, then monitor actual procurement against plans.", emptyTitle: "No APP or PPMP entries have been registered.", emptyDescription: "Add department-specific planned procurement entries to begin monitoring plan-versus-actual progress." },
  suppliers: { eyebrow: "Vendor registry", title: "Accredited suppliers", description: "Maintain supplier contact information, accreditation notes, and declared product or service offerings.", emptyTitle: "No supplier records have been registered.", emptyDescription: "Register an accredited supplier before selecting them for canvassing or quotation comparison." },
  budgets: { eyebrow: "Allotment control", title: "Budget utilization", description: "Track budget availability and commitment by office and object of expenditure—not only as a system-wide total.", emptyTitle: "No budget allotments have been registered.", emptyDescription: "Record office-level appropriation and object-of-expenditure limits to validate Purchase Requests." },
  analytics: { eyebrow: "Procurement intelligence", title: "Analytics & performance", description: "Review procurement cycle time, plan-versus-actual budget variance, and recurring commodity demand.", emptyTitle: "Analytics are ready when procurement records are available.", emptyDescription: "As PRs, RFQs, and POs move through the workflow, this workspace will calculate the requested operational measures." },
  audit: { eyebrow: "Accountability", title: "Audit trail", description: "Maintain a transaction history of record creation, approvals, returns, status changes, and other workflow actions.", emptyTitle: "No audit events have been recorded.", emptyDescription: "Each authorised transaction action will create a time-stamped accountability entry in this workspace." },
};

export function PurchaseRequestsPage() {
  const { user } = useAuth();
  const role = user ? normalizeProcurementRole(user.role) : "end_user";

  if (role !== "end_user" && role !== "admin") {
    return (
      <div className="mx-auto max-w-[1240px] px-4 py-16 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400">
          <CircleAlert className="h-7 w-7" />
        </div>
        <h2 className="mt-4 text-xl font-bold text-foreground">Access Restricted: End-User Workspace Only</h2>
        <p className="mx-auto mt-2 max-w-lg text-xs leading-relaxed text-muted-foreground">
          The PPMP-linked Purchase Requests module and creation workspace is strictly restricted to the End-User / Requesting Unit.
          Procurement Staff, Procurement Officers, BAC members, Budget Officers, and HoPE must manage procurement records from their designated modules.
        </p>
        <div className="mt-6">
          <Button asChild className="bg-rose-700 hover:bg-rose-800 text-white text-xs">
            <a href="/dashboard">Return to Dashboard</a>
          </Button>
        </div>
      </div>
    );
  }

  const search = useSearch();
  const searchParams = new URLSearchParams(search);
  const [catalogSelection] = useState<Array<{ id: number; quantity: string }>>(() => { try { return JSON.parse(sessionStorage.getItem("procurewise.catalogSelection") || "[]") as Array<{ id: number; quantity: string }>; } catch { return []; } });
  const catalogItemIds = useMemo(() => catalogSelection.map((item) => item.id), [catalogSelection]);
  const [isCreating, setIsCreating] = useState(() => searchParams.get("create") === "1");
  const [activeCanvassPr, setActiveCanvassPr] = useState<{ id: number; prNumber: string; purpose: string; totalEstimate: string; officeId?: number; status: string } | null>(null);

  useEffect(() => {
    const count = Number(sessionStorage.getItem("procurewise.catalogSelectionNotice") || 0);
    if (!count) return;
    sessionStorage.removeItem("procurewise.catalogSelectionNotice");
    toast.success(`${count} catalog item${count === 1 ? "" : "s"} loaded into this new Purchase Request.`);
  }, []);
  const utils = trpc.useUtils();
  const purchaseRequests = trpc.procurement.purchaseRequests.list.useQuery(undefined, { retry: false });
  const setup = trpc.procurement.setup.details.useQuery(undefined, { retry: false });
  const dashboard = trpc.procurement.dashboard.useQuery(undefined, { retry: false });
  const submitRequest = trpc.procurement.purchaseRequests.advance.useMutation({
    onSuccess: () => { toast.success("Complete procurement package forwarded to the Procurement Officer."); void utils.procurement.purchaseRequests.list.invalidate(); void utils.procurement.dashboard.invalidate(); },
    onError: (error) => toast.error(formatFriendlyError(error)),
  });
  const rejectRequest = trpc.procurement.purchaseRequests.reject.useMutation({
    onSuccess: () => { toast.success("Purchase Request rejected and the employee was notified."); void utils.procurement.purchaseRequests.list.invalidate(); void utils.procurement.dashboard.invalidate(); },
    onError: (error) => toast.error(formatFriendlyError(error)),
  });
  const resubmitRequest = trpc.procurement.purchaseRequests.resubmit.useMutation({
    onSuccess: () => { toast.success("Corrected package resubmitted to the Procurement Officer."); setResubmitFiles([]); setResubmitRemarks(""); void utils.procurement.purchaseRequests.list.invalidate(); void utils.procurement.dashboard.invalidate(); },
    onError: (error) => toast.error(formatFriendlyError(error)),
  });
  const [resubmitFiles, setResubmitFiles] = useState<Array<{ name: string; type: string; size: number; base64: string }>>([]);
  const [resubmitRemarks, setResubmitRemarks] = useState("");
  const resubmitFileInputRef = useRef<HTMLInputElement>(null);

  const handleResubmitFile = (file: File) => {
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
      setResubmitFiles((prev) => [...prev, { name: file.name, type: file.type, size: file.size, base64 }]);
      toast.success(`Attached corrected document: ${file.name}`);
    };
    reader.readAsDataURL(file);
  };

  const handleResubmit = async (purchaseRequestId: number) => {
    for (const file of resubmitFiles) {
      try {
        await attachDocumentMutation.mutateAsync({
          entityType: "purchase_request",
          entityId: purchaseRequestId,
          documentType: "Corrected Attachment",
          originalFileName: file.name,
          mimeType: file.type || "application/octet-stream",
          dataBase64: file.base64,
        });
      } catch (attachErr: any) {
        toast.warning(`Document ${file.name} could not be attached: ${attachErr.message || "upload issue"}`);
      }
    }
    resubmitRequest.mutate({ purchaseRequestId, remarks: resubmitRemarks.trim() || undefined });
  };
  const createPpmpMutation = trpc.procurement.setup.createAppPpmpEntry.useMutation();
  const attachDocumentMutation = trpc.procurement.documents.attach.useMutation();
  const [isSubmittingPackage, setIsSubmittingPackage] = useState(false);

  const createRequest = trpc.procurement.purchaseRequests.create.useMutation({
    onSuccess: (created) => {
      void navigator.clipboard?.writeText(created.trackingToken);
      toast.success("Purchase Request created! Now complete the 3 supplier quotations below.");
      setIsCreating(false);
      void utils.procurement.purchaseRequests.list.invalidate();
      void utils.procurement.dashboard.invalidate();
      // Prompt user to immediately complete the required 3-supplier canvass
      setActiveCanvassPr({
        id: created.id,
        prNumber: created.prNumber,
        purpose: created.purpose,
        totalEstimate: created.totalEstimate,
        officeId: created.officeId,
        status: created.status,
      });
    },
    onError: (error) => toast.error(formatFriendlyError(error)),
  });

  const handleCreatePurchaseRequest = async (
    input: Parameters<typeof createRequest.mutateAsync>[0],
    uploadedPpmpFile?: { name: string; type: string; size: number; base64: string } | null,
    newPpmpData?: { title: string; fiscalYear: number; plannedAmount?: number } | null,
    marketScopingFile?: { name: string; type: string; size: number; base64: string } | null
  ) => {
    setIsSubmittingPackage(true);
    try {
      let resolvedPpmpId = input.ppmpEntryId;

      // If user is registering a new PPMP entry on the fly
      if (!resolvedPpmpId && newPpmpData) {
        const estTotal = input.items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.estimatedUnitCost) || 0), 0);
        const ceiling = Number(newPpmpData.plannedAmount) || 0;
        if (ceiling > 0 && estTotal > ceiling + 0.01) {
          toast.error(
            `Total Estimated Cost (₱${estTotal.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}) exceeds the Approved PPMP Budget Ceiling of ₱${ceiling.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`
          );
          return;
        }
        const createdPpmp = await createPpmpMutation.mutateAsync({
          fiscalYear: newPpmpData.fiscalYear,
          officeId: input.officeId,
          objectOfExpenditureId: input.objectOfExpenditureId,
          description: newPpmpData.title.trim() || input.purpose.trim() || "Annual Department PPMP",
          plannedAmount: ceiling > 0 ? ceiling : Math.max(estTotal, 1000),
          fundSource: input.fundSource,
          modeOfProcurement: "Small Value Procurement",
        });
        resolvedPpmpId = createdPpmp.id;
        void utils.procurement.dashboard.invalidate();
      }

      const created = await createRequest.mutateAsync({
        ...input,
        ppmpEntryId: resolvedPpmpId,
      });

      // If user uploaded a PPMP file, attach it to the purchase request
      if (uploadedPpmpFile) {
        try {
          await attachDocumentMutation.mutateAsync({
            entityType: "purchase_request",
            entityId: created.id,
            documentType: "Project Procurement Management Plan (PPMP)",
            originalFileName: uploadedPpmpFile.name,
            mimeType: uploadedPpmpFile.type || "application/pdf",
            dataBase64: uploadedPpmpFile.base64,
          });

          if (resolvedPpmpId) {
            void attachDocumentMutation.mutateAsync({
              entityType: "app_ppmp_entry",
              entityId: resolvedPpmpId,
              documentType: "Approved PPMP Document",
              originalFileName: uploadedPpmpFile.name,
              mimeType: uploadedPpmpFile.type || "application/pdf",
              dataBase64: uploadedPpmpFile.base64,
            }).catch(() => {});
          }
          toast.success("Department PPMP document successfully attached to this package.");
        } catch (attachErr: any) {
          console.warn("PPMP attachment notice:", attachErr);
          toast.warning("PR created, but file attachment had an issue: " + (attachErr.message || "Upload issue"));
        }
      }

      if (marketScopingFile) {
        try {
          await attachDocumentMutation.mutateAsync({
            entityType: "purchase_request",
            entityId: created.id,
            documentType: "Market Scoping",
            originalFileName: marketScopingFile.name,
            mimeType: marketScopingFile.type || "application/octet-stream",
            dataBase64: marketScopingFile.base64,
          });
          toast.success("Market Scoping document attached to your request.");
        } catch (attachErr: any) {
          console.warn("Market Scoping attachment notice:", attachErr);
          toast.warning("Purchase Request created, but the Market Scoping file could not be attached: " + (attachErr.message || "Upload issue"));
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to create Purchase Request.");
    } finally {
      setIsSubmittingPackage(false);
    }
  };

  const [selectedPrId, setSelectedPrId] = useState<number | null>(null);

  const selectedPr = useMemo(() => {
    if (!purchaseRequests.data?.length) return null;
    if (selectedPrId) {
      const found = purchaseRequests.data.find((p) => p.id === selectedPrId);
      if (found) return found;
    }
    return purchaseRequests.data[0];
  }, [purchaseRequests.data, selectedPrId]);

  const [creationInitialMode, setCreationInitialMode] = useState<"upload" | "existing">("upload");

  return <div className="content-shell">
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
      <PageHeader
        eyebrow="End-User package"
        title="PPMP-linked Purchase Requests"
        description="Every Purchase Request must originate from an approved Department PPMP. Establish or link your PPMP first, prepare itemized line items, and complete the preliminary 3-supplier pre-canvass."
      />
      {!isCreating && (
        <div className="flex items-center gap-2 shrink-0 pt-2">
          <Button
            onClick={() => {
              setCreationInitialMode("upload");
              setIsCreating(true);
            }}
            className="h-9 rounded-[4px] bg-[#7b1e1e] text-xs font-semibold text-white hover:bg-[#641818] dark:bg-[#d65c50] dark:hover:bg-[#eb766a] shadow-xs"
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Create purchase request
          </Button>
        </div>
      )}
    </div>
    {isCreating ? <PurchaseRequestForm setup={setup.data} ppmpEntries={dashboard.data?.appPpmpEntries} catalogItemIds={catalogItemIds} catalogSelection={catalogSelection} isSaving={isSubmittingPackage || createRequest.isPending} initialMode={creationInitialMode} onCancel={() => setIsCreating(false)} onCreate={handleCreatePurchaseRequest} /> : (
      <div className="mt-7">
        {purchaseRequests.isLoading ? <LoadingPanel label="Loading Purchase Requests" /> : purchaseRequests.data?.length ? <>
          <PurchaseRequestTable
            records={purchaseRequests.data}
            preCanvasses={dashboard.data?.preCanvasses ?? []}
            preCanvassQuotes={dashboard.data?.preCanvassQuotes ?? []}
            canReject={Boolean(user && ["procurement_officer", "administrative_approver", "admin"].includes(normalizeProcurementRole(user.role)))}
            onSubmit={(purchaseRequestId) => {
              setSelectedPrId(purchaseRequestId);
              submitRequest.mutate({ purchaseRequestId });
            }}
            onReject={(purchaseRequestId, reason) => rejectRequest.mutate({ purchaseRequestId, reason })}
            onResubmit={(purchaseRequestId) => handleResubmit(purchaseRequestId)}
            resubmittingId={resubmitRequest.isPending ? resubmitRequest.variables?.purchaseRequestId : undefined}
            onOpenCanvass={(pr) => {
              setSelectedPrId(pr.id);
              setActiveCanvassPr(pr);
            }}
            submittingId={submitRequest.isPending ? submitRequest.variables?.purchaseRequestId : undefined}
            selectedPrId={selectedPr?.id}
            onSelectPr={(id) => setSelectedPrId(id)}
          />
          {selectedPr?.status === "returned" && (
            <div className="mt-5 rounded-[4px] border border-[#e4c88a] bg-[#fffaf0] p-4 sm:p-5 dark:border-[#8a6a1f] dark:bg-[#2a2010]">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#9a6d19] dark:text-[#f0c36a]" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[#79551a] dark:text-[#f0c36a]">This package was returned for correction — action needed</p>
                  <p className="mt-1 text-xs leading-5 text-[#75643e] dark:text-[#d9c58e]">
                    Review the reviewer comments in the history, make the requested changes, attach any corrected documents below, then resubmit. The resubmitted package goes back to the Procurement Officer for verification.
                  </p>
                  <input
                    ref={resubmitFileInputRef}
                    type="file"
                    accept=".pdf,.xlsx,.xls,.docx,.doc,.png,.jpg,.jpeg"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) handleResubmitFile(file);
                      event.target.value = "";
                    }}
                  />
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => resubmitFileInputRef.current?.click()}
                      className="h-8 rounded-[4px] border-[#d8c39a] text-xs font-semibold text-[#79551a] hover:bg-[#fdf4dd] dark:border-[#8a6a1f] dark:text-[#f0c36a] dark:hover:bg-[#3a2d12]"
                    >
                      <Upload className="mr-1.5 h-3.5 w-3.5" />
                      Upload corrected document
                    </Button>
                    <Button
                      size="sm"
                      disabled={resubmitRequest.isPending}
                      onClick={() => selectedPr && handleResubmit(selectedPr.id)}
                      className="h-8 rounded-[4px] bg-[#9a6d19] text-xs font-semibold text-white hover:bg-[#7e5712] dark:bg-[#b98a2b] dark:hover:bg-[#a1771f]"
                    >
                      {resubmitRequest.isPending ? <LoaderCircle className="mr-1.5 h-3.5 w-3.5 animate-spin text-white" /> : <FileCheck2 className="mr-1.5 h-3.5 w-3.5" />}
                      Update and Resubmit
                    </Button>
                  </div>
                  {resubmitFiles.length > 0 && (
                    <ul className="mt-3 space-y-1">
                      {resubmitFiles.map((file, index) => (
                        <li key={index} className="flex items-center justify-between gap-2 rounded-[4px] bg-white/70 px-2.5 py-1.5 text-xs text-[#5c4d21] dark:bg-black/20 dark:text-[#e6d9ae]">
                          <span className="truncate">{file.name} · {(file.size / 1024).toFixed(0)} KB</span>
                          <button type="button" onClick={() => setResubmitFiles((prev) => prev.filter((_, i) => i !== index))} className="shrink-0 text-[#9c2525] hover:underline dark:text-[#ff837a]">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-3">
                    <Label className="text-xs text-[#75643e] dark:text-[#d9c58e]">Remarks for the Procurement Officer (optional)</Label>
                    <Textarea
                      value={resubmitRemarks}
                      onChange={(event) => setResubmitRemarks(event.target.value)}
                      placeholder="Describe the corrections you made..."
                      className="mt-1.5 min-h-16 border-[#d8c39a] bg-white/70 text-xs dark:border-[#8a6a1f] dark:bg-black/20"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
          <WorkflowTimeline
            status={selectedPr?.status ?? "draft"}
            pr={selectedPr}
            allPrs={purchaseRequests.data}
            onSelectPr={(id) => setSelectedPrId(id)}
          />
        </> : <EmptyWorkspace eyebrow="Purchase Request register" title="No PPMP-linked Purchase Requests have been submitted." description="Start with PPMP planning, prepare the PR and PPMP, complete the preliminary pre-canvass quotations, then submit the three-file package to Procurement." actionLabel="Create your first PR" actionOnClick={() => setIsCreating(true)} />}
      </div>
    )}

    {activeCanvassPr && (
      <IntegratedPreCanvassModal
        open={Boolean(activeCanvassPr)}
        onOpenChange={(open) => {
          if (!open) setActiveCanvassPr(null);
        }}
        purchaseRequest={activeCanvassPr}
        onCompleted={() => {
          setActiveCanvassPr(null);
          void utils.procurement.purchaseRequests.list.invalidate();
          void utils.procurement.dashboard.invalidate();
        }}
      />
    )}
  </div>;
}

function PurchaseRequestTable({
  records,
  preCanvasses,
  preCanvassQuotes,
  canReject,
  onSubmit,
  onReject,
  onResubmit,
  onOpenCanvass,
  submittingId,
  resubmittingId,
  selectedPrId,
  onSelectPr,
}: {
  records: Array<{ id: number; prNumber: string; purpose: string; totalEstimate: string; status: string; createdAt: Date; rejectionCount?: number; rejectionReason?: string | null; officeId?: number }>;
  preCanvasses: Array<{ id: number; purchaseRequestId: number }>;
  preCanvassQuotes: Array<{ id: number; preCanvassId: number; supplierId?: number; totalPrice?: string | number }>;
  canReject: boolean;
  onSubmit: (purchaseRequestId: number) => void;
  onReject: (purchaseRequestId: number, reason: string) => void;
  onResubmit: (purchaseRequestId: number) => void;
  onOpenCanvass: (pr: { id: number; prNumber: string; purpose: string; totalEstimate: string; officeId?: number; status: string }) => void;
  submittingId?: number;
  resubmittingId?: number;
  selectedPrId?: number;
  onSelectPr?: (id: number) => void;
}) {
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [reason, setReason] = useState("");
  const tone = (status: string) => status === "approved" ? "approved" : status === "rejected" ? "returned" : status.includes("review") || ["rfq", "po", "po_issued"].includes(status) ? "pending" : "draft";
  const label = (status: string) => status === "approved" ? "APPROVED" : status === "rejected" ? "REJECTED" : ["draft", "procurement_review", "approval_review", "budget_review", "supply_review", "bac_review", "rfq", "po", "po_issued"].includes(status) ? "IN PROGRESS" : status.replaceAll("_", " ").toUpperCase();

  // Helper to count quotes for a PR using unified validation helper
  const getQuotesCount = (prId: number) => {
    const pc = preCanvasses.find((item) => item.purchaseRequestId === prId);
    if (!pc) return 0;
    return countValidPreCanvassQuotes(preCanvassQuotes, pc.id);
  };

  return <RecordTable><RecordTableHeader><tr><th className="px-4 py-3 font-semibold">PR number</th><th className="px-4 py-3 font-semibold">Purpose</th><th className="px-4 py-3 font-semibold">Amount</th><th className="px-4 py-3 font-semibold">Status / history</th><th className="px-4 py-3 font-semibold">Created</th><th className="px-4 py-3 font-semibold">Action</th></tr></RecordTableHeader><tbody className="divide-y divide-[#efebe4] dark:divide-[#46515c]">{records.map((record) => {
    const quotesCount = getQuotesCount(record.id);
    const hasEnoughQuotes = hasRequiredSupplierQuotations(quotesCount);

    return <tr key={record.id} onClick={() => onSelectPr?.(record.id)} className={`cursor-pointer transition-colors ${selectedPrId === record.id ? "bg-[#fbf7f0] dark:bg-[#2b3540] ring-1 ring-inset ring-[#7b1e1e]/25 dark:ring-[#ff837a]/30" : "hover:bg-[#fdfcf9] dark:hover:bg-[#232c35]"}`}><td className="px-4 py-3 font-semibold text-[#7b1e1e] dark:text-[#ff837a]">{record.prNumber}<PurchaseRequestHistory purchaseRequestId={record.id} /></td><td className="max-w-[350px] px-4 py-3 text-[#3e4855] dark:text-[#f1f5f8]">{record.purpose}</td><td className="px-4 py-3 text-[#3e4855] dark:text-[#f1f5f8]">₱{Number(record.totalEstimate).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</td><td className="px-4 py-3"><StatusBadge tone={tone(record.status)}>{label(record.status)}</StatusBadge>{record.status === "draft" && <span className={`ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${hasEnoughQuotes ? "bg-[#eff9f2] text-[#27633b] dark:bg-[#1a3824] dark:text-[#8ce6aa]" : "bg-[#fffaf0] text-[#9a6d19] dark:bg-[#342817] dark:text-[#f0c36a]"}`}>{quotesCount}/3 Canvass Quotes</span>}{record.rejectionCount ? <p className="mt-1 text-[10px] text-[#9c2525] dark:text-[#ff837a]">Rejected {record.rejectionCount} time{record.rejectionCount === 1 ? "" : "s"}{record.rejectionReason ? `: ${record.rejectionReason}` : ""}</p> : null}</td><td className="px-4 py-3 text-[#74808c] dark:text-[#d1dae2]">{new Date(record.createdAt).toLocaleDateString("en-PH")}</td><td className="px-4 py-3">{rejectingId === record.id ? <div className="min-w-[220px]"><Textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Reason for rejection (required)" className="min-h-16 text-[11px]" /><div className="mt-2 flex gap-1.5"><Button size="sm" variant="outline" onClick={() => { setRejectingId(null); setReason(""); }} className="h-7 text-[10px]">Cancel</Button><Button size="sm" disabled={reason.trim().length < 10} onClick={() => { onReject(record.id, reason.trim()); setRejectingId(null); setReason(""); }} className="h-7 bg-[#9c2525] text-[10px] text-white hover:bg-[#7d1d1d]">Reject</Button></div></div> : <div className="flex flex-wrap gap-1.5">{record.status === "draft" && (
      <>
        <Button
          size="sm"
          variant={hasEnoughQuotes ? "outline" : "default"}
          onClick={() => onOpenCanvass(record)}
          className={`h-7 rounded-[4px] px-2.5 text-[10px] ${!hasEnoughQuotes ? "bg-[#7b1e1e] text-white hover:bg-[#641818] dark:bg-[#d65c50] dark:text-white dark:hover:bg-[#eb766a]" : "border-[#b5a995] text-[#4b5563] dark:text-[#d1dae2]"}`}
        >
          <FileSearch className="mr-1 h-3 w-3" />
          {hasEnoughQuotes ? `Canvass Quotes (${quotesCount}/3)` : `Complete Canvass (${quotesCount}/3)`}
        </Button>
        {hasEnoughQuotes && (
          <Button
            size="sm"
            onClick={() => onSubmit(record.id)}
            disabled={submittingId === record.id}
            className="h-7 rounded-[4px] bg-[#27633b] px-2.5 text-[10px] text-white hover:bg-[#1f5030] dark:bg-[#348e53] dark:text-white"
          >
            {submittingId === record.id ? <LoaderCircle className="mr-1 h-3 w-3 animate-spin text-white" /> : <Send className="mr-1 h-3 w-3" />}
            Forward Package
          </Button>
        )}
      </>
    )}
    {canReject && !["draft", "rejected", "delivered", "pmr_logged", "closed"].includes(record.status) && (
      <>
        <Button
          size="sm"
          onClick={() => onSubmit(record.id)}
          disabled={submittingId === record.id}
          className="h-7 rounded-[4px] bg-[#881337] px-2.5 text-[10px] font-medium text-white hover:bg-[#70102b] dark:bg-[#9f1239] dark:hover:bg-[#881337]"
        >
          {submittingId === record.id ? <LoaderCircle className="mr-1 h-3 w-3 animate-spin text-white" /> : <CheckCircle2 className="mr-1 h-3 w-3" />}
          {record.status === "approval_review" ? "Accept Package" : "Approve & Forward"}
        </Button>
        <Button size="sm" variant="outline" onClick={() => setRejectingId(record.id)} className="h-7 border-[#d8a7a7] px-2.5 text-[10px] text-[#9c2525] dark:border-[#ff837a] dark:text-[#ff837a]">
          Reject
        </Button>
      </>
    )}
    {record.status === "returned" && !canReject && (
      <Button
        size="sm"
        onClick={() => { onSelectPr?.(record.id); onResubmit(record.id); }}
        disabled={resubmittingId === record.id}
        className="h-7 rounded-[4px] bg-[#9a6d19] px-2.5 text-[10px] font-semibold text-white hover:bg-[#7e5712] dark:bg-[#b98a2b] dark:hover:bg-[#a1771f]"
      >
        {resubmittingId === record.id ? <LoaderCircle className="mr-1 h-3 w-3 animate-spin text-white" /> : <FileCheck2 className="mr-1 h-3 w-3" />}
        Update and Resubmit
      </Button>
    )}
    {record.status !== "draft" && record.status !== "returned" && !canReject && <span className="text-[11px] text-[#87909b] dark:text-[#aeb9c4]">{record.status === "delivered" ? "Final records in progress" : "In progress"}</span>}
  </div>}</td></tr>;
  })}</tbody></RecordTable>;
}

const BSC_PR_CATEGORIES = [
  "Office Supplies",
  "Hardware & Construction",
  "Computers & ICT Equipment",
  "Printing Services",
  "Food & Catering",
  "Janitorial & Cleaning",
  "Laboratory Supplies",
  "Sports & Athletic Goods",
  "Vehicle Maintenance & Fuel",
] as const;

const BSC_PR_UNITS = ["Ream", "Box", "Piece", "Pack", "Unit", "Lot", "Set"] as const;

const WIZARD_STEP_TITLES: Record<1 | 2 | 3 | 4, string> = {
  1: "Upload Your Approved Budget Plan",
  2: "Select Category and Add Items",
  3: "Purpose of Request & Market Scoping",
  4: "Review Your Request Before Submitting",
};

const STRICT_PPMP_ACCEPT =
  ".pdf, .xlsx, .xls, application/pdf, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel";
const MAX_PPMP_BYTES = 10 * 1024 * 1024; // 10MB

function isStrictPpmpFileValid(file: File): boolean {
  const validExt = /\.(pdf|xlsx|xls)$/i.test(file.name.trim());
  const validMime =
    [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "application/octet-stream",
      "",
    ].includes(file.type) && validExt;
  const validSize = file.size > 0 && file.size <= MAX_PPMP_BYTES;
  return Boolean(validExt && validMime && validSize);
}

function PurchaseRequestForm({
  setup,
  ppmpEntries,
  catalogItemIds,
  catalogSelection,
  isSaving,
  initialMode = "upload",
  onCancel,
  onCreate,
}: {
  setup?: { offices: Array<{ id: number; code: string; name: string }>; objectsOfExpenditure: Array<{ id: number; code: string; name: string }>; settings?: any };
  ppmpEntries?: Array<{ id: number; description: string; fiscalYear: number; officeId?: number; objectOfExpenditureId?: number; plannedAmount?: string | number }>;
  catalogItemIds: number[];
  catalogSelection: Array<{ id: number; quantity: string }>;
  isSaving: boolean;
  initialMode?: "upload" | "existing";
  onCancel: () => void;
  onCreate: (
    input: {
      purpose: string;
      category?: string;
      ppmpFileName?: string;
      fundSource?: string;
      fundCluster?: string;
      responsibilityCenterCode?: string;
      requesterDesignation?: string;
      requestedSignatoryId?: number;
      approvedSignatoryId?: number;
      ppmpEntryId?: number;
      officeId: number;
      objectOfExpenditureId: number;
      items: Array<{
        catalogItemId?: number;
        stockPropertyNo?: string;
        description: string;
        specification?: string;
        quantity: number;
        unit: string;
        estimatedUnitCost: number;
      }>;
    },
    uploadedPpmpFile?: { name: string; type: string; size: number; base64: string } | null,
    newPpmpData?: { title: string; fiscalYear: number; plannedAmount?: number } | null,
    marketScopingFile?: { name: string; type: string; size: number; base64: string } | null
  ) => void;
}) {
  const utils = trpc.useUtils();
  const { user } = useAuth();

  // Linear 4-Step Wizard State Machine (persisted in sessionStorage to prevent accidental refresh loss)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(() => {
    try {
      const saved = Number(sessionStorage.getItem("procurewise.prWizardStep"));
      if (saved === 1 || saved === 2 || saved === 3 || saved === 4) return saved;
    } catch {}
    return 1;
  });

  useEffect(() => {
    try {
      sessionStorage.setItem("procurewise.prWizardStep", String(currentStep));
    } catch {}
  }, [currentStep]);

  // Step 1: PPMP Budget Plan & Strict File Validation state
  const [ppmpMode, setPpmpMode] = useState<"upload" | "existing">(initialMode);
  const [selectedPpmpId, setSelectedPpmpId] = useState<string>("");
  const [customPpmpTitle, setCustomPpmpTitle] = useState("");
  const [customPpmpYear, setCustomPpmpYear] = useState<number>(new Date().getFullYear());
  const [ppmpOfficeId, setPpmpOfficeId] = useState("");
  const [ppmpObjectId, setPpmpObjectId] = useState("");
  const [customPpmpBudget, setCustomPpmpBudget] = useState("");
  const [customFundSource, setCustomFundSource] = useState("General Appropriations Act");
  const [uploadedFile, setUploadedFile] = useState<{ name: string; type: string; size: number; base64: string } | null>(null);
  const [ppmpFileError, setPpmpFileError] = useState<string | null>(null);
  const [marketScopingFile, setMarketScopingFile] = useState<{ name: string; type: string; size: number; base64: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingPpmpFile, setIsDraggingPpmpFile] = useState(false);
  const marketScopingFileInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingMarketScopingFile, setIsDraggingMarketScopingFile] = useState(false);

  // Pre-select user's assigned office and default expenditure object if available
  useEffect(() => {
    if (!ppmpOfficeId && setup?.offices?.length) {
      if (user?.officeName) {
        const match = setup.offices.find(
          (o) =>
            o.name.toLowerCase() === user.officeName!.toLowerCase() ||
            o.code.toLowerCase() === user.officeName!.toLowerCase() ||
            o.name.toLowerCase().includes(user.officeName!.toLowerCase()) ||
            user.officeName!.toLowerCase().includes(o.name.toLowerCase())
        );
        if (match) {
          setPpmpOfficeId(String(match.id));
          setOfficeId(String(match.id));
          return;
        }
      }
      setPpmpOfficeId(String(setup.offices[0].id));
      setOfficeId(String(setup.offices[0].id));
    }
  }, [user?.officeName, setup?.offices, ppmpOfficeId]);

  useEffect(() => {
    if (!ppmpObjectId && setup?.objectsOfExpenditure?.length) {
      setPpmpObjectId(String(setup.objectsOfExpenditure[0].id));
      setObjectId(String(setup.objectsOfExpenditure[0].id));
    }
  }, [setup?.objectsOfExpenditure, ppmpObjectId]);

  // Step 2: Category & Items state
  const [selectedCategory, setSelectedCategory] = useState<string>("Office Supplies");
  const [items, setItems] = useState<RequestItem[]>([
    {
      catalogItemId: "",
      stockPropertyNo: "",
      description: "",
      specification: "",
      quantity: "1",
      unit: "Ream",
      estimatedUnitCost: "",
    },
  ]);
  const [showCatalogPicker, setShowCatalogPicker] = useState(true);

  // Step 3: Purpose & Signatories state
  const [purpose, setPurpose] = useState("");
  const [fundSource, setFundSource] = useState("General Appropriations Act");
  const [fundCluster, setFundCluster] = useState("01101101");
  const [responsibilityCenterCode, setResponsibilityCenterCode] = useState("");
  const [requestedSignatoryChoice, setRequestedSignatoryChoice] = useState("");
  const [approvedSignatoryChoice, setApprovedSignatoryChoice] = useState("");
  const [officeId, setOfficeId] = useState("");
  const [objectId, setObjectId] = useState("");
  const [showAppendixPreview, setShowAppendixPreview] = useState(false);

  // Strict Client-Side PPMP File Validation Catch (.pdf, .xlsx, .xls <= 10MB)
  const handlePpmpFile = (file?: File) => {
    if (!file) return;
    if (!isStrictPpmpFileValid(file)) {
      const errMsg =
        "File not accepted. Please upload only official PDF or Excel (.xlsx, .xls) files under 10MB.";
      setPpmpFileError(errMsg);
      setUploadedFile(null);
      toast.error(errMsg);
      return;
    }

    setPpmpFileError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      setUploadedFile({
        name: file.name,
        type: file.type || "application/pdf",
        size: file.size,
        base64,
      });
      if (!customPpmpTitle.trim()) {
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
        setCustomPpmpTitle(nameWithoutExt);
      }
      toast.success(`Official PPMP document verified: ${file.name}`);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    handlePpmpFile(event.target.files?.[0]);
    event.currentTarget.value = "";
  };

  const removeUploadedFile = () => {
    setUploadedFile(null);
    setPpmpFileError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleMarketScopingFile = (file?: File | null) => {
    if (!file) return;
    if (file.size > MAX_PPMP_BYTES) {
      toast.error("Supporting Market Scoping file exceeds the 10MB limit.");
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => toast.error("The Market Scoping file could not be read.");
    reader.onload = () => {
      const result = String(reader.result || "");
      setMarketScopingFile({
        name: file.name,
        type: file.type || "application/pdf",
        size: file.size,
        base64: result.includes(",") ? result.split(",")[1] : result,
      });
      toast.success(`Attached Market Scoping file: ${file.name}`);
    };
    reader.readAsDataURL(file);
  };

  const removeMarketScopingFile = () => {
    setMarketScopingFile(null);
    if (marketScopingFileInputRef.current) {
      marketScopingFileInputRef.current.value = "";
    }
  };

  // Catalog Queries (preserved for common-use catalog integration)
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogCodeFamily, setCatalogCodeFamily] = useState("all");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const catalogInput = useMemo(
    () => ({
      search: catalogSearch.trim() || undefined,
      codeFamily: catalogCodeFamily === "all" ? undefined : catalogCodeFamily,
      page: 1,
      limit: 100,
    }),
    [catalogSearch, catalogCodeFamily]
  );
  const catalog = trpc.procurement.catalog.list.useQuery(catalogInput, { retry: false });
  const codeFamilies = trpc.procurement.catalog.codeFamilies.useQuery(undefined, { retry: false });
  const favorites = trpc.procurement.catalog.favorites.useQuery(undefined, { retry: false });
  const signatories = trpc.procurement.purchaseRequests.signatories.useQuery(undefined, { retry: false });
  const favoriteIds = useMemo(
    () => new Set((favorites.data ?? []).map((catalogItem) => catalogItem.id)),
    [favorites.data]
  );
  const catalogItems = useMemo(() => {
    if (!favoritesOnly) return catalog.data?.items ?? [];
    const search = catalogSearch.trim().toLowerCase();
    return (favorites.data ?? []).filter(
      (catalogItem) =>
        (!catalogCodeFamily ||
          catalogCodeFamily === "all" ||
          catalogItem.productCode.startsWith(catalogCodeFamily)) &&
        (!search ||
          catalogItem.productCode.toLowerCase().includes(search) ||
          catalogItem.description.toLowerCase().includes(search))
    );
  }, [catalog.data?.items, catalogCodeFamily, catalogSearch, favorites.data, favoritesOnly]);
  const toggleFavorite = trpc.procurement.catalog.setFavorite.useMutation({
    onSuccess: () => {
      void utils.procurement.catalog.favorites.invalidate();
    },
    onError: (error) => toast.error(formatFriendlyError(error)),
  });

  useEffect(() => {
    const selectedItems = (catalog.data?.items ?? []).filter((item) => catalogItemIds.includes(item.id));
    if (!selectedItems.length) return;
    const quantityById = new Map(catalogSelection.map((selection) => [selection.id, selection.quantity]));
    setItems((current) =>
      current.length === 1 && !current[0].description && !current[0].catalogItemId
        ? selectedItems.map((selected) => ({
            catalogItemId: String(selected.id),
            stockPropertyNo: selected.productCode,
            description: selected.description,
            specification: selected.remarks || "",
            quantity: quantityById.get(selected.id) || "1",
            unit: selected.unit || "Piece",
            estimatedUnitCost: String(selected.referencePrice),
          }))
        : current
    );
    sessionStorage.removeItem("procurewise.catalogSelection");
  }, [catalog.data?.items, catalogItemIds, catalogSelection]);

  const configurationReady = Boolean(setup?.offices.length && setup.objectsOfExpenditure.length);
  const requesterSignatories = useMemo(
    () => (signatories.data ?? []).filter((signatory) => Boolean(signatory.mayRequest)),
    [signatories.data]
  );
  const approverSignatories = useMemo(
    () => (signatories.data ?? []).filter((signatory) => Boolean(signatory.mayApprove)),
    [signatories.data]
  );
  const signatoryLabel = (signatory: { fullName: string; designation: string }) =>
    `${signatory.fullName} — ${signatory.designation}`;
  const selectedRequestedSignatory = requesterSignatories.find(
    (signatory) => signatoryLabel(signatory) === requestedSignatoryChoice
  );
  const selectedApprovedSignatory = approverSignatories.find(
    (signatory) => signatoryLabel(signatory) === approvedSignatoryChoice
  );

  const resolvedOfficeIdValue = officeId || ppmpOfficeId;
  const resolvedObjectIdValue = objectId || ppmpObjectId;
  const selectedOffice = setup?.offices.find((office) => String(office.id) === resolvedOfficeIdValue);

  const total = useMemo(
    () =>
      items.reduce(
        (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.estimatedUnitCost) || 0),
        0
      ),
    [items]
  );

  const categoryAnalysis = useMemo(() => {
    const validItems = items.filter((item) => item.description.trim().length > 0);
    return detectMixedCategories(validItems);
  }, [items]);

  const updateItem = (index: number, field: keyof RequestItem, value: string) =>
    setItems((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item))
    );

  const addItem = () =>
    setItems((current) => [
      ...current,
      {
        catalogItemId: "",
        stockPropertyNo: "",
        description: "",
        specification: "",
        quantity: "1",
        unit: "Ream",
        estimatedUnitCost: "",
      },
    ]);

  const linkedExistingPpmp = useMemo(
    () =>
      ppmpMode === "existing"
        ? ppmpEntries?.find((entry) => String(entry.id) === selectedPpmpId)
        : undefined,
    [ppmpMode, ppmpEntries, selectedPpmpId]
  );

  const activeBudgetCeiling = useMemo(() => {
    if (ppmpMode === "existing" && selectedPpmpId) {
      const amt = Number(linkedExistingPpmp?.plannedAmount);
      if (!isNaN(amt) && amt > 0) return amt;
    }
    const custom = Number(customPpmpBudget);
    return !isNaN(custom) && custom > 0 ? custom : 0;
  }, [ppmpMode, selectedPpmpId, linkedExistingPpmp, customPpmpBudget]);

  const isOverBudget = activeBudgetCeiling > 0 && total > activeBudgetCeiling + 0.001;
  const remainingBudget = activeBudgetCeiling > 0 ? Math.max(0, activeBudgetCeiling - total) : 0;
  const overBudgetAmount = isOverBudget ? total - activeBudgetCeiling : 0;
  const budgetUtilizationRatio = activeBudgetCeiling > 0 ? total / activeBudgetCeiling : 0;
  const budgetUtilizationPct = activeBudgetCeiling > 0 ? Math.min(Math.round(budgetUtilizationRatio * 100), 999) : 0;

  // Step 1 Valid Check: Next Step button remains disabled until a valid document passes inspection (or existing PPMP selected) and positive ceiling is set
  const isCustomBudgetValid =
    ppmpMode === "upload" ? !isNaN(Number(customPpmpBudget)) && Number(customPpmpBudget) > 0 : true;

  const isStep1Valid =
    ppmpMode === "upload"
      ? Boolean(uploadedFile && !ppmpFileError && isCustomBudgetValid)
      : Boolean(selectedPpmpId);

  const handleAdvanceFromStep1 = () => {
    if (
      ppmpMode === "upload" &&
      (!customPpmpBudget.trim() || isNaN(Number(customPpmpBudget)) || Number(customPpmpBudget) <= 0)
    ) {
      toast.error("Please enter a valid Approved PPMP Budget Ceiling greater than ₱0.00.");
      return;
    }
    if (!isStep1Valid) {
      setPpmpFileError(
        "File not accepted. Please upload only official PDF or Excel (.xlsx, .xls) files under 10MB."
      );
      return;
    }
    if (ppmpOfficeId) setOfficeId(ppmpOfficeId);
    if (ppmpObjectId) setObjectId(ppmpObjectId);
    setFundSource(customFundSource.trim() || "General Appropriations Act");
    setCurrentStep(2);
  };

  const handleAdvanceFromStep2 = () => {
    setAttemptedSubmit(true);
    if (!selectedCategory.trim()) {
      toast.error("Please choose an Item Category under Rule 5.1.1.");
      return;
    }
    if (!items.length) {
      toast.error("Please add at least one line item.");
      return;
    }
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const itemNum = i + 1;
      if (!item.description.trim()) {
        toast.error(`Item #${itemNum}: Please enter the Item Name & Specification.`);
        return;
      }
      const qty = Number(item.quantity);
      if (!item.quantity.trim() || isNaN(qty) || qty <= 0) {
        toast.error(`Item #${itemNum}: Quantity must be greater than 0.`);
        return;
      }
      if (!item.unit.trim()) {
        toast.error(`Item #${itemNum}: Please choose a Unit.`);
        return;
      }
      const cost = Number(item.estimatedUnitCost);
      if (!item.estimatedUnitCost.trim() || isNaN(cost) || cost <= 0) {
        toast.error(`Item #${itemNum}: Estimated Unit Price must be greater than ₱0.00.`);
        return;
      }
    }
    if (categoryAnalysis.isMixed) {
      toast.error(
        `Rule 5.1.1 Alert: Mixed item categories detected (${categoryAnalysis.categoryLabels.join(
          " + "
        )}). Please keep only one type of item in this request.`
      );
      return;
    }
    if (isOverBudget) {
      toast.error(
        `Budget Limiter Alert: Total Estimated Cost (₱${total.toLocaleString("en-PH", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}) exceeds the Approved PPMP Budget Ceiling of ₱${activeBudgetCeiling.toLocaleString("en-PH", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })} by ₱${overBudgetAmount.toLocaleString("en-PH", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}. Please adjust item quantities or unit prices before proceeding.`
      );
      return;
    }
    setAttemptedSubmit(false);
    setCurrentStep(3);
  };

  const handleAdvanceFromStep3 = () => {
    if (purpose.trim().length < 10) {
      toast.error(
        "Please explain the purpose of your request in at least 10 characters (1–2 plain sentences)."
      );
      return;
    }
    if (!marketScopingFile) {
      toast.error(
        "Market Scoping document is mandatory under RA 12009 Art. II. Please upload your market scoping analysis before proceeding."
      );
      return;
    }
    setCurrentStep(4);
  };

  const handleFinalSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setAttemptedSubmit(true);

    if (isOverBudget) {
      toast.error(
        `Cannot submit: Total Estimated Cost (₱${total.toLocaleString("en-PH", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}) exceeds the Approved PPMP Budget Ceiling of ₱${activeBudgetCeiling.toLocaleString("en-PH", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}.`
      );
      return;
    }

    if (!marketScopingFile) {
      toast.error(
        "Cannot submit: Market Scoping document is mandatory under RA 12009 Art. II. Please upload your market scoping file before submitting."
      );
      return;
    }

    const resolvedOffice =
      setup?.offices.find((o) => String(o.id) === resolvedOfficeIdValue) ||
      setup?.offices.find((o) => o.code.toLowerCase() === resolvedOfficeIdValue.toLowerCase()) ||
      setup?.offices.find((o) => o.name.toLowerCase() === resolvedOfficeIdValue.toLowerCase()) ||
      setup?.offices[0];
    const finalOfficeId = resolvedOffice ? resolvedOffice.id : Number(resolvedOfficeIdValue) || 1;
    const finalObjectId = Number(resolvedObjectIdValue) || setup?.objectsOfExpenditure[0]?.id || 1;

    const ppmpTitle =
      linkedExistingPpmp?.description ||
      customPpmpTitle.trim() ||
      (uploadedFile ? uploadedFile.name.replace(/\.[^/.]+$/, "") : `${selectedCategory} PPMP`);

    const plannedBudgetNum =
      activeBudgetCeiling > 0
        ? activeBudgetCeiling
        : Number(customPpmpBudget) || Math.max(total, 1000);

    try {
      sessionStorage.removeItem("procurewise.prWizardStep");
    } catch {}

    onCreate(
      {
        purpose: purpose.trim(),
        category: selectedCategory,
        ppmpFileName: uploadedFile?.name || linkedExistingPpmp?.description || "Approved Department PPMP.pdf",
        fundSource: fundSource.trim() || undefined,
        fundCluster: fundCluster.trim() || "01101101",
        responsibilityCenterCode: responsibilityCenterCode.trim() || undefined,
        requesterDesignation: selectedRequestedSignatory?.designation || undefined,
        requestedSignatoryId: selectedRequestedSignatory?.id,
        approvedSignatoryId: selectedApprovedSignatory?.id,
        ppmpEntryId: linkedExistingPpmp?.id,
        officeId: finalOfficeId,
        objectOfExpenditureId: finalObjectId,
        items: items.map((item) => ({
          catalogItemId: item.catalogItemId ? Number(item.catalogItemId) : undefined,
          stockPropertyNo: item.stockPropertyNo.trim() || undefined,
          description: item.description.trim(),
          specification: item.specification.trim() || undefined,
          quantity: Number(item.quantity),
          unit: item.unit.trim(),
          estimatedUnitCost: Number(item.estimatedUnitCost),
        })),
      },
      uploadedFile,
      linkedExistingPpmp
        ? null
        : {
            title: ppmpTitle,
            fiscalYear: customPpmpYear || new Date().getFullYear(),
            plannedAmount: plannedBudgetNum,
          },
      marketScopingFile
    );
  };

  return (
    <form onSubmit={handleFinalSubmit} className="mt-6 space-y-6">
      {/* 1. Linear Wizard Progress Header */}
      <div className="flex flex-col gap-2 rounded-2xl bg-slate-100 p-4 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Step {currentStep} of 4: {WIZARD_STEP_TITLES[currentStep]}
          </span>
          <QuietCompliancePill
            stepNumber="Step 5.1"
            annexForm="Budget Linkage & PPMP Attachment (Annex B)"
            procedureRef="BSC – PRO -QP- 95 – 1"
            role="End-User"
          />
        </div>
        <div
          className="grid grid-cols-4 gap-2 pt-1"
          role="progressbar"
          aria-label="Purchase Request 4-Step Wizard Progress"
          aria-valuemin={1}
          aria-valuemax={4}
          aria-valuenow={currentStep}
        >
          {([1, 2, 3, 4] as const).map((stepNumber) => (
            <div
              key={stepNumber}
              className={
                stepNumber <= currentStep
                  ? "h-3 rounded-full bg-[#881337] transition-colors"
                  : "h-3 rounded-full bg-slate-300 dark:bg-slate-700 transition-colors"
              }
            />
          ))}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* STEP 1 OF 4: UPLOAD YOUR APPROVED BUDGET PLAN (PPMP)                  */}
      {/* ===================================================================== */}
      {currentStep === 1 && (
        <section className="rounded-2xl border-2 border-slate-300 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900 space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-slate-200 pb-4 dark:border-slate-800">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Step 1 of 4: Upload Your Approved Budget Plan
              </h2>
              <p className="mt-1.5 text-base text-slate-700 dark:text-slate-300">
                Upload your signed Project Procurement Management Plan (PPMP) file to verify your budget before adding items.
              </p>
            </div>
            <QuietCompliancePill
              stepNumber="Step 5.1"
              annexForm="Budget Linkage & PPMP Attachment (Annex B)"
              procedureRef="BSC – PRO -QP- 95 – 1"
              role="End-User"
            />
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept={STRICT_PPMP_ACCEPT}
            onChange={handleFileChange}
            className="hidden"
            id="ppmp-strict-file-upload"
          />

          {/* File Dropzone / Active Uploaded File Container */}
          {!uploadedFile ? (
            <div
              onDragOver={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setIsDraggingPpmpFile(true);
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setIsDraggingPpmpFile(false);
              }}
              onDrop={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setIsDraggingPpmpFile(false);
                handlePpmpFile(event.dataTransfer.files?.[0]);
              }}
              className={`min-h-[180px] rounded-2xl border-2 border-dashed p-6 flex flex-col items-center justify-center text-center transition-colors ${
                isDraggingPpmpFile
                  ? "border-[#881337] bg-rose-50/60 dark:border-rose-400 dark:bg-rose-950/30"
                  : "border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/50"
              }`}
            >
              <UploadCloud className="h-9 w-9 text-[#881337] dark:text-rose-400" aria-hidden="true" />
              <p className="mt-3 text-lg font-bold text-slate-900 dark:text-slate-100">
                Choose a file or drag it here
              </p>
              <p className="mt-1.5 max-w-xl text-sm font-medium text-slate-600 dark:text-slate-300">
                Accepted formats only: .pdf, .xlsx, .xls (Max size: 10MB). Scanned pictures, Word files, and zip folders cannot be accepted.
              </p>
              <div className="mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="min-h-12 px-6 py-3 border-2 border-slate-300 rounded-xl font-bold bg-white text-slate-900 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  <Folder className="h-5 w-5 text-[#881337] dark:text-rose-400" />
                  <span>Browse File</span>
                </Button>
              </div>
            </div>
          ) : (
            <div className="min-h-[180px] rounded-2xl border-2 border-emerald-400 bg-emerald-50/80 p-6 dark:border-emerald-700 dark:bg-emerald-950/30 flex flex-col items-center justify-center text-center transition-all">
              <CheckCircle2 className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
              <p className="mt-3 max-w-xl truncate text-lg font-bold text-slate-900 dark:text-slate-100" title={uploadedFile.name}>
                {uploadedFile.name}
              </p>
              <p className="mt-1 text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                {(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB · Verified Official PPMP File
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="min-h-11 border-2 border-emerald-500 bg-white px-4 py-2 text-sm font-bold text-emerald-800 hover:bg-emerald-50 dark:border-emerald-600 dark:bg-slate-900 dark:text-emerald-300"
                >
                  <Upload className="h-4 w-4" />
                  <span>Change File</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={removeUploadedFile}
                  className="min-h-11 border-2 border-rose-300 bg-white px-4 py-2 text-sm font-bold text-rose-800 hover:bg-rose-50 dark:border-rose-800 dark:bg-slate-900 dark:text-rose-300"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Remove and choose another file</span>
                </Button>
              </div>
            </div>
          )}

          {/* Inline Error Alert (on invalid file type/size) */}
          {ppmpFileError && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-xl border-2 border-rose-300 bg-rose-50 p-4 text-base font-semibold text-rose-950 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-200"
            >
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-700 dark:text-rose-400" />
              <span>
                File not accepted. Please upload only official PDF or Excel (.xlsx, .xls) files under 10MB.
              </span>
            </div>
          )}

          {/* Department / Office & Budget Allocation Details */}
          <div className="grid gap-4 pt-2 sm:grid-cols-3">
            <div>
              <Label className="text-base font-bold text-slate-900 dark:text-slate-100">
                Requesting Office / Department
              </Label>
              <div className="mt-2">
                <OfficeSelect
                  value={ppmpOfficeId}
                  valueMode="id"
                  onChange={(val) => {
                    setPpmpOfficeId(val);
                    setOfficeId(val);
                  }}
                  customOffices={setup?.offices}
                  disabled={!configurationReady}
                  placeholder="Select your BSC Office / Department"
                />
              </div>
            </div>

            <div>
              <Label className="text-base font-bold text-slate-900 dark:text-slate-100">
                Budget Allocation Class
              </Label>
              <Select
                value={ppmpObjectId}
                onValueChange={(val) => {
                  setPpmpObjectId(val);
                  setObjectId(val);
                }}
                disabled={!configurationReady}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select expenditure class" />
                </SelectTrigger>
                <SelectContent>
                  {setup?.objectsOfExpenditure.map((object) => (
                    <SelectItem key={object.id} value={String(object.id)}>
                      {object.code} — {object.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="ppmp-budget-ceiling" className="text-base font-bold text-slate-900 dark:text-slate-100">
                Approved PPMP Budget Ceiling (PHP) <span className="text-rose-700 dark:text-rose-400">*</span>
              </Label>
              <Input
                id="ppmp-budget-ceiling"
                type="number"
                min="1"
                step="0.01"
                value={customPpmpBudget}
                onChange={(e) => setCustomPpmpBudget(e.target.value)}
                placeholder="e.g., 50000.00"
                className={`mt-2 ${
                  customPpmpBudget.trim() && (isNaN(Number(customPpmpBudget)) || Number(customPpmpBudget) <= 0)
                    ? "border-rose-500 focus-visible:ring-rose-500"
                    : ""
                }`}
              />
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Mandatory budget ceiling under BSC Budgetary Control. Total line items in Step 2 cannot exceed this amount.
              </p>
            </div>
          </div>

          {/* Step 1 Bottom Navigation */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-t-2 border-slate-200 pt-5 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={onCancel} className="min-h-12">
              <X className="h-5 w-5" />
              <span>Cancel Request</span>
            </Button>

            <Button
              type="button"
              disabled={!isStep1Valid}
              onClick={handleAdvanceFromStep1}
              className="min-h-12 bg-[#881337] text-white hover:bg-[#70102e]"
            >
              <span>Next Step: Select Category &amp; Add Items</span>
              <ArrowRight className="h-5 w-5" />
            </Button>
          </div>
        </section>
      )}

      {/* ===================================================================== */}
      {/* STEP 2 OF 4: SELECT CATEGORY AND ADD ITEMS (CLAUSE 5.1.1)             */}
      {/* ===================================================================== */}
      {currentStep === 2 && (
        <section className="rounded-2xl border-2 border-slate-300 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900 space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-slate-200 pb-4 dark:border-slate-800">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Step 2 of 4: Select Category and Add Items
              </h2>
              <p className="mt-1.5 text-base text-slate-700 dark:text-slate-300">
                Choose the single item category for this Purchase Request and list each item you need.
              </p>
            </div>
            <QuietCompliancePill
              stepNumber="Clause 5.1.1"
              annexForm="Appendix 60 (Annex A)"
              procedureRef="Single-Category Rule"
              role="End-User"
            />
          </div>

          {/* PPMP Budget Ceiling Context Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/90 px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-800/50">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                Approved Budget Plan:
              </span>
              <span className="truncate text-slate-600 dark:text-slate-300">
                {uploadedFile?.name || (linkedExistingPpmp?.description ? linkedExistingPpmp.description : "Approved Department PPMP")}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-slate-500 dark:text-slate-400">
                  Approved PPMP Ceiling:
                </span>
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  ₱ {activeBudgetCeiling.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  isOverBudget
                    ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                    : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                }`}
              >
                {isOverBudget
                  ? `Over ceiling (+₱${overBudgetAmount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`
                  : `₱${remainingBudget.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} remaining`}
              </span>
            </div>
          </div>

          {/* College Rule Banner */}
          <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4 text-base text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100">
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 h-6 w-6 shrink-0 text-amber-800 dark:text-amber-300" />
              <p className="font-semibold">
                Rule 5.1.1: Every request can contain only one type of item (e.g., all office supplies or all computer equipment). Different item categories cannot be mixed in one request.
              </p>
            </div>
          </div>

          {/* Category Selector */}
          <div className="max-w-xl">
            <Label htmlFor="pr-category-select" className="text-base font-bold text-slate-900 dark:text-slate-100">
              Item Category (Clause 5.1.1) <span className="text-rose-700">*</span>
            </Label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger id="pr-category-select" className="mt-2 min-h-12 text-base rounded-xl border-2">
                <SelectValue placeholder="Choose one item category" />
              </SelectTrigger>
              <SelectContent>
                {BSC_PR_CATEGORIES.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Optional Common-Use Procurement Catalog Lookup */}
          <div className="rounded-xl border-2 border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Common-Use Procurement Catalog (Optional Helper)
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Search PhilGEPS reference prices or enter your item specifications directly below.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCatalogPicker((prev) => !prev)}
                className="min-h-12"
              >
                <Search className="h-5 w-5" />
                <span>{showCatalogPicker ? "Hide Catalog Filters" : "Filter Common-Use Catalog"}</span>
              </Button>
            </div>

            {showCatalogPicker && (
              <div className="mt-4 grid gap-4 sm:grid-cols-[1.25fr_1fr_auto]">
                <div>
                  <Label htmlFor="catalog-search" className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    Find a common-use catalog item
                  </Label>
                  <Input
                    id="catalog-search"
                    value={catalogSearch}
                    onChange={(event) => setCatalogSearch(event.target.value)}
                    placeholder="Search code or description"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    Source code family
                  </Label>
                  <Select value={catalogCodeFamily} onValueChange={setCatalogCodeFamily}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All source code families</SelectItem>
                      {codeFamilies.data?.map((family) => (
                        <SelectItem key={family.codeFamily} value={family.codeFamily}>
                          {family.label} · {family.itemCount}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant={favoritesOnly ? "default" : "outline"}
                    onClick={() => setFavoritesOnly((current) => !current)}
                    className="min-h-12 w-full"
                  >
                    <Star className={favoritesOnly ? "h-5 w-5 fill-current" : "h-5 w-5"} />
                    <span>Favorites ({favorites.data?.length ?? 0})</span>
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Item Entry Form Cards (2px border, 16px font) */}
          <div className="space-y-4">
            {items.map((item, index) => {
              const lineTotal = (Number(item.quantity) || 0) * (Number(item.estimatedUnitCost) || 0);
              return (
                <div
                  key={index}
                  className="rounded-2xl border-2 border-slate-300 bg-slate-50/60 p-5 dark:border-slate-700 dark:bg-slate-800/40 space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-base font-bold text-slate-900 dark:text-slate-100">
                      Item #{index + 1} · {selectedCategory}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-base font-bold text-[#881337] dark:text-rose-400">
                        Line Subtotal: ₱{lineTotal.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      {items.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setItems((current) => current.filter((_, idx) => idx !== index))}
                          className="min-h-12 border-2 border-rose-300 text-rose-800 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300"
                        >
                          <Trash2 className="h-5 w-5" />
                          <span>Remove Item</span>
                        </Button>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                      Choose from Common-Use Catalog (or enter specifications manually below)
                    </Label>
                    <Select
                      value={item.catalogItemId || "manual-item"}
                      onValueChange={(value) => {
                        if (value === "manual-item") return updateItem(index, "catalogItemId", "");
                        const selected = [...catalogItems, ...(favorites.data ?? [])].find(
                          (catalogItem) => String(catalogItem.id) === value
                        );
                        if (!selected) return;
                        setItems((current) =>
                          current.map((currentItem, itemIndex) =>
                            itemIndex === index
                              ? {
                                  ...currentItem,
                                  catalogItemId: value,
                                  stockPropertyNo: selected.productCode,
                                  description: selected.description,
                                  unit: selected.unit || "Piece",
                                  estimatedUnitCost: Number(selected.referencePrice).toFixed(2),
                                }
                              : currentItem
                          )
                        );
                      }}
                    >
                      <SelectTrigger className="mt-1.5 min-h-11">
                        <SelectValue placeholder="Manual entry or choose a catalog item" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual-item">Manual entry — type specifications directly below</SelectItem>
                        {catalogItems.map((catalogItem) => (
                          <SelectItem key={catalogItem.id} value={String(catalogItem.id)}>
                            {favoriteIds.has(catalogItem.id) ? "★ " : ""}
                            {catalogItem.productCode} — {catalogItem.description} (₱{Number(catalogItem.referencePrice).toLocaleString("en-PH", { minimumFractionDigits: 2 })})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-12">
                    <div className="sm:col-span-6">
                      <Label
                        htmlFor={`item-desc-${index}`}
                        className="text-base font-bold text-slate-900 dark:text-slate-100"
                      >
                        Item Name &amp; Specification <span className="text-rose-700">*</span>
                      </Label>
                      <Input
                        id={`item-desc-${index}`}
                        value={item.description}
                        onChange={(event) => updateItem(index, "description", event.target.value)}
                        placeholder="e.g., A4 Bond Paper, 80gsm, White"
                        aria-invalid={attemptedSubmit && !item.description.trim()}
                        className="mt-2 text-base"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <Label
                        htmlFor={`item-qty-${index}`}
                        className="text-base font-bold text-slate-900 dark:text-slate-100"
                      >
                        Quantity <span className="text-rose-700">*</span>
                      </Label>
                      <Input
                        id={`item-qty-${index}`}
                        type="number"
                        min="1"
                        step="any"
                        value={item.quantity}
                        onChange={(event) => updateItem(index, "quantity", event.target.value)}
                        placeholder="e.g., 20"
                        aria-invalid={attemptedSubmit && (!item.quantity.trim() || Number(item.quantity) <= 0)}
                        className="mt-2 text-base"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <Label className="text-base font-bold text-slate-900 dark:text-slate-100">
                        Unit <span className="text-rose-700">*</span>
                      </Label>
                      <Select
                        value={BSC_PR_UNITS.includes(item.unit as any) ? item.unit : "Piece"}
                        onValueChange={(value) => updateItem(index, "unit", value)}
                      >
                        <SelectTrigger className="mt-2 min-h-12 text-base">
                          <SelectValue placeholder="Select unit" />
                        </SelectTrigger>
                        <SelectContent>
                          {BSC_PR_UNITS.map((unitOption) => (
                            <SelectItem key={unitOption} value={unitOption}>
                              {unitOption}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="sm:col-span-2">
                      <Label
                        htmlFor={`item-price-${index}`}
                        className="text-base font-bold text-slate-900 dark:text-slate-100"
                      >
                        Estimated Unit Price (PHP) <span className="text-rose-700">*</span>
                      </Label>
                      <Input
                        id={`item-price-${index}`}
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={item.estimatedUnitCost}
                        onChange={(event) => updateItem(index, "estimatedUnitCost", event.target.value)}
                        placeholder="e.g., 250.00"
                        aria-invalid={
                          attemptedSubmit &&
                          (!item.estimatedUnitCost.trim() || Number(item.estimatedUnitCost) <= 0)
                        }
                        className="mt-2 text-base"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Mixed Category Alert if Clause 5.1.1 is violated */}
          {categoryAnalysis.isMixed && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-xl border-2 border-rose-300 bg-rose-50 p-4 text-base font-semibold text-rose-950 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-200"
            >
              <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-rose-700 dark:text-rose-400" />
              <span>
                Clause 5.1.1 Mixed-Category Alert: Your items appear to mix{" "}
                <strong>{categoryAnalysis.categoryLabels.join(" and ")}</strong>. Please separate different item categories into separate Purchase Requests.
              </span>
            </div>
          )}

          {/* Budget Limiter Over-Ceiling Warning Banner */}
          {isOverBudget && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-xl border-2 border-rose-500 bg-rose-50 p-4 text-base font-semibold text-rose-950 dark:border-rose-600 dark:bg-rose-950/60 dark:text-rose-100"
            >
              <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-rose-600 dark:text-rose-400" />
              <div className="space-y-1">
                <p className="font-bold text-rose-950 dark:text-rose-100">
                  Budget Limiter Exceeded: Total Estimated Cost exceeds Approved PPMP Allocation!
                </p>
                <p className="text-sm font-medium text-rose-900 dark:text-rose-200">
                  Your current total of{" "}
                  <strong>
                    ₱{total.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </strong>{" "}
                  exceeds the Approved PPMP Budget Ceiling of{" "}
                  <strong>
                    ₱{activeBudgetCeiling.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </strong>{" "}
                  by{" "}
                  <strong className="text-rose-700 dark:text-rose-300">
                    ₱{overBudgetAmount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </strong>
                  .
                </p>
                <p className="text-xs text-rose-800 dark:text-rose-300">
                  Under BSC Budgetary Control guidelines (Annex B), Purchase Requests cannot exceed the approved PPMP allocation. Reduce line item quantities, adjust unit prices, or go back to Step 1 to revise the PPMP ceiling before proceeding.
                </p>
              </div>
            </div>
          )}

          {/* Add Another Item Button & Budget Limiter Summary Panel */}
          <div
            className={`rounded-2xl border-2 p-5 transition-all ${
              isOverBudget
                ? "border-rose-400 bg-rose-50/70 dark:border-rose-800 dark:bg-rose-950/40"
                : "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/60"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={addItem}
                className="min-h-12 border-2 border-dashed border-slate-400 bg-white px-6 py-3 text-base font-bold text-slate-900 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              >
                <PlusCircle className="h-5 w-5 text-[#881337] dark:text-rose-400" />
                <span>Add Another Item</span>
              </Button>

              <div className="flex flex-wrap items-end gap-6 text-right">
                {activeBudgetCeiling > 0 && (
                  <div className="text-right">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Approved PPMP Ceiling
                    </p>
                    <p className="text-lg font-bold text-slate-800 dark:text-slate-200">
                      ₱{" "}
                      {activeBudgetCeiling.toLocaleString("en-PH", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                )}

                <div className="text-right">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Total Estimated Cost
                  </p>
                  <p
                    className={`text-2xl font-black ${
                      isOverBudget
                        ? "text-rose-600 dark:text-rose-400"
                        : "text-[#881337] dark:text-rose-400"
                    }`}
                  >
                    ₱{" "}
                    {total.toLocaleString("en-PH", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>

                {activeBudgetCeiling > 0 && (
                  <div className="text-right">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {isOverBudget ? "Over Ceiling By" : "Remaining Ceiling"}
                    </p>
                    <p
                      className={`text-lg font-bold ${
                        isOverBudget
                          ? "text-rose-600 dark:text-rose-400"
                          : "text-emerald-700 dark:text-emerald-400"
                      }`}
                    >
                      {isOverBudget ? "+" : ""}₱{" "}
                      {Math.abs(activeBudgetCeiling - total).toLocaleString("en-PH", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Visual Budget Utilization Meter */}
            {activeBudgetCeiling > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                  <span>
                    Budget Allocation Usage:{" "}
                    <strong
                      className={
                        isOverBudget
                          ? "text-rose-600 dark:text-rose-400"
                          : "text-slate-900 dark:text-slate-100"
                      }
                    >
                      {budgetUtilizationPct}%
                    </strong>
                  </span>
                  <span
                    className={
                      isOverBudget
                        ? "font-bold text-rose-600 dark:text-rose-400"
                        : "text-slate-500 dark:text-slate-400"
                    }
                  >
                    {isOverBudget
                      ? `Exceeds ceiling by ₱${overBudgetAmount.toLocaleString("en-PH", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}`
                      : `₱${remainingBudget.toLocaleString("en-PH", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })} available under ceiling`}
                  </span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                  <div
                    className={`h-full transition-all duration-300 rounded-full ${
                      isOverBudget
                        ? "bg-rose-600"
                        : budgetUtilizationPct > 90
                        ? "bg-amber-500"
                        : "bg-emerald-600"
                    }`}
                    style={{ width: `${Math.min(budgetUtilizationPct, 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Step 2 Bottom Navigation */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-t-2 border-slate-200 pt-5 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCurrentStep(1)}
              className="min-h-12"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Back to Step 1 (PPMP Upload)</span>
            </Button>

            <Button
              type="button"
              disabled={isOverBudget}
              onClick={handleAdvanceFromStep2}
              className={`min-h-12 text-white ${
                isOverBudget
                  ? "bg-slate-400 cursor-not-allowed opacity-60 dark:bg-slate-700 hover:bg-slate-400"
                  : "bg-[#881337] hover:bg-[#70102e]"
              }`}
              title={
                isOverBudget
                  ? "Cannot proceed: Total Estimated Cost exceeds Approved PPMP Budget Ceiling"
                  : undefined
              }
            >
              <span>Next Step: Purpose &amp; Market Scoping</span>
              <ArrowRight className="h-5 w-5" />
            </Button>
          </div>
        </section>
      )}

      {/* ===================================================================== */}
      {/* STEP 3 OF 4: PURPOSE OF REQUEST & MARKET SCOPING (RA 12009 ART. II)   */}
      {/* ===================================================================== */}
      {currentStep === 3 && (
        <section className="rounded-2xl border-2 border-slate-300 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900 space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-slate-200 pb-4 dark:border-slate-800">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Step 3 of 4: Purpose of Request &amp; Market Scoping
              </h2>
              <p className="mt-1.5 text-base text-slate-700 dark:text-slate-300">
                State the official college purpose and attach your mandatory Market Scoping document (RA 12009 Art. II) to justify your procurement.
              </p>
            </div>
            <QuietCompliancePill
              stepNumber="Step 5.1"
              annexForm="Market Scoping (RA 12009 Art. II)"
              procedureRef="BSC – PRO -QP- 95 – 1"
              role="End-User"
            />
          </div>

          <div>
            <Label htmlFor="pr-purpose" className="text-base font-bold text-slate-900 dark:text-slate-100">
              Purpose of Request <span className="text-rose-700">*</span>
            </Label>
            <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-300">
              Explain in 1–2 plain sentences how this purchase will be used for BSC students, classes, or office operations.
            </p>
            <Textarea
              id="pr-purpose"
              value={purpose}
              onChange={(event) => setPurpose(event.target.value)}
              placeholder="e.g., For printing student test booklets and grading sheets for the 1st Semester Midterm Exams."
              className="mt-3 min-h-32 text-base p-4 rounded-xl border-2"
            />
          </div>

          {/* Mandatory Market Scoping Document Upload (RA 12009 Article II) */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label className="text-base font-bold text-slate-900 dark:text-slate-100">
                Market Scoping Document (RA 12009 Article II) <span className="text-rose-700">*</span>
              </Label>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  marketScopingFile
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                    : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                }`}
              >
                {marketScopingFile ? "Market Scoping Attached ✓" : "Mandatory Attachment Required"}
              </span>
            </div>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
              Under RA 12009 Article II (Strategic Procurement Planning), early market scoping and price research must be conducted before submitting a Purchase Request. Attach your market scoping worksheet, price comparison, or supplier survey.
            </p>

            <input
              ref={marketScopingFileInputRef}
              type="file"
              accept=".pdf,.xlsx,.xls,.docx,.doc,.csv,.png,.jpg,.jpeg,application/pdf"
              onChange={(e) => {
                handleMarketScopingFile(e.target.files?.[0]);
                e.currentTarget.value = "";
              }}
              className="hidden"
              id="market-scoping-file-upload-step3"
            />

            {!marketScopingFile ? (
              <div
                onDragOver={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setIsDraggingMarketScopingFile(true);
                }}
                onDragLeave={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setIsDraggingMarketScopingFile(false);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setIsDraggingMarketScopingFile(false);
                  handleMarketScopingFile(event.dataTransfer.files?.[0]);
                }}
                className={`min-h-[160px] rounded-2xl border-2 border-dashed p-6 flex flex-col items-center justify-center text-center transition-colors ${
                  isDraggingMarketScopingFile
                    ? "border-[#881337] bg-rose-50/60 dark:border-rose-400 dark:bg-rose-950/30"
                    : "border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/50"
                }`}
              >
                <UploadCloud className="h-9 w-9 text-[#881337] dark:text-rose-400" aria-hidden="true" />
                <p className="mt-3 text-lg font-bold text-slate-900 dark:text-slate-100">
                  Choose a Market Scoping file or drag it here
                </p>
                <p className="mt-1.5 max-w-xl text-sm font-medium text-slate-600 dark:text-slate-300">
                  Accepted formats: .pdf, .xlsx, .xls, .docx, .doc, .csv, .png, .jpg (Max size: 10MB).
                </p>
                <div className="mt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => marketScopingFileInputRef.current?.click()}
                    className="min-h-12 px-6 py-3 border-2 border-slate-300 rounded-xl font-bold bg-white text-slate-900 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  >
                    <Folder className="h-5 w-5 text-[#881337] dark:text-rose-400" />
                    <span>Browse Market Scoping File</span>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="min-h-[140px] rounded-2xl border-2 border-emerald-400 bg-emerald-50/80 p-6 dark:border-emerald-700 dark:bg-emerald-950/30 flex flex-col items-center justify-center text-center transition-all">
                <CheckCircle2 className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
                <p className="mt-3 max-w-xl truncate text-lg font-bold text-slate-900 dark:text-slate-100" title={marketScopingFile.name}>
                  {marketScopingFile.name}
                </p>
                <p className="mt-1 text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                  {(marketScopingFile.size / (1024 * 1024)).toFixed(2)} MB · Verified Market Scoping Document (RA 12009 Art. II)
                </p>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => marketScopingFileInputRef.current?.click()}
                    className="min-h-11 border-2 border-emerald-500 bg-white px-4 py-2 text-sm font-bold text-emerald-800 hover:bg-emerald-50 dark:border-emerald-600 dark:bg-slate-900 dark:text-emerald-300"
                  >
                    <Upload className="h-4 w-4" />
                    <span>Change File</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={removeMarketScopingFile}
                    className="min-h-11 border-2 border-rose-300 bg-white px-4 py-2 text-sm font-bold text-rose-800 hover:bg-rose-50 dark:border-rose-800 dark:bg-slate-900 dark:text-rose-300"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Remove and choose another file</span>
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Optional Signatories */}
          <div className="grid gap-4 pt-2 sm:grid-cols-2">
            <div>
              <Label htmlFor="pr-requested-by" className="text-base font-bold text-slate-900 dark:text-slate-100">
                Requested By (Optional Signatory)
              </Label>
              <Input
                id="pr-requested-by"
                list="pr-requested-signatories"
                value={requestedSignatoryChoice}
                onChange={(event) => setRequestedSignatoryChoice(event.target.value)}
                placeholder="Select or leave blank for your account name"
                className="mt-2"
              />
              <datalist id="pr-requested-signatories">
                {requesterSignatories.map((signatory) => (
                  <option key={signatory.id} value={signatoryLabel(signatory)} />
                ))}
              </datalist>
            </div>

            <div>
              <Label htmlFor="pr-approved-by" className="text-base font-bold text-slate-900 dark:text-slate-100">
                Approved By (HoPE / Authorized Approver)
              </Label>
              <Input
                id="pr-approved-by"
                list="pr-approved-signatories"
                value={approvedSignatoryChoice}
                onChange={(event) => setApprovedSignatoryChoice(event.target.value)}
                placeholder="Select authorized approving official"
                className="mt-2"
              />
              <datalist id="pr-approved-signatories">
                {approverSignatories.map((signatory) => (
                  <option key={signatory.id} value={signatoryLabel(signatory)} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Step 3 Bottom Navigation */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-t-2 border-slate-200 pt-5 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCurrentStep(2)}
              className="min-h-12"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Back to Step 2 (Items)</span>
            </Button>

            <Button
              type="button"
              disabled={purpose.trim().length < 10 || !marketScopingFile}
              onClick={handleAdvanceFromStep3}
              className={`min-h-12 text-white ${
                purpose.trim().length < 10 || !marketScopingFile
                  ? "bg-slate-400 cursor-not-allowed opacity-60 dark:bg-slate-700 hover:bg-slate-400"
                  : "bg-[#881337] hover:bg-[#70102e]"
              }`}
              title={
                !marketScopingFile
                  ? "Market Scoping document is mandatory under RA 12009 Art. II before proceeding"
                  : purpose.trim().length < 10
                  ? "Purpose explanation is required"
                  : undefined
              }
            >
              <span>Next Step: Review &amp; Submit</span>
              <ArrowRight className="h-5 w-5" />
            </Button>
          </div>
        </section>
      )}

      {/* ===================================================================== */}
      {/* STEP 4 OF 4: SUMMARY, SUBMISSION & EMAIL NOTIFICATION CONFIRMATION    */}
      {/* ===================================================================== */}
      {currentStep === 4 && (
        <section className="rounded-2xl border-2 border-slate-300 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900 space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-slate-200 pb-4 dark:border-slate-800">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Step 4 of 4: Review Your Request Before Submitting
              </h2>
              <p className="mt-1.5 text-base text-slate-700 dark:text-slate-300">
                Check your attached PPMP plan, item category, line items, and purpose before sending your request.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <QuietCompliancePill
                stepNumber="Step 5.1"
                annexForm="Appendix 60 & Annex B"
                procedureRef="BSC – PRO -QP- 95 – 1"
                role="End-User"
              />
            </div>
          </div>

          <AuditHistoryDrawer
            procedureCode="BSC – PRO -QP- 95 – 1 (Rev. 00)"
            mandatedStep="Step 5.1 · End-User Submission"
            standardAttachment="Annex A (PR), Annex B (PPMP) & Market Scoping"
            historyEvents={[
              {
                timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                actor: `${user?.name || "End-User"} (End-User)`,
                action: `Attached PPMP: ${uploadedFile?.name || "Approved Department PPMP"} (Verified PDF/Excel <= 10MB)`,
              },
              {
                timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                actor: `${user?.name || "End-User"} (End-User)`,
                action: `Attached Market Scoping: ${marketScopingFile?.name || "Market Scoping Analysis"} (RA 12009 Art. II Verified)`,
              },
              {
                timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                actor: `${user?.name || "End-User"} (End-User)`,
                action: `Selected Category: ${selectedCategory} (${items.length} item${items.length === 1 ? "" : "s"}) — Clause 5.1.1 Verified`,
              },
            ]}
          />

          {/* Summary Review Card */}
          <div className="rounded-2xl border-2 border-slate-300 bg-slate-50/70 p-6 dark:border-slate-700 dark:bg-slate-800/40 space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border-2 border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                <p className="text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Attached PPMP Budget File
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <FileCheck className="h-5 w-5 shrink-0 text-emerald-700 dark:text-emerald-400" />
                  <span className="truncate text-base font-bold text-slate-900 dark:text-slate-100">
                    {uploadedFile?.name || "Approved Department PPMP"}
                  </span>
                </div>
                {uploadedFile && (
                  <span className="mt-1 inline-block rounded-lg bg-emerald-100 px-2.5 py-0.5 text-sm font-semibold text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300">
                    {(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB
                  </span>
                )}
              </div>

              <div className="rounded-xl border-2 border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                <p className="text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Attached Market Scoping File
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <FileCheck className="h-5 w-5 shrink-0 text-emerald-700 dark:text-emerald-400" />
                  <span className="truncate text-base font-bold text-slate-900 dark:text-slate-100">
                    {marketScopingFile?.name || "No file attached"}
                  </span>
                </div>
                {marketScopingFile && (
                  <span className="mt-1 inline-block rounded-lg bg-emerald-100 px-2.5 py-0.5 text-sm font-semibold text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300">
                    {(marketScopingFile.size / (1024 * 1024)).toFixed(2)} MB · RA 12009 Verified
                  </span>
                )}
              </div>

              <div className="rounded-xl border-2 border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                <p className="text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Selected Item Category
                </p>
                <p className="mt-2 text-base font-bold text-slate-900 dark:text-slate-100">
                  {selectedCategory}
                </p>
                <span className="mt-1 inline-block text-sm font-medium text-slate-600 dark:text-slate-300">
                  Clause 5.1.1 Single-Category Verified
                </span>
              </div>

              <div className={`rounded-xl border-2 p-4 ${
                isOverBudget
                  ? "border-rose-400 bg-rose-50/70 dark:border-rose-800 dark:bg-rose-950/40"
                  : "border-[#881337]/30 bg-rose-50/60 dark:border-rose-800 dark:bg-rose-950/30"
              }`}>
                <p className={`text-sm font-bold uppercase tracking-wide ${
                  isOverBudget ? "text-rose-700 dark:text-rose-300" : "text-[#881337] dark:text-rose-300"
                }`}>
                  Total Estimated Budget
                </p>
                <p className={`mt-2 text-2xl font-extrabold ${
                  isOverBudget ? "text-rose-600 dark:text-rose-400" : "text-[#881337] dark:text-rose-300"
                }`}>
                  ₱ {total.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <div className="mt-1 flex flex-wrap items-center justify-between gap-1 text-xs">
                  <span className="text-slate-600 dark:text-slate-400">
                    Ceiling: ₱{activeBudgetCeiling.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className={`font-semibold ${
                    isOverBudget ? "text-rose-700 dark:text-rose-300" : "text-emerald-700 dark:text-emerald-400"
                  }`}>
                    {isOverBudget ? `Over by ₱${overBudgetAmount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `₱${remainingBudget.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} left`}
                  </span>
                </div>
              </div>
            </div>

            {/* Formatted Line Items Table */}
            <div className="overflow-x-auto rounded-xl border-2 border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900">
              <table className="w-full text-left text-base">
                <thead className="border-b-2 border-slate-300 bg-slate-100 text-sm font-bold uppercase text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Item Name &amp; Specification</th>
                    <th className="px-4 py-3">Unit</th>
                    <th className="px-4 py-3 text-right">Quantity</th>
                    <th className="px-4 py-3 text-right">Unit Price</th>
                    <th className="px-4 py-3 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {items.map((item, idx) => {
                    const lineTotal =
                      (Number(item.quantity) || 0) * (Number(item.estimatedUnitCost) || 0);
                    return (
                      <tr key={idx} className="text-base text-slate-900 dark:text-slate-100">
                        <td className="px-4 py-3 font-semibold">{idx + 1}</td>
                        <td className="px-4 py-3 font-semibold">{item.description}</td>
                        <td className="px-4 py-3">{item.unit}</td>
                        <td className="px-4 py-3 text-right font-semibold">{item.quantity}</td>
                        <td className="px-4 py-3 text-right">
                          ₱{Number(item.estimatedUnitCost || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-right font-bold">
                          ₱{lineTotal.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="border-t-2 border-slate-300 bg-slate-50 font-bold dark:border-slate-700 dark:bg-slate-800/80">
                  {activeBudgetCeiling > 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-2 text-right text-sm text-slate-600 dark:text-slate-400">
                        Approved PPMP Budget Ceiling:
                      </td>
                      <td className="px-4 py-2 text-right text-base font-bold text-slate-800 dark:text-slate-200">
                        ₱{activeBudgetCeiling.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  )}
                  <tr>
                    <td colSpan={5} className="px-4 py-3 text-right text-base text-slate-900 dark:text-slate-100">
                      Total Estimated Budget:
                    </td>
                    <td className={`px-4 py-3 text-right text-lg font-extrabold ${
                      isOverBudget ? "text-rose-600 dark:text-rose-400" : "text-[#881337] dark:text-rose-400"
                    }`}>
                      ₱{total.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                  {activeBudgetCeiling > 0 && (
                    <tr className="border-t border-slate-200 dark:border-slate-700">
                      <td colSpan={5} className="px-4 py-2 text-right text-sm text-slate-600 dark:text-slate-400">
                        {isOverBudget ? "Exceeded Budget Ceiling By:" : "Remaining PPMP Budget:"}
                      </td>
                      <td className={`px-4 py-2 text-right text-sm font-bold ${
                        isOverBudget ? "text-rose-600 dark:text-rose-400" : "text-emerald-700 dark:text-emerald-400"
                      }`}>
                        {isOverBudget ? "+" : ""}₱{Math.abs(activeBudgetCeiling - total).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  )}
                </tfoot>
              </table>
            </div>

            {/* Stated Purpose */}
            <div className="rounded-xl border-2 border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
              <p className="text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Stated Purpose of Request
              </p>
              <p className="mt-1.5 text-base font-medium text-slate-900 dark:text-slate-100">
                {purpose}
              </p>
            </div>

            {/* Optional Collapsible Official Appendix 60 Form Preview */}
            <div>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAppendixPreview((prev) => !prev)}
                className="min-h-12"
              >
                <FileText className="h-5 w-5" />
                <span>
                  {showAppendixPreview
                    ? "Hide Official Appendix 60 Form Preview"
                    : "Preview Official Appendix 60 Printable Form"}
                </span>
              </Button>
              {showAppendixPreview && (
                <div className="mt-4">
                  <OfficialPurchaseRequestCanvas
                    entityName={setup?.settings?.entityName || "Batanes State College"}
                    fundCluster={fundCluster}
                    officeSection={
                      selectedOffice
                        ? `${selectedOffice.code} — ${selectedOffice.name}`
                        : user?.officeName || ""
                    }
                    responsibilityCenterCode={responsibilityCenterCode}
                    items={items}
                    purpose={purpose}
                    requestedByName={selectedRequestedSignatory?.fullName || user?.name || ""}
                    requestedByDesignation={selectedRequestedSignatory?.designation || ""}
                    approvedByName={
                      selectedApprovedSignatory?.fullName ||
                      setup?.settings?.authorizedOfficialName ||
                      ""
                    }
                    approvedByDesignation={
                      selectedApprovedSignatory?.designation ||
                      setup?.settings?.authorizedOfficialDesignation ||
                      ""
                    }
                  />
                </div>
              )}
            </div>
          </div>

          {/* Budget Limiter Over-Ceiling Blocker Banner */}
          {isOverBudget && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-xl border-2 border-rose-500 bg-rose-50 p-4 text-base font-semibold text-rose-950 dark:border-rose-600 dark:bg-rose-950/60 dark:text-rose-100"
            >
              <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-rose-600 dark:text-rose-400" />
              <div>
                <p className="font-bold">Cannot Submit: Approved PPMP Budget Ceiling Exceeded</p>
                <p className="text-sm font-normal">
                  Total Estimated Cost (₱{total.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}) exceeds the Approved PPMP Budget Ceiling of ₱{activeBudgetCeiling.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} by ₱{overBudgetAmount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}. Under BSC Budgetary Control rules, requests exceeding the approved ceiling cannot be submitted. Please click "Go Back and Edit" to reduce item quantities or prices.
                </p>
              </div>
            </div>
          )}

          {/* Automated Email Notification Notice Banner */}
          <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-4 text-base text-blue-900 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-100">
            <div className="flex items-start gap-3">
              <MailCheck className="mt-0.5 h-6 w-6 shrink-0 text-blue-800 dark:text-blue-300" />
              <p className="font-medium leading-relaxed">
                <strong>Automated Email Notice:</strong> Upon clicking Submit, an official confirmation and tracking copy will be emailed immediately to your BSC email (
                <strong>{user?.email || "your registered BSC email"}</strong>), and an alert will be sent to the Procurement Office for Step 5.1 verification.
              </p>
            </div>
          </div>

          {/* Step 4 Bottom Navigation Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-t-2 border-slate-200 pt-5 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              disabled={isSaving}
              onClick={() => setCurrentStep(3)}
              className="min-h-12 px-6 py-3"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Go Back and Edit</span>
            </Button>

            <Button
              type="submit"
              disabled={isSaving || isOverBudget || !marketScopingFile}
              className={`min-h-12 px-6 py-3 text-base font-bold text-white ${
                isOverBudget || !marketScopingFile
                  ? "bg-slate-400 cursor-not-allowed opacity-60 dark:bg-slate-700 hover:bg-slate-400"
                  : "bg-[#881337] hover:bg-[#70102e]"
              }`}
              title={
                !marketScopingFile
                  ? "Cannot submit: Market Scoping document is mandatory under RA 12009 Art. II"
                  : isOverBudget
                  ? "Cannot submit: Total Estimated Cost exceeds Approved PPMP Budget Ceiling"
                  : undefined
              }
            >
              {isSaving ? (
                <LoaderCircle className="h-5 w-5 animate-spin text-white" />
              ) : (
                <CheckCircle2 className="h-5 w-5" />
              )}
              <span>Submit Purchase Request</span>
            </Button>
          </div>
        </section>
      )}
    </form>
  );
}

function LoadingPanel({ label }: { label: string }) { return <div className="flat-panel grid min-h-72 place-items-center text-center"><div><LoaderCircle className="mx-auto h-5 w-5 animate-spin text-[#7b1e1e]" /><p className="mt-3 text-xs text-[#6e7885]">{label}</p></div></div>; }

export function WorkspacePage({ kind }: { kind: WorkspaceKind }) {
  const details = content[kind];
  const action = kind === "suppliers" ? "Register supplier" : kind === "plans" ? "Add planning entry" : kind === "budgets" ? "Add budget allotment" : undefined;
  return <div className="mx-auto max-w-[1240px]"><PageHeader eyebrow={details.eyebrow} title={details.title} description={details.description} action={action ? { label: action, onClick: () => toast.info("This configured workspace is ready for the appropriate authorised role.") } : undefined} />
    <div className="mt-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-2"><StatusBadge tone="draft">RECORD-BASED</StatusBadge><p className="text-[11px] text-[#74808c]">No placeholder transactions are shown.</p></div><div className="relative w-full sm:w-64"><Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9098a2]" /><Input placeholder="Search records" className="h-9 rounded-[4px] border-[#dfdbd3] bg-white pl-9 text-xs" /></div></div>
    <div className="mt-4"><EmptyWorkspace eyebrow={details.eyebrow} title={details.emptyTitle} description={details.emptyDescription} /></div>
    {kind === "rfq" && <div className="mt-6 flex items-start gap-3 border border-[#e4d4ae] bg-[#fffaf0] p-4"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-[#9a6d19]" /><p className="text-[11px] leading-5 text-[#75643e]">The End-User's preliminary quotation document is validated here. Procurement Staff/BAC completes the final canvass and prepares the official Abstract of Quotations.</p></div>}
  </div>;
}
