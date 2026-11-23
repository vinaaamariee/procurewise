import { FormShell } from "@/components/FormShell";
import { PageHeader } from "@/components/PageHeader";
import { RecordTable, RecordTableHeader } from "@/components/RecordTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OfficeSelect } from "@/components/OfficeSelect";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, Circle, FileSignature, LoaderCircle, Mail, Send, Settings2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { OFFICIAL_ROLE_LABELS, normalizeProcurementRole } from "../../../shared/procurementRules";

const roleLabels = { end_user: OFFICIAL_ROLE_LABELS.end_user, procurement_officer: "Procurement Office (legacy)", procurement_officer_i: OFFICIAL_ROLE_LABELS.procurement_officer_i, procurement_officer_ii: OFFICIAL_ROLE_LABELS.procurement_officer_ii, procurement_staff: OFFICIAL_ROLE_LABELS.procurement_staff, administrative_approver: OFFICIAL_ROLE_LABELS.administrative_approver, bac_secretariat: OFFICIAL_ROLE_LABELS.bac_secretariat, bac: OFFICIAL_ROLE_LABELS.bac, hope: OFFICIAL_ROLE_LABELS.hope, budget_officer: OFFICIAL_ROLE_LABELS.budget_officer, supplier_contractor: OFFICIAL_ROLE_LABELS.supplier_contractor, admin: OFFICIAL_ROLE_LABELS.admin } as const;

export default function SetupPage() {
  const { user, loading: authLoading } = useAuth();
  const role = user ? normalizeProcurementRole(user.role) : "end_user";
  const isOfficerOrAdmin = role === "admin" || role === "procurement_officer";
  const isAdmin = role === "admin";
  const utils = trpc.useUtils();
  const setup = trpc.procurement.setup.details.useQuery(undefined, { retry: false });
  const users = trpc.procurement.setup.users.useQuery(undefined, { retry: false, enabled: Boolean(isOfficerOrAdmin) });
  const purchaseRequestSignatories = trpc.procurement.purchaseRequests.signatories.useQuery(undefined, { retry: false, enabled: Boolean(isOfficerOrAdmin) });
  const refresh = () => { void utils.procurement.setup.details.invalidate(); };
  const createOffice = trpc.procurement.setup.createOffice.useMutation({ onSuccess: () => { toast.success("Office added."); refresh(); }, onError: (error) => toast.error(error.message) });
  const createObject = trpc.procurement.setup.createObjectOfExpenditure.useMutation({ onSuccess: () => { toast.success("Object of expenditure added."); refresh(); }, onError: (error) => toast.error(error.message) });
  const createBudget = trpc.procurement.setup.createBudgetAllotment.useMutation({ onSuccess: () => { toast.success("Budget allotment recorded."); refresh(); }, onError: (error) => toast.error(error.message) });
  const createPurchaseRequestSignatory = trpc.procurement.setup.createPurchaseRequestSignatory.useMutation({ onSuccess: () => { toast.success("Purchase Request signatory recorded."); void utils.procurement.purchaseRequests.signatories.invalidate(); }, onError: (error) => toast.error(error.message) });
  const updateSettings = trpc.procurement.setup.updateSettings.useMutation({ onSuccess: () => { toast.success("Entity and signatory defaults saved."); refresh(); }, onError: (error) => toast.error(error.message) });
  const updateUserRole = trpc.procurement.setup.updateUserRole.useMutation({ onSuccess: () => { toast.success("Workflow role updated."); void utils.procurement.setup.users.invalidate(); }, onError: (error) => toast.error(error.message) });
  const updateUserOffice = trpc.procurement.setup.updateUserOffice.useMutation({ onSuccess: () => { toast.success("User office updated."); void utils.procurement.setup.users.invalidate(); }, onError: (error) => toast.error(error.message) });
  const emailStatus = trpc.procurement.setup.emailStatus.useQuery(undefined, { retry: false });
  const saveEmailSettings = trpc.procurement.setup.saveEmailSettings.useMutation({
    onSuccess: () => {
      toast.success("Outbound email configuration saved.");
      void utils.procurement.setup.emailStatus.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  const sendTestEmail = trpc.procurement.setup.sendTestEmail.useMutation();
  const [testEmailAddress, setTestEmailAddress] = useState("");
  const [resendApiKey, setResendApiKey] = useState("");
  const [smtpHost, setSmtpHost] = useState("smtp.gmail.com");
  const [smtpPort, setSmtpPort] = useState(465);
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [smtpFrom, setSmtpFrom] = useState("");
  const [emailProviderTab, setEmailProviderTab] = useState<"resend" | "smtp">("smtp");
  const [officeCode, setOfficeCode] = useState("");
  const [officeName, setOfficeName] = useState("");
  const [objectCode, setObjectCode] = useState("");
  const [objectName, setObjectName] = useState("");
  const [budgetOffice, setBudgetOffice] = useState("");
  const [budgetObject, setBudgetObject] = useState("");
  const [budgetAmount, setBudgetAmount] = useState("");
  const [entityName, setEntityName] = useState("Batanes State College");
  const [authorizedOfficialName, setAuthorizedOfficialName] = useState("");
  const [authorizedOfficialDesignation, setAuthorizedOfficialDesignation] = useState("");
  const [chiefAccountantName, setChiefAccountantName] = useState("");
  const [purchaseRequestSignatoryName, setPurchaseRequestSignatoryName] = useState("");
  const [purchaseRequestSignatoryDesignation, setPurchaseRequestSignatoryDesignation] = useState("");
  const [mayRequestPurchaseRequest, setMayRequestPurchaseRequest] = useState(true);
  const [mayApprovePurchaseRequest, setMayApprovePurchaseRequest] = useState(false);
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    if (!setup.data?.settings) return;
    setEntityName(setup.data.settings.entityName || "Batanes State College");
    setAuthorizedOfficialName(setup.data.settings.authorizedOfficialName || "");
    setAuthorizedOfficialDesignation(setup.data.settings.authorizedOfficialDesignation || "");
    setChiefAccountantName(setup.data.settings.chiefAccountantName || "");
  }, [setup.data?.settings]);

  const adminDisabled = !isAdmin;

  return <div className="mx-auto max-w-[1240px]">
    <PageHeader eyebrow="Administrative controls" title="System setup" description="Complete the configuration controls that make purchase requests, Pre-Canvass packages, official PO metadata, and workflow routing operationally ready." />
    <section className="mt-7 flat-panel overflow-hidden"><div className="border-b border-[#ece8df] px-5 py-4"><p className="text-sm font-semibold text-[#34404e]">Configuration readiness</p><p className="mt-1 text-[11px] text-[#77818d]">Complete every control before asking End-Users to submit procurement packages.</p></div><div className="grid divide-y divide-[#ece8df] sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-5">{setup.data?.readiness.map((item) => <div key={item.key} className="p-4"><div className={item.complete ? "text-emerald-700" : "text-[#a36d18]"}>{item.complete ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}</div><p className="mt-3 text-xs font-semibold text-[#3f4a57]">{item.label}</p><p className="mt-1.5 text-[11px] leading-5 text-[#77818d]">{item.detail}</p></div>)}</div></section>
    <div className="mt-7 grid gap-5 xl:grid-cols-2">
      <FormShell title="Entity and PO signatory defaults" description="These values populate new Purchase Orders. Blank signatory fields remain visible as an incomplete readiness control." icon={<FileSignature className="h-4 w-4" />} onSubmit={(event) => { event.preventDefault(); updateSettings.mutate({ entityName: entityName.trim(), authorizedOfficialName: authorizedOfficialName.trim() || undefined, authorizedOfficialDesignation: authorizedOfficialDesignation.trim() || undefined, chiefAccountantName: chiefAccountantName.trim() || undefined }); }}>
        <div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="sm:col-span-2"><Label htmlFor="entity-name" className="text-[11px] font-semibold">Entity name</Label><Input id="entity-name" value={entityName} onChange={(event) => setEntityName(event.target.value)} className="mt-1.5 h-9 text-xs" /></div><div><Label htmlFor="authorized-official" className="text-[11px] font-semibold">Authorised official</Label><Input id="authorized-official" value={authorizedOfficialName} onChange={(event) => setAuthorizedOfficialName(event.target.value)} placeholder="Full name" className="mt-1.5 h-9 text-xs" /></div><div><Label htmlFor="authorized-designation" className="text-[11px] font-semibold">Designation</Label><Input id="authorized-designation" value={authorizedOfficialDesignation} onChange={(event) => setAuthorizedOfficialDesignation(event.target.value)} placeholder="e.g., College President" className="mt-1.5 h-9 text-xs" /></div><div className="sm:col-span-2"><Label htmlFor="chief-accountant" className="text-[11px] font-semibold">Chief Accountant</Label><Input id="chief-accountant" value={chiefAccountantName} onChange={(event) => setChiefAccountantName(event.target.value)} placeholder="Full name" className="mt-1.5 h-9 text-xs" /></div><Button disabled={adminDisabled || updateSettings.isPending || entityName.trim().length < 3} className="sm:col-span-2 mt-1 h-9 rounded-[4px] bg-[#7b1e1e] text-xs hover:bg-[#641818]">{updateSettings.isPending && <LoaderCircle className="mr-1.5 h-3.5 w-3.5 animate-spin" />}Save defaults</Button></div>
      </FormShell>
      <div className="flat-panel p-5"><Settings2 className="h-4 w-4 text-[#7b1e1e]" /><h2 className="mt-4 text-sm font-semibold text-[#34404e]">Administrator sequence</h2><ol className="mt-4 space-y-3 text-[11px] leading-5 text-[#697482]"><li><span className="mr-2 font-semibold text-[#7b1e1e]">1.</span>Add requesting offices and expenditure objects.</li><li><span className="mr-2 font-semibold text-[#7b1e1e]">2.</span>Register at least three active, legitimate suppliers.</li><li><span className="mr-2 font-semibold text-[#7b1e1e]">3.</span>Record current-year office/object budget allotments.</li><li><span className="mr-2 font-semibold text-[#7b1e1e]">4.</span>Record entity and PO signatory defaults.</li><li><span className="mr-2 font-semibold text-[#7b1e1e]">5.</span>Assign the official Procurement Officer I/II, Procurement Staff, BAC, HoPE, and Budget Officer roles.</li></ol><p className="mt-5 border-t border-[#ece8df] pt-4 text-[11px] leading-5 text-[#8a6520]">End-Users can plan and prepare the three-file package once reference data is available; assigned Procurement Staff/BAC and official officers handle validation, final canvassing, decisions, release, and monitoring.</p></div>
    </div>
    <div className="mt-7 grid gap-5 xl:grid-cols-3">
      <form onSubmit={(event) => { event.preventDefault(); createOffice.mutate({ code: officeCode.trim(), name: officeName.trim() }); }} className="flat-panel p-5"><Settings2 className="h-4 w-4 text-[#7b1e1e]" /><h2 className="mt-4 text-sm font-semibold text-[#34404e]">Requesting offices</h2><p className="mt-1 text-[11px] leading-5 text-[#72808c]">Each PR is tied to a requesting office.</p><div className="mt-5 grid gap-3"><div><Label htmlFor="office-code" className="text-[11px] font-semibold">Office code</Label><Input id="office-code" value={officeCode} onChange={(event) => setOfficeCode(event.target.value)} placeholder="e.g., BSC-PROC" className="mt-1.5 h-9 text-xs" /></div><div><Label htmlFor="office-name" className="text-[11px] font-semibold">Office name</Label><Input id="office-name" value={officeName} onChange={(event) => setOfficeName(event.target.value)} placeholder="Office name" className="mt-1.5 h-9 text-xs" /></div><Button disabled={adminDisabled || createOffice.isPending || !officeCode.trim() || !officeName.trim()} className="mt-1 h-9 rounded-[4px] bg-[#7b1e1e] text-xs hover:bg-[#641818]">{createOffice.isPending && <LoaderCircle className="mr-1.5 h-3.5 w-3.5 animate-spin" />}Add office</Button></div></form>
      <form onSubmit={(event) => { event.preventDefault(); createObject.mutate({ code: objectCode.trim(), name: objectName.trim() }); }} className="flat-panel p-5"><Settings2 className="h-4 w-4 text-[#7b1e1e]" /><h2 className="mt-4 text-sm font-semibold text-[#34404e]">Objects of expenditure</h2><p className="mt-1 text-[11px] leading-5 text-[#72808c]">Budget authority is controlled at this classification level.</p><div className="mt-5 grid gap-3"><div><Label htmlFor="object-code" className="text-[11px] font-semibold">Object code</Label><Input id="object-code" value={objectCode} onChange={(event) => setObjectCode(event.target.value)} placeholder="e.g., 50203010" className="mt-1.5 h-9 text-xs" /></div><div><Label htmlFor="object-name" className="text-[11px] font-semibold">Object name</Label><Input id="object-name" value={objectName} onChange={(event) => setObjectName(event.target.value)} placeholder="e.g., Office supplies" className="mt-1.5 h-9 text-xs" /></div><Button disabled={adminDisabled || createObject.isPending || !objectCode.trim() || !objectName.trim()} className="mt-1 h-9 rounded-[4px] bg-[#7b1e1e] text-xs hover:bg-[#641818]">{createObject.isPending && <LoaderCircle className="mr-1.5 h-3.5 w-3.5 animate-spin" />}Add expenditure object</Button></div></form>
      <FormShell title="Office budget allotment" description="A PR can proceed only when its selected allotment has available funds." icon={<Settings2 className="h-4 w-4" />} onSubmit={(event) => { event.preventDefault(); createBudget.mutate({ officeId: Number(budgetOffice), objectOfExpenditureId: Number(budgetObject), fiscalYear: currentYear, allottedAmount: Number(budgetAmount) }); }}><div className="mt-5 grid gap-3"><div><Label className="text-[11px] font-semibold">Office</Label><div className="mt-1.5"><OfficeSelect value={budgetOffice} valueMode="id" onChange={setBudgetOffice} customOffices={setup.data?.offices} placeholder="Select office" triggerClassName="h-9 text-xs" /></div></div><div><Label className="text-[11px] font-semibold">Object of expenditure</Label><Select value={budgetObject} onValueChange={setBudgetObject}><SelectTrigger className="mt-1.5 h-9 text-xs"><SelectValue placeholder="Select object" /></SelectTrigger><SelectContent>{setup.data?.objectsOfExpenditure.map((object) => <SelectItem key={object.id} value={String(object.id)}>{object.code} — {object.name}</SelectItem>)}</SelectContent></Select></div><div><Label htmlFor="budget-amount" className="text-[11px] font-semibold">Allotted amount for FY {currentYear}</Label><Input id="budget-amount" type="number" min="0.01" step="0.01" value={budgetAmount} onChange={(event) => setBudgetAmount(event.target.value)} placeholder="0.00" className="mt-1.5 h-9 text-xs" /></div><Button disabled={adminDisabled || createBudget.isPending || !budgetOffice || !budgetObject || Number(budgetAmount) <= 0} className="mt-1 h-9 rounded-[4px] bg-[#7b1e1e] text-xs hover:bg-[#641818]">{createBudget.isPending && <LoaderCircle className="mr-1.5 h-3.5 w-3.5 animate-spin" />}Record allotment</Button></div></FormShell>
    </div>
    <section className="mt-7 flat-panel p-5"><div className="flex items-start gap-3"><FileSignature className="mt-0.5 h-4 w-4 shrink-0 text-[#7b1e1e]" /><div><h2 className="text-sm font-semibold text-[#34404e]">Purchase Request authorized signatories</h2><p className="mt-1 text-[11px] leading-5 text-[#77818d]">Record only authorized names here. These names are the only choices shown in the external Requested by and Approved by selectors; ProcureWise does not fabricate signatories.</p></div></div><form onSubmit={(event) => { event.preventDefault(); createPurchaseRequestSignatory.mutate({ fullName: purchaseRequestSignatoryName.trim(), designation: purchaseRequestSignatoryDesignation.trim(), mayRequest: mayRequestPurchaseRequest, mayApprove: mayApprovePurchaseRequest }); }} className="mt-5 grid gap-3 md:grid-cols-[1fr_1fr_auto]"><div><Label htmlFor="pr-signatory-name" className="text-[11px] font-semibold">Full name</Label><Input id="pr-signatory-name" value={purchaseRequestSignatoryName} onChange={(event) => setPurchaseRequestSignatoryName(event.target.value)} placeholder="Authorized signatory name" className="mt-1.5 h-9 text-xs" /></div><div><Label htmlFor="pr-signatory-designation" className="text-[11px] font-semibold">Designation</Label><Input id="pr-signatory-designation" value={purchaseRequestSignatoryDesignation} onChange={(event) => setPurchaseRequestSignatoryDesignation(event.target.value)} placeholder="Official designation" className="mt-1.5 h-9 text-xs" /></div><div className="grid content-end gap-2 sm:grid-cols-2"><label className="flex h-9 items-center gap-2 rounded-[4px] border border-[#e1ddd5] px-2 text-[11px] text-[#4c5664]"><input type="checkbox" checked={mayRequestPurchaseRequest} onChange={(event) => setMayRequestPurchaseRequest(event.target.checked)} /> May request</label><label className="flex h-9 items-center gap-2 rounded-[4px] border border-[#e1ddd5] px-2 text-[11px] text-[#4c5664]"><input type="checkbox" checked={mayApprovePurchaseRequest} onChange={(event) => setMayApprovePurchaseRequest(event.target.checked)} /> May approve</label></div><Button disabled={adminDisabled || createPurchaseRequestSignatory.isPending || purchaseRequestSignatoryName.trim().length < 3 || purchaseRequestSignatoryDesignation.trim().length < 2 || (!mayRequestPurchaseRequest && !mayApprovePurchaseRequest)} className="md:col-span-3 h-9 rounded-[4px] bg-[#7b1e1e] text-xs hover:bg-[#641818]">{createPurchaseRequestSignatory.isPending && <LoaderCircle className="mr-1.5 h-3.5 w-3.5 animate-spin" />}Add authorized signatory</Button></form><div className="mt-5 overflow-x-auto"><RecordTable className="min-w-[620px]"><RecordTableHeader><tr><th className="px-4 py-3 font-semibold">Name</th><th className="px-4 py-3 font-semibold">Designation</th><th className="px-4 py-3 font-semibold">PR authorization</th></tr></RecordTableHeader><tbody className="divide-y divide-[#efebe4]">{purchaseRequestSignatories.data?.length ? purchaseRequestSignatories.data.map((signatory) => <tr key={signatory.id}><td className="px-4 py-3 font-semibold text-[#3f4a57]">{signatory.fullName}</td><td className="px-4 py-3 text-[#66717e]">{signatory.designation}</td><td className="px-4 py-3 text-[#66717e]">{[signatory.mayRequest ? "Requested by" : null, signatory.mayApprove ? "Approved by" : null].filter(Boolean).join(" · ")}</td></tr>) : <tr><td colSpan={3} className="px-4 py-6 text-center text-xs text-[#77818d]">No authorized Purchase Request signatories have been recorded.</td></tr>}</tbody></RecordTable></div></section>
    <div className="mt-7 flat-panel"><div className="border-b border-[#ece8df] px-5 py-4"><p className="text-sm font-semibold text-[#34404e]">Current configuration</p><p className="mt-1 text-[11px] text-[#77818d]">Only active records are made available to transactional forms.</p></div><RecordTable className="border-0"><RecordTableHeader><tr><th className="px-4 py-3 font-semibold">Requesting offices</th><th className="px-4 py-3 font-semibold">Objects of expenditure</th><th className="px-4 py-3 font-semibold">Supplier registry</th></tr></RecordTableHeader><tbody><tr><td className="px-4 py-4 align-top text-[#596574]">{setup.data?.offices.length ? setup.data.offices.map((office) => <p key={office.id} className="mb-1.5">{office.code} — {office.name}</p>) : "No offices configured."}</td><td className="px-4 py-4 align-top text-[#596574]">{setup.data?.objectsOfExpenditure.length ? setup.data.objectsOfExpenditure.map((object) => <p key={object.id} className="mb-1.5">{object.code} — {object.name}</p>) : "No expenditure objects configured."}</td><td className="px-4 py-4 align-top text-[#596574]">{setup.data?.suppliers.length ? `${setup.data.suppliers.length} active supplier record(s)` : "No suppliers registered."}</td></tr></tbody></RecordTable></div>
    <section className="mt-7 flat-panel p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ece8df] pb-3">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-[#7b1e1e]" />
          <div>
            <h2 className="text-sm font-semibold text-[#34404e]">Personal Gmail &amp; Outbound Email Notifications</h2>
            <p className="mt-0.5 text-[11px] text-[#77818d]">Send real-time updates directly to users&apos; registered Gmail accounts when PRs are returned, advanced, or approved.</p>
          </div>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-[4px] px-2.5 py-1 text-[11px] font-semibold border ${
          emailStatus.data?.isConfigured
            ? "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800"
            : "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800"
        }`}>
          {emailStatus.data?.isConfigured ? `Connected: ${emailStatus.data.provider}` : "Not Configured (Logs only)"}
        </span>
      </div>

      {/* Live test notification dispatcher */}
      <div className="mt-4 rounded-[4px] border border-[#e8dfcf] bg-[#fffcf5] p-4 dark:border-[#3a352c] dark:bg-[#1a1815]">
        <p className="text-xs font-semibold text-[#34404e] dark:text-[#f3ede2]">Test Real-Time Notification Delivery</p>
        <p className="mt-1 text-[11px] text-[#77818d]">Enter your personal Gmail to verify delivery right now:</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Input
            value={testEmailAddress}
            onChange={(e) => setTestEmailAddress(e.target.value)}
            placeholder="e.g. cardonaangelo29@gmail.com"
            className="h-9 flex-1 min-w-[240px] text-xs bg-background"
          />
          <Button
            type="button"
            size="sm"
            onClick={async () => {
              const target = testEmailAddress.trim() || user?.email || "";
              if (!target) return toast.error("Enter a valid recipient email address first.");
              toast.info(`Sending test notification to ${target}...`);
              try {
                const res = await sendTestEmail.mutateAsync({ recipientEmail: target });
                if (res.success) {
                  toast.success(res.message);
                } else {
                  toast.error(res.message);
                }
              } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : "Test email failed.";
                toast.error(msg);
              }
            }}
            disabled={sendTestEmail.isPending}
            className="h-9 rounded-[4px] bg-[#7b1e1e] text-xs text-white hover:bg-[#641818]"
          >
            {sendTestEmail.isPending ? <LoaderCircle className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Send className="mr-1.5 h-3.5 w-3.5" />}
            Send Test Notification Email
          </Button>
        </div>
      </div>

      {/* Admin Email Configuration Form */}
      {isAdmin && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (emailProviderTab === "resend") {
              saveEmailSettings.mutate({ resendApiKey: resendApiKey.trim(), smtpHost: "" });
            } else {
              saveEmailSettings.mutate({
                smtpHost: smtpHost.trim(),
                smtpPort,
                smtpUser: smtpUser.trim(),
                smtpPass: smtpPass.trim(),
                smtpFrom: smtpFrom.trim() || undefined,
                resendApiKey: "",
              });
            }
          }}
          className="mt-5 border-t border-[#ece8df] pt-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <span className="text-xs font-semibold text-[#34404e] dark:text-[#f3ede2]">Configure Outbound Provider</span>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setEmailProviderTab("smtp")}
                className={`px-3 py-1 text-xs rounded-[4px] font-semibold border ${emailProviderTab === "smtp" ? "bg-[#7b1e1e] text-white border-[#7b1e1e]" : "bg-card border-border text-muted-foreground"}`}
              >
                Gmail SMTP / Custom SMTP
              </button>
              <button
                type="button"
                onClick={() => setEmailProviderTab("resend")}
                className={`px-3 py-1 text-xs rounded-[4px] font-semibold border ${emailProviderTab === "resend" ? "bg-[#7b1e1e] text-white border-[#7b1e1e]" : "bg-card border-border text-muted-foreground"}`}
              >
                Resend API
              </button>
            </div>
          </div>

          {emailProviderTab === "smtp" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-[11px] font-semibold">SMTP Host</Label>
                <Input value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} placeholder="smtp.gmail.com" className="h-8 text-xs mt-1" />
              </div>
              <div>
                <Label className="text-[11px] font-semibold">Port (465 SSL or 587)</Label>
                <Input type="number" value={smtpPort} onChange={(e) => setSmtpPort(Number(e.target.value))} placeholder="465" className="h-8 text-xs mt-1" />
              </div>
              <div>
                <Label className="text-[11px] font-semibold">Sender Gmail / Username</Label>
                <Input value={smtpUser} onChange={(e) => setSmtpUser(e.target.value)} placeholder="your.email@gmail.com" className="h-8 text-xs mt-1" />
              </div>
              <div>
                <Label className="text-[11px] font-semibold">Google App Password (16 chars)</Label>
                <Input type="password" value={smtpPass} onChange={(e) => setSmtpPass(e.target.value)} placeholder="e.g. abcd efgh ijkl mnop" className="h-8 text-xs mt-1" />
              </div>
              <div className="sm:col-span-2 rounded bg-muted/40 p-2.5 text-[11px] text-muted-foreground">
                <span className="font-semibold text-foreground">How to use your personal Gmail:</span> In your Google Account &gt; Security &gt; 2-Step Verification &gt; App Passwords, generate a 16-character App Password named &quot;ProcureWise&quot; and paste it above.
              </div>
            </div>
          ) : (
            <div className="grid gap-3">
              <div>
                <Label className="text-[11px] font-semibold">Resend API Key</Label>
                <Input value={resendApiKey} onChange={(e) => setResendApiKey(e.target.value)} placeholder="re_123456789..." className="h-8 text-xs mt-1" />
                <p className="text-[11px] text-muted-foreground mt-1.5">Free 3,000 emails/month from resend.com with instant API key.</p>
              </div>
            </div>
          )}

          <Button
            type="submit"
            disabled={saveEmailSettings.isPending}
            className="mt-4 h-9 w-full rounded-[4px] bg-[#7b1e1e] text-xs font-semibold text-white hover:bg-[#641818]"
          >
            {saveEmailSettings.isPending && <LoaderCircle className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            Save Outbound Email Settings
          </Button>
        </form>
      )}
    </section>
    <div className="mt-7 flat-panel"><div className="border-b border-[#ece8df] px-5 py-4"><p className="text-sm font-semibold text-[#34404e]">User role assignment</p><p className="mt-1 text-[11px] text-[#77818d]">Assign the procurement workflow roles to authenticated accounts.</p></div>{authLoading ? <p className="px-5 py-7 text-center text-xs text-[#77818d]">Confirming administrator access…</p> : !isAdmin ? <p className="px-5 py-7 text-center text-xs text-[#77818d]">Only administrators can view or assign workflow roles.</p> : <RecordTable className="border-0"><RecordTableHeader><tr><th className="px-4 py-3 font-semibold">Account</th><th className="px-4 py-3 font-semibold">Email</th><th className="px-4 py-3 font-semibold">Assigned Office / Unit</th><th className="px-4 py-3 font-semibold">Workflow role</th><th className="px-4 py-3 font-semibold">Last sign-in</th></tr></RecordTableHeader><tbody className="divide-y divide-[#efebe4]">{users.isLoading ? <tr><td colSpan={5} className="px-4 py-7 text-center text-xs text-[#77818d]">Loading users…</td></tr> : users.data?.map((profile) => <tr key={profile.id}><td className="px-4 py-3 font-semibold text-[#3f4a57]">{profile.name || "Unnamed account"}</td><td className="px-4 py-3 text-[#6d7884]">{profile.email || "—"}</td><td className="px-4 py-2 min-w-56"><OfficeSelect value={profile.officeName || ""} valueMode="name" onChange={(val) => updateUserOffice.mutate({ userId: profile.id, officeName: val })} placeholder="Assign department..." triggerClassName="h-8 text-xs" /></td><td className="px-4 py-2"><Select value={profile.role === "user" ? "end_user" : profile.role} onValueChange={(role) => updateUserRole.mutate({ userId: profile.id, role: role as keyof typeof roleLabels })}><SelectTrigger className="h-8 w-44 rounded-[4px] text-xs"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(roleLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></td><td className="px-4 py-3 text-[#6d7884]">{new Date(profile.lastSignedIn).toLocaleDateString("en-PH")}</td></tr>)}</tbody></RecordTable>}</div>
  </div>;
}
