import { Landmark } from "lucide-react";
import { cn } from "@/lib/utils";

export function ProcureWiseLogo({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[5px] bg-[#7b1e1e] text-[#f7e6bd] shadow-[inset_0_-2px_0_rgba(0,0,0,0.14)]">
        <Landmark className="h-4 w-4" strokeWidth={2.25} />
      </div>
      {!compact && (
        <div className="min-w-0 leading-none">
          <p className="font-display text-[15px] font-semibold tracking-[-0.02em] text-[#1f2937]">ProcureWise</p>
          <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.16em] text-[#9a6d19]">Batanes State College</p>
        </div>
      )}
    </div>
  );
}
