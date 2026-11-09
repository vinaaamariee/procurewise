import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";

import { cn } from "@/lib/utils";

export interface AccessibleLabelProps
  extends React.ComponentProps<typeof LabelPrimitive.Root> {
  /** Permanent plain-language helper text rendered directly below the main label */
  sublabel?: string;
  /** Appends an accessible red required asterisk (*) */
  required?: boolean;
}

function Label({
  className,
  children,
  sublabel,
  required,
  ...props
}: AccessibleLabelProps) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        "block select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        sublabel ? "mb-2" : "mb-1",
        className
      )}
      {...props}
    >
      <span className="block text-base font-bold text-slate-900 dark:text-white mb-1 leading-snug">
        {children}
        {required && (
          <span
            className="text-rose-600 dark:text-rose-400 ml-1 font-bold"
            aria-hidden="true"
          >
            *
          </span>
        )}
      </span>
      {sublabel && (
        <span className="block text-sm font-normal text-slate-600 dark:text-slate-400 mb-2 leading-relaxed">
          {sublabel}
        </span>
      )}
    </LabelPrimitive.Root>
  );
}

export { Label };
