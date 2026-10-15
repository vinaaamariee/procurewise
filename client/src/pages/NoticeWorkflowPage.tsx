import { useAuth } from "@/_core/hooks/useAuth";
import { EmptyWorkspace } from "@/components/EmptyWorkspace";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useSupabaseRealtime } from "@/hooks/useSupabaseRealtime";
import { normalizeProcurementRole } from "../../../shared/procurementRules";
import { CheckCircle2, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { NoticesPage } from "./OfficerPages";

export function NoticeWorkflowPage() {
  const { user } = useAuth();
  const role = normalizeProcurementRole(user?.role ?? "end_user");

  if (role === "hope" || role === "administrative_approver") {
    return <HopeNoticeApprovalQueue />;
  }

  return <NoticesPage />;
}

function HopeNoticeApprovalQueue() {
  const notices = trpc.procurement.officer.notices.list.useQuery(undefined, { retry: false });
  const utils = trpc.useUtils();
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
  const pendingNotices = (notices.data ?? []).filter(
    (notice) => notice.noticeType === "award" && notice.status === "pending_hope_approval"
  );

  return (
    <div className="mx-auto max-w-[1240px]">
      <PageHeader
        eyebrow="Procedure 5.9 · HoPE review"
        title="Notice of Award approvals"
        description="Review the notice prepared by Procurement Staff. Approval records contract entry and releases the notice for service to the supplier."
      />
      <section className="flat-panel mt-7 overflow-hidden">
        {notices.isLoading ? (
          <div className="flex items-center gap-2 p-5 text-sm text-[#65717e]">
            <LoaderCircle className="h-4 w-4 animate-spin" /> Loading submitted notices
          </div>
        ) : pendingNotices.length ? (
          <div className="divide-y divide-[#efebe4]">
            {pendingNotices.map((notice) => (
              <article key={notice.id} className="grid gap-4 p-5 md:grid-cols-[1fr_auto] md:items-start">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-semibold text-[#34404e]">{notice.subject}</h2>
                    <StatusBadge tone="pending">AWAITING APPROVAL</StatusBadge>
                  </div>
                  <p className="mt-1 text-[11px] text-[#77818d]">
                    {notice.noticeNumber}{notice.purchaseRequestId ? ` · Purchase Request ${notice.purchaseRequestId}` : ""}
                  </p>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#52606d]">{notice.body}</p>
                </div>
                <Button
                  type="button"
                  disabled={approve.isPending}
                  onClick={() => approve.mutate({ noticeId: notice.id })}
                  className="h-9 rounded-[4px] bg-[#27633b] text-xs text-white hover:bg-[#1e4d2e]"
                >
                  {approve.isPending ? <LoaderCircle className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />}
                  Approve & enter into contract
                </Button>
              </article>
            ))}
          </div>
        ) : (
          <div className="p-5">
            <EmptyWorkspace
              eyebrow="HoPE approvals"
              title="No award notices are awaiting approval."
              description="Notices prepared by Procurement Staff will appear here for review."
            />
          </div>
        )}
      </section>
    </div>
  );
}