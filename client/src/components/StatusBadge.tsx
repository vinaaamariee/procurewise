import { cn } from "@/lib/utils";

const styles = {
  draft: "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200",
  pending: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-700/60 dark:bg-amber-950/50 dark:text-[#f0c36a]",
  active: "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-700/60 dark:bg-blue-950/50 dark:text-[#79b8ff]",
  approved: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-700/60 dark:bg-emerald-950/50 dark:text-[#55c98a]",
  returned: "border-red-200 bg-red-50 text-red-700 dark:border-red-700/60 dark:bg-red-950/50 dark:text-[#ff837a]",
} as const;

export function StatusBadge({ children, tone = "draft" }: { children: React.ReactNode; tone?: keyof typeof styles }) {
  return (
    <span className={cn("inline-flex items-center rounded-[4px] border px-2.5 py-0.5 text-xs font-semibold leading-4", styles[tone])}>
      {children}
    </span>
  );
}
