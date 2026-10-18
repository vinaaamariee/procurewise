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
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  Eye,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  Filter,
  History,
  Layers,
  LoaderCircle,
  Paperclip,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Undo2,
  User as UserIcon,
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

function formatFileSize(bytes?: number | null) {
  if (!bytes || bytes <= 0) return "0 KB";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

const RETURN_REASON_PRESETS = [
  {
    label: "Missing Market Scoping",
    reason: "Market Scoping document is missing, incomplete, or non-compliant (Mandatory under RA 12009 Art. II).",
    remarks: "Please conduct strategic market scoping and attach the Market Scoping worksheet/analysis for this requirement in accordance with RA 12009 Article II prior to resubmission.",
  },
  {
    label: "Missing Pre-Canvass AOQ",
    reason: "Pre-Canvass preliminary quotation attachment is missing or incomplete.",
    remarks: "Please upload the complete preliminary quotation worksheet or signed Preliminary Abstract of Quotations before resubmitting.",
  },
  {
    label: "Incomplete 3 Quotes",
    reason: "Fewer than 3 preliminary supplier quotations provided or quotes are non-compliant.",
    remarks: "Please canvass at least three (3) legitimate supplier price quotations to establish market sounding and sound ABC ceiling.",
  },
  {
    label: "PPMP Mismatch",
    reason: "Linked PPMP entry does not match the requested items or budget allotment.",
    remarks: "Please attach the approved Department PPMP document or link the corresponding approved PPMP entry with sufficient remaining budget.",
  },
  {
    label: "Mixed Categories (Sec. 5.1.1)",
    reason: "Mixed item categories detected (Non-compliant with Section 5.1.1). Please separate items into individual requests per category.",
    remarks: "Under Section 5.1.1, items must be segregated into distinct categories (Office Supplies, Hardware Supplies, ICT Supplies, Printing Services, Food Ingredients). Please separate into individual PRs.",
  },
  {
    label: "Unclear Specifications",
    reason: "Specifications are incomplete or unclear. Please provide detailed technical specifications.",
    remarks: "Please provide clear, brand-agnostic technical specifications and unit parameters for all line items.",
  },
  {
    label: "Other Document Correction",
    reason: "Other administrative attachment or documentation correction required.",
    remarks: "Please review and correct the uploaded supporting attachments as specified above.",
  },
];

export function OfficerPrVerificationPage() {
  const { user } = useAuth();
  const role = user ? normalizeProcurementRole(user.role) : "end_user";
  const isOfficerOrAdmin = role === "procurement_officer" || role === "admin";

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "verified" | "returned">("all");

  // Review & Verification Modal
  const [selectedVerificationItem, setSelectedVerificationItem] = useState<any | null>(null);
  const [categorySegregationConfirmed, setCategorySegregationConfirmed] = useState(false);

  // Document Preview Modal
  const [previewDoc, setPreviewDoc] = useState<{ url: string; title: string; mimeType: string } | null>(null);

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
      setReturnRemarks("Under Section 5.1.1, items must be segregated into distinct categories (Office Supplies, Hardware Supplies, ICT Supplies, Printing Services, Food Ingredients). Please separate into individual PRs.");
    } else if (!selectedVerificationItem.marketScopingDoc) {
      setReturnReason("Market Scoping document is missing, incomplete, or non-compliant (Mandatory under RA 12009 Art. II).");
      setReturnRemarks("Please conduct strategic market scoping and attach the Market Scoping worksheet/analysis for this requirement in accordance with RA 12009 Article II prior to resubmission.");
    } else if (!selectedVerificationItem.preCanvassDoc) {
      setReturnReason("Pre-Canvass preliminary quotation attachment is missing or incomplete.");
      setReturnRemarks("Please upload the complete preliminary quotation worksheet or signed Preliminary Abstract of Quotations before resubmitting.");
    } else if (!selectedVerificationItem.linkedQuotes || selectedVerificationItem.linkedQuotes.length < 3) {
      setReturnReason("Fewer than 3 preliminary supplier quotations provided or quotes are non-compliant.");
      setReturnRemarks("Please canvass at least three (3) legitimate supplier price quotations to establish market sounding and sound ABC ceiling.");
    } else {
      setReturnRemarks("");
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
                  <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">End-User Attachments</th>
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
                      <td className="px-4 py-3 max-w-[200px]">
                        <div className="truncate font-medium text-slate-800 dark:text-slate-200" title={pr.purpose}>
                          {pr.purpose}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {item.office?.name || pr.entityName} · Cluster {pr.fundCluster}
                        </div>
                      </td>
                      <td className="px-4 py-3 max-w-[180px]">
                        {item.linkedPpmp ? (
                          <div>
                            <div className="truncate font-medium text-slate-700 dark:text-slate-300" title={item.linkedPpmp.description}>
                              {item.linkedPpmp.description}
                            </div>
                            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                              PPMP Linked · {item.linkedPpmp.modeOfProcurement || "SVP"}
                            </div>
                          </div>
                        ) : item.uploadedPpmpDoc ? (
                          <div>
                            <div className="truncate font-medium text-slate-700 dark:text-slate-300" title={item.uploadedPpmpDoc.originalFileName}>
                              {item.uploadedPpmpDoc.originalFileName}
                            </div>
                            <a
                              href={item.uploadedPpmpDoc.storageUrl}
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
                      <td className="px-4 py-3 max-w-[230px]">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1 flex-wrap">
                            {/* PPMP Document */}
                            {item.uploadedPpmpDoc ? (
                              <a
                                href={item.uploadedPpmpDoc.storageUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 hover:underline dark:bg-emerald-950/40 dark:text-emerald-300"
                                title={`PPMP File: ${item.uploadedPpmpDoc.originalFileName}`}
                              >
                                <Paperclip className="h-2.5 w-2.5" /> PPMP
                              </a>
                            ) : item.linkedPpmp ? (
                              <span className="inline-flex items-center gap-1 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-300" title="Linked to database PPMP entry">
                                <BookOpenCheck className="h-2.5 w-2.5" /> PPMP
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-medium text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                                No PPMP
                              </span>
                            )}

                            {/* Market Scoping Document */}
                            {item.marketScopingDoc ? (
                              <a
                                href={item.marketScopingDoc.storageUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 hover:underline dark:bg-emerald-950/40 dark:text-emerald-300"
                                title={`Market Scoping: ${item.marketScopingDoc.originalFileName}`}
                              >
                                <FileSpreadsheet className="h-2.5 w-2.5" /> Market Scoping
                              </a>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" title="Missing Market Scoping (RA 12009 Art. II requirement)">
                                No Market Scoping
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1 flex-wrap">
                            {/* Pre-Canvass Document */}
                            {item.preCanvassDoc ? (
                              <a
                                href={item.preCanvassDoc.storageUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700 hover:underline dark:bg-indigo-950/40 dark:text-indigo-300"
                                title={`Pre-Canvass AOQ: ${item.preCanvassDoc.originalFileName}`}
                              >
                                <FileText className="h-2.5 w-2.5" /> Pre-Canvass
                              </a>
                            ) : null}

                            {/* Quotes Count */}
                            {item.linkedQuotes?.length ? (
                              <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${item.linkedQuotes.length >= 3 ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"}`}>
                                {item.linkedQuotes.length}/3 Quotes
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                No Canvass
                              </span>
                            )}

                            {/* Other Documents */}
                            {item.otherDocuments?.length ? (
                              <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                +{item.otherDocuments.length} more
                              </span>
                            ) : null}
                          </div>
                        </div>
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
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 rounded-lg border border-slate-200/80 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-800/40 text-xs">
                <div>
                  <span className="text-[11px] text-slate-500">PR Number:</span>
                  <div className="font-semibold text-slate-900 dark:text-white font-mono">{selectedVerificationItem.purchaseRequest.prNumber}</div>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500">Requester / End-User:</span>
                  <div className="font-semibold text-slate-900 dark:text-white truncate" title={selectedVerificationItem.requester?.name || selectedVerificationItem.purchaseRequest.requestedSignatoryName || "End-User"}>
                    {selectedVerificationItem.requester?.name || selectedVerificationItem.purchaseRequest.requestedSignatoryName || "End-User"}
                  </div>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500">Department / Office:</span>
                  <div className="font-semibold text-slate-900 dark:text-white truncate" title={selectedVerificationItem.office?.name || selectedVerificationItem.purchaseRequest.entityName}>
                    {selectedVerificationItem.office?.name || selectedVerificationItem.purchaseRequest.entityName}
                  </div>
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

              {/* ── END-USER UPLOADED ATTACHMENTS & TRANSPARENCY ── */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#881337]/10 text-[#881337] dark:bg-[#881337]/20 dark:text-rose-300">
                      <Paperclip className="h-4 w-4" />
                    </span>
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                        End-User Uploaded Attachments &amp; Due Diligence
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Inspect mandatory PPMP, Market Scoping (RA 12009 Art. II), Pre-Canvass AOQ, and preliminary quotations for transparency and corrections.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge variant="outline" className="text-[10px] border-slate-300 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {(selectedVerificationItem.allDocuments?.length ?? 0)} attached file(s)
                    </Badge>
                    <Badge variant="outline" className={`text-[10px] ${(selectedVerificationItem.linkedQuotes?.length ?? 0) >= 3 ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300" : "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"}`}>
                      {(selectedVerificationItem.linkedQuotes?.length ?? 0)}/3 quotes recorded
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                  {/* Card 1: Market Scoping (RA 12009 Article II) */}
                  <div className={`rounded-lg border p-3.5 flex flex-col justify-between ${
                    selectedVerificationItem.marketScopingDoc
                      ? "border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/50 dark:bg-emerald-950/20"
                      : "border-amber-200 bg-amber-50/40 dark:border-amber-900/50 dark:bg-amber-950/20"
                  }`}>
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="font-bold text-xs flex items-center gap-1.5 text-slate-900 dark:text-white">
                          <FileSpreadsheet className={`h-4 w-4 ${selectedVerificationItem.marketScopingDoc ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`} />
                          Market Scoping
                        </span>
                        {selectedVerificationItem.marketScopingDoc ? (
                          <Badge variant="outline" className="border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px]">
                            Attached
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[10px]">
                            Missing
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
                        Mandatory under <strong>RA 12009 Article II</strong> for price discovery, fit-for-purpose planning, and life-cycle cost analysis.
                      </p>

                      {selectedVerificationItem.marketScopingDoc ? (
                        <div className="rounded-md border border-slate-200/80 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-900 text-xs space-y-1">
                          <div className="font-semibold text-slate-800 dark:text-slate-200 truncate" title={selectedVerificationItem.marketScopingDoc.originalFileName}>
                            {selectedVerificationItem.marketScopingDoc.originalFileName}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500">
                            <span>{formatFileSize(selectedVerificationItem.marketScopingDoc.fileSize)}</span>
                            <span>·</span>
                            <span>{new Date(selectedVerificationItem.marketScopingDoc.createdAt).toLocaleDateString("en-PH")}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-md border border-amber-300/80 bg-amber-100/50 p-2.5 text-[11px] text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200 space-y-1">
                          <p className="font-semibold flex items-center gap-1">
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                            No Market Scoping Attached
                          </p>
                          <p className="text-[10px] text-amber-800 dark:text-amber-300">
                            End-User must conduct preliminary market sounding prior to official RFQ.
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between gap-2">
                      {selectedVerificationItem.marketScopingDoc ? (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setPreviewDoc({
                              url: selectedVerificationItem.marketScopingDoc.storageUrl,
                              title: selectedVerificationItem.marketScopingDoc.originalFileName,
                              mimeType: selectedVerificationItem.marketScopingDoc.mimeType,
                            })}
                            className="h-7 text-[11px] gap-1 px-2 text-slate-700 dark:text-slate-300"
                          >
                            <Eye className="h-3 w-3" /> Preview
                          </Button>
                          <a
                            href={selectedVerificationItem.marketScopingDoc.storageUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#881337] hover:underline dark:text-rose-400"
                          >
                            <ExternalLink className="h-3 w-3" /> Open File
                          </a>
                        </>
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const preset = RETURN_REASON_PRESETS.find((p) => p.label.includes("Market Scoping"));
                            if (preset) {
                              setReturnReason(preset.reason);
                              setReturnRemarks(preset.remarks);
                            }
                            setReturnModalOpen(true);
                          }}
                          className="h-7 text-[10px] text-amber-800 dark:text-amber-300 hover:bg-amber-100/60 w-full"
                        >
                          <Undo2 className="mr-1 h-3 w-3" /> Flag Missing Market Scoping
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Card 2: PPMP Attachment & Allotment */}
                  <div className={`rounded-lg border p-3.5 flex flex-col justify-between ${
                    selectedVerificationItem.linkedPpmp || selectedVerificationItem.uploadedPpmpDoc
                      ? "border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/50 dark:bg-emerald-950/20"
                      : "border-rose-200 bg-rose-50/40 dark:border-rose-900/50 dark:bg-rose-950/20"
                  }`}>
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="font-bold text-xs flex items-center gap-1.5 text-slate-900 dark:text-white">
                          <BookOpenCheck className={`h-4 w-4 ${selectedVerificationItem.linkedPpmp || selectedVerificationItem.uploadedPpmpDoc ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`} />
                          Linked / Attached PPMP
                        </span>
                        {selectedVerificationItem.uploadedPpmpDoc ? (
                          <Badge variant="outline" className="border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px]">
                            File Attached
                          </Badge>
                        ) : selectedVerificationItem.linkedPpmp ? (
                          <Badge variant="outline" className="border-blue-300 bg-blue-100 text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300 text-[10px]">
                            Database Linked
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-rose-300 bg-rose-100 text-rose-800 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-300 text-[10px]">
                            Missing
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
                        Project Procurement Management Plan reference confirming annual budget authorization.
                      </p>

                      {selectedVerificationItem.uploadedPpmpDoc ? (
                        <div className="rounded-md border border-slate-200/80 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-900 text-xs space-y-1 mb-2">
                          <div className="font-semibold text-slate-800 dark:text-slate-200 truncate" title={selectedVerificationItem.uploadedPpmpDoc.originalFileName}>
                            {selectedVerificationItem.uploadedPpmpDoc.originalFileName}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500">
                            <span>{formatFileSize(selectedVerificationItem.uploadedPpmpDoc.fileSize)}</span>
                            <span>·</span>
                            <span>{new Date(selectedVerificationItem.uploadedPpmpDoc.createdAt).toLocaleDateString("en-PH")}</span>
                          </div>
                        </div>
                      ) : null}

                      {selectedVerificationItem.linkedPpmp ? (
                        <div className="rounded-md border border-slate-200/80 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-900 text-[11px] space-y-1">
                          <div className="text-slate-500 text-[10px]">Plan Item:</div>
                          <div className="font-medium text-slate-800 dark:text-slate-200 truncate" title={selectedVerificationItem.linkedPpmp.description}>
                            {selectedVerificationItem.linkedPpmp.description}
                          </div>
                          <div className="flex justify-between items-center text-[10px] text-slate-500 pt-1">
                            <span>Amount: <strong className="text-slate-700 dark:text-slate-300 font-semibold">{formatMoney(selectedVerificationItem.linkedPpmp.plannedAmount)}</strong></span>
                            <span>Mode: {selectedVerificationItem.linkedPpmp.modeOfProcurement || "SVP"}</span>
                          </div>
                        </div>
                      ) : !selectedVerificationItem.uploadedPpmpDoc ? (
                        <div className="rounded-md border border-rose-300/80 bg-rose-100/50 p-2.5 text-[11px] text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200 space-y-1">
                          <p className="font-semibold flex items-center gap-1">
                            <AlertCircle className="h-3.5 w-3.5 text-rose-600" />
                            No PPMP Linked
                          </p>
                          <p className="text-[10px] text-rose-800 dark:text-rose-300">
                            No PPMP entry or file is associated with this Purchase Request.
                          </p>
                        </div>
                      ) : null}
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between gap-2">
                      {selectedVerificationItem.uploadedPpmpDoc ? (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setPreviewDoc({
                              url: selectedVerificationItem.uploadedPpmpDoc.storageUrl,
                              title: selectedVerificationItem.uploadedPpmpDoc.originalFileName,
                              mimeType: selectedVerificationItem.uploadedPpmpDoc.mimeType,
                            })}
                            className="h-7 text-[11px] gap-1 px-2 text-slate-700 dark:text-slate-300"
                          >
                            <Eye className="h-3 w-3" /> Preview
                          </Button>
                          <a
                            href={selectedVerificationItem.uploadedPpmpDoc.storageUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#881337] hover:underline dark:text-rose-400"
                          >
                            <ExternalLink className="h-3 w-3" /> Open File
                          </a>
                        </>
                      ) : selectedVerificationItem.linkedPpmp ? (
                        <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">
                          ✓ Database Allotment Verified
                        </span>
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const preset = RETURN_REASON_PRESETS.find((p) => p.label.includes("PPMP"));
                            if (preset) {
                              setReturnReason(preset.reason);
                              setReturnRemarks(preset.remarks);
                            }
                            setReturnModalOpen(true);
                          }}
                          className="h-7 text-[10px] text-rose-800 dark:text-rose-300 hover:bg-rose-100/60 w-full"
                        >
                          <Undo2 className="mr-1 h-3 w-3" /> Flag PPMP Mismatch
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Card 3: Pre-Canvass Attachment & Preliminary Quotes */}
                  <div className={`rounded-lg border p-3.5 flex flex-col justify-between ${
                    selectedVerificationItem.preCanvassDoc || (selectedVerificationItem.linkedQuotes?.length ?? 0) >= 3
                      ? "border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/50 dark:bg-emerald-950/20"
                      : "border-indigo-200 bg-indigo-50/40 dark:border-indigo-900/50 dark:bg-indigo-950/20"
                  }`}>
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="font-bold text-xs flex items-center gap-1.5 text-slate-900 dark:text-white">
                          <FileText className={`h-4 w-4 ${selectedVerificationItem.preCanvassDoc ? "text-indigo-600 dark:text-indigo-400" : "text-amber-600 dark:text-amber-400"}`} />
                          Pre-Canvass &amp; 3 Quotes
                        </span>
                        {selectedVerificationItem.preCanvassDoc ? (
                          <Badge variant="outline" className="border-indigo-300 bg-indigo-100 text-indigo-800 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 text-[10px]">
                            AOQ Attached
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 text-[10px]">
                            {(selectedVerificationItem.linkedQuotes?.length ?? 0)} Quotes
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
                        Mandatory preliminary supplier price canvass establishing market quotation benchmarks.
                      </p>

                      {selectedVerificationItem.preCanvassDoc ? (
                        <div className="rounded-md border border-slate-200/80 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-900 text-xs space-y-1 mb-2">
                          <div className="font-semibold text-slate-800 dark:text-slate-200 truncate" title={selectedVerificationItem.preCanvassDoc.originalFileName}>
                            {selectedVerificationItem.preCanvassDoc.originalFileName}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500">
                            <span>{formatFileSize(selectedVerificationItem.preCanvassDoc.fileSize)}</span>
                            <span>·</span>
                            <span>{new Date(selectedVerificationItem.preCanvassDoc.createdAt).toLocaleDateString("en-PH")}</span>
                          </div>
                        </div>
                      ) : null}

                      {selectedVerificationItem.linkedPreCanvass ? (
                        <div className="rounded-md border border-slate-200/80 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-900 text-[11px] space-y-1">
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="font-mono text-indigo-700 dark:text-indigo-400 font-semibold">{selectedVerificationItem.linkedPreCanvass.preCanvassNumber}</span>
                            <span className="text-slate-500">Status: {selectedVerificationItem.linkedPreCanvass.status.replaceAll("_", " ")}</span>
                          </div>
                          <div className="flex justify-between items-center text-[10px] text-slate-600 dark:text-slate-300 pt-1">
                            <span>ABC Ceiling: <strong>{formatMoney(selectedVerificationItem.linkedPreCanvass.approvedBudget)}</strong></span>
                            <span>{selectedVerificationItem.linkedPreCanvass.deliveryPeriodDays || 30} days delivery</span>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-md border border-amber-300/80 bg-amber-100/50 p-2.5 text-[11px] text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200 space-y-1">
                          <p className="font-semibold flex items-center gap-1">
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                            No Pre-Canvass Record
                          </p>
                          <p className="text-[10px] text-amber-800 dark:text-amber-300">
                            End-User has not registered the 3-supplier canvass package yet.
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between gap-2">
                      {selectedVerificationItem.preCanvassDoc ? (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setPreviewDoc({
                              url: selectedVerificationItem.preCanvassDoc.storageUrl,
                              title: selectedVerificationItem.preCanvassDoc.originalFileName,
                              mimeType: selectedVerificationItem.preCanvassDoc.mimeType,
                            })}
                            className="h-7 text-[11px] gap-1 px-2 text-slate-700 dark:text-slate-300"
                          >
                            <Eye className="h-3 w-3" /> Preview
                          </Button>
                          <a
                            href={selectedVerificationItem.preCanvassDoc.storageUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#881337] hover:underline dark:text-rose-400"
                          >
                            <ExternalLink className="h-3 w-3" /> Open File
                          </a>
                        </>
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const preset = RETURN_REASON_PRESETS.find((p) => p.label.includes("Pre-Canvass"));
                            if (preset) {
                              setReturnReason(preset.reason);
                              setReturnRemarks(preset.remarks);
                            }
                            setReturnModalOpen(true);
                          }}
                          className="h-7 text-[10px] text-amber-800 dark:text-amber-300 hover:bg-amber-100/60 w-full"
                        >
                          <Undo2 className="mr-1 h-3 w-3" /> Flag Missing Pre-Canvass
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Pre-Canvass Supplier Quotes Table */}
                {selectedVerificationItem.linkedQuotes && selectedVerificationItem.linkedQuotes.length > 0 && (
                  <div className="rounded-lg border border-slate-200 bg-white overflow-hidden dark:border-slate-800 dark:bg-slate-900 mt-3">
                    <div className="bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 dark:bg-slate-800/60 dark:text-slate-200 flex justify-between items-center">
                      <span>End-User Preliminary Supplier Quotes ({selectedVerificationItem.linkedQuotes.length}/3 collected)</span>
                      <span className="text-[10px] text-slate-500">Market Sounding Prior to Official RFQ</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="border-b border-slate-200 bg-slate-50/50 dark:border-slate-800 text-[11px] text-slate-500">
                          <tr>
                            <th className="px-3 py-2">Supplier Name</th>
                            <th className="px-3 py-2">Quotation Ref</th>
                            <th className="px-3 py-2">Quoted Amount</th>
                            <th className="px-3 py-2">Delivery</th>
                            <th className="px-3 py-2">Preliminary Evaluation</th>
                            <th className="px-3 py-2">Notes</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {selectedVerificationItem.linkedQuotes.map((q: any) => (
                            <tr key={q.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                              <td className="px-3 py-2">
                                <div className="font-medium text-slate-800 dark:text-slate-200">
                                  {q.supplier?.companyName || `Supplier #${q.supplierId}`}
                                </div>
                                {q.supplier?.tin && (
                                  <div className="text-[10px] text-slate-500">TIN: {q.supplier.tin}</div>
                                )}
                              </td>
                              <td className="px-3 py-2 text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                                {q.quotationReference || "—"}
                              </td>
                              <td className="px-3 py-2 font-semibold text-slate-900 dark:text-white">
                                {formatMoney(q.totalPrice)}
                              </td>
                              <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                                {q.deliveryDays} day(s)
                              </td>
                              <td className="px-3 py-2">
                                <Badge variant="outline" className={`text-[10px] ${q.isCompliant ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-rose-300 bg-rose-50 text-rose-700"}`}>
                                  {q.isCompliant ? "Compliant" : "Non-Compliant"}
                                </Badge>
                              </td>
                              <td className="px-3 py-2 text-slate-500 text-[11px] max-w-[200px] truncate" title={q.notes || ""}>
                                {q.notes || "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Additional Supporting Attachments Table ("and etc.") */}
                {selectedVerificationItem.otherDocuments && selectedVerificationItem.otherDocuments.length > 0 && (
                  <div className="rounded-lg border border-slate-200 bg-white overflow-hidden dark:border-slate-800 dark:bg-slate-900 mt-3">
                    <div className="bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 dark:bg-slate-800/60 dark:text-slate-200 flex justify-between items-center">
                      <span>Additional Supporting Attachments ({selectedVerificationItem.otherDocuments.length} document(s))</span>
                      <span className="text-[10px] text-slate-500">Technical Specs, Letters &amp; Annexes</span>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {selectedVerificationItem.otherDocuments.map((doc: any) => (
                        <div key={doc.id} className="p-2.5 px-3 flex items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <FileText className="h-4 w-4 text-slate-500 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-slate-800 dark:text-slate-200 truncate" title={doc.originalFileName}>
                                {doc.originalFileName}
                              </p>
                              <p className="text-[10px] text-slate-500">
                                {doc.documentType} · {formatFileSize(doc.fileSize)} · {new Date(doc.createdAt).toLocaleDateString("en-PH")}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setPreviewDoc({
                                url: doc.storageUrl,
                                title: doc.originalFileName,
                                mimeType: doc.mimeType,
                              })}
                              className="h-7 text-[11px] gap-1 px-2"
                            >
                              <Eye className="h-3 w-3" /> Preview
                            </Button>
                            <a
                              href={doc.storageUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#881337] hover:underline dark:text-rose-400"
                            >
                              <ExternalLink className="h-3 w-3" /> Open
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Prior Revision History / Corrections */}
                {selectedVerificationItem.corrections && selectedVerificationItem.corrections.length > 0 && (
                  <div className="rounded-lg border border-rose-200 bg-rose-50/40 dark:border-rose-900/50 dark:bg-rose-950/20 p-3 mt-3 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-900 dark:text-rose-200">
                      <History className="h-4 w-4 text-rose-600" />
                      <span>Previous Revision &amp; Return Notes ({selectedVerificationItem.corrections.length})</span>
                    </div>
                    <div className="space-y-2">
                      {selectedVerificationItem.corrections.map((corr: any) => (
                        <div key={corr.id} className="rounded-md border border-rose-200/80 bg-white p-2.5 text-xs dark:border-rose-900/50 dark:bg-slate-900 space-y-1">
                          <div className="flex items-center justify-between text-[10px] text-slate-500">
                            <span className="font-semibold text-rose-700 dark:text-rose-400">Return Notice #{corr.id}</span>
                            <span>{new Date(corr.createdAt).toLocaleDateString("en-PH")} · Status: {corr.status}</span>
                          </div>
                          <p className="text-slate-800 dark:text-slate-200 text-xs">{corr.reason}</p>
                        </div>
                      ))}
                    </div>
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
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
                  <Undo2 className="h-4 w-4" />
                </span>
                <div>
                  <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
                    Return PR for Revision & Corrections
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    Package will be routed back to End-User with your documented reason and actionable instructions.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 pt-2 text-xs">
              {/* Quick Preset Buttons */}
              <div>
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Quick Action Presets (Common Correction Reasons):
                </Label>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {RETURN_REASON_PRESETS.map((preset) => {
                    const isSelected = returnReason === preset.reason;
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => {
                          setReturnReason(preset.reason);
                          setReturnRemarks(preset.remarks);
                        }}
                        className={`inline-flex items-center rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                          isSelected
                            ? "border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 font-semibold shadow-xs"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                        }`}
                      >
                        <Sparkles className="mr-1 h-3 w-3 text-rose-500" />
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Select Return Category / Reason:
                </Label>
                <select
                  value={returnReason}
                  onChange={(e) => {
                    const val = e.target.value;
                    setReturnReason(val);
                    const match = RETURN_REASON_PRESETS.find((p) => p.reason === val);
                    if (match && !returnRemarks) {
                      setReturnRemarks(match.remarks);
                    }
                  }}
                  className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs shadow-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  {RETURN_REASON_PRESETS.map((preset) => (
                    <option key={preset.label} value={preset.reason}>
                      {preset.label}: {preset.reason}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Specific Officer Instructions / Remarks:
                  </Label>
                  <span className="text-[10px] text-slate-400">Actionable guidance for End-User</span>
                </div>
                <Textarea
                  value={returnRemarks}
                  onChange={(e) => setReturnRemarks(e.target.value)}
                  placeholder="Enter specific instructions for the End-User (e.g. please upload the missing Market Scoping matrix or split items by category)..."
                  className="mt-1.5 text-xs min-h-[90px]"
                />
              </div>

              <div className="rounded-md border border-amber-200 bg-amber-50 p-2.5 text-[11px] text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-300">
                <span className="font-semibold">Note:</span> This will mark the PR status as <span className="font-semibold">Returned for Revision</span>, preserve your remarks in the audit trail, and dispatch an immediate notification to the End-User.
              </div>
            </div>

            <DialogFooter className="mt-3 flex items-center justify-between">
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
                <Undo2 className="mr-1.5 h-3.5 w-3.5" />
                Confirm Return for Revision
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Document In-App Preview Dialog */}
      {previewDoc && (
        <Dialog open={Boolean(previewDoc)} onOpenChange={(open) => !open && setPreviewDoc(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-4 sm:p-6">
            <DialogHeader className="flex flex-row items-center justify-between space-y-0 border-b border-slate-200 pb-3 dark:border-slate-800">
              <div className="space-y-0.5 pr-4">
                <DialogTitle className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate max-w-lg">
                  {previewDoc.title}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  {previewDoc.mimeType || "Attachment"} · Procurement Transparency Preview
                </DialogDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
                >
                  <a href={previewDoc.url} target="_blank" rel="noopener noreferrer" download>
                    <Download className="mr-1.5 h-3.5 w-3.5" />
                    Download Original
                  </a>
                </Button>
              </div>
            </DialogHeader>

            <div className="my-2 flex-1 overflow-auto rounded-md bg-slate-50 p-2 dark:bg-slate-950/60 min-h-[360px] flex items-center justify-center">
              {previewDoc.mimeType?.includes("pdf") || previewDoc.url.toLowerCase().endsWith(".pdf") ? (
                <iframe
                  src={previewDoc.url}
                  className="w-full h-[62vh] rounded border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
                  title={previewDoc.title}
                />
              ) : previewDoc.mimeType?.startsWith("image/") || /\.(png|jpe?g|webp|gif|svg)$/i.test(previewDoc.url) ? (
                <div className="flex max-h-[62vh] w-full items-center justify-center overflow-auto p-2">
                  <img
                    src={previewDoc.url}
                    alt={previewDoc.title}
                    className="max-h-[58vh] max-w-full rounded object-contain shadow-sm"
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-8 text-center bg-white dark:bg-slate-900 rounded-lg border border-dashed border-slate-300 dark:border-slate-800 max-w-md my-auto">
                  <div className="rounded-full bg-emerald-50 p-3 dark:bg-emerald-950/50 text-emerald-600 mb-3">
                    <FileSpreadsheet className="h-8 w-8" />
                  </div>
                  <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{previewDoc.title}</h4>
                  <p className="text-xs text-slate-500 mt-1 mb-4">
                    In-browser inline rendering is not supported for this format ({previewDoc.mimeType || "document/spreadsheet"}). Click below to download or view with your local application.
                  </p>
                  <Button asChild size="sm" className="bg-[#881337] hover:bg-[#70102e] text-white text-xs">
                    <a href={previewDoc.url} target="_blank" rel="noopener noreferrer" download>
                      <Download className="mr-1.5 h-3.5 w-3.5" /> Download / Open Document
                    </a>
                  </Button>
                </div>
              )}
            </div>

            <DialogFooter className="border-t border-slate-200 pt-3 dark:border-slate-800 flex items-center justify-between sm:justify-between">
              <span className="text-[11px] text-slate-400">
                ProcureWise Document Viewer · End-User Transparency
              </span>
              <Button size="sm" variant="outline" onClick={() => setPreviewDoc(null)} className="text-xs">
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
