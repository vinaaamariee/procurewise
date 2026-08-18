import { Check, Circle } from "lucide-react";

const stages = ["Draft", "Budget review", "Supply review", "BAC review", "Approved"] as const;
const statusIndex: Record<string, number> = { draft: 0, budget_review: 1, supply_review: 2, bac_review: 3, approved: 4, rfq: 4, po: 4, closed: 4 };

export function WorkflowTimeline({ status }: { status: string }) {
  const activeIndex = statusIndex[status] ?? 0;
  return <div className="flat-panel mt-5 p-4"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold text-[#34404e]">Purchase Request workflow</p><p className="mt-1 text-[11px] text-[#77818d]">Current transaction stage: {stages[activeIndex]}</p></div><span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9a6d19]">ROLE-GATED</span></div><ol className="mt-5 grid gap-3 sm:grid-cols-5">{stages.map((stage, index) => <li key={stage} className="relative flex items-center gap-2 sm:flex-col sm:items-start"><span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border ${index < activeIndex ? "border-[#7b1e1e] bg-[#7b1e1e] text-white" : index === activeIndex ? "border-[#9a6d19] bg-[#fff7e7] text-[#9a6d19]" : "border-[#dcd7ce] bg-white text-[#a3abb4]"}`}>{index < activeIndex ? <Check className="h-3.5 w-3.5" /> : <Circle className="h-2 w-2 fill-current" />}</span><span className={`text-[11px] font-medium ${index === activeIndex ? "text-[#7b1e1e]" : "text-[#6e7885]"}`}>{stage}</span>{index < stages.length - 1 ? <span className="absolute left-6 top-3 hidden h-px w-[calc(100%-1.2rem)] bg-[#e5dfd3] sm:block" /> : null}</li>)}</ol></div>;
}
