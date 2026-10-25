import { useAuth } from "@/_core/hooks/useAuth";
import { EmptyWorkspace } from "@/components/EmptyWorkspace";
import { PageHeader } from "@/components/PageHeader";
import { RecordTable, RecordTableHeader } from "@/components/RecordTable";
import { StatusBadge } from "@/components/StatusBadge";
import { getWorkflowStageInfo } from "@/components/WorkflowTimeline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import {
  getEmployeePrStatus,
  normalizeProcurementRole,
} from "../../../shared/procurementRules";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Award,
  Ban,
  BellRing,
  BookOpenCheck,
  Check,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  Clock,
  Copy,
  ExternalLink,
  Eye,
  FileCheck2,
  FileEdit,
  FileSpreadsheet,
  FileText,
  Info,
  Layers,
  PartyPopper,
  Plus,
  RotateCcw,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Timer,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";

type PrFilterCategory = "all" | "active" | "returned" | "successful" | "rejected";

function formatMoney(amount: number | string | null | undefined) {
  const numeric = typeof amount === "number" ? amount : Number(amount ?? 0);
  return `₱${numeric.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function getEndUserRequestStatus(status: string) {
  const endUserStatus: Record<string, { label: string; meaning: string }> = {
    draft: { label: "Draft", meaning: "You have started this request but have not submitted it." },
    procurement_review: { label: "Being reviewed", meaning: "The Procurement Office is checking your request." },
    returned: { label: "Changes requested", meaning: "Review the feedback, make the requested changes, and submit the request again." },
    approval_review: { label: "Awaiting approval", meaning: "Your request is waiting for an authorized approver." },
    budget_review: { label: "Awaiting approval", meaning: "Your request is waiting for an authorized approver." },
    supply_review: { label: "Awaiting approval", meaning: "Your request is waiting for an authorized approver." },
    bac_review: { label: "Awaiting approval", meaning: "Your request is waiting for an authorized approver." },
    approved: { label: "Approved", meaning: "Your request is approved. The purchase order or delivery may still be in progress." },
    rejected: { label: "Not approved", meaning: "Review the explanation shown here. Contact the Procurement Office if you need help." },
    cancelled: { label: "Cancelled", meaning: "This request was cancelled. Contact the Procurement Office if you have questions." },
    rfq: { label: "Supplier quotes being reviewed", meaning: "The Procurement Office is reviewing supplier quotes for your request." },
    po: { label: "Purchase order in progress", meaning: "The purchase order is being prepared or approved." },
    po_issued: { label: "Purchase order in progress", meaning: "The purchase order is being prepared or approved." },
    delivered: { label: "Delivered", meaning: "Delivery has been recorded for this request." },
    pmr_logged: { label: "Complete", meaning: "All steps for this request are complete." },
    closed: { label: "Complete", meaning: "All steps for this request are complete." },
  };

  return endUserStatus[status.toLowerCase()] ?? getEmployeePrStatus(status);
}

export default function Dashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const dashboard = trpc.procurement.dashboard.useQuery(undefined, { retry: false });
  const data = dashboard.data;

  const procurementRole = user ? normalizeProcurementRole(user.role) : "end_user";
  const isEndUser = procurementRole === "end_user";
  const isStaff = procurementRole === "procurement_staff";
  const isOfficer = procurementRole === "procurement_officer";

  // Dedicated Procurement Staff Operational Workbench
  if (isStaff) {
    return <ProcurementStaffDashboard data={data} isLoading={dashboard.isLoading} />;
  }

  // Dedicated Procurement Officer Control Center Overview
  if (isOfficer) {
    return <ProcurementOfficerDashboard />;
  }

  // If not End-User, render the Admin Control Center Overview
  if (!isEndUser) {
    return <AdminDashboard data={data} isLoading={dashboard.isLoading} userRole={procurementRole} />;
  }

  // Dedicated End-User Personal Analytics & Status Overview
  return <EndUserPersonalDashboard data={data} isLoading={dashboard.isLoading} user={user} setLocation={setLocation} />;
}

// ============================================================================
// END-USER DEDICATED PERSONAL ANALYTICS & STATUS OVERVIEW
// ============================================================================
function EndUserPersonalDashboard({
  data,
  isLoading,
  user,
  setLocation,
}: {
  data: any;
  isLoading: boolean;
  user: any;
  setLocation: (path: string) => void;
}) {
  const [selectedCategory, setSelectedCategory] = useState<PrFilterCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPrForModal, setSelectedPrForModal] = useState<any | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);

  // All PRs returned by the backend for this End-User account
  const userPrs = useMemo(() => {
    return (data?.purchaseRequests ?? []) as Array<{
      id: number;
      prNumber: string;
      purpose: string;
      totalEstimate: string;
      status: string;
      createdAt: string | Date;
      updatedAt?: string | Date;
      rejectionCount?: number;
      latestRejectionReason?: string | null;
      returnCount?: number;
      latestReturnReason?: string | null;
      trackingToken?: string;
    }>;
  }, [data?.purchaseRequests]);

  // 1. In progress: active in the procurement pipeline
  const activePrs = useMemo(() => {
    return userPrs.filter((pr) =>
      ["draft", "procurement_review", "approval_review", "budget_review", "supply_review", "bac_review", "rfq"].includes(
        pr.status
      )
    );
  }, [userPrs]);

  // 2. Needs your action: user feedback / revision required (underlying status: returned)
  const returnedPrs = useMemo(() => {
    return userPrs.filter((pr) => pr.status === "returned");
  }, [userPrs]);

  // 3. Completed: fully awarded and completed requests
  const successfulPrs = useMemo(() => {
    return userPrs.filter((pr) =>
      ["approved", "po", "po_issued", "delivered", "pmr_logged", "closed"].includes(pr.status)
    );
  }, [userPrs]);

  // 4. Unable to proceed: rejected or cancelled requests
  const rejectedPrs = useMemo(() => {
    return userPrs.filter((pr) => pr.status === "rejected" || pr.status === "cancelled");
  }, [userPrs]);

  const sortByLatest = (list: typeof userPrs) => {
    return [...list].sort(
      (a, b) =>
        new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
    );
  };

  // Filtered PR list for table view
  const filteredPrs = useMemo(() => {
    let list = userPrs;
    if (selectedCategory === "active") list = activePrs;
    else if (selectedCategory === "returned") list = returnedPrs;
    else if (selectedCategory === "successful") list = successfulPrs;
    else if (selectedCategory === "rejected") list = rejectedPrs;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (pr) =>
          pr.prNumber?.toLowerCase().includes(q) ||
          pr.purpose?.toLowerCase().includes(q) ||
          pr.status?.toLowerCase().includes(q)
      );
    }
    return sortByLatest(list);
  }, [userPrs, activePrs, returnedPrs, successfulPrs, rejectedPrs, selectedCategory, searchQuery]);

  const categoryTitles: Record<PrFilterCategory, string> = {
    all: "All requests",
    active: "In progress",
    returned: "Needs your action",
    successful: "Completed",
    rejected: "Unable to proceed",
  };

  const isFilterActive = selectedCategory !== "all" || searchQuery.trim().length > 0;

  const handleCopyTrackingToken = (token?: string) => {
    if (!token) return;
    navigator.clipboard?.writeText(token);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  return (
    <div className="content-shell pb-12">
      {/* Page Heading & Single Primary CTA */}
      <PageHeader
        eyebrow="Your workspace"
        title="Your purchase requests"
        description="Track what is happening with your requests, respond to updates, and create new requests."
        action={{
          label: "Create purchase request",
          onClick: () => setLocation("/purchase-requests?create=1"),
        }}
      />

      {/* High-priority Action Required Notice (only shown when user response is needed) */}
      {returnedPrs.length > 0 && selectedCategory !== "rejected" && selectedCategory !== "successful" && (
        <section className="mt-6" aria-label="Action required notice">
          <div className="rounded-lg border border-[#f1d28c] bg-gradient-to-r from-[#fffaf0] via-[#fffbf4] to-[#fffdf9] p-4 text-[#795010] shadow-xs dark:border-[#5a431c] dark:from-[#251b0f] dark:via-[#2a2418] dark:to-[#1a232c] dark:text-[#f4d081]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-[#faeed2] text-[#936418] dark:bg-[#3a2c16] dark:text-[#f4d081]">
                  <AlertCircle className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[#2a3442] dark:text-[#f1f5f8]">
                    {returnedPrs.length === 1
                      ? `Action needed on request ${returnedPrs[0].prNumber}`
                      : `${returnedPrs.length} requests need your action`}
                  </h2>
                  <p className="mt-0.5 text-xs text-[#5e6a78] dark:text-[#d1dae2]">
                    Review the reviewer feedback and submit your updates to continue processing.
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  if (returnedPrs.length === 1) {
                    setSelectedPrForModal(returnedPrs[0]);
                  } else {
                    setSelectedCategory("returned");
                  }
                }}
                className="h-8 shrink-0 rounded-[4px] bg-[#9a6d19] px-3.5 text-xs font-semibold text-white hover:bg-[#7e5712] shadow-xs"
              >
                <FileEdit className="mr-1.5 h-3.5 w-3.5" />
                {returnedPrs.length === 1 ? "Review feedback & edit" : "View requests needing action"}
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Contextual Notice for Unable to Proceed when filtered */}
      {selectedCategory === "rejected" && rejectedPrs.length > 0 && (
        <section className="mt-6" aria-label="Unable to proceed notice">
          <div className="rounded-lg border border-[#f3c8c8] bg-gradient-to-r from-[#fef7f7] via-[#fff9f9] to-[#ffffff] p-4 text-[#a52a2a] shadow-xs dark:border-[#5e2727] dark:from-[#2a1414] dark:via-[#2d1b1d] dark:to-[#1a232c] dark:text-[#fca5a5]">
            <div className="flex items-start gap-3">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-[#fee8e8] text-[#a52a2a] dark:bg-[#431c1c] dark:text-[#fca5a5]">
                <Ban className="h-4.5 w-4.5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#2a3442] dark:text-[#f1f5f8]">
                  {rejectedPrs.length === 1 ? "1 request unable to proceed" : `${rejectedPrs.length} requests unable to proceed`}
                </h2>
                <p className="mt-0.5 text-xs text-[#5e6a78] dark:text-[#d1dae2]">
                  These requests need further review or cannot continue. Select a request to see reviewer notes.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Contextual Notice for Completed when filtered */}
      {selectedCategory === "successful" && successfulPrs.length > 0 && (
        <section className="mt-6" aria-label="Completed notice">
          <div className="rounded-lg border border-[#b2e5cb] bg-gradient-to-r from-[#f0fbf5] via-[#f5fdf9] to-[#ffffff] p-4 text-[#136a43] shadow-xs dark:border-[#225838] dark:from-[#11291b] dark:via-[#173522] dark:to-[#1a232c] dark:text-[#86efac]">
            <div className="flex items-start gap-3">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-[#ddf7e8] text-[#136a43] dark:bg-[#1a442b] dark:text-[#86efac]">
                <CheckCircle2 className="h-4.5 w-4.5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#2a3442] dark:text-[#f1f5f8]">
                  {successfulPrs.length === 1 ? "1 successfully completed request" : `${successfulPrs.length} successfully completed requests`}
                </h2>
                <p className="mt-0.5 text-xs text-[#5e6a78] dark:text-[#d1dae2]">
                  These purchase requests have been successfully approved, ordered, or delivered.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 4 Status Summary Panels */}
      <section className="mt-6" aria-label="Request status overview">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:grid-cols-4">
          {/* 1. In progress */}
          <PersonalKpiCard
            label="In progress"
            count={activePrs.length}
            description="Requests being processed."
            tone="blue"
            icon={Clock}
            isActive={selectedCategory === "active"}
            onClick={() => setSelectedCategory(selectedCategory === "active" ? "all" : "active")}
          />

          {/* 2. Needs your action */}
          <PersonalKpiCard
            label="Needs your action"
            count={returnedPrs.length}
            description="Requests waiting for your response."
            tone="amber"
            icon={AlertCircle}
            highlightBadge={returnedPrs.length > 0 ? "ACTION NEEDED" : undefined}
            isActive={selectedCategory === "returned"}
            onClick={() => setSelectedCategory(selectedCategory === "returned" ? "all" : "returned")}
          />

          {/* 3. Completed */}
          <PersonalKpiCard
            label="Completed"
            count={successfulPrs.length}
            description="Successfully processed requests."
            tone="emerald"
            icon={CheckCircle2}
            isActive={selectedCategory === "successful"}
            onClick={() => setSelectedCategory(selectedCategory === "successful" ? "all" : "successful")}
          />

          {/* 4. Unable to proceed */}
          <PersonalKpiCard
            label="Unable to proceed"
            count={rejectedPrs.length}
            description="Requests that need further review or cannot continue."
            tone="rose"
            icon={Ban}
            isActive={selectedCategory === "rejected"}
            onClick={() => setSelectedCategory(selectedCategory === "rejected" ? "all" : "rejected")}
          />
        </div>
      </section>

      {/* Request List and Toolbar Section */}
      <section className="flat-panel mt-6" aria-label="Request list and filters">
        {/* Section Heading Row - Full width to prevent any text clipping or squishing */}
        <div className="border-b border-[#ece8df] px-5 py-4 sm:px-6 dark:border-[#384554]">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-base font-semibold text-[#2c3644] dark:text-[#f1f5f8]">
                  {categoryTitles[selectedCategory]}
                </h2>
                <span className="rounded-[4px] border border-border bg-muted/50 px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                  {filteredPrs.length} {filteredPrs.length === 1 ? "request" : "requests"}
                </span>
                {isFilterActive && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory("all");
                      setSearchQuery("");
                    }}
                    className="text-xs font-medium text-primary hover:underline ml-1"
                  >
                    Clear filter
                  </button>
                )}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {userPrs.length === 0
                  ? "All submitted purchase requests will appear here."
                  : "Select any request to see its details, progress, or feedback."}
              </p>
            </div>
          </div>
        </div>

        {/* Filter Pills and Search Toolbar — shown when there are requests in the account */}
        {userPrs.length > 0 && (
          <div className="border-b border-[#ece8df] bg-[#faf8f5]/60 px-5 py-3 sm:px-6 dark:border-[#384554] dark:bg-[#1a232c]/40">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              {/* Status Filter Pills */}
              <div
                className="flex flex-wrap items-center gap-1.5"
                role="tablist"
                aria-label="Filter requests by status"
              >
                {(
                  [
                    { id: "all", label: "All", count: userPrs.length },
                    { id: "active", label: "In progress", count: activePrs.length },
                    {
                      id: "returned",
                      label: "Needs your action",
                      count: returnedPrs.length,
                      isAction: returnedPrs.length > 0,
                    },
                    { id: "successful", label: "Completed", count: successfulPrs.length },
                    { id: "rejected", label: "Unable to proceed", count: rejectedPrs.length },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={selectedCategory === tab.id}
                    onClick={() => setSelectedCategory(tab.id)}
                    className={`inline-flex items-center gap-1.5 rounded-[4px] px-2.5 py-1 text-xs font-medium transition-all ${
                      selectedCategory === tab.id
                        ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                        : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                        selectedCategory === tab.id
                          ? "bg-primary-foreground/20 text-primary-foreground font-bold"
                          : tab.isAction
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Search Field */}
              <div className="relative w-full sm:w-72 lg:w-80 shrink-0">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by request number or name"
                  className="h-8.5 w-full pl-9 pr-8 text-xs bg-background"
                  aria-label="Search by request number or name"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                    title="Clear search"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Table Content or Contextual Empty State */}
        {isLoading ? (
          <div className="p-12 text-center text-xs text-muted-foreground">
            Loading your purchase requests...
          </div>
        ) : filteredPrs.length > 0 ? (
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-xs">
              <thead className="border-b border-border bg-muted/40 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-5 py-3">Request</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Progress</th>
                  <th className="px-4 py-3 text-right">Submitted</th>
                  <th className="px-4 py-3 text-center">Next step</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredPrs.map((pr) => {
                  const prStatusInfo = getEndUserRequestStatus(pr.status);
                  const isReturned = pr.status === "returned";
                  const isRejected = pr.status === "rejected" || pr.status === "cancelled";
                  const isSuccessful = ["approved", "po", "po_issued", "delivered", "pmr_logged", "closed"].includes(
                    pr.status
                  );
                  const workflowStageInfo = getWorkflowStageInfo(pr.status);
                  const isWorkflowComplete = ["pmr_logged", "closed"].includes(pr.status);
                  const isFinalWorkflowStage = workflowStageInfo.stageIndex === workflowStageInfo.stageCount - 1;
                  const workflowPercent = isWorkflowComplete || isFinalWorkflowStage ? 100 : workflowStageInfo.percent;
                  const workflowProgressText = isReturned
                    ? "Action needed · make changes and resubmit"
                    : isRejected
                    ? "Unable to proceed"
                    : isWorkflowComplete
                    ? "Completed"
                    : `Step ${workflowStageInfo.stageIndex + 1} of ${workflowStageInfo.stageCount}`;

                  return (
                    <tr
                      key={pr.id}
                      className="hover:bg-accent/40 transition-colors cursor-pointer"
                      onClick={() => setSelectedPrForModal(pr)}
                    >
                      {/* Column 1: Request Number & Purpose */}
                      <td className="px-5 py-3 max-w-[280px]">
                        <p className="font-semibold text-primary">{pr.prNumber}</p>
                        <p
                          className="mt-0.5 line-clamp-2 text-foreground text-xs leading-snug font-normal"
                          title={pr.purpose}
                        >
                          {pr.purpose}
                        </p>
                      </td>

                      {/* Column 2: Status */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <StatusBadge
                          tone={
                            isReturned
                              ? "pending"
                              : isRejected
                              ? "returned"
                              : isSuccessful
                              ? "approved"
                              : "active"
                          }
                        >
                          {isReturned
                            ? "NEEDS YOUR ACTION"
                            : isRejected
                            ? "UNABLE TO PROCEED"
                            : isSuccessful
                            ? "COMPLETED"
                            : "IN PROGRESS"}
                        </StatusBadge>
                        <p className="mt-1 text-[11px] text-muted-foreground">{prStatusInfo.label}</p>
                      </td>

                      {/* Column 3: Progress Bar & Plain Label */}
                      <td className="px-4 py-3 min-w-[180px]">
                        <div className="flex flex-col gap-1">
                          <div
                            role="progressbar"
                            aria-label={`${pr.prNumber}: ${workflowProgressText}`}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-valuenow={workflowPercent}
                            className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
                          >
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                isRejected
                                  ? "bg-destructive"
                                  : isReturned
                                  ? "bg-amber-500"
                                  : isSuccessful
                                  ? "bg-emerald-600"
                                  : "bg-primary"
                              }`}
                              style={{ width: `${workflowPercent}%` }}
                            />
                          </div>
                          <p
                            className={`text-[11px] font-medium leading-tight ${
                              isReturned
                                ? "text-amber-700 dark:text-amber-300 font-semibold"
                                : isRejected
                                ? "text-destructive font-semibold"
                                : isSuccessful
                                ? "text-emerald-700 dark:text-emerald-400"
                                : "text-muted-foreground"
                            }`}
                          >
                            {workflowProgressText}
                          </p>
                        </div>
                      </td>

                      {/* Column 4: Date */}
                      <td className="px-4 py-3 text-right text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(pr.createdAt).toLocaleDateString("en-PH", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>

                      {/* Column 5: Action */}
                      <td className="px-4 py-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant={isReturned ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSelectedPrForModal(pr)}
                          className={`h-7 px-2.5 text-xs font-semibold ${
                            isReturned
                              ? "bg-[#9a6d19] hover:bg-[#7e5712] text-white shadow-xs"
                              : isRejected
                              ? "border-destructive/30 text-destructive hover:bg-destructive/10"
                              : "border-border text-foreground hover:bg-accent"
                          }`}
                        >
                          {isReturned ? (
                            <>
                              <FileEdit className="mr-1 h-3.5 w-3.5" />
                              Update
                            </>
                          ) : isRejected ? (
                            <>
                              <Info className="mr-1 h-3.5 w-3.5" />
                              View reason
                            </>
                          ) : (
                            <>
                              <Eye className="mr-1 h-3.5 w-3.5" />
                              View details
                            </>
                          )}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : userPrs.length === 0 ? (
          /* Genuinely empty state */
          <div className="py-8 sm:py-10 px-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#faeed2] text-[#7b1e1e] dark:bg-[#342618] dark:text-[#f4d081]">
              <ClipboardList className="h-6 w-6" />
            </div>
            <h3 className="mt-3.5 font-display text-base sm:text-lg font-semibold text-foreground">
              No purchase requests yet
            </h3>
            <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
              When you need to purchase something, create a request to get started.
            </p>
            <Button
              onClick={() => setLocation("/purchase-requests?create=1")}
              className="mt-4 h-9 bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 shadow-xs"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Create purchase request
            </Button>
          </div>
        ) : (
          /* Filtered empty results state */
          <div className="py-10 px-6 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Search className="h-5 w-5" />
            </div>
            <h3 className="mt-3 text-sm font-semibold text-foreground">No requests found</h3>
            <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
              {searchQuery
                ? `No requests match "${searchQuery}". Check the request number or clear your search.`
                : `There are currently no requests under "${categoryTitles[selectedCategory]}".`}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedCategory("all");
                setSearchQuery("");
              }}
              className="mt-4 h-8 text-xs font-medium"
            >
              Clear filters
            </Button>
          </div>
        )}
      </section>

      {/* Individual Request Details & Progress Modal */}
      {selectedPrForModal && (
        <Dialog open={Boolean(selectedPrForModal)} onOpenChange={(open) => !open && setSelectedPrForModal(null)}>
          <DialogContent className="max-w-xl border-border bg-card p-6 shadow-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader className="border-b border-border pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <DialogTitle className="font-display text-lg font-bold text-foreground">
                    Request {selectedPrForModal.prNumber}
                  </DialogTitle>
                  <DialogDescription className="mt-1 text-xs text-muted-foreground line-clamp-2">
                    {selectedPrForModal.purpose}
                  </DialogDescription>
                </div>
                <div className="self-start sm:self-center">
                  <StatusBadge
                    tone={
                      selectedPrForModal.status === "returned"
                        ? "pending"
                        : selectedPrForModal.status === "rejected" || selectedPrForModal.status === "cancelled"
                        ? "returned"
                        : ["approved", "po", "po_issued", "delivered", "pmr_logged", "closed"].includes(
                            selectedPrForModal.status
                          )
                        ? "approved"
                        : "active"
                    }
                  >
                    {selectedPrForModal.status === "returned"
                      ? "NEEDS YOUR ACTION"
                      : selectedPrForModal.status === "rejected" || selectedPrForModal.status === "cancelled"
                      ? "UNABLE TO PROCEED"
                      : ["approved", "po", "po_issued", "delivered", "pmr_logged", "closed"].includes(
                          selectedPrForModal.status
                        )
                      ? "COMPLETED"
                      : "IN PROGRESS"}
                  </StatusBadge>
                </div>
              </div>
            </DialogHeader>

            <div className="mt-4 space-y-5 text-xs">
              {/* Plain-Language 5-Step Progress Tracker */}
              <div className="rounded-lg border border-border bg-muted/20 p-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                  Procurement Progress
                </h3>
                <RequestProgressStepper
                  status={selectedPrForModal.status}
                  latestReturnReason={selectedPrForModal.latestReturnReason}
                  latestRejectionReason={selectedPrForModal.latestRejectionReason}
                />
              </div>

              {/* Action Required Box (when changes are requested) */}
              {selectedPrForModal.status === "returned" && (
                <div className="rounded-lg border border-[#f1d28c] bg-[#fffaf0] p-4 text-[#795010] dark:border-[#5a431c] dark:bg-[#251d10] dark:text-[#f4d081]">
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <FileEdit className="h-4 w-4 text-[#9a6d19]" />
                    <span>Reviewer Feedback & Action Needed</span>
                  </div>
                  <p className="mt-2 rounded border border-[#fae5b8] bg-white p-3 text-xs italic font-medium text-[#63430f] dark:border-[#4d3615] dark:bg-[#1a140b] dark:text-[#fcd88b]">
                    &ldquo;{selectedPrForModal.latestReturnReason || "Please review the specifications and update your request."}&rdquo;
                  </p>
                  <div className="mt-3 text-[11px] leading-relaxed">
                    <p className="font-semibold">Next steps:</p>
                    <ol className="mt-1 list-decimal list-inside space-y-0.5 text-muted-foreground dark:text-[#f4d081]">
                      <li>Open this request in the Purchase Requests workspace.</li>
                      <li>Make the requested modifications to line items or attachments.</li>
                      <li>Click &ldquo;Resubmit&rdquo; to send the package back for review.</li>
                    </ol>
                  </div>
                </div>
              )}

              {/* Unable to Proceed Box (when rejected) */}
              {(selectedPrForModal.status === "rejected" || selectedPrForModal.status === "cancelled") && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-destructive">
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <Ban className="h-4 w-4" />
                    <span>Why this request could not proceed</span>
                  </div>
                  <p className="mt-2 rounded border border-destructive/20 bg-background p-3 text-xs italic font-medium text-foreground">
                    &ldquo;{selectedPrForModal.latestRejectionReason || "The request could not proceed due to budgetary or specification constraints under RA 12009 guidelines."}&rdquo;
                  </p>
                  <p className="mt-2.5 text-[11px] text-muted-foreground leading-relaxed">
                    Contact the Procurement Office if you need guidance, or create a new request with updated specifications.
                  </p>
                </div>
              )}

              {/* Request Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-lg border border-border bg-card p-3.5 text-[11px]">
                <div>
                  <span className="text-muted-foreground">Estimated total:</span>
                  <p className="mt-0.5 font-mono font-bold text-sm text-foreground">
                    {formatMoney(selectedPrForModal.totalEstimate)}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Date submitted:</span>
                  <p className="mt-0.5 font-medium text-foreground">
                    {new Date(selectedPrForModal.createdAt).toLocaleDateString("en-PH", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">Public tracking code:</span>
                  <div className="mt-0.5 flex items-center gap-1.5 font-mono font-medium text-primary">
                    <span className="truncate">{selectedPrForModal.trackingToken || "Pending"}</span>
                    {selectedPrForModal.trackingToken && (
                      <button
                        type="button"
                        onClick={() => handleCopyTrackingToken(selectedPrForModal.trackingToken)}
                        className="rounded p-1 hover:bg-muted text-muted-foreground hover:text-foreground"
                        title="Copy tracking code"
                      >
                        {copiedToken ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedPrForModal(null)}
                className="h-8.5 text-xs"
              >
                Close
              </Button>
              {selectedPrForModal.status === "returned" ? (
                <Button
                  size="sm"
                  onClick={() => {
                    setSelectedPrForModal(null);
                    setLocation("/purchase-requests");
                  }}
                  className="h-8.5 bg-[#9a6d19] hover:bg-[#7e5712] text-white text-xs font-semibold shadow-xs"
                >
                  <FileEdit className="mr-1.5 h-3.5 w-3.5" />
                  Update in Purchase Requests
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => {
                    setSelectedPrForModal(null);
                    setLocation("/purchase-requests");
                  }}
                  className="h-8.5 bg-primary hover:bg-primary/90 text-white text-xs font-semibold shadow-xs"
                >
                  <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                  Open in Purchase Requests
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// ============================================================================
// PLAIN-LANGUAGE 5-STEP PROCUREMENT PROGRESS STEPPER
// ============================================================================
function RequestProgressStepper({
  status,
  latestReturnReason,
  latestRejectionReason,
}: {
  status: string;
  latestReturnReason?: string | null;
  latestRejectionReason?: string | null;
}) {
  const steps = [
    {
      id: "submitted",
      name: "Request submitted",
      description: "Request prepared and forwarded for review.",
    },
    {
      id: "review",
      name: "Under review",
      description: "Procurement checks specs, preliminary canvass, and budget.",
    },
    {
      id: "approved",
      name: "Approved",
      description: "Authorized sign-off from head of office / approver.",
    },
    {
      id: "purchase",
      name: "Purchase in progress",
      description: "Supplier quote canvassing and Purchase Order preparation.",
    },
    {
      id: "completed",
      name: "Completed",
      description: "Items delivered, inspected, and finalized.",
    },
  ];

  type StepState = "completed" | "current" | "action_required" | "blocked" | "upcoming";

  const getStepState = (index: number): { state: StepState; note?: string } => {
    const isStopped = status === "rejected" || status === "cancelled";
    const isReturned = status === "returned";
    const isComplete = ["pmr_logged", "closed"].includes(status);
    const isDelivered = status === "delivered";
    const isPurchase = ["rfq", "po", "po_issued"].includes(status);
    const isApproved = status === "approved";
    const isUnderReview = [
      "procurement_review",
      "approval_review",
      "budget_review",
      "supply_review",
      "bac_review",
    ].includes(status);

    if (index === 0) {
      if (status === "draft") return { state: "current", note: "Draft request in preparation" };
      return { state: "completed" };
    }

    if (index === 1) {
      if (isReturned) return { state: "action_required", note: "Changes requested — waiting for your response" };
      if (isStopped) return { state: "blocked", note: "Request not approved" };
      if (isUnderReview) return { state: "current", note: "Being reviewed by the Procurement Office" };
      if (isApproved || isPurchase || isDelivered || isComplete) return { state: "completed" };
      return { state: "upcoming" };
    }

    if (index === 2) {
      if (isStopped || isReturned) return { state: "upcoming" };
      if (isApproved) return { state: "completed", note: "Approved" };
      if (isPurchase || isDelivered || isComplete) return { state: "completed" };
      return { state: "upcoming" };
    }

    if (index === 3) {
      if (isPurchase) {
        return {
          state: "current",
          note: status === "rfq" ? "Supplier quotes being canvassed" : "Purchase order issued",
        };
      }
      if (isDelivered || isComplete) return { state: "completed" };
      return { state: "upcoming" };
    }

    if (index === 4) {
      if (isComplete) return { state: "completed", note: "All milestones completed" };
      if (isDelivered) return { state: "current", note: "Delivered; recording inspection & PMR" };
      return { state: "upcoming" };
    }

    return { state: "upcoming" };
  };

  return (
    <div className="space-y-3" role="list" aria-label="Procurement workflow steps">
      {steps.map((step, idx) => {
        const { state, note } = getStepState(idx);
        const isLast = idx === steps.length - 1;

        return (
          <div key={step.id} className="relative flex items-start gap-3" role="listitem">
            {/* Step Icon */}
            <div className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full">
              {state === "completed" && (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
              )}
              {state === "current" && (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 ring-2 ring-blue-500/30">
                  <Clock className="h-3.5 w-3.5" />
                </div>
              )}
              {state === "action_required" && (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 ring-2 ring-amber-500/40">
                  <AlertCircle className="h-4 w-4" />
                </div>
              )}
              {state === "blocked" && (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300">
                  <Ban className="h-3.5 w-3.5" />
                </div>
              )}
              {state === "upcoming" && (
                <div className="flex h-6 w-6 items-center justify-center rounded-full border border-border bg-muted/40 text-muted-foreground/50">
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
                </div>
              )}
            </div>

            {/* Connecting line */}
            {!isLast && (
              <div
                className={`absolute left-3 top-6 -bottom-3 w-0.5 ${
                  state === "completed" ? "bg-emerald-500/40" : "bg-border"
                }`}
                aria-hidden="true"
              />
            )}

            {/* Step Info */}
            <div className="min-w-0 flex-1 pb-1">
              <div className="flex items-center gap-2">
                <p
                  className={`text-xs font-semibold ${
                    state === "completed"
                      ? "text-foreground"
                      : state === "current"
                      ? "text-blue-900 dark:text-blue-200"
                      : state === "action_required"
                      ? "text-amber-900 dark:text-amber-200"
                      : state === "blocked"
                      ? "text-destructive"
                      : "text-muted-foreground"
                  }`}
                >
                  {step.name}
                </p>
                {state === "completed" && (
                  <span className="rounded bg-emerald-50 text-emerald-700 px-1.5 py-0.2 text-[9px] font-bold dark:bg-emerald-950/50 dark:text-emerald-300 uppercase tracking-wider">
                    Finished
                  </span>
                )}
                {state === "current" && (
                  <span className="rounded bg-blue-50 text-blue-700 px-1.5 py-0.2 text-[9px] font-bold dark:bg-blue-950/50 dark:text-blue-300 uppercase tracking-wider">
                    In progress
                  </span>
                )}
                {state === "action_required" && (
                  <span className="rounded bg-amber-100 text-amber-800 px-1.5 py-0.2 text-[9px] font-bold dark:bg-amber-950/60 dark:text-amber-300 uppercase tracking-wider">
                    Action required
                  </span>
                )}
                {state === "blocked" && (
                  <span className="rounded bg-destructive/10 text-destructive px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider">
                    Stopped
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {note || step.description}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// SIMPLIFIED, ACCESSIBLE STATUS SUMMARY PANEL (KPI CARD)
// ============================================================================
function PersonalKpiCard({
  label,
  count,
  description,
  tone,
  icon: Icon,
  highlightBadge,
  isActive,
  onClick,
}: {
  label: string;
  count: number;
  description: string;
  tone: "blue" | "amber" | "emerald" | "rose";
  icon: any;
  highlightBadge?: string;
  isActive?: boolean;
  onClick?: () => void;
}) {
  const styles = {
    blue: {
      border: "border-blue-200 hover:border-blue-300 dark:border-blue-900/50 dark:hover:border-blue-800",
      badge: "bg-blue-50 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300",
      icon: "text-blue-700 dark:text-blue-400",
      value: "text-blue-900 dark:text-blue-200",
      activeRing: "ring-2 ring-blue-600 border-blue-500 bg-blue-50/20 dark:bg-blue-950/20",
    },
    amber: {
      border: "border-amber-200 hover:border-amber-300 dark:border-amber-900/50 dark:hover:border-amber-800",
      badge: "bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
      icon: "text-amber-700 dark:text-amber-400",
      value: "text-amber-900 dark:text-amber-200",
      activeRing: "ring-2 ring-amber-600 border-amber-500 bg-amber-50/20 dark:bg-amber-950/20",
    },
    emerald: {
      border: "border-emerald-200 hover:border-emerald-300 dark:border-emerald-900/50 dark:hover:border-emerald-800",
      badge: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300",
      icon: "text-emerald-700 dark:text-emerald-400",
      value: "text-emerald-900 dark:text-emerald-200",
      activeRing: "ring-2 ring-emerald-600 border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/20",
    },
    rose: {
      border: "border-rose-200 hover:border-rose-300 dark:border-rose-900/50 dark:hover:border-rose-800",
      badge: "bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300",
      icon: "text-rose-700 dark:text-rose-400",
      value: "text-rose-900 dark:text-rose-200",
      activeRing: "ring-2 ring-rose-600 border-rose-500 bg-rose-50/20 dark:bg-rose-950/20",
    },
  }[tone];

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={Boolean(isActive)}
      aria-label={`${label}: ${count} requests. ${description}. ${
        isActive ? "Active filter. Click to clear filter." : "Click to filter list by this status."
      }`}
      className={`flat-panel group min-w-0 cursor-pointer p-4 text-left transition-all select-none hover:shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
        styles.border
      } ${isActive ? styles.activeRing : ""}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${styles.badge}`}
        >
          <Icon className="h-3.5 w-3.5 shrink-0" />
          <span>{label}</span>
        </span>
        {highlightBadge ? (
          <span className="rounded bg-amber-600 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-xs">
            {highlightBadge}
          </span>
        ) : isActive ? (
          <span className="inline-flex items-center gap-1 rounded bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-bold dark:bg-primary/25 dark:text-[#ff837a]">
            <Check className="h-2.5 w-2.5" /> Filter active
          </span>
        ) : null}
      </div>

      <p className={`mt-3 font-display text-2xl font-bold tracking-tight sm:text-3xl ${styles.value}`}>
        {count.toLocaleString()}
      </p>

      {/* Full readable description without line-clamp truncation */}
      <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{description}</p>

      {/* Interactive affordance */}
      <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-2 text-[11px] text-muted-foreground">
        <span className={isActive ? "font-semibold text-primary dark:text-[#ff837a]" : "group-hover:text-foreground"}>
          {isActive ? "Clear this filter" : "Filter requests"}
        </span>
        <ArrowRight
          className={`h-3 w-3 transition-transform ${
            isActive
              ? "rotate-90 text-primary dark:text-[#ff837a]"
              : "text-muted-foreground/60 group-hover:translate-x-0.5 group-hover:text-foreground"
          }`}
        />
      </div>
    </button>
  );
}

// ============================================================================
// ADMIN / OFFICER DASHBOARD (PRESERVED WORKSPACE CONTROL CENTER)
// ============================================================================
function AdminDashboard({
  data,
  isLoading,
  userRole,
}: {
  data: any;
  isLoading: boolean;
  userRole: string;
}) {
  const cards = [
    {
      label: "PMR Registry & Verified PRs",
      icon: BookOpenCheck,
      value: data?.purchaseRequests?.filter((pr: any) => pr.procurementReviewedById !== null || pr.pmrLogged).length ?? 0,
      detail: "Verified PR packages recorded or queued for PMR logging.",
      tone: "text-[#7b1e1e] bg-[#fff4f1] dark:text-[#ff837a] dark:bg-[#341f1f]",
      href: "/pmr-registry",
    },
    {
      label: "BAC Transmittals",
      icon: Send,
      value: data?.transmittals?.length ?? 0,
      detail: "Transmittal packages routed to and from the BAC Secretariat.",
      tone: "text-[#325d91] bg-[#f1f6fc] dark:text-[#79b8ff] dark:bg-[#1a2736]",
      href: "/officer/transmittals",
    },
    {
      label: "POs, delivery & PMR",
      icon: CircleDollarSign,
      value: data?.purchaseOrders?.length ?? 0,
      detail: "Purchase Orders progressing through delivery and PMR.",
      tone: "text-[#9a6d19] bg-[#fff8e8] dark:text-[#f0c36a] dark:bg-[#272118]",
      href: "/purchase-orders",
    },
    {
      label: "Audit events",
      icon: Timer,
      value: data?.auditEvents?.length ?? 0,
      detail: "Accountability records available to your role.",
      tone: "text-[#276a4e] bg-[#f1f9f4] dark:text-[#55c98a] dark:bg-[#162c20]",
      href: "/audit",
    },
  ];

  return (
    <div className="content-shell pb-12">
      <PageHeader
        eyebrow="Control center"
        title="Procurement overview"
        description="A role-sensitive view of procurement planning, officer verification, BAC transmittals, Purchase Orders, delivery, PMR, and accountability records across all offices."
      />

      <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="flat-panel group p-4 transition-colors hover:border-[#d2bd92] dark:hover:border-[#64717d]"
          >
            <div className="flex items-start justify-between">
              <div className={`grid h-8 w-8 place-items-center rounded-[4px] ${card.tone}`}>
                <card.icon className="h-4 w-4" />
              </div>
              <ArrowUpRight className="h-3.5 w-3.5 text-[#a1a7ae] dark:text-[#aeb9c4] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </div>
            <p className="mt-4 font-display text-2xl font-semibold text-[#202833] dark:text-[#f1f5f8]">
              {isLoading ? "—" : card.value ?? 0}
            </p>
            <p className="mt-2 text-xs font-semibold text-[#3b4654] dark:text-[#f1f5f8]">{card.label}</p>
            <p className="mt-2 text-[11px] leading-5 text-muted-foreground">{card.detail}</p>
          </Link>
        ))}
      </div>

      <div className="mt-7 grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
        {data?.purchaseRequests?.length ? (
          <div className="flat-panel">
            <div className="border-b border-[#ece8df] dark:border-[#46515c] px-5 py-4">
              <p className="text-sm font-semibold text-[#34404e] dark:text-[#f1f5f8]">
                Active Procurement Monitoring Queue
              </p>
              <p className="mt-1 text-[11px] text-[#7d8793] dark:text-[#aeb9c4]">
                Verified records routed through official administrative control.
              </p>
            </div>
            <div className="divide-y divide-[#f0ede6] dark:divide-[#46515c] px-5">
              {data.purchaseRequests.slice(0, 5).map((pr: any) => (
                <div key={pr.id} className="flex items-center justify-between gap-3 py-4">
                  <div>
                    <p className="text-xs font-semibold text-[#3e4855] dark:text-[#f1f5f8]">{pr.prNumber}</p>
                    <p className="mt-1 max-w-[600px] text-[11px] text-[#77818d] dark:text-[#d1dae2] line-clamp-2 break-words" title={pr.purpose}>
                      {pr.purpose}
                    </p>
                  </div>
                  <StatusBadge
                    tone={
                      pr.status.includes("review")
                        ? "pending"
                        : pr.status === "approved"
                        ? "approved"
                        : pr.status === "returned"
                        ? "pending"
                        : pr.status === "rejected"
                        ? "returned"
                        : "draft"
                    }
                  >
                    {pr.status.replaceAll("_", " ").toUpperCase()}
                  </StatusBadge>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <EmptyWorkspace
            eyebrow="Action queue"
            title="There are no workflow actions awaiting your role."
            description="Requests and approvals requiring your authority will appear here as transactions are submitted and routed."
            actionLabel="View PMR registry"
            actionHref="/pmr-registry"
          />
        )}

        <div className="flat-panel h-fit">
          <div className="flex items-center justify-between border-b border-[#ece8df] dark:border-[#46515c] px-5 py-4">
            <div>
              <p className="text-xs font-semibold text-[#34404e] dark:text-[#f1f5f8]">Process integrity</p>
              <p className="mt-1 text-[11px] text-[#7d8793] dark:text-[#aeb9c4]">
                Mandatory controls for every transaction
              </p>
            </div>
            <Activity className="h-4 w-4 text-[#7b1e1e] dark:text-[#ff837a]" />
          </div>
          <div className="divide-y divide-[#f0ede6] dark:divide-[#46515c] px-5 py-1">
            {[
              "End-Users submit complete PR packages for Procurement Officer verification and recording.",
              "The BAC reviews the Abstract of Quotations and recommends the Single or Lowest Calculated and Responsive Quotation to the HoPE for an award decision.",
              "Purchase Orders are issued after the official decision, then closed only after delivery and PMR logging.",
            ].map((item, index) => (
              <div key={item} className="flex gap-3 py-4">
                <StatusBadge tone={index === 1 ? "pending" : "approved"}>
                  {index === 1 ? "REVIEW" : "CONTROL"}
                </StatusBadge>
                <p className="text-[11px] leading-5 text-[#65707e] dark:text-[#d1dae2]">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// PROCUREMENT STAFF DEDICATED OVERVIEW WORKBENCH (SECTION 5 STRICT SCOPE)
// ============================================================================
function ProcurementStaffDashboard({
  data,
  isLoading,
}: {
  data: any;
  isLoading: boolean;
}) {
  const prs = data?.purchaseRequests ?? [];
  const pendingPmrPrs = prs.filter((pr: any) => pr.procurementReviewedById !== null && !pr.pmrLogged && !pr.pmrReferenceNumber);
  const activeRfqs = data?.rfqs ?? [];
  const quotationAbstracts = data?.quotationAbstracts ?? [];
  const pendingPoAbstracts = quotationAbstracts.filter((a: any) => a.status === "approved");
  const purchaseOrders = data?.purchaseOrders ?? [];
  const transmittals = data?.transmittals ?? [];
  const notices = data?.lettersOfNotice ?? [];

  const cards = [
    {
      label: "Pending PMR Recordings",
      icon: BookOpenCheck,
      value: pendingPmrPrs.length,
      detail: "Officer-verified PRs ready for PMR registry recording.",
      tone: "text-rose-700 bg-rose-50 dark:text-rose-400 dark:bg-rose-950/40",
      href: "/pmr-registry",
    },
    {
      label: "RFQ Drafts & Canvass",
      icon: FileSpreadsheet,
      value: activeRfqs.length,
      detail: "Active RFQ packages and supplier quotation records.",
      tone: "text-blue-700 bg-blue-50 dark:text-blue-400 dark:bg-blue-950/40",
      href: "/rfq-management",
    },
    {
      label: "BAC Transmittals (AOQ)",
      icon: Send,
      value: transmittals.length,
      detail: "Packages forwarded to BAC Secretariat for AOQ creation.",
      tone: "text-amber-700 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/40",
      href: "/officer/transmittals",
    },
    {
      label: "Draft POs & Notices",
      icon: FileCheck2,
      value: purchaseOrders.length + notices.length,
      detail: "Draft Purchase Orders and Letters of Notice for awarded suppliers.",
      tone: "text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/40",
      href: "/purchase-orders",
    },
  ];

  const duties = [
    {
      id: "1",
      number: "Duty 1",
      title: "Record PR to PMR",
      condition: "Permitted only after Procurement Officer verification of PR & PPMP.",
      href: "/pmr-registry",
      badge: `${pendingPmrPrs.length} ready`,
      badgeTone: pendingPmrPrs.length > 0 ? "approved" : "pending",
      buttonText: "Open PMR Registry",
    },
    {
      id: "2",
      number: "Duty 2",
      title: "Prepare RFQ & Recommend Approval",
      condition: "Draft quotation package and recommend approval to HoPE.",
      href: "/rfq-management",
      badge: `${activeRfqs.length} active`,
      badgeTone: "pending",
      buttonText: "Manage RFQs",
    },
    {
      id: "3",
      number: "Duty 3",
      title: "Forward to BAC for AOQ Preparation",
      condition: "Transmit quotation package to BAC Secretariat for AOQ creation.",
      href: "/rfq-management",
      badge: `${transmittals.length} transmittals`,
      badgeTone: "pending",
      buttonText: "Forward to BAC / AOQ",
    },
    {
      id: "4",
      number: "Duty 4",
      title: "Prepare Letter of Notice",
      condition: "Prepare and submit the Letter of Notice to the HoPE for approval before issue.",
      href: "/officer/notices",
      badge: `${notices.length} notices`,
      badgeTone: "pending",
      buttonText: "Draft Notice",
    },
    {
      id: "5",
      number: "Duty 5",
      title: "Prepare Purchase Order (PO)",
      condition: "Generate and draft formal PO document from approved AOQ.",
      href: "/purchase-orders",
      badge: `${pendingPoAbstracts.length} POs ready`,
      badgeTone: pendingPoAbstracts.length > 0 ? "approved" : "pending",
      buttonText: "Draft Purchase Orders",
    },
  ];

  return (
    <div className="content-shell pb-12 space-y-7">
      <PageHeader
        eyebrow="Procurement Staff Workbench"
        title="Procurement Operations Overview"
        description="Assigned strictly to Procedure 5 duties: PMR recording, RFQ preparation, BAC forwarding for AOQ, Letter of Notice drafting, and Purchase Order preparation."
      />

      {/* Scoped KPI Cards */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="flat-panel group p-4 transition-colors hover:border-[#d2bd92] dark:hover:border-[#64717d]"
          >
            <div className="flex items-start justify-between">
              <div className={`grid h-8 w-8 place-items-center rounded-[4px] ${card.tone}`}>
                <card.icon className="h-4 w-4" />
              </div>
              <ArrowUpRight className="h-3.5 w-3.5 text-[#a1a7ae] dark:text-[#aeb9c4] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </div>
            <p className="mt-4 font-display text-2xl font-semibold text-[#202833] dark:text-[#f1f5f8]">
              {isLoading ? "—" : card.value}
            </p>
            <p className="mt-2 text-xs font-semibold text-[#3b4654] dark:text-[#f1f5f8]">{card.label}</p>
            <p className="mt-2 text-[11px] leading-5 text-muted-foreground">{card.detail}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
        {/* Left Column: Staff Action Queue */}
        <div className="space-y-6">
          <div className="flat-panel">
            <div className="border-b border-[#ece8df] dark:border-[#46515c] px-5 py-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-[#34404e] dark:text-[#f1f5f8]">
                  Verified PRs Awaiting PMR Recording
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  PRs verified by Procurement Officer ready for Procedure 5.2 PMR recording.
                </p>
              </div>
              <Link
                href="/pmr-registry"
                className="text-xs font-semibold text-rose-700 dark:text-rose-400 hover:underline flex items-center gap-1"
              >
                Go to PMR Registry <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="divide-y divide-[#f0ede6] dark:divide-[#46515c] px-5">
              {pendingPmrPrs.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  <CheckCircle2 className="mx-auto h-6 w-6 text-emerald-500 mb-1" />
                  No pending PMR recordings. All verified PRs have been logged.
                </div>
              ) : (
                pendingPmrPrs.slice(0, 5).map((pr: any) => (
                  <div key={pr.id} className="flex items-center justify-between gap-3 py-3.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-rose-700 dark:text-rose-400">
                          {pr.prNumber}
                        </span>
                        <StatusBadge tone="approved">OFFICER VERIFIED</StatusBadge>
                      </div>
                      <p className="text-xs text-foreground mt-0.5 line-clamp-1">{pr.purpose}</p>
                    </div>
                    <Button asChild size="sm" className="h-7 text-xs bg-rose-700 hover:bg-rose-800 text-white">
                      <Link href="/pmr-registry">Record to PMR</Link>
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Notice & PO Ready Queue */}
          <div className="flat-panel">
            <div className="border-b border-[#ece8df] dark:border-[#46515c] px-5 py-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-[#34404e] dark:text-[#f1f5f8]">
                  Approved Quotation Abstracts Ready for PO Drafting
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  BAC approved abstracts ready for formal Purchase Order preparation.
                </p>
              </div>
              <Link
                href="/purchase-orders"
                className="text-xs font-semibold text-rose-700 dark:text-rose-400 hover:underline flex items-center gap-1"
              >
                Go to PO Workspace <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="divide-y divide-[#f0ede6] dark:divide-[#46515c] px-5">
              {pendingPoAbstracts.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  <Clock className="mx-auto h-6 w-6 text-muted-foreground mb-1" />
                  No BAC approved abstracts awaiting PO drafting currently.
                </div>
              ) : (
                pendingPoAbstracts.slice(0, 4).map((abs: any) => (
                  <div key={abs.id} className="flex items-center justify-between gap-3 py-3.5">
                    <div>
                      <span className="font-mono text-xs font-semibold text-foreground">
                        Abstract for RFQ #{abs.rfqId}
                      </span>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Supplier #{abs.recommendedSupplierId} · {formatMoney(abs.totalAmount || 0)}
                      </p>
                    </div>
                    <Button asChild size="sm" variant="outline" className="h-7 text-xs">
                      <Link href="/purchase-orders">Draft PO</Link>
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: 5 Assigned Duties Workbench */}
        <div className="flat-panel h-fit">
          <div className="border-b border-[#ece8df] dark:border-[#46515c] px-5 py-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-[#34404e] dark:text-[#f1f5f8]">
                Assigned Duties Scope
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Strict operational boundary (Procedure 5 specification)
              </p>
            </div>
            <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>

          <div className="divide-y divide-[#f0ede6] dark:divide-[#46515c] px-5 py-2">
            {duties.map((duty) => (
              <div key={duty.id} className="py-3.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-400">
                    {duty.number}
                  </span>
                  <StatusBadge tone={duty.badgeTone as any}>{duty.badge}</StatusBadge>
                </div>
                <h4 className="text-xs font-bold text-foreground">{duty.title}</h4>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{duty.condition}</p>
                <div className="pt-1">
                  <Button asChild size="sm" variant="outline" className="h-7 text-xs w-full justify-between">
                    <Link href={duty.href}>
                      <span>{duty.buttonText}</span>
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// PROCUREMENT OFFICER DEDICATED CONTROL CENTER OVERVIEW (MANDATED 6 TASKS)
// ============================================================================
function ProcurementOfficerDashboard() {
  const prVerificationsQuery = trpc.procurement.officer.prVerification.list.useQuery();
  const rfqDistributionsQuery = trpc.procurement.officer.rfqDistribution.list.useQuery();
  const releasingQuery = trpc.procurement.officer.releasing.list.useQuery();
  const deliveriesQuery = trpc.procurement.officer.delivery.list.useQuery();
  const noticesQuery = trpc.procurement.officer.notices.list.useQuery();

  const isLoading =
    prVerificationsQuery.isLoading ||
    rfqDistributionsQuery.isLoading ||
    releasingQuery.isLoading ||
    deliveriesQuery.isLoading;

  const verifications = prVerificationsQuery.data ?? [];
  const pendingVerifications = verifications.filter(
    (v: any) => !v.isVerified && v.purchaseRequest.status !== "returned"
  );
  const mixedCategoryPrs = verifications.filter(
    (v: any) => !v.isVerified && v.segregationAnalysis?.isMixed
  );

  const rfqs = rfqDistributionsQuery.data ?? [];
  const unpostedPhilgeps = rfqs.filter((r: any) => !r.philgepsPosting);
  const pendingDistributionOrPosting = rfqs.filter(
    (r: any) => r.distributionStatus !== "transmitted_to_bac" || !r.philgepsPosting
  );

  const orders = releasingQuery.data ?? [];
  const unreleasedOrders = orders.filter((o: any) => !o.isReleased);

  const notices = noticesQuery.data ?? [];
  const unservedNotices = notices.filter((n: any) => n.status !== "served");

  const pendingReleasingTotal = unreleasedOrders.length + unservedNotices.length;

  const deliveries = deliveriesQuery.data ?? [];
  const awaitingInspection = deliveries.filter((d: any) => !d.iar);

  // 4 Scoped KPI Cards strictly reflecting the officer's mandated tasks
  const cards = [
    {
      label: "Pending PR & PPMP Verifications",
      icon: ShieldCheck,
      value: pendingVerifications.length,
      detail:
        mixedCategoryPrs.length > 0
          ? `${mixedCategoryPrs.length} PRs flagged with mixed commodity categories.`
          : "Initial administrative verification & Section 5.1.1 clearance.",
      tone: "text-rose-700 bg-rose-50 dark:text-rose-400 dark:bg-rose-950/40",
      href: "/officer/pr-verification",
    },
    {
      label: "RFQ Distributions & PhilGEPS",
      icon: FileSpreadsheet,
      value: pendingDistributionOrPosting.length,
      detail: `${unpostedPhilgeps.length} packages awaiting PhilGEPS posting reference.`,
      tone: "text-blue-700 bg-blue-50 dark:text-blue-400 dark:bg-blue-950/40",
      href: "/officer/rfq-distribution",
    },
    {
      label: "Notices & POs to Release",
      icon: Send,
      value: pendingReleasingTotal,
      detail: `${unservedNotices.length} notices to serve · ${unreleasedOrders.length} POs to release.`,
      tone: "text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/40",
      href: "/officer/releasing",
    },
    {
      label: "Deliveries Awaiting IAR",
      icon: Clock,
      value: awaitingInspection.length,
      detail: "Active purchase orders awaiting goods inspection & acceptance report.",
      tone: "text-amber-700 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/40",
      href: "/officer/delivery-monitoring",
    },
  ];

  // 6 Mandated Lifecycle Duties strictly reflecting official Procedure 5
  const duties = [
    {
      id: "1",
      number: "Duty 1",
      title: "Receive & Verify PR & PPMP (Section 5.1.1)",
      description:
        "Initial administrative verification and category segregation check (Office Supplies, Hardware Supplies, ICT Supplies, Printing Services, Food Ingredients).",
      href: "/officer/pr-verification",
      badge: `${pendingVerifications.length} pending`,
      badgeTone: pendingVerifications.length > 0 ? "pending" : "approved",
      buttonText: "Review PR Packages",
    },
    {
      id: "2",
      number: "Duty 2",
      title: "Distribute & Retrieve RFQ & Transmit to BAC",
      description:
        "Manage outward distribution of RFQs to canvassers, log supplier retrievals, and formally transmit packages to the BAC Secretariat.",
      href: "/officer/rfq-distribution",
      badge: `${rfqs.length} active`,
      badgeTone: "pending",
      buttonText: "Manage Distributions",
    },
    {
      id: "3",
      number: "Duty 3",
      title: "PhilGEPS Posting Verification",
      description:
        "Document and verify required PhilGEPS reference numbers and posting dates for active RFQ procurement packages.",
      href: "/officer/rfq-distribution",
      badge: `${unpostedPhilgeps.length} unposted`,
      badgeTone: unpostedPhilgeps.length > 0 ? "rejected" : "approved",
      buttonText: "Log PhilGEPS",
    },
    {
      id: "4",
      number: "Duty 4",
      title: "Serve Letter of Notice",
      description:
        "Deliver and serve finalized Letters of Notice to winning suppliers with delivery mode and recipient acknowledgement logging.",
      href: "/officer/releasing",
      badge: `${unservedNotices.length} to serve`,
      badgeTone: unservedNotices.length > 0 ? "pending" : "approved",
      buttonText: "Serve Notices",
    },
    {
      id: "5",
      number: "Duty 5",
      title: "PO & Contract Releasing",
      description:
        "Formally release approved and signed Purchase Orders / contracts to awarded suppliers with acknowledgement tracking.",
      href: "/officer/releasing",
      badge: `${unreleasedOrders.length} to release`,
      badgeTone: unreleasedOrders.length > 0 ? "pending" : "approved",
      buttonText: "Release Orders",
    },
    {
      id: "6",
      number: "Duty 6",
      title: "Monitor Delivery & Inspection (IAR)",
      description:
        "Track supplier delivery timelines, log goods receipts, and record final inspection and acceptance milestones.",
      href: "/officer/delivery-monitoring",
      badge: `${awaitingInspection.length} monitoring`,
      badgeTone: awaitingInspection.length > 0 ? "pending" : "approved",
      buttonText: "Track Deliveries",
    },
  ];

  return (
    <div className="content-shell pb-12 space-y-7">
      <PageHeader
        eyebrow="Procurement Officer Control Center"
        title="Procurement Officer Overview"
        description="Assigned strictly to Procedure 5 officer duties: PR & PPMP verification (Section 5.1.1), RFQ distribution/retrieval & BAC transmittal, PhilGEPS posting, notice serving, PO releasing, and delivery inspection monitoring."
      />

      {/* Scoped KPI Cards */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="flat-panel group p-4 transition-colors hover:border-[#d2bd92] dark:hover:border-[#64717d]"
          >
            <div className="flex items-start justify-between">
              <div className={`grid h-8 w-8 place-items-center rounded-[4px] ${card.tone}`}>
                <card.icon className="h-4 w-4" />
              </div>
              <ArrowUpRight className="h-3.5 w-3.5 text-[#a1a7ae] dark:text-[#aeb9c4] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </div>
            <p className="mt-4 font-display text-2xl font-semibold text-[#202833] dark:text-[#f1f5f8]">
              {isLoading ? "—" : card.value}
            </p>
            <p className="mt-2 text-xs font-semibold text-[#3b4654] dark:text-[#f1f5f8]">{card.label}</p>
            <p className="mt-2 text-[11px] leading-5 text-muted-foreground">{card.detail}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
        {/* Left Column: Officer Action Queues */}
        <div className="space-y-6">
          {/* Section 5.1.1 Verification Queue */}
          <div className="flat-panel">
            <div className="border-b border-[#ece8df] dark:border-[#46515c] px-5 py-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-[#34404e] dark:text-[#f1f5f8]">
                    Incoming PRs Awaiting Section 5.1.1 Verification
                  </p>
                  {mixedCategoryPrs.length > 0 && (
                    <Badge variant="outline" className="text-[10px] border-amber-500 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                      {mixedCategoryPrs.length} Mixed Categories Flagged
                    </Badge>
                  )}
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Verify category segregation before clearing package for Staff PMR recording.
                </p>
              </div>
              <Link
                href="/officer/pr-verification"
                className="text-xs font-semibold text-rose-700 dark:text-rose-400 hover:underline flex items-center gap-1"
              >
                Go to Verification Hub <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="divide-y divide-[#f0ede6] dark:divide-[#46515c] px-5">
              {pendingVerifications.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  <CheckCircle2 className="mx-auto h-6 w-6 text-emerald-500 mb-1" />
                  All submitted PR packages have been verified and cleared for PMR recording.
                </div>
              ) : (
                pendingVerifications.slice(0, 5).map((item: any) => {
                  const pr = item.purchaseRequest;
                  const isMixed = item.segregationAnalysis?.isMixed;
                  return (
                    <div key={pr.id} className="flex items-center justify-between gap-3 py-3.5">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-semibold text-rose-700 dark:text-rose-400">
                            {pr.prNumber}
                          </span>
                          {isMixed ? (
                            <Badge variant="outline" className="border-amber-400 bg-amber-50 text-amber-800 text-[10px] dark:bg-amber-950/40 dark:text-amber-300">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Mixed Categories Detected
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700 text-[10px] dark:bg-emerald-950/40 dark:text-emerald-300">
                              Ready for Clearance
                            </Badge>
                          )}
                          <span className="text-[11px] text-muted-foreground">
                            ({item.items.length} items · {formatMoney(pr.totalEstimate)})
                          </span>
                        </div>
                        <p className="text-xs text-foreground mt-1 truncate">{pr.purpose}</p>
                      </div>
                      <Button asChild size="sm" className="h-7 text-xs bg-rose-700 hover:bg-rose-800 text-white shrink-0">
                        <Link href="/officer/pr-verification">Verify &amp; Clear</Link>
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Releasing & Delivery Queue */}
          <div className="flat-panel">
            <div className="border-b border-[#ece8df] dark:border-[#46515c] px-5 py-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-[#34404e] dark:text-[#f1f5f8]">
                  Notices &amp; Purchase Orders Awaiting Release
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Finalized documents ready for service and formal release to winning suppliers.
                </p>
              </div>
              <Link
                href="/officer/releasing"
                className="text-xs font-semibold text-rose-700 dark:text-rose-400 hover:underline flex items-center gap-1"
              >
                Go to Releasing <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="divide-y divide-[#f0ede6] dark:divide-[#46515c] px-5">
              {pendingReleasingTotal === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  <CheckCircle2 className="mx-auto h-6 w-6 text-emerald-500 mb-1" />
                  No pending notices or POs awaiting release.
                </div>
              ) : (
                <>
                  {unservedNotices.slice(0, 3).map((notice: any) => (
                    <div key={`notice-${notice.id}`} className="flex items-center justify-between gap-3 py-3.5">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-semibold text-amber-700 dark:text-amber-400">
                            Notice #{notice.id}
                          </span>
                          <StatusBadge tone="pending">UNSERVED NOTICE</StatusBadge>
                        </div>
                        <p className="text-xs text-foreground mt-0.5 truncate">{notice.subject}</p>
                      </div>
                      <Button asChild size="sm" variant="outline" className="h-7 text-xs shrink-0">
                        <Link href="/officer/releasing">Serve Notice</Link>
                      </Button>
                    </div>
                  ))}
                  {unreleasedOrders.slice(0, 3).map((item: any) => (
                    <div key={`order-${item.order.id}`} className="flex items-center justify-between gap-3 py-3.5">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                            {item.order.poNumber}
                          </span>
                          <StatusBadge tone="approved">APPROVED PO</StatusBadge>
                          <span className="text-[11px] text-muted-foreground truncate">
                            {item.supplier?.name || "Supplier"}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Amount: {formatMoney(item.order.totalAmount)}
                        </p>
                      </div>
                      <Button asChild size="sm" variant="outline" className="h-7 text-xs shrink-0">
                        <Link href="/officer/releasing">Release PO</Link>
                      </Button>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: 6 Mandated Lifecycle Duties Workbench */}
        <div className="flat-panel h-fit">
          <div className="border-b border-[#ece8df] dark:border-[#46515c] px-5 py-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-[#34404e] dark:text-[#f1f5f8]">
                Mandated Duties Scope
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Official Procedure 5 Procurement Officer specification
              </p>
            </div>
            <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>

          <div className="divide-y divide-[#f0ede6] dark:divide-[#46515c] px-5 py-2">
            {duties.map((duty) => (
              <div key={duty.id} className="py-3.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-400">
                    {duty.number}
                  </span>
                  <StatusBadge tone={duty.badgeTone as any}>{duty.badge}</StatusBadge>
                </div>
                <h4 className="text-xs font-bold text-foreground">{duty.title}</h4>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{duty.description}</p>
                <div className="pt-1">
                  <Button asChild size="sm" variant="outline" className="h-7 text-xs w-full justify-between">
                    <Link href={duty.href}>
                      <span>{duty.buttonText}</span>
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

