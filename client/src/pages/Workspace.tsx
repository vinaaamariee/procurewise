import { EmptyWorkspace } from "@/components/EmptyWorkspace";
import { OfficialPurchaseRequestCanvas } from "@/components/OfficialPurchaseRequestCanvas";
import { PageHeader } from "@/components/PageHeader";
import { RecordTable, RecordTableHeader } from "@/components/RecordTable";
import { StatusBadge } from "@/components/StatusBadge";
import { WorkflowTimeline } from "@/components/WorkflowTimeline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { CircleAlert, Info, LoaderCircle, Plus, Search, Star, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type WorkspaceKind = "rfq" | "po" | "plans" | "suppliers" | "budgets" | "analytics" | "audit";
type RequestItem = { catalogItemId: string; stockPropertyNo: string; description: string; specification: string; quantity: string; unit: string; estimatedUnitCost: string };

const content: Record<WorkspaceKind, { eyebrow: string; title: string; description: string; emptyTitle: string; emptyDescription: string }> = {
  rfq: { eyebrow: "Quotation management", title: "RFQs & quotation canvass", description: "Prepare procurement canvasses, compare supplier quotations, and document compliant selection.", emptyTitle: "No RFQ or supplier quotation records yet.", emptyDescription: "RFQs appear here after an approved PR is endorsed to Supply for canvassing." },
  po: { eyebrow: "Purchase execution", title: "Abstracts & Purchase Orders", description: "Compile quotation abstracts and generate purchase orders only after the required approvals.", emptyTitle: "No quotation abstract or purchase order records yet.", emptyDescription: "Approved selection recommendations will be available here for PO processing." },
  plans: { eyebrow: "Annual planning", title: "APP / PPMP monitoring", description: "Manage annual procurement plans and department PPMP entries, then monitor actual procurement against plans.", emptyTitle: "No APP or PPMP entries have been registered.", emptyDescription: "Add department-specific planned procurement entries to begin monitoring plan-versus-actual progress." },
  suppliers: { eyebrow: "Vendor registry", title: "Accredited suppliers", description: "Maintain supplier contact information, accreditation notes, and declared product or service offerings.", emptyTitle: "No supplier records have been registered.", emptyDescription: "Register an accredited supplier before selecting them for canvassing or quotation comparison." },
  budgets: { eyebrow: "Allotment control", title: "Budget utilization", description: "Track budget availability and commitment by office and object of expenditure—not only as a system-wide total.", emptyTitle: "No budget allotments have been registered.", emptyDescription: "Record office-level appropriation and object-of-expenditure limits to validate Purchase Requests." },
  analytics: { eyebrow: "Procurement intelligence", title: "Analytics & performance", description: "Review procurement cycle time, plan-versus-actual budget variance, and recurring commodity demand.", emptyTitle: "Analytics are ready when procurement records are available.", emptyDescription: "As PRs, RFQs, and POs move through the workflow, this workspace will calculate the requested operational measures." },
  audit: { eyebrow: "Accountability", title: "Audit trail", description: "Maintain a transaction history of record creation, approvals, returns, status changes, and other workflow actions.", emptyTitle: "No audit events have been recorded.", emptyDescription: "Each authorised transaction action will create a time-stamped accountability entry in this workspace." },
};

export function PurchaseRequestsPage() {
  const [isCreating, setIsCreating] = useState(() => new URLSearchParams(window.location.search).get("create") === "1");
  const utils = trpc.useUtils();
  const purchaseRequests = trpc.procurement.purchaseRequests.list.useQuery(undefined, { retry: false });
  const setup = trpc.procurement.setup.details.useQuery(undefined, { retry: false });
  const dashboard = trpc.procurement.dashboard.useQuery(undefined, { retry: false });
  const submitRequest = trpc.procurement.purchaseRequests.advance.useMutation({
    onSuccess: () => { toast.success("Complete procurement package forwarded to the Procurement Officer."); void utils.procurement.purchaseRequests.list.invalidate(); void utils.procurement.dashboard.invalidate(); },
    onError: (error) => toast.error(error.message),
  });
  const createRequest = trpc.procurement.purchaseRequests.create.useMutation({
    onSuccess: (created) => {
      void navigator.clipboard?.writeText(created.trackingToken);
      toast.success("Purchase Request created. Its public tracking token was copied to your clipboard.");
      setIsCreating(false);
      void utils.procurement.purchaseRequests.list.invalidate();
      void utils.procurement.dashboard.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  return <div className="mx-auto max-w-[1240px]">
    <PageHeader eyebrow="End-User package" title="PPMP-linked Purchase Requests" description="Create an itemized Purchase Request, link it to PPMP planning, attach a three-supplier Pre-Canvass, and forward the complete package to Procurement." action={{ label: "New Purchase Request", onClick: () => setIsCreating(!isCreating) }} />
    {isCreating ? <PurchaseRequestForm setup={setup.data} ppmpEntries={dashboard.data?.appPpmpEntries} isSaving={createRequest.isPending} onCancel={() => setIsCreating(false)} onCreate={(input) => createRequest.mutate(input)} /> : (
      <div className="mt-7">
        {purchaseRequests.isLoading ? <LoadingPanel label="Loading Purchase Requests" /> : purchaseRequests.data?.length ? <><PurchaseRequestTable records={purchaseRequests.data} onSubmit={(purchaseRequestId) => submitRequest.mutate({ purchaseRequestId })} submittingId={submitRequest.isPending ? submitRequest.variables?.purchaseRequestId : undefined} /><WorkflowTimeline status={purchaseRequests.data[0]?.status ?? "draft"} /></> : <EmptyWorkspace eyebrow="Purchase Request register" title="No PPMP-linked Purchase Requests have been submitted." description="Start with PPMP planning, add the Purchase Request, create a three-supplier Pre-Canvass, then forward the complete package to Procurement." actionLabel="Create your first PR" actionOnClick={() => setIsCreating(true)} />}
      </div>
    )}
  </div>;
}

function PurchaseRequestTable({ records, onSubmit, submittingId }: { records: Array<{ id: number; prNumber: string; purpose: string; totalEstimate: string; status: string; createdAt: Date }>; onSubmit: (purchaseRequestId: number) => void; submittingId?: number }) {
  const tone = (status: string) => status === "approved" ? "approved" : status.includes("review") ? "pending" : "draft";
  return <RecordTable><RecordTableHeader><tr><th className="px-4 py-3 font-semibold">PR number</th><th className="px-4 py-3 font-semibold">Purpose</th><th className="px-4 py-3 font-semibold">Amount</th><th className="px-4 py-3 font-semibold">Status</th><th className="px-4 py-3 font-semibold">Created</th><th className="px-4 py-3 font-semibold">Action</th></tr></RecordTableHeader><tbody className="divide-y divide-[#efebe4]">{records.map((record) => <tr key={record.id} className="hover:bg-[#fdfcf9]"><td className="px-4 py-3 font-semibold text-[#7b1e1e]">{record.prNumber}</td><td className="max-w-[350px] px-4 py-3 text-[#3e4855]">{record.purpose}</td><td className="px-4 py-3 text-[#3e4855]">₱{Number(record.totalEstimate).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</td><td className="px-4 py-3"><StatusBadge tone={tone(record.status)}>{record.status.replaceAll("_", " ").toUpperCase()}</StatusBadge></td><td className="px-4 py-3 text-[#74808c]">{new Date(record.createdAt).toLocaleDateString("en-PH")}</td><td className="px-4 py-3">{record.status === "draft" ? <Button size="sm" onClick={() => onSubmit(record.id)} disabled={submittingId === record.id} className="h-7 rounded-[4px] bg-[#7b1e1e] px-2.5 text-[10px] hover:bg-[#641818]">{submittingId === record.id && <LoaderCircle className="mr-1 h-3 w-3 animate-spin" />}Submit</Button> : <span className="text-[11px] text-[#87909b]">Awaiting assigned role</span>}</td></tr>)}</tbody></RecordTable>;
}

function PurchaseRequestForm({ setup, ppmpEntries, isSaving, onCancel, onCreate }: { setup?: { offices: Array<{ id: number; code: string; name: string }>; objectsOfExpenditure: Array<{ id: number; code: string; name: string }> }; ppmpEntries?: Array<{ id: number; description: string; fiscalYear: number }>; isSaving: boolean; onCancel: () => void; onCreate: (input: { purpose: string; fundSource?: string; fundCluster?: string; responsibilityCenterCode?: string; requesterDesignation?: string; ppmpEntryId: number; officeId: number; objectOfExpenditureId: number; items: Array<{ catalogItemId?: number; stockPropertyNo?: string; description: string; specification?: string; quantity: number; unit: string; estimatedUnitCost: number }> }) => void }) {
  const utils = trpc.useUtils();
  const [purpose, setPurpose] = useState("");
  const [fundSource, setFundSource] = useState("");
  const [fundCluster, setFundCluster] = useState("01101101");
  const [responsibilityCenterCode, setResponsibilityCenterCode] = useState("");
  const [requesterDesignation, setRequesterDesignation] = useState("");
  const [officeId, setOfficeId] = useState("");
  const [objectId, setObjectId] = useState("");
  const [ppmpEntryId, setPpmpEntryId] = useState("");
  const [items, setItems] = useState<RequestItem[]>([{ catalogItemId: "", stockPropertyNo: "", description: "", specification: "", quantity: "", unit: "", estimatedUnitCost: "" }]);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogCodeFamily, setCatalogCodeFamily] = useState("all");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const catalogInput = useMemo(() => ({ search: catalogSearch.trim() || undefined, codeFamily: catalogCodeFamily === "all" ? undefined : catalogCodeFamily, page: 1, limit: 100 }), [catalogSearch, catalogCodeFamily]);
  const catalog = trpc.procurement.catalog.list.useQuery(catalogInput, { retry: false });
  const codeFamilies = trpc.procurement.catalog.codeFamilies.useQuery(undefined, { retry: false });
  const favorites = trpc.procurement.catalog.favorites.useQuery(undefined, { retry: false });
  const favoriteIds = useMemo(() => new Set((favorites.data ?? []).map((catalogItem) => catalogItem.id)), [favorites.data]);
  const catalogItems = useMemo(() => {
    if (!favoritesOnly) return catalog.data?.items ?? [];
    const search = catalogSearch.trim().toLowerCase();
    return (favorites.data ?? []).filter((catalogItem) => (!catalogCodeFamily || catalogCodeFamily === "all" || catalogItem.productCode.startsWith(catalogCodeFamily)) && (!search || catalogItem.productCode.toLowerCase().includes(search) || catalogItem.description.toLowerCase().includes(search)));
  }, [catalog.data?.items, catalogCodeFamily, catalogSearch, favorites.data, favoritesOnly]);
  const toggleFavorite = trpc.procurement.catalog.setFavorite.useMutation({ onSuccess: () => { void utils.procurement.catalog.favorites.invalidate(); }, onError: (error) => toast.error(error.message) });
  const configurationReady = Boolean(setup?.offices.length && setup.objectsOfExpenditure.length);
  const selectedOffice = setup?.offices.find((office) => String(office.id) === officeId);
  const total = useMemo(() => items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.estimatedUnitCost) || 0), 0), [items]);
  const updateItem = (index: number, field: keyof RequestItem, value: string) => setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item));
  const addItem = () => setItems((current) => [...current, { catalogItemId: "", stockPropertyNo: "", description: "", specification: "", quantity: "", unit: "", estimatedUnitCost: "" }]);
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!configurationReady) return toast.error("An Admin must first add an office and object of expenditure.");
    if (!purpose.trim() || !ppmpEntryId || !officeId || !objectId || items.some((item) => !item.description.trim() || Number(item.quantity) <= 0 || Number(item.estimatedUnitCost) <= 0)) return toast.error("Complete the PPMP, purpose, budget references, and at least one valid item.");
    onCreate({ purpose: purpose.trim(), fundSource: fundSource.trim() || undefined, fundCluster: fundCluster.trim() || undefined, responsibilityCenterCode: responsibilityCenterCode.trim() || undefined, requesterDesignation: requesterDesignation.trim() || undefined, ppmpEntryId: Number(ppmpEntryId), officeId: Number(officeId), objectOfExpenditureId: Number(objectId), items: items.map((item) => ({ catalogItemId: item.catalogItemId ? Number(item.catalogItemId) : undefined, stockPropertyNo: item.stockPropertyNo.trim() || undefined, description: item.description.trim(), specification: item.specification.trim() || undefined, quantity: Number(item.quantity), unit: item.unit.trim(), estimatedUnitCost: Number(item.estimatedUnitCost) })) });
  };

  return <div className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
    <form onSubmit={submit} className="min-w-0 space-y-6">
      <OfficialPurchaseRequestCanvas entityName="Batanes State College" fundCluster={fundCluster} officeSection={selectedOffice ? `${selectedOffice.code} — ${selectedOffice.name}` : ""} responsibilityCenterCode={responsibilityCenterCode} purpose={purpose} items={items} />

      <section aria-labelledby="pr-system-controls" className="border border-[#ded8cc] bg-[#fffdfa] p-4 sm:p-5">
        <div className="border-b border-[#e8e2d7] pb-4">
          <p id="pr-system-controls" className="text-xs font-semibold text-[#34404e]">System controls — not part of Appendix 60</p>
          <p className="mt-1 text-[11px] leading-5 text-[#77818d]">Use these role-gated fields to prepare the record. Recorded values populate the official form above; unavailable official fields remain blank.</p>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><Label className="text-xs font-semibold text-[#4c5664]">Linked PPMP entry</Label><Select value={ppmpEntryId} onValueChange={setPpmpEntryId} disabled={!ppmpEntries?.length}><SelectTrigger className="mt-2 h-9 rounded-[4px] border-[#dedad2] text-xs"><SelectValue placeholder="Select your PPMP entry" /></SelectTrigger><SelectContent>{ppmpEntries?.map((entry) => <SelectItem key={entry.id} value={String(entry.id)}>FY {entry.fiscalYear} — {entry.description}</SelectItem>)}</SelectContent></Select>{!ppmpEntries?.length && <p className="mt-1.5 text-[11px] text-[#9a6d19]">Create a PPMP entry before opening a Purchase Request.</p>}</div>
          <div className="sm:col-span-2"><Label htmlFor="pr-purpose" className="text-xs font-semibold text-[#4c5664]">Purpose</Label><Textarea id="pr-purpose" value={purpose} onChange={(event) => setPurpose(event.target.value)} placeholder="State the official purpose and intended use." className="mt-2 min-h-20 rounded-[4px] border-[#dedad2] text-sm focus-visible:ring-[#7b1e1e]" /></div>
          <div><Label className="text-xs font-semibold text-[#4c5664]">Office/Section</Label><Select value={officeId} onValueChange={setOfficeId} disabled={!configurationReady}><SelectTrigger className="mt-2 h-9 rounded-[4px] border-[#dedad2] text-xs"><SelectValue placeholder="Select office" /></SelectTrigger><SelectContent>{setup?.offices.map((office) => <SelectItem key={office.id} value={String(office.id)}>{office.code} — {office.name}</SelectItem>)}</SelectContent></Select></div>
          <div><Label className="text-xs font-semibold text-[#4c5664]">Object of expenditure</Label><Select value={objectId} onValueChange={setObjectId} disabled={!configurationReady}><SelectTrigger className="mt-2 h-9 rounded-[4px] border-[#dedad2] text-xs"><SelectValue placeholder="Select object" /></SelectTrigger><SelectContent>{setup?.objectsOfExpenditure.map((object) => <SelectItem key={object.id} value={String(object.id)}>{object.code} — {object.name}</SelectItem>)}</SelectContent></Select></div>
          <div><Label htmlFor="pr-fund-cluster" className="text-xs font-semibold text-[#4c5664]">Fund Cluster</Label><Input id="pr-fund-cluster" value={fundCluster} onChange={(event) => setFundCluster(event.target.value)} placeholder="Fund cluster" className="mt-2 h-9 rounded-[4px] border-[#dedad2] text-xs" /></div>
          <div><Label htmlFor="pr-responsibility-center" className="text-xs font-semibold text-[#4c5664]">Responsibility Center Code</Label><Input id="pr-responsibility-center" value={responsibilityCenterCode} onChange={(event) => setResponsibilityCenterCode(event.target.value)} placeholder="Responsibility center code" className="mt-2 h-9 rounded-[4px] border-[#dedad2] text-xs" /></div>
          <div><Label htmlFor="pr-requester-designation" className="text-xs font-semibold text-[#4c5664]">Requester designation</Label><Input id="pr-requester-designation" value={requesterDesignation} onChange={(event) => setRequesterDesignation(event.target.value)} placeholder="Designation for the recorded request" className="mt-2 h-9 rounded-[4px] border-[#dedad2] text-xs" /></div>
          <div><Label htmlFor="pr-fund-source" className="text-xs font-semibold text-[#4c5664]">Fund source <span className="font-normal text-[#8b949e]">(optional)</span></Label><Input id="pr-fund-source" value={fundSource} onChange={(event) => setFundSource(event.target.value)} placeholder="e.g., General Fund" className="mt-2 h-9 rounded-[4px] border-[#dedad2] text-xs" /></div>
        </div>

        <div className="mt-7 border-t border-[#ece8df] pt-5"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold text-[#4c5664]">Item details</p><p className="mt-1 text-[11px] text-[#77818d]">Select a catalog item to copy its description, UOM, product code, and reference price. Adjust the requested quantity and cost only where authorized.</p></div><Button type="button" variant="outline" onClick={addItem} className="h-8 rounded-[4px] border-[#d8d3ca] text-[11px]"><Plus className="mr-1 h-3.5 w-3.5" /> Add item</Button></div><div className="mt-4 grid max-w-3xl gap-2 sm:grid-cols-[1.25fr_.95fr_auto]"><div><Label htmlFor="catalog-search" className="text-[11px] font-semibold text-[#4c5664]">Find a common-use catalog item</Label><div className="relative mt-1.5"><Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9098a2]" /><Input id="catalog-search" value={catalogSearch} onChange={(event) => setCatalogSearch(event.target.value)} placeholder="Search code or description" className="h-9 rounded-[4px] border-[#d8d3ca] bg-[#fffefa] pl-9 text-xs" /></div></div><div><Label className="text-[11px] font-semibold text-[#4c5664]">Source code family</Label><Select value={catalogCodeFamily} onValueChange={setCatalogCodeFamily}><SelectTrigger className="mt-1.5 h-9 rounded-[4px] border-[#d8d3ca] bg-[#fffefa] text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All source code families</SelectItem>{codeFamilies.data?.map((family) => <SelectItem key={family.codeFamily} value={family.codeFamily}>{family.label} · {family.itemCount}</SelectItem>)}</SelectContent></Select></div><div className="flex items-end"><Button type="button" variant={favoritesOnly ? "default" : "outline"} onClick={() => setFavoritesOnly((current) => !current)} className={favoritesOnly ? "h-9 w-full rounded-[4px] bg-[#7b1e1e] text-xs hover:bg-[#641818]" : "h-9 w-full rounded-[4px] border-[#d8d3ca] text-xs"}><Star className={favoritesOnly ? "mr-1.5 h-3.5 w-3.5 fill-current" : "mr-1.5 h-3.5 w-3.5"} />Favorites ({favorites.data?.length ?? 0})</Button></div></div><p className="mt-1.5 text-[10px] text-[#7b8490]">{catalog.isLoading || codeFamilies.isLoading ? "Refreshing catalog filters…" : `${favoritesOnly ? catalogItems.length : catalog.data?.total ?? 0} item(s) available. Source code families preserve the supplied product-code grouping; no new item categories were invented.`}</p><div className="overflow-x-auto"><RecordTable className="mt-4 min-w-[920px]"><RecordTableHeader><tr><th className="px-3 py-3 font-semibold">Catalog item</th><th className="px-3 py-3 font-semibold">Favorite</th><th className="px-3 py-3 font-semibold">Stock / property no.</th><th className="px-3 py-3 font-semibold">Description</th><th className="px-3 py-3 font-semibold">Qty.</th><th className="px-3 py-3 font-semibold">Unit</th><th className="px-3 py-3 font-semibold">Est. unit cost</th><th className="w-10 px-2 py-3" /></tr></RecordTableHeader><tbody className="divide-y divide-[#efebe4]">{items.map((item, index) => { const selectedCatalogItem = [...catalogItems, ...(favorites.data ?? [])].find((catalogItem) => String(catalogItem.id) === item.catalogItemId); return <tr key={index}><td className="min-w-64 p-2"><Select value={item.catalogItemId || "manual-item"} onValueChange={(value) => { if (value === "manual-item") return updateItem(index, "catalogItemId", ""); const selected = [...catalogItems, ...(favorites.data ?? [])].find((catalogItem) => String(catalogItem.id) === value); if (!selected) return; setItems((current) => current.map((currentItem, itemIndex) => itemIndex === index ? { ...currentItem, catalogItemId: value, stockPropertyNo: selected.productCode, description: selected.description, unit: selected.unit || "", estimatedUnitCost: Number(selected.referencePrice).toFixed(2) } : currentItem)); }}><SelectTrigger className="h-8 min-w-64 border-[#e1ddd5] text-[10px]"><SelectValue placeholder="Manual item or select catalog" /></SelectTrigger><SelectContent><SelectItem value="manual-item">Manual item — no catalog reference</SelectItem>{catalogItems.map((catalogItem) => <SelectItem key={catalogItem.id} value={String(catalogItem.id)}>{favoriteIds.has(catalogItem.id) ? "★ " : ""}{catalogItem.productCode} — {catalogItem.description}</SelectItem>)}</SelectContent></Select></td><td className="p-2"><Button type="button" variant="ghost" size="icon" disabled={!selectedCatalogItem || toggleFavorite.isPending} title={selectedCatalogItem && favoriteIds.has(selectedCatalogItem.id) ? "Remove from favorites" : "Add selected item to favorites"} onClick={() => selectedCatalogItem && toggleFavorite.mutate({ catalogItemId: selectedCatalogItem.id, isFavorite: !favoriteIds.has(selectedCatalogItem.id) })} className="h-8 w-8 rounded-[4px] text-[#9a6d19] hover:bg-[#fffaf0]"><Star className={selectedCatalogItem && favoriteIds.has(selectedCatalogItem.id) ? "h-3.5 w-3.5 fill-current" : "h-3.5 w-3.5"} /></Button></td><td className="p-2"><Input value={item.stockPropertyNo} onChange={(event) => updateItem(index, "stockPropertyNo", event.target.value)} placeholder="Optional" className="h-8 w-28 border-[#e1ddd5] text-xs" /></td><td className="min-w-56 p-2"><Input value={item.description} onChange={(event) => updateItem(index, "description", event.target.value)} placeholder="Item description" className="h-8 border-[#e1ddd5] text-xs" /></td><td className="p-2"><Input value={item.quantity} onChange={(event) => updateItem(index, "quantity", event.target.value)} type="number" min="0.01" step="0.01" className="h-8 w-20 border-[#e1ddd5] text-xs" /></td><td className="p-2"><Input value={item.unit} onChange={(event) => updateItem(index, "unit", event.target.value)} className="h-8 w-20 border-[#e1ddd5] text-xs" /></td><td className="p-2"><Input value={item.estimatedUnitCost} onChange={(event) => updateItem(index, "estimatedUnitCost", event.target.value)} type="number" min="0.01" step="0.01" placeholder="0.00" className="h-8 w-28 border-[#e1ddd5] text-xs" /></td><td className="p-2"><Button type="button" variant="ghost" size="icon" disabled={items.length === 1} onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="h-8 w-8 rounded-[4px] text-[#9a5c5c] hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /></Button></td></tr>; })}</tbody></RecordTable></div><div className="mt-3 flex justify-end text-xs font-semibold text-[#4b5563]">Estimated total: <span className="ml-2 text-[#7b1e1e]">₱{total.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span></div></div>

        <div className="mt-6 flex flex-wrap justify-end gap-2"><Button type="button" variant="outline" onClick={onCancel} className="h-9 rounded-[4px] border-[#d8d3ca] text-xs">Cancel</Button><Button type="submit" disabled={isSaving || !configurationReady} className="h-9 rounded-[4px] bg-[#7b1e1e] text-xs hover:bg-[#641818]">{isSaving && <LoaderCircle className="mr-1.5 h-3.5 w-3.5 animate-spin" />}Save Purchase Request</Button></div>
      </section>
    </form>
    <aside className="h-fit border border-[#e4d4ae] bg-[#fffaf0] p-5"><div className="flex items-center gap-2 text-[#8a6520]"><Info className="h-4 w-4" /><p className="text-xs font-bold">Workflow guidance</p></div><p className="mt-3 text-[11px] leading-5 text-[#75643e]">Forwarding requires a linked PPMP entry and a submitted three-supplier Pre-Canvass. Procurement then creates the Abstract of Canvass and recommendation.</p><div className="mt-5 border-t border-[#eddfbe] pt-4"><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9a6d19]">Setup status</p><p className="mt-1.5 text-[11px] leading-5 text-[#75643e]">{configurationReady ? "Office and expenditure records are available for PPMP-linked request creation." : "An Admin must configure at least one office and object of expenditure before Purchase Requests can be created."}</p></div></aside>
  </div>;
}

function LoadingPanel({ label }: { label: string }) { return <div className="flat-panel grid min-h-72 place-items-center text-center"><div><LoaderCircle className="mx-auto h-5 w-5 animate-spin text-[#7b1e1e]" /><p className="mt-3 text-xs text-[#6e7885]">{label}</p></div></div>; }

export function WorkspacePage({ kind }: { kind: WorkspaceKind }) {
  const details = content[kind];
  const action = kind === "suppliers" ? "Register supplier" : kind === "plans" ? "Add planning entry" : kind === "budgets" ? "Add budget allotment" : undefined;
  return <div className="mx-auto max-w-[1240px]"><PageHeader eyebrow={details.eyebrow} title={details.title} description={details.description} action={action ? { label: action, onClick: () => toast.info("This configured workspace is ready for the appropriate authorised role.") } : undefined} />
    <div className="mt-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-2"><StatusBadge tone="draft">RECORD-BASED</StatusBadge><p className="text-[11px] text-[#74808c]">No placeholder transactions are shown.</p></div><div className="relative w-full sm:w-64"><Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9098a2]" /><Input placeholder="Search records" className="h-9 rounded-[4px] border-[#dfdbd3] bg-white pl-9 text-xs" /></div></div>
    <div className="mt-4"><EmptyWorkspace eyebrow={details.eyebrow} title={details.emptyTitle} description={details.emptyDescription} /></div>
    {kind === "rfq" && <div className="mt-6 flex items-start gap-3 border border-[#e4d4ae] bg-[#fffaf0] p-4"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-[#9a6d19]" /><p className="text-[11px] leading-5 text-[#75643e]">ProcureWise will not enable Abstract of Quotation preparation until a canvass contains at least three supplier quotation entries.</p></div>}
  </div>;
}
