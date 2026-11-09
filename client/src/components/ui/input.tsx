import { useDialogComposition } from "@/components/ui/dialog";
import { useComposition } from "@/hooks/useComposition";
import { cn } from "@/lib/utils";
import * as React from "react";

function sanitizeAccessibleInputClass(className?: string) {
  if (!className) return undefined;
  return className.replace(/\bh-(?:6|7|8|9|10)\b/g, "min-h-12");
}

function Input({
  className,
  type,
  onKeyDown,
  onCompositionStart,
  onCompositionEnd,
  ...props
}: React.ComponentProps<"input">) {
  // Get dialog composition context if available (will be no-op if not inside Dialog)
  const dialogComposition = useDialogComposition();

  // Add composition event handlers to support input method editor (IME) for CJK languages.
  const {
    onCompositionStart: handleCompositionStart,
    onCompositionEnd: handleCompositionEnd,
    onKeyDown: handleKeyDown,
  } = useComposition<HTMLInputElement>({
    onKeyDown: (e) => {
      const isComposing = (e.nativeEvent as any).isComposing || dialogComposition.justEndedComposing();
      if (e.key === "Enter" && isComposing) {
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
    <input
      type={type}
      data-slot="input"
      className={cn(
        "min-h-12 w-full min-w-0 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-base text-slate-900 dark:text-white placeholder:text-slate-400 selection:bg-[#881337] selection:text-white shadow-xs transition-colors outline-none",
        "file:inline-flex file:min-h-9 file:border-0 file:bg-transparent file:text-sm file:font-semibold file:text-slate-900 dark:file:text-white",
        "focus:border-[#881337] focus:ring-4 focus:ring-[#881337]/15 focus-visible:border-[#881337] focus-visible:ring-4 focus-visible:ring-[#881337]/20",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-500 disabled:opacity-75",
        "aria-invalid:border-rose-600 aria-invalid:ring-4 aria-invalid:ring-rose-600/20",
        sanitizeAccessibleInputClass(className)
      )}
      onCompositionStart={handleCompositionStart}
      onCompositionEnd={handleCompositionEnd}
      onKeyDown={handleKeyDown}
      {...props}
    />
  );
}

export { Input };
