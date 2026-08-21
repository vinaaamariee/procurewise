import { cn } from "@/lib/utils";

const bscSealUrl = "/manus-storage/batanes-state-college-seal_d2569153.png";

export function ProcureWiseLogo({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full border border-[#d2b058] bg-white p-0.5 shadow-[0_1px_3px_rgba(36,42,52,0.16)]">
        <img src={bscSealUrl} alt="Batanes State College seal" className="h-full w-full object-contain" />
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
