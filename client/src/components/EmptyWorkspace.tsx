import { Button } from "@/components/ui/button";
import { ArrowRight, FilePlus2 } from "lucide-react";
import { Link } from "wouter";

export function EmptyWorkspace({
  eyebrow,
  title,
  description,
  actionLabel,
  actionHref,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className="grid min-h-[340px] place-items-center rounded-[6px] border border-dashed border-[#d9d5cd] bg-white px-6 text-center shadow-[0_1px_0_rgba(33,43,54,0.03)]">
      <div className="max-w-md">
        <div className="mx-auto grid h-11 w-11 place-items-center rounded-[5px] border border-[#e5e0d7] bg-[#fbfaf7] text-[#7b1e1e]">
          <FilePlus2 className="h-5 w-5" />
        </div>
        <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#9a6d19]">{eyebrow}</p>
        <h2 className="mt-2 font-display text-xl font-semibold tracking-[-0.02em] text-[#1f2937]">{title}</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#677281]">{description}</p>
        {actionLabel && actionHref && (
          <Button asChild className="mt-6 h-9 rounded-[4px] bg-[#7b1e1e] px-4 text-xs font-semibold hover:bg-[#641818]">
            <Link href={actionHref}>
              {actionLabel}
              <ArrowRight className="ml-2 h-3.5 w-3.5" />
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
