import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { EmptyWorkspace } from "@/components/EmptyWorkspace";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { DataTableToolbar } from "@/components/common/DataTableToolbar";
import { TablePagination } from "@/components/common/TablePagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useSupabaseRealtime } from "@/hooks/useSupabaseRealtime";
import { normalizeProcurementRole } from "../../../shared/procurementRules";
import { CheckCircle2, LoaderCircle, Printer } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

const statusTone = (status: string) =>
  status === "issued" || status === "sent" || status === "acknowledged" || status === "served"
    ? "approved"
    : status === "cancelled"
      ? "returned"
      : "draft";

export function NoticeWorkflowPage() {
  const { user } = useAuth();
  const role = normalizeProcurementRole(user?.role ?? "end_user");

  if (role === "hope" || role === "administrative_approver") {
    return <HopeNoticeApprovalQueue />;
  }

  return <NoticesPage />;
}

export function HopeNoticeApprovalQueue() {
  const notices = trpc.procurement.officer.notices.list.useQuery(undefined, { retry: false });
  const dashboard = trpc.procurement.dashboard.useQuery(undefined, { retry: false });
  const setup = trpc.procurement.setup.details.useQuery(undefined, { retry: false });
  const utils = trpc.useUtils();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  useSupabaseRealtime({
    recordTypes: ["letter_of_notice"],
    onRecordChanged: () => utils.procurement.officer.notices.list.invalidate(),
  });

  const approve = trpc.procurement.officer.notices.approve.useMutation({
    onSuccess: (notice) => {
      toast.success(`Notice ${notice.noticeNumber} approved; contract entry recorded.`);
      void utils.procurement.officer.notices.list.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const prMap = useMemo(() => {
    const map = new Map<number, string>();
    (dashboard.data?.purchaseRequests ?? []).forEach((pr) => map.set(pr.id, pr.prNumber));
    return map;
  }, [dashboard.data?.purchaseRequests]);

  const supplierMap = useMemo(() => {
    const map = new Map<number, string>();
    (setup.data?.suppliers ?? []).forEach((s) => map.set(s.id, s.companyName));
    return map;
  }, [setup.data?.suppliers]);

  const awardNotices = useMemo(() => {
    return (notices.data ?? []).filter((notice) => notice.noticeType === "award");
  }, [notices.data]);

  const filteredRecords = useMemo(() => {
    return awardNotices.filter((item) => {
      const prNumber = item.purchaseRequestId ? prMap.get(item.purchaseRequestId) ?? "" : "";
      const supplierName = item.supplierId ? supplierMap.get(item.supplierId) ?? "" : "";
      const q = searchQuery.toLowerCase().trim();

      const matchesSearch =
        q === "" ||
        item.noticeNumber?.toLowerCase().includes(q) ||
        item.subject?.toLowerCase().includes(q) ||
        item.body?.toLowerCase().includes(q) ||
        prNumber.toLowerCase().includes(q) ||
        supplierName.toLowerCase().includes(q);

      const matchesStatus = statusFilter === "ALL" || item.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [awardNotices, prMap, supplierMap, searchQuery, statusFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / itemsPerPage));
  const paginatedRecords = filteredRecords.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="mx-auto max-w-[1240px]">
      <PageHeader
        eyebrow="Procedure 5.9 · HoPE review"
        title="Notice of Award approvals"
        description="Review the notice prepared by Procurement Staff. Approval records contract entry and releases the notice for service to the supplier."
      />

      <section className="flat-panel mt-7 overflow-hidden p-5">
        <DataTableToolbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search by notice number, PR number, supplier, or subject..."
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          statusOptions={[
            { label: "All Statuses", value: "ALL" },
            { label: "Awaiting HoPE Approval", value: "pending_hope_approval" },
            { label: "Issued / Approved", value: "issued" },
            { label: "Served to Supplier", value: "served" },
          ]}
          totalCount={awardNotices.length}
          filteredCount={filteredRecords.length}
        />

        {notices.isLoading ? (
          <div className="flex items-center gap-2 py-8 text-base text-slate-600 dark:text-slate-400">
            <LoaderCircle className="h-5 w-5 animate-spin" /> Loading submitted notices...
          </div>
        ) : awardNotices.length === 0 ? (
          <div className="py-4">
            <EmptyWorkspace
              eyebrow="HoPE approvals"
              title="No award notices have been submitted yet."
              description="Notices prepared by Procurement Staff will appear here for review."
            />
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="my-6 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-10 text-center dark:border-slate-700 dark:bg-slate-900">
            <p className="text-lg font-bold text-slate-900 dark:text-white">
              No matching records found
            </p>
            <p className="mt-1 text-base text-slate-600 dark:text-slate-400">
              We couldn't find any entries matching "{searchQuery}". Try checking for typos or resetting your filters.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("ALL");
              }}
              className="mt-4 min-h-12 rounded-xl bg-[#881337] px-6 py-3 text-base font-bold text-white hover:bg-[#6b0f2b]"
            >
              Clear Filters & Show All Records
            </button>
          </div>
        ) : (
          <>
            <div className="divide-y-2 divide-slate-200 rounded-xl border-2 border-slate-200 dark:divide-slate-800 dark:border-slate-800">
              {paginatedRecords.map((notice) => {
                const prNumber = notice.purchaseRequestId
                  ? prMap.get(notice.purchaseRequestId) ?? `PR #${notice.purchaseRequestId}`
                  : null;
                const supplierName = notice.supplierId
                  ? supplierMap.get(notice.supplierId) ?? `Supplier #${notice.supplierId}`
                  : null;

                return (
                  <article
                    key={notice.id}
                    className="grid gap-4 p-5 md:grid-cols-[1fr_auto] md:items-start"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-bold text-slate-900 dark:text-white">
                          {notice.subject}
                        </h2>
                        <StatusBadge
                          tone={notice.status === "pending_hope_approval" ? "pending" : statusTone(notice.status)}
                        >
                          {notice.status === "pending_hope_approval"
                            ? "AWAITING APPROVAL"
                            : notice.status.replaceAll("_", " ").toUpperCase()}
                        </StatusBadge>
                      </div>
                      <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-400">
                        <span className="font-mono font-bold text-[#881337] dark:text-rose-400">
                          {notice.noticeNumber}
                        </span>
                        {prNumber ? ` · ${prNumber}` : ""}
                        {supplierName ? ` · ${supplierName}` : ""}
                      </p>
                      <p className="mt-3 whitespace-pre-wrap text-base leading-relaxed text-slate-700 dark:text-slate-300">
                        {notice.body}
                      </p>
                    </div>
                    {notice.status === "pending_hope_approval" && (
                      <Button
                        type="button"
                        disabled={approve.isPending}
                        onClick={() => approve.mutate({ noticeId: notice.id })}
                        className="min-h-12 rounded-xl bg-[#27633b] px-6 py-3 text-base font-bold text-white hover:bg-[#1e4d2e]"
                      >
                        {approve.isPending ? (
                          <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="mr-2 h-5 w-5" />
                        )}
                        Approve & enter into contract
                      </Button>
                    )}
                  </article>
                );
              })}
            </div>

            <TablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </section>
    </div>
  );
}

export function NoticesPage() {
  const dashboard = trpc.procurement.dashboard.useQuery(undefined, { retry: false });
  const setup = trpc.procurement.setup.details.useQuery(undefined, { retry: false });
  const notices = trpc.procurement.officer.notices.list.useQuery(undefined, { retry: false });
  const utils = trpc.useUtils();
  const [, setLocation] = useLocation();

  const [purchaseRequestId, setPurchaseRequestId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [demandDueDate, setDemandDueDate] = useState("");
  const [noticeType, setNoticeType] = useState<
    "award" | "disqualification" | "clarification" | "demand" | "other"
  >("award");

  // Search, Filter & Pagination State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const create = trpc.procurement.officer.notices.create.useMutation({
    onSuccess: () => {
      toast.success("Letter of Notice saved.");
      void utils.procurement.officer.notices.list.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const prMap = useMemo(() => {
    const map = new Map<number, string>();
    (dashboard.data?.purchaseRequests ?? []).forEach((pr) => map.set(pr.id, pr.prNumber));
    return map;
  }, [dashboard.data?.purchaseRequests]);

  const supplierMap = useMemo(() => {
    const map = new Map<number, string>();
    (setup.data?.suppliers ?? []).forEach((s) => map.set(s.id, s.companyName));
    return map;
  }, [setup.data?.suppliers]);

  const allNotices = notices.data ?? [];

  const filteredRecords = useMemo(() => {
    return allNotices.filter((item) => {
      const prNumber = item.purchaseRequestId ? prMap.get(item.purchaseRequestId) ?? "" : "";
      const supplierName = item.supplierId ? supplierMap.get(item.supplierId) ?? "" : "";
      const q = searchQuery.toLowerCase().trim();

      const matchesSearch =
        q === "" ||
        item.noticeNumber?.toLowerCase().includes(q) ||
        item.subject?.toLowerCase().includes(q) ||
        item.noticeType?.toLowerCase().includes(q) ||
        prNumber.toLowerCase().includes(q) ||
        supplierName.toLowerCase().includes(q);

      const matchesStatus = statusFilter === "ALL" || item.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [allNotices, prMap, supplierMap, searchQuery, statusFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / itemsPerPage));
  const paginatedRecords = filteredRecords.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="mx-auto max-w-[1240px]">
      <PageHeader
        eyebrow="Officer documents"
        title="Letters of Notice"
        description="Prepare, issue, and print controlled Letters of Notice linked to a Purchase Request and supplier."
      />

      <section className="flat-panel mt-7 p-6">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            create.mutate({
              noticeType,
              purchaseRequestId: purchaseRequestId ? Number(purchaseRequestId) : undefined,
              supplierId: supplierId ? Number(supplierId) : undefined,
              subject: String(form.get("subject") || ""),
              body: String(form.get("body") || ""),
              demandDueDate: demandDueDate ? new Date(demandDueDate) : undefined,
              issueNow: form.get("issueNow") === "on",
            });
          }}
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="w-full min-w-0">
              <Label className="mb-1.5 block text-base font-semibold text-slate-900 dark:text-slate-100">
                Notice type
              </Label>
              <Select value={noticeType} onValueChange={(value) => setNoticeType(value as typeof noticeType)}>
                <SelectTrigger className="min-h-12 text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="award">Notice of Award</SelectItem>
                  <SelectItem value="disqualification">Notice of Disqualification</SelectItem>
                  <SelectItem value="clarification">Notice of Clarification</SelectItem>
                  <SelectItem value="demand">Demand letter / notice of demand</SelectItem>
                  <SelectItem value="other">Other official notice</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-full min-w-0">
              <Label className="mb-1.5 block text-base font-semibold text-slate-900 dark:text-slate-100">
                Purchase Request
              </Label>
              <Select value={purchaseRequestId} onValueChange={setPurchaseRequestId}>
                <SelectTrigger className="min-h-12 text-base">
                  <SelectValue placeholder="Optional linked PR" />
                </SelectTrigger>
                <SelectContent>
                  {(dashboard.data?.purchaseRequests ?? []).map((pr) => (
                    <SelectItem key={pr.id} value={String(pr.id)}>
                      {pr.prNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-full min-w-0">
              <Label className="mb-1.5 block text-base font-semibold text-slate-900 dark:text-slate-100">
                Supplier
              </Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger className="min-h-12 text-base">
                  <SelectValue placeholder="Optional recipient supplier" />
                </SelectTrigger>
                <SelectContent>
                  {(setup.data?.suppliers ?? []).map((supplier) => (
                    <SelectItem key={supplier.id} value={String(supplier.id)}>
                      {supplier.companyName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-full min-w-0">
              <Label className="mb-1.5 block text-base font-semibold text-slate-900 dark:text-slate-100">
                Subject
              </Label>
              <Input name="subject" placeholder="Official notice subject" className="min-h-12 text-base" />
            </div>

            {noticeType === "demand" && (
              <div className="w-full min-w-0">
                <Label className="mb-1.5 block text-base font-semibold text-slate-900 dark:text-slate-100">
                  Delivery deadline
                </Label>
                <Input
                  type="date"
                  value={demandDueDate}
                  onChange={(event) => setDemandDueDate(event.target.value)}
                  required
                  className="min-h-12 text-base"
                />
                <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">
                  The system records a reminder three days before this deadline.
                </p>
              </div>
            )}

            <div className="md:col-span-2 xl:col-span-2">
              <Label className="mb-1.5 block text-base font-semibold text-slate-900 dark:text-slate-100">
                Notice body
              </Label>
              <Textarea
                name="body"
                required
                className="min-h-28 text-base"
                placeholder="State the official notice, action, and any applicable instruction."
              />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
            <label className="flex min-h-12 cursor-pointer items-center gap-3 text-base font-medium text-slate-700 dark:text-slate-300">
              <input name="issueNow" type="checkbox" className="h-5 w-5 accent-[#881337]" />
              Issue immediately
            </label>
            <Button
              disabled={create.isPending}
              className="min-h-12 rounded-xl bg-[#881337] px-6 py-3 text-base font-bold text-white hover:bg-[#6b0f2b]"
            >
              {create.isPending && <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />}
              Save Letter of Notice
            </Button>
          </div>
        </form>
      </section>

      <section className="flat-panel mt-6 overflow-hidden p-6">
        <div className="mb-2 border-b-2 border-slate-200 pb-4 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Notice Register</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Search, filter, and print official Letters of Notice.
          </p>
        </div>

        <DataTableToolbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search by notice number, subject, supplier, or PR number..."
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          statusOptions={[
            { label: "All Statuses", value: "ALL" },
            { label: "Draft", value: "draft" },
            { label: "Pending HoPE Approval", value: "pending_hope_approval" },
            { label: "Issued", value: "issued" },
            { label: "Served", value: "served" },
          ]}
          totalCount={allNotices.length}
          filteredCount={filteredRecords.length}
        />

        {allNotices.length === 0 ? (
          <p className="p-8 text-center text-base text-slate-600 dark:text-slate-400">
            No Letters of Notice have been created yet.
          </p>
        ) : filteredRecords.length === 0 ? (
          <div className="my-6 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-10 text-center dark:border-slate-700 dark:bg-slate-900">
            <p className="text-lg font-bold text-slate-900 dark:text-white">
              No matching records found
            </p>
            <p className="mt-1 text-base text-slate-600 dark:text-slate-400">
              We couldn't find any entries matching "{searchQuery}". Try checking for typos or resetting your filters.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("ALL");
              }}
              className="mt-4 min-h-12 rounded-xl bg-[#881337] px-6 py-3 text-base font-bold text-white hover:bg-[#6b0f2b]"
            >
              Clear Filters & Show All Records
            </button>
          </div>
        ) : (
          <>
            <div className="divide-y-2 divide-slate-200 rounded-xl border-2 border-slate-200 dark:divide-slate-800 dark:border-slate-800">
              {paginatedRecords.map((notice) => {
                const prNumber = notice.purchaseRequestId
                  ? prMap.get(notice.purchaseRequestId) ?? `PR #${notice.purchaseRequestId}`
                  : null;
                const supplierName = notice.supplierId
                  ? supplierMap.get(notice.supplierId) ?? `Supplier #${notice.supplierId}`
                  : null;

                return (
                  <div
                    key={notice.id}
                    className="flex flex-wrap items-center justify-between gap-4 p-5 transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-900/40"
                  >
                    <div>
                      <p className="font-mono text-base font-bold text-[#881337] dark:text-rose-400">
                        {notice.noticeNumber}
                      </p>
                      <p className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-100">
                        {notice.subject}
                      </p>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                        {notice.noticeType.replaceAll("_", " ").toUpperCase()}
                        {prNumber ? ` · ${prNumber}` : ""}
                        {supplierName ? ` · ${supplierName}` : ""} ·{" "}
                        {new Date(notice.createdAt).toLocaleDateString("en-PH")}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <StatusBadge tone={statusTone(notice.status)}>
                        {notice.status.replaceAll("_", " ").toUpperCase()}
                      </StatusBadge>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setLocation(`/print/notice?id=${notice.id}`)}
                        className="min-h-12 rounded-xl border-2 px-5 text-base font-bold"
                      >
                        <Printer className="mr-2 h-5 w-5" />
                        Print Notice
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            <TablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </section>
    </div>
  );
}
export default NoticeWorkflowPage;
