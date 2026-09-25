import { cn } from "@/lib/utils";

const bscLogoUrl = "/bsc-logo.jpg";

export function ProcureWiseLogo({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full border border-[#d2b058] bg-white p-0.5 shadow-[0_1px_3px_rgba(36,42,52,0.16)]">
        <img src={bscLogoUrl} alt="Batanes State College" className="h-full w-full rounded-full object-contain" />
      </div>
      {!compact && (
        <div className="flex flex-col leading-tight">
          <span className="font-display text-lg font-bold tracking-tight text-[#1c2430] dark:text-[#f1f5f8] sm:text-xl">
            ProcureWise
          </span>
          <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#9a6d19] dark:text-[#f3cc77]">
            Batanes State College
          </span>
        </div>
      )}
    </div>
  );
}
