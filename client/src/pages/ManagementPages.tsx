import { EmptyWorkspace } from "@/components/EmptyWorkspace";
import { useAuth } from "@/_core/hooks/useAuth";
import { PageHeader } from "@/components/PageHeader";
import { RecordTable, RecordTableHeader } from "@/components/RecordTable";
import { StatusBadge } from "@/components/StatusBadge";
import { FormShell } from "@/components/FormShell";
import { SupplierTagManager } from "@/components/SupplierTagManager";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OfficialPurchaseOrderCanvas, type PurchaseOrderItem } from "@/components/OfficialPurchaseOrderCanvas";
import { OfficeSelect } from "@/components/OfficeSelect";
import { buildPpmpCsv, downloadCsv } from "@/lib/procurementExports";
import { downloadPpmpPdf, downloadPurchaseOrderPdf } from "@/lib/procurementPdf";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { normalizeProcurementRole } from "../../../shared/procurementRules";
import { AlertTriangle, ArrowRight, ArrowUpDown, Ban, BarChart3, CheckCircle2, ChevronLeft, ChevronRight, Clock, Download, FileCheck2, FileSearch, FileSpreadsheet, FileText, Layers, LoaderCircle, Paperclip, Plus, Printer, RotateCcw, ScrollText, Search, Send, Star, Trash2, TrendingUp, Truck, UsersRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

function formatMoney(value: number | string) { return `₱${Number(value).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`; }

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("The selected file could not be read."));
    reader.onload = () => {
      const result = String(reader.result || "");
      resolve(result.includes(",") ? result.split(",")[1] || "" : result);
    };
    reader.readAsDataURL(file);
  });
}

export function SupplierRegistryPage() {
  const [creating, setCreating] = useState(false);
  const utils = trpc.useUtils();
  const setup = trpc.procurement.setup.details.useQuery(undefined, { retry: false });
  const createSupplier = trpc.procurement.setup.createSupplier.useMutation({ onSuccess: () => { toast.success("Supplier registered."); setCreating(false); void utils.procurement.setup.details.invalidate(); }, onError: (error) => toast.error(error.message) });
  return <div className="mx-auto max-w-[1240px]"><PageHeader eyebrow="Vendor registry" title="Accredited suppliers" description="Maintain supplier contact information, accreditation status, and declared product or service offerings." action={{ label: "Register supplier", onClick: () => setCreating(!creating) }} />
    {creating && <SupplierForm isSaving={createSupplier.isPending} onCancel={() => setCreating(false)} onCreate={(input) => createSupplier.mutate(input)} />}
    {setup.data?.suppliers.length ? <SupplierTagManager suppliers={setup.data.suppliers} /> : null}
    <div className="mt-7">{setup.isLoading ? <LoadingPanel label="Loading supplier registry" /> : setup.data?.suppliers.length ? <RecordTable><RecordTableHeader><tr><th className="px-4 py-3 font-semibold">Supplier</th><th className="px-4 py-3 font-semibold">Contact</th><th className="px-4 py-3 font-semibold">Offerings</th><th className="px-4 py-3 font-semibold">Accreditation</th></tr></RecordTableHeader><tbody className="divide-y divide-[#efebe4]">{setup.data.suppliers.map((supplier) => <tr key={supplier.id}><td className="px-4 py-3"><p className="font-semibold text-[#3e4855]">{supplier.companyName}</p><p className="mt-0.5 text-[11px] text-[#7a8490]">{supplier.supplierCode}</p></td><td className="px-4 py-3 text-[#65717e]"><p>{supplier.contactPerson || "—"}</p><p className="mt-0.5 text-[11px]">{supplier.email || supplier.phone || "No contact details"}</p></td><td className="max-w-xs px-4 py-3 text-[#65717e]">{supplier.offerings || "—"}</td><td className="px-4 py-3"><StatusBadge tone={supplier.accreditationStatus === "accredited" ? "approved" : supplier.accreditationStatus === "suspended" ? "returned" : "pending"}>{supplier.accreditationStatus.toUpperCase()}</StatusBadge></td></tr>)}</tbody></RecordTable> : <EmptyWorkspace eyebrow="Vendor registry" title="No supplier records have been registered." description="Register an accredited supplier before selecting them for canvassing or quotation comparison." />}</div>
  </div>;
}

function SupplierForm({ isSaving, onCancel, onCreate }: { isSaving: boolean; onCancel: () => void; onCreate: (input: { supplierCode: string; companyName: string; tin?: string; contactPerson?: string; email?: string; phone?: string; address?: string; offerings?: string; philgepsRegistrationNumber?: string; philgepsRegistrationDate?: Date; philgepsExpirationDate?: Date; accreditationStatus: "pending" | "accredited" | "suspended" }) => void }) {
  const [values, setValues] = useState({ supplierCode: "", companyName: "", tin: "", philgepsRegistrationNumber: "", philgepsRegistrationDate: "", philgepsExpirationDate: "", contactPerson: "", email: "", phone: "", address: "", offerings: "", accreditationStatus: "pending" as const });
  const update = (field: keyof typeof values, value: string) => setValues((current) => ({ ...current, [field]: value }));
  return <form className="flat-panel mt-7 p-5 sm:p-6" onSubmit={(event) => { event.preventDefault(); if (!values.supplierCode.trim() || !values.companyName.trim()) return toast.error("Supplier code and company name are required."); onCreate({ ...values, supplierCode: values.supplierCode.trim(), companyName: values.companyName.trim(), tin: values.tin.trim() || undefined, contactPerson: values.contactPerson.trim() || undefined, email: values.email.trim() || undefined, phone: values.phone.trim() || undefined, address: values.address.trim() || undefined, offerings: values.offerings.trim() || undefined, philgepsRegistrationNumber: values.philgepsRegistrationNumber.trim() || undefined, philgepsRegistrationDate: values.philgepsRegistrationDate ? new Date(values.philgepsRegistrationDate) : undefined, philgepsExpirationDate: values.philgepsExpirationDate ? new Date(values.philgepsExpirationDate) : undefined }); }}><div className="flex items-center justify-between border-b border-[#ece8df] pb-4"><div><p className="text-sm font-semibold text-[#34404e]">Supplier registration</p><p className="mt-1 text-[11px] text-[#77818d]">Appendix 61 supplier metadata is retained for Purchase Order preparation.</p></div><UsersRound className="h-4 w-4 text-[#7b1e1e]" /></div><div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"><Field label="Supplier code"><Input value={values.supplierCode} onChange={(event) => update("supplierCode", event.target.value)} placeholder="SUP-001" /></Field><Field label="Company name"><Input value={values.companyName} onChange={(event) => update("companyName", event.target.value)} placeholder="Registered legal name" /></Field><Field label="TIN"><Input value={values.tin} onChange={(event) => update("tin", event.target.value)} placeholder="Tax identification number" /></Field><Field label="PhilGEPS registration number"><Input value={values.philgepsRegistrationNumber} onChange={(event) => update("philgepsRegistrationNumber", event.target.value)} placeholder="Registration number" /></Field><Field label="Date of registration"><Input type="date" value={values.philgepsRegistrationDate} onChange={(event) => update("philgepsRegistrationDate", event.target.value)} /></Field><Field label="Expiration date"><Input type="date" value={values.philgepsExpirationDate} onChange={(event) => update("philgepsExpirationDate", event.target.value)} /></Field><Field label="Accreditation"><Select value={values.accreditationStatus} onValueChange={(value) => update("accreditationStatus", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pending">Pending</SelectItem><SelectItem value="accredited">Accredited</SelectItem><SelectItem value="suspended">Suspended</SelectItem></SelectContent></Select></Field><Field label="Contact person"><Input value={values.contactPerson} onChange={(event) => update("contactPerson", event.target.value)} placeholder="Name" /></Field><Field label="Email"><Input value={values.email} onChange={(event) => update("email", event.target.value)} placeholder="email@example.com" /></Field><Field label="Phone"><Input value={values.phone} onChange={(event) => update("phone", event.target.value)} placeholder="Contact number" /></Field><div className="sm:col-span-2"><Field label="Product or service offerings"><Input value={values.offerings} onChange={(event) => update("offerings", event.target.value)} placeholder="Declared goods or services" /></Field></div><Field label="Address"><Input value={values.address} onChange={(event) => update("address", event.target.value)} placeholder="Business address" /></Field></div><div className="mt-6 flex justify-end gap-2"><Button type="button" variant="outline" onClick={onCancel} className="h-9 rounded-[4px] text-xs">Cancel</Button><Button disabled={isSaving} className="h-9 rounded-[4px] bg-[#7b1e1e] text-xs hover:bg-[#641818]">{isSaving && <LoaderCircle className="mr-1.5 h-3.5 w-3.5 animate-spin" />}Save supplier</Button></div></form>;
}

export function PlansPage() {
  const [creating, setCreating] = useState(false);
  const dashboard = trpc.procurement.dashboard.useQuery(undefined, { retry: false });
  const setup = trpc.procurement.setup.details.useQuery(undefined, { retry: false });
  const utils = trpc.useUtils();
  const createPlan = trpc.procurement.setup.createAppPpmpEntry.useMutation({ onError: (error) => toast.error(error.message) });
  const entries = dashboard.data?.appPpmpEntries ?? [];
  const officeNames = new Map((setup.data?.offices ?? []).map((office) => [office.id, `${office.code} — ${office.name}`]));
  const objectNames = new Map((setup.data?.objectsOfExpenditure ?? []).map((object) => [object.id, `${object.code} — ${object.name}`]));
  const downloadPpmpCsv = () => downloadCsv(`PPMP_FY${entries[0]?.fiscalYear ?? new Date().getFullYear()}.csv`, buildPpmpCsv(entries, officeNames, objectNames));
  const downloadPpmpPlan = async () => await downloadPpmpPdf({ fiscalYear: entries[0]?.fiscalYear ?? new Date().getFullYear(), entries: entries.map((entry) => ({ ...entry, officeName: officeNames.get(entry.officeId) || `Office #${entry.officeId}`, objectOfExpenditureName: objectNames.get(entry.objectOfExpenditureId) || `Object #${entry.objectOfExpenditureId}` })) });
  return <div className="mx-auto max-w-[1240px]"><PageHeader eyebrow="Annual planning" title="APP / PPMP monitoring" description="Manage annual procurement plan and department PPMP entries, then monitor actual procurement against approved plans." action={{ label: "Add planning entry", onClick: () => setCreating(!creating) }} />
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-[4px] border border-[#e4d4ae] bg-[#fffaf0] px-4 py-3"><p className="text-[11px] leading-5 text-[#72561d]">Exports include only the PPMP entries currently visible to your signed-in role. Records with blank fields remain blank in the download.</p><div className="flex flex-wrap gap-2"><Button type="button" size="sm" variant="outline" disabled={!entries.length} onClick={downloadPpmpCsv} className="h-8 rounded-[4px] border-[#d8c88c] bg-white text-[11px] text-[#72561d] hover:bg-[#f9efd7]"><Download className="mr-1.5 h-3.5 w-3.5" />Download CSV</Button><Button type="button" size="sm" disabled={!entries.length} onClick={downloadPpmpPlan} className="h-8 rounded-[4px] bg-[#7b1e1e] text-[11px] hover:bg-[#641818]"><FileCheck2 className="mr-1.5 h-3.5 w-3.5" />Download PPMP PDF</Button></div></div>
    {creating && <PlanForm setup={setup.data} isSaving={createPlan.isPending} onCancel={() => setCreating(false)} onCreate={async (input) => { const entry = await createPlan.mutateAsync(input); void utils.procurement.dashboard.invalidate(); return entry; }} />}<div className="mt-7">{dashboard.isLoading ? <LoadingPanel label="Loading APP/PPMP entries" /> : entries.length ? <RecordTable><RecordTableHeader><tr><th className="px-4 py-3 font-semibold">Fiscal year</th><th className="px-4 py-3 font-semibold">Description</th><th className="px-4 py-3 font-semibold">Planned</th><th className="px-4 py-3 font-semibold">Actual</th><th className="px-4 py-3 font-semibold">Status</th></tr></RecordTableHeader><tbody className="divide-y divide-[#efebe4]">{entries.map((entry) => <tr key={entry.id}><td className="px-4 py-3 text-[#3e4855]">FY {entry.fiscalYear}</td><td className="px-4 py-3 font-medium text-[#3e4855]">{entry.description}</td><td className="px-4 py-3 text-[#3e4855]">{formatMoney(entry.plannedAmount)}</td><td className="px-4 py-3 text-[#3e4855]">{formatMoney(entry.actualAmount)}</td><td className="px-4 py-3"><StatusBadge tone={entry.status === "approved" ? "approved" : "draft"}>{entry.status.toUpperCase()}</StatusBadge></td></tr>)}</tbody></RecordTable> : <EmptyWorkspace eyebrow="Annual planning" title="No APP or PPMP entries have been registered." description="Add department-specific planned procurement entries to begin monitoring plan-versus-actual progress." />}</div></div>;
}

function PlanForm({ setup, isSaving, onCancel, onCreate }: { setup?: { offices: Array<{ id: number; code: string; name: string }>; objectsOfExpenditure: Array<{ id: number; code: string; name: string }> }; isSaving: boolean; onCancel: () => void; onCreate: (input: { fiscalYear: number; officeId: number; objectOfExpenditureId: number; catalogItemId?: number; description: string; plannedAmount: number; papCode?: string; projectTitle?: string; modeOfProcurement?: string; fundSource?: string; procurementSchedule?: string; remarks?: string }) => Promise<{ id: number }> }) {
  const [officeId, setOfficeId] = useState("");
  const [objectId, setObjectId] = useState("");
  const [catalogItemId, setCatalogItemId] = useState("");
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogCodeFamily, setCatalogCodeFamily] = useState("all");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [description, setDescription] = useState("");
  const [plannedAmount, setPlannedAmount] = useState("");
  const [papCode, setPapCode] = useState("");
  const [projectTitle, setProjectTitle] = useState("");
  const [modeOfProcurement, setModeOfProcurement] = useState("Small Value Procurement");
  const [manualModeOfProcurement, setManualModeOfProcurement] = useState("");
  const [fundSource, setFundSource] = useState("");
  const [procurementSchedule, setProcurementSchedule] = useState("");
  const [remarks, setRemarks] = useState("");
  const [supportingFile, setSupportingFile] = useState<File | null>(null);
  const year = new Date().getFullYear();
  const utils = trpc.useUtils();
  const catalogInput = useMemo(() => ({ search: catalogSearch.trim() || undefined, codeFamily: catalogCodeFamily === "all" ? undefined : catalogCodeFamily, page: 1, limit: 100 }), [catalogCodeFamily, catalogSearch]);
  const catalog = trpc.procurement.catalog.list.useQuery(catalogInput, { retry: false });
  const codeFamilies = trpc.procurement.catalog.codeFamilies.useQuery(undefined, { retry: false });
  const favorites = trpc.procurement.catalog.favorites.useQuery(undefined, { retry: false });
  const favoriteIds = useMemo(() => new Set((favorites.data ?? []).map((item) => item.id)), [favorites.data]);
  const catalogItems = useMemo(() => {
    if (!favoritesOnly) return catalog.data?.items ?? [];
    const search = catalogSearch.trim().toLowerCase();
    return (favorites.data ?? []).filter((item) => (catalogCodeFamily === "all" || item.productCode.startsWith(catalogCodeFamily)) && (!search || item.productCode.toLowerCase().includes(search) || item.description.toLowerCase().includes(search)));
  }, [catalog.data?.items, catalogCodeFamily, catalogSearch, favorites.data, favoritesOnly]);
  const toggleFavorite = trpc.procurement.catalog.setFavorite.useMutation({ onSuccess: () => { void utils.procurement.catalog.favorites.invalidate(); }, onError: (error) => toast.error(error.message) });
  const attachDocument = trpc.procurement.documents.attach.useMutation({ onSuccess: () => { void utils.procurement.dashboard.invalidate(); }, onError: (error) => toast.error(error.message) });
  const selectCatalogItem = (value: string) => {
    if (value === "manual-plan-item") { setCatalogItemId(""); return; }
    const selected = [...catalogItems, ...(favorites.data ?? [])].find((item) => String(item.id) === value);
    if (!selected) return;
    setCatalogItemId(value);
    setDescription(selected.description);
    setPlannedAmount(Number(selected.referencePrice).toFixed(2));
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const resolvedMode = modeOfProcurement === "other" ? manualModeOfProcurement.trim() : modeOfProcurement;
    if (!officeId || !objectId || !description.trim() || Number(plannedAmount) <= 0 || !resolvedMode) return toast.error("Select managed office and expenditure references, then complete the planning fields.");
    if (supportingFile && supportingFile.size > 10 * 1024 * 1024) return toast.error("Supporting files are limited to 10 MB.");
    try {
      const entry = await onCreate({ fiscalYear: year, officeId: Number(officeId), objectOfExpenditureId: Number(objectId), catalogItemId: catalogItemId ? Number(catalogItemId) : undefined, description: description.trim(), plannedAmount: Number(plannedAmount), papCode: papCode.trim() || undefined, projectTitle: projectTitle.trim() || undefined, modeOfProcurement: resolvedMode, fundSource: fundSource.trim() || undefined, procurementSchedule: procurementSchedule.trim() || undefined, remarks: remarks.trim() || undefined });
      if (supportingFile) await attachDocument.mutateAsync({ entityType: "app_ppmp_entry", entityId: entry.id, documentType: "PPMP supporting document", originalFileName: supportingFile.name, mimeType: supportingFile.type || "application/octet-stream", dataBase64: await fileToBase64(supportingFile) });
      toast.success(supportingFile ? "PPMP entry and supporting document saved." : "APP/PPMP entry added.");
      onCancel();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The PPMP entry could not be saved.");
    }
  };
  return <FormShell title="APP / PPMP entry" description="Plan procurement with the PPMP project, funding, procurement mode, schedule, and budget metadata supplied in the reference schema." className="mt-7" onSubmit={submit}>
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      <Field label="Fiscal year"><Input value={String(year)} readOnly /></Field>
      <Field label="PAP code"><Input value={papCode} onChange={(event) => setPapCode(event.target.value)} placeholder="Programme / activity code" /></Field>
      <Field label="Project title"><Input value={projectTitle} onChange={(event) => setProjectTitle(event.target.value)} placeholder="Project title" /></Field>
      <Field label="Planned amount"><Input type="number" min="0.01" step="0.01" value={plannedAmount} onChange={(event) => setPlannedAmount(event.target.value)} placeholder="0.00" /></Field>
      <div className="sm:col-span-2 lg:col-span-4"><div className="border border-[#e4d4ae] bg-[#fffaf0] p-3"><Label htmlFor="ppmp-catalog-search" className="text-[11px] font-semibold text-[#72561d]">PhilGEPS common-use catalog <span className="font-normal">(optional)</span></Label><div className="mt-2 grid gap-2 lg:grid-cols-[1fr_.9fr_1.25fr_auto]"><Input id="ppmp-catalog-search" value={catalogSearch} onChange={(event) => setCatalogSearch(event.target.value)} placeholder="Search code or description" className="h-9 border-[#e4d4ae] bg-white text-xs" /><Select value={catalogCodeFamily} onValueChange={setCatalogCodeFamily}><SelectTrigger className="h-9 border-[#e4d4ae] bg-white text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All source code families</SelectItem>{codeFamilies.data?.map((family) => <SelectItem key={family.codeFamily} value={family.codeFamily}>{family.label} · {family.itemCount}</SelectItem>)}</SelectContent></Select><Select value={catalogItemId || "manual-plan-item"} onValueChange={selectCatalogItem}><SelectTrigger className="h-9 border-[#e4d4ae] bg-white text-xs"><SelectValue placeholder="Select catalog item" /></SelectTrigger><SelectContent><SelectItem value="manual-plan-item">Manual PPMP entry — no catalog reference</SelectItem>{catalogItems.map((item) => <SelectItem key={item.id} value={String(item.id)}>{favoriteIds.has(item.id) ? "★ " : ""}{item.productCode} — {item.description}</SelectItem>)}</SelectContent></Select><Button type="button" variant={favoritesOnly ? "default" : "outline"} onClick={() => setFavoritesOnly((current) => !current)} className={favoritesOnly ? "h-9 rounded-[4px] bg-[#7b1e1e] px-3 text-xs hover:bg-[#641818]" : "h-9 rounded-[4px] border-[#e4d4ae] bg-white px-3 text-xs"}><Star className={favoritesOnly ? "mr-1 h-3.5 w-3.5 fill-current" : "mr-1 h-3.5 w-3.5"} />{favorites.data?.length ?? 0}</Button></div>{catalogItemId && <div className="mt-2 flex items-center justify-between gap-2"><p className="text-[10px] text-[#856a35]">Reference price copied from the supplied catalog; the planned PPMP amount remains editable.</p><Button type="button" variant="ghost" size="sm" disabled={toggleFavorite.isPending} onClick={() => toggleFavorite.mutate({ catalogItemId: Number(catalogItemId), isFavorite: !favoriteIds.has(Number(catalogItemId)) })} className="h-7 px-2 text-[10px] text-[#8a6520] hover:bg-[#f9efd7]"><Star className={favoriteIds.has(Number(catalogItemId)) ? "mr-1 h-3.5 w-3.5 fill-current" : "mr-1 h-3.5 w-3.5"} />{favoriteIds.has(Number(catalogItemId)) ? "Saved favorite" : "Save favorite"}</Button></div>}<p className="mt-1.5 text-[10px] text-[#856a35]">{catalog.isLoading || codeFamilies.isLoading ? "Searching the active catalog…" : `${favoritesOnly ? catalogItems.length : catalog.data?.total ?? 0} available item(s). Source code families preserve the supplied product-code grouping; no new categories were invented.`}</p></div></div>
      <Field label="Requesting Office / Department">
        <OfficeSelect
          value={officeId}
          valueMode="id"
          onChange={setOfficeId}
          placeholder={setup?.offices.length ? "Select requesting office" : "No managed offices available"}
          triggerClassName="h-9 border-[#ded8cc] bg-white text-xs"
        />
        {!setup?.offices.length && <p className="mt-1.5 text-[10px] leading-4 text-[#9a6d19]">An Admin must enter the managed office in System Setup before a PPMP entry can be saved.</p>}
      </Field>
      <Field label="Object of expenditure"><Select value={objectId} onValueChange={setObjectId} disabled={!setup?.objectsOfExpenditure.length}><SelectTrigger><SelectValue placeholder={setup?.objectsOfExpenditure.length ? "Select managed expenditure object" : "No expenditure objects available"} /></SelectTrigger><SelectContent>{setup?.objectsOfExpenditure.map((object) => <SelectItem key={object.id} value={String(object.id)}>{object.code} — {object.name}</SelectItem>)}</SelectContent></Select>{!setup?.objectsOfExpenditure.length && <p className="mt-1.5 text-[10px] leading-4 text-[#9a6d19]">An Admin must enter the managed expenditure object in System Setup before a PPMP entry can be saved.</p>}</Field>
      <Field label="Mode of procurement"><Select value={modeOfProcurement} onValueChange={setModeOfProcurement}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Small Value Procurement">Small Value Procurement</SelectItem><SelectItem value="Shopping">Shopping</SelectItem><SelectItem value="Public Bidding">Public Bidding</SelectItem><SelectItem value="Direct Contracting">Direct Contracting</SelectItem><SelectItem value="Emergency Procurement">Emergency Procurement</SelectItem><SelectItem value="other">Other — enter manually</SelectItem></SelectContent></Select>{modeOfProcurement === "other" && <Input value={manualModeOfProcurement} onChange={(event) => setManualModeOfProcurement(event.target.value)} placeholder="Enter the applicable mode of procurement" className="mt-2" />}</Field>
      <Field label="Funding source"><Select value={fundSource} onValueChange={setFundSource}><SelectTrigger><SelectValue placeholder="Select fund source" /></SelectTrigger><SelectContent><SelectItem value="GAA">GAA — General Appropriations Act</SelectItem></SelectContent></Select></Field>
      <Field label="Procurement schedule"><Input value={procurementSchedule} onChange={(event) => setProcurementSchedule(event.target.value)} placeholder="Schedule / target period" /></Field>
      <div className="sm:col-span-2 lg:col-span-3"><Field label="Planned procurement description"><Textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe the planned procurement." className="min-h-20" /></Field></div>
      <div className="sm:col-span-2 lg:col-span-4"><Field label="Remarks"><Textarea value={remarks} onChange={(event) => setRemarks(event.target.value)} placeholder="Optional PPMP remarks" className="min-h-16" /></Field></div>
      <div className="sm:col-span-2 lg:col-span-4"><div className="border border-dashed border-[#d8c88c] bg-[#fffaf0] p-3"><Label htmlFor="ppmp-supporting-file" className="text-[11px] font-semibold text-[#72561d]">Supporting document <span className="font-normal">(optional)</span></Label><p className="mt-1 text-[10px] leading-4 text-[#856a35]">Upload the approved source file instead of retyping information already documented. PDF, JPG, PNG, DOC, DOCX, XLS, and XLSX files up to 10 MB are stored securely after the PPMP entry is saved.</p><Input id="ppmp-supporting-file" type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,application/pdf,image/jpeg,image/png,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event) => setSupportingFile(event.target.files?.[0] || null)} className="mt-2 h-9 bg-white text-xs" />{supportingFile && <p className="mt-1.5 flex items-center gap-1 text-[10px] text-[#6f5b2a]"><Paperclip className="h-3.5 w-3.5" />{supportingFile.name} · {(supportingFile.size / 1024).toFixed(1)} KB</p>}</div></div>
    </div>
    <div className="mt-6 flex justify-end gap-2"><Button type="button" variant="outline" onClick={onCancel} className="h-9 rounded-[4px] text-xs">Cancel</Button><Button disabled={isSaving || attachDocument.isPending} className="h-9 rounded-[4px] bg-[#7b1e1e] text-xs hover:bg-[#641818]">{(isSaving || attachDocument.isPending) && <LoaderCircle className="mr-1.5 h-3.5 w-3.5 animate-spin" />}Save plan entry</Button></div>
  </FormShell>;
}

export function RfqPage() {
  const { user } = useAuth();
  const role = user ? normalizeProcurementRole(user.role) : "end_user";
  const canSupply = role === "procurement_officer" || role === "procurement_staff" || role === "admin";
  const [mode, setMode] = useState<"rfq" | "quotation" | null>(null);
  const dashboard = trpc.procurement.dashboard.useQuery(undefined, { retry: false });
  const setup = trpc.procurement.setup.details.useQuery(undefined, { retry: false });
  const utils = trpc.useUtils();
  const refresh = () => { void utils.procurement.dashboard.invalidate(); };
  const createRfq = trpc.procurement.rfqs.createFromPurchaseRequest.useMutation({ onSuccess: () => { toast.success("RFQ created for canvassing."); setMode(null); refresh(); }, onError: (error) => toast.error(error.message) });
  const addQuotation = trpc.procurement.rfqs.addQuotation.useMutation({ onSuccess: () => { toast.success("Supplier quotation recorded."); setMode(null); refresh(); }, onError: (error) => toast.error(error.message) });
  const generateAbstract = trpc.procurement.rfqs.generateAbstract.useMutation({
    onSuccess: () => {
      toast.success("Quotation package forwarded to BAC. Official Abstract of Quotations prepared.");
      refresh();
    },
    onError: (error) => toast.error(error.message),
  });
  // Existing RFQs that are active and linked to a PR
  const existingRfqPrIds = useMemo(() => {
    return new Set(
      (dashboard.data?.rfqs ?? [])
        .filter((r) => r.status !== "cancelled" && r.purchaseRequestId)
        .map((r) => r.purchaseRequestId)
    );
  }, [dashboard.data?.rfqs]);

  // Eligible statuses: verified by PO/BAC, in PMR, budget approved, or approved
  const eligibleStatuses = useMemo(
    () =>
      new Set([
        "approved",
        "approval_review",
        "procurement_review",
        "pmr_logged",
        "budget_review",
        "supply_review",
        "bac_review",
      ]),
    []
  );

  const approvedPrs = useMemo(() => {
    const rawPrs = dashboard.data?.purchaseRequests ?? [];
    const filtered = rawPrs.filter((pr) => {
      // Exclude PRs that already have an active RFQ
      if (existingRfqPrIds.has(pr.id)) return false;
      // Exclude terminal/rejected statuses
      if (pr.status === "rejected" || pr.status === "returned" || pr.status === "closed") return false;
      // Eligible if explicitly verified by PO/BAC or in an approved/verified/PMR status
      const isVerified = Boolean(pr.procurementReviewedById);
      const isStatusEligible = eligibleStatuses.has(pr.status);
      return isVerified || isStatusEligible;
    });

    // Console logging for verification audit
    console.log("Available PRs for RFQ:", filtered);
    if (dashboard.error) {
      console.error("Error loading dashboard PRs for RFQ:", dashboard.error);
    }
    return filtered;
  }, [dashboard.data?.purchaseRequests, dashboard.error, existingRfqPrIds, eligibleStatuses]);

  const quoteCount = (rfqId: number) => dashboard.data?.supplierQuotations.filter((quote) => quote.rfqId === rfqId).length ?? 0;
  const supplierMap = new Map((setup.data?.suppliers ?? []).map((supplier) => [supplier.id, supplier]));
  return <div className="mx-auto max-w-[1240px]"><PageHeader eyebrow="Quotation management" title="RFQs & quotation canvass" description="Create RFQs from verified and approved PRs, record supplier quotations, and generate an abstract only after the mandatory three-supplier canvass." action={canSupply ? { label: "New RFQ", onClick: () => setMode(mode === "rfq" ? null : "rfq") } : undefined} />
    {mode === "rfq" && (
      <form
        className="flat-panel mt-7 p-5"
        onSubmit={(event) => {
          event.preventDefault();
          const value = new FormData(event.currentTarget).get("purchaseRequestId");
          if (!value) return toast.error("Select an eligible Purchase Request.");
          createRfq.mutate({ purchaseRequestId: Number(value) });
        }}
      >
        <div className="flex items-center justify-between border-b border-[#ece8df] pb-3">
          <div>
            <p className="text-sm font-semibold text-[#34404e]">Create RFQ from verified / approved PR</p>
            <p className="mt-0.5 text-xs text-[#707c8a]">
              Any Purchase Request that has completed Procurement Officer verification or BAC endorsement is eligible for quotation canvass.
            </p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={() => setMode(null)} className="h-7 text-xs text-[#7b8490]">
            Cancel
          </Button>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="w-full sm:max-w-md">
            <Label className="text-[11px] font-semibold text-[#34404e]">
              Eligible Purchase Request ({approvedPrs.length} available)
            </Label>
            <Select name="purchaseRequestId" disabled={!approvedPrs.length}>
              <SelectTrigger className="mt-1.5 h-9 text-xs">
                <SelectValue
                  placeholder={
                    dashboard.isLoading
                      ? "Loading Purchase Requests..."
                      : approvedPrs.length
                      ? "Select verified / approved PR"
                      : "No verified PRs currently awaiting RFQ"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {approvedPrs.map((pr) => (
                  <SelectItem key={pr.id} value={String(pr.id)} className="text-xs">
                    {pr.prNumber} — {pr.purpose || "No description"} ({pr.procurementReviewedById ? "PO-Verified" : pr.status.toUpperCase()})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!approvedPrs.length && !dashboard.isLoading && (
              <p className="mt-1.5 text-[11px] text-[#9a6d19]">
                No Purchase Requests are currently ready for RFQ canvassing. Make sure the PR is submitted by the End-User and verified by the Procurement Officer in the PR Verification screen.
              </p>
            )}
          </div>
          <Button
            disabled={createRfq.isPending || !approvedPrs.length}
            className="h-9 rounded-[4px] bg-[#7b1e1e] text-xs hover:bg-[#641818]"
          >
            {createRfq.isPending && <LoaderCircle className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            Start canvass
          </Button>
        </div>
      </form>
    )}
    {mode === "quotation" && <QuotationForm rfqs={dashboard.data?.rfqs ?? []} suppliers={setup.data?.suppliers ?? []} isSaving={addQuotation.isPending} onCancel={() => setMode(null)} onCreate={(input) => addQuotation.mutate(input)} />}

    {/* Procedure 5.7 Workflow Guidance Banner */}
    <div className="mt-6 rounded-lg border border-[#d5cfc4] bg-[#fbf9f5] p-4 text-xs text-[#4b5563]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="rounded-md bg-[#7b1e1e]/10 p-2 text-[#7b1e1e] mt-0.5 shrink-0">
            <FileSpreadsheet className="h-4 w-4" />
          </div>
          <div>
            <p className="font-semibold text-[#1f2937]">Procedure 5.7: Forward to BAC for Preparation of Abstract of Quotations</p>
            <p className="mt-0.5 text-[11px] text-[#6b7280]">
              Mandatory canvass requires at least three (3) supplier quotations per RFQ. Once completed, click <strong>"Forward to BAC for AOQ"</strong> to transmit the quotation package to the BAC Secretariat for official validation, Abstract generation, and BAC Resolution recommendation.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link href="/officer/rfq-distribution">
            <Button size="sm" variant="outline" className="h-7 text-[11px] text-[#7b1e1e] border-[#7b1e1e] hover:bg-[#7b1e1e]/5">
              <Send className="mr-1 h-3 w-3" />
              Formal BAC Transmittal
            </Button>
          </Link>
          <Link href="/purchase-orders">
            <Button size="sm" variant="ghost" className="h-7 text-[11px] text-[#4b5563] hover:text-[#7b1e1e]">
              View Abstract Registry →
            </Button>
          </Link>
        </div>
      </div>
    </div>

    <div className="mt-6">
      {dashboard.isLoading ? (
        <LoadingPanel label="Loading RFQ records" />
      ) : dashboard.data?.rfqs.length ? (
        <RecordTable>
          <RecordTableHeader>
            <tr>
              <th className="px-4 py-3 font-semibold">RFQ</th>
              <th className="px-4 py-3 font-semibold">Linked PR</th>
              <th className="px-4 py-3 font-semibold">Quotations Canvassed</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Action (Procedure 5.7)</th>
            </tr>
          </RecordTableHeader>
          <tbody className="divide-y divide-[#efebe4]">
            {dashboard.data.rfqs.map((rfq) => {
              const quotations = quoteCount(rfq.id);
              const hasAbstract = dashboard.data.quotationAbstracts.some((abstract) => abstract.rfqId === rfq.id);
              return (
                <tr key={rfq.id}>
                  <td className="px-4 py-3 font-semibold text-[#7b1e1e]">{rfq.rfqNumber}</td>
                  <td className="px-4 py-3 text-[#65717e]">PR #{rfq.purchaseRequestId}</td>
                  <td className="px-4 py-3">
                    <StatusBadge tone={quotations >= 3 ? "approved" : "pending"}>
                      {quotations}/3 SUPPLIERS
                    </StatusBadge>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge tone={rfq.status === "approved" ? "approved" : "pending"}>
                      {rfq.status.toUpperCase()}
                    </StatusBadge>
                  </td>
                  <td className="px-4 py-3">
                    {canSupply && !hasAbstract ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setMode("quotation")}
                          className="h-7 rounded-[4px] text-[11px]"
                        >
                          <Plus className="mr-1 h-3 w-3" />
                          Add quotation
                        </Button>
                        <Button
                          size="sm"
                          disabled={quotations < 3 || generateAbstract.isPending}
                          onClick={() => generateAbstract.mutate({ rfqId: rfq.id })}
                          className="h-7 rounded-[4px] bg-[#7b1e1e] px-2.5 text-[11px] font-medium text-white hover:bg-[#641818]"
                          title={
                            quotations >= 3
                              ? "Forward to BAC for preparation and validation of Abstract of Quotations (AOQ)"
                              : `Mandatory canvass requirement: at least 3 supplier quotations required (currently ${quotations}/3)`
                          }
                        >
                          {generateAbstract.isPending ? (
                            <LoaderCircle className="mr-1 h-3 w-3 animate-spin" />
                          ) : (
                            <Send className="mr-1 h-3 w-3" />
                          )}
                          Forward to BAC for AOQ
                        </Button>
                        <Link href="/officer/rfq-distribution">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-[10px] text-[#7b8490] hover:text-[#7b1e1e]"
                            title="Formal Document Transmittal to BAC"
                          >
                            Transmittal →
                          </Button>
                        </Link>
                      </div>
                    ) : hasAbstract ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge tone="approved">FORWARDED TO BAC / AOQ READY</StatusBadge>
                        <Link href="/purchase-orders">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 rounded-[4px] text-[10px] border-[#7b1e1e] text-[#7b1e1e] hover:bg-[#fffaf0]"
                          >
                            View AOQ & PO →
                          </Button>
                        </Link>
                      </div>
                    ) : (
                      <span className="text-[11px] text-[#7b8490]">Role-gated</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </RecordTable>
      ) : (
        <EmptyWorkspace
          eyebrow="Quotation management"
          title="No RFQ records are available for your role."
          description="A Supply Officer or Procurement Staff can convert an approved PR to an RFQ, then record the mandatory supplier quotations."
        />
      )}
    </div>
    {dashboard.data?.rfqs.length ? <QuotationComparison rfqs={dashboard.data.rfqs} quotations={dashboard.data.supplierQuotations} supplierMap={supplierMap} /> : null}
    {canSupply && dashboard.data?.rfqs.length ? <Button variant="outline" onClick={() => setMode("quotation")} className="mt-4 h-9 rounded-[4px] text-xs"><Plus className="mr-1.5 h-3.5 w-3.5" />Record supplier quotation</Button> : null}
  </div>;
}

function QuotationForm({
  rfqs,
  suppliers,
  isSaving,
  onCancel,
  onCreate,
}: {
  rfqs: Array<{ id: number; rfqNumber: string }>;
  suppliers: Array<{ id: number; supplierCode: string; companyName: string }>;
  isSaving: boolean;
  onCancel: () => void;
  onCreate: (input: {
    rfqId: number;
    supplierId: number;
    totalPrice: number;
    deliveryDays: number;
    isCompliant: boolean;
    notes?: string;
  }) => void;
}) {
  const [rfqId, setRfqId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [totalPrice, setTotalPrice] = useState("");
  const [deliveryDays, setDeliveryDays] = useState("");
  const [isCompliant, setIsCompliant] = useState("yes");
  const [notes, setNotes] = useState("");

  return (
    <FormShell
      title="Supplier quotation"
      description="Each supplier may provide one quotation per RFQ."
      icon={<FileSearch className="h-4 w-4" />}
      className="mt-7 w-full min-w-0"
      onSubmit={(event) => {
        event.preventDefault();
        if (!rfqId || !supplierId || Number(totalPrice) <= 0 || Number(deliveryDays) < 0) {
          return toast.error("Complete the RFQ, supplier, price, and delivery fields.");
        }
        onCreate({
          rfqId: Number(rfqId),
          supplierId: Number(supplierId),
          totalPrice: Number(totalPrice),
          deliveryDays: Number(deliveryDays),
          isCompliant: isCompliant === "yes",
          notes: notes.trim() || undefined,
        });
      }}
    >
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 w-full min-w-0">
        <Field label="RFQ" className="w-full min-w-0">
          <Select value={rfqId} onValueChange={setRfqId}>
            <SelectTrigger className="w-full min-w-0 box-border overflow-hidden">
              <SelectValue placeholder="Select RFQ" className="truncate" />
            </SelectTrigger>
            <SelectContent>
              {rfqs.map((rfq) => (
                <SelectItem key={rfq.id} value={String(rfq.id)}>
                  {rfq.rfqNumber}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Supplier" className="w-full min-w-0">
          <Select value={supplierId} onValueChange={setSupplierId}>
            <SelectTrigger className="w-full min-w-0 box-border overflow-hidden">
              <SelectValue placeholder="Select supplier" className="truncate" />
            </SelectTrigger>
            <SelectContent>
              {suppliers.map((supplier) => (
                <SelectItem key={supplier.id} value={String(supplier.id)}>
                  {supplier.supplierCode} — {supplier.companyName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Total quotation" className="w-full min-w-0">
          <Input
            type="number"
            min="0.01"
            step="0.01"
            value={totalPrice}
            onChange={(event) => setTotalPrice(event.target.value)}
            placeholder="0.00"
            className="w-full min-w-0 box-border"
          />
        </Field>

        <Field label="Delivery days" className="w-full min-w-0">
          <Input
            type="number"
            min="0"
            value={deliveryDays}
            onChange={(event) => setDeliveryDays(event.target.value)}
            placeholder="0"
            className="w-full min-w-0 box-border"
          />
        </Field>

        <Field label="Compliance" className="w-full min-w-0">
          <Select value={isCompliant} onValueChange={setIsCompliant}>
            <SelectTrigger className="w-full min-w-0 box-border overflow-hidden">
              <SelectValue className="truncate" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="yes">Compliant</SelectItem>
              <SelectItem value="no">Non-compliant</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field label="Notes" className="w-full min-w-0">
          <Input
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Optional notes"
            className="w-full min-w-0 box-border"
          />
        </Field>
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} className="h-9 rounded-[4px] text-xs">
          Cancel
        </Button>
        <Button
          disabled={isSaving || !rfqs.length || !suppliers.length}
          className="h-9 rounded-[4px] bg-[#7b1e1e] text-xs hover:bg-[#641818]"
        >
          {isSaving && <LoaderCircle className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
          Save quotation
        </Button>
      </div>
    </FormShell>
  );
}

function QuotationComparison({ rfqs, quotations, supplierMap }: { rfqs: Array<{ id: number; rfqNumber: string }>; quotations: Array<{ id: number; rfqId: number; supplierId: number; totalPrice: string; deliveryDays: number; isCompliant: number }>; supplierMap: Map<number, { supplierCode: string; companyName: string }> }) {
  return <div className="flat-panel mt-6"><div className="border-b border-[#ece8df] px-5 py-4"><p className="text-sm font-semibold text-[#34404e]">Quotation comparison</p><p className="mt-1 text-[11px] text-[#77818d]">The lowest compliant quotation is visibly identified for each RFQ.</p></div>{rfqs.map((rfq) => { const rows = quotations.filter((quote) => quote.rfqId === rfq.id); const lowest = rows.filter((quote) => quote.isCompliant === 1).sort((a, b) => Number(a.totalPrice) - Number(b.totalPrice))[0]; return <div key={rfq.id} className="border-b border-[#efebe4] last:border-b-0"><div className="px-5 py-3 text-xs font-semibold text-[#7b1e1e]">{rfq.rfqNumber}</div>{rows.length ? <RecordTable className="border-x-0 border-b-0"><RecordTableHeader><tr><th className="px-4 py-3 font-semibold">Supplier</th><th className="px-4 py-3 font-semibold">Quoted total</th><th className="px-4 py-3 font-semibold">Delivery</th><th className="px-4 py-3 font-semibold">Compliance</th><th className="px-4 py-3 font-semibold">Recommendation</th></tr></RecordTableHeader><tbody className="divide-y divide-[#efebe4]">{rows.map((quote) => <tr key={quote.id} className={lowest?.id === quote.id ? "bg-[#fffaf0]" : ""}><td className="px-4 py-3 text-[#3e4855]">{supplierMap.get(quote.supplierId)?.companyName || `Supplier #${quote.supplierId}`}</td><td className="px-4 py-3 font-medium text-[#3e4855]">{formatMoney(quote.totalPrice)}</td><td className="px-4 py-3 text-[#65717e]">{quote.deliveryDays} day(s)</td><td className="px-4 py-3"><StatusBadge tone={quote.isCompliant ? "approved" : "returned"}>{quote.isCompliant ? "COMPLIANT" : "NON-COMPLIANT"}</StatusBadge></td><td className="px-4 py-3">{lowest?.id === quote.id ? <StatusBadge tone="pending">LOWEST COMPLIANT</StatusBadge> : "—"}</td></tr>)}</tbody></RecordTable> : <p className="px-5 pb-4 text-[11px] text-[#77818d]">No supplier quotations recorded.</p>}</div>; })}</div>;
}

export function PurchaseOrderPage() {
  const { user } = useAuth();
  const role = user ? normalizeProcurementRole(user.role) : "end_user";
  const canBac =
    role === "bac" ||
    role === "bac_secretariat" ||
    role === "administrative_approver" ||
    role === "hope" ||
    role === "admin";
  const canSupply =
    user?.role === "procurement_staff" ||
    role === "procurement_staff" ||
    user?.role === "procurement_officer" ||
    user?.role === "procurement_officer_i" ||
    role === "procurement_officer" ||
    role === "admin";
  const canBudget =
    user?.role === "budget_officer" ||
    role === "budget_officer" ||
    role === "administrative_approver" ||
    role === "admin";
  const canHope =
    user?.role === "hope" ||
    role === "hope" ||
    role === "administrative_approver" ||
    role === "admin";
  const canPoi =
    user?.role === "procurement_officer_i" ||
    role === "procurement_officer_i" ||
    role === "procurement_officer" ||
    role === "admin";

  const dashboard = trpc.procurement.dashboard.useQuery(undefined, { retry: false });
  const setup = trpc.procurement.setup.details.useQuery(undefined, { retry: false });
  const utils = trpc.useUtils();
  const refresh = () => {
    void utils.procurement.dashboard.invalidate();
  };

  const [, setLocation] = useLocation();
  const isStaffRole = user?.role === "procurement_staff" || role === "procurement_staff" || role === "procurement_officer";
  const [activeTab, setActiveTab] = useState<string>(isStaffRole ? "create_po" : "po_registry");

  // Purchase Order Preparation Studio State (Appendix 61)
  const [prepPrId, setPrepPrId] = useState<string>("");
  const [prepSupplierId, setPrepSupplierId] = useState<string>("");
  const [poNumber, setPoNumber] = useState<string>("2025-01-036");
  const [poDate, setPoDate] = useState<string>("September 29, 2026");
  const [modeOfProcurement, setModeOfProcurement] = useState<string>("Small Value Procurement");
  const [placeOfDelivery, setPlaceOfDelivery] = useState<string>("Batanes State College");
  const [dateOfDelivery, setDateOfDelivery] = useState<string>("30 days upon receipt of PO");
  const [deliveryTerm, setDeliveryTerm] = useState<string>("FOB Destination");
  const [paymentTerm, setPaymentTerm] = useState<string>("15 days upon complete delivery");
  const [fundCluster, setFundCluster] = useState<string>("Fund 165");
  const [purpose, setPurpose] = useState<string>(
    "for the program/activity of (IGP-Printing) supplies for IGP Printing Services (Testbooklet) to be charged to Fund 165"
  );
  const [authorizedOfficialName, setAuthorizedOfficialName] = useState<string>("DJOVI REGALA DURANTE");
  const [authorizedOfficialDesignation, setAuthorizedOfficialDesignation] = useState<string>("SUC President I");
  const [chiefAccountantName, setChiefAccountantName] = useState<string>("RHEA ANGELLICA B. ADDATU, CPA");
  const [chiefAccountantTitle, setChiefAccountantTitle] = useState<string>("Accountant I");
  const [refNumber, setRefNumber] = useState<string>("2601-GAS2-009");
  const [prepItems, setPrepItems] = useState<PurchaseOrderItem[]>([
    { no: "001", unit: "unit", description: "Printer ink & test booklet paper", quantity: 50, estimatedUnitCost: 500, totalCost: 25000 },
    { no: "002", unit: "pack", description: "Specialty cover boards & bindings", quantity: 100, estimatedUnitCost: 481.30, totalCost: 48130 },
  ]);

  // Line item adder form state
  const [newItemDesc, setNewItemDesc] = useState<string>("");
  const [newItemUnit, setNewItemUnit] = useState<string>("pcs");
  const [newItemQty, setNewItemQty] = useState<string>("1");
  const [newItemCost, setNewItemCost] = useState<string>("0");

  const prDetail = trpc.procurement.purchaseRequests.detail.useQuery(
    { purchaseRequestId: Number(prepPrId) },
    { enabled: Boolean(prepPrId) && Number(prepPrId) > 0, retry: false }
  );

  useEffect(() => {
    if (prDetail.data?.purchaseRequest) {
      const pr = prDetail.data.purchaseRequest;
      const items = prDetail.data.items ?? [];
      setPurpose(pr.purpose);
      if (pr.fundCluster) setFundCluster(pr.fundCluster);
      const cleanPrNum = pr.prNumber.replace(/^PR-/, "");
      setRefNumber(`2601-GAS2-${cleanPrNum}`);
      if (items.length > 0) {
        setPrepItems(
          items.map((it: any, idx: number) => ({
            no: String(idx + 1).padStart(3, "0"),
            unit: it.unit || "pcs",
            description: it.specification ? `${it.description} (${it.specification})` : it.description,
            stockPropertyNo: it.stockPropertyNo || undefined,
            quantity: Number(it.quantity) || 1,
            estimatedUnitCost: Number(it.estimatedUnitCost) || 0,
            totalCost: Number(it.totalCost) || Number(it.quantity) * Number(it.estimatedUnitCost) || 0,
          }))
        );
      }
    }
  }, [prDetail.data]);

  const [orsInputs, setOrsInputs] = useState<Record<number, string>>({});

  const approve = trpc.procurement.rfqs.approveAbstract.useMutation({
    onSuccess: () => {
      toast.success("Quotation abstract approved by BAC.");
      refresh();
    },
    onError: (error) => toast.error(error.message),
  });

  const createPo = trpc.procurement.rfqs.createPurchaseOrder.useMutation({
    onSuccess: () => {
      toast.success("Purchase Order drafted by Procurement Staff. Awaiting Contract Signing by Budget Officer and HoPE.");
      refresh();
      setActiveTab("po_registry");
    },
    onError: (error) => toast.error(error.message),
  });

  const signContract = trpc.procurement.rfqs.signContract.useMutation({
    onSuccess: (data) => {
      toast.success(
        data.status === "approved"
          ? "Contract successfully signed by both Budget Officer and HoPE! Ready for PO Releasing by Procurement Officer I."
          : "Contract signatory record saved."
      );
      refresh();
    },
    onError: (error) => toast.error(error.message),
  });

  const handleBudgetSign = (poId: number, totalAmount: string) => {
    const orsNum = (orsInputs[poId] || "").trim() || `2026-01-${String(poId).padStart(4, "0")}`;
    signContract.mutate({
      purchaseOrderId: poId,
      signatoryRole: "budget_officer",
      orsBursNumber: orsNum,
      fundsAvailable: Number(totalAmount),
      chiefAccountantName: user?.name || "Budget Officer / Chief Accountant",
    });
  };

  const handleHopeSign = (poId: number) => {
    signContract.mutate({
      purchaseOrderId: poId,
      signatoryRole: "hope",
      authorizedOfficialName: "DJOVI REGALA DURANTE, DPA",
      authorizedOfficialDesignation: "SUC President I / HoPE",
    });
  };

  const handleAddItem = () => {
    if (!newItemDesc.trim()) {
      toast.error("Please provide an item description.");
      return;
    }
    const qty = Number(newItemQty) || 1;
    const cost = Number(newItemCost) || 0;
    const item: PurchaseOrderItem = {
      no: String(prepItems.length + 1).padStart(3, "0"),
      unit: newItemUnit.trim() || "pcs",
      description: newItemDesc.trim(),
      quantity: qty,
      estimatedUnitCost: cost,
      totalCost: qty * cost,
    };
    setPrepItems([...prepItems, item]);
    setNewItemDesc("");
    setNewItemQty("1");
    setNewItemCost("0");
    toast.success("Line item added to Purchase Order.");
  };

  const handleRemoveItem = (index: number) => {
    const updated = prepItems.filter((_, idx) => idx !== index);
    setPrepItems(updated.map((it, idx) => ({ ...it, no: String(idx + 1).padStart(3, "0") })));
  };

  const handleSavePo = () => {
    const total = prepItems.reduce(
      (acc, it) => acc + (Number(it.totalCost) || Number(it.quantity) * Number(it.estimatedUnitCost) || 0),
      0
    );
    const prIdToUse = Number(prepPrId) || (dashboard.data?.purchaseRequests?.[0]?.id ?? 1);
    const supplierIdToUse = Number(prepSupplierId) || (setup.data?.suppliers?.[0]?.id ?? 1);

    createPo.mutate({
      purchaseRequestId: prIdToUse,
      supplierId: supplierIdToUse,
      poNumber: poNumber.trim() || undefined,
      placeOfDelivery: placeOfDelivery.trim() || undefined,
      deliveryTerm: deliveryTerm.trim() || undefined,
      paymentTerm: paymentTerm.trim() || undefined,
      modeOfProcurement: modeOfProcurement.trim() || undefined,
      fundCluster: fundCluster.trim() || undefined,
      totalAmount: total > 0 ? total : 73130,
      chiefAccountantName: chiefAccountantName.trim() || undefined,
    });
  };

  const handleResetPoDefaults = () => {
    setPoNumber("2025-01-036");
    setPoDate("September 29, 2026");
    setModeOfProcurement("Small Value Procurement");
    setPlaceOfDelivery("Batanes State College");
    setDateOfDelivery("30 days upon receipt of PO");
    setDeliveryTerm("FOB Destination");
    setPaymentTerm("15 days upon complete delivery");
    setFundCluster("Fund 165");
    setPurpose("for the program/activity of (IGP-Printing) supplies for IGP Printing Services (Testbooklet) to be charged to Fund 165");
    setAuthorizedOfficialName("DJOVI REGALA DURANTE");
    setAuthorizedOfficialDesignation("SUC President I");
    setChiefAccountantName("RHEA ANGELLICA B. ADDATU, CPA");
    setChiefAccountantTitle("Accountant I");
    setRefNumber("2601-GAS2-009");
    setPrepItems([
      { no: "001", unit: "unit", description: "Printer ink & test booklet paper", quantity: 50, estimatedUnitCost: 500, totalCost: 25000 },
      { no: "002", unit: "pack", description: "Specialty cover boards & bindings", quantity: 100, estimatedUnitCost: 481.30, totalCost: 48130 },
    ]);
    toast.info("Purchase Order reset to official BSC Appendix 61 template.");
  };

  const handlePrintOfficialPo = () => {
    const total = prepItems.reduce(
      (acc, it) => acc + (Number(it.totalCost) || Number(it.quantity) * Number(it.estimatedUnitCost) || 0),
      0
    );
    const selectedSupplier = setup.data?.suppliers.find((s) => String(s.id) === prepSupplierId);
    const query = new URLSearchParams({
      prId: prepPrId || "0",
      poNo: poNumber,
      supplier: selectedSupplier?.companyName || "0",
      mode: modeOfProcurement,
      fundCluster,
      refNo: refNumber,
      amount: String(total > 0 ? total : 73130),
      purpose,
    });
    setLocation(`/print/purchase-order?${query.toString()}`);
  };

  const handleDownloadPo = async (po: any) => {
    try {
      const supplier = setup.data?.suppliers.find((s) => s.id === po.supplierId);
      await downloadPurchaseOrderPdf({
        purchaseOrder: {
          poNumber: po.poNumber,
          totalAmount: String(po.totalAmount),
          status: po.status,
          placeOfDelivery: po.placeOfDelivery || "Batanes State College, San Antonio, Basco, Batanes",
          scheduledDeliveryDate: po.scheduledDeliveryDate ? new Date(po.scheduledDeliveryDate) : null,
          deliveryTerm: po.deliveryTerm || "7 calendar days upon receipt of PO",
          paymentTerm: po.paymentTerm || "15 days upon complete delivery & inspection",
          modeOfProcurement: po.modeOfProcurement || "Small Value Procurement (Sec. 53.9)",
          fundCluster: po.fundCluster || "01 - Regular Agency Fund",
          orsBursNumber: po.orsBursNumber || null,
          fundsAvailable: po.fundsAvailable ? String(po.fundsAvailable) : null,
          authorizedOfficialName: po.authorizedOfficialName || null,
          authorizedOfficialDesignation: po.authorizedOfficialDesignation || null,
          chiefAccountantName: po.chiefAccountantName || null,
        },
        supplierName: supplier?.companyName,
        supplierTin: supplier?.tin,
      });
      toast.success(`Downloaded official Purchase Order ${po.poNumber}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to download Purchase Order PDF");
    }
  };

  const calculatedStudioTotal = prepItems.reduce(
    (acc, it) => acc + (Number(it.totalCost) || Number(it.quantity) * Number(it.estimatedUnitCost) || 0),
    0
  );
  const activeSupplier = setup.data?.suppliers.find((s) => String(s.id) === prepSupplierId);

  return (
    <div className="mx-auto max-w-[1560px]">
      <PageHeader
        eyebrow="Procurement Execution"
        title="Purchase Orders (Preparation & Registry)"
        description="Official Government Accounting Manual (GAM) Appendix 61 Purchase Order studio for Procurement Staff, Contract Signing by Budget Officer & HoPE, and PO Releasing by Procurement Officer I."
      />

      {/* Statutory Sequence Workflow Tracker */}
      <div className="mt-6 rounded-lg border border-[#e2d8c3] bg-[#fbf9f4] p-4 text-xs shadow-xs">
        <div className="flex items-center gap-2 font-semibold text-[#7b1e1e] mb-2.5">
          <ScrollText className="h-4 w-4" />
          <span>Official Procurement Sequence (Serving → Staff PO → Contract Signing → Releasing → Delivery)</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 text-[11px] w-full min-w-0">
          <div className="p-2.5 rounded-md border border-emerald-200 bg-white min-w-0 overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-800">1. Notice Serving</span>
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            </div>
            <p className="text-[#65717e] mt-1 text-[10px]"><strong>Procurement Officer (PO)</strong> serves Letter of Approval</p>
            <Link href="/officer/notices-serving" className="mt-1.5 text-[10px] text-emerald-700 font-semibold block hover:underline">
              Notice Serving Desk →
            </Link>
          </div>
          <div className="p-2.5 rounded-md border border-[#7b1e1e]/20 bg-white min-w-0 overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#7b1e1e]">2. Prepare Purchase Order</span>
              <FileCheck2 className="h-3.5 w-3.5 text-[#7b1e1e]" />
            </div>
            <p className="text-[#65717e] mt-1 text-[10px]"><strong>Procurement Staff</strong> · Purchase Order (App. 61)</p>
          </div>
          <div className="p-2.5 rounded-md border border-amber-200 bg-white min-w-0 overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-800">3. Contract Signing</span>
              <Clock className="h-3.5 w-3.5 text-amber-600" />
            </div>
            <p className="text-[#65717e] mt-1 text-[10px]"><strong>Budget Officer / HoPE</strong> · Purchase Order</p>
          </div>
          <div className="p-2.5 rounded-md border border-blue-200 bg-white min-w-0 overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="font-bold text-blue-800">4. Purchase Order/Contract releasing</span>
              <Send className="h-3.5 w-3.5 text-blue-600" />
            </div>
            <p className="text-[#65717e] mt-1 text-[10px]"><strong>Procurement Officer I</strong> · Purchase Order</p>
            <Link href="/officer/releasing" className="mt-1.5 text-[10px] text-blue-700 font-semibold block hover:underline">
              PO Releasing Desk →
            </Link>
          </div>
          <div className="p-2.5 rounded-md border border-purple-200 bg-white min-w-0 overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="font-bold text-purple-800">5. Delivery of Goods</span>
              <Truck className="h-3.5 w-3.5 text-purple-600" />
            </div>
            <p className="text-[#65717e] mt-1 text-[10px]"><strong>Supplier / Contractor</strong> delivers goods; IAR inspection</p>
            <Link href="/officer/delivery-monitoring" className="mt-1.5 text-[10px] text-purple-700 font-semibold block hover:underline">
              Delivery Tracker →
            </Link>
          </div>
        </div>
      </div>

      {/* 3 Workspace Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6 w-full min-w-0">
        <div className="w-full overflow-x-auto pb-1">
          <TabsList className="inline-flex w-auto min-w-full sm:min-w-0 h-auto p-1.5 bg-stone-200/90 dark:bg-stone-800/90 border border-stone-300 dark:border-stone-700 rounded-xl gap-1.5 justify-start">
            <TabsTrigger
              value="create_po"
              className="h-9 px-3.5 py-1.5 text-xs font-semibold rounded-lg shrink-0 transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-stone-900 data-[state=active]:text-[#7b1e1e] data-[state=active]:shadow-sm inline-flex items-center gap-2 whitespace-nowrap"
            >
              <FileCheck2 className="h-4 w-4 text-[#7b1e1e] shrink-0" />
              <span>1. Prepare Purchase Order (Staff)</span>
            </TabsTrigger>
            <TabsTrigger
              value="po_registry"
              className="h-9 px-3.5 py-1.5 text-xs font-semibold rounded-lg shrink-0 transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-stone-900 data-[state=active]:text-[#7b1e1e] data-[state=active]:shadow-sm inline-flex items-center gap-2 whitespace-nowrap"
            >
              <FileText className="h-4 w-4 text-[#7b1e1e] shrink-0" />
              <span>2. PO Registry & Signing ({dashboard.data?.purchaseOrders?.length ?? 0})</span>
            </TabsTrigger>
            <TabsTrigger
              value="aoq_abstracts"
              className="h-9 px-3.5 py-1.5 text-xs font-semibold rounded-lg shrink-0 transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-stone-900 data-[state=active]:text-[#7b1e1e] data-[state=active]:shadow-sm inline-flex items-center gap-2 whitespace-nowrap"
            >
              <Layers className="h-4 w-4 text-[#7b1e1e] shrink-0" />
              <span>3. Quotation Abstracts ({dashboard.data?.quotationAbstracts?.length ?? 0})</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* TAB 1: PREPARE PURCHASE ORDER STUDIO (APPENDIX 61) */}
        <TabsContent value="create_po" className="mt-6 w-full min-w-0">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start w-full min-w-0">
            {/* Left Column: Form Controls (5 cols on xl) */}
            <div className="xl:col-span-5 min-w-0 w-full space-y-5">
              <section className="flat-panel p-5 sm:p-6 w-full min-w-0 rounded-xl border border-stone-200 bg-white">
                <div className="flex items-center justify-between border-b border-[#ece8df] pb-3 mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-[#34404e] flex items-center gap-1.5">
                      <FileCheck2 className="h-4 w-4 text-[#7b1e1e]" />
                      Purchase Order Studio (Appendix 61)
                    </h3>
                    <p className="text-[11px] text-[#77818d] mt-0.5">
                      Accomplished by <strong>Procurement Staff</strong> prior to Contract Signing.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleResetPoDefaults}
                    className="h-7 text-[11px] text-stone-600 hover:text-stone-900 gap-1"
                    title="Reset to official BSC sample template"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Reset
                  </Button>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSavePo();
                  }}
                  className="space-y-4 w-full min-w-0"
                >
                  <Field label="Auto-fill from Purchase Request (Optional)">
                    <Select value={prepPrId} onValueChange={setPrepPrId}>
                      <SelectTrigger className="h-9 text-xs w-full min-w-0 box-border truncate">
                        <SelectValue placeholder="Choose Purchase Request to load..." className="truncate" />
                      </SelectTrigger>
                      <SelectContent>
                        {(dashboard.data?.purchaseRequests ?? []).map((pr) => (
                          <SelectItem key={pr.id} value={String(pr.id)} className="text-xs">
                            {pr.prNumber} — {pr.purpose?.slice(0, 45)}...
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field label="Accredited Supplier *">
                    <Select value={prepSupplierId} onValueChange={setPrepSupplierId}>
                      <SelectTrigger className="h-9 text-xs w-full min-w-0 box-border truncate">
                        <SelectValue placeholder="Select accredited supplier..." className="truncate" />
                      </SelectTrigger>
                      <SelectContent>
                        {(setup.data?.suppliers ?? []).map((s) => (
                          <SelectItem key={s.id} value={String(s.id)} className="text-xs">
                            {s.companyName} (TIN: {s.tin || "N/A"})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full min-w-0">
                    <Field label="PO No. (0000-00-0000) *">
                      <Input
                        value={poNumber}
                        onChange={(e) => setPoNumber(e.target.value)}
                        placeholder="e.g. 2025-01-036"
                        className="h-9 text-xs font-mono font-semibold"
                        required
                      />
                    </Field>
                    <Field label="Date of Preparation *">
                      <Input
                        value={poDate}
                        onChange={(e) => setPoDate(e.target.value)}
                        placeholder="e.g. September 29, 2026"
                        className="h-9 text-xs"
                        required
                      />
                    </Field>
                  </div>

                  <Field label="Mode of Procurement *">
                    <Input
                      value={modeOfProcurement}
                      onChange={(e) => setModeOfProcurement(e.target.value)}
                      placeholder="e.g. Small Value Procurement (Sec. 53.9)"
                      className="h-9 text-xs"
                      required
                    />
                  </Field>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full min-w-0">
                    <Field label="Place of Delivery *">
                      <Input
                        value={placeOfDelivery}
                        onChange={(e) => setPlaceOfDelivery(e.target.value)}
                        placeholder="e.g. Batanes State College"
                        className="h-9 text-xs"
                        required
                      />
                    </Field>
                    <Field label="Delivery Term *">
                      <Input
                        value={deliveryTerm}
                        onChange={(e) => setDeliveryTerm(e.target.value)}
                        placeholder="e.g. FOB Destination"
                        className="h-9 text-xs"
                        required
                      />
                    </Field>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full min-w-0">
                    <Field label="Date of Delivery *">
                      <Input
                        value={dateOfDelivery}
                        onChange={(e) => setDateOfDelivery(e.target.value)}
                        placeholder="e.g. 30 days upon receipt of PO"
                        className="h-9 text-xs"
                        required
                      />
                    </Field>
                    <Field label="Payment Term *">
                      <Input
                        value={paymentTerm}
                        onChange={(e) => setPaymentTerm(e.target.value)}
                        placeholder="e.g. 15 days upon complete delivery"
                        className="h-9 text-xs"
                        required
                      />
                    </Field>
                  </div>

                  <Field label="Purpose *">
                    <Textarea
                      value={purpose}
                      onChange={(e) => setPurpose(e.target.value)}
                      rows={2}
                      className="text-xs"
                      placeholder="e.g. for the program/activity of (IGP-Printing) supplies..."
                      required
                    />
                  </Field>

                  {/* Dynamic Line Item Editor */}
                  <div className="border border-stone-200 rounded-lg p-3 bg-stone-50/50 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-stone-800 uppercase tracking-wide">
                        Line Items ({prepItems.length})
                      </span>
                      <span className="text-xs font-mono font-bold text-[#7b1e1e]">
                        Total: ₱{calculatedStudioTotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="max-h-48 overflow-y-auto divide-y divide-stone-200 border border-stone-200 rounded bg-white">
                      {prepItems.map((it, idx) => (
                        <div key={idx} className="p-2 flex items-center justify-between text-[11px] gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold truncate text-stone-800">{it.description}</p>
                            <p className="text-[10px] text-stone-500">
                              {it.quantity} {it.unit} @ ₱{Number(it.estimatedUnitCost).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                          <span className="font-mono font-semibold text-stone-900">
                            ₱{Number(it.totalCost).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="text-stone-400 hover:text-red-600 transition-colors p-1"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Quick Item Add Row */}
                    <div className="grid grid-cols-12 gap-1.5 pt-1">
                      <Input
                        placeholder="Description..."
                        value={newItemDesc}
                        onChange={(e) => setNewItemDesc(e.target.value)}
                        className="col-span-6 h-7 text-[11px]"
                      />
                      <Input
                        placeholder="Unit"
                        value={newItemUnit}
                        onChange={(e) => setNewItemUnit(e.target.value)}
                        className="col-span-2 h-7 text-[11px]"
                      />
                      <Input
                        placeholder="Qty"
                        type="number"
                        value={newItemQty}
                        onChange={(e) => setNewItemQty(e.target.value)}
                        className="col-span-2 h-7 text-[11px]"
                      />
                      <Input
                        placeholder="Unit Cost"
                        type="number"
                        value={newItemCost}
                        onChange={(e) => setNewItemCost(e.target.value)}
                        className="col-span-2 h-7 text-[11px]"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddItem}
                      className="w-full h-7 text-[11px] text-[#7b1e1e] border-[#7b1e1e] hover:bg-[#7b1e1e]/5"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Line Item
                    </Button>
                  </div>

                  {/* Signatories & Accounting Meta */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full min-w-0">
                    <Field label="Fund Cluster">
                      <Input
                        value={fundCluster}
                        onChange={(e) => setFundCluster(e.target.value)}
                        placeholder="e.g. Fund 165"
                        className="h-9 text-xs"
                      />
                    </Field>
                    <Field label="Reference No. (BAC Res / Ref)">
                      <Input
                        value={refNumber}
                        onChange={(e) => setRefNumber(e.target.value)}
                        placeholder="e.g. 2601-GAS2-009"
                        className="h-9 text-xs font-mono"
                      />
                    </Field>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full min-w-0">
                    <Field label="HoPE Signatory">
                      <Input
                        value={authorizedOfficialName}
                        onChange={(e) => setAuthorizedOfficialName(e.target.value)}
                        placeholder="DJOVI REGALA DURANTE"
                        className="h-9 text-xs font-semibold"
                      />
                    </Field>
                    <Field label="Chief Accountant / Signatory">
                      <Input
                        value={chiefAccountantName}
                        onChange={(e) => setChiefAccountantName(e.target.value)}
                        placeholder="RHEA ANGELLICA B. ADDATU, CPA"
                        className="h-9 text-xs font-semibold"
                      />
                    </Field>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-4 border-t border-stone-200 flex flex-wrap items-center justify-end gap-2.5">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handlePrintOfficialPo}
                      className="h-9 text-xs border-[#7b1e1e] text-[#7b1e1e] hover:bg-[#7b1e1e]/5 gap-1.5"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      Print Official Appendix 61 PO
                    </Button>
                    <Button
                      type="submit"
                      disabled={createPo.isPending}
                      className="h-9 text-xs bg-[#7b1e1e] text-white hover:bg-[#641818] gap-1.5 font-medium shadow-sm active:scale-95 transition-all"
                    >
                      {createPo.isPending ? (
                        <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <FileCheck2 className="h-3.5 w-3.5" />
                      )}
                      Save & Prepare Purchase Order (Staff)
                    </Button>
                  </div>
                </form>
              </section>
            </div>

            {/* Right Column: Live Official Document Canvas Preview (7 cols on xl) */}
            <div className="xl:col-span-7 min-w-0 w-full space-y-4">
              <div className="flex items-center justify-between bg-stone-100 p-2.5 rounded-lg border border-stone-200 w-full min-w-0">
                <div className="flex items-center gap-2">
                  <ScrollText className="h-4 w-4 text-[#7b1e1e]" />
                  <span className="text-xs font-semibold text-stone-800">
                    Live Official Appendix 61 Document Preview
                  </span>
                </div>
                <div className="text-[11px] font-mono text-stone-600">
                  Total: <strong>₱{calculatedStudioTotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</strong>
                </div>
              </div>

              <div className="overflow-x-auto max-h-[900px] overflow-y-auto rounded-xl border border-stone-300 shadow-inner bg-stone-200/50 p-2 sm:p-4 w-full min-w-0">
                <OfficialPurchaseOrderCanvas
                  entityName="BATANES STATE COLLEGE"
                  poNumber={poNumber}
                  poDate={poDate}
                  supplierName={activeSupplier?.companyName || "0"}
                  supplierAddress={activeSupplier?.address || "Basco, Batanes"}
                  supplierTin={activeSupplier?.tin || "183-008-448"}
                  modeOfProcurement={modeOfProcurement}
                  placeOfDelivery={placeOfDelivery}
                  dateOfDelivery={dateOfDelivery}
                  deliveryTerm={deliveryTerm}
                  paymentTerm={paymentTerm}
                  items={prepItems}
                  totalAmount={calculatedStudioTotal}
                  purpose={purpose}
                  authorizedOfficialName={authorizedOfficialName}
                  authorizedOfficialDesignation={authorizedOfficialDesignation}
                  fundCluster={fundCluster}
                  chiefAccountantName={chiefAccountantName}
                  chiefAccountantTitle={chiefAccountantTitle}
                  refNumber={refNumber}
                  showInstructions={true}
                />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* TAB 2: PURCHASE ORDERS REGISTRY & CONTRACT SIGNING */}
        <TabsContent value="po_registry" className="mt-6">
          <div className="flat-panel">
            <div className="border-b border-[#ece8df] px-5 py-4">
              <p className="text-sm font-semibold text-[#34404e]">Purchase Orders & Contract Execution</p>
              <p className="mt-1 text-[11px] text-[#77818d]">
                Appendix 61 contracts requiring Budget Officer funds certification & HoPE signature before release by Procurement Officer I.
              </p>
            </div>
            {dashboard.data?.purchaseOrders.length ? (
              <div className="divide-y divide-[#efebe4]">
                {dashboard.data.purchaseOrders.map((po) => {
                  const isBudgetCertified = Boolean(po.orsBursNumber);
                  const isHopeSigned = Boolean(po.authorizedOfficialName);
                  const isContractFullySigned = po.status === "approved" || (isBudgetCertified && isHopeSigned);
                  const isReleased = po.status === "released";

                  return (
                    <div key={po.id} className="p-5 space-y-3.5">
                      {/* Header */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-bold font-mono text-[#7b1e1e]">{po.poNumber}</p>
                            <Badge variant="outline" className="text-[10px] py-0">
                              PR #{po.purchaseRequestId}
                            </Badge>
                          </div>
                          <p className="mt-1 text-sm font-semibold text-[#3f4a57]">
                            {formatMoney(po.totalAmount)} · Supplier #{po.supplierId}
                          </p>
                        </div>
                        <StatusBadge
                          tone={
                            isReleased
                              ? "approved"
                              : isContractFullySigned
                              ? "approved"
                              : "pending"
                          }
                        >
                          {isReleased
                            ? "RELEASED TO SUPPLIER"
                            : isContractFullySigned
                            ? "CONTRACT SIGNED"
                            : po.status.replaceAll("_", " ").toUpperCase()}
                        </StatusBadge>
                      </div>

                      {/* Meta Info */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-[#65717e] bg-stone-50 p-2.5 rounded border border-stone-200">
                        <div>
                          <span className="font-semibold text-[#34404e]">Place of Delivery: </span>
                          <span>{po.placeOfDelivery || "Batanes State College"}</span>
                        </div>
                        <div>
                          <span className="font-semibold text-[#34404e]">Delivery Term: </span>
                          <span>{po.deliveryTerm || "7 calendar days"}</span>
                        </div>
                        <div>
                          <span className="font-semibold text-[#34404e]">Mode: </span>
                          <span>{po.modeOfProcurement || "Small Value Procurement"}</span>
                        </div>
                        <div>
                          <span className="font-semibold text-[#34404e]">Fund Cluster: </span>
                          <span>{po.fundCluster || "01 - Regular Agency Fund"}</span>
                        </div>
                      </div>

                      {/* Step 3: Contract Signing Box */}
                      <div className="rounded-lg border border-amber-200/80 bg-amber-50/50 p-3 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wide">
                            Step 3: Contract Signing (Budget Officer & HoPE)
                          </span>
                          {isContractFullySigned ? (
                            <Badge className="bg-emerald-600 text-white text-[10px]">
                              Fully Signed ✓
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-amber-400 text-amber-800 text-[10px]">
                              Pending Signature
                            </Badge>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          {/* Budget Officer Signature */}
                          <div className="rounded bg-white p-2.5 border border-stone-200 text-[11px] space-y-1.5">
                            <span className="font-semibold text-[#34404e] block">
                              Budget Officer Certification
                            </span>
                            {isBudgetCertified ? (
                              <div className="text-emerald-700 text-[11px]">
                                <p className="font-semibold">✓ Funds Certified</p>
                                <p className="text-[10px] text-stone-500">ORS/BURS No.: {po.orsBursNumber}</p>
                                <p className="text-[10px] text-stone-500">By: {po.chiefAccountantName || "Budget Officer"}</p>
                              </div>
                            ) : (
                              <div className="space-y-1.5">
                                <Input
                                  placeholder="ORS/BURS No. (e.g. 2026-01-0089)"
                                  value={orsInputs[po.id] ?? `2026-01-${String(po.id).padStart(4, "0")}`}
                                  onChange={(e) =>
                                    setOrsInputs({ ...orsInputs, [po.id]: e.target.value })
                                  }
                                  className="h-7 text-xs"
                                />
                                {canBudget ? (
                                  <Button
                                    size="sm"
                                    disabled={signContract.isPending}
                                    onClick={() => handleBudgetSign(po.id, String(po.totalAmount))}
                                    className="w-full h-7 text-[10px] bg-amber-700 hover:bg-amber-800 text-white"
                                  >
                                    {signContract.isPending && (
                                      <LoaderCircle className="mr-1 h-3 w-3 animate-spin" />
                                    )}
                                    Certify Funds Available
                                  </Button>
                                ) : (
                                  <p className="text-[10px] text-stone-500 italic">
                                    Awaiting Budget Officer certification
                                  </p>
                                )}
                              </div>
                            )}
                          </div>

                          {/* HoPE Signature */}
                          <div className="rounded bg-white p-2.5 border border-stone-200 text-[11px] space-y-1.5">
                            <span className="font-semibold text-[#34404e] block">
                              HoPE / Authorized Official
                            </span>
                            {isHopeSigned ? (
                              <div className="text-emerald-700 text-[11px]">
                                <p className="font-semibold">✓ Contract Approved & Signed</p>
                                <p className="text-[10px] text-stone-500">{po.authorizedOfficialName}</p>
                                <p className="text-[10px] text-stone-500">{po.authorizedOfficialDesignation || "SUC President I"}</p>
                              </div>
                            ) : (
                              <div className="space-y-1.5">
                                <p className="text-[10px] text-stone-600">
                                  Signatory: <strong>DJOVI REGALA DURANTE, DPA</strong> (SUC President I)
                                </p>
                                {canHope ? (
                                  <Button
                                    size="sm"
                                    disabled={signContract.isPending}
                                    onClick={() => handleHopeSign(po.id)}
                                    className="w-full h-7 text-[10px] bg-[#7b1e1e] hover:bg-[#641818] text-white"
                                  >
                                    {signContract.isPending && (
                                      <LoaderCircle className="mr-1 h-3 w-3 animate-spin" />
                                    )}
                                    Sign & Approve Contract
                                  </Button>
                                ) : (
                                  <p className="text-[10px] text-stone-500 italic">
                                    Awaiting HoPE approval & signature
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Step 4 & 5 Action Footer */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-200">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownloadPo(po)}
                            className="h-7 rounded-[4px] text-[10px] text-[#34404e]"
                          >
                            <Download className="mr-1 h-3 w-3 text-[#7b1e1e]" />
                            Official Appendix 61 PDF
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setLocation(`/print/purchase-order?id=${po.id}&prId=${po.purchaseRequestId}`)}
                            className="h-7 rounded-[4px] text-[10px] text-[#7b1e1e] border-[#7b1e1e]"
                          >
                            <Printer className="mr-1 h-3 w-3" />
                            Print Official PO
                          </Button>
                        </div>

                        <div className="flex items-center gap-2">
                          {isReleased ? (
                            <Link href="/officer/delivery-monitoring">
                              <Button
                                size="sm"
                                className="h-7 rounded-[4px] text-[10px] bg-emerald-700 hover:bg-emerald-800 text-white gap-1"
                              >
                                <Truck className="h-3 w-3" />
                                Delivery of Goods (Supplier) →
                              </Button>
                            </Link>
                          ) : isContractFullySigned ? (
                            <Link href="/officer/releasing">
                              <Button
                                size="sm"
                                className="h-7 rounded-[4px] text-[10px] bg-[#7b1e1e] hover:bg-[#641818] text-white gap-1 font-medium"
                                title="Procurement Officer I formally releases the Purchase Order to the supplier"
                              >
                                <Send className="h-3 w-3" />
                                Release PO / Contract (PO I) →
                              </Button>
                            </Link>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center text-[11px] leading-5 text-[#72808c]">
                No Purchase Orders have been generated yet. Procurement Staff can prepare a Purchase Order using the "Prepare Purchase Order" tab above.
              </div>
            )}
          </div>
        </TabsContent>

        {/* TAB 3: ABSTRACTS OF QUOTATION */}
        <TabsContent value="aoq_abstracts" className="mt-6">
          <div className="flat-panel">
            <div className="border-b border-[#ece8df] px-5 py-4">
              <p className="text-sm font-semibold text-[#34404e]">Abstracts of Quotation</p>
              <p className="mt-1 text-[11px] text-[#77818d]">
                Lowest compliant quote proposed from the 3-supplier canvass.
              </p>
            </div>
            {dashboard.data?.quotationAbstracts.length ? (
              <div className="divide-y divide-[#efebe4]">
                {dashboard.data.quotationAbstracts.map((abstract) => (
                  <div key={abstract.id} className="p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-[#3e4855]">RFQ #{abstract.rfqId}</p>
                        <p className="mt-0.5 text-[11px] text-[#72808c]">
                          Recommended Supplier #{abstract.recommendedSupplierId}
                        </p>
                      </div>
                      <StatusBadge tone={abstract.status === "approved" ? "approved" : "pending"}>
                        {abstract.status.toUpperCase()}
                      </StatusBadge>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#f0ece5]">
                      <Link href="/form-templates?form=abstract_of_quotations">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 rounded-[4px] text-[10px] text-[#34404e] hover:bg-[#fffaf0]"
                          title="Open standardized Abstract of Quotations document"
                        >
                          <FileText className="mr-1 h-3 w-3 text-[#7b1e1e]" />
                          Official AOQ Form
                        </Button>
                      </Link>
                      {canBac && abstract.status === "recommended" && (
                        <Button
                          size="sm"
                          onClick={() => approve.mutate({ rfqId: abstract.rfqId })}
                          disabled={approve.isPending}
                          className="h-7 rounded-[4px] bg-[#7b1e1e] text-[10px] hover:bg-[#641818]"
                        >
                          BAC approve
                        </Button>
                      )}
                      {canSupply && abstract.status === "approved" && (
                        <Button
                          size="sm"
                          onClick={() => {
                            createPo.mutate({
                              rfqId: abstract.rfqId,
                              placeOfDelivery: "Batanes State College, San Antonio, Basco, Batanes",
                              deliveryTerm: "7 calendar days upon receipt of PO",
                              paymentTerm: "15 days upon complete delivery & inspection",
                              modeOfProcurement: "Small Value Procurement (Sec. 53.9)",
                              fundCluster: "01 - Regular Agency Fund",
                            });
                          }}
                          disabled={createPo.isPending}
                          className="h-7 rounded-[4px] bg-[#7b1e1e] text-[10px] text-white hover:bg-[#641818] font-medium"
                          title="Procurement Staff prepares official Purchase Order (Appendix 61)"
                        >
                          {createPo.isPending ? (
                            <LoaderCircle className="mr-1 h-3 w-3 animate-spin" />
                          ) : (
                            <FileCheck2 className="mr-1 h-3 w-3" />
                          )}
                          Prepare Purchase Order (Staff)
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-[11px] leading-5 text-[#72808c]">
                No abstracts are ready for review. Complete an RFQ canvass with at least three supplier quotations.
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export function BudgetPage() {
  const [search, setSearch] = useState("");
  const budgets = trpc.procurement.setup.budgetUtilization.useQuery(undefined, { retry: false });

  const filtered = useMemo(() => {
    if (!budgets.data) return [];
    if (!search.trim()) return budgets.data;
    const q = search.trim().toLowerCase();
    return budgets.data.filter((budget) => {
      const officeText = budget.office ? `${budget.office.code} ${budget.office.name}`.toLowerCase() : "";
      const objectText = budget.objectOfExpenditure ? `${budget.objectOfExpenditure.code} ${budget.objectOfExpenditure.name}`.toLowerCase() : "";
      const prText = (budget.purchaseRequests || []).map((pr: any) => `${pr.prNumber} ${pr.purpose || ""}`).join(" ").toLowerCase();
      const fyText = String(budget.fiscalYear);
      return officeText.includes(q) || objectText.includes(q) || prText.includes(q) || fyText.includes(q);
    });
  }, [budgets.data, search]);

  return (
    <div className="mx-auto max-w-[1360px]">
      <PageHeader
        eyebrow="Allotment control"
        title="Budget utilization"
        description="Track allotted, committed, and available balances at the specific office and object-of-expenditure level, with full traceability to linked Purchase Requests."
      />
      <div className="mt-7">
        {budgets.isLoading ? (
          <LoadingPanel label="Loading budget utilization" />
        ) : budgets.data?.length ? (
          <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="w-full sm:max-w-md">
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by PR number, office, or object of expenditure"
                  className="h-9 text-xs"
                />
              </div>
              {search && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSearch("")}
                  className="h-9 text-xs"
                >
                  Clear filter
                </Button>
              )}
            </div>

            <RecordTable>
              <RecordTableHeader>
                <tr>
                  <th className="px-4 py-3 font-semibold">Office</th>
                  <th className="px-4 py-3 font-semibold">Object of expenditure</th>
                  <th className="px-4 py-3 font-semibold">FY</th>
                  <th className="px-4 py-3 font-semibold">PR Numbers</th>
                  <th className="px-4 py-3 font-semibold">Allotted</th>
                  <th className="px-4 py-3 font-semibold">Committed</th>
                  <th className="px-4 py-3 font-semibold">Available</th>
                </tr>
              </RecordTableHeader>
              <tbody className="divide-y divide-[#efebe4] dark:divide-[#3d4854]">
                {filtered.map((budget) => (
                  <tr key={budget.id}>
                    <td className="px-4 py-3 text-[#3e4855] dark:text-[#f1f5f8]">
                      {budget.office ? `${budget.office.code} — ${budget.office.name}` : `Office #${budget.officeId}`}
                    </td>
                    <td className="px-4 py-3 text-[#3e4855] dark:text-[#f1f5f8]">
                      {budget.objectOfExpenditure ? `${budget.objectOfExpenditure.code} — ${budget.objectOfExpenditure.name}` : `Object #${budget.objectOfExpenditureId}`}
                    </td>
                    <td className="px-4 py-3 text-[#65717e] dark:text-[#aebac7]">{budget.fiscalYear}</td>
                    <td className="px-4 py-3">
                      {budget.purchaseRequests && budget.purchaseRequests.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 max-w-[280px]">
                          {budget.purchaseRequests.map((pr: any) => (
                            <a
                              key={pr.id}
                              href="/purchase-requests"
                              title={`${pr.prNumber}${pr.purpose ? `: ${pr.purpose}` : ""} (${formatMoney(pr.totalEstimate)}) · ${pr.status.replaceAll("_", " ")}`}
                              className="inline-flex items-center gap-1 rounded bg-[#f5f2eb] px-2 py-0.5 text-[11px] font-medium font-mono text-[#7b1e1e] border border-[#e2dcd2] transition-colors hover:bg-[#eae4d7] hover:border-[#cbbeaa] dark:bg-[#25303d] dark:text-[#ff837a] dark:border-[#3d4a59] dark:hover:bg-[#303e4e]"
                            >
                              <span>{pr.prNumber}</span>
                              <span className="text-[10px] text-[#7d8894] dark:text-[#9eaab6]">
                                ({formatMoney(pr.totalEstimate)})
                              </span>
                            </a>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[11px] text-[#8994a1] italic">No linked PRs</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[#3e4855] dark:text-[#f1f5f8]">{formatMoney(budget.allottedAmount)}</td>
                    <td className="px-4 py-3 text-[#3e4855] dark:text-[#f1f5f8]">{formatMoney(budget.committedAmount)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge tone={Number(budget.availableAmount) > 0 ? "approved" : "returned"}>
                        {formatMoney(budget.availableAmount)}
                      </StatusBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </RecordTable>
          </div>
        ) : (
          <EmptyWorkspace
            eyebrow="Allotment control"
            title="No office-level budget allotments have been registered."
            description="Use System setup to create an office, an object of expenditure, and the associated fiscal-year allotment before PR submissions can be validated."
            actionLabel="Open system setup"
            actionHref="/setup"
          />
        )}
      </div>
    </div>
  );
}

export function AnalyticsPage() {
  const { user } = useAuth();
  const role = normalizeProcurementRole(user?.role ?? "end_user");
  const isEndUser = role === "end_user";
  // Performance and procurement analytics available to all users for institutional transparency
  const canViewPerformanceAnalytics = true;

  const dashboard = trpc.procurement.dashboard.useQuery(undefined, { retry: false });
  const data = dashboard.data;
  const planned = data?.appPpmpEntries.reduce((sum, entry) => sum + Number(entry.plannedAmount), 0) ?? 0;
  const actual = data?.appPpmpEntries.reduce((sum, entry) => sum + Number(entry.actualAmount), 0) ?? 0;
  const prEstimate = data?.purchaseRequests.reduce((sum, pr) => sum + Number(pr.totalEstimate), 0) ?? 0;
  const percentage = planned ? Math.min(100, (actual / planned) * 100) : 0;
  const cycleTime = data?.analytics.averageCycleTimeDays;
  const topCommodities = data?.analytics.topCommodities ?? [];

  // Performance Analytics Data (Available to all users for transparency)
  const [source, setSource] = useState<"all" | "live" | "historical">("all");
  const [search, setSearch] = useState("");
  const [selectedOffice, setSelectedOffice] = useState("");
  const [sortField, setSortField] = useState<"endUser" | "prCount" | "totalAbc" | "totalContract" | "savings" | "delayedPrs">("prCount");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const performance = trpc.procurement.analytics.endUserPerformance.useQuery(
    { source },
    { enabled: canViewPerformanceAnalytics, retry: false }
  );

  const rawRecords = performance.data?.officePerformance ?? [];

  const filteredRecords = useMemo(() => {
    let records = rawRecords;
    if (selectedOffice.trim()) {
      const officeKey = selectedOffice.trim().toLowerCase();
      records = records.filter(
        (r) =>
          r.endUser.toLowerCase() === officeKey ||
          r.endUser.toLowerCase().includes(officeKey) ||
          officeKey.includes(r.endUser.toLowerCase())
      );
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      records = records.filter((r) => r.endUser.toLowerCase().includes(q));
    }
    return [...records].sort((a, b) => {
      const dir = sortDirection === "asc" ? 1 : -1;
      if (sortField === "endUser") {
        return a.endUser.localeCompare(b.endUser) * dir;
      }
      return (Number(a[sortField]) - Number(b[sortField])) * dir;
    });
  }, [rawRecords, selectedOffice, search, sortField, sortDirection]);

  const totalPages = pageSize === 0 ? 1 : Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const paginatedRecords = useMemo(() => {
    if (pageSize === 0) return filteredRecords;
    const start = (currentPage - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, currentPage, pageSize]);

  const summaryTotals = useMemo(() => {
    if (!filteredRecords.length) return { prCount: 0, totalAbc: 0, totalContract: 0, savings: 0, delayedPrs: 0 };
    return filteredRecords.reduce(
      (acc, r) => ({
        prCount: acc.prCount + r.prCount,
        totalAbc: Math.round((acc.totalAbc + r.totalAbc) * 100) / 100,
        totalContract: Math.round((acc.totalContract + r.totalContract) * 100) / 100,
        savings: Math.round((acc.savings + r.savings) * 100) / 100,
        delayedPrs: acc.delayedPrs + r.delayedPrs,
      }),
      { prCount: 0, totalAbc: 0, totalContract: 0, savings: 0, delayedPrs: 0 }
    );
  }, [filteredRecords]);

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
    setCurrentPage(1);
  };

  return (
    <div className="mx-auto w-full max-w-[1360px] pb-12">
      <PageHeader
        eyebrow="Institutional procurement intelligence & transparency"
        title="Analytics & Performance"
        description="Live, record-backed measures for workflow volume, office-level end-user performance, budget plan-versus-actual progress, and delivery tracking across Batanes State College."
      />

      {/* Top-Level KPI Summary Cards / Banner (Available to All Users for Transparency) */}
      {canViewPerformanceAnalytics && (
        <section className="mt-7">
          <div className="mb-3.5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#9a6d19]">
                Top-Level KPI Summary
              </p>
              <p className="text-[11px] text-[#77818d]">
                Procurement status indicators for failed quotations, partial delivery shipments, cancellations, and overdue requests.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 self-start rounded-md border border-[#e5dfd5] bg-white p-0.5 text-xs shadow-sm lg:self-auto max-w-full shrink-0">
              <span className="px-2 text-[10px] font-bold uppercase tracking-wider text-[#8b95a1]">Scope:</span>
              <button
                type="button"
                onClick={() => { setSource("all"); setCurrentPage(1); }}
                className={`rounded px-2.5 py-1 text-xs font-semibold transition ${source === "all" ? "bg-[#7b1e1e] text-white shadow-xs" : "text-[#5e6977] hover:text-[#202833]"}`}
              >
                All Data
              </button>
              <button
                type="button"
                onClick={() => { setSource("live"); setCurrentPage(1); }}
                className={`rounded px-2.5 py-1 text-xs font-semibold transition ${source === "live" ? "bg-[#7b1e1e] text-white shadow-xs" : "text-[#5e6977] hover:text-[#202833]"}`}
              >
                Live Operations
              </button>
              <button
                type="button"
                onClick={() => { setSource("historical"); setCurrentPage(1); }}
                className={`rounded px-2.5 py-1 text-xs font-semibold transition ${source === "historical" ? "bg-[#7b1e1e] text-white shadow-xs" : "text-[#5e6977] hover:text-[#202833]"}`}
              >
                FY 2025 PMR
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <KpiStatusCard
              label="Failed"
              count={performance.data?.kpiSummary.failedCount ?? 0}
              subtitle="Quotation exceeded ABC or no supplier quote"
              tone="danger"
              icon={AlertTriangle}
            />
            <KpiStatusCard
              label="Partial Delivery"
              count={performance.data?.kpiSummary.partialDeliveryCount ?? 0}
              subtitle="Incomplete deliveries pending final acceptance"
              tone="warning"
              icon={Truck}
            />
            <KpiStatusCard
              label="Cancelled"
              count={performance.data?.kpiSummary.cancelledCount ?? 0}
              subtitle="Withdrawn or terminated purchase requests"
              tone="neutral"
              icon={Ban}
            />
            <KpiStatusCard
              label="Realized Savings"
              count={formatMoney(performance.data?.kpiSummary.totalSavings ?? 0)}
              subtitle="Total ABC minus Total Contract awarded"
              tone="success"
              icon={TrendingUp}
            />
            <KpiStatusCard
              label="Delayed PRs"
              count={performance.data?.kpiSummary.totalDelayedPrs ?? 0}
              subtitle="Overdue requests or delivery schedule delays"
              tone="accent"
              icon={Clock}
            />
          </div>
        </section>
      )}

      {/* End-User Performance Analytics Table (Exclusively for Procurement Staff / Officer and Admin) */}
      {canViewPerformanceAnalytics && (
        <section className="flat-panel mt-6">
          <div className="border-b border-[#ece8df] px-4 py-4 dark:border-[#46515c] sm:px-6">
            <div className="flex flex-col gap-3.5 xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-semibold text-[#2c3644] dark:text-[#f1f5f8]">
                    End-User Performance Analytics
                  </h3>
                  <span className="rounded-[4px] border border-[#e2d5bd] bg-[#fffaf0] px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-[#8a6520] dark:border-[#52411e] dark:bg-[#251d10] dark:text-[#f0c36a]">
                    END USER SUMMARY
                  </span>
                </div>
                <p className="mt-1 text-sm leading-6 text-[#586575] dark:text-[#c4ced8]">
                  Replicated from official procurement monitoring sheets: PR count, Approved Budget for Contract (ABC), awarded contract values, realized savings, and overdue tracking per office.
                </p>
              </div>

              <div className="flex w-full flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:w-auto shrink-0">
                <div className="w-full sm:w-64 shrink-0">
                  <OfficeSelect
                    value={selectedOffice}
                    valueMode="name"
                    onChange={(val) => { setSelectedOffice(val); setCurrentPage(1); }}
                    allowAll
                    allLabel="All Offices / Units"
                    allowClear
                    placeholder="Filter by Office..."
                    triggerClassName="h-9 text-sm bg-white border-[#d8d3ca] dark:border-[#46515c] dark:bg-[#1b2229] dark:text-[#f1f5f8]"
                  />
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#8b95a1]" />
                  <Input
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                    placeholder="Search End User / Office..."
                    className="h-9 w-full pl-8 text-sm bg-white border-[#d8d3ca] dark:border-[#46515c] dark:bg-[#1b2229] dark:text-[#f1f5f8] dark:placeholder:text-[#aeb9c4]"
                  />
                </div>
                {(search || selectedOffice) && (
                  <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setSelectedOffice(""); setCurrentPage(1); }} className="h-9 text-sm shrink-0">
                    Reset
                  </Button>
                )}
              </div>
            </div>
          </div>

          {performance.isLoading ? (
            <div className="p-12">
              <LoadingPanel label="Aggregating End-User performance data..." />
            </div>
          ) : filteredRecords.length ? (
            <div>
              <div className="w-full overflow-x-auto">
                <table className="w-full min-w-[700px] text-left text-[13px] sm:text-sm">
                  <thead className="border-b border-[#e5dcce] bg-[#f8f5ee] text-xs font-bold uppercase tracking-wider text-[#554433] dark:border-[#46515c] dark:bg-[#27323d] dark:text-[#e2e8f0]">
                    <tr>
                      <th
                        className="cursor-pointer select-none px-5 py-3.5 hover:text-[#7b1e1e]"
                        onClick={() => toggleSort("endUser")}
                        title="Click to sort by End User"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>End User</span>
                          <ArrowUpDown className={`h-3.5 w-3.5 ${sortField === "endUser" ? "text-[#7b1e1e] dark:text-[#ff837a]" : "text-[#8a7e6e] dark:text-[#aeb9c4]"}`} />
                        </div>
                      </th>
                      <th
                        className="cursor-pointer select-none px-4 py-3.5 text-right hover:text-[#7b1e1e]"
                        onClick={() => toggleSort("prCount")}
                        title="Click to sort by PR Count"
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          <span>PR Count</span>
                          <ArrowUpDown className={`h-3.5 w-3.5 ${sortField === "prCount" ? "text-[#7b1e1e] dark:text-[#ff837a]" : "text-[#8a7e6e] dark:text-[#aeb9c4]"}`} />
                        </div>
                      </th>
                      <th
                        className="cursor-pointer select-none px-4 py-3.5 text-right hover:text-[#7b1e1e]"
                        onClick={() => toggleSort("totalAbc")}
                        title="Click to sort by Total ABC"
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          <span>Total ABC</span>
                          <ArrowUpDown className={`h-3.5 w-3.5 ${sortField === "totalAbc" ? "text-[#7b1e1e] dark:text-[#ff837a]" : "text-[#8a7e6e] dark:text-[#aeb9c4]"}`} />
                        </div>
                      </th>
                      <th
                        className="cursor-pointer select-none px-4 py-3.5 text-right hover:text-[#7b1e1e]"
                        onClick={() => toggleSort("totalContract")}
                        title="Click to sort by Total Contract"
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          <span>Total Contract</span>
                          <ArrowUpDown className={`h-3.5 w-3.5 ${sortField === "totalContract" ? "text-[#7b1e1e] dark:text-[#ff837a]" : "text-[#8a7e6e] dark:text-[#aeb9c4]"}`} />
                        </div>
                      </th>
                      <th
                        className="cursor-pointer select-none px-4 py-3.5 text-right hover:text-[#7b1e1e]"
                        onClick={() => toggleSort("savings")}
                        title="Click to sort by Savings"
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          <span>Savings</span>
                          <ArrowUpDown className={`h-3.5 w-3.5 ${sortField === "savings" ? "text-[#7b1e1e] dark:text-[#ff837a]" : "text-[#8a7e6e] dark:text-[#aeb9c4]"}`} />
                        </div>
                      </th>
                      <th
                        className="cursor-pointer select-none px-4 py-3.5 text-center hover:text-[#7b1e1e]"
                        onClick={() => toggleSort("delayedPrs")}
                        title="Click to sort by Delayed PRs"
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          <span>Delayed PRs</span>
                          <ArrowUpDown className={`h-3.5 w-3.5 ${sortField === "delayedPrs" ? "text-[#7b1e1e] dark:text-[#ff837a]" : "text-[#8a7e6e] dark:text-[#aeb9c4]"}`} />
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#eeeae1] dark:divide-[#46515c]">
                    {paginatedRecords.map((row) => (
                      <tr key={row.endUser} className="transition-colors hover:bg-[#faf7f0] dark:hover:bg-[#25313c]">
                        <td className="px-5 py-3.5 font-semibold leading-6 text-[#29323f] dark:text-[#f1f5f8]">
                          {row.endUser}
                        </td>
                        <td className="px-4 py-3.5 text-right font-medium text-[#465160] dark:text-[#e2e8f0]">
                          {row.prCount.toLocaleString()}
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono text-[#374151] dark:text-[#e2e8f0]">
                          {formatMoney(row.totalAbc)}
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono font-medium text-[#7b1e1e] dark:text-[#ff938a]">
                          {formatMoney(row.totalContract)}
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono font-semibold text-[#0f766e] dark:text-[#5eead4]">
                          {formatMoney(row.savings)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {row.delayedPrs > 0 ? (
                            <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700 ring-1 ring-inset ring-red-600/20 dark:bg-[#3a1d20] dark:text-[#ffb4ad] dark:ring-red-300/30">
                              {row.delayedPrs}
                            </span>
                          ) : (
                            <span className="text-[#7d8996] dark:text-[#aeb9c4]">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t-2 border-[#d9ccb9] bg-[#f4efe4] font-bold text-[#202833] dark:border-[#596675] dark:bg-[#303b46] dark:text-[#f1f5f8]">
                    <tr>
                      <td className="px-5 py-3.5 text-sm font-bold uppercase tracking-wider text-[#7b1e1e] dark:text-[#ff938a]">
                        Summary Total ({filteredRecords.length} {filteredRecords.length === 1 ? "Office" : "Offices"})
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-bold text-[#202833] dark:text-[#f1f5f8]">
                        {summaryTotals.prCount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-bold text-[#202833] dark:text-[#f1f5f8]">
                        {formatMoney(summaryTotals.totalAbc)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-bold text-[#7b1e1e] dark:text-[#ff938a]">
                        {formatMoney(summaryTotals.totalContract)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-bold text-[#0f766e] dark:text-[#5eead4]">
                        {formatMoney(summaryTotals.savings)}
                      </td>
                      <td className="px-4 py-3.5 text-center font-bold text-[#202833] dark:text-[#f1f5f8]">
                        {summaryTotals.delayedPrs > 0 ? (
                          <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-1 text-sm font-bold text-red-800 dark:bg-[#3a1d20] dark:text-[#ffb4ad]">
                            {summaryTotals.delayedPrs}
                          </span>
                        ) : (
                          0
                        )}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Table pagination & rows per page controls */}
              <div className="flex flex-col items-center justify-between gap-3 border-t border-[#ece8df] px-6 py-3 text-sm dark:border-[#46515c] sm:flex-row">
                <div className="flex items-center gap-2 text-[#586575] dark:text-[#c4ced8]">
                  <span>Showing</span>
                  <span className="font-semibold text-[#29323f] dark:text-[#f1f5f8]">
                    {filteredRecords.length === 0 ? 0 : pageSize === 0 ? 1 : (currentPage - 1) * pageSize + 1}
                  </span>
                  <span>to</span>
                  <span className="font-semibold text-[#29323f] dark:text-[#f1f5f8]">
                    {pageSize === 0 ? filteredRecords.length : Math.min(currentPage * pageSize, filteredRecords.length)}
                  </span>
                  <span>of</span>
                  <span className="font-semibold text-[#29323f] dark:text-[#f1f5f8]">{filteredRecords.length}</span>
                  <span>offices</span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-[#586575] dark:text-[#c4ced8]">
                    <span>Per page:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="rounded border border-[#d8d0c2] bg-white px-2 py-1 text-sm text-[#29323f] dark:border-[#596675] dark:bg-[#1b2229] dark:text-[#f1f5f8]"
                    >
                      <option value={15}>15</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={0}>All</option>
                    </select>
                  </div>

                  {pageSize > 0 && totalPages > 1 && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage <= 1}
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        className="h-7 w-7 p-0"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </Button>
                      <span className="px-2 font-medium text-[#29323f] dark:text-[#f1f5f8]">
                        {currentPage} / {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage >= totalPages}
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        className="h-7 w-7 p-0"
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-10 text-center text-sm text-[#586575] dark:text-[#c4ced8]">
              No office records match the search filter.
            </div>
          )}
        </section>
      )}

      {/* General Procurement Metrics & Activity */}
      <div className="mt-8">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#9a6d19]">
          {isEndUser ? "My Activity Overview" : "Campus Procurement Macro Metrics"}
        </p>
        <div className="mt-2.5 grid gap-4 md:grid-cols-3">
          <Metric
            label="Purchase Request estimate"
            value={formatMoney(prEstimate)}
            detail={isEndUser ? "Total estimate across your submitted PRs." : "Aggregate of PR estimates visible to your role."}
            icon={BarChart3}
          />
          <Metric
            label="Planned APP / PPMP"
            value={formatMoney(planned)}
            detail="Aggregate value of registered plan entries."
            icon={FileCheck2}
          />
          <Metric
            label="Purchase Order volume"
            value={String(data?.purchaseOrders.length ?? 0)}
            detail="Purchase Orders generated from approved abstracts."
            icon={FileSearch}
          />
        </div>
      </div>

      <div className="flat-panel mt-6 p-6">
        <div className="flex items-start justify-between gap-5">
          <div>
            <p className="text-sm font-semibold text-[#34404e]">Budget plan versus actual</p>
            <p className="mt-1 text-[11px] text-[#77818d]">
              Actual spending becomes available as related procurement records are completed.
            </p>
          </div>
          <p className="font-display text-2xl font-semibold text-[#7b1e1e]">
            {planned ? `${percentage.toFixed(1)}%` : "—"}
          </p>
        </div>
        <div className="mt-6 h-3 overflow-hidden rounded-[3px] bg-[#eeeae1]">
          <div className="h-full bg-[#9a6d19] transition-[width] duration-300" style={{ width: `${percentage}%` }} />
        </div>
        <div className="mt-3 flex justify-between text-[11px] text-[#737e8a]">
          <span>Planned: {formatMoney(planned)}</span>
          <span>Actual: {formatMoney(actual)}</span>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="flat-panel p-5">
          <p className="text-sm font-semibold text-[#34404e]">Average procurement cycle time</p>
          <p className="mt-3 font-display text-2xl font-semibold text-[#7b1e1e]">
            {cycleTime === null || cycleTime === undefined ? "—" : `${cycleTime.toFixed(1)} days`}
          </p>
          <p className="mt-2 text-[11px] leading-5 text-[#72808c]">
            Calculated only from PR records linked to Purchase Orders in the explicit closed state.
          </p>
        </div>

        <div className="flat-panel p-5">
          <p className="text-sm font-semibold text-[#34404e]">Top commodities</p>
          {topCommodities.length ? (
            <ol className="mt-3 divide-y divide-[#efebe4]">
              {topCommodities.map((commodity, index) => (
                <li key={commodity.description} className="flex items-center justify-between gap-3 py-2 text-[11px]">
                  <span className="text-[#3e4855]">
                    <span className="mr-2 font-bold text-[#9a6d19]">{index + 1}.</span>
                    {commodity.description}
                  </span>
                  <span className="font-semibold text-[#7b1e1e]">{formatMoney(commodity.amount)}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-2 text-[11px] leading-5 text-[#72808c]">
              No closed-PO commodity records are available yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function KpiStatusCard({
  label,
  count,
  subtitle,
  tone,
  icon: Icon,
}: {
  label: string;
  count: number | string;
  subtitle: string;
  tone: "danger" | "warning" | "neutral" | "success" | "accent";
  icon: typeof AlertTriangle;
}) {
  const toneStyles = {
    danger: {
      bg: "bg-[#fffafa] border-[#fed7d7]",
      badge: "bg-[#ffe3e3] text-[#c53030]",
      value: "text-[#9b2c2c]",
      icon: "text-[#e53e3e]",
    },
    warning: {
      bg: "bg-[#fffdfa] border-[#feebc8]",
      badge: "bg-[#feebc8] text-[#c05621]",
      value: "text-[#c05621]",
      icon: "text-[#dd6b20]",
    },
    neutral: {
      bg: "bg-[#fbfbfa] border-[#e2e8f0]",
      badge: "bg-[#edf2f7] text-[#4a5568]",
      value: "text-[#2d3748]",
      icon: "text-[#718096]",
    },
    success: {
      bg: "bg-[#f8fcf9] border-[#c6f6d5]",
      badge: "bg-[#c6f6d5] text-[#22543d]",
      value: "text-[#22543d]",
      icon: "text-[#38a169]",
    },
    accent: {
      bg: "bg-[#fffaf0] border-[#fed7aa]",
      badge: "bg-[#feebc8] text-[#9a6d19]",
      value: "text-[#7b1e1e]",
      icon: "text-[#9a6d19]",
    },
  }[tone];

  return (
    <div className={`flat-panel min-w-0 overflow-hidden p-4 sm:p-4.5 transition hover:shadow-md ${toneStyles.bg}`}>
      <div className="flex items-center justify-between gap-1">
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider truncate ${toneStyles.badge}`}>
          <Icon className="h-3 w-3 shrink-0" />
          <span className="truncate">{label}</span>
        </span>
        <Icon className={`h-4 w-4 shrink-0 ${toneStyles.icon}`} />
      </div>
      <p
        className={`mt-3 truncate font-display text-lg font-bold tracking-tight sm:text-xl xl:text-2xl ${toneStyles.value}`}
        title={typeof count === "number" ? count.toLocaleString() : String(count)}
      >
        {typeof count === "number" ? count.toLocaleString() : count}
      </p>
      <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-[#73808b]" title={subtitle}>
        {subtitle}
      </p>
    </div>
  );
}


export function AuditTrailPage() {
  const { user } = useAuth();
  const isEndUser = normalizeProcurementRole(user?.role ?? "end_user") === "end_user";
  const dashboard = trpc.procurement.dashboard.useQuery(undefined, { retry: false });
  return <div className="mx-auto max-w-[1240px]"><PageHeader eyebrow={isEndUser ? "My PR tracking" : "Accountability"} title={isEndUser ? "My Audit Trail" : "Audit trail"} description={isEndUser ? "Follow the recorded workflow events for your own Purchase Requests and submitted procurement packages." : "Time-stamped record of authorised configuration, workflow, approval, quotation, and Purchase Order actions."} /> <div className="mt-7">{dashboard.isLoading ? <LoadingPanel label="Loading audit trail" /> : dashboard.data?.auditEvents.length ? <RecordTable><RecordTableHeader><tr><th className="px-4 py-3 font-semibold">Timestamp</th><th className="px-4 py-3 font-semibold">Transaction</th><th className="px-4 py-3 font-semibold">Action</th><th className="px-4 py-3 font-semibold">Role</th></tr></RecordTableHeader><tbody className="divide-y divide-[#efebe4]">{dashboard.data.auditEvents.map((event) => <tr key={event.id}><td className="px-4 py-3 text-[#65717e]">{new Date(event.createdAt).toLocaleString("en-PH")}</td><td className="px-4 py-3 font-semibold text-[#3e4855]">{event.entityType.replaceAll("_", " ")}</td><td className="px-4 py-3 text-[#65717e]">{event.action.replaceAll("_", " ")}</td><td className="px-4 py-3"><StatusBadge tone="active">{event.performedByRole.replaceAll("_", " ").toUpperCase()}</StatusBadge></td></tr>)}</tbody></RecordTable> : <EmptyWorkspace eyebrow={isEndUser ? "My PR tracking" : "Accountability"} title={isEndUser ? "No activity for your Purchase Requests yet." : "No audit events have been recorded."} description={isEndUser ? "Submit a Purchase Request package to start receiving workflow updates here." : "Every authorised configuration and procurement workflow action creates a time-stamped event here."} />}</div></div>;
}

function Metric({ label, value, detail, icon: Icon }: { label: string; value: string; detail: string; icon: typeof BarChart3 }) { return <div className="flat-panel p-5"><div className="flex items-start justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9a6d19]">{label}</p><p className="mt-4 font-display text-2xl font-semibold text-[#202833]">{value}</p></div><Icon className="h-4 w-4 text-[#7b1e1e]" /></div><p className="mt-3 text-[11px] leading-5 text-[#73808b]">{detail}</p></div>; }
function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) { return <div className={cn("w-full min-w-0", className)}><Label className="text-[11px] font-semibold text-[#4c5664] block truncate">{label}</Label><div className="mt-1.5 w-full min-w-0">{children}</div></div>; }
function LoadingPanel({ label }: { label: string }) { return <div className="flat-panel grid min-h-72 place-items-center text-center"><div><LoaderCircle className="mx-auto h-5 w-5 animate-spin text-[#7b1e1e]" /><p className="mt-3 text-xs text-[#6e7885]">{label}</p></div></div>; }

export function HistoricalPmrPage() {
  const [search, setSearch] = useState("");
  const [office, setOffice] = useState("");
  const [status, setStatus] = useState("");
  const summary = trpc.procurement.historicalPmr.summary.useQuery({ fiscalYear: 2025 }, { retry: false });
  const records = trpc.procurement.historicalPmr.list.useQuery({ fiscalYear: 2025, search: search || undefined, office: office || undefined, status: status || undefined, limit: 500 }, { retry: false });
  const offices = useMemo(() => Array.from(new Set((records.data ?? []).map((record) => record.office).filter((value): value is string => Boolean(value)))).sort(), [records.data]);
  const statuses = useMemo(() => Array.from(new Set((records.data ?? []).map((record) => record.status).filter((value): value is string => Boolean(value)))).sort(), [records.data]);
  return <div className="mx-auto max-w-[1560px]">
    <PageHeader eyebrow="Historical records" title="2025 Procurement Monitoring Report" description="Searchable historical PMR data imported from the official 2025 DATA sheets. End-Users do not have access to this internal monitoring view." />
    <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Metric label="Item records" value={String(summary.data?.records ?? 0)} detail="Normalized PMR line items" icon={FileCheck2} />
      <Metric label="Purchase Requests" value={String(summary.data?.purchaseRequests ?? 0)} detail="Distinct PR numbers" icon={FileSearch} />
      <Metric label="Suppliers" value={String(summary.data?.suppliers ?? 0)} detail="Historical supplier records" icon={UsersRound} />
      <Metric label="Actual total" value={formatMoney(summary.data?.actualTotal ?? 0)} detail="Imported 2025 total" icon={BarChart3} />
    </div>
    <div className="mt-6 flat-panel p-5">
      <div className="grid gap-3 md:grid-cols-[1.4fr_1fr_1fr_auto]">
        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search PR, item, end-user, or supplier" aria-label="Search historical PMR" />
        <OfficeSelect
          value={office}
          valueMode="name"
          onChange={setOffice}
          allowAll
          allLabel="All offices"
          allowClear
          placeholder="Filter by office..."
          customOffices={offices.map((o) => ({ code: o.split(" ")[0] || "OFFICE", name: o }))}
          triggerClassName="h-9"
        />
        <Select value={status || "all"} onValueChange={(value) => setStatus(value === "all" ? "" : value)}><SelectTrigger><SelectValue placeholder="All statuses" /></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem>{statuses.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select>
        <Button variant="outline" onClick={() => { setSearch(""); setOffice(""); setStatus(""); }}>Clear</Button>
      </div>
    </div>
    <div className="mt-6 overflow-x-auto flat-panel">
      {records.isLoading ? <div className="p-8"><LoadingPanel label="Loading historical PMR" /></div> : records.data?.length ? <RecordTable><RecordTableHeader><tr><th className="px-4 py-3 font-semibold">PR#</th><th className="px-4 py-3 font-semibold">End-User / Office</th><th className="px-4 py-3 font-semibold">Item</th><th className="px-4 py-3 font-semibold">Supplier</th><th className="px-4 py-3 text-right font-semibold">Estimated</th><th className="px-4 py-3 text-right font-semibold">Actual</th><th className="px-4 py-3 font-semibold">Delivery</th><th className="px-4 py-3 font-semibold">Status</th></tr></RecordTableHeader><tbody className="divide-y divide-[#efebe4]">{records.data.map((record) => <tr key={record.recordKey} className="align-top"><td className="whitespace-nowrap px-4 py-3 font-semibold text-[#3e4855]">{record.prNumber}<p className="mt-1 text-[10px] font-normal text-[#89929c]">{record.month || "—"}</p></td><td className="min-w-[180px] px-4 py-3 text-[#65717e]"><p>{record.endUser || "—"}</p><p className="mt-1 text-[10px] text-[#89929c]">{record.office || "Office not recorded"}</p></td><td className="min-w-[260px] max-w-[420px] px-4 py-3 text-[#65717e]"><p>{record.item || "—"}</p><p className="mt-1 text-[10px] text-[#89929c]">{record.quantity || "—"} {record.unitOfIssue || ""}</p></td><td className="min-w-[180px] px-4 py-3 text-[#65717e]">{record.supplier || "—"}</td><td className="whitespace-nowrap px-4 py-3 text-right text-[#65717e]">{formatMoney(record.estimatedTotal || 0)}</td><td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-[#3e4855]">{formatMoney(record.total || 0)}</td><td className="whitespace-nowrap px-4 py-3 text-[#65717e]">{record.deliveryDate || "—"}</td><td className="px-4 py-3"><StatusBadge tone={record.status?.toLowerCase() === "complete" ? "approved" : "pending"}>{record.status || "—"}</StatusBadge><p className="mt-1 max-w-[180px] text-[10px] text-[#89929c]">{record.remarks || ""}</p></td></tr>)}</tbody></RecordTable> : <div className="p-8"><EmptyWorkspace eyebrow="Historical PMR" title="No PMR records found." description="Run the 2025 PMR import after applying the historical PMR database migration." /></div>}
    </div>
  </div>;
}
