import * as React from "react";
import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export interface QuietCompliancePillProps {
  /** Human-readable workflow step indicator, e.g., "Step 1 of 15" or "Step 10 of 15" */
  stepNumber: string;
  /** ISO Quality Procedure clause reference, e.g., "BSC-PRO-QP-95-1 §5.1" */
  procedureRef: string;
  /** Official Annex or GAM form label, e.g., "Purchase Request (Annex A)" */
  annexForm: string;
  /** Mandated responsible role, e.g., "End-User" or "Procurement Officer I" */
  role: string;
  /** Optional additional className overrides */
  className?: string;
}

export function QuietCompliancePill({
  stepNumber,
  procedureRef,
  annexForm,
  role,
  className,
}: QuietCompliancePillProps) {
  return (
    <div
      className={cn(
        "inline-flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-sm font-medium text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300",
        className
      )}
      role="note"
      aria-label={`Official procedure reference: ${stepNumber}, ${annexForm}, responsible role ${role}, reference ${procedureRef}`}
    >
      <ShieldCheck className="h-4 w-4 shrink-0 text-[#881337] dark:text-rose-400" aria-hidden="true" />
      <span>
        {stepNumber} · {annexForm}
      </span>
      <span className="text-slate-300 dark:text-slate-600" aria-hidden="true">
        |
      </span>
      <span>Role: {role}</span>
      <span className="text-slate-300 dark:text-slate-600" aria-hidden="true">
        |
      </span>
      <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
        {procedureRef}
      </span>
    </div>
  );
}

