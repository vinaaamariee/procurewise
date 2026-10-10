import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSupabaseRealtime } from "@/hooks/useSupabaseRealtime";
import { trpc } from "@/lib/trpc";
import { normalizeProcurementRole } from "../../../shared/procurementRules";
import {
  AlertCircle,
  BookOpenCheck,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  LoaderCircle,
  QrCode,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export function PmrRegistryPage() {
  const { user } = useAuth();
  const role = user ? normalizeProcurementRole(user.role) : "end_user";
  const isOfficerOrAdmin = role === "procurement_officer" || role === "admin";
  const isStaffOrOfficer = role === "procurement_staff" || role === "procurement_officer" || role === "admin";

  const [activeTab, setActiveTab] = useState<"pending" | "register">("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFiscalYear, setSelectedFiscalYear] = useState<number>(new Date().getFullYear());

  // Dialog states
  const [selectedPrId, setSelectedPrId] = useState<number | null>(null);
  const [recordPmrPr, setRecordPmrPr] = useState<{ id: number; prNumber: string; purpose: string; isVerified: boolean } | null>(null);
  const [pmrReferenceInput, setPmrReferenceInput] = useState("");
  const [pmrRemarksInput, setPmrRemarksInput] = useState("");
  const [trackingSlipPr, setTrackingSlipPr] = useState<{ id: number; prNumber: string; trackingToken: string; purpose: string; totalEstimate: string; createdAt: Date | string } | null>(null);
  const pmrRegisterRef = useRef<HTMLDivElement>(null);
  const recentRecordedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeTab !== "register") return;
    (recentRecordedRef.current ?? pmrRegisterRef.current)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [activeTab]);

  const utils = trpc.useUtils();
  const prsQuery = trpc.procurement.purchaseRequests.list.useQuery(undefined, { retry: false });
  const setupQuery = trpc.procurement.setup.details.useQuery(undefined, { retry: false });
  const pmrAuditsQuery = trpc.procurement.audit.list.useQuery({ action: "recorded_to_pmr", limit: 500 }, { retry: false });

  const prDetailQuery = trpc.procurement.purchaseRequests.detail.useQuery(
    { purchaseRequestId: selectedPrId! },
    { enabled: Boolean(selectedPrId), retry: false }
  );

  const pmrListQuery = trpc.procurement.historicalPmr.list.useQuery(
    { fiscalYear: selectedFiscalYear },
    { retry: false }
  );

  const pmrSummaryQuery = trpc.procurement.historicalPmr.summary.useQuery(
    { fiscalYear: selectedFiscalYear },
    { retry: false }
  );

  useSupabaseRealtime({
    recordTypes: ["purchase_request"],
    onRecordChanged: () => {
      void utils.procurement.purchaseRequests.list.invalidate();
      void utils.procurement.audit.list.invalidate({ action: "recorded_to_pmr" });
    },
  });

  const verifyMutation = trpc.procurement.purchaseRequests.verifyPackage.useMutation({
    onSuccess: (data) => {
      toast.success(`Purchase Request ${data.prNumber} verified by Procurement Officer.`);
      void utils.procurement.purchaseRequests.list.invalidate();
      if (selectedPrId) void utils.procurement.purchaseRequests.detail.invalidate({ purchaseRequestId: selectedPrId });
    },
    onError: (err) => toast.error(err.message),
  });

  const recordPmrMutation = trpc.procurement.purchaseRequests.recordPmr.useMutation({
    onSuccess: (data) => {
      toast.success(`Purchase Request ${data.prNumber} recorded into PMR registry (${data.pmrReference}).`);
      setRecordPmrPr(null);
      setPmrReferenceInput("");
      setPmrRemarksInput("");
      setActiveTab("register");
      void utils.procurement.purchaseRequests.list.invalidate();
      void utils.procurement.audit.list.invalidate({ action: "recorded_to_pmr" });
      void utils.procurement.historicalPmr.list.invalidate();
      void utils.procurement.historicalPmr.summary.invalidate();
      if (selectedPrId) void utils.procurement.purchaseRequests.detail.invalidate({ purchaseRequestId: selectedPrId });
    },
    onError: (err) => toast.error(err.message),
  });

  const officeMap = new Map((setupQuery.data?.offices ?? []).map((o) => [o.id, o]));
  const recordedPrIds = new Set((pmrAuditsQuery.data?.items ?? []).map((a) => a.entityId).filter(Boolean));
  const prList = prsQuery.data ?? [];

  // Filter PRs for Pending PMR Recording tab
  const filteredPrs = prList.filter((pr) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const officeName = officeMap.get(pr.officeId)?.name.toLowerCase() || "";
    return pr.prNumber.toLowerCase().includes(q) || pr.purpose.toLowerCase().includes(q) || officeName.includes(q);
  });

  const pendingRecording = filteredPrs.filter((pr) => !recordedPrIds.has(pr.id) && pr.status !== "pmr_logged" && pr.status !== "closed");
  const alreadyRecorded = filteredPrs.filter((pr) => recordedPrIds.has(pr.id) || pr.status === "pmr_logged" || pr.status === "closed");
  const recordedPmrEntries = (pmrAuditsQuery.data?.items ?? []).flatMap((audit) => {
    const details = audit.details && typeof audit.details === "object"
      ? audit.details as Record<string, unknown>
      : {};
    const recordedAt = typeof details.recordedAt === "string"
      ? new Date(details.recordedAt)
      : audit.createdAt;
    if (recordedAt.getFullYear() !== selectedFiscalYear) return [];

    const purchaseRequest = prList.find((pr) => pr.id === audit.entityId);
    const pmrReference = typeof details.pmrReference === "string" && details.pmrReference
      ? details.pmrReference
      : `PMR-${recordedAt.getFullYear()}-${String(audit.entityId).padStart(5, "0")}`;
    return [{ audit, details, recordedAt, purchaseRequest, pmrReference }];
  }).sort((left, right) => right.recordedAt.getTime() - left.recordedAt.getTime());

  const formatCurrency = (amount: number | string | null | undefined) => {
    const val = Number(amount || 0);
    return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(val);
  };

  const copyToClipboard = (text: string, label = "Tracking Token") => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard.`);
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-400">
            <BookOpenCheck className="h-4 w-4" />
            Procedure 5.2 — Procurement Monitoring
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            PMR Registry &amp; Recording
          </h1>
          <p className="mt-1 text-sm text-muted-foreground max-w-3xl">
            Record verified Purchase Requests into the official Procurement Monitoring Report (PMR).
            Recording is strictly permitted <span className="font-semibold text-foreground">only after</span> the Procurement Officer has received and verified the PR &amp; PPMP.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void utils.procurement.purchaseRequests.list.invalidate();
              void utils.procurement.audit.list.invalidate({ action: "recorded_to_pmr" });
              void utils.procurement.historicalPmr.list.invalidate();
              void utils.procurement.historicalPmr.summary.invalidate();
            }}
            className="gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-3 border-b border-border">
        <button
          onClick={() => setActiveTab("pending")}
          className={`relative pb-3 text-sm font-medium transition-colors ${
            activeTab === "pending"
              ? "text-rose-700 dark:text-rose-400 font-semibold border-b-2 border-rose-700 dark:border-rose-400 -mb-px"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            PR Recording Queue ({pendingRecording.length})
          </span>
        </button>
        <button
          onClick={() => setActiveTab("register")}
          className={`relative pb-3 text-sm font-medium transition-colors ${
            activeTab === "register"
              ? "text-rose-700 dark:text-rose-400 font-semibold border-b-2 border-rose-700 dark:border-rose-400 -mb-px"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Official PMR Register
          </span>
        </button>
      </div>

      {activeTab === "pending" && (
        <div className="space-y-6">
          {/* Quick Metrics Bar */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Pending PMR Recording</span>
                <Clock className="h-4 w-4 text-amber-500" />
              </div>
              <p className="mt-2 text-2xl font-bold text-foreground">{pendingRecording.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Awaiting PMR registry logging</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Officer Verified</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              </div>
              <p className="mt-2 text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                {pendingRecording.filter((p) => Boolean(p.procurementReviewedById)).length}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Ready for PMR recording</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Awaiting Officer Verification</span>
                <ShieldAlert className="h-4 w-4 text-rose-500" />
              </div>
              <p className="mt-2 text-2xl font-bold text-rose-700 dark:text-rose-400">
                {pendingRecording.filter((p) => !p.procurementReviewedById).length}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Officer must verify PR &amp; PPMP first</p>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab("register")}
              aria-label={`View ${alreadyRecorded.length} recorded PMR entries`}
              className="w-full rounded-xl border border-border bg-card p-4 text-left shadow-sm transition-colors hover:border-blue-500/50 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Recorded to PMR</span>
                <FileCheck2 className="h-4 w-4 text-blue-500" />
              </div>
              <p className="mt-2 text-2xl font-bold text-foreground">{alreadyRecorded.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Active logged records</p>
            </button>
          </div>

          {/* Search bar */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by PR number, purpose, or office..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </div>

          {/* PR Queue Table */}
          <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3.5 font-semibold">PR Number &amp; Purpose</th>
                    <th className="px-4 py-3.5 font-semibold">Requesting Office</th>
                    <th className="px-4 py-3.5 font-semibold">Approved Budget (ABC)</th>
                    <th className="px-4 py-3.5 font-semibold">Officer Verification</th>
                    <th className="px-4 py-3.5 font-semibold">PMR Status</th>
                    <th className="px-4 py-3.5 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {prsQuery.isLoading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-muted-foreground">
                        <LoaderCircle className="mx-auto h-6 w-6 animate-spin" />
                        <span className="mt-2 block text-xs">Loading purchase requests...</span>
                      </td>
                    </tr>
                  ) : pendingRecording.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-muted-foreground">
                        <FileText className="mx-auto h-8 w-8 text-muted-foreground/50" />
                        <p className="mt-2 text-sm font-medium">No purchase requests pending PMR recording</p>
                        <p className="text-xs text-muted-foreground">All active PRs have either been logged or none match your search criteria.</p>
                      </td>
                    </tr>
                  ) : (
                    pendingRecording.map((pr) => {
                      const isVerified = Boolean(pr.procurementReviewedById) || !["draft", "submitted", "procurement_review"].includes(pr.status);
                      const office = officeMap.get(pr.officeId);

                      return (
                        <tr key={pr.id} className="hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3.5">
                            <div className="font-semibold text-rose-700 dark:text-rose-400 font-mono">
                              {pr.prNumber}
                            </div>
                            <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                              {pr.purpose}
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-xs text-muted-foreground">
                            {office ? `${office.code} - ${office.name}` : `Office #${pr.officeId}`}
                          </td>
                          <td className="px-4 py-3.5 font-medium text-foreground">
                            {formatCurrency(pr.totalEstimate)}
                          </td>
                          <td className="px-4 py-3.5">
                            {isVerified ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Verified by Officer
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                                <Clock className="h-3.5 w-3.5" />
                                Officer Pending
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                              Unrecorded
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => setSelectedPrId(pr.id)}
                              >
                                View PR &amp; PPMP
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1"
                                onClick={() =>
                                  setTrackingSlipPr({
                                    id: pr.id,
                                    prNumber: pr.prNumber,
                                    trackingToken: pr.trackingToken,
                                    purpose: pr.purpose,
                                    totalEstimate: pr.totalEstimate,
                                    createdAt: pr.createdAt,
                                  })
                                }
                              >
                                <QrCode className="h-3 w-3" />
                                Tracking Slip
                              </Button>

                              {isStaffOrOfficer && (
                                <Button
                                  size="sm"
                                  disabled={!isVerified}
                                  onClick={() =>
                                    setRecordPmrPr({
                                      id: pr.id,
                                      prNumber: pr.prNumber,
                                      purpose: pr.purpose,
                                      isVerified,
                                    })
                                  }
                                  className={`h-7 text-xs ${
                                    isVerified
                                      ? "bg-rose-700 hover:bg-rose-800 text-white"
                                      : "bg-muted text-muted-foreground cursor-not-allowed"
                                  }`}
                                  title={!isVerified ? "Officer verification required before recording to PMR" : "Record PR to PMR"}
                                >
                                  Record to PMR
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === "register" && (
        <div ref={pmrRegisterRef} id="official-pmr-register" className="scroll-mt-4 space-y-6">
          {/* Summary KPIs */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <span className="text-xs font-medium text-muted-foreground">Total PMR Transactions</span>
              <p className="mt-2 text-2xl font-bold text-foreground">
                {pmrSummaryQuery.data?.records ?? 0}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">FY {selectedFiscalYear}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <span className="text-xs font-medium text-muted-foreground">Total Approved Budget (ABC)</span>
              <p className="mt-2 text-2xl font-bold text-foreground">
                {formatCurrency(pmrSummaryQuery.data?.estimatedTotal ?? 0)}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Programmed allocation</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <span className="text-xs font-medium text-muted-foreground">Total Contract Cost</span>
              <p className="mt-2 text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                {formatCurrency(pmrSummaryQuery.data?.actualTotal ?? 0)}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Awarded procurements</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <span className="text-xs font-medium text-muted-foreground">Total Savings</span>
              <p className="mt-2 text-2xl font-bold text-rose-700 dark:text-rose-400">
                {formatCurrency(
                  Math.max(0, (pmrSummaryQuery.data?.estimatedTotal ?? 0) - (pmrSummaryQuery.data?.actualTotal ?? 0))
                )}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Fiscal efficiency</p>
            </div>
          </div>

          {recordedPmrEntries.length > 0 && (
            <div ref={recentRecordedRef} className="scroll-mt-4 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              <div className="border-b border-border p-4">
                <h3 className="font-semibold text-foreground">Recently Recorded Purchase Requests</h3>
                <p className="text-xs text-muted-foreground">
                  PMR entries created from the recording queue for FY {selectedFiscalYear}.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-border bg-muted/40 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-semibold">PMR Reference</th>
                      <th className="px-4 py-3 font-semibold">Purchase Request</th>
                      <th className="px-4 py-3 font-semibold">Requesting Office</th>
                      <th className="px-4 py-3 font-semibold">ABC</th>
                      <th className="px-4 py-3 font-semibold">Recorded</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {recordedPmrEntries.map((entry) => (
                      <tr key={entry.audit.id} className="hover:bg-muted/20">
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-rose-700 dark:text-rose-400">
                          {entry.pmrReference}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-foreground">{entry.purchaseRequest?.prNumber ?? String(entry.details.prNumber ?? `PR #${entry.audit.entityId}`)}</div>
                          <div className="max-w-md text-xs text-muted-foreground">{entry.purchaseRequest?.purpose ?? "Purchase Request"}</div>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {entry.purchaseRequest ? officeMap.get(entry.purchaseRequest.officeId)?.name ?? "—" : "—"}
                        </td>
                        <td className="px-4 py-3 text-xs font-medium text-foreground">
                          {formatCurrency(entry.purchaseRequest?.totalEstimate)}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {entry.recordedAt.toLocaleDateString("en-PH")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Historical Register Table */}
          <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
            <div className="p-4 border-b border-border flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-semibold text-foreground">Official PMR Transactions</h3>
                <p className="text-xs text-muted-foreground">
                  Official Procurement Monitoring Report registry entries compliant with GPPB Form standards.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs font-medium text-muted-foreground">Fiscal Year:</Label>
                <select
                  value={selectedFiscalYear}
                  onChange={(e) => setSelectedFiscalYear(Number(e.target.value))}
                  className="h-8 rounded-md border border-input bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-rose-500"
                >
                  {[2026, 2025, 2024, 2023].map((yr) => (
                    <option key={yr} value={yr}>
                      FY {yr}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3.5 font-semibold">PMR Code</th>
                    <th className="px-4 py-3.5 font-semibold">Project Title / PR Reference</th>
                    <th className="px-4 py-3.5 font-semibold">End-User / Office</th>
                    <th className="px-4 py-3.5 font-semibold">Mode of Procurement</th>
                    <th className="px-4 py-3.5 font-semibold">Total ABC</th>
                    <th className="px-4 py-3.5 font-semibold">Contract Cost</th>
                    <th className="px-4 py-3.5 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {pmrListQuery.isLoading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-muted-foreground">
                        <LoaderCircle className="mx-auto h-6 w-6 animate-spin" />
                        <span className="mt-2 block text-xs">Loading PMR records...</span>
                      </td>
                    </tr>
                  ) : !pmrListQuery.data || pmrListQuery.data.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-muted-foreground">
                        <FileSpreadsheet className="mx-auto h-8 w-8 text-muted-foreground/50" />
                        <p className="mt-2 text-sm font-medium">No PMR records found for FY {selectedFiscalYear}</p>
                        <p className="text-xs text-muted-foreground">Record verified PRs from the queue above to populate this register.</p>
                      </td>
                    </tr>
                  ) : (
                    pmrListQuery.data.map((rec) => (
                      <tr key={rec.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3.5 font-mono text-xs font-semibold text-rose-700 dark:text-rose-400">
                          {rec.recordKey || `PMR-${rec.id}`}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="font-medium text-foreground text-xs">{rec.item || rec.purpose || rec.prNumber}</div>
                          {rec.prNumber && (
                            <div className="text-[11px] font-mono text-muted-foreground mt-0.5">
                              Ref: {rec.prNumber}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-muted-foreground">
                          {rec.office || rec.endUser || "—"}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-muted-foreground">
                          {rec.modality || "Small Value Procurement (Sec. 53.9)"}
                        </td>
                        <td className="px-4 py-3.5 font-medium text-xs text-foreground">
                          {formatCurrency(rec.estimatedTotal)}
                        </td>
                        <td className="px-4 py-3.5 font-medium text-xs text-emerald-700 dark:text-emerald-400">
                          {formatCurrency(rec.total)}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:text-slate-300">
                            {rec.status || "Recorded"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* View PR & PPMP Detail Dialog */}
      <Dialog open={Boolean(selectedPrId)} onOpenChange={(open) => !open && setSelectedPrId(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-700 dark:text-rose-400">
              <FileText className="h-5 w-5" />
              Purchase Request &amp; PPMP Package Details
            </DialogTitle>
            <DialogDescription>
              Inspect the verified documents, procurement tracking tokens, and line items.
            </DialogDescription>
          </DialogHeader>

          {prDetailQuery.isLoading ? (
            <div className="py-12 text-center text-muted-foreground">
              <LoaderCircle className="mx-auto h-6 w-6 animate-spin" />
              <span className="mt-2 block text-xs">Loading package details...</span>
            </div>
          ) : prDetailQuery.data ? (
            <div className="space-y-5 text-sm">
              {/* Status & Verification Alert */}
              {Boolean(prDetailQuery.data.purchaseRequest.procurementReviewedById) ? (
                <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50/70 p-3.5 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
                  <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-xs">Procurement Officer Verified</h4>
                    <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-0.5">
                      This PR and linked PPMP have been received and verified by the Procurement Officer.
                      Procurement Staff may proceed with PMR recording and RFQ canvass preparation.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50/70 p-3.5 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                  <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-xs">Procurement Officer Verification Required</h4>
                    <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
                      Recording PR to PMR is strictly forbidden until the Procurement Officer reviews and verifies this PR &amp; PPMP package.
                    </p>
                  </div>
                </div>
              )}

              {/* PR Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 rounded-lg border border-border bg-muted/20 p-3 text-xs">
                <div>
                  <span className="text-muted-foreground block font-medium">PR Number</span>
                  <span className="font-semibold font-mono text-foreground text-sm">
                    {prDetailQuery.data.purchaseRequest.prNumber}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block font-medium">Approved Budget (ABC)</span>
                  <span className="font-semibold text-foreground text-sm">
                    {formatCurrency(prDetailQuery.data.purchaseRequest.totalEstimate)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block font-medium">Linked PPMP Entry</span>
                  <span className="font-semibold text-foreground">
                    {prDetailQuery.data.purchaseRequest.ppmpEntryId
                      ? `PPMP #${prDetailQuery.data.purchaseRequest.ppmpEntryId}`
                      : "Unlinked / Direct"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block font-medium">Fund Cluster</span>
                  <span className="text-foreground">
                    {prDetailQuery.data.purchaseRequest.fundCluster || "01101101 (Regular Agency Fund)"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block font-medium">Status</span>
                  <span className="text-foreground font-semibold">
                    {prDetailQuery.data.purchaseRequest.status.replaceAll("_", " ").toUpperCase()}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block font-medium">Officer Review</span>
                  <span className="text-foreground font-mono">
                    {prDetailQuery.data.purchaseRequest.procurementReviewedById ? "Verified" : "Pending"}
                  </span>
                </div>
              </div>

              {/* Purpose */}
              <div>
                <Label className="text-xs font-semibold text-muted-foreground uppercase">Purpose</Label>
                <p className="mt-1 rounded-md border border-border bg-card p-2.5 text-xs text-foreground">
                  {prDetailQuery.data.purchaseRequest.purpose}
                </p>
              </div>

              {/* Line Items */}
              <div>
                <Label className="text-xs font-semibold text-muted-foreground uppercase">
                  Line Items ({prDetailQuery.data.items?.length || 0})
                </Label>
                <div className="mt-1.5 rounded-md border border-border overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-border bg-muted/40 text-muted-foreground">
                      <tr>
                        <th className="p-2 font-semibold">Item &amp; Specification</th>
                        <th className="p-2 font-semibold text-right">Qty</th>
                        <th className="p-2 font-semibold text-right">Est. Unit Cost</th>
                        <th className="p-2 font-semibold text-right">Total Est. Cost</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {(prDetailQuery.data.items || []).map((item: any, idx: number) => (
                        <tr key={idx}>
                          <td className="p-2">
                            <span className="font-medium text-foreground">{item.description}</span>
                            {item.specification && (
                              <span className="block text-[11px] text-muted-foreground">{item.specification}</span>
                            )}
                          </td>
                          <td className="p-2 text-right">
                            {item.quantity} {item.unit}
                          </td>
                          <td className="p-2 text-right">{formatCurrency(item.estimatedUnitCost)}</td>
                          <td className="p-2 text-right font-medium">
                            {formatCurrency(Number(item.quantity) * Number(item.estimatedUnitCost))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Procurement Tracking Slip Snippet */}
              <div className="rounded-lg border border-border bg-card p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <QrCode className="h-4 w-4 text-rose-600" />
                    Official Procurement Tracking Token
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-[11px] gap-1 text-muted-foreground hover:text-foreground"
                    onClick={() =>
                      copyToClipboard(prDetailQuery.data.purchaseRequest.trackingToken, "Tracking Token")
                    }
                  >
                    <Copy className="h-3 w-3" />
                    Copy Token
                  </Button>
                </div>
                <p className="mt-1 font-mono text-xs text-muted-foreground break-all bg-muted/40 p-1.5 rounded">
                  {prDetailQuery.data.purchaseRequest.trackingToken}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Unable to load details.</p>
          )}

          <DialogFooter className="flex flex-row items-center justify-between sm:justify-between pt-3 border-t border-border">
            <Button variant="outline" size="sm" onClick={() => setSelectedPrId(null)}>
              Close
            </Button>
            <div className="flex items-center gap-2">
              {isOfficerOrAdmin && prDetailQuery.data && !prDetailQuery.data.purchaseRequest.procurementReviewedById && (
                <Button
                  size="sm"
                  disabled={verifyMutation.isPending}
                  onClick={() => verifyMutation.mutate({ purchaseRequestId: prDetailQuery.data.purchaseRequest.id })}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white gap-1.5"
                >
                  {verifyMutation.isPending && <LoaderCircle className="h-3.5 w-3.5 animate-spin" />}
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Verify PR &amp; PPMP
                </Button>
              )}

              {isStaffOrOfficer && prDetailQuery.data && (
                <Button
                  size="sm"
                  disabled={!prDetailQuery.data.purchaseRequest.procurementReviewedById}
                  onClick={() => {
                    const pr = prDetailQuery.data.purchaseRequest;
                    setSelectedPrId(null);
                    setRecordPmrPr({
                      id: pr.id,
                      prNumber: pr.prNumber,
                      purpose: pr.purpose,
                      isVerified: Boolean(pr.procurementReviewedById),
                    });
                  }}
                  className="bg-rose-700 hover:bg-rose-800 text-white"
                >
                  Record to PMR
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record to PMR Dialog */}
      <Dialog open={Boolean(recordPmrPr)} onOpenChange={(open) => !open && setRecordPmrPr(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-700 dark:text-rose-400">
              <BookOpenCheck className="h-5 w-5" />
              Record PR to PMR (Procedure 5.2)
            </DialogTitle>
            <DialogDescription>
              Assign the official PMR reference number to record this verified PR into the institutional PMR registry.
            </DialogDescription>
          </DialogHeader>

          {recordPmrPr && (
            <div className="space-y-4 text-sm">
              <div className="rounded-lg border border-border bg-muted/20 p-3">
                <span className="text-xs text-muted-foreground block font-medium">Purchase Request</span>
                <span className="font-semibold font-mono text-foreground">{recordPmrPr.prNumber}</span>
                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{recordPmrPr.purpose}</p>
              </div>

              <div>
                <Label htmlFor="pmr-ref" className="text-xs font-semibold">
                  PMR Reference Number
                </Label>
                <Input
                  id="pmr-ref"
                  placeholder={`PMR-${new Date().getFullYear()}-${recordPmrPr.id.toString().padStart(4, "0")}`}
                  value={pmrReferenceInput}
                  onChange={(e) => setPmrReferenceInput(e.target.value)}
                  className="mt-1 font-mono text-sm"
                />
                <span className="text-[11px] text-muted-foreground mt-1 block">
                  Leave blank to automatically generate standard institutional code.
                </span>
              </div>

              <div>
                <Label htmlFor="pmr-remarks" className="text-xs font-semibold">
                  Registry Remarks (Optional)
                </Label>
                <Textarea
                  id="pmr-remarks"
                  placeholder="e.g., Recorded into PMR FY2026 Batch 1 after Officer verification."
                  value={pmrRemarksInput}
                  onChange={(e) => setPmrRemarksInput(e.target.value)}
                  className="mt-1 text-xs"
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button variant="outline" size="sm" onClick={() => setRecordPmrPr(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={recordPmrMutation.isPending || !recordPmrPr?.isVerified}
              onClick={() => {
                if (!recordPmrPr) return;
                recordPmrMutation.mutate({
                  purchaseRequestId: recordPmrPr.id,
                  pmrReferenceNumber: pmrReferenceInput.trim() || undefined,
                  remarks: pmrRemarksInput.trim() || undefined,
                });
              }}
              className="bg-rose-700 hover:bg-rose-800 text-white gap-1.5"
            >
              {recordPmrMutation.isPending && <LoaderCircle className="h-3.5 w-3.5 animate-spin" />}
              Confirm PMR Entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Procurement Tracking Slip Dialog */}
      <Dialog open={Boolean(trackingSlipPr)} onOpenChange={(open) => !open && setTrackingSlipPr(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-700 dark:text-rose-400">
              <QrCode className="h-5 w-5" />
              Official Procurement Tracking Slip
            </DialogTitle>
            <DialogDescription>
              New Government Procurement Act (RA 12009) official routing &amp; tracking slip.
            </DialogDescription>
          </DialogHeader>

          {trackingSlipPr && (
            <div className="space-y-4">
              <div className="rounded-xl border-2 border-dashed border-rose-300 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/20 p-5 text-center">
                <div className="text-xs font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-400">
                  Republic of the Philippines
                </div>
                <div className="text-sm font-bold text-foreground mt-0.5">
                  Procurement Tracking Slip
                </div>
                <div className="text-xs text-muted-foreground mt-1 font-mono">
                  {trackingSlipPr.prNumber}
                </div>

                <div className="my-4 flex justify-center">
                  <div className="rounded-lg bg-white p-3 shadow-inner border border-slate-200">
                    {/* Always black-on-white (even in dark mode) so phone cameras can read it; marginSize keeps the quiet zone when printed. */}
                    <QRCodeSVG
                      value={`${window.location.origin}/track?token=${encodeURIComponent(trackingSlipPr.trackingToken)}`}
                      size={128}
                      level="M"
                      marginSize={2}
                      bgColor="#ffffff"
                      fgColor="#000000"
                      role="img"
                      aria-label={`QR code: scan to check the progress of ${trackingSlipPr.prNumber}`}
                    />
                  </div>
                </div>

                <div className="rounded-md bg-background/80 border border-border p-2.5">
                  <span className="text-[11px] text-muted-foreground block font-medium">Tracking Token</span>
                  <span className="font-mono text-xs font-bold text-foreground break-all select-all">
                    {trackingSlipPr.trackingToken}
                  </span>
                </div>
              </div>

              <div className="text-xs text-muted-foreground space-y-1 bg-muted/30 p-3 rounded-lg">
                <div className="flex justify-between">
                  <span className="font-medium">Total Amount:</span>
                  <span className="font-semibold text-foreground">{formatCurrency(trackingSlipPr.totalEstimate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Purpose:</span>
                  <span className="text-foreground line-clamp-1">{trackingSlipPr.purpose}</span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex flex-row items-center justify-between sm:justify-between pt-2">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => {
                if (trackingSlipPr) {
                  copyToClipboard(
                    `${window.location.origin}/track?token=${trackingSlipPr.trackingToken}`,
                    "Public tracking link"
                  );
                }
              }}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Copy Track URL
            </Button>
            <Button
              size="sm"
              className="bg-rose-700 hover:bg-rose-800 text-white gap-1.5"
              onClick={() => {
                if (trackingSlipPr) copyToClipboard(trackingSlipPr.trackingToken, "Tracking Token");
              }}
            >
              <Copy className="h-3.5 w-3.5" />
              Copy Token
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
