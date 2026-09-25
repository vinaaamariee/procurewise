import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProcureWiseLogo } from "@/components/ProcureWiseLogo";
import { GlobalAppearanceControls } from "@/components/GlobalAppearanceControls";
import { ArrowLeft, CheckCircle2, Circle, Search } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";

const stages = ["Draft package", "Pre-Canvass", "Procurement review", "Administrative decision", "Purchase Order", "Delivery & PMR"];
function stageIndex(status: string, hasPreCanvass: boolean, hasPurchaseOrder: boolean) {
  if (["pmr_logged", "delivered"].includes(status)) return 5;
  if (hasPurchaseOrder || status === "po") return 4;
  if (status === "approved" || status === "approval_review") return 3;
  if (status === "procurement_review") return 2;
  if (hasPreCanvass) return 1;
  return 0;
}

export default function PublicTrackingPage() {
  const [token, setToken] = useState("");
  const [submittedToken, setSubmittedToken] = useState("");
  const tracking = trpc.procurement.publicTracking.lookup.useQuery(
    { token: submittedToken || "invalid-token" },
    { enabled: submittedToken.length >= 16, retry: false }
  );
  const record = tracking.data;
  const index = record ? stageIndex(record.purchaseRequest.status, Boolean(record.preCanvass), Boolean(record.purchaseOrder)) : 0;

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground outline-none ring-0 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <header className="flex items-center justify-between border-b border-border dark:border-border pb-6">
          <Link href="/">
            <ProcureWiseLogo />
          </Link>
          <div className="flex items-center gap-3">
            <GlobalAppearanceControls />
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary dark:hover:text-[#eb766a]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Home
            </Link>
          </div>
        </header>

        <section className="mt-8 border border-border dark:border-border bg-card p-6 shadow-sm dark:shadow-[0_4px_24px_rgba(0,0,0,0.35)] outline-none focus:outline-none ring-0 sm:p-8">
          <p className="text-center text-[10px] font-bold uppercase tracking-[0.15em] text-[#9a6d19] dark:text-[#f0c36a]">
            Public tracking
          </p>
          <h1 className="mt-2 text-center font-display text-3xl font-semibold text-foreground">
            Track a Purchase Request
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-center text-sm leading-6 text-muted-foreground">
            Enter the secure tracking token shared by the requesting office. This page displays process status only and does not disclose personal, pricing, or supplier information.
          </p>
          <form
            className="mx-auto mt-7 flex max-w-xl gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              setSubmittedToken(token.trim());
            }}
          >
            <Input
              value={token}
              onChange={(event) => setToken(event.target.value)}
              placeholder="Enter tracking token"
              className="h-10 rounded-[4px] border border-border dark:border-border bg-background dark:bg-[#151c24] text-foreground placeholder:text-muted-foreground text-sm"
            />
            <Button className="h-10 rounded-[4px] bg-[#7b1e1e] hover:bg-[#641818] text-white dark:bg-[#9a2828] dark:hover:bg-[#852020] focus:outline-none">
              <Search className="mr-1.5 h-4 w-4" />
              Track
            </Button>
          </form>
          {tracking.isError && (
            <p className="mt-4 text-center text-xs text-[#a32929] dark:text-red-400">
              No tracking record was found for this token.
            </p>
          )}
        </section>

        {record && (
          <section className="mt-6 border border-border bg-card p-6 shadow-sm dark:shadow-[0_4px_24px_rgba(0,0,0,0.35)] outline-none focus:outline-none ring-0 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#9a6d19] dark:text-[#f0c36a]">
                  {record.purchaseRequest.prNumber}
                </p>
                <h2 className="mt-1 text-lg font-semibold text-foreground">
                  {record.purchaseRequest.purpose}
                </h2>
              </div>
              <span className="rounded-full bg-[#f9f1e0] px-3 py-1 text-[10px] font-bold text-primary dark:bg-[#2e2017] dark:text-[#eb766a]">
                {record.purchaseRequest.status.replaceAll("_", " ").toUpperCase()}
              </span>
            </div>
            <ol className="mt-8 space-y-0">
              {stages.map((stage, stagePosition) => (
                <li key={stage} className="relative flex gap-4 pb-7 last:pb-0">
                  <div className="relative z-10 grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 border-card bg-muted/60 dark:border-card dark:bg-muted">
                    {stagePosition <= index ? (
                      <CheckCircle2 className="h-5 w-5 text-primary dark:text-[#eb766a]" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  {stagePosition < stages.length - 1 && (
                    <span
                      className={`absolute left-[13px] top-7 h-[calc(100%-18px)] w-px ${
                        stagePosition < index ? "bg-primary dark:bg-[#eb766a]" : "bg-border"
                      }`}
                    />
                  )}
                  <div className="pt-1">
                    <p
                      className={`text-sm font-semibold ${
                        stagePosition <= index ? "text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {stage}
                    </p>
                    <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
                      {stagePosition === index
                        ? "Current workflow position"
                        : stagePosition < index
                        ? "Completed or recorded"
                        : "Awaiting the required authorized action"}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="mt-8 border-t border-border pt-5">
              <p className="text-xs font-semibold text-foreground">Recorded milestones</p>
              {record.events.length ? (
                <ul className="mt-3 space-y-2 text-[11px] text-muted-foreground">
                  {record.events.slice(-6).map((event, eventIndex) => (
                    <li key={`${event.action}-${eventIndex}`} className="flex justify-between gap-3">
                      <span>{event.action.replaceAll("_", " ")}</span>
                      <span>{new Date(event.createdAt).toLocaleDateString("en-PH")}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-[11px] text-muted-foreground">No public milestones are available yet.</p>
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
