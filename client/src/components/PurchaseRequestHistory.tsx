import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { ChevronDown, ChevronRight, LoaderCircle } from "lucide-react";
import { useState } from "react";

export function PurchaseRequestHistory({ purchaseRequestId }: { purchaseRequestId: number }) {
  const [open, setOpen] = useState(false);
  const history = trpc.procurement.purchaseRequests.history.useQuery({ purchaseRequestId }, { enabled: open, retry: false });
  return (
    <div className="mt-1.5">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="h-8 px-2 text-xs font-semibold text-[#7b1e1e] hover:bg-[#fff8ee] hover:text-[#641818] dark:text-[#ff9b91] dark:hover:bg-[#3a2422] dark:hover:text-[#ffd1cc]"
      >
        {open ? <ChevronDown className="mr-1 h-3.5 w-3.5" /> : <ChevronRight className="mr-1 h-3.5 w-3.5" />}
        View history
      </Button>
      {open ? (
        <div className="mt-2 max-w-[min(340px,calc(100vw-3rem))] rounded-[3px] border border-[#d9cbb5] bg-[#fffdf8] p-3 dark:border-[#596675] dark:bg-[#202a34]">
          {history.isLoading ? (
            <LoaderCircle className="h-4 w-4 animate-spin text-[#9a6d19] dark:text-[#f0c36a]" />
          ) : history.error ? (
            <p className="text-xs text-[#9c2525] dark:text-[#ffaaa3]">Unable to load history.</p>
          ) : (
            <>
              <p className="text-xs font-semibold text-[#7b1e1e] dark:text-[#ff9b91]">
                {history.data?.totalRejectionCount ?? 0} rejection{history.data?.totalRejectionCount === 1 ? "" : "s"} · {history.data?.totalCorrectionCount ?? 0} correction{history.data?.totalCorrectionCount === 1 ? "" : "s"}
              </p>
              <div className="mt-2 space-y-2.5">
                {history.data?.timeline.map((event) => (
                  <div key={event.id} className="border-l-2 border-[#c9a85f] pl-2.5 text-xs leading-5 text-[#536170] dark:border-[#d5b36a] dark:text-[#cbd5df]">
                    <p className="font-semibold text-[#34404e] dark:text-[#f1f5f8]">
                      {event.action.replaceAll("_", " ")}
                    </p>
                    <p>
                      {new Date(event.timestamp).toLocaleString("en-PH")} · {event.actorRole}
                    </p>
                    {event.reason ? (
                      <p className="text-[#9c2525] dark:text-[#ffaaa3]">Reason: {event.reason}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
