import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2.5 whitespace-nowrap rounded-xl text-base font-bold transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-5 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-[#881337] focus-visible:ring-4 focus-visible:ring-[#881337]/20 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "bg-[#881337] text-white hover:bg-[#70102e] shadow-sm",
        destructive:
          "bg-rose-700 text-white hover:bg-rose-800 font-bold focus-visible:ring-rose-700/20 dark:focus-visible:ring-rose-500/40",
        outline:
          "border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 font-semibold shadow-xs",
        secondary:
          "border-2 border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700 font-semibold",
        ghost:
          "text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold",
        link: "text-[#881337] dark:text-rose-400 underline-offset-4 hover:underline font-semibold",
      },
      size: {
        default: "min-h-12 px-6 py-3 text-base font-bold rounded-xl has-[>svg]:px-5",
        sm: "min-h-11 px-4 py-2.5 text-sm font-semibold rounded-xl gap-2 has-[>svg]:px-3.5",
        lg: "min-h-13 px-7 py-3.5 text-base font-bold rounded-xl has-[>svg]:px-6",
        icon: "min-h-12 min-w-12 size-12 rounded-xl",
        "icon-sm": "min-h-11 min-w-11 size-11 rounded-xl",
        "icon-lg": "min-h-13 min-w-13 size-13 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

/**
 * Strips legacy sub-44px height utility classes (e.g., h-6, h-7, h-8, h-9) from
 * ad-hoc className overrides so no button drops below the 44px–48px touch target guard.
 */
function sanitizeAccessibleButtonClass(className?: string) {
  if (!className) return undefined;
  return className
    .replace(/\bh-(?:6|7|8|9)\b/g, "min-h-11")
    .replace(/\bsize-(?:6|7|8|9)\b/g, "min-h-11 min-w-11");
}

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), sanitizeAccessibleButtonClass(className))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
