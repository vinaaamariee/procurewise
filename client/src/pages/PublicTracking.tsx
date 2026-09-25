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
    <main className="min-h-screen bg-[#f8f7f3] px-4 py-8 text-[#202833] transition-colors duration-150 dark:bg-[#11161b] dark:text-[#f1f5f8] sm:px-6">
      <div className="mx-auto max-w-3xl">
        <header className="flex items-center justify-between border-b border-[#e1ddd4] pb-6 dark:border-[#384554]">
          <Link href="/">
            <ProcureWiseLogo />
          </Link>
          <div className="flex items-center gap-3">
            <GlobalAppearanceControls />
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5b6572] hover:text-[#7b1e1e] dark:text-[#aeb9c4] dark:hover:text-[#eb766a]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Home
            </Link>
          </div>
        </header>

        <section className="mt-8 border border-[#e1ddd4] bg-white p-6 shadow-[0_12px_36px_rgba(36,42,52,0.06)] dark:border-[#384554] dark:bg-[#1b2229] dark:shadow-[0_12px_36px_rgba(0,0,0,0.35)] sm:p-8">
          <p className="text-center text-[10px] font-bold uppercase tracking-[0.15em] text-[#9a6d19] dark:text-[#f0c36a]">
            Public tracking
          </p>
          <h1 className="mt-2 text-center font-display text-3xl font-semibold text-[#202833] dark:text-[#ffffff]">
            Track a Purchase Request
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-center text-sm leading-6 text-[#65717e] dark:text-[#d1dae2]">
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
              className="h-10 rounded-[4px] text-sm"
            />
            <Button className="h-10 rounded-[4px] bg-[#7b1e1e] hover:bg-[#641818] dark:bg-[#9a2828] dark:hover:bg-[#852020]">
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
          <section className="mt-6 border border-[#e1ddd4] bg-white p-6 shadow-[0_12px_36px_rgba(36,42,52,0.05)] dark:border-[#384554] dark:bg-[#1b2229] dark:shadow-[0_12px_36px_rgba(0,0,0,0.35)] sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#9a6d19] dark:text-[#f0c36a]">
                  {record.purchaseRequest.prNumber}
                </p>
                <h2 className="mt-1 text-lg font-semibold text-[#202833] dark:text-[#ffffff]">
                  {record.purchaseRequest.purpose}
                </h2>
              </div>
              <span className="rounded-full bg-[#f9f1e0] px-3 py-1 text-[10px] font-bold text-[#7b1e1e] dark:bg-[#2e2017] dark:text-[#eb766a]">
                {record.purchaseRequest.status.replaceAll("_", " ").toUpperCase()}
              </span>
            </div>
            <ol className="mt-8 space-y-0">
              {stages.map((stage, stagePosition) => (
                <li key={stage} className="relative flex gap-4 pb-7 last:pb-0">
                  <div className="relative z-10 grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 border-white bg-[#f0ece5] dark:border-[#1b2229] dark:bg-[#232c35]">
                    {stagePosition <= index ? (
                      <CheckCircle2 className="h-5 w-5 text-[#7b1e1e] dark:text-[#eb766a]" />
                    ) : (
                      <Circle className="h-4 w-4 text-[#aeb5bd] dark:text-[#64717d]" />
                    )}
                  </div>
                  {stagePosition < stages.length - 1 && (
                    <span
                      className={`absolute left-[13px] top-7 h-[calc(100%-18px)] w-px ${
                        stagePosition < index ? "bg-[#7b1e1e] dark:bg-[#eb766a]" : "bg-[#e5e1d9] dark:bg-[#384554]"
                      }`}
                    />
                  )}
                  <div className="pt-1">
                    <p
                      className={`text-sm font-semibold ${
                        stagePosition <= index ? "text-[#303946] dark:text-[#f1f5f8]" : "text-[#9aa1a9] dark:text-[#64717d]"
                      }`}
                    >
                      {stage}
                    </p>
                    <p className="mt-1 text-[11px] leading-5 text-[#77818d] dark:text-[#aeb9c4]">
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
            <div className="mt-8 border-t border-[#ece8df] pt-5 dark:border-[#384554]">
              <p className="text-xs font-semibold text-[#3f4a57] dark:text-[#f1f5f8]">Recorded milestones</p>
              {record.events.length ? (
                <ul className="mt-3 space-y-2 text-[11px] text-[#65717e] dark:text-[#d1dae2]">
                  {record.events.slice(-6).map((event, eventIndex) => (
                    <li key={`${event.action}-${eventIndex}`} className="flex justify-between gap-3">
                      <span>{event.action.replaceAll("_", " ")}</span>
                      <span>{new Date(event.createdAt).toLocaleDateString("en-PH")}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-[11px] text-[#77818d] dark:text-[#aeb9c4]">No public milestones are available yet.</p>
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
