import { useDialogComposition } from "@/components/ui/dialog";
import { useComposition } from "@/hooks/useComposition";
import { cn } from "@/lib/utils";
import * as React from "react";

function Textarea({
  className,
  onKeyDown,
  onCompositionStart,
  onCompositionEnd,
  ...props
}: React.ComponentProps<"textarea">) {
  // Get dialog composition context if available (will be no-op if not inside Dialog)
  const dialogComposition = useDialogComposition();

  // Add composition event handlers to support input method editor (IME) for CJK languages.
  const {
    onCompositionStart: handleCompositionStart,
    onCompositionEnd: handleCompositionEnd,
    onKeyDown: handleKeyDown,
  } = useComposition<HTMLTextAreaElement>({
    onKeyDown: (e) => {
      const isComposing = (e.nativeEvent as any).isComposing || dialogComposition.justEndedComposing();
      if (e.key === "Enter" && !e.shiftKey && isComposing) {
        return;
      }
      onKeyDown?.(e);
    },
    onCompositionStart: (e) => {
      dialogComposition.setComposing(true);
      onCompositionStart?.(e);
    },
    onCompositionEnd: (e) => {
      dialogComposition.markCompositionEnd();
      setTimeout(() => {
        dialogComposition.setComposing(false);
      }, 100);
      onCompositionEnd?.(e);
    },
  });

  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-28 w-full rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-base text-slate-900 dark:text-white placeholder:text-slate-400 shadow-xs transition-[color,box-shadow] outline-none",
        "focus:border-[#881337] focus:ring-4 focus:ring-[#881337]/15 focus-visible:border-[#881337] focus-visible:ring-4 focus-visible:ring-[#881337]/20",
        "disabled:cursor-not-allowed disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-500 disabled:opacity-75",
        "aria-invalid:border-rose-600 aria-invalid:ring-4 aria-invalid:ring-rose-600/20",
        className
      )}
      onCompositionStart={handleCompositionStart}
      onCompositionEnd={handleCompositionEnd}
      onKeyDown={handleKeyDown}
      {...props}
    />
  );
}

export { Textarea };
