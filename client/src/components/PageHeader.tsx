import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: { label: string; onClick?: () => void };
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-[#e4e1da] dark:border-[#46515c] pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#9a6d19] dark:text-[#f0c36a]">{eyebrow}</p>
        <h1 className="mt-1 font-display text-2xl font-semibold tracking-[-0.03em] text-[#202833] dark:text-[#f1f5f8] sm:text-[26px]">{title}</h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-6 text-[#677281] dark:text-[#d1dae2]">{description}</p>
      </div>
      {action && (
        <Button onClick={action.onClick} className="h-9 rounded-[4px] bg-[#7b1e1e] px-3.5 text-xs font-semibold text-white hover:bg-[#641818] dark:bg-[#d65c50] dark:text-white dark:hover:bg-[#eb766a]">
          <Plus className="mr-1.5 h-3.5 w-3.5 text-white" />
          {action.label}
        </Button>
      )}
    </div>
  );
}
