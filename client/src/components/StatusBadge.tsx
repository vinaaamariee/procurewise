import { cn } from "@/lib/utils";

const styles = {
  draft: "border-slate-200 bg-slate-100 text-slate-600",
  pending: "border-amber-200 bg-amber-50 text-amber-800",
  active: "border-blue-200 bg-blue-50 text-blue-800",
  approved: "border-emerald-200 bg-emerald-50 text-emerald-800",
  returned: "border-red-200 bg-red-50 text-red-700",
} as const;

export function StatusBadge({ children, tone = "draft" }: { children: React.ReactNode; tone?: keyof typeof styles }) {
  return (
    <span className={cn("inline-flex items-center rounded-[4px] border px-2 py-0.5 text-[11px] font-semibold leading-4", styles[tone])}>
      {children}
    </span>
  );
}
