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
import { trpc } from "@/lib/trpc";
import { formatFriendlyError } from "@/lib/formatError";
import { countValidPreCanvassQuotes, detectMixedCategories, hasRequiredSupplierQuotations, normalizeProcurementRole, SECTION_5_1_1_CATEGORIES } from "../../../shared/procurementRules";
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, CircleAlert, ExternalLink, FileCheck, FileCheck2, FileSearch, FileText, Info, LoaderCircle, Plus, Search, Send, ShieldAlert, Star, Trash2, Upload, X } from "lucide-react";
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
        const createdPpmp = await createPpmpMutation.mutateAsync({
          fiscalYear: newPpmpData.fiscalYear,
          officeId: input.officeId,
          objectOfExpenditureId: input.objectOfExpenditureId,
          description: newPpmpData.title.trim() || input.purpose.trim() || "Annual Department PPMP",
          plannedAmount: newPpmpData.plannedAmount && newPpmpData.plannedAmount > 0 ? newPpmpData.plannedAmount : Math.max(estTotal, 1000),
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
        <div className="flex flex-wrap items-center gap-2 shrink-0 pt-2">
          <Button
            onClick={() => {
              setCreationInitialMode("upload");
              setIsCreating(true);
            }}
            variant="outline"
            className="h-9 rounded-[4px] border-[#dedad2] dark:border-[#46515c] text-xs font-semibold text-[#7b1e1e] dark:text-[#ff837a] hover:bg-[#fffaf0] dark:hover:bg-[#272118]"
          >
            <Upload className="mr-1.5 h-3.5 w-3.5" />
            Upload Department PPMP
          </Button>
          <Button
            onClick={() => {
              setCreationInitialMode("upload");
              setIsCreating(true);
            }}
            className="h-9 rounded-[4px] bg-[#7b1e1e] text-xs font-semibold text-white hover:bg-[#641818] dark:bg-[#d65c50] dark:hover:bg-[#eb766a]"
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            New Purchase Request
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
            onOpenCanvass={(pr) => {
              setSelectedPrId(pr.id);
              setActiveCanvassPr(pr);
            }}
            submittingId={submitRequest.isPending ? submitRequest.variables?.purchaseRequestId : undefined}
            selectedPrId={selectedPr?.id}
            onSelectPr={(id) => setSelectedPrId(id)}
          />
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
  onOpenCanvass,
  submittingId,
  selectedPrId,
  onSelectPr,
}: {
  records: Array<{ id: number; prNumber: string; purpose: string; totalEstimate: string; status: string; createdAt: Date; rejectionCount?: number; rejectionReason?: string | null; officeId?: number }>;
  preCanvasses: Array<{ id: number; purchaseRequestId: number }>;
  preCanvassQuotes: Array<{ id: number; preCanvassId: number; supplierId?: number; totalPrice?: string | number }>;
  canReject: boolean;
  onSubmit: (purchaseRequestId: number) => void;
  onReject: (purchaseRequestId: number, reason: string) => void;
  onOpenCanvass: (pr: { id: number; prNumber: string; purpose: string; totalEstimate: string; officeId?: number; status: string }) => void;
  submittingId?: number;
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
    {record.status !== "draft" && !canReject && <span className="text-[11px] text-[#87909b] dark:text-[#aeb9c4]">In progress</span>}
  </div>}</td></tr>;
  })}</tbody></RecordTable>;
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

  // Wizard Step: "ppmp" = Step 1: PPMP Prerequisite Gate; "pr" = Step 2: PR Formulation & Appendix 60 Canvas
  const [currentStep, setCurrentStep] = useState<"ppmp" | "pr">("ppmp");

  // Step 1: PPMP Formulation & Upload state
  const [ppmpMode, setPpmpMode] = useState<"upload" | "existing">(initialMode);
  const [selectedPpmpId, setSelectedPpmpId] = useState<string>("");
  const [customPpmpTitle, setCustomPpmpTitle] = useState("");
  const [customPpmpYear, setCustomPpmpYear] = useState<number>(new Date().getFullYear());
  const [ppmpOfficeId, setPpmpOfficeId] = useState("");
  const [ppmpObjectId, setPpmpObjectId] = useState("");
  const [customPpmpBudget, setCustomPpmpBudget] = useState("");
  const [customPpmpMode, setCustomPpmpMode] = useState("Small Value Procurement");
  const [customFundSource, setCustomFundSource] = useState("General Appropriations Act");
  const [uploadedFile, setUploadedFile] = useState<{ name: string; type: string; size: number; base64: string } | null>(null);
  const [marketScopingFile, setMarketScopingFile] = useState<{ name: string; type: string; size: number; base64: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Verified PPMP confirmed from Step 1
  const [verifiedPpmp, setVerifiedPpmp] = useState<{
    id?: number;
    title: string;
    fiscalYear: number;
    officeId: number;
    officeCode: string;
    officeName: string;
    objectOfExpenditureId: number;
    objectName: string;
    plannedAmount: number;
    uploadedFile?: { name: string; type: string; size: number; base64: string } | null;
  } | null>(null);

  // Step 2: PR Header & Signatory state
  const [purpose, setPurpose] = useState("");
  const [fundSource, setFundSource] = useState("General Appropriations Act");
  const [fundCluster, setFundCluster] = useState("01101101");
  const [responsibilityCenterCode, setResponsibilityCenterCode] = useState("");
  const [requestedSignatoryChoice, setRequestedSignatoryChoice] = useState("");
  const [approvedSignatoryChoice, setApprovedSignatoryChoice] = useState("");
  const [officeId, setOfficeId] = useState("");
  const [objectId, setObjectId] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 14 * 1024 * 1024) {
      toast.error("File exceeds 14MB limit. Please upload a smaller document.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
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
      toast.success(`Attached Department PPMP document: ${file.name}`);
    };
    reader.readAsDataURL(file);
  };

  const removeUploadedFile = () => {
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleMarketScopingFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Market Scoping file exceeds the 10 MB limit.");
      event.target.value = "";
      setMarketScopingFile(null);
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => toast.error("The Market Scoping file could not be read.");
    reader.onload = () => {
      const result = String(reader.result || "");
      setMarketScopingFile({
        name: file.name,
        type: file.type || "application/octet-stream",
        size: file.size,
        base64: result.includes(",") ? result.split(",")[1] : result,
      });
    };
    reader.readAsDataURL(file);
  };

  // Step 1: Confirmation handler
  const handleConfirmPpmp = () => {
    if (ppmpMode === "upload") {
      if (!customPpmpTitle.trim() && !uploadedFile) {
        return toast.error("Please upload your Department PPMP file or provide a Project Title.");
      }
      if (!ppmpOfficeId) {
        return toast.error("Please select your Requesting Department / Office.");
      }
      if (!ppmpObjectId) {
        return toast.error("Please select the Object of Expenditure.");
      }
      const budgetNum = Number(customPpmpBudget);
      if (!budgetNum || budgetNum <= 0) {
        return toast.error("Please enter a valid planned budget amount greater than ₱0.00.");
      }

      const officeObj = setup?.offices.find((o) => String(o.id) === ppmpOfficeId);
      const objectObj = setup?.objectsOfExpenditure.find((o) => String(o.id) === ppmpObjectId);
      const title = customPpmpTitle.trim() || (uploadedFile ? uploadedFile.name.replace(/\.[^/.]+$/, "") : "Annual Department PPMP");

      setVerifiedPpmp({
        id: undefined,
        title,
        fiscalYear: customPpmpYear || new Date().getFullYear(),
        officeId: Number(ppmpOfficeId),
        officeCode: officeObj?.code || "",
        officeName: officeObj?.name || "",
        objectOfExpenditureId: Number(ppmpObjectId),
        objectName: objectObj?.name || "",
        plannedAmount: budgetNum,
        uploadedFile,
      });

      // Synchronize PR fields from confirmed PPMP
      setOfficeId(ppmpOfficeId);
      setObjectId(ppmpObjectId);
      setPurpose((prev) => prev.trim() || title);
      setFundSource(customFundSource.trim() || "General Appropriations Act");

      setCurrentStep("pr");
      toast.success("Department PPMP verified! Now specify your Purchase Request line items.");
    } else {
      if (!selectedPpmpId) {
        return toast.error("Please select an existing registered PPMP from the list.");
      }
      const entry = ppmpEntries?.find((p) => String(p.id) === selectedPpmpId);
      if (!entry) {
        return toast.error("Selected PPMP entry could not be found.");
      }

      const officeObj = setup?.offices.find((o) => o.id === entry.officeId);
      const objectObj = setup?.objectsOfExpenditure.find((o) => o.id === entry.objectOfExpenditureId);

      setVerifiedPpmp({
        id: entry.id,
        title: entry.description,
        fiscalYear: entry.fiscalYear,
        officeId: entry.officeId || (officeObj ? officeObj.id : Number(officeId)),
        officeCode: officeObj?.code || "",
        officeName: officeObj?.name || "",
        objectOfExpenditureId: entry.objectOfExpenditureId || (objectObj ? objectObj.id : Number(objectId)),
        objectName: objectObj?.name || "",
        plannedAmount: Number(entry.plannedAmount) || 0,
        uploadedFile: null,
      });

      if (entry.officeId) setOfficeId(String(entry.officeId));
      if (entry.objectOfExpenditureId) setObjectId(String(entry.objectOfExpenditureId));
      setPurpose((prev) => prev.trim() || entry.description);

      setCurrentStep("pr");
      toast.success("Existing Department PPMP linked! Proceeding to Purchase Request form.");
    }
  };

  // Step 2: Line items and Catalog state
  const [items, setItems] = useState<RequestItem[]>([{ catalogItemId: "", stockPropertyNo: "", description: "", specification: "", quantity: "1", unit: "pc", estimatedUnitCost: "" }]);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogCodeFamily, setCatalogCodeFamily] = useState("all");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const catalogInput = useMemo(() => ({ search: catalogSearch.trim() || undefined, codeFamily: catalogCodeFamily === "all" ? undefined : catalogCodeFamily, page: 1, limit: 100 }), [catalogSearch, catalogCodeFamily]);
  const catalog = trpc.procurement.catalog.list.useQuery(catalogInput, { retry: false });
  const codeFamilies = trpc.procurement.catalog.codeFamilies.useQuery(undefined, { retry: false });
  const favorites = trpc.procurement.catalog.favorites.useQuery(undefined, { retry: false });
  const signatories = trpc.procurement.purchaseRequests.signatories.useQuery(undefined, { retry: false });
  const favoriteIds = useMemo(() => new Set((favorites.data ?? []).map((catalogItem) => catalogItem.id)), [favorites.data]);
  const catalogItems = useMemo(() => {
    if (!favoritesOnly) return catalog.data?.items ?? [];
    const search = catalogSearch.trim().toLowerCase();
    return (favorites.data ?? []).filter((catalogItem) => (!catalogCodeFamily || catalogCodeFamily === "all" || catalogItem.productCode.startsWith(catalogCodeFamily)) && (!search || catalogItem.productCode.toLowerCase().includes(search) || catalogItem.description.toLowerCase().includes(search)));
  }, [catalog.data?.items, catalogCodeFamily, catalogSearch, favorites.data, favoritesOnly]);
  const toggleFavorite = trpc.procurement.catalog.setFavorite.useMutation({ onSuccess: () => { void utils.procurement.catalog.favorites.invalidate(); }, onError: (error) => toast.error(formatFriendlyError(error)) });

  useEffect(() => {
    const selectedItems = (catalog.data?.items ?? []).filter((item) => catalogItemIds.includes(item.id));
    if (!selectedItems.length) return;
    const quantityById = new Map(catalogSelection.map((selection) => [selection.id, selection.quantity]));
    setItems((current) => current.length === 1 && !current[0].description && !current[0].catalogItemId ? selectedItems.map((selected) => ({ catalogItemId: String(selected.id), stockPropertyNo: selected.productCode, description: selected.description, specification: selected.remarks || "", quantity: quantityById.get(selected.id) || "1", unit: selected.unit || "pc", estimatedUnitCost: selected.referencePrice })) : current);
    sessionStorage.removeItem("procurewise.catalogSelection");
  }, [catalog.data?.items, catalogItemIds, catalogSelection]);

  const configurationReady = Boolean(setup?.offices.length && setup.objectsOfExpenditure.length);
  const requesterSignatories = useMemo(() => (signatories.data ?? []).filter((signatory) => Boolean(signatory.mayRequest)), [signatories.data]);
  const approverSignatories = useMemo(() => (signatories.data ?? []).filter((signatory) => Boolean(signatory.mayApprove)), [signatories.data]);
  const signatoryLabel = (signatory: { fullName: string; designation: string }) => `${signatory.fullName} — ${signatory.designation}`;
  const selectedRequestedSignatory = requesterSignatories.find((signatory) => signatoryLabel(signatory) === requestedSignatoryChoice);
  const selectedApprovedSignatory = approverSignatories.find((signatory) => signatoryLabel(signatory) === approvedSignatoryChoice);
  const selectedOffice = setup?.offices.find((office) => String(office.id) === officeId);

  const total = useMemo(() => items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.estimatedUnitCost) || 0), 0), [items]);
  const categoryAnalysis = useMemo(() => {
    const validItems = items.filter((item) => item.description.trim().length > 0);
    return detectMixedCategories(validItems);
  }, [items]);
  const [mixedCategoryAcknowledged, setMixedCategoryAcknowledged] = useState(false);

  const updateItem = (index: number, field: keyof RequestItem, value: string) => setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item));
  const addItem = () => setItems((current) => [...current, { catalogItemId: "", stockPropertyNo: "", description: "", specification: "", quantity: "1", unit: "pc", estimatedUnitCost: "" }]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setAttemptedSubmit(true);
    if (!configurationReady) return toast.error("An Admin must first add an office and object of expenditure.");
    if (!purpose.trim()) {
      return toast.error("Purchase Request Purpose is required (at least 10 characters).");
    }
    if (purpose.trim().length < 10) {
      return toast.error("Purchase Request Purpose must be at least 10 characters.");
    }
    if (!officeId) {
      return toast.error("Please select a Requesting Department / Office.");
    }
    if (!objectId) {
      return toast.error("Please select an Object of Expenditure.");
    }
    if (!verifiedPpmp) {
      setCurrentStep("ppmp");
      return toast.error("A verified PPMP is required before creating a Purchase Request.");
    }
    if (!marketScopingFile) {
      return toast.error("Attach your Market Scoping document before saving the Purchase Request.");
    }
    if (!items.length) {
      return toast.error("Please add at least one line item.");
    }

    // Comprehensive per-item validation with user-friendly messages
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const itemNum = i + 1;
      const desc = item.description.trim();
      const nameLabel = desc ? ` ("${desc.length > 20 ? desc.slice(0, 18) + "..." : desc}")` : "";

      if (!desc) {
        return toast.error(`Item #${itemNum}: Item description is required.`);
      }
      const qty = Number(item.quantity);
      if (!item.quantity.trim() || isNaN(qty) || qty <= 0) {
        return toast.error(`Item #${itemNum}${nameLabel}: Quantity must be greater than 0.`);
      }
      if (!item.unit.trim()) {
        return toast.error(`Item #${itemNum}${nameLabel}: Unit of measurement is required (e.g. pc, box, set, unit, lot).`);
      }
      const cost = Number(item.estimatedUnitCost);
      if (!item.estimatedUnitCost.trim() || isNaN(cost) || cost <= 0) {
        return toast.error(`Item #${itemNum}${nameLabel}: Estimated unit cost must be greater than ₱0.00.`);
      }
    }

    if (requestedSignatoryChoice && !selectedRequestedSignatory) return toast.error("Choose Requested by from the authorized signatory suggestions.");
    if (approvedSignatoryChoice && !selectedApprovedSignatory) return toast.error("Choose Approved by from the authorized signatory suggestions.");
    if (categoryAnalysis.isMixed && !mixedCategoryAcknowledged) {
      return toast.error(`Section 5.1.1 Warning: Mixed categories detected (${categoryAnalysis.categoryLabels.join(" + ")}). Check the acknowledgement or separate items before submitting.`);
    }

    onCreate(
      {
        purpose: purpose.trim(),
        fundSource: fundSource.trim() || undefined,
        fundCluster: fundCluster.trim() || undefined,
        responsibilityCenterCode: responsibilityCenterCode.trim() || undefined,
        requesterDesignation: selectedRequestedSignatory?.designation || undefined,
        requestedSignatoryId: selectedRequestedSignatory?.id,
        approvedSignatoryId: selectedApprovedSignatory?.id,
        ppmpEntryId: verifiedPpmp.id,
        officeId: Number(officeId),
        objectOfExpenditureId: Number(objectId),
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
      verifiedPpmp.uploadedFile,
      verifiedPpmp.id
        ? null
        : {
            title: verifiedPpmp.title,
            fiscalYear: verifiedPpmp.fiscalYear,
            plannedAmount: verifiedPpmp.plannedAmount > 0 ? verifiedPpmp.plannedAmount : (total > 0 ? total : undefined),
          },
      marketScopingFile
    );
  };

  const preparationSteps = [
    {
      label: "PP + PPMP",
      description: "Select or upload your department plan.",
      complete: Boolean(verifiedPpmp) && currentStep !== "ppmp",
      current: currentStep === "ppmp",
    },
    {
      label: "Market Scoping",
      description: "Attach your market research or price comparison.",
      complete: Boolean(marketScopingFile),
      current: currentStep === "pr" && !marketScopingFile,
    },
    {
      label: "Purchase Request",
      description: "Enter the items, quantities, and estimated costs.",
      complete: false,
      current: currentStep === "pr" && Boolean(marketScopingFile),
    },
    {
      label: "Three supplier quotes",
      description: "Record the required supplier quotations.",
      complete: false,
      current: false,
    },
    {
      label: "Attach & submit",
      description: "Upload the preliminary quotation document.",
      complete: false,
      current: false,
    },
  ];
  const currentProgressIndex = Math.max(0, preparationSteps.findIndex((step) => step.current));
  const currentProgressNumber = currentProgressIndex + 1;
  const currentProgressStep = preparationSteps[currentProgressIndex];

  return (
    <div className="mt-7 space-y-6">
      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* STEP 1: PPMP PREREQUISITE GATE (UPLOAD OR SELECT)                  */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {currentStep === "ppmp" ? (
        <div className="rounded-lg border border-[#ded8cc] bg-[#fffdfa] dark:border-[#46515c] dark:bg-[#1b2229] p-5 sm:p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#ece8df] dark:border-[#38434f] pb-4">
            <div>
              <h4 className="text-sm font-bold text-[#34404e] dark:text-[#f1f5f8] flex items-center gap-2">
                <Upload className="h-4 w-4 text-[#7b1e1e] dark:text-[#ff837a]" />
                Select or Upload Your Department PPMP
              </h4>
              <p className="text-xs text-[#77818d] dark:text-[#aeb9c4] mt-0.5">
                Upload your office's annual procurement file or select an active entry registered in Batanes State College records.
              </p>
            </div>

            {/* Mode Switcher */}
            <div className="inline-flex rounded-md border border-[#dedad2] dark:border-[#46515c] p-0.5 bg-white dark:bg-[#232c35]">
              <button
                type="button"
                onClick={() => setPpmpMode("upload")}
                className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors flex items-center gap-1.5 ${
                  ppmpMode === "upload"
                    ? "bg-[#7b1e1e] text-white shadow-sm"
                    : "text-[#66717e] hover:text-[#34404e] dark:text-[#aeb9c4] dark:hover:text-white"
                }`}
              >
                <Upload className="h-3.5 w-3.5" />
                Upload / Register Own PPMP
              </button>
              <button
                type="button"
                onClick={() => setPpmpMode("existing")}
                disabled={!ppmpEntries?.length}
                className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors flex items-center gap-1.5 ${
                  ppmpMode === "existing"
                    ? "bg-[#7b1e1e] text-white shadow-sm"
                    : "text-[#66717e] hover:text-[#34404e] dark:text-[#aeb9c4] dark:hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
                }`}
                title={!ppmpEntries?.length ? "No registered PPMP entries found in database" : ""}
              >
                <FileSearch className="h-3.5 w-3.5" />
                Select Existing {ppmpEntries?.length ? `(${ppmpEntries.length})` : ""}
              </button>
            </div>
          </div>

          {/* Mode 1: Upload / Register Own PPMP */}
          {ppmpMode === "upload" ? (
            <div className="mt-5 space-y-5">
              {/* Document upload zone */}
              <div>
                <Label className="text-xs font-semibold text-[#4c5664] dark:text-[#f1f5f8] mb-1.5 block">
                  1. Upload Department PPMP Document (PDF, Excel, Word, or Scanned Image)
                </Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.xlsx,.xls,.docx,.doc,.png,.jpg,.jpeg"
                  onChange={handleFileChange}
                  className="hidden"
                  id="ppmp-file-upload-input"
                />
                {uploadedFile ? (
                  <div className="flex items-center justify-between rounded-md border-2 border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40 p-3.5 text-xs text-emerald-900 dark:text-emerald-200">
                    <div className="flex items-center gap-2.5 truncate">
                      <FileCheck2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <div className="truncate">
                        <span className="font-bold text-sm">{uploadedFile.name}</span>
                        <span className="ml-2.5 text-[11px] text-emerald-700 dark:text-emerald-400 font-mono">
                          ({(uploadedFile.size / 1024).toFixed(1)} KB) · Ready to bind
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={removeUploadedFile}
                      className="ml-2 rounded p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                      title="Remove file"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="group flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-[#dedad2] dark:border-[#46515c] hover:border-[#7b1e1e] dark:hover:border-[#ff837a] bg-white dark:bg-[#232c35]/50 p-6 text-center cursor-pointer transition-colors"
                  >
                    <Upload className="h-8 w-8 text-[#9a6d19] group-hover:text-[#7b1e1e] dark:text-[#f0c36a] dark:group-hover:text-[#ff837a] transition-colors mb-2" />
                    <p className="text-xs sm:text-sm font-semibold text-[#34404e] dark:text-[#f1f5f8]">
                      Click or drag your approved Department PPMP document here
                    </p>
                    <p className="text-[11px] text-[#77818d] dark:text-[#aeb9c4] mt-1">
                      Supports official formats: PDF, Excel (.xlsx, .xls), Word (.docx), or scanned forms (up to 14MB)
                    </p>
                  </div>
                )}
              </div>

              {/* Form Metadata */}
              <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-[#ece8df] dark:border-[#38434f]">
                <div className="sm:col-span-2">
                  <Label className="text-xs font-semibold text-[#4c5664] dark:text-[#f1f5f8]">
                    2. PPMP Project Title / Procurement Description <span className="text-rose-600">*</span>
                  </Label>
                  <Input
                    value={customPpmpTitle}
                    onChange={(e) => setCustomPpmpTitle(e.target.value)}
                    placeholder="e.g. FY 2026 Procurement of Office Consumables & IT Equipment"
                    className="mt-1.5 h-9 text-xs rounded-[4px] border-[#dedad2] dark:border-[#46515c] dark:bg-[#232c35]"
                  />
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    This official project title will anchor your Purchase Request under institutional planning.
                  </p>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-[#4c5664] dark:text-[#f1f5f8]">
                    3. Requesting Office / Department <span className="text-rose-600">*</span>
                  </Label>
                  <div className="mt-1.5">
                    <OfficeSelect
                      value={ppmpOfficeId}
                      valueMode="id"
                      onChange={setPpmpOfficeId}
                      disabled={!configurationReady}
                      placeholder="Select department"
                      triggerClassName="h-9 rounded-[4px] border-[#dedad2] dark:border-[#46515c] dark:bg-[#232c35] dark:text-[#f1f5f8] text-xs"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-[#4c5664] dark:text-[#f1f5f8]">
                    4. Object of Expenditure <span className="text-rose-600">*</span>
                  </Label>
                  <Select value={ppmpObjectId} onValueChange={setPpmpObjectId} disabled={!configurationReady}>
                    <SelectTrigger className="mt-1.5 h-9 rounded-[4px] border-[#dedad2] dark:border-[#46515c] dark:bg-[#232c35] dark:text-[#f1f5f8] text-xs">
                      <SelectValue placeholder="Select expenditure object" />
                    </SelectTrigger>
                    <SelectContent className="dark:border-[#46515c] dark:bg-[#1b2229] dark:text-[#f1f5f8]">
                      {setup?.objectsOfExpenditure.map((object) => (
                        <SelectItem key={object.id} value={String(object.id)}>
                          {object.code} — {object.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-[#4c5664] dark:text-[#f1f5f8]">
                    5. Allocated Planned Budget Ceiling (₱) <span className="text-rose-600">*</span>
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    step="0.01"
                    value={customPpmpBudget}
                    onChange={(e) => setCustomPpmpBudget(e.target.value)}
                    placeholder="e.g. 50000.00"
                    className="mt-1.5 h-9 text-xs rounded-[4px] border-[#dedad2] dark:border-[#46515c] dark:bg-[#232c35]"
                  />
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    Maximum procurement ceiling authorized under this department PPMP project.
                  </p>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-[#4c5664] dark:text-[#f1f5f8]">
                    6. Fiscal Year (FY)
                  </Label>
                  <Input
                    type="number"
                    min={2020}
                    max={2050}
                    value={customPpmpYear}
                    onChange={(e) => setCustomPpmpYear(Number(e.target.value))}
                    className="mt-1.5 h-9 text-xs rounded-[4px] border-[#dedad2] dark:border-[#46515c] dark:bg-[#232c35]"
                  />
                </div>
              </div>
            </div>
          ) : (
            /* Mode 2: Select Existing Registered PPMP */
            <div className="mt-5 space-y-4">
              <Label className="text-xs font-semibold text-[#4c5664] dark:text-[#f1f5f8]">
                Select an Approved PPMP from BSC Institutional Records:
              </Label>
              <Select value={selectedPpmpId} onValueChange={setSelectedPpmpId}>
                <SelectTrigger className="h-10 rounded-[4px] border-[#dedad2] dark:border-[#46515c] dark:bg-[#232c35] dark:text-[#f1f5f8] text-xs">
                  <SelectValue placeholder="Choose a registered PPMP project" />
                </SelectTrigger>
                <SelectContent className="dark:border-[#46515c] dark:bg-[#1b2229] dark:text-[#f1f5f8]">
                  {ppmpEntries?.map((entry) => (
                    <SelectItem key={entry.id} value={String(entry.id)}>
                      FY {entry.fiscalYear} — {entry.description} (Allocated: ₱{Number(entry.plannedAmount || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedPpmpId && (() => {
                const entry = ppmpEntries?.find((p) => String(p.id) === selectedPpmpId);
                const officeObj = setup?.offices.find((o) => o.id === entry?.officeId);
                return entry ? (
                  <div className="rounded-md border border-emerald-300 bg-emerald-50/70 dark:border-emerald-800 dark:bg-emerald-950/30 p-3.5 text-xs space-y-1.5">
                    <p className="font-bold text-emerald-950 dark:text-emerald-100">{entry.description}</p>
                    <div className="flex flex-wrap gap-x-4 text-emerald-800 dark:text-emerald-300">
                      <span>Fiscal Year: <strong>FY {entry.fiscalYear}</strong></span>
                      <span>Office: <strong>{officeObj ? `${officeObj.code} — ${officeObj.name}` : `Office #${entry.officeId}`}</strong></span>
                      <span>Budget Allocation: <strong>₱{Number(entry.plannedAmount || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</strong></span>
                    </div>
                  </div>
                ) : null;
              })()}
            </div>
          )}

          {/* Action Buttons for Step 1 */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#ece8df] dark:border-[#38434f] pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="h-9 rounded-[4px] border-[#d8d3ca] text-xs dark:border-[#46515c] dark:text-[#f1f5f8]"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmPpmp}
              className="h-9 rounded-[4px] bg-[#7b1e1e] text-xs font-semibold text-white hover:bg-[#641818] dark:bg-[#d65c50] dark:hover:bg-[#eb766a] flex items-center gap-1.5"
            >
              <span>Confirm PPMP & Proceed to Purchase Request</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ) : (
        /* ─────────────────────────────────────────────────────────────────── */
        /* STEP 2: PURCHASE REQUEST FORMULATION & APPENDIX 60 CANVAS          */
        /* ─────────────────────────────────────────────────────────────────── */
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px] print:block print:m-0 print:p-0">
          <form onSubmit={submit} className="min-w-0 space-y-6 print:m-0 print:p-0">
            {/* Active Verified PPMP Card at top of Step 2 */}
            <div className="rounded-lg border-2 border-emerald-400 bg-emerald-50/80 dark:border-emerald-800 dark:bg-emerald-950/40 p-4 shadow-sm print:hidden no-print">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white mt-0.5">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider rounded bg-emerald-200 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-200 px-2 py-0.5">
                        Verified Department PPMP · Linked PPMP entry
                      </span>
                      <span className="text-xs font-bold text-emerald-950 dark:text-emerald-100 font-mono">
                        FY {verifiedPpmp?.fiscalYear}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-emerald-950 dark:text-emerald-100 mt-1">
                      {verifiedPpmp?.title}
                    </h4>
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-emerald-800 dark:text-emerald-300">
                      <span>Department: <strong>{verifiedPpmp?.officeName || "Specified Office"}</strong></span>
                      <span>Allotted Ceiling: <strong>₱{verifiedPpmp?.plannedAmount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</strong></span>
                      {verifiedPpmp?.uploadedFile && (
                        <span className="inline-flex items-center gap-1 font-mono text-[11px] underline">
                          <FileCheck2 className="h-3.5 w-3.5" /> {verifiedPpmp.uploadedFile.name} ({(verifiedPpmp.uploadedFile.size / 1024).toFixed(1)} KB)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isSaving}
                  onClick={() => setCurrentStep("ppmp")}
                  className="h-8 shrink-0 rounded-[4px] border-emerald-400 bg-white dark:bg-[#1b2229] text-xs font-semibold text-emerald-900 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                  Change / Re-upload PPMP
                </Button>
              </div>

              {/* Real-time budget indicator */}
              {verifiedPpmp && verifiedPpmp.plannedAmount > 0 && (
                <div className="mt-3 pt-3 border-t border-emerald-200 dark:border-emerald-800/60 flex flex-wrap items-center justify-between gap-2 text-xs">
                  {total > verifiedPpmp.plannedAmount ? (
                    <span className="font-semibold text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4" />
                      Warning: Requisition estimate (₱{total.toLocaleString("en-PH", { minimumFractionDigits: 2 })}) exceeds PPMP ceiling by ₱{(total - verifiedPpmp.plannedAmount).toLocaleString("en-PH", { minimumFractionDigits: 2 })}.
                    </span>
                  ) : (
                    <span className="text-emerald-800 dark:text-emerald-300 font-medium flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4" />
                      Budget Compliant: ₱{(verifiedPpmp.plannedAmount - total).toLocaleString("en-PH", { minimumFractionDigits: 2 })} remaining in PPMP allocation.
                    </span>
                  )}
                  <span className="text-[11px] text-emerald-900 dark:text-emerald-200 font-mono">
                    PR Total: ₱{total.toLocaleString("en-PH", { minimumFractionDigits: 2 })} / Ceiling: ₱{verifiedPpmp.plannedAmount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
            </div>

            <section aria-labelledby="market-scoping-upload" className="rounded-lg border-2 border-[#d4a029] bg-[#fffaf0] p-4 dark:border-[#8a6520] dark:bg-[#272118] print:hidden no-print">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 id="market-scoping-upload" className="text-sm font-semibold text-[#34404e] dark:text-[#f1f5f8]">
                  Step 2: Market Scoping document
                </h4>
                <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${marketScopingFile ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" : "bg-[#f5e6bf] text-[#79551a] dark:bg-[#493714] dark:text-[#f0c36a]"}`}>
                  {marketScopingFile ? "Attached" : "Required"}
                </span>
              </div>
              <p className="mt-1 text-xs text-[#75643e] dark:text-[#d1dae2]">
                Attach your market research or price comparison before saving this Purchase Request. PDF, Excel, Word, or image files up to 10 MB.
              </p>
              <Input
                type="file"
                required
                accept=".pdf,.xlsx,.xls,.docx,.doc,.csv,.png,.jpg,.jpeg,application/pdf"
                onChange={handleMarketScopingFileChange}
                aria-describedby="market-scoping-file-status"
                className="mt-3 h-auto min-h-9 cursor-pointer text-xs"
              />
              <p id="market-scoping-file-status" className="mt-2 text-[11px] text-[#65717e] dark:text-[#c4cfd9]" aria-live="polite">
                {marketScopingFile ? `Selected: ${marketScopingFile.name}` : "No Market Scoping document selected."}
              </p>
            </section>

            {/* Official Government Canvas (Appendix 60) */}
            <OfficialPurchaseRequestCanvas
              entityName={(setup as any)?.settings?.entityName || "Batanes State College"}
              fundCluster={fundCluster}
              officeSection={selectedOffice ? `${selectedOffice.code} — ${selectedOffice.name}` : verifiedPpmp?.officeName || ""}
              responsibilityCenterCode={responsibilityCenterCode}
              purpose={purpose}
              requestedByName={selectedRequestedSignatory?.fullName}
              requestedByDesignation={selectedRequestedSignatory?.designation}
              approvedByName={selectedApprovedSignatory?.fullName}
              approvedByDesignation={selectedApprovedSignatory?.designation}
              items={items}
            />

            {/* System Controls & Section 5.1.1 Category Rule */}
            <section aria-labelledby="pr-system-controls" className="border border-[#ded8cc] bg-[#fffdfa] dark:border-[#46515c] dark:bg-[#1b2229] p-4 sm:p-5 print:hidden no-print">
              {categoryAnalysis.isMixed && (
                <div className="mb-5 rounded-md border-2 border-rose-300 bg-rose-50/90 p-4 dark:border-rose-900 dark:bg-rose-950/40">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
                    <div className="space-y-1.5 text-xs">
                      <p className="font-bold text-rose-900 dark:text-rose-200">
                        Section 5.1.1 Mandated Category Segregation Alert: Mixed Categories Detected
                      </p>
                      <p className="text-rose-800 dark:text-rose-300 leading-relaxed">
                        The items in this request are mixed across multiple distinct categories:{" "}
                        <span className="font-bold underline">
                          {categoryAnalysis.categoryLabels.join(" + ")}
                        </span>.
                        Under institutional rules (Section 5.1.1), separate Purchase Requests must be filed for Office Supplies, Hardware Supplies, ICT Supplies, Printing Service, and Food Ingredients.
                      </p>
                      <p className="text-[11px] text-rose-700 dark:text-rose-400 font-medium">
                        Notice: The Procurement Officer will return mixed-category requests for revision. To proceed anyway with this draft, check the confirmation box below:
                      </p>
                      <label className="mt-2 flex items-center gap-2 cursor-pointer pt-1 font-semibold text-rose-900 dark:text-rose-200">
                        <input
                          type="checkbox"
                          checked={mixedCategoryAcknowledged}
                          onChange={(e) => setMixedCategoryAcknowledged(e.target.checked)}
                          className="h-4 w-4 rounded border-rose-300 text-rose-700 focus:ring-rose-500"
                        />
                        <span>I acknowledge that this package has mixed categories and may be returned under Section 5.1.1</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {catalogItemIds.length > 0 && items.some((item) => catalogItemIds.includes(Number(item.catalogItemId))) && (
                <div className="mb-4 border-l-2 border-[#7b1e1e] bg-[#f8f1e0] dark:border-[#ff837a] dark:bg-[#341f1f] px-3 py-2.5">
                  <p className="text-[11px] font-semibold text-[#6f1a1a] dark:text-[#ff837a]">
                    {catalogItemIds.length} catalog item{catalogItemIds.length === 1 ? "" : "s"} added
                  </p>
                  <p className="mt-1 text-[10px] leading-4 text-[#75643e] dark:text-[#d1dae2]">
                    The selected catalog items and saved quantities are prefilled below. Review and edit each quantity, unit, and estimated cost before saving.
                  </p>
                </div>
              )}

              <div className="border-b border-[#e8e2d7] dark:border-[#46515c] pb-3">
                <p id="pr-system-controls" className="text-xs font-semibold text-[#34404e] dark:text-[#f1f5f8]">
                  Purchase Request Header & Details (Bound to PPMP) — System controls — not part of Appendix 60
                </p>
                <p className="mt-1 text-[11px] leading-5 text-[#77818d] dark:text-[#aeb9c4]">
                  Office and budget allocations are automatically anchored to your verified PPMP project.
                </p>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label htmlFor="pr-purpose" className="text-xs font-semibold text-[#4c5664] dark:text-[#f1f5f8]">
                    Purpose <span className="text-rose-600">*</span>
                  </Label>
                  <Textarea
                    id="pr-purpose"
                    value={purpose}
                    onChange={(event) => setPurpose(event.target.value)}
                    placeholder="State the official purpose and intended use."
                    className="mt-2 min-h-20 rounded-[4px] border-[#dedad2] dark:border-[#46515c] dark:bg-[#232c35] dark:text-[#f1f5f8] text-sm focus-visible:ring-[#7b1e1e]"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-[#4c5664] dark:text-[#f1f5f8]">
                    Requesting Office / Department
                  </Label>
                  <div className="mt-2">
                    <OfficeSelect
                      value={officeId}
                      valueMode="id"
                      onChange={setOfficeId}
                      disabled={!configurationReady}
                      placeholder="Search and select requesting office"
                      triggerClassName="h-9 rounded-[4px] border-[#dedad2] dark:border-[#46515c] dark:bg-[#232c35] dark:text-[#f1f5f8] text-xs"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-[#4c5664] dark:text-[#f1f5f8]">
                    Object of Expenditure
                  </Label>
                  <Select value={objectId} onValueChange={setObjectId} disabled={!configurationReady}>
                    <SelectTrigger className="mt-2 h-9 rounded-[4px] border-[#dedad2] dark:border-[#46515c] dark:bg-[#232c35] dark:text-[#f1f5f8] text-xs">
                      <SelectValue placeholder="Select object" />
                    </SelectTrigger>
                    <SelectContent className="dark:border-[#46515c] dark:bg-[#1b2229] dark:text-[#f1f5f8]">
                      {setup?.objectsOfExpenditure.map((object) => (
                        <SelectItem key={object.id} value={String(object.id)}>
                          {object.code} — {object.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="pr-fund-cluster" className="text-xs font-semibold text-[#4c5664] dark:text-[#f1f5f8]">
                    Fund Cluster
                  </Label>
                  <Input
                    id="pr-fund-cluster"
                    list="pr-fund-cluster-options"
                    value={fundCluster}
                    onChange={(event) => setFundCluster(event.target.value)}
                    placeholder="Fund cluster"
                    className="mt-2 h-9 rounded-[4px] border-[#dedad2] dark:border-[#46515c] dark:bg-[#232c35] dark:text-[#f1f5f8] text-xs"
                  />
                  <datalist id="pr-fund-cluster-options">
                    <option value="01101101">01101101</option>
                  </datalist>
                  <p className="mt-1 text-[10px] leading-4 text-[#77818d] dark:text-[#aeb9c4]">
                    Default: 01101101. Select the recorded alternative or type the authorized Fund Cluster.
                  </p>
                </div>

                <div>
                  <Label htmlFor="pr-responsibility-center" className="text-xs font-semibold text-[#4c5664] dark:text-[#f1f5f8]">
                    Responsibility Center Code
                  </Label>
                  <Input
                    id="pr-responsibility-center"
                    value={responsibilityCenterCode}
                    onChange={(event) => setResponsibilityCenterCode(event.target.value)}
                    placeholder="Responsibility center code"
                    className="mt-2 h-9 rounded-[4px] border-[#dedad2] dark:border-[#46515c] dark:bg-[#232c35] dark:text-[#f1f5f8] text-xs"
                  />
                </div>

                <div>
                  <Label htmlFor="pr-requested-by" className="text-xs font-semibold text-[#4c5664] dark:text-[#f1f5f8]">
                    Requested by
                  </Label>
                  <Input
                    id="pr-requested-by"
                    list="pr-requested-signatories"
                    value={requestedSignatoryChoice}
                    onChange={(event) => setRequestedSignatoryChoice(event.target.value)}
                    placeholder="Search authorized requester"
                    className="mt-2 h-9 rounded-[4px] border-[#dedad2] dark:border-[#46515c] dark:bg-[#232c35] dark:text-[#f1f5f8] text-xs"
                  />
                  <datalist id="pr-requested-signatories">
                    {requesterSignatories.map((signatory) => (
                      <option key={signatory.id} value={signatoryLabel(signatory)} />
                    ))}
                  </datalist>
                  <p className="mt-1 text-[10px] leading-4 text-[#77818d] dark:text-[#aeb9c4]">
                    {requesterSignatories.length ? "Type to filter active authorized requesters, then choose a suggested name." : "No requesting signatory is configured yet."}
                  </p>
                </div>

                <div>
                  <Label htmlFor="pr-approved-by" className="text-xs font-semibold text-[#4c5664] dark:text-[#f1f5f8]">
                    Approved by
                  </Label>
                  <Input
                    id="pr-approved-by"
                    list="pr-approved-signatories"
                    value={approvedSignatoryChoice}
                    onChange={(event) => setApprovedSignatoryChoice(event.target.value)}
                    placeholder="Search authorized approver"
                    className="mt-2 h-9 rounded-[4px] border-[#dedad2] dark:border-[#46515c] dark:bg-[#232c35] dark:text-[#f1f5f8] text-xs"
                  />
                  <datalist id="pr-approved-signatories">
                    {approverSignatories.map((signatory) => (
                      <option key={signatory.id} value={signatoryLabel(signatory)} />
                    ))}
                  </datalist>
                  <p className="mt-1 text-[10px] leading-4 text-[#77818d] dark:text-[#aeb9c4]">
                    {approverSignatories.length ? "Type to filter active authorized approvers, then choose a suggested name." : "No approving signatory is configured yet."}
                  </p>
                </div>

                <div>
                  <Label htmlFor="pr-fund-source" className="text-xs font-semibold text-[#4c5664] dark:text-[#f1f5f8]">
                    Fund source <span className="font-normal text-[#8b949e] dark:text-[#aeb9c4]">(optional)</span>
                  </Label>
                  <Input
                    id="pr-fund-source"
                    value={fundSource}
                    onChange={(event) => setFundSource(event.target.value)}
                    placeholder="e.g., General Fund"
                    className="mt-2 h-9 rounded-[4px] border-[#dedad2] dark:border-[#46515c] dark:bg-[#232c35] dark:text-[#f1f5f8] text-xs"
                  />
                </div>
              </div>

              {/* Item Details Grid with PhilGEPS Catalog Integration */}
              <div className="mt-7 border-t border-[#ece8df] dark:border-[#46515c] pt-5">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-[#4c5664] dark:text-[#f1f5f8]">
                      Requisition Line Items — Item details — system entry workspace <span className="text-rose-600">*</span>
                    </p>
                    <p className="mt-1 text-[11px] text-[#77818d] dark:text-[#aeb9c4]">
                      Select a common-use catalog item to copy its specifications and reference price, or enter custom specifications.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addItem}
                    className="h-8 rounded-[4px] border-[#d8d3ca] text-[11px] dark:border-[#46515c] dark:text-[#f1f5f8]"
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" /> Add item
                  </Button>
                </div>

                {/* Catalog Filter Controls */}
                <div className="mt-4 grid max-w-3xl gap-2 sm:grid-cols-[1.25fr_.95fr_auto]">
                  <div>
                    <Label htmlFor="catalog-search" className="text-[11px] font-semibold text-[#4c5664] dark:text-[#f1f5f8]">
                      Find a common-use catalog item
                    </Label>
                    <div className="relative mt-1.5">
                      <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9098a2]" />
                      <Input
                        id="catalog-search"
                        value={catalogSearch}
                        onChange={(event) => setCatalogSearch(event.target.value)}
                        placeholder="Search code or description"
                        className="h-9 rounded-[4px] border-[#d8d3ca] bg-[#fffefa] dark:border-[#46515c] dark:bg-[#232c35] dark:text-[#f1f5f8] pl-9 text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-[11px] font-semibold text-[#4c5664] dark:text-[#f1f5f8]">
                      Source code family
                    </Label>
                    <Select value={catalogCodeFamily} onValueChange={setCatalogCodeFamily}>
                      <SelectTrigger className="mt-1.5 h-9 rounded-[4px] border-[#d8d3ca] bg-[#fffefa] dark:border-[#46515c] dark:bg-[#232c35] dark:text-[#f1f5f8] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="dark:border-[#46515c] dark:bg-[#1b2229] dark:text-[#f1f5f8]">
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
                      className={
                        favoritesOnly
                          ? "h-9 w-full rounded-[4px] bg-[#7b1e1e] text-xs text-white hover:bg-[#641818] dark:bg-[#d65c50] dark:text-white dark:hover:bg-[#eb766a]"
                          : "h-9 w-full rounded-[4px] border-[#d8d3ca] text-xs dark:border-[#46515c] dark:text-[#f1f5f8]"
                      }
                    >
                      <Star className={favoritesOnly ? "mr-1.5 h-3.5 w-3.5 fill-current" : "mr-1.5 h-3.5 w-3.5"} />
                      Favorites ({favorites.data?.length ?? 0})
                    </Button>
                  </div>
                </div>

                <datalist id="pr-unit-suggestions">
                  <option value="pc">pc (piece)</option>
                  <option value="unit">unit</option>
                  <option value="box">box</option>
                  <option value="set">set</option>
                  <option value="pack">pack</option>
                  <option value="lot">lot</option>
                  <option value="pad">pad</option>
                  <option value="roll">roll</option>
                  <option value="ream">ream</option>
                  <option value="bottle">bottle</option>
                  <option value="can">can</option>
                  <option value="cartridge">cartridge</option>
                  <option value="tube">tube</option>
                  <option value="meter">meter</option>
                  <option value="pair">pair</option>
                  <option value="bundle">bundle</option>
                </datalist>

                <div className="overflow-x-auto">
                  <RecordTable className="mt-4 min-w-[920px]">
                    <RecordTableHeader>
                      <tr>
                        <th className="px-3 py-3 font-semibold">Catalog item</th>
                        <th className="px-3 py-3 font-semibold">Favorite</th>
                        <th className="px-3 py-3 font-semibold">Stock / property no.</th>
                        <th className="px-3 py-3 font-semibold">Description <span className="text-rose-600">*</span></th>
                        <th className="px-3 py-3 font-semibold">Qty. <span className="text-rose-600">*</span></th>
                        <th className="px-3 py-3 font-semibold">Unit <span className="text-rose-600">*</span></th>
                        <th className="px-3 py-3 font-semibold">Est. unit cost (₱) <span className="text-rose-600">*</span></th>
                        <th className="w-10 px-2 py-3" />
                      </tr>
                    </RecordTableHeader>
                    <tbody className="divide-y divide-[#efebe4] dark:divide-[#46515c]">
                      {items.map((item, index) => {
                        const selectedCatalogItem = [...catalogItems, ...(favorites.data ?? [])].find((catalogItem) => String(catalogItem.id) === item.catalogItemId);
                        const isDescInvalid = attemptedSubmit && !item.description.trim();
                        const isQtyInvalid = attemptedSubmit && (!item.quantity.trim() || Number(item.quantity) <= 0);
                        const isUnitInvalid = attemptedSubmit && !item.unit.trim();
                        const isCostInvalid = attemptedSubmit && (!item.estimatedUnitCost.trim() || Number(item.estimatedUnitCost) <= 0);

                        return (
                          <tr key={index}>
                            <td className="min-w-64 p-2">
                              <Select
                                value={item.catalogItemId || "manual-item"}
                                onValueChange={(value) => {
                                  if (value === "manual-item") return updateItem(index, "catalogItemId", "");
                                  const selected = [...catalogItems, ...(favorites.data ?? [])].find((catalogItem) => String(catalogItem.id) === value);
                                  if (!selected) return;
                                  setItems((current) =>
                                    current.map((currentItem, itemIndex) =>
                                      itemIndex === index
                                        ? {
                                            ...currentItem,
                                            catalogItemId: value,
                                            stockPropertyNo: selected.productCode,
                                            description: selected.description,
                                            unit: selected.unit || "pc",
                                            estimatedUnitCost: Number(selected.referencePrice).toFixed(2),
                                          }
                                        : currentItem
                                    )
                                  );
                                }}
                              >
                                <SelectTrigger className="h-8 min-w-64 border-[#e1ddd5] dark:border-[#46515c] dark:bg-[#232c35] dark:text-[#f1f5f8] text-[10px]">
                                  <SelectValue placeholder="Manual item or select catalog" />
                                </SelectTrigger>
                                <SelectContent className="dark:border-[#46515c] dark:bg-[#1b2229] dark:text-[#f1f5f8]">
                                  <SelectItem value="manual-item">Manual item — no catalog reference</SelectItem>
                                  {catalogItems.map((catalogItem) => (
                                    <SelectItem key={catalogItem.id} value={String(catalogItem.id)}>
                                      {favoriteIds.has(catalogItem.id) ? "★ " : ""}
                                      {catalogItem.productCode} — {catalogItem.description}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="p-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                disabled={!selectedCatalogItem || toggleFavorite.isPending}
                                title={selectedCatalogItem && favoriteIds.has(selectedCatalogItem.id) ? "Remove from favorites" : "Add selected item to favorites"}
                                onClick={() => selectedCatalogItem && toggleFavorite.mutate({ catalogItemId: selectedCatalogItem.id, isFavorite: !favoriteIds.has(selectedCatalogItem.id) })}
                                className="h-8 w-8 rounded-[4px] text-[#9a6d19] hover:bg-[#fffaf0] dark:text-[#f0c36a] dark:hover:bg-[#272118]"
                              >
                                <Star className={selectedCatalogItem && favoriteIds.has(selectedCatalogItem.id) ? "h-3.5 w-3.5 fill-current" : "h-3.5 w-3.5"} />
                              </Button>
                            </td>
                            <td className="p-2">
                              <Input
                                value={item.stockPropertyNo}
                                onChange={(event) => updateItem(index, "stockPropertyNo", event.target.value)}
                                placeholder="Optional"
                                className="h-8 w-28 border-[#e1ddd5] dark:border-[#46515c] dark:bg-[#232c35] dark:text-[#f1f5f8] text-xs"
                              />
                            </td>
                            <td className="min-w-56 p-2">
                              <Input
                                value={item.description}
                                onChange={(event) => updateItem(index, "description", event.target.value)}
                                placeholder="Item description"
                                className={`h-8 border-[#e1ddd5] dark:border-[#46515c] dark:bg-[#232c35] dark:text-[#f1f5f8] text-xs ${
                                  isDescInvalid ? "border-rose-500 ring-1 ring-rose-500 bg-rose-50/40 dark:bg-rose-950/30" : ""
                                }`}
                              />
                            </td>
                            <td className="p-2">
                              <Input
                                value={item.quantity}
                                onChange={(event) => updateItem(index, "quantity", event.target.value)}
                                type="number"
                                min="0.01"
                                step="0.01"
                                placeholder="1"
                                className={`h-8 w-20 border-[#e1ddd5] dark:border-[#46515c] dark:bg-[#232c35] dark:text-[#f1f5f8] text-xs ${
                                  isQtyInvalid ? "border-rose-500 ring-1 ring-rose-500 bg-rose-50/40 dark:bg-rose-950/30" : ""
                                }`}
                              />
                            </td>
                            <td className="p-2">
                              <Input
                                value={item.unit}
                                list="pr-unit-suggestions"
                                onChange={(event) => updateItem(index, "unit", event.target.value)}
                                placeholder="e.g. pc, box"
                                className={`h-8 w-24 border-[#e1ddd5] dark:border-[#46515c] dark:bg-[#232c35] dark:text-[#f1f5f8] text-xs ${
                                  isUnitInvalid ? "border-rose-500 ring-1 ring-rose-500 bg-rose-50/40 dark:bg-rose-950/30" : ""
                                }`}
                              />
                            </td>
                            <td className="p-2">
                              <Input
                                value={item.estimatedUnitCost}
                                onChange={(event) => updateItem(index, "estimatedUnitCost", event.target.value)}
                                type="number"
                                min="0.01"
                                step="0.01"
                                placeholder="0.00"
                                className={`h-8 w-28 border-[#e1ddd5] dark:border-[#46515c] dark:bg-[#232c35] dark:text-[#f1f5f8] text-xs ${
                                  isCostInvalid ? "border-rose-500 ring-1 ring-rose-500 bg-rose-50/40 dark:bg-rose-950/30" : ""
                                }`}
                              />
                            </td>
                            <td className="p-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                disabled={items.length === 1}
                                onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                                className="h-8 w-8 rounded-[4px] text-[#9a5c5c] hover:bg-red-50 dark:text-[#ff837a] dark:hover:bg-[#341f1f]"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </RecordTable>
                </div>

                <div className="mt-3 flex justify-end text-xs font-semibold text-[#4b5563] dark:text-[#d1dae2]">
                  Estimated total: <span className="ml-2 text-[#7b1e1e] dark:text-[#ff837a]">₱{total.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* Form Action Controls */}
              <div className="mt-6 flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-[#ece8df] dark:border-[#38434f]">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSaving}
                  onClick={() => setCurrentStep("ppmp")}
                  className="h-9 rounded-[4px] border-[#d8d3ca] text-xs dark:border-[#46515c] dark:text-[#f1f5f8] flex items-center gap-1.5 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Back to PPMP Setup</span>
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                    className="h-9 rounded-[4px] border-[#d8d3ca] text-xs dark:border-[#46515c] dark:text-[#f1f5f8]"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSaving || !configurationReady}
                    className="h-9 rounded-[4px] bg-[#7b1e1e] text-xs font-semibold text-white hover:bg-[#641818] dark:bg-[#d65c50] dark:text-white dark:hover:bg-[#eb766a] flex items-center gap-1.5"
                  >
                    {isSaving && <LoaderCircle className="h-3.5 w-3.5 animate-spin text-white" />}
                    <span>Save Purchase Request</span>
                  </Button>
                </div>
              </div>
            </section>
          </form>

          {/* Sidebar Guidance */}
          <aside className="h-fit border border-[#e4d4ae] bg-[#fffaf0] dark:border-[#635028] dark:bg-[#272118] p-5 print:hidden no-print">
            <div className="flex items-center gap-2 text-[#8a6520] dark:text-[#f0c36a]">
              <Info className="h-4 w-4" />
              <p className="text-xs font-bold">End-User Guidance</p>
            </div>
            <p className="mt-3 text-[11px] leading-5 text-[#75643e] dark:text-[#d1dae2]">
              Before submission, complete market scoping and prepare the PP, PPMP, and Purchase Request. After saving the request, record three supplier quotes and upload the preliminary quotation document.
            </p>
            <div className="mt-5 border-t border-[#eddfbe] dark:border-[#635028] pt-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9a6d19] dark:text-[#f0c36a]">
                Package checklist
              </p>
              <ol className="mt-2 space-y-2 text-[11px] text-[#75643e] dark:text-[#d1dae2]">
                {preparationSteps.map((step, index) => (
                  <li key={step.label} aria-current={step.current ? "step" : undefined} className="flex items-start gap-2">
                    <span className={`mt-0.5 inline-grid h-4 w-4 shrink-0 place-items-center rounded-full border text-[9px] ${step.complete ? "border-emerald-700 bg-emerald-700 text-white dark:border-emerald-500 dark:bg-emerald-600" : step.current ? "border-[#9a6d19] bg-[#fff2ce] text-[#79551a] dark:border-[#f0c36a] dark:bg-[#493714] dark:text-[#f0c36a]" : "border-[#c8b98f] text-[#8c7a58] dark:border-[#746445] dark:text-[#b5a783]"}`}>
                      {step.complete ? "✓" : index + 1}
                    </span>
                    <span className="min-w-0">
                      <span className={`block font-semibold ${step.current ? "text-[#79551a] dark:text-[#f0c36a]" : ""}`}>{step.label}</span>
                      <span className="block text-[10px] leading-4 text-[#8c8067] dark:text-[#b5a783]">{step.complete ? "Complete" : step.current ? "In progress" : step.description}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </aside>
        </div>
      )}
      <section className="rounded-lg border border-[#e4d4ae] bg-[#fffdf5] p-4 dark:border-[#524424] dark:bg-[#1f1b14]" aria-label="Request setup progress">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-[#34404e] dark:text-[#f1f5f8]">Steps to submit your request</h3>
            <p className="mt-1 text-xs text-[#75643e] dark:text-[#c4cfd9]">
              {currentProgressStep.description}
            </p>
          </div>
          <span className="text-xs font-semibold text-[#7b1e1e] dark:text-[#ff837a]">
            Step {currentProgressNumber} of {preparationSteps.length}: {currentProgressStep.label}
          </span>
        </div>
        <div
          className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#e8e2d7] dark:bg-[#343e4a]"
          role="progressbar"
          aria-label="Request setup progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={currentProgressNumber * 20}
          aria-valuetext={`Step ${currentProgressNumber} of ${preparationSteps.length}: ${currentProgressStep.label}`}
        >
          <div
            className="h-full rounded-full bg-[#7b1e1e] transition-[width] duration-300 dark:bg-[#d65c50]"
            style={{ width: `${currentProgressNumber * 20}%` }}
          />
        </div>
        <ol className="mt-3 grid gap-3 sm:grid-cols-5" aria-label="Required request steps">
          {preparationSteps.map((step, index) => (
            <li
              key={step.label}
              aria-current={step.current ? "step" : undefined}
              className={`min-w-0 text-[11px] ${
                step.current
                  ? "text-[#7b1e1e] dark:text-[#ff837a]"
                  : step.complete
                    ? "text-emerald-700 dark:text-emerald-300"
                    : "text-[#77818d] dark:text-[#aeb9c4]"
              }`}
            >
              <span className="flex items-center gap-1.5 font-semibold">
                <span className="inline-grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[10px]">
                  {step.complete ? "✓" : index + 1}
                </span>
                {step.label}
              </span>
              <span className="mt-1 block leading-4 text-[#77818d] dark:text-[#aeb9c4]">{step.description}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
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
