import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buildBestValuePolicyHistoryCsv, downloadCsv } from "@/lib/procurementExports";
import { downloadBestValuePolicyHistoryPdf } from "@/lib/procurementPdf";
import { trpc } from "@/lib/trpc";
import { normalizeProcurementRole } from "../../../shared/procurementRules";
import { BEST_VALUE_CRITERIA, type BestValueCriterionKey } from "../../../shared/bestValuePolicy";
import { AlertTriangle, CheckCircle2, FileDown, FileText, LoaderCircle, Scale, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type WeightDraft = Record<BestValueCriterionKey, string>;

function createWeightDraft(weights: Array<{ criterionKey: string; weight: number }>): WeightDraft {
  return Object.fromEntries(BEST_VALUE_CRITERIA.map((criterion) => {
    const saved = weights.find((item) => item.criterionKey === criterion.criterionKey)?.weight ?? criterion.defaultWeight;
    return [criterion.criterionKey, String(saved)];
  })) as WeightDraft;
}

export function BestValuePolicySettingsPage() {
  const { user } = useAuth();
  const isAdmin = user ? normalizeProcurementRole(user.role) === "admin" : false;
  const policy = trpc.procurement.bestValuePolicy.active.useQuery(undefined, { enabled: isAdmin, retry: false });
  const history = trpc.procurement.bestValuePolicy.history.useQuery(undefined, { enabled: isAdmin, retry: false });
  const utils = trpc.useUtils();
  const [policyName, setPolicyName] = useState("Initial Best Value Policy");
  const [weights, setWeights] = useState<WeightDraft>(() => createWeightDraft([]));

  useEffect(() => {
    if (!policy.data) return;
    setPolicyName(policy.data.policy.name);
    setWeights(createWeightDraft(policy.data.criteria));
  }, [policy.data]);

  const total = useMemo(() => Math.round(BEST_VALUE_CRITERIA.reduce((sum, criterion) => sum + Number(weights[criterion.criterionKey] || 0), 0) * 100) / 100, [weights]);
  const hasInvalidWeight = BEST_VALUE_CRITERIA.some((criterion) => {
    const value = Number(weights[criterion.criterionKey]);
    return !Number.isFinite(value) || value < 0 || value > 100;
  });
  const isValid = total === 100 && !hasInvalidWeight && policyName.trim().length >= 3;
  const save = trpc.procurement.bestValuePolicy.save.useMutation({
    onSuccess: (saved) => {
      toast.success(`Best Value Policy version ${saved.policy.version} is now active.`);
      void utils.procurement.bestValuePolicy.active.invalidate();
      void utils.procurement.bestValuePolicy.history.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  if (!isAdmin) {
    return <div className="mx-auto max-w-[980px]"><PageHeader eyebrow="Administrative controls" title="Best Value Policy" description="Only administrators may review or revise the institution’s saved recommendation criteria." /><section className="flat-panel mt-7 p-6 text-center"><ShieldCheck className="mx-auto h-7 w-7 text-[#9a6d19]" /><p className="mt-3 text-sm font-semibold text-[#3f4a57]">Administrative permission required</p><p className="mx-auto mt-1 max-w-xl text-[11px] leading-5 text-[#77818d]">Your current role cannot view or change Best Value policy weights. Procurement recommendation and approval controls remain role-gated.</p></section></div>;
  }

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isValid) return toast.error("Set valid criteria weights that total exactly 100% before saving.");
    save.mutate({ name: policyName.trim(), criteria: BEST_VALUE_CRITERIA.map((criterion) => ({ criterionKey: criterion.criterionKey, weight: Number(weights[criterion.criterionKey]) })) });
  };

  const downloadHistoryCsv = () => {
    if (!history.data?.length) return toast.error("No saved policy versions are available for export yet.");
    downloadCsv("BestValuePolicy_History_ComplianceReport.csv", buildBestValuePolicyHistoryCsv(history.data));
  };
  const downloadHistoryPdf = () => {
    if (!history.data?.length) return toast.error("No saved policy versions are available for export yet.");
    downloadBestValuePolicyHistoryPdf(history.data);
  };

  return <div className="mx-auto max-w-[980px]">
    <PageHeader eyebrow="Administrative controls" title="Best Value Policy" description="Set the institution’s controlled recommendation weights. Each save creates a new active version and retains the prior version for audit history." />
    <section className="mt-6 border border-[#e4d4ae] bg-[#fffaf0] p-4 text-[#72561d] sm:p-5">
      <div className="flex gap-3"><Scale className="mt-0.5 h-4 w-4 shrink-0" /><div><p className="text-xs font-semibold">Decision support only</p><p className="mt-1 text-[11px] leading-5">Policy weights guide the future Best Value recommendation engine. A Procurement Officer prepares recommendations and the Administrative Approver remains responsible for the final decision. This setting does not automatically issue an award or Purchase Order.</p></div></div>
    </section>
    <form onSubmit={submit} className="mt-6 flat-panel overflow-hidden">
      <div className="border-b border-[#ece8df] px-5 py-4 sm:px-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-semibold text-[#34404e]">Active policy configuration</p><p className="mt-1 text-[11px] leading-5 text-[#77818d]">{policy.data?.policy.isPersisted ? `Version ${policy.data.policy.version} is active. Saving creates version ${policy.data.policy.version + 1}.` : "No policy version has been saved yet. Saving will create version 1."}</p></div><div className={`rounded-[4px] border px-3 py-2 text-right ${isValid ? "border-[#b7d8c4] bg-[#eff9f2] text-[#27633b]" : "border-[#e4d4ae] bg-[#fffaf0] text-[#72561d]"}`}><p className="text-[10px] font-bold uppercase tracking-[0.12em]">Weight total</p><p className="mt-0.5 text-lg font-semibold leading-none">{total.toFixed(2)}%</p></div></div></div>
      <div className="p-5 sm:p-6"><div className="max-w-xl"><Label htmlFor="best-value-policy-name" className="text-[11px] font-semibold">Policy name</Label><Input id="best-value-policy-name" value={policyName} onChange={(event) => setPolicyName(event.target.value)} className="mt-1.5 h-9 rounded-[4px] text-xs" maxLength={180} /></div>
        <div className="mt-6 overflow-hidden rounded-[4px] border border-[#e7e1d6]"><div className="grid grid-cols-[minmax(0,1fr)_116px] gap-4 border-b border-[#e7e1d6] bg-[#f8f6f1] px-4 py-3 text-[10px] font-bold uppercase tracking-[0.11em] text-[#7c7368]"><span>Criterion and evidence basis</span><span className="text-right">Weight</span></div>{BEST_VALUE_CRITERIA.map((criterion) => <div key={criterion.criterionKey} className="grid grid-cols-[minmax(0,1fr)_116px] gap-4 border-b border-[#eeeae2] px-4 py-4 last:border-b-0"><div><p className="text-xs font-semibold text-[#34404e]">{criterion.label}</p><p className="mt-1 text-[11px] leading-5 text-[#77818d]">{criterion.description}</p></div><div><Label htmlFor={`weight-${criterion.criterionKey}`} className="sr-only">{criterion.label} weight</Label><div className="relative"><Input id={`weight-${criterion.criterionKey}`} value={weights[criterion.criterionKey]} onChange={(event) => setWeights((current) => ({ ...current, [criterion.criterionKey]: event.target.value }))} type="number" min="0" max="100" step="0.01" inputMode="decimal" className="h-9 rounded-[4px] pr-7 text-right text-xs" /><span className="pointer-events-none absolute right-2.5 top-2 text-xs text-[#77818d]">%</span></div></div></div>)}</div>
        <div className={`mt-5 flex gap-3 rounded-[4px] border p-3 ${isValid ? "border-[#b7d8c4] bg-[#eff9f2] text-[#27633b]" : "border-[#e4d4ae] bg-[#fffaf0] text-[#72561d]"}`}>{isValid ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}<p className="text-[11px] leading-5">{isValid ? "Weights are valid and total exactly 100%. Saving will activate a new version and preserve the current version for audit history." : "Weights must be numeric, between 0% and 100%, and total exactly 100% before the policy can be saved."}</p></div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#ece8df] bg-[#fbfaf7] px-5 py-4 sm:px-6"><p className="max-w-2xl text-[10px] leading-5 text-[#77818d]">The legacy MCDM calculation remains unchanged until the enhanced Best Value recommendation engine is implemented. This page establishes the approved, auditable policy configuration for that work.</p><Button disabled={!isValid || save.isPending || policy.isLoading} className="h-9 rounded-[4px] bg-[#7b1e1e] text-xs hover:bg-[#641818]">{save.isPending && <LoaderCircle className="mr-1.5 h-3.5 w-3.5 animate-spin" />}Save new policy version</Button></div>
    </form>
    <section className="flat-panel mt-6 overflow-hidden"><div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#ece8df] px-5 py-4 sm:px-6"><div><p className="text-sm font-semibold text-[#34404e]">Policy version history</p><p className="mt-1 text-[11px] leading-5 text-[#77818d]">Download the complete authorized policy register with criteria weights, active status, administrator context, and activation audit details.</p></div><div className="flex flex-wrap gap-2"><Button type="button" size="sm" variant="outline" onClick={downloadHistoryCsv} disabled={!history.data?.length} className="h-8 rounded-[4px] text-[11px]"><FileDown className="mr-1.5 h-3.5 w-3.5" />CSV</Button><Button type="button" size="sm" variant="outline" onClick={downloadHistoryPdf} disabled={!history.data?.length} className="h-8 rounded-[4px] text-[11px]"><FileText className="mr-1.5 h-3.5 w-3.5" />Compliance PDF</Button></div></div>{history.isLoading ? <div className="flex items-center gap-2 p-5 text-[11px] text-[#77818d]"><LoaderCircle className="h-3.5 w-3.5 animate-spin" />Loading saved policy history…</div> : history.data?.length ? <div className="divide-y divide-[#efebe4]">{history.data.map((entry) => <div key={entry.policy.id} className="flex flex-wrap items-start justify-between gap-4 p-5"><div><div className="flex flex-wrap items-center gap-2"><p className="text-xs font-semibold text-[#7b1e1e]">{entry.policy.policyCode} · Version {entry.policy.version}</p><span className={`rounded-[3px] border px-1.5 py-0.5 text-[9px] font-bold ${entry.policy.isActive ? "border-[#b7d8c4] bg-[#eff9f2] text-[#27633b]" : "border-[#dfd9ce] bg-[#f7f5f1] text-[#6d7580]"}`}>{entry.policy.isActive ? "ACTIVE" : "INACTIVE"}</span></div><p className="mt-1 text-sm font-medium text-[#3f4a57]">{entry.policy.name}</p><p className="mt-1 text-[11px] text-[#77818d]">Saved {new Date(entry.policy.createdAt).toLocaleString("en-PH")} · {entry.createdBy?.name || entry.createdBy?.email || "Recorded administrator"}</p></div><div className="text-right"><p className="text-lg font-semibold text-[#34404e]">{Number(entry.policy.totalWeight).toFixed(2)}%</p><p className="mt-1 text-[10px] uppercase tracking-[0.1em] text-[#9a6d19]">{entry.criteria.length} criteria</p></div></div>)}</div> : <div className="grid min-h-32 place-items-center p-5 text-center"><div><FileText className="mx-auto h-5 w-5 text-[#b0a38d]" /><p className="mt-2 text-xs font-semibold text-[#566171]">No saved policy versions yet</p><p className="mt-1 text-[11px] text-[#77818d]">Save the reviewed policy configuration to establish the first exportable compliance record.</p></div></div>}</section>
  </div>;
}
