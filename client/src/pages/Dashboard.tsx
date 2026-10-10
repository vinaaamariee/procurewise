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
  CheckCircle2,
  CircleDollarSign,
  Clock,
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
  const [dismissedBannerIds, setDismissedBannerIds] = useState<Record<number, boolean>>({});
  const [bannerCategoryOverride, setBannerCategoryOverride] = useState<"returned" | "rejected" | "successful" | null>(null);

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

  // 1. Pursued / Active PRs: Total PRs currently ongoing in the procurement pipeline
  const activePrs = useMemo(() => {
    return userPrs.filter((pr) =>
      ["draft", "procurement_review", "approval_review", "budget_review", "supply_review", "bac_review", "rfq"].includes(
        pr.status
      )
    );
  }, [userPrs]);

  // 2. Returned for Revision: Count of PRs returned needing user correction
  const returnedPrs = useMemo(() => {
    return userPrs.filter((pr) => pr.status === "returned");
  }, [userPrs]);

  // 3. Successful / Completed PRs: Count of fully awarded/completed PRs
  const successfulPrs = useMemo(() => {
    return userPrs.filter((pr) =>
      ["approved", "po", "po_issued", "delivered", "pmr_logged", "closed"].includes(pr.status)
    );
  }, [userPrs]);

  // 4. Rejected / Cancelled: Count of disapproved requests
  const rejectedPrs = useMemo(() => {
    return userPrs.filter((pr) => pr.status === "rejected" || pr.status === "cancelled");
  }, [userPrs]);

  // Find latest PRs in each category for contextual banners
  const sortByLatest = (list: typeof userPrs) => {
    return [...list].sort(
      (a, b) =>
        new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
    );
  };

  const latestReturned = sortByLatest(returnedPrs)[0];
  const latestRejected = sortByLatest(rejectedPrs)[0];
  const latestSuccessful = sortByLatest(successfulPrs)[0];

  // Active banner resolution
  const activeBannerCategory = useMemo<"returned" | "rejected" | "successful" | null>(() => {
    if (bannerCategoryOverride) return bannerCategoryOverride;
    if (latestReturned && !dismissedBannerIds[latestReturned.id]) return "returned";
    if (latestRejected && !dismissedBannerIds[latestRejected.id]) return "rejected";
    if (latestSuccessful && !dismissedBannerIds[latestSuccessful.id]) return "successful";
    return null;
  }, [bannerCategoryOverride, latestReturned, latestRejected, latestSuccessful, dismissedBannerIds]);

  const activeBannerPr =
    activeBannerCategory === "returned"
      ? latestReturned
      : activeBannerCategory === "rejected"
      ? latestRejected
      : activeBannerCategory === "successful"
      ? latestSuccessful
      : null;

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

  return (
    <div className="content-shell pb-12">
      {/* Page Header */}
      <PageHeader
        eyebrow="Your workspace"
        title="Your purchase requests"
        description="See what is happening with each request, review any feedback, and find the next step."
        action={{
          label: "Start a purchase request",
          onClick: () => setLocation("/purchase-requests?create=1"),
        }}
      />

      {/* Contextual Feedback Banner Section */}
      <section className="mt-6">
        {/* Banner Switcher Chips if user has multiple update types */}
        {(returnedPrs.length > 0 || rejectedPrs.length > 0 || successfulPrs.length > 0) && (
          <div className="mb-2.5 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#7e8b9b] dark:text-[#aeb9c4]">
              Updates about your requests:
            </span>
            {returnedPrs.length > 0 && (
              <button
                type="button"
                onClick={() => setBannerCategoryOverride("returned")}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition ${
                  activeBannerCategory === "returned"
                    ? "border-[#d4a029] bg-[#fff6df] text-[#845b14] shadow-xs dark:bg-[#342410] dark:text-[#f8d486]"
                    : "border-[#e5dfd5] bg-white text-[#5e6977] hover:border-[#d4a029] dark:bg-[#1a232c] dark:border-[#384554] dark:text-[#d1dae2]"
                }`}
              >
                <FileEdit className="h-3 w-3 text-[#b47a16]" />
                <span>Changes requested ({returnedPrs.length})</span>
              </button>
            )}
            {rejectedPrs.length > 0 && (
              <button
                type="button"
                onClick={() => setBannerCategoryOverride("rejected")}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition ${
                  activeBannerCategory === "rejected"
                    ? "border-[#e07d7d] bg-[#fdf2f2] text-[#8e2424] shadow-xs dark:bg-[#341818] dark:text-[#fca5a5]"
                    : "border-[#e5dfd5] bg-white text-[#5e6977] hover:border-[#e07d7d] dark:bg-[#1a232c] dark:border-[#384554] dark:text-[#d1dae2]"
                }`}
              >
                <Ban className="h-3 w-3 text-[#b93232]" />
                <span>Could not proceed ({rejectedPrs.length})</span>
              </button>
            )}
            {successfulPrs.length > 0 && (
              <button
                type="button"
                onClick={() => setBannerCategoryOverride("successful")}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition ${
                  activeBannerCategory === "successful"
                    ? "border-[#85d0ad] bg-[#eefaf3] text-[#136a43] shadow-xs dark:bg-[#122e20] dark:text-[#86efac]"
                    : "border-[#e5dfd5] bg-white text-[#5e6977] hover:border-[#85d0ad] dark:bg-[#1a232c] dark:border-[#384554] dark:text-[#d1dae2]"
                }`}
              >
                <PartyPopper className="h-3 w-3 text-[#136a43]" />
                <span>Completed ({successfulPrs.length})</span>
              </button>
            )}
          </div>
        )}

        {/* Dynamic Contextual Banner Rendering */}
        {activeBannerCategory === "returned" && activeBannerPr && (
          <div className="relative rounded-lg border border-[#f1d28c] bg-gradient-to-r from-[#fffaf0] via-[#fffbf4] to-[#fffdf9] p-4 shadow-sm dark:border-[#5a431c] dark:from-[#251b0f] dark:via-[#2a2418] dark:to-[#1a232c]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-[#faeed2] text-[#936418] dark:bg-[#3a2c16] dark:text-[#f4d081]">
                  <FileEdit className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-[#f9e7be] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#795010] dark:bg-[#493414] dark:text-[#ffd98e]">
                      ACTION REQUIRED
                    </span>
                    <h3 className="flex items-center gap-1.5 text-sm font-bold text-[#2a3442] dark:text-[#f1f5f8]">
                      <FileEdit className="h-4 w-4 shrink-0 text-[#9a6d19]" />
                      Please update request {activeBannerPr.prNumber}.
                    </h3>
                  </div>
                  <p className="mt-1.5 text-xs text-[#5e6a78] dark:text-[#d1dae2]">
                    Review the feedback below, make the requested changes, and submit it again.
                    {activeBannerPr.latestReturnReason && (
                      <span className="mt-1 block rounded border border-[#fae5b8] bg-[#fffcf5] p-2 text-xs font-medium text-[#7d5615] dark:border-[#523d1a] dark:bg-[#20180d] dark:text-[#f3cd82]">
                        Feedback: &ldquo;{activeBannerPr.latestReturnReason}&rdquo;
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                <Button
                  size="sm"
                  onClick={() => setSelectedPrForModal(activeBannerPr)}
                  className="h-8 rounded-[4px] bg-[#9a6d19] px-3 text-xs font-semibold text-white hover:bg-[#7e5712] shadow-xs"
                >
                  <Eye className="mr-1.5 h-3.5 w-3.5" />
                  Review Comments &amp; Edit
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setDismissedBannerIds((prev) => ({ ...prev, [activeBannerPr.id]: true }))}
                  className="h-8 w-8 text-[#8b95a1] hover:text-[#2c3644] dark:text-[#aeb9c4]"
                  title="Dismiss banner"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {activeBannerCategory === "rejected" && activeBannerPr && (
          <div className="relative rounded-lg border border-[#f3c8c8] bg-gradient-to-r from-[#fef7f7] via-[#fff9f9] to-[#ffffff] p-4.5 shadow-sm dark:border-[#5e2727] dark:from-[#2a1414] dark:via-[#2d1b1d] dark:to-[#1a232c]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-[#fee8e8] text-[#a52a2a] dark:bg-[#431c1c] dark:text-[#fca5a5]">
                  <Info className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-[#fedbdb] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#8b1e1e] dark:bg-[#4d1f1f] dark:text-[#fca5a5]">
                      DISAPPROVED / CANCELLED
                    </span>
                    <h3 className="flex items-center gap-1.5 text-sm font-bold text-[#2a3442] dark:text-[#f1f5f8]">
                      <Info className="h-4 w-4 shrink-0 text-[#a52a2a]" />
                      Request {activeBannerPr.prNumber} could not proceed.
                    </h3>
                  </div>
                  <p className="mt-1.5 text-xs text-[#5e6a78] dark:text-[#d1dae2]">
                    Review the note below. Contact the Procurement Office if you are unsure what to do next.
                    {activeBannerPr.latestRejectionReason && (
                      <span className="mt-1 block rounded border border-[#fbd3d3] bg-[#fffaf9] p-2 text-xs font-medium text-[#932323] dark:border-[#522121] dark:bg-[#201010] dark:text-[#fca5a5]">
                        Note: &ldquo;{activeBannerPr.latestRejectionReason}&rdquo;
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                <Button
                  size="sm"
                  onClick={() => setSelectedPrForModal(activeBannerPr)}
                  className="h-8 rounded-[4px] bg-[#7b1e1e] px-3 text-xs font-semibold text-white hover:bg-[#641818] shadow-xs"
                >
                  <Info className="mr-1.5 h-3.5 w-3.5" />
                  View explanation
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setDismissedBannerIds((prev) => ({ ...prev, [activeBannerPr.id]: true }))}
                  className="h-8 w-8 text-[#8b95a1] hover:text-[#2c3644] dark:text-[#aeb9c4]"
                  title="Dismiss banner"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {activeBannerCategory === "successful" && activeBannerPr && (
          <div className="relative rounded-lg border border-[#b2e5cb] bg-gradient-to-r from-[#f0fbf5] via-[#f5fdf9] to-[#ffffff] p-4.5 shadow-sm dark:border-[#225838] dark:from-[#11291b] dark:via-[#173522] dark:to-[#1a232c]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-[#ddf7e8] text-[#136a43] dark:bg-[#1a442b] dark:text-[#86efac]">
                  <PartyPopper className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-[#c8eed9] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#0e5c38] dark:bg-[#205335] dark:text-[#86efac]">
                      AWARDED &amp; COMPLETED
                    </span>
                    <h3 className="flex items-center gap-1.5 text-sm font-bold text-[#2a3442] dark:text-[#f1f5f8]">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-[#136a43]" />
                      Request {activeBannerPr.prNumber} is complete.
                    </h3>
                  </div>
                  <p className="mt-1.5 text-xs text-[#5e6a78] dark:text-[#d1dae2]">
                    The approved amount is{" "}
                    <span className="font-semibold font-mono text-[#136a43] dark:text-[#86efac]">
                      {formatMoney(activeBannerPr.totalEstimate)}
                    </span>
                    . Open the request details to review the outcome or delivery progress.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                <Button
                  size="sm"
                  onClick={() => setSelectedPrForModal(activeBannerPr)}
                  className="h-8 rounded-[4px] bg-[#0f766e] px-3 text-xs font-semibold text-white hover:bg-[#0c5f59] shadow-xs"
                >
                  <Award className="mr-1.5 h-3.5 w-3.5" />
                  View Approval Details
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setDismissedBannerIds((prev) => ({ ...prev, [activeBannerPr.id]: true }))}
                  className="h-8 w-8 text-[#8b95a1] hover:text-[#2c3644] dark:text-[#aeb9c4]"
                  title="Dismiss banner"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Friendly guidance banner if no high-priority alert is active */}
        {!activeBannerCategory && userPrs.length > 0 && (
          <div className="rounded-lg border border-[#e4dfd5] bg-gradient-to-r from-[#fbf9f5] to-white p-4 shadow-xs dark:border-[#384554] dark:from-[#1b2229] dark:to-[#1a232c]">
            <div className="flex items-center gap-3">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded bg-[#f3ede1] text-[#7b1e1e] dark:bg-[#341f1f] dark:text-[#ff837a]">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-[#2f3946] dark:text-[#f1f5f8]">
                  Nothing needs your attention right now.
                </p>
                <p className="text-[11px] text-[#707c8a] dark:text-[#aeb9c4]">
                  {activePrs.length} request{activePrs.length === 1 ? " is" : "s are"} being reviewed. We’ll show any requested changes or important updates here.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLocation("/purchase-requests?create=1")}
                className="hidden sm:inline-flex h-7 text-xs font-medium shrink-0"
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                New request
              </Button>
            </div>
          </div>
        )}
      </section>

      {/* 1. Metrics Cards (KPIs) Grid */}
      <section className="mt-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {/* Request status summaries */}
          <PersonalKpiCard
            label="In progress"
            count={activePrs.length}
            subtitle="Requests currently being reviewed"
            detail="Select to view these requests"
            tone="blue"
            icon={Layers}
            isActive={selectedCategory === "active"}
            onClick={() => setSelectedCategory(selectedCategory === "active" ? "all" : "active")}
          />

          {/* 2. Returned for Revision */}
          <PersonalKpiCard
            label="Changes requested"
            count={returnedPrs.length}
            subtitle="Requests that need an update from you"
            detail="Open a request to read the feedback"
            tone="amber"
            icon={FileEdit}
            highlightBadge={returnedPrs.length > 0 ? "ACTION NEEDED" : undefined}
            isActive={selectedCategory === "returned"}
            onClick={() => setSelectedCategory(selectedCategory === "returned" ? "all" : "returned")}
          />

          {/* 3. Successful / Completed PRs */}
          <PersonalKpiCard
            label="Completed"
            count={successfulPrs.length}
            subtitle="Requests that have been approved"
            detail="Select to review completed requests"
            tone="emerald"
            icon={CheckCircle2}
            isActive={selectedCategory === "successful"}
            onClick={() => setSelectedCategory(selectedCategory === "successful" ? "all" : "successful")}
          />

          {/* 4. Rejected / Cancelled */}
          <PersonalKpiCard
            label="Could not proceed"
            count={rejectedPrs.length}
            subtitle="Requests that were not approved"
            detail="Open a request to read the explanation"
            tone="rose"
            icon={Ban}
            isActive={selectedCategory === "rejected"}
            onClick={() => setSelectedCategory(selectedCategory === "rejected" ? "all" : "rejected")}
          />
        </div>
      </section>

      {/* PR Register & Table Filter Section */}
      <section className="flat-panel mt-6">
        <div className="border-b border-[#ece8df] px-4 py-4 sm:px-6 dark:border-[#384554]">
          <div className="flex flex-col gap-3.5 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-semibold text-[#2c3644] dark:text-[#f1f5f8]">
                  All your requests
                </h3>
                <span className="rounded-[4px] border border-[#e2d5bd] bg-[#fffaf0] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#8a6520] dark:border-[#52411e] dark:bg-[#251d10] dark:text-[#f0c36a]">
                  YOUR REQUESTS
                </span>
              </div>
              <p className="mt-1 text-xs text-[#707c8a] dark:text-[#aeb9c4]">
                Select a request to see its progress, feedback, and available next steps. Choose a status below to narrow the list.
              </p>
            </div>

            {/* Filter Pills & Search Box */}
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center shrink-0">
              {/* Category Filter Tabs — suppress zero-count unselected pills */}
              <div className="flex flex-wrap items-center gap-1 rounded-md border border-border bg-card p-0.5 text-xs shadow-xs">
                {(
                  [
                    { id: "all", label: "All requests", count: userPrs.length },
                    { id: "active", label: "In progress", count: activePrs.length },
                    { id: "returned", label: "Changes requested", count: returnedPrs.length },
                    { id: "successful", label: "Completed", count: successfulPrs.length },
                    { id: "rejected", label: "Could not proceed", count: rejectedPrs.length },
                  ] as const
                ).filter((tab) => tab.id === "all" || tab.count > 0 || selectedCategory === tab.id).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSelectedCategory(tab.id)}
                    className={`rounded px-2.5 py-1 text-xs font-semibold transition ${
                      selectedCategory === tab.id
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tab.label}{tab.count > 0 ? ` (${tab.count})` : ""}
                  </button>
                ))}
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-60">
                <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#8b95a1]" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search number or purpose..."
                  className="h-8 w-full pl-8 text-xs"
                />
              </div>
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchQuery("")}
                  className="h-8 text-xs shrink-0"
                >
                  Reset
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Table Content */}
        {isLoading ? (
          <div className="p-12 text-center text-xs text-[#77818d] dark:text-[#aeb9c4]">
            Loading your personal purchase requests...
          </div>
        ) : filteredPrs.length ? (
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-xs">
              <thead className="border-b border-border bg-muted/50 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-5 py-3.5">Request number</th>
                  <th className="px-4 py-3.5">Purpose</th>
                  <th className="px-4 py-3.5">Status and progress</th>
                  <th className="px-4 py-3.5 text-right">Submitted</th>
                  <th className="px-4 py-3.5 text-center">Next step</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredPrs.map((pr) => {
                      const prStatusInfo = getEndUserRequestStatus(pr.status);
                  const isReturned = pr.status === "returned";
                  const isRejected = pr.status === "rejected" || pr.status === "cancelled";
                  const isSuccessful = ["approved", "po", "po_issued", "delivered", "pmr_logged", "closed"].includes(pr.status);
                  const hasFeedback = isReturned || isRejected;
                  const workflowStageInfo = getWorkflowStageInfo(pr.status);
                  const isWorkflowComplete = ["pmr_logged", "closed"].includes(pr.status);
                  const isFinalWorkflowStage = workflowStageInfo.stageIndex === workflowStageInfo.stageCount - 1;
                  const workflowPercent = isFinalWorkflowStage ? 100 : workflowStageInfo.percent;
                  const workflowProgressText = isReturned
                    ? "Action needed · make changes and resubmit"
                    : isRejected
                      ? `Stopped · ${prStatusInfo.label}`
                      : isWorkflowComplete
                        ? "Complete"
                        : `Step ${workflowStageInfo.stageIndex + 1} of ${workflowStageInfo.stageCount}`;

                  return (
                    <tr
                      key={pr.id}
                      className="hover:bg-accent/40 transition-colors cursor-pointer"
                      onClick={() => setSelectedPrForModal(pr)}
                    >
                      {/* Column 1: PR Number + creation date subtitle */}
                      <td className="px-5 py-3">
                        <p className="font-semibold text-primary">{pr.prNumber}</p>
                        {pr.trackingToken && (
                          <p className="mt-0.5 text-[10px] text-muted-foreground" title={`Token: ${pr.trackingToken}`}>
                            {pr.trackingToken.slice(0, 8)}…
                          </p>
                        )}
                      </td>

                      {/* Column 2: Purpose */}
                      <td className="max-w-[320px] px-4 py-3 text-foreground">
                        <p className="line-clamp-2 break-words font-medium leading-snug" title={pr.purpose}>{pr.purpose}</p>
                      </td>

                      {/* Column 3: Status + inline feedback indicator */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <StatusBadge
                            tone={
                              isSuccessful ? "approved"
                              : isReturned ? "pending"
                              : isRejected ? "returned"
                              : pr.status.includes("review") || ["rfq", "po"].includes(pr.status) ? "active"
                              : "draft"
                            }
                          >
                            {prStatusInfo.label.toUpperCase()}
                          </StatusBadge>
                          <div className="mt-0.5 max-w-[280px] min-w-[170px]">
                            <div
                              role="progressbar"
                              aria-label={`${pr.prNumber}: ${workflowProgressText}`}
                              aria-valuemin={0}
                              aria-valuemax={100}
                              aria-valuenow={workflowPercent}
                              aria-valuetext={workflowProgressText}
                              className="h-1.5 overflow-hidden rounded-full bg-muted"
                            >
                              <div
                                aria-hidden="true"
                                className={`h-full rounded-full transition-[width] duration-300 ${
                                  isRejected ? "bg-destructive" : isReturned ? "bg-amber-500" : isWorkflowComplete ? "bg-emerald-600" : "bg-primary"
                                }`}
                                style={{ width: `${workflowPercent}%` }}
                              />
                            </div>
                            <p className={`mt-1 text-[10px] leading-tight ${
                              isRejected ? "text-destructive" : isReturned ? "text-amber-700 dark:text-amber-300" : isWorkflowComplete ? "text-emerald-700 dark:text-emerald-300" : "text-muted-foreground"
                            }`}>
                              {workflowProgressText}
                            </p>
                          </div>
                          {/* Compact inline feedback indicator — clicking opens full modal */}
                          {hasFeedback && (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setSelectedPrForModal(pr); }}
                              className={`inline-flex items-center gap-1 text-[10px] font-medium leading-4 ${
                                isReturned ? "text-[#9a6d19] dark:text-[#f0c36a]" : "text-[#a52a2a] dark:text-[#fca5a5]"
                              }`}
                              title={isReturned ? (pr.latestReturnReason || "Returned for revision") : (pr.latestRejectionReason || "Disapproved")}
                            >
                              {isReturned ? <FileEdit className="h-3 w-3 shrink-0" /> : <Ban className="h-3 w-3 shrink-0" />}
                              <span className="truncate max-w-[120px]">
                                {isReturned
                                  ? (pr.latestReturnReason?.slice(0, 30) || "Read feedback") + (pr.latestReturnReason && pr.latestReturnReason.length > 30 ? "…" : "")
                                  : (pr.latestRejectionReason?.slice(0, 30) || "Read explanation") + (pr.latestRejectionReason && pr.latestRejectionReason.length > 30 ? "…" : "")}
                              </span>
                            </button>
                          )}
                          {isSuccessful && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#0f766e] dark:text-[#86efac]">
                              <CheckCircle2 className="h-3 w-3 shrink-0" />Approved
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Column 4: Date */}
                      <td className="px-4 py-3 text-right text-[11px] text-muted-foreground whitespace-nowrap">
                        {new Date(pr.createdAt).toLocaleDateString("en-PH")}
                      </td>

                      {/* Column 5: Action */}
                      <td className="px-4 py-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedPrForModal(pr)}
                          className={`h-7 px-2.5 text-[11px] font-medium ${
                            isReturned
                              ? "border-[#d8a834] bg-[#fffaf0] text-[#8a6520] hover:bg-[#faeed2] dark:border-[#635028] dark:bg-[#251d10] dark:text-[#f0c36a]"
                              : isRejected
                              ? "border-[#e28c8c] bg-[#fff5f5] text-[#932323] hover:bg-[#fedcdc] dark:border-[#6b2525] dark:bg-[#251212] dark:text-[#fca5a5]"
                              : "border-border text-muted-foreground hover:bg-accent"
                          }`}
                        >
                          {isReturned ? (
                            <><FileEdit className="mr-1 h-3 w-3" />Update</>
                          ) : isRejected ? (
                            <><Info className="mr-1 h-3 w-3" />Reason</>
                          ) : (
                            <><Eye className="mr-1 h-3 w-3" />Open</>
                          )}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center">
            <EmptyWorkspace
              eyebrow="Filter results"
              title={
                selectedCategory === "all"
                  ? "No Purchase Requests created yet"
                  : `No ${selectedCategory} Purchase Requests found`
              }
              description={
                searchQuery
                  ? "No requests matched your search query. Try clearing the filter or searching by a different term."
                  : "Start by planning your procurement and submitting your first itemized Purchase Request."
              }
              actionLabel="Create Purchase Request"
              actionOnClick={() => setLocation("/purchase-requests?create=1")}
            />
          </div>
        )}
      </section>

      {/* 2. Contextual Feedback Modal (Dialog) */}
      {selectedPrForModal && (
        <Dialog open={Boolean(selectedPrForModal)} onOpenChange={(open) => !open && setSelectedPrForModal(null)}>
          <DialogContent className="max-w-xl border-[#dcd7cb] bg-white p-6 dark:border-[#384554] dark:bg-[#1b2229]">
            <DialogHeader>
              <div className="flex items-center gap-2">
                {selectedPrForModal.status === "returned" ? (
                  <span className="grid h-7 w-7 place-items-center rounded bg-[#faeed2] text-[#936418] dark:bg-[#3a2c16] dark:text-[#f4d081]">
                    <FileEdit className="h-4 w-4" />
                  </span>
                ) : selectedPrForModal.status === "rejected" || selectedPrForModal.status === "cancelled" ? (
                  <span className="grid h-7 w-7 place-items-center rounded bg-[#fee8e8] text-[#a52a2a] dark:bg-[#431c1c] dark:text-[#fca5a5]">
                    <Ban className="h-4 w-4" />
                  </span>
                ) : (
                  <span className="grid h-7 w-7 place-items-center rounded bg-[#ddf7e8] text-[#136a43] dark:bg-[#1a442b] dark:text-[#86efac]">
                    <PartyPopper className="h-4 w-4" />
                  </span>
                )}
                <div>
                  <DialogTitle className="text-base font-bold text-[#202833] dark:text-[#f1f5f8]">
                    {selectedPrForModal.status === "returned"
                      ? `Changes requested: ${selectedPrForModal.prNumber}`
                      : selectedPrForModal.status === "rejected" || selectedPrForModal.status === "cancelled"
                        ? `Request update: ${selectedPrForModal.prNumber}`
                        : `Request details: ${selectedPrForModal.prNumber}`}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-[#707c8a] dark:text-[#aeb9c4]">
                    {selectedPrForModal.purpose}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="mt-4 space-y-4 text-xs">
              {/* Key PR Metadata Summary — includes Estimated ABC (moved from table) */}
              <div className="grid grid-cols-2 gap-2.5 rounded border border-border bg-muted/30 p-3 text-[11px]">
                <div>
                  <span className="text-muted-foreground">Current status:</span>
                  <div className="mt-0.5">
                    <StatusBadge
                      tone={
                        selectedPrForModal.status === "returned"
                          ? "pending"
                          : selectedPrForModal.status === "rejected"
                          ? "returned"
                          : ["approved", "po_issued", "delivered", "closed"].includes(selectedPrForModal.status)
                          ? "approved"
                          : "active"
                      }
                    >
                      {getEndUserRequestStatus(selectedPrForModal.status).label.toUpperCase()}
                    </StatusBadge>
                  </div>
                </div>

                <div>
                  <span className="text-muted-foreground">Estimated total:</span>
                  <p className="mt-0.5 font-mono font-bold text-sm text-foreground">
                    {formatMoney(selectedPrForModal.totalEstimate)}
                  </p>
                </div>

                <div>
                  <span className="text-muted-foreground">Date Created:</span>
                  <p className="mt-0.5 font-medium text-foreground">
                    {new Date(selectedPrForModal.createdAt).toLocaleDateString("en-PH", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>

                <div>
                  <span className="text-muted-foreground">Tracking code:</span>
                  <p className="mt-0.5 font-mono font-medium text-primary">
                    {selectedPrForModal.trackingToken || "Pending"}
                  </p>
                </div>
              </div>

              {/* Status Explanation from Procurement Rules */}
              <div className="rounded border border-[#e8e2d5] bg-white p-3 dark:border-[#384554] dark:bg-[#1a232c]">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#8b95a1] dark:text-[#aeb9c4]">
                  What this means
                </p>
                <p className="mt-1 text-xs leading-5 text-[#465261] dark:text-[#d1dae2]">
                  {getEndUserRequestStatus(selectedPrForModal.status).meaning}
                </p>
              </div>

              {/* Contextual Feedback Callout Box */}
              {selectedPrForModal.status === "returned" ? (
                <div className="rounded-md border border-[#f1d28c] bg-[#fffaf0] p-4 text-[#795010] dark:border-[#5a431c] dark:bg-[#251d10] dark:text-[#f4d081]">
                  <div className="flex items-center gap-1.5 font-bold">
                    <FileEdit className="h-4 w-4 text-[#9a6d19]" />
                    <span>Feedback</span>
                  </div>
                  <p className="mt-2 rounded border border-[#fae5b8] bg-white p-2.5 text-xs font-semibold italic text-[#63430f] dark:border-[#4d3615] dark:bg-[#1a140b] dark:text-[#fcd88b]">
                    &ldquo;{selectedPrForModal.latestReturnReason || "Please update the item details or add the supplier quotes requested by the reviewer."}&rdquo;
                  </p>
                  <div className="mt-3 text-[11px] leading-4 text-[#795010] dark:text-[#f4d081]">
                    <p className="font-bold">How to update it:</p>
                    <ol className="mt-1 list-decimal list-inside space-y-1">
                      <li>Open this request from My Purchase Requests.</li>
                      <li>Make the requested changes or add the missing documents.</li>
                      <li>Choose &ldquo;Resubmit&rdquo; when you are finished.</li>
                    </ol>
                  </div>
                </div>
              ) : selectedPrForModal.status === "rejected" || selectedPrForModal.status === "cancelled" ? (
                <div className="rounded-md border border-[#f3c8c8] bg-[#fef7f7] p-4 text-[#8b1e1e] dark:border-[#5e2727] dark:bg-[#281313] dark:text-[#fca5a5]">
                  <div className="flex items-center gap-1.5 font-bold">
                    <Ban className="h-4 w-4 text-[#a52a2a]" />
                    <span>Why this request could not proceed</span>
                  </div>
                  <p className="mt-2 rounded border border-[#fbd3d3] bg-white p-2.5 text-xs font-semibold italic text-[#771515] dark:border-[#522121] dark:bg-[#1a0c0c] dark:text-[#fca5a5]">
                    &ldquo;{selectedPrForModal.latestRejectionReason || "The request could not proceed due to budgetary or specification constraints under RA 12009 (NGPA) guidelines."}&rdquo;
                  </p>
                  <div className="mt-3 text-[11px] leading-4 text-[#8b1e1e] dark:text-[#fca5a5]">
                    <p className="font-bold">What you can do:</p>
                    <ul className="mt-1 list-disc list-inside space-y-1">
                      <li>Check the explanation above and confirm the request details with your department.</li>
                      <li>Contact the Procurement Office if you need help understanding the decision.</li>
                      <li>You can start a new request with updated information.</li>
                    </ul>
                  </div>
                </div>
              ) : ["approved", "po_issued", "delivered", "closed"].includes(selectedPrForModal.status) ? (
                <div className="rounded-md border border-[#b2e5cb] bg-[#f0fbf5] p-4 text-[#0e5c38] dark:border-[#225838] dark:bg-[#11291b] dark:text-[#86efac]">
                  <div className="flex items-center gap-1.5 font-bold">
                    <Award className="h-4 w-4 text-[#136a43]" />
                    <span>Request approved</span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-[#136a43] dark:text-[#86efac]">
                    Your request has been approved. The purchase order or delivery may still be in progress; open the request for the latest update.
                  </p>
                </div>
              ) : (
                <div className="rounded-md border border-[#cbe1f3] bg-[#f3f9fe] p-4 text-[#20517d] dark:border-[#1e3f5e] dark:bg-[#122436] dark:text-[#93c5fd]">
                  <div className="flex items-center gap-1.5 font-bold">
                    <Clock className="h-4 w-4 text-[#20517d]" />
                    <span>What is happening now</span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-[#2c5f8e] dark:text-[#93c5fd]">
                    Your request is being checked by the relevant offices. We will notify you if they need more information.
                  </p>
                </div>
              )}
            </div>

            <DialogFooter className="mt-5 gap-2 sm:gap-0">
              <Button variant="outline" size="sm" onClick={() => setSelectedPrForModal(null)} className="h-8 text-xs">
                Close
              </Button>
              {selectedPrForModal.status === "returned" ? (
                <Button
                  size="sm"
                  onClick={() => {
                    setSelectedPrForModal(null);
                    setLocation("/purchase-requests");
                  }}
                  className="h-8 rounded-[4px] bg-[#9a6d19] px-4 text-xs font-semibold text-white hover:bg-[#7e5712]"
                >
                  <FileEdit className="mr-1.5 h-3.5 w-3.5" />
                  Update and resubmit
                </Button>
              ) : selectedPrForModal.status === "rejected" || selectedPrForModal.status === "cancelled" ? (
                <Button
                  size="sm"
                  onClick={() => {
                    setSelectedPrForModal(null);
                    setLocation("/purchase-requests?create=1");
                  }}
                  className="h-8 rounded-[4px] bg-[#7b1e1e] px-4 text-xs font-semibold text-white hover:bg-[#641818]"
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Start a new request
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => {
                    setSelectedPrForModal(null);
                    setLocation("/purchase-requests");
                  }}
                  className="h-8 rounded-[4px] bg-[#7b1e1e] px-4 text-xs font-semibold text-white hover:bg-[#641818]"
                >
                  <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                  View my requests
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
// PERSONAL KPI CARD COMPONENT
// ============================================================================
function PersonalKpiCard({
  label,
  count,
  subtitle,
  detail,
  tone,
  icon: Icon,
  highlightBadge,
  isActive,
  onClick,
}: {
  label: string;
  count: number;
  subtitle: string;
  detail: string;
  tone: "blue" | "amber" | "emerald" | "rose";
  icon: any;
  highlightBadge?: string;
  isActive?: boolean;
  onClick?: () => void;
}) {
  const styles = {
    blue: {
      bg: "hover:border-[#adcceb] dark:hover:border-[#2f5580]",
      badge: "bg-[#eaf3fc] text-[#245b91] dark:bg-[#172c42] dark:text-[#93c5fd]",
      icon: "text-[#245b91] dark:text-[#93c5fd]",
      value: "text-[#1d4d7a] dark:text-[#bfdbfe]",
      activeRing: "ring-2 ring-[#245b91]",
    },
    amber: {
      bg: "hover:border-[#edd195] dark:hover:border-[#6b5220]",
      badge: "bg-[#fdf5e2] text-[#936418] dark:bg-[#342410] dark:text-[#f8d486]",
      icon: "text-[#936418] dark:text-[#f8d486]",
      value: "text-[#855a15] dark:text-[#fcd34d]",
      activeRing: "ring-2 ring-[#936418]",
    },
    emerald: {
      bg: "hover:border-[#a3dfc0] dark:hover:border-[#225739]",
      badge: "bg-[#eaf8f0] text-[#136a43] dark:bg-[#122e20] dark:text-[#86efac]",
      icon: "text-[#136a43] dark:text-[#86efac]",
      value: "text-[#0e5c38] dark:text-[#6ee7b7]",
      activeRing: "ring-2 ring-[#136a43]",
    },
    rose: {
      bg: "hover:border-[#f3baba] dark:hover:border-[#632727]",
      badge: "bg-[#fdf0f0] text-[#9c2525] dark:bg-[#341818] dark:text-[#fca5a5]",
      icon: "text-[#9c2525] dark:text-[#fca5a5]",
      value: "text-[#8a1c1c] dark:text-[#f87171]",
      activeRing: "ring-2 ring-[#9c2525]",
    },
  }[tone];

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={Boolean(isActive)}
      className={`flat-panel min-w-0 cursor-pointer p-4.5 text-left transition-all select-none hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${styles.bg} ${
        isActive ? styles.activeRing : ""
      }`}
    >
      <div className="flex items-center justify-between gap-1">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider truncate ${styles.badge}`}
        >
          <Icon className="h-3 w-3 shrink-0" />
          <span className="truncate">{label}</span>
        </span>
        {highlightBadge ? (
          <span className="animate-pulse rounded bg-[#9a6d19] px-1.5 py-0.5 text-[9px] font-bold text-white shadow-xs">
            {highlightBadge}
          </span>
        ) : (
          <Icon className={`h-4 w-4 shrink-0 ${styles.icon}`} />
        )}
      </div>

      <p className={`mt-3 truncate font-display text-2xl font-bold tracking-tight sm:text-3xl ${styles.value}`}>
        {count.toLocaleString()}
      </p>

      <p className="mt-1 line-clamp-1 text-xs font-semibold text-[#485362] dark:text-[#f1f5f8]" title={subtitle}>
        {subtitle}
      </p>

      <p className="mt-0.5 line-clamp-1 text-[11px] leading-4 text-[#798593] dark:text-[#aeb9c4]" title={detail}>
        {detail}
      </p>
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
              "Procurement Staff/BAC validate supplier quotations and prepare the official Abstract of Quotations for BAC/HoPE decision.",
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
      condition: "Draft formal Letter of Notice for the awarded supplier.",
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

