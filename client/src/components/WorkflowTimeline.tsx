import { Check, Circle, AlertCircle, Clock, PackageCheck, Send, ShieldCheck, ShoppingCart } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface PrSummary {
  id: number;
  prNumber: string;
  purpose: string;
  status: string;
  totalEstimate?: string | number;
}

const STAGES = [
  { label: "Draft package", description: "PPMP & 3-quote Pre-Canvass", icon: Clock },
  { label: "Procurement review", description: "Pre-canvass & budget verification", icon: Send },
  { label: "Administrative approval", description: "Approver sign-off & decision", icon: ShieldCheck },
  { label: "PO issued", description: "RFQ award & Purchase Order", icon: ShoppingCart },
  { label: "Delivery & PMR", description: "Inspection & PMR record", icon: PackageCheck },
] as const;

const STATUS_STAGE_MAP: Record<string, { stageIndex: number; percent: number; label: string }> = {
  draft: { stageIndex: 0, percent: 15, label: "Draft package preparation" },
  returned: { stageIndex: 0, percent: 10, label: "Returned for End-User correction" },
  procurement_review: { stageIndex: 1, percent: 35, label: "Procurement review" },
  approval_review: { stageIndex: 2, percent: 55, label: "Administrative approval review" },
  budget_review: { stageIndex: 2, percent: 55, label: "Budget review" },
  supply_review: { stageIndex: 2, percent: 55, label: "Supply review" },
  bac_review: { stageIndex: 2, percent: 55, label: "BAC review" },
  approved: { stageIndex: 2, percent: 65, label: "Approved — Endorsed for RFQ / PO" },
  rfq: { stageIndex: 3, percent: 75, label: "RFQ canvass in progress" },
  po: { stageIndex: 3, percent: 80, label: "Purchase Order in progress" },
  po_issued: { stageIndex: 3, percent: 85, label: "Purchase Order issued" },
  delivered: { stageIndex: 4, percent: 95, label: "Delivered — Pending PMR" },
  pmr_logged: { stageIndex: 4, percent: 100, label: "PMR logged — Completed" },
  closed: { stageIndex: 4, percent: 100, label: "Closed — Procurement complete" },
  rejected: { stageIndex: 0, percent: 0, label: "Rejected" },
};

export function WorkflowTimeline({
  status: propStatus,
  pr,
  allPrs,
  onSelectPr,
}: {
  status?: string;
  pr?: PrSummary | null;
  allPrs?: PrSummary[];
  onSelectPr?: (id: number) => void;
}) {
  const currentStatus = pr?.status ?? propStatus ?? "draft";
  const stageInfo = STATUS_STAGE_MAP[currentStatus] ?? { stageIndex: 0, percent: 10, label: currentStatus.replaceAll("_", " ") };
  const activeIndex = stageInfo.stageIndex;
  const isRejected = currentStatus === "rejected";
  const isCompleted = currentStatus === "closed" || currentStatus === "pmr_logged";

  return (
    <div className="flat-panel mt-5 p-5 border border-[#e8e2d7] bg-[#fdfcf9] dark:border-[#46515c] dark:bg-[#1b2229]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#efebe4] dark:border-[#46515c] pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-xs font-bold text-[#34404e] dark:text-[#f1f5f8]">Purchase Request workflow</p>
            {pr && (
              <span className="inline-flex items-center rounded-full bg-[#f8f1e0] dark:bg-[#342817] px-2 py-0.5 text-[10px] font-semibold text-[#7b1e1e] dark:text-[#f0c36a]">
                {pr.prNumber}
              </span>
            )}
          </div>
          <p className="mt-1 text-[11px] text-[#77818d] dark:text-[#a0acba]">
            Current stage: <strong className="font-semibold text-[#34404e] dark:text-[#f1f5f8]">{stageInfo.label}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {allPrs && allPrs.length > 1 && onSelectPr && (
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-[10px] text-muted-foreground hidden sm:inline">Inspect PR:</span>
              <Select
                value={String(pr?.id ?? allPrs[0].id)}
                onValueChange={(val) => onSelectPr(Number(val))}
              >
                <SelectTrigger className="h-7 text-[11px] min-w-[130px] bg-white dark:bg-[#232c35]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {allPrs.map((item) => (
                    <SelectItem key={item.id} value={String(item.id)} className="text-xs">
                      {item.prNumber} ({item.status.replaceAll("_", " ")})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] rounded bg-[#fff7e7] dark:bg-[#342817] px-2 py-1 text-[#9a6d19] dark:text-[#f0c36a]">
            ROLE-GATED
          </span>
        </div>
      </div>

      {/* Visual Progress Bar Track */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-[11px] mb-1.5">
          <span className="font-medium text-[#5a6573] dark:text-[#b4c0cd]">
            Workflow Completion
          </span>
          <span className="font-bold text-[#7b1e1e] dark:text-[#ff837a]">
            {isRejected ? "Rejected" : `${stageInfo.percent}%`}
          </span>
        </div>
        <Progress
          value={stageInfo.percent}
          className="h-2 bg-[#e8e2d7] dark:bg-[#343e4a]"
        />
      </div>

      {/* Stage Nodes */}
      <ol className="mt-6 grid gap-4 grid-cols-1 sm:grid-cols-5">
        {STAGES.map((stage, index) => {
          const isDone = index < activeIndex || isCompleted;
          const isCurrent = index === activeIndex && !isCompleted;
          const Icon = stage.icon;

          return (
            <li key={stage.label} className="relative flex items-start gap-3 sm:flex-col sm:gap-2">
              <div className="flex items-center w-full">
                <span
                  className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border text-xs transition-colors ${
                    isDone
                      ? "border-[#27633b] bg-[#27633b] text-white dark:border-[#348e53] dark:bg-[#348e53]"
                      : isCurrent
                      ? "border-[#7b1e1e] bg-[#fff5f5] text-[#7b1e1e] ring-2 ring-[#7b1e1e]/20 dark:border-[#ff837a] dark:bg-[#342022] dark:text-[#ff837a]"
                      : "border-[#dcd7ce] bg-white text-[#a3abb4] dark:border-[#46515c] dark:bg-[#232c35] dark:text-[#74808c]"
                  }`}
                >
                  {isDone ? (
                    <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                  ) : isCurrent ? (
                    <Icon className="h-3.5 w-3.5" />
                  ) : (
                    <Circle className="h-2 w-2 fill-current opacity-40" />
                  )}
                </span>

                {/* Connecting Line Between Stages */}
                {index < STAGES.length - 1 && (
                  <div className="hidden sm:block flex-1 h-1 mx-2 rounded-full overflow-hidden bg-[#e5dfd3] dark:bg-[#3d4752]">
                    <div
                      className={`h-full transition-all duration-300 ${
                        index < activeIndex
                          ? "bg-[#27633b] dark:bg-[#348e53] w-full"
                          : "w-0"
                      }`}
                    />
                  </div>
                )}
              </div>

              <div>
                <p
                  className={`text-[11px] font-semibold leading-tight ${
                    isCurrent
                      ? "text-[#7b1e1e] dark:text-[#ff837a]"
                      : isDone
                      ? "text-[#27633b] dark:text-[#8ce6aa]"
                      : "text-[#6e7885] dark:text-[#9eaab7]"
                  }`}
                >
                  {stage.label}
                </p>
                <p className="mt-0.5 text-[10px] text-[#8c97a4] dark:text-[#788594] leading-normal hidden sm:block">
                  {stage.description}
                </p>
              </div>
            </li>
          );
        })}
      </ol>

      {isRejected && (
        <div className="mt-4 flex items-center gap-2 rounded-[4px] border border-[#f3c2c2] bg-[#fff5f5] p-2.5 text-xs text-[#9c2525] dark:border-[#632a2a] dark:bg-[#281515] dark:text-[#ff837a]">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>This Purchase Request has been rejected and cannot advance further on this path.</span>
        </div>
      )}
    </div>
  );
}
