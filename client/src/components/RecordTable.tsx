import { cn } from "@/lib/utils";

export function RecordTable({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("overflow-x-auto border border-[#e5e1d9] bg-white dark:border-[#46515c] dark:bg-[#1b2229]", className)}><table className="w-full min-w-[680px] text-left text-sm">{children}</table></div>;
}

export function RecordTableHeader({ children }: { children: React.ReactNode }) {
  return <thead className="bg-[#faf9f6] text-xs font-bold uppercase tracking-[0.08em] text-[#6b7684] dark:bg-[#2b3540] dark:text-[#f1f5f8]">{children}</thead>;
}
