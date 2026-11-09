import * as React from "react";
import { History, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AuditHistoryEvent {
  timestamp: string;
  actor: string;
  action: string;
}

export interface AuditHistoryDrawerProps {
  /** Official Quality Procedure code, e.g., "BSC – PRO -QP- 95 – 1 (Rev. 00)" */
  procedureCode: string;
  /** Mandated step & role, e.g., "Step 5.10 · Procurement Officer I" */
  mandatedStep: string;
  /** Standard attachment / Annex form, e.g., "Annex G (Letter of Notice)" */
  standardAttachment: string;
  /** Chronological audit trail events */
  historyEvents: AuditHistoryEvent[];
  /** Optional statutory legal basis, defaults to "RA 12009 (NGPA) Sec. 32 · GPM Vol. 2" */
  legalBasis?: string;
  /** Optional default open state (defaults to false so everyday users are not distracted) */
  defaultOpen?: boolean;
  /** Optional className override */
  className?: string;
}

export function AuditHistoryDrawer({
  procedureCode,
  mandatedStep,
  standardAttachment,
  historyEvents,
  legalBasis = "RA 12009 (NGPA) Sec. 32 · GPM Vol. 2",
  defaultOpen = false,
  className,
}: AuditHistoryDrawerProps) {
  return (
    <details
      open={defaultOpen || undefined}
      className={cn(
        "group mt-6 rounded-xl border-2 border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/60",
        className
      )}
    >
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 rounded-lg px-2 py-1.5 text-base font-bold text-slate-800 dark:text-slate-100 focus-visible:border-[#881337] focus-visible:ring-4 focus-visible:ring-[#881337]/20 outline-none">
        <span className="flex items-center gap-2.5">
          <History className="h-5 w-5 shrink-0 text-[#881337] dark:text-rose-400" aria-hidden="true" />
          <span>View Official Tracking Numbers &amp; Activity History (For Audit / COA)</span>
        </span>
        <span className="inline-flex min-h-11 shrink-0 items-center rounded-xl border-2 border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition-colors group-hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:group-hover:bg-slate-700">
          <span className="group-open:hidden">Show Details ▼</span>
          <span className="hidden group-open:inline">Hide Details ▲</span>
        </span>
      </summary>

      <div className="mt-4 space-y-4 border-t-2 border-slate-200 pt-4 text-sm text-slate-700 dark:border-slate-800 dark:text-slate-300">
        {/* Statutory & ISO Metadata Grid */}
        <div className="grid grid-cols-1 gap-3 rounded-xl border-2 border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4 dark:border-slate-800 dark:bg-slate-900">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Quality Procedure
            </div>
            <div className="mt-1 text-base font-semibold text-slate-900 dark:text-white">
              {procedureCode}
            </div>
          </div>

          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Mandated Step &amp; Role
            </div>
            <div className="mt-1 text-base font-semibold text-slate-900 dark:text-white">
              {mandatedStep}
            </div>
          </div>

          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Standard Attachment
            </div>
            <div className="mt-1 text-base font-semibold text-slate-900 dark:text-white">
              {standardAttachment}
            </div>
          </div>

          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Legal Basis
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-base font-semibold text-emerald-700 dark:text-emerald-400">
              <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{legalBasis}</span>
            </div>
          </div>
        </div>

        {/* Chronological Event Timeline */}
        <div className="space-y-2.5">
          <div className="text-base font-bold text-slate-900 dark:text-white">
            Immutable Activity History (COA / ISO Audit Log)
          </div>
          {historyEvents.length === 0 ? (
            <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
              No activity events have been recorded for this stage yet.
            </p>
          ) : (
            <ol className="space-y-2.5 border-l-2 border-[#881337] pl-4 dark:border-rose-400">
              {historyEvents.map((event, idx) => (
                <li
                  key={`${event.timestamp}-${idx}`}
                  className="rounded-lg bg-white px-4 py-2.5 text-base leading-relaxed shadow-2xs dark:bg-slate-900"
                >
                  <span className="font-bold text-slate-900 dark:text-white">
                    {event.timestamp}
                  </span>{" "}
                  <span className="text-slate-500 dark:text-slate-400">—</span>{" "}
                  <span className="text-slate-800 dark:text-slate-200">
                    {event.action}
                  </span>{" "}
                  <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-sm font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {event.actor}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </details>
  );
}

