import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { ChevronDown, ChevronRight, LoaderCircle } from "lucide-react";
import { useState } from "react";

export function PurchaseRequestHistory({ purchaseRequestId }: { purchaseRequestId: number }) {
  const [open, setOpen] = useState(false);
  const history = trpc.procurement.purchaseRequests.history.useQuery({ purchaseRequestId }, { enabled: open, retry: false });
  return <div className="mt-1.5"><Button type="button" variant="ghost" size="sm" onClick={() => setOpen((value) => !value)} className="h-6 px-1.5 text-[10px] text-[#7b1e1e] hover:bg-[#fff8ee] hover:text-[#641818]">{open ? <ChevronDown className="mr-1 h-3 w-3" /> : <ChevronRight className="mr-1 h-3 w-3" />}View history</Button>{open ? <div className="mt-2 max-w-[340px] rounded-[3px] border border-[#eadfcd] bg-[#fffdf8] p-2.5">{history.isLoading ? <LoaderCircle className="h-3.5 w-3.5 animate-spin text-[#9a6d19]" /> : history.error ? <p className="text-[10px] text-[#9c2525]">Unable to load history.</p> : <><p className="text-[10px] font-semibold text-[#7b1e1e]">{history.data?.totalRejectionCount ?? 0} rejection{history.data?.totalRejectionCount === 1 ? "" : "s"} · {history.data?.totalCorrectionCount ?? 0} correction{history.data?.totalCorrectionCount === 1 ? "" : "s"}</p><div className="mt-2 space-y-2">{history.data?.timeline.map((event) => <div key={event.id} className="border-l-2 border-[#d5b36a] pl-2 text-[10px] leading-4 text-[#65717e]"><p className="font-semibold text-[#3e4855]">{event.action.replaceAll("_", " ")}</p><p>{new Date(event.timestamp).toLocaleString("en-PH")} · {event.actorRole}</p>{event.reason ? <p className="text-[#9c2525]">Reason: {event.reason}</p> : null}</div>)}</div></>}</div> : null}</div>;
}
