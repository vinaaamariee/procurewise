import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Archive, ArchiveRestore, LoaderCircle, ShieldAlert, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const defaultArchiveReason = "Completed non-operational workflow verification; archived by an Administrator.";

export default function TestRecordManagementPage() {
  const utils = trpc.useUtils();
  const records = trpc.procurement.testRecords.list.useQuery(undefined, { retry: false });
  const [reasons, setReasons] = useState<Record<number, string>>({});
  const archive = trpc.procurement.testRecords.archive.useMutation({
    onSuccess: () => { toast.success("Test-only package archived and removed from normal workspaces."); void utils.procurement.testRecords.list.invalidate(); void utils.procurement.dashboard.invalidate(); void utils.procurement.purchaseRequests.list.invalidate(); },
    onError: (error) => toast.error(error.message),
  });
  const cleanup = trpc.procurement.testRecords.cleanup.useMutation({
    onSuccess: () => { toast.success("Eligible test-only package records were cleaned. Audit evidence was retained."); void utils.procurement.testRecords.list.invalidate(); void utils.procurement.dashboard.invalidate(); void utils.procurement.purchaseRequests.list.invalidate(); },
    onError: (error) => toast.error(error.message),
  });

  return <div className="mx-auto max-w-[1240px]">
    <PageHeader eyebrow="Admin controls" title="Test-record archive & cleanup" description="Review only clearly labelled non-operational test packages. Archiving hides a package from standard workspaces; cleanup removes its package records after archive while retaining an audit trail." />
    <section className="mt-7 border border-[#e1c7c1] bg-[#fff7f5] p-4 sm:p-5">
      <div className="flex gap-3"><ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-[#9a3429]" /><div><p className="text-sm font-semibold text-[#7b1e1e]">Operational records are protected</p><p className="mt-1 text-xs leading-5 text-[#784f49]">Only packages carrying multiple test-only markers and dedicated TEST reference codes appear here. Cleanup is unavailable until an Admin archives the package, and audit events are retained after cleanup.</p></div></div>
    </section>
    <section className="mt-6 space-y-4">
      {records.isLoading ? <div className="flat-panel grid min-h-48 place-items-center"><LoaderCircle className="h-5 w-5 animate-spin text-[#7b1e1e]" /></div> : records.data?.length ? records.data.map((record) => {
        const archiveRecord = record.archive;
        const reason = reasons[record.ppmp.id] ?? defaultArchiveReason;
        const isCleaned = Boolean(archiveRecord?.cleanedAt);
        return <article key={record.ppmp.id} className="flat-panel p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9a6d19]">Test-only PPMP package #{record.ppmp.id}</p><h2 className="mt-1 text-base font-semibold text-[#364250]">{record.ppmp.description}</h2><p className="mt-1 text-xs text-[#74808c]">{record.officeCode} · {record.objectCode} · FY {record.ppmp.fiscalYear} · ₱{Number(record.ppmp.plannedAmount).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</p></div><span className={isCleaned ? "border border-[#b7c8bd] bg-[#f0f8f1] px-2 py-1 text-[10px] font-bold text-[#2f6a43]" : archiveRecord ? "border border-[#e8d6a8] bg-[#fff9e9] px-2 py-1 text-[10px] font-bold text-[#86641d]" : "border border-[#c8d6e4] bg-[#f4f8fc] px-2 py-1 text-[10px] font-bold text-[#466781]"}>{isCleaned ? "CLEANED" : archiveRecord ? "ARCHIVED" : "ACTIVE TEST"}</span></div>
          <div className="mt-4 border-t border-[#ece8df] pt-4"><p className="text-[11px] font-semibold text-[#566270]">Linked Purchase Requests</p>{record.purchaseRequests.length ? <div className="mt-2 flex flex-wrap gap-2">{record.purchaseRequests.map((purchaseRequest) => <span key={purchaseRequest.id} className="border border-[#e4e1da] bg-[#fbfaf7] px-2 py-1 text-[11px] text-[#5c6773]">{purchaseRequest.prNumber} · {purchaseRequest.status.replaceAll("_", " ")} · ₱{Number(purchaseRequest.totalEstimate).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>)}</div> : <p className="mt-1 text-[11px] text-[#74808c]">Linked transaction records have been removed by cleanup.</p>}</div>
          {!archiveRecord && <div className="mt-5"><label className="text-[11px] font-semibold text-[#566270]">Archive reason</label><Textarea value={reason} onChange={(event) => setReasons((current) => ({ ...current, [record.ppmp.id]: event.target.value }))} className="mt-1.5 min-h-18 text-xs" /><Button type="button" disabled={archive.isPending || reason.trim().length < 12} onClick={() => archive.mutate({ ppmpEntryId: record.ppmp.id, reason: reason.trim() })} className="mt-3 h-9 rounded-[4px] bg-[#7b1e1e] text-xs hover:bg-[#641818]"><Archive className="mr-1.5 h-3.5 w-3.5" />Archive test package</Button></div>}
          {archiveRecord && !isCleaned && <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#ece8df] pt-4"><p className="text-[11px] leading-5 text-[#7a6057]">Archived {new Date(archiveRecord?.archivedAt).toLocaleString("en-PH")}. Cleanup removes only this eligible test package and returns its test budget commitment.</p><Button type="button" variant="destructive" disabled={cleanup.isPending} onClick={() => { if (window.confirm("Permanently remove this archived test-only package and its linked test transaction records? Audit evidence will remain.")) cleanup.mutate({ ppmpEntryId: record.ppmp.id }); }} className="h-9 rounded-[4px] text-xs"><Trash2 className="mr-1.5 h-3.5 w-3.5" />Clean up test records</Button></div>}
          {isCleaned && <p className="mt-5 flex items-center gap-1.5 border-t border-[#ece8df] pt-4 text-[11px] text-[#3f7350]"><ArchiveRestore className="h-3.5 w-3.5" />Cleaned {new Date(archiveRecord?.cleanedAt!).toLocaleString("en-PH")}. The audit trail remains available.</p>}
        </article>;
      }) : <div className="flat-panel p-10 text-center"><Archive className="mx-auto h-6 w-6 text-[#9a6d19]" /><p className="mt-3 text-sm font-semibold text-[#43505e]">No eligible test-only packages found.</p><p className="mt-1 text-xs leading-5 text-[#74808c]">Operational procurement records never appear in this administrative cleanup area.</p></div>}
    </section>
  </div>;
}
