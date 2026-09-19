import { cn } from "@/lib/utils";

const procureWiseMarkUrl = "/procurewise-mark.svg";
const bscWordmarkUrl = "/bsc-procurewise-logo.png";

export function ProcureWiseLogo({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      {compact ? (
        <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full border border-[#d2b058] bg-white p-0.5 shadow-[0_1px_3px_rgba(36,42,52,0.16)]">
          <img src={procureWiseMarkUrl} alt="ProcureWise mark" className="h-full w-full object-contain" />
        </div>
      ) : (
        <img src={bscWordmarkUrl} alt="ProcureWise — Batanes State College" className="h-8 w-auto max-w-[170px] origin-left object-contain object-left transition-transform duration-200 ease-out hover:scale-[1.03] motion-reduce:transition-none motion-reduce:hover:scale-100 sm:h-10 sm:max-w-[205px]" />
      )}
    </div>
  );
}
