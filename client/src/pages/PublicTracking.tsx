import { ProcureWiseLogo } from "@/components/ProcureWiseLogo";
import { GlobalAppearanceControls } from "@/components/GlobalAppearanceControls";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, ArrowLeft, CheckCircle2, Clock, Info, Loader2, Search, XCircle } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Link, useSearch } from "wouter";

/* -------------------------------------------------------------------------- */
/* Forgiving input                                                            */
/* -------------------------------------------------------------------------- */

/** Must match the server schema: z.string().min(16).max(48) */
const MIN_CODE_LENGTH = 16;
const MAX_CODE_LENGTH = 48;
/** Codes are generated as randomUUID() without hyphens: 32 characters, 0-9 and a-f. */
const STANDARD_CODE_LENGTH = 32;

/**
 * Turns whatever the person typed or pasted into the code the server expects.
 * - Accepts a full tracking link (…/track?token=abc…)
 * - Removes spaces, dashes, dots and underscores added when copying from paper
 * - Standard codes only use 0-9 and a-f, so look-alike letters (O → 0, I/L → 1)
 *   are corrected and capital letters are lower-cased
 * - Anything that is not a standard code is passed through unchanged (minus separators)
 */
export function normalizeTrackingCode(raw: string): string {
  let value = raw.trim();
  const fromLink = value.match(/[?&]token=([^&#\s]+)/i);
  if (fromLink) {
    try {
      value = decodeURIComponent(fromLink[1]);
    } catch {
      value = fromLink[1];
    }
  }
  const compact = value.replace(/[\s\-_.]/g, "");
  const corrected = compact.replace(/[oO]/g, "0").replace(/[iIlL]/g, "1").toLowerCase();
  if (new RegExp(`^[0-9a-f]{${STANDARD_CODE_LENGTH}}$`).test(corrected)) return corrected;
  return compact;
}

/* -------------------------------------------------------------------------- */
/* Plain-language progress                                                    */
/* -------------------------------------------------------------------------- */

type Stage = { title: string; description: string; officialTerm: string };

const STAGES: Stage[] = [
  {
    title: "Request prepared",
    description: "The requesting office wrote down what it needs and how much it may cost.",
    officialTerm: "Purchase Request (PR)",
  },
  {
    title: "Collecting prices",
    description: "The office is getting price offers from suppliers so they can be compared fairly.",
    officialTerm: "Pre-Canvass / Request for Quotation",
  },
  {
    title: "Being checked by the Procurement Office",
    description: "Staff are checking the documents, the budget, and the supplier prices.",
    officialTerm: "Procurement review / Abstract of Canvass",
  },
  {
    title: "Waiting for final approval",
    description: "The head of office is deciding whether to approve the purchase.",
    officialTerm: "Administrative approval",
  },
  {
    title: "Order sent to the supplier",
    description: "An official order is prepared and given to the chosen supplier.",
    officialTerm: "Purchase Order (PO)",
  },
  {
    title: "Delivered and completed",
    description: "The items are delivered, checked, and the record is closed.",
    officialTerm: "Delivery, inspection & PMR",
  },
];

type Outcome = "in_progress" | "returned" | "rejected" | "completed";

/** Maps every purchase_requests.status value to a citizen-facing position. */
function resolveProgress(status: string, hasPreCanvass: boolean, hasPurchaseOrder: boolean): { current: number; outcome: Outcome } {
  if (status === "rejected") return { current: -1, outcome: "rejected" };
  if (["delivered", "pmr_logged", "closed"].includes(status)) return { current: STAGES.length, outcome: "completed" };
  if (status === "returned") return { current: 0, outcome: "returned" };
  if (hasPurchaseOrder || status === "po" || status === "po_issued" || status === "approved") return { current: 4, outcome: "in_progress" };
  if (status === "approval_review") return { current: 3, outcome: "in_progress" };
  if (["procurement_review", "budget_review", "supply_review", "bac_review"].includes(status)) return { current: 2, outcome: "in_progress" };
  if (status === "rfq" || hasPreCanvass) return { current: 1, outcome: "in_progress" };
  return { current: 0, outcome: "in_progress" };
}

/**
 * Only purchase-request milestones with a plain-language label are shown.
 * Unknown/internal actions are hidden so staff-only events never reach the public page.
 */
const MILESTONE_LABELS: Record<string, string> = {
  created: "Request created",
  submitted_to_procurement: "Sent to the Procurement Office",
  officer_assigned: "A procurement officer was assigned",
  officer_verified: "Checked and accepted by the Procurement Office",
  returned: "Sent back to the requesting office for corrections",
  returned_for_revision: "Sent back to the requesting office for corrections",
  returned_for_correction: "Sent back to the requesting office for corrections",
  resubmitted: "Corrected and sent again",
  transmitted_to_bac: "Sent to the Bids and Awards Committee for review",
  philgeps_posted: "Posted on PhilGEPS, the government's public notice website",
  approved: "Approved",
  rejected: "Not approved",
  issued: "Purchase order prepared",
  po_released_to_supplier: "Order given to the supplier",
  delivery_logged: "Items delivered",
  inspection_iar_recorded: "Delivered items inspected",
  recorded_to_pmr: "Recorded as completed",
  pmr_logged: "Recorded as completed",
};

const LONG_DATE: Intl.DateTimeFormatOptions = { year: "numeric", month: "long", day: "numeric" };
const formatDate = (value: string | Date) => new Date(value).toLocaleDateString("en-PH", LONG_DATE);

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function PublicTrackingPage() {
  const search = useSearch();
  const tokenFromLink = new URLSearchParams(search).get("token") ?? "";

  const [code, setCode] = useState(tokenFromLink);
  const [submittedCode, setSubmittedCode] = useState(() => {
    const normalized = normalizeTrackingCode(tokenFromLink);
    return normalized.length >= MIN_CODE_LENGTH ? normalized : "";
  });
  const [inputError, setInputError] = useState("");

  const inputRef = useRef<HTMLInputElement>(null);
  const resultHeadingRef = useRef<HTMLHeadingElement>(null);
  const inputId = useId();
  const hintId = useId();
  const errorId = useId();

  const tracking = trpc.procurement.publicTracking.lookup.useQuery(
    { token: submittedCode },
    { enabled: submittedCode.length >= MIN_CODE_LENGTH, retry: false }
  );
  const record = tracking.data;
  // Only blame the code when the server explicitly says it was not found ("Tracking record not found.").
  // Offline, timeouts, and server/database outages get a "please try again" message instead.
  const isNotFound = tracking.isError && /not found/i.test(tracking.error?.message ?? "");
  const isConnectionProblem = tracking.isError && !isNotFound;

  // Move keyboard / screen-reader focus to the result so it is announced.
  useEffect(() => {
    if (record) resultHeadingRef.current?.focus();
  }, [record]);

  const normalizedPreview = normalizeTrackingCode(code);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const normalized = normalizeTrackingCode(code);
    if (!normalized) {
      setInputError("Please type or paste your tracking code first.");
      inputRef.current?.focus();
      return;
    }
    if (normalized.length < MIN_CODE_LENGTH) {
      setInputError(
        `This code looks too short. You entered ${normalized.length} characters — most codes have ${STANDARD_CODE_LENGTH}. Please check your tracking slip.`
      );
      inputRef.current?.focus();
      return;
    }
    if (normalized.length > MAX_CODE_LENGTH) {
      setInputError(`This code looks too long. Most codes have ${STANDARD_CODE_LENGTH} characters. Please check your tracking slip.`);
      inputRef.current?.focus();
      return;
    }
    setInputError("");
    if (normalized === submittedCode) void tracking.refetch();
    else setSubmittedCode(normalized);
  }

  function handleReset() {
    setCode("");
    setSubmittedCode("");
    setInputError("");
    inputRef.current?.focus();
  }

  const progress = record
    ? resolveProgress(record.purchaseRequest.status, Boolean(record.preCanvass), Boolean(record.purchaseOrder))
    : null;

  const milestones = record
    ? record.events
        .filter((event) => MILESTONE_LABELS[event.action])
        .slice(-8)
        .reverse()
    : [];

  const statusSummary = !progress
    ? ""
    : progress.outcome === "completed"
      ? "Completed"
      : progress.outcome === "rejected"
        ? "Not approved"
        : progress.outcome === "returned"
          ? "Sent back for corrections"
          : STAGES[progress.current].title;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-card focus:px-4 focus:py-3 focus:text-base focus:font-semibold focus:ring-4 focus:ring-[#7b1e1e]/40"
      >
        Skip to main content
      </a>

      <header className="border-b-2 border-border bg-card">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/" aria-label="ProcureWise home page" className="inline-flex min-h-12 items-center rounded-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#7b1e1e]/40">
            <ProcureWiseLogo />
          </Link>
          <div className="flex items-center gap-3">
            <GlobalAppearanceControls />
            <Link
              href="/"
              className="inline-flex min-h-12 items-center gap-2 rounded-md border-2 border-border bg-background px-4 text-base font-semibold text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#7b1e1e]/40"
            >
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
              Back to home
            </Link>
          </div>
        </div>
      </header>

      <main id="main-content" className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        {/* ------------------------------ Search ------------------------------ */}
        <section aria-labelledby="page-title" className="rounded-xl border-2 border-border bg-card p-6 sm:p-10">
          <h1 id="page-title" className="font-display text-3xl font-bold leading-tight text-foreground sm:text-4xl">
            Check the progress of a purchase request
          </h1>
          <p className="mt-4 text-lg leading-8 text-foreground">
            Type or paste the tracking code from your tracking slip. You do not need an account.
          </p>

          <form className="mt-8 space-y-4" onSubmit={handleSubmit} noValidate>
            <div>
              <label htmlFor={inputId} className="block text-lg font-bold text-foreground">
                Tracking code
              </label>
              <p id={hintId} className="mt-2 text-base leading-7 text-foreground/80">
                You can find it on your slip under <strong>"Tracking Token"</strong>. It has {STANDARD_CODE_LENGTH} letters and
                numbers, for example <span className="whitespace-nowrap font-mono">3f9a2c71 b8e04d5a …</span>
                <br />
                Spaces, dashes, and capital letters are fine — we fix them for you.
              </p>
              <input
                ref={inputRef}
                id={inputId}
                type="text"
                value={code}
                onChange={(event) => {
                  setCode(event.target.value);
                  if (inputError) setInputError("");
                }}
                aria-describedby={inputError ? `${hintId} ${errorId}` : hintId}
                aria-invalid={Boolean(inputError)}
                autoComplete="off"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="search"
                className={`mt-3 block min-h-14 w-full rounded-lg border-2 bg-background px-4 font-mono text-lg tracking-wide text-foreground focus:outline-none focus:ring-4 ${
                  inputError
                    ? "border-[#a32929] focus:ring-[#a32929]/30 dark:border-red-400"
                    : "border-foreground/50 focus:border-[#7b1e1e] focus:ring-[#7b1e1e]/30 dark:focus:border-[#eb766a]"
                }`}
              />
              {code.trim() && !inputError && (
                <p className="mt-2 text-base text-foreground/80">
                  Characters entered: <strong>{normalizedPreview.length}</strong>
                  {normalizedPreview.length !== STANDARD_CODE_LENGTH && ` (most codes have ${STANDARD_CODE_LENGTH})`}
                </p>
              )}
              {inputError && (
                <p id={errorId} role="alert" className="mt-3 flex items-start gap-2 text-base font-semibold text-[#a32929] dark:text-red-400">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                  {inputError}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={tracking.isFetching}
              className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-lg bg-[#7b1e1e] px-6 text-lg font-bold text-white hover:bg-[#641818] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#7b1e1e]/40 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-80 dark:bg-[#9a2828] dark:hover:bg-[#852020]"
            >
              {tracking.isFetching ? (
                <>
                  <Loader2 className="h-6 w-6 motion-safe:animate-spin" aria-hidden="true" />
                  Checking…
                </>
              ) : (
                <>
                  <Search className="h-6 w-6" aria-hidden="true" />
                  Check progress
                </>
              )}
            </button>
          </form>

          {/* Lookup problems: friendly, specific, and always with a next step */}
          <div aria-live="polite">
            {tracking.isError && !tracking.isFetching && (
              <div role="alert" className="mt-6 rounded-lg border-2 border-[#a32929] bg-[#a32929]/5 p-5 dark:border-red-400">
                <p className="flex items-start gap-2 text-lg font-bold text-[#a32929] dark:text-red-400">
                  <XCircle className="mt-1 h-6 w-6 shrink-0" aria-hidden="true" />
                  {isConnectionProblem ? "We could not check right now." : "We could not find a request with this code."}
                </p>
                <ul className="mt-3 list-disc space-y-1 pl-6 text-base leading-7 text-foreground">
                  {isConnectionProblem ? (
                    <>
                      <li>This is not a problem with your code.</li>
                      <li>Please check your internet connection, wait a few minutes, then press "Check progress" again.</li>
                    </>
                  ) : (
                    <>
                      <li>Compare each character with your tracking slip.</li>
                      <li>If you received a link, opening the link fills in the code for you.</li>
                      <li>If it still does not work, ask the office that gave you the slip.</li>
                    </>
                  )}
                </ul>
              </div>
            )}
          </div>

          <div className="mt-8 flex items-start gap-3 rounded-lg bg-muted p-4 text-base leading-7 text-foreground">
            <Info className="mt-1 h-5 w-5 shrink-0" aria-hidden="true" />
            <p>This page only shows progress. It never shows personal details, prices, or supplier names.</p>
          </div>
        </section>

        {/* ------------------------------ Result ------------------------------ */}
        {record && progress && (
          <section aria-labelledby="result-title" className="mt-8 rounded-xl border-2 border-border bg-card p-6 sm:p-10">
            <p className="text-base font-semibold text-foreground/80">Request number {record.purchaseRequest.prNumber}</p>
            <h2 id="result-title" ref={resultHeadingRef} tabIndex={-1} className="mt-1 text-2xl font-bold leading-snug text-foreground focus:outline-none">
              {record.purchaseRequest.purpose}
            </h2>

            {/* One-sentence answer to "where is it now?" */}
            <div
              className={`mt-6 rounded-lg border-2 p-5 ${
                progress.outcome === "rejected"
                  ? "border-[#a32929] bg-[#a32929]/5 dark:border-red-400"
                  : progress.outcome === "returned"
                    ? "border-[#9a6d19] bg-[#9a6d19]/10 dark:border-[#f0c36a]"
                    : progress.outcome === "completed"
                      ? "border-[#1f7a3d] bg-[#1f7a3d]/10 dark:border-emerald-400"
                      : "border-[#7b1e1e] bg-[#7b1e1e]/5 dark:border-[#eb766a]"
              }`}
            >
              <p className="text-base font-semibold text-foreground/80">Current status</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{statusSummary}</p>
              <p className="mt-2 text-base leading-7 text-foreground">
                {progress.outcome === "rejected" &&
                  "This purchase request was not approved. For the reason, please ask the office that gave you the tracking slip."}
                {progress.outcome === "returned" &&
                  "The requesting office was asked to correct some details. The request will continue after they send it again."}
                {progress.outcome === "completed" && "All steps are finished. The items were delivered and the record is closed."}
                {progress.outcome === "in_progress" && STAGES[progress.current].description}
              </p>
              <p className="mt-3 text-base text-foreground/80">Last updated: {formatDate(record.purchaseRequest.updatedAt)}</p>
            </div>

            {/* Vertical, numbered steps — readable at 200%+ zoom and on narrow phones */}
            {progress.outcome !== "rejected" && (
              <>
                <h3 className="mt-10 text-xl font-bold text-foreground">All steps</h3>
                <ol className="mt-4 space-y-3">
                  {STAGES.map((stage, position) => {
                    const state = position < progress.current ? "done" : position === progress.current ? "current" : "upcoming";
                    return (
                      <li
                        key={stage.title}
                        aria-current={state === "current" ? "step" : undefined}
                        className={`flex gap-4 rounded-lg border-2 p-4 ${
                          state === "current" ? "border-[#7b1e1e] bg-[#7b1e1e]/5 dark:border-[#eb766a]" : "border-transparent"
                        }`}
                      >
                        <span className="mt-0.5 shrink-0" aria-hidden="true">
                          {state === "done" ? (
                            <CheckCircle2 className="h-8 w-8 text-[#1f7a3d] dark:text-emerald-400" />
                          ) : state === "current" ? (
                            <Clock className="h-8 w-8 text-[#7b1e1e] dark:text-[#eb766a]" />
                          ) : (
                            <span className="grid h-8 w-8 place-items-center rounded-full border-2 border-foreground/40 text-base font-bold text-foreground/70">
                              {position + 1}
                            </span>
                          )}
                        </span>
                        <div>
                          <p className="text-lg font-bold text-foreground">
                            <span className="sr-only">Step {position + 1}: </span>
                            {stage.title}
                          </p>
                          {/* Status is spelled out in words, not only shown by colour or icon */}
                          <p
                            className={`text-base font-semibold ${
                              state === "done"
                                ? "text-[#1f7a3d] dark:text-emerald-400"
                                : state === "current"
                                  ? "text-[#7b1e1e] dark:text-[#eb766a]"
                                  : "text-foreground/70"
                            }`}
                          >
                            {state === "done" ? "Done" : state === "current" ? "Happening now" : "Not started yet"}
                          </p>
                          <p className="mt-1 text-base leading-7 text-foreground/90">{stage.description}</p>
                          <p className="mt-1 text-sm text-foreground/70">Official name: {stage.officialTerm}</p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </>
            )}

            <h3 className="mt-10 text-xl font-bold text-foreground">What has happened so far</h3>
            <p className="mt-1 text-base text-foreground/80">Newest first</p>
            {milestones.length ? (
              <ul className="mt-4 divide-y-2 divide-border border-y-2 border-border">
                {milestones.map((event, index) => (
                  <li key={`${event.action}-${index}`} className="flex flex-col gap-1 py-4 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
                    <span className="text-base font-semibold text-foreground">{MILESTONE_LABELS[event.action]}</span>
                    <span className="text-base text-foreground/80">{formatDate(event.createdAt)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-base text-foreground">No updates have been recorded yet. Please check again later.</p>
            )}

            <button
              type="button"
              onClick={handleReset}
              className="mt-10 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border-2 border-foreground/60 bg-background px-6 text-lg font-semibold text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#7b1e1e]/40 sm:w-auto"
            >
              <Search className="h-5 w-5" aria-hidden="true" />
              Check a different code
            </button>
          </section>
        )}
      </main>
    </div>
  );
}
