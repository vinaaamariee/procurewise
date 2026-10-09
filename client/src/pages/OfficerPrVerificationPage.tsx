import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import {
  detectMixedCategories,
  normalizeProcurementRole,
  SECTION_5_1_1_CATEGORIES,
} from "../../../shared/procurementRules";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  Filter,
  Layers,
  LoaderCircle,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Undo2,
  XCircle,
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Link } from "wouter";

function formatMoney(amount: number | string | null | undefined) {
  const numeric = typeof amount === "number" ? amount : Number(amount ?? 0);
  return `₱${numeric.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function OfficerPrVerificationPage() {
  const { user } = useAuth();
  const role = user ? normalizeProcurementRole(user.role) : "end_user";
  const isOfficerOrAdmin = role === "procurement_officer" || role === "admin";

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "verified" | "returned">("all");

  // Review & Verification Modal
  const [selectedVerificationItem, setSelectedVerificationItem] = useState<any | null>(null);
  const [categorySegregationConfirmed, setCategorySegregationConfirmed] = useState(false);

  // Return for Revision Modal
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [returnReason, setReturnReason] = useState(
    "Mixed item categories detected (Non-compliant with Section 5.1.1). Please separate items into individual requests per category."
  );
  const [returnRemarks, setReturnRemarks] = useState("");

  const utils = trpc.useUtils();
  const verificationsQuery = trpc.procurement.officer.prVerification.list.useQuery(undefined, {
    retry: false,
    enabled: isOfficerOrAdmin,
  });

  const verifyMutation = trpc.procurement.officer.prVerification.verify.useMutation({
    onSuccess: () => {
      toast.success("PR & PPMP package successfully verified under Section 5.1.1. Advanced to Procurement Staff for PMR recording.");
      setSelectedVerificationItem(null);
      setCategorySegregationConfirmed(false);
      void utils.procurement.officer.prVerification.list.invalidate();
      void utils.procurement.purchaseRequests.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const returnMutation = trpc.procurement.officer.prVerification.returnForRevision.useMutation({
    onSuccess: () => {
      toast.success("Purchase Request returned to End-User for revision with Section 5.1.1 remarks.");
      setReturnModalOpen(false);
      setSelectedVerificationItem(null);
      setCategorySegregationConfirmed(false);
      setReturnRemarks("");
      void utils.procurement.officer.prVerification.list.invalidate();
      void utils.procurement.purchaseRequests.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const allRecords = verificationsQuery.data ?? [];

  // Summary Metrics
  const metrics = useMemo(() => {
    let pending = 0;
    let verified = 0;
    let returned = 0;
    let mixedWarnings = 0;

    for (const item of allRecords) {
      if (item.purchaseRequest.status === "returned") {
        returned++;
      } else if (item.isVerified) {
        verified++;
      } else if (item.purchaseRequest.status !== "draft") {
        pending++;
      }
      if (item.segregationAnalysis?.isMixed) {
        mixedWarnings++;
      }
    }
    return { pending, verified, returned, mixedWarnings };
  }, [allRecords]);

  // Filtered List
  const filteredRecords = useMemo(() => {
    return allRecords.filter((item) => {
      const pr = item.purchaseRequest;
      if (statusFilter === "pending") {
        if (pr.status === "returned" || item.isVerified || pr.status === "draft") return false;
      } else if (statusFilter === "verified") {
        if (!item.isVerified) return false;
      } else if (statusFilter === "returned") {
        if (pr.status !== "returned") return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const prNumber = pr.prNumber?.toLowerCase() ?? "";
        const purpose = pr.purpose?.toLowerCase() ?? "";
        const ppmpDesc = item.linkedPpmp?.description?.toLowerCase() ?? "";
        return prNumber.includes(q) || purpose.includes(q) || ppmpDesc.includes(q);
      }
      return true;
    });
  }, [allRecords, statusFilter, searchQuery]);

  const handleOpenReview = (item: any) => {
    setSelectedVerificationItem(item);
    // If already verified, default to true; otherwise default to false requiring active officer confirmation
    setCategorySegregationConfirmed(item.isVerified);
  };

  const handleProceedVerification = () => {
    if (!selectedVerificationItem) return;
    if (!categorySegregationConfirmed) {
      toast.error("You must confirm Section 5.1.1 category segregation before proceeding.");
      return;
    }
    verifyMutation.mutate({
      purchaseRequestId: selectedVerificationItem.purchaseRequest.id,
      categorySegregationVerified: true,
    });
  };

  const handleOpenReturnModal = () => {
    if (!selectedVerificationItem) return;
    if (selectedVerificationItem.segregationAnalysis?.isMixed) {
      setReturnReason(
        "Mixed item categories detected (Non-compliant with Section 5.1.1). Please separate items into individual requests per category."
      );
    }
    setReturnModalOpen(true);
  };

  const handleConfirmReturn = () => {
    if (!selectedVerificationItem) return;
    returnMutation.mutate({
      purchaseRequestId: selectedVerificationItem.purchaseRequest.id,
      reason: returnReason,
      remarks: returnRemarks.trim() || returnReason,
    });
  };

  if (!isOfficerOrAdmin) {
    return (
      <div className="mx-auto max-w-4xl py-12 px-4 text-center">
        <ShieldAlert className="mx-auto h-12 w-12 text-rose-500" />
        <h2 className="mt-4 text-xl font-bold text-slate-900 dark:text-white">Access Restricted</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          This workbench is strictly mandated for the Procurement Officer to receive and verify PR & PPMP packages under Section 5.1.1.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#881337]/10 text-[#881337] dark:bg-[#881337]/20 dark:text-rose-300">
                <FileCheck2 className="h-5 w-5" />
              </span>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Receive & Verify PR & PPMP
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Section 5.1.1 Category Segregation Verification & clearance for Procurement Staff PMR recording.
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void utils.procurement.officer.prVerification.list.invalidate()}
              disabled={verificationsQuery.isFetching}
              className="h-8 gap-1.5 text-xs text-slate-600 dark:text-slate-300"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${verificationsQuery.isFetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Section 5.1.1 Rule Banner */}
        <div className="mt-4 rounded-lg border border-amber-200/80 bg-amber-50/70 p-3 dark:border-amber-900/40 dark:bg-amber-950/20">
          <div className="flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <div>
              <span className="font-semibold">Mandated Section 5.1.1 Compliance Rule:</span> The Procurement Officer shall verify the specifications in the PR if the items are separated from <span className="font-semibold underline">office supplies</span>, <span className="font-semibold underline">hardware supplies</span>, <span className="font-semibold underline">ICT supplies</span>, <span className="font-semibold underline">printing service</span>, and <span className="font-semibold underline">food ingredients</span>. If not, return to End-User for revision. If yes, proceed to next step.
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Pending Verification</span>
            <span className="rounded-md bg-amber-50 p-1.5 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
              <Clock className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{metrics.pending}</div>
          <p className="mt-1 text-[11px] text-slate-500">Awaiting Section 5.1.1 clearance</p>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Verified & Cleared</span>
            <span className="rounded-md bg-emerald-50 p-1.5 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{metrics.verified}</div>
          <p className="mt-1 text-[11px] text-slate-500">Ready for Staff PMR recording</p>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Returned for Revision</span>
            <span className="rounded-md bg-rose-50 p-1.5 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
              <Undo2 className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{metrics.returned}</div>
          <p className="mt-1 text-[11px] text-slate-500">Returned to End-User for correction</p>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Mixed Category Warnings</span>
            <span className="rounded-md bg-amber-50 p-1.5 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">{metrics.mixedWarnings}</div>
          <p className="mt-1 text-[11px] text-slate-500">Require segregation return</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            variant={statusFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("all")}
            className={`h-8 text-xs ${statusFilter === "all" ? "bg-[#881337] hover:bg-[#70102e] text-white" : ""}`}
          >
            All Packages ({allRecords.length})
          </Button>
          <Button
            variant={statusFilter === "pending" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("pending")}
            className={`h-8 text-xs ${statusFilter === "pending" ? "bg-[#881337] hover:bg-[#70102e] text-white" : ""}`}
          >
            Pending Verification ({metrics.pending})
          </Button>
          <Button
            variant={statusFilter === "verified" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("verified")}
            className={`h-8 text-xs ${statusFilter === "verified" ? "bg-[#881337] hover:bg-[#70102e] text-white" : ""}`}
          >
            Verified ({metrics.verified})
          </Button>
          <Button
            variant={statusFilter === "returned" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("returned")}
            className={`h-8 text-xs ${statusFilter === "returned" ? "bg-[#881337] hover:bg-[#70102e] text-white" : ""}`}
          >
            Returned ({metrics.returned})
          </Button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search PR number, purpose..."
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>

      {/* Records Table */}
      <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        {verificationsQuery.isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <LoaderCircle className="h-6 w-6 animate-spin text-[#881337]" />
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="py-12 text-center">
            <FileSpreadsheet className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600" />
            <p className="mt-2 text-sm font-medium text-slate-700 dark:text-slate-300">No PR packages found</p>
            <p className="text-xs text-slate-500">There are no submitted packages matching this filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50/75 dark:border-slate-800 dark:bg-slate-800/50">
                <tr>
                  <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">PR Number & Date</th>
                  <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Purpose & Office</th>
                  <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Linked PPMP Entry</th>
                  <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Section 5.1.1 Category Check</th>
                  <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Estimated Cost</th>
                  <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredRecords.map((item) => {
                  const pr = item.purchaseRequest;
                  const isMixed = item.segregationAnalysis?.isMixed;
                  const detectedCats = item.segregationAnalysis?.categoryLabels ?? [];
                  const isReturned = pr.status === "returned";
                  const isVerified = item.isVerified;

                  return (
                    <tr
                      key={pr.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900 dark:text-white">{pr.prNumber}</div>
                        <div className="text-[11px] text-slate-500">
                          {pr.submittedAt
                            ? new Date(pr.submittedAt).toLocaleDateString("en-PH")
                            : new Date(pr.createdAt).toLocaleDateString("en-PH")}
                        </div>
                      </td>
                      <td className="px-4 py-3 max-w-[220px]">
                        <div className="truncate font-medium text-slate-800 dark:text-slate-200" title={pr.purpose}>
                          {pr.purpose}
                        </div>
                        <div className="text-[11px] text-slate-500">{pr.entityName} · Cluster {pr.fundCluster}</div>
                      </td>
                      <td className="px-4 py-3 max-w-[220px]">
                        {item.linkedPpmp ? (
                          <div>
                            <div className="truncate font-medium text-slate-700 dark:text-slate-300" title={item.linkedPpmp.description}>
                              {item.linkedPpmp.description}
                            </div>
                            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                              PPMP Linked · {item.linkedPpmp.modeOfProcurement || "SVP"}
                            </div>
                          </div>
                        ) : (item as any).uploadedPpmpDoc ? (
                          <div>
                            <div className="truncate font-medium text-slate-700 dark:text-slate-300" title={(item as any).uploadedPpmpDoc.originalFileName}>
                              {(item as any).uploadedPpmpDoc.originalFileName}
                            </div>
                            <a
                              href={(item as any).uploadedPpmpDoc.storageUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium hover:underline inline-flex items-center gap-1"
                            >
                              PPMP Attached <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          </div>
                        ) : (
                          <span className="text-[11px] text-rose-500 font-medium">No linked PPMP</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isReturned ? (
                          <Badge variant="outline" className="border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300 text-[10px]">
                            <Undo2 className="mr-1 h-3 w-3" /> Returned for Revision
                          </Badge>
                        ) : isVerified ? (
                          <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 text-[10px]">
                            <CheckCircle2 className="mr-1 h-3 w-3" /> Officer Verified (Compliant)
                          </Badge>
                        ) : isMixed ? (
                          <div>
                            <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300 text-[10px]">
                              <AlertTriangle className="mr-1 h-3 w-3" /> Section 5.1.1 Non-Compliant (Mixed)
                            </Badge>
                            <div className="mt-0.5 text-[10px] text-amber-700 dark:text-amber-400">
                              {detectedCats.join(" + ")}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <Badge variant="outline" className="border-emerald-200 bg-emerald-50/50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-400 text-[10px]">
                              <CheckCircle2 className="mr-1 h-3 w-3" /> Single Category ({detectedCats[0] || "Supplies"})
                            </Badge>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                        {formatMoney(pr.totalEstimate)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          size="sm"
                          onClick={() => handleOpenReview(item)}
                          className="h-7 gap-1 px-2.5 text-xs bg-[#881337] hover:bg-[#70102e] text-white rounded-md shadow-xs"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          {isVerified ? "View Package" : "Review & Verify"}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Review & Verification Modal */}
      {selectedVerificationItem && (
        <Dialog open={Boolean(selectedVerificationItem)} onOpenChange={(open) => !open && setSelectedVerificationItem(null)}>
          <DialogContent className="flex max-h-[94dvh] w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] flex-col overflow-hidden p-4 sm:max-w-[min(96vw,1280px)] sm:p-6">
            <DialogHeader className="shrink-0">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#881337]/10 text-[#881337] dark:bg-[#881337]/20 dark:text-rose-300">
                  <FileCheck2 className="h-4 w-4" />
                </span>
                <div>
                  <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
                    PR & PPMP Package Review — {selectedVerificationItem.purchaseRequest.prNumber}
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    Administrative clearance step before handoff to Staff for PMR recording.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pt-2">
              {/* Package Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-lg border border-slate-200/80 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-800/40 text-xs">
                <div>
                  <span className="text-[11px] text-slate-500">PR Number:</span>
                  <div className="font-semibold text-slate-900 dark:text-white">{selectedVerificationItem.purchaseRequest.prNumber}</div>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500">Fund Cluster:</span>
                  <div className="font-semibold text-slate-900 dark:text-white">{selectedVerificationItem.purchaseRequest.fundCluster}</div>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500">Total Estimate:</span>
                  <div className="font-semibold text-slate-900 dark:text-white">{formatMoney(selectedVerificationItem.purchaseRequest.totalEstimate)}</div>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500">Tracking Slip Token:</span>
                  <div className="font-mono text-[10px] text-slate-600 dark:text-slate-300 truncate" title={selectedVerificationItem.purchaseRequest.trackingToken}>
                    {selectedVerificationItem.purchaseRequest.trackingToken?.slice(0, 16)}…
                  </div>
                </div>
              </div>

              {/* Linked PPMP Validation Box */}
              <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <BookOpenCheck className="h-4 w-4 text-[#881337]" />
                    Linked PPMP Verification
                  </span>
                  {selectedVerificationItem.linkedPpmp || (selectedVerificationItem as any).uploadedPpmpDoc ? (
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                      PPMP Verified {(selectedVerificationItem as any).uploadedPpmpDoc ? "(Attached File)" : ""}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-[10px]">
                      Missing PPMP Reference
                    </Badge>
                  )}
                </div>
                {selectedVerificationItem.linkedPpmp ? (
                  <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500">Planned Item:</span>
                      <div className="font-medium text-slate-800 dark:text-slate-200">{selectedVerificationItem.linkedPpmp.description}</div>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500">Planned Amount:</span>
                      <div className="font-medium text-slate-800 dark:text-slate-200">{formatMoney(selectedVerificationItem.linkedPpmp.plannedAmount)}</div>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500">Procurement Modality:</span>
                      <div className="font-medium text-slate-800 dark:text-slate-200">{selectedVerificationItem.linkedPpmp.modeOfProcurement || "SVP"}</div>
                    </div>
                  </div>
                ) : (selectedVerificationItem as any).uploadedPpmpDoc ? (
                  <div className="mt-2.5 text-xs text-slate-700 dark:text-slate-300">
                    The End-User provided and attached an authorized department PPMP document to this package.
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-rose-600">The End-User has not attached a valid PPMP entry to this Purchase Request.</p>
                )}
                {(selectedVerificationItem as any).uploadedPpmpDoc && (
                  <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                      <FileText className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                      <span className="truncate max-w-xs">Attached PPMP: <strong className="font-medium">{(selectedVerificationItem as any).uploadedPpmpDoc.originalFileName}</strong></span>
                    </div>
                    <a
                      href={(selectedVerificationItem as any).uploadedPpmpDoc.storageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#881337] hover:underline dark:text-rose-400 shrink-0 ml-2"
                    >
                      <ExternalLink className="h-3 w-3" /> View / Download PPMP
                    </a>
                  </div>
                )}
              </div>

              {/* Items Breakdown Table */}
              <div className="rounded-lg border border-slate-200 bg-white overflow-hidden dark:border-slate-800 dark:bg-slate-900">
                <div className="bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 dark:bg-slate-800/60 dark:text-slate-200 flex justify-between items-center">
                  <span>Line Items & Commodity Category Analysis ({selectedVerificationItem.items.length} items)</span>
                  <span className="text-[10px] text-slate-500">Mandated 5 Categories: Office, Hardware, ICT, Printing, Food</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px] text-left text-xs">
                    <thead className="border-b border-slate-200 bg-slate-50/50 dark:border-slate-800 text-[11px] text-slate-500">
                      <tr>
                        <th className="px-3 py-2">Item Description & Spec</th>
                        <th className="px-3 py-2">Detected Category</th>
                        <th className="px-3 py-2">Qty</th>
                        <th className="px-3 py-2">Est. Unit Cost</th>
                        <th className="px-3 py-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {selectedVerificationItem.items.map((item: any, idx: number) => {
                        const classification = selectedVerificationItem.segregationAnalysis?.itemClassifications?.[idx];
                        const catId = classification?.categoryId;
                        const catLabel = classification?.categoryLabel ?? "Unclassified";

                        return (
                          <tr key={item.id ?? idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                            <td className="px-3 py-2">
                              <div className="font-medium text-slate-800 dark:text-slate-200">{item.description}</div>
                              {item.specification && <div className="text-[10px] text-slate-500">{item.specification}</div>}
                            </td>
                            <td className="px-3 py-2">
                              <Badge variant="outline" className={`text-[10px] ${
                                catId === "office_supplies" ? "border-blue-300 bg-blue-50 text-blue-700" :
                                catId === "hardware_supplies" ? "border-orange-300 bg-orange-50 text-orange-700" :
                                catId === "ict_supplies" ? "border-purple-300 bg-purple-50 text-purple-700" :
                                catId === "printing_service" ? "border-emerald-300 bg-emerald-50 text-emerald-700" :
                                catId === "food_ingredients" ? "border-amber-300 bg-amber-50 text-amber-700" :
                                "border-slate-300 bg-slate-50 text-slate-600"
                              }`}>
                                {catLabel}
                              </Badge>
                            </td>
                            <td className="px-3 py-2">{item.quantity} {item.unit}</td>
                            <td className="px-3 py-2">{formatMoney(item.estimatedUnitCost)}</td>
                            <td className="px-3 py-2 text-right font-medium">{formatMoney(item.totalCost)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Section 5.1.1 Mixed Category Warning Banner */}
              {selectedVerificationItem.segregationAnalysis?.isMixed && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-3.5 dark:border-amber-800 dark:bg-amber-950/30">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                    <div className="text-xs text-amber-900 dark:text-amber-200">
                      <div className="font-bold">Warning (Section 5.1.1): Line items appear mixed across multiple categories.</div>
                      <div className="mt-1">
                        Ensure distinct commodity types are submitted on separate PRs. Detected commodities: <span className="font-semibold">{selectedVerificationItem.segregationAnalysis.categoryLabels.join(", ")}</span>.
                      </div>
                      <div className="mt-2 text-[11px] text-amber-800 dark:text-amber-300">
                        Recommendation: Click <span className="font-semibold underline">Return to End-User for Revision</span> to instruct the requester to split this request per Section 5.1.1 rules.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Category Segregation Checklist Toggle */}
              <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 mb-2">
                  Category Segregation Checklist
                </div>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={categorySegregationConfirmed}
                    onChange={(e) => setCategorySegregationConfirmed(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#881337] focus:ring-[#881337]"
                  />
                  <span className="text-xs text-slate-700 dark:text-slate-300">
                    <span className="font-semibold">Item Category Segregation Verified</span> (Items are segregated into: Office Supplies, Hardware Supplies, ICT Supplies, Printing Services, or Food Ingredients).
                  </span>
                </label>
              </div>
            </div>

            <DialogFooter className="mt-4 flex shrink-0 flex-col-reverse gap-2 border-t border-slate-200 pt-3 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelectedVerificationItem(null)}
                className="text-xs"
              >
                Close
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleOpenReturnModal}
                  className="text-xs border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-950/40"
                >
                  <Undo2 className="mr-1.5 h-3.5 w-3.5" />
                  Return to End-User for Revision
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={!categorySegregationConfirmed || verifyMutation.isPending}
                  onClick={handleProceedVerification}
                  className="text-xs bg-[#881337] hover:bg-[#70102e] text-white disabled:opacity-50"
                >
                  {verifyMutation.isPending && <LoaderCircle className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                  <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                  Verify & Proceed to Next Step
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Return for Revision Modal */}
      {returnModalOpen && (
        <Dialog open={returnModalOpen} onOpenChange={setReturnModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
                  <Undo2 className="h-4 w-4" />
                </span>
                <div>
                  <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
                    Return PR for Revision
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    Package will be routed back to End-User with your documented reason and remarks.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-3 pt-2 text-xs">
              <div>
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Select Return Reason:
                </Label>
                <select
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs shadow-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="Mixed item categories detected (Non-compliant with Section 5.1.1). Please separate items into individual requests per category.">
                    Mixed item categories detected (Section 5.1.1 Non-compliant)
                  </option>
                  <option value="Specifications are incomplete or unclear. Please provide detailed technical specifications.">
                    Incomplete / unclear item specifications
                  </option>
                  <option value="Linked PPMP entry does not match the requested items or budget allotment.">
                    PPMP entry mismatch or missing allocation
                  </option>
                  <option value="Other administrative correction required.">
                    Other administrative correction
                  </option>
                </select>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Specific Officer Instructions / Remarks:
                </Label>
                <Textarea
                  value={returnRemarks}
                  onChange={(e) => setReturnRemarks(e.target.value)}
                  placeholder="Enter specific instructions for the End-User (e.g. please separate Office Supplies and Hardware Supplies into two separate PRs)..."
                  className="mt-1.5 text-xs min-h-[80px]"
                />
              </div>

              <div className="rounded-md bg-amber-50 p-2.5 text-[11px] text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                <span className="font-semibold">Note:</span> This will update the PR status to <span className="font-semibold">Returned for Revision</span> and dispatch an immediate notification to the End-User.
              </div>
            </div>

            <DialogFooter className="mt-3">
              <Button variant="outline" size="sm" onClick={() => setReturnModalOpen(false)} className="text-xs">
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={returnMutation.isPending}
                onClick={handleConfirmReturn}
                className="text-xs bg-rose-600 hover:bg-rose-700 text-white"
              >
                {returnMutation.isPending && <LoaderCircle className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                Confirm Return for Revision
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
