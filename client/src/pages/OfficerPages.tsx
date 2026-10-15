import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, FileCheck, FilePlus2, FileText, LineChart as LineChartIcon, LoaderCircle, Printer, ScrollText, Send, SendHorizontal, Star } from "lucide-react";
import { SupplierEvaluationPreviewModal, type SupplierEvaluationFormData } from "@/components/SupplierEvaluationDocument";
import { OfficeSelect } from "@/components/OfficeSelect";
import { DEFAULT_BSC_BAC_MEMBERS, OfficialBacResolutionCanvas, type BacSignatory } from "@/components/OfficialBacResolutionCanvas";
import { useEffect, useState } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { useLocation } from "wouter";

const statusTone = (status: string) => status === "issued" || status === "sent" || status === "acknowledged" ? "approved" : status === "cancelled" ? "returned" : "draft";
const money = (value: string | number) => `₱${Number(value).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("w-full min-w-0", className)}>
      <Label className="text-[11px] font-semibold text-neutral-800 block truncate mb-1">{label}</Label>
      <div className="w-full min-w-0">{children}</div>
    </div>
  );
}
function SubmitButton({ pending, label }: { pending: boolean; label: string }) { return <Button disabled={pending} className="h-9 rounded-[4px] bg-[#7b1e1e] text-xs hover:bg-[#641818]">{pending && <LoaderCircle className="mr-1.5 h-3.5 w-3.5 animate-spin" />}{label}</Button>; }

export function NoticesPage() {
  const dashboard = trpc.procurement.dashboard.useQuery(undefined, { retry: false }); const setup = trpc.procurement.setup.details.useQuery(undefined, { retry: false }); const notices = trpc.procurement.officer.notices.list.useQuery(undefined, { retry: false }); const utils = trpc.useUtils(); const [, setLocation] = useLocation();
  const [purchaseRequestId, setPurchaseRequestId] = useState(""); const [supplierId, setSupplierId] = useState(""); const [demandDueDate, setDemandDueDate] = useState(""); const [noticeType, setNoticeType] = useState<"award" | "disqualification" | "clarification" | "demand" | "other">("award");
  const create = trpc.procurement.officer.notices.create.useMutation({ onSuccess: () => { toast.success("Letter of Notice saved."); void utils.procurement.officer.notices.list.invalidate(); }, onError: (error) => toast.error(error.message) });
  return <div className="mx-auto max-w-[1240px]"><PageHeader eyebrow="Officer documents" title="Letters of Notice" description="Prepare, issue, and print controlled Letters of Notice linked to a Purchase Request and supplier." /><section className="flat-panel mt-7 p-5"><form onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); create.mutate({ noticeType, purchaseRequestId: purchaseRequestId ? Number(purchaseRequestId) : undefined, supplierId: supplierId ? Number(supplierId) : undefined, subject: String(form.get("subject") || ""), body: String(form.get("body") || ""), demandDueDate: demandDueDate ? new Date(demandDueDate) : undefined, issueNow: form.get("issueNow") === "on" }); }}><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"><Field label="Notice type"><Select value={noticeType} onValueChange={(value) => setNoticeType(value as typeof noticeType)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="award">Notice of Award</SelectItem><SelectItem value="disqualification">Notice of Disqualification</SelectItem><SelectItem value="clarification">Notice of Clarification</SelectItem><SelectItem value="demand">Demand letter / notice of demand</SelectItem><SelectItem value="other">Other official notice</SelectItem></SelectContent></Select></Field><Field label="Purchase Request"><Select value={purchaseRequestId} onValueChange={setPurchaseRequestId}><SelectTrigger><SelectValue placeholder="Optional linked PR" /></SelectTrigger><SelectContent>{(dashboard.data?.purchaseRequests ?? []).map((pr) => <SelectItem key={pr.id} value={String(pr.id)}>{pr.prNumber}</SelectItem>)}</SelectContent></Select></Field><Field label="Supplier"><Select value={supplierId} onValueChange={setSupplierId}><SelectTrigger><SelectValue placeholder="Optional recipient supplier" /></SelectTrigger><SelectContent>{(setup.data?.suppliers ?? []).map((supplier) => <SelectItem key={supplier.id} value={String(supplier.id)}>{supplier.companyName}</SelectItem>)}</SelectContent></Select></Field><Field label="Subject"><Input name="subject" placeholder="Official notice subject" /></Field>{noticeType === "demand" && <Field label="Delivery deadline"><Input type="date" value={demandDueDate} onChange={(event) => setDemandDueDate(event.target.value)} required /><p className="mt-1 text-[10px] leading-4 text-[#806b38]">The system records a reminder three days before this deadline.</p></Field>}<div className="md:col-span-2 xl:col-span-2"><Field label="Notice body"><Textarea name="body" required className="min-h-24 text-xs" placeholder="State the official notice, action, and any applicable instruction." /></Field></div></div><div className="mt-5 flex items-center justify-between"><label className="flex items-center gap-2 text-[11px] text-[#566171]"><input name="issueNow" type="checkbox" className="accent-[#7b1e1e]" />Issue immediately</label><SubmitButton pending={create.isPending} label="Save Letter of Notice" /></div></form></section><section className="flat-panel mt-6 overflow-hidden"><div className="border-b border-[#ece8df] px-5 py-4"><p className="text-sm font-semibold">Notice register</p></div>{notices.data?.length ? <div className="divide-y divide-[#ece8df]">{notices.data.map((notice) => <div key={notice.id} className="flex flex-wrap items-center justify-between gap-4 p-5"><div><p className="text-xs font-semibold text-[#7b1e1e]">{notice.noticeNumber}</p><p className="mt-1 text-sm font-medium text-[#3f4a57]">{notice.subject}</p><p className="mt-1 text-[11px] text-[#77818d]">{notice.noticeType.replaceAll("_", " ")} · {new Date(notice.createdAt).toLocaleDateString("en-PH")}</p></div><div className="flex items-center gap-2"><StatusBadge tone={statusTone(notice.status)}>{notice.status.toUpperCase()}</StatusBadge><Button type="button" size="sm" variant="outline" onClick={() => setLocation(`/print/notice?id=${notice.id}`)} className="h-8 rounded-[4px] text-[11px]"><Printer className="mr-1 h-3.5 w-3.5" />Print</Button></div></div>)}</div> : <p className="p-8 text-center text-[11px] text-[#77818d]">No Letters of Notice have been created.</p>}</section></div>;
}

export function TransmittalsPage() {
  const dashboard = trpc.procurement.dashboard.useQuery(undefined, { retry: false });
  const setup = trpc.procurement.setup.details.useQuery(undefined, { retry: false });
  const transmittals = trpc.procurement.officer.transmittals.list.useQuery(undefined, { retry: false });
  const utils = trpc.useUtils();
  const [, setLocation] = useLocation();

  // Active workspace tab
  const [activeTab, setActiveTab] = useState<"resolution" | "transmittals">(() => {
    if (typeof window !== "undefined") {
      const search = new URLSearchParams(window.location.search);
      if (search.get("tab") === "transmittals") return "transmittals";
    }
    return "resolution";
  });

  // BAC Resolution State
  const [selectedPrId, setSelectedPrId] = useState<string>("");
  const [customPrNumber, setCustomPrNumber] = useState<string>("2026-009");
  const [resolutionNumber, setResolutionNumber] = useState<string>("2601-GAS2-009");
  const [modeOfProcurement, setModeOfProcurement] = useState<string>("Small Value Procurement");
  const [evaluationMode, setEvaluationMode] = useState<"lot_basis" | "per_item">("lot_basis");
  const [approvedBudget, setApprovedBudget] = useState<number>(53600);
  const [purposeOrItems, setPurposeOrItems] = useState<string>(
    "AM snacks (Burger and Canned Juice/Soda), Packed Meals (Pork,Chicken,Veggie,Rice,Dessert,and Drinking Water),and PM Snacks (Special spaghetti and Canned Juice/ Soda)--Snacks and meals for the evaluation and interview of applicants for private sector representative (PSR)."
  );
  const [endUserName, setEndUserName] = useState<string>("MARIE FE E. PABLEO");
  const [remarks, setRemarks] = useState<string>("");
  const [entityName, setEntityName] = useState<string>("Batanes State College");
  const [dateResolved, setDateResolved] = useState<string>(
    new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
  );
  const [docType, setDocType] = useState<"resolution" | "hope_approval" | "both">("resolution");
  const [collegePresidentName, setCollegePresidentName] = useState<string>("DJOVI REGALA DURANTE, DPA");
  const [collegePresidentDesignation, setCollegePresidentDesignation] = useState<string>("SUC President I");
  const [bacMembers, setBacMembers] = useState<BacSignatory[]>(DEFAULT_BSC_BAC_MEMBERS);
  const [isDirectCanvasEdit, setIsDirectCanvasEdit] = useState<boolean>(true);
  const [signatoriesExpanded, setSignatoriesExpanded] = useState<boolean>(false);

  // Query details for linked PR
  const prDetailQuery = trpc.procurement.purchaseRequests.detail.useQuery(
    { purchaseRequestId: Number(selectedPrId) },
    { enabled: Boolean(selectedPrId) && Number(selectedPrId) > 0, retry: false }
  );

  // When PR is selected, auto-populate resolution fields
  useEffect(() => {
    if (prDetailQuery.data?.purchaseRequest) {
      const pr = prDetailQuery.data.purchaseRequest;
      const items = prDetailQuery.data.items ?? [];
      const cleanPrNum = pr.prNumber.replace(/^PR-/, "");
      setCustomPrNumber(pr.prNumber);
      setResolutionNumber(`2601-GAS2-${cleanPrNum}`);
      if (items.length > 0) {
        const itemSum = items.map((i: any) => `${i.description}${i.specification ? ` (${i.specification})` : ""}`).join(", ");
        setPurposeOrItems(`${itemSum} -- ${pr.purpose}`);
        const total = items.reduce((sum: number, i: any) => sum + Number(i.quantity) * Number(i.estimatedUnitCost), 0);
        if (total > 0) setApprovedBudget(total);
      } else {
        setPurposeOrItems(pr.purpose);
        if (pr.totalEstimate) setApprovedBudget(Number(pr.totalEstimate));
      }
      if (pr.requestedSignatoryName) setEndUserName(pr.requestedSignatoryName);
      else if (pr.requesterDesignation) setEndUserName(pr.requesterDesignation);
    }
  }, [prDetailQuery.data]);

  // General Transmittal State
  const [transmittalPrId, setTransmittalPrId] = useState("");
  const [fromOffice, setFromOffice] = useState("Bids and Awards Committee");
  const [toOffice, setToOffice] = useState("Procurement Office");

  // Mutations
  const createTransmittal = trpc.procurement.officer.transmittals.create.useMutation({
    onSuccess: () => {
      toast.success("BAC Transmittal saved.");
      void utils.procurement.officer.transmittals.list.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const endorseMutation = trpc.procurement.officer.transmittals.endorseResolution.useMutation({
    onSuccess: () => {
      toast.success(
        `BAC Resolution No. ${resolutionNumber} successfully endorsed to End-User, BAC Members, and HoPE for signature!`
      );
      void utils.procurement.officer.transmittals.list.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  // Auto-link matching PR if available
  useEffect(() => {
    if (!selectedPrId && dashboard.data?.purchaseRequests && dashboard.data.purchaseRequests.length > 0) {
      const cleanCustom = (customPrNumber || "").trim().replace(/^PR-/, "");
      const match = dashboard.data.purchaseRequests.find(
        (p) =>
          p.prNumber === customPrNumber ||
          p.prNumber.replace(/^PR-/, "") === cleanCustom ||
          p.prNumber.includes(cleanCustom)
      );
      if (match) {
        setSelectedPrId(String(match.id));
      } else if (dashboard.data.purchaseRequests.length === 1) {
        setSelectedPrId(String(dashboard.data.purchaseRequests[0].id));
      }
    }
  }, [dashboard.data?.purchaseRequests, customPrNumber, selectedPrId]);

  const directToPoMutation = trpc.procurement.officer.transmittals.directLetterToPo.useMutation({
    onSuccess: (data) => {
      toast.success(
        `Letter of Approval for BAC Res. No. ${resolutionNumber} directed to PO. Notice of Award generated (${data.noticeNumber}).`,
        {
          action: {
            label: "Serve Notice Now →",
            onClick: () => setLocation("/officer/notices-serving"),
          },
          duration: 9000,
        }
      );
      void utils.procurement.officer.transmittals.list.invalidate();
      void utils.procurement.officer.notices.list.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const handleDirectToPo = () => {
    let prIdToUse = Number(selectedPrId);
    if (!prIdToUse || isNaN(prIdToUse) || prIdToUse <= 0) {
      const cleanCustom = (customPrNumber || "").trim().replace(/^PR-/, "");
      const prs = dashboard.data?.purchaseRequests ?? [];
      const match = prs.find(
        (p) =>
          p.prNumber === customPrNumber ||
          p.prNumber.replace(/^PR-/, "") === cleanCustom ||
          p.prNumber.includes(cleanCustom)
      );
      if (match) {
        prIdToUse = match.id;
        setSelectedPrId(String(match.id));
      } else if (prs.length === 1) {
        prIdToUse = prs[0].id;
        setSelectedPrId(String(prIdToUse));
      }
    }

    if (!prIdToUse || isNaN(prIdToUse) || prIdToUse <= 0) {
      toast.error(
        "Please select a Purchase Request from the 'Auto-fill from Purchase Request' dropdown above so the letter can be directed to the Procurement Officer.",
        {
          description: "A linked Purchase Request record is required to issue the formal Notice of Award / Letter of Approval.",
        }
      );
      return;
    }

    directToPoMutation.mutate({
      purchaseRequestId: prIdToUse,
      resolutionNumber,
      remarks,
    });
  };

  const acknowledge = trpc.procurement.officer.transmittals.acknowledge.useMutation({
    onSuccess: () => {
      toast.success("Transmittal acknowledged.");
      void utils.procurement.officer.transmittals.list.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const handleResetDefaults = () => {
    setResolutionNumber("2601-GAS2-009");
    setCustomPrNumber("2026-009");
    setModeOfProcurement("Small Value Procurement");
    setEvaluationMode("lot_basis");
    setApprovedBudget(53600);
    setPurposeOrItems(
      "AM snacks (Burger and Canned Juice/Soda), Packed Meals (Pork,Chicken,Veggie,Rice,Dessert,and Drinking Water),and PM Snacks (Special spaghetti and Canned Juice/ Soda)--Snacks and meals for the evaluation and interview of applicants for private sector representative (PSR)."
    );
    setEndUserName("MARIE FE E. PABLEO");
    setEntityName(setup.data?.settings?.entityName || "Batanes State College");
    setCollegePresidentName("DJOVI REGALA DURANTE, DPA");
    setCollegePresidentDesignation("SUC President I");
    setBacMembers(DEFAULT_BSC_BAC_MEMBERS);
    setDateResolved(new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }));
    setDocType("resolution");
    toast.info("BAC Resolution reset to official BSC default template.");
  };

  const handlePrintResolution = () => {
    const params = new URLSearchParams({
      prId: selectedPrId || "0",
      prNo: customPrNumber,
      resNo: resolutionNumber,
      mode: modeOfProcurement,
      evalMode: evaluationMode,
      abc: String(approvedBudget),
      purpose: purposeOrItems,
      endUser: endUserName,
      docType: docType,
    });
    setLocation(`/print/bac-resolution?${params.toString()}`);
  };

  const handleEndorse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolutionNumber.trim()) {
      toast.error("Please enter a resolution number.");
      return;
    }
    if (!approvedBudget || approvedBudget <= 0) {
      toast.error("Please enter a valid Approved Budget for the Contract (ABC).");
      return;
    }
    if (!purposeOrItems.trim()) {
      toast.error("Please enter the procurement purpose or item description.");
      return;
    }

    endorseMutation.mutate({
      purchaseRequestId: selectedPrId ? Number(selectedPrId) : undefined,
      resolutionNumber: resolutionNumber.trim(),
      modeOfProcurement: modeOfProcurement.trim(),
      approvedBudget: Number(approvedBudget),
      evaluationMode,
      purposeOrItems: purposeOrItems.trim(),
      endUserName: endUserName.trim() || undefined,
      remarks: remarks.trim() || undefined,
    });
  };

  const handleSignatoryUpdate = (index: number, field: keyof BacSignatory, val: string) => {
    const updated = [...bacMembers];
    updated[index] = { ...updated[index], [field]: val };
    setBacMembers(updated);
  };

  return (
    <div className="mx-auto max-w-[1300px]">
      <PageHeader
        eyebrow="BAC Secretariat & Bids and Awards Committee"
        title="BAC Resolutions & Transmittals"
        description="Statutory preparation of BAC Resolutions containing ABC and Mode of Procurement, with formal endorsement to End-User, BAC Members, and HoPE for signature."
      />

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="mt-6">
        <TabsList className="bg-[#f0ebe1] p-1 border border-[#d8d1c4] rounded-lg">
          <TabsTrigger
            value="resolution"
            className="flex items-center gap-2 data-[state=active]:bg-[#7b1e1e] data-[state=active]:text-white font-medium text-xs px-4 py-2"
          >
            <ScrollText className="h-4 w-4" />
            BAC Resolution (Mode of Procurement & ABC)
          </TabsTrigger>
          <TabsTrigger
            value="transmittals"
            className="flex items-center gap-2 data-[state=active]:bg-[#7b1e1e] data-[state=active]:text-white font-medium text-xs px-4 py-2"
          >
            <SendHorizontal className="h-4 w-4" />
            BAC Transmittals Register ({transmittals.data?.length ?? 0})
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: BAC RESOLUTION */}
        <TabsContent value="resolution" className="mt-4 space-y-6">
          {/* Statutory Mandate Banner */}
          <div className="rounded-lg border border-[#eed9a8] bg-[#fdf9ee] p-4 text-xs text-[#7b5316] flex items-start gap-3 shadow-sm">
            <ScrollText className="h-5 w-5 text-[#9a6d19] shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm text-[#64420e]">
                BAC Secretariat Statutory Mandate (RA 9184 & BSC Procurement Guidelines)
              </p>
              <p className="mt-1 leading-relaxed text-[#7c561a]">
                The BAC Secretariat or designated staff shall prepare the <strong>BAC Resolution</strong> containing the{" "}
                <strong>Approved Budget for the Contract (ABC)</strong> and the recommended{" "}
                <strong>Mode of Procurement</strong> of the request. The resolution is then endorsed to the End-User and BAC Members for signature, and to the Head of the Procuring Entity (HoPE / College President) for approval.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full min-w-0">
            {/* Form Column (5 cols) */}
            <div className="lg:col-span-5 min-w-0 w-full space-y-5">
              <section className="w-full overflow-hidden rounded-xl border border-stone-200 bg-white p-6 shadow-sm min-w-0">
                <div className="flex items-center justify-between border-b border-stone-200 pb-3 mb-4">
                  <div>
                    <h3 className="font-semibold text-sm text-[#202833] flex items-center gap-2">
                      <FileCheck className="h-4 w-4 text-[#7b1e1e]" />
                      Editable Resolution Form
                    </h3>
                    <p className="text-[10px] text-neutral-500 mt-0.5">
                      All fields, recitals, and signatories are editable
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleResetDefaults}
                    className="h-7 text-[11px] text-neutral-600 hover:text-[#7b1e1e]"
                  >
                    Reset Defaults
                  </Button>
                </div>

                <form onSubmit={handleEndorse} className="space-y-4 w-full min-w-0">
                  <Field label="Document to Prepare & Preview">
                    <Select value={docType} onValueChange={(val: any) => setDocType(val)}>
                      <SelectTrigger className="h-9 text-xs w-full min-w-0 box-border truncate overflow-hidden bg-[#fffaf0] border-[#ecdcc0] font-semibold text-[#7b1e1e]">
                        <SelectValue className="truncate" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="resolution">1. BAC Resolution (Recommendation to HoPE)</SelectItem>
                        <SelectItem value="hope_approval">2. Letter of Approval of HoPE (Approval of Resolution)</SelectItem>
                        <SelectItem value="both">Complete Package (Both Documents)</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field label="Auto-fill from Purchase Request (Optional)">
                    <Select value={selectedPrId} onValueChange={setSelectedPrId}>
                      <SelectTrigger className="h-9 text-xs w-full min-w-0 box-border truncate overflow-hidden">
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full min-w-0">
                    <Field label="Resolution Number *">
                      <Input
                        value={resolutionNumber}
                        onChange={(e) => setResolutionNumber(e.target.value)}
                        placeholder="e.g. 2601-GAS2-009"
                        className="h-9 text-xs font-mono font-semibold w-full min-w-0 box-border"
                        required
                      />
                    </Field>

                    <Field label="Purchase Request No. *">
                      <Input
                        value={customPrNumber}
                        onChange={(e) => setCustomPrNumber(e.target.value)}
                        placeholder="e.g. 2026-009"
                        className="h-9 text-xs font-mono w-full min-w-0 box-border"
                        required
                      />
                    </Field>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full min-w-0">
                    <Field label="Mode of Procurement *">
                      <Input
                        value={modeOfProcurement}
                        onChange={(e) => setModeOfProcurement(e.target.value)}
                        placeholder="e.g. Small Value Procurement"
                        className="h-9 text-xs font-semibold w-full min-w-0 box-border"
                        required
                      />
                    </Field>

                    <Field label="Resolution Date">
                      <Input
                        value={dateResolved}
                        onChange={(e) => setDateResolved(e.target.value)}
                        placeholder="e.g. September 29, 2026"
                        className="h-9 text-xs w-full min-w-0 box-border"
                      />
                    </Field>
                  </div>

                  {/* Two-input row: Approved Budget (ABC) and Mode of Evaluation */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full min-w-0">
                    <Field label="Approved Budget (ABC) (₱) *">
                      <Input
                        type="number"
                        step="0.01"
                        min="1"
                        value={approvedBudget}
                        onChange={(e) => setApprovedBudget(Number(e.target.value))}
                        className="h-9 text-xs font-semibold text-[#7b1e1e] w-full min-w-0 box-border"
                        required
                      />
                    </Field>

                    <Field label="Mode of Evaluation">
                      <Select value={evaluationMode} onValueChange={(v) => setEvaluationMode(v as typeof evaluationMode)}>
                        <SelectTrigger className="h-9 text-xs w-full min-w-0 box-border overflow-hidden truncate">
                          <SelectValue className="truncate" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="lot_basis" className="text-xs">
                            Lot Basis (S/LCRQ on total lot)
                          </SelectItem>
                          <SelectItem value="per_item" className="text-xs">
                            Per Item Basis
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>

                  <Field label="Entity / Agency Name">
                    <Input
                      value={entityName}
                      onChange={(e) => setEntityName(e.target.value)}
                      placeholder="e.g. Batanes State College"
                      className="h-9 text-xs w-full min-w-0 box-border"
                    />
                  </Field>

                  <Field label="Particulars / Items & Purpose *">
                    <Textarea
                      value={purposeOrItems}
                      onChange={(e) => setPurposeOrItems(e.target.value)}
                      rows={3}
                      className="text-xs leading-relaxed w-full min-w-0 box-border resize-y"
                      placeholder="Specify goods/services, meals, snacks, or supplies..."
                      required
                    />
                  </Field>

                  <Field label="End-User / Project In-Charge Name">
                    <Input
                      value={endUserName}
                      onChange={(e) => setEndUserName(e.target.value)}
                      placeholder="e.g. MARIE FE E. PABLEO"
                      className="h-9 text-xs w-full min-w-0 box-border"
                    />
                  </Field>

                  <Field label="Endorsement Remarks (Optional)">
                    <Input
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      placeholder="Additional notes for BAC review and signature..."
                      className="h-9 text-xs w-full min-w-0 box-border"
                    />
                  </Field>

                  {/* Collapsible Signatories & Officials Customizer */}
                  <div className="rounded-lg border border-stone-200 bg-[#faf8f5] overflow-hidden w-full min-w-0">
                    <button
                      type="button"
                      onClick={() => setSignatoriesExpanded(!signatoriesExpanded)}
                      className="w-full flex items-center justify-between p-3 text-[11px] font-semibold text-neutral-800 hover:bg-[#f3ede3] transition-colors"
                    >
                      <span className="flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
                        Edit Signatories & Designations ({bacMembers.length + 1} Officials)
                      </span>
                      <span className="text-xs text-neutral-500 font-normal">
                        {signatoriesExpanded ? "Hide ▲" : "Expand ▼"}
                      </span>
                    </button>

                    {signatoriesExpanded && (
                      <div className="p-3 pt-1 border-t border-stone-200 space-y-3 bg-white w-full min-w-0">
                        <p className="text-[10px] text-neutral-500">
                          Edit the official names, ranks, and roles of the BAC Committee and Approving Authority:
                        </p>

                        <div className="space-y-2 w-full min-w-0">
                          <p className="text-[10px] font-bold text-[#7b1e1e] uppercase tracking-wide">
                            BAC Members & Chairperson
                          </p>
                          {bacMembers.map((member, i) => (
                            <div key={i} className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs w-full min-w-0">
                              <Input
                                value={member.name}
                                onChange={(e) => handleSignatoryUpdate(i, "name", e.target.value)}
                                placeholder="Full Name"
                                className="h-8 text-[11px] w-full min-w-0 box-border"
                              />
                              <Input
                                value={member.role}
                                onChange={(e) => handleSignatoryUpdate(i, "role", e.target.value)}
                                placeholder="Role"
                                className="h-8 text-[11px] w-full min-w-0 box-border"
                              />
                            </div>
                          ))}
                        </div>

                        <div className="pt-2 border-t border-neutral-200 space-y-2 w-full min-w-0">
                          <p className="text-[10px] font-bold text-[#7b1e1e] uppercase tracking-wide">
                            Head of the Procuring Entity (HoPE)
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs w-full min-w-0">
                            <Input
                              value={collegePresidentName}
                              onChange={(e) => setCollegePresidentName(e.target.value)}
                              placeholder="President Name"
                              className="h-8 text-[11px] w-full min-w-0 box-border"
                            />
                            <Input
                              value={collegePresidentDesignation}
                              onChange={(e) => setCollegePresidentDesignation(e.target.value)}
                              placeholder="Designation"
                              className="h-8 text-[11px] w-full min-w-0 box-border"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Bottom Action Buttons: wrapped inside standard container at bottom of form */}
                  <div className="mt-6 pt-4 border-t border-stone-200 flex flex-wrap items-center justify-end gap-3 w-full min-w-0">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handlePrintResolution}
                      className="w-full sm:w-auto h-9 text-xs border-[#7b1e1e] text-[#7b1e1e] hover:bg-[#7b1e1e]/5 px-3 py-2 flex items-center justify-center gap-1.5"
                    >
                      <Printer className="h-3.5 w-3.5 shrink-0" />
                      <span>Print Official Resolution</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={directToPoMutation.isPending}
                      onClick={handleDirectToPo}
                      className="w-full sm:w-auto h-9 text-xs border-emerald-700 text-emerald-800 hover:bg-emerald-50 px-3.5 py-2 flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
                      title="Direct approved Letter of Approval to Procurement Officer (PO) for serving"
                    >
                      {directToPoMutation.isPending ? (
                        <LoaderCircle className="h-3.5 w-3.5 animate-spin shrink-0" />
                      ) : (
                        <Send className="h-3.5 w-3.5 shrink-0 text-emerald-700" />
                      )}
                      <span>Direct Letter to PO to Serve</span>
                    </Button>
                    <Button
                      type="submit"
                      disabled={endorseMutation.isPending}
                      className="w-full sm:w-auto h-9 text-xs bg-[#7b1e1e] text-white hover:bg-[#641818] px-4 py-2 flex items-center justify-center gap-1.5"
                    >
                      {endorseMutation.isPending ? (
                        <LoaderCircle className="h-3.5 w-3.5 animate-spin shrink-0" />
                      ) : (
                        <Send className="h-3.5 w-3.5 shrink-0" />
                      )}
                      <span>Endorse to End-User, BAC & HoPE</span>
                    </Button>
                  </div>
                </form>
              </section>
            </div>

            {/* Live Canvas Preview Column (7 cols) */}
            <div className="lg:col-span-7 min-w-0 w-full space-y-4">
              <div className="flex items-center justify-between bg-neutral-100 p-2.5 rounded-lg border border-neutral-200">
                <div className="flex items-center gap-2">
                  <ScrollText className="h-4 w-4 text-[#7b1e1e]" />
                  <span className="text-xs font-semibold text-neutral-700">
                    Live Official Document Canvas Preview
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 text-[11px] font-medium text-neutral-600 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isDirectCanvasEdit}
                      onChange={(e) => setIsDirectCanvasEdit(e.target.checked)}
                      className="accent-[#7b1e1e] rounded h-3.5 w-3.5"
                    />
                    Direct Canvas Editing
                  </label>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handlePrintResolution}
                    className="h-7 text-[11px] bg-white text-[#7b1e1e] hover:bg-neutral-50 ml-2"
                  >
                    <Printer className="mr-1 h-3 w-3" />
                    Print / Save PDF
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto max-h-[850px] overflow-y-auto rounded-lg border border-neutral-300 shadow-inner bg-neutral-200/50 p-4">
                <OfficialBacResolutionCanvas
                  documentType={docType}
                  onDocumentTypeChange={setDocType}
                  resolutionNumber={resolutionNumber}
                  prNumber={customPrNumber}
                  purposeOrItems={purposeOrItems}
                  approvedBudget={approvedBudget}
                  modeOfProcurement={modeOfProcurement}
                  evaluationMode={evaluationMode}
                  entityName={entityName}
                  dateResolved={dateResolved}
                  collegePresidentName={collegePresidentName}
                  collegePresidentDesignation={collegePresidentDesignation}
                  bacMembers={bacMembers}
                  endUserName={endUserName}
                  editable={isDirectCanvasEdit}
                  onFieldChange={(field, val) => {
                    if (field === "documentType") setDocType(val);
                    if (field === "resolutionNumber") setResolutionNumber(val);
                    if (field === "prNumber") setCustomPrNumber(val);
                    if (field === "approvedBudget") setApprovedBudget(val);
                    if (field === "purposeOrItems") setPurposeOrItems(val);
                    if (field === "entityName") setEntityName(val);
                    if (field === "collegePresidentName") setCollegePresidentName(val);
                    if (field === "collegePresidentDesignation") setCollegePresidentDesignation(val);
                    if (field === "dateResolved") setDateResolved(val);
                    if (field === "bacMembers") setBacMembers(val);
                  }}
                />
              </div>
            </div>
          </div>

          {/* Endorsement & Transmittal History Register */}
          <section className="flat-panel overflow-hidden mt-6">
            <div className="border-b border-[#ece8df] px-5 py-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">BAC Resolution Endorsement & Transmittal Register</p>
                <p className="text-[11px] text-[#77818d]">
                  Chronological record of official resolutions and transmittals endorsed to End-User, BAC Members, and HoPE.
                </p>
              </div>
              <Badge variant="secondary" className="text-xs">
                {transmittals.data?.length ?? 0} Records
              </Badge>
            </div>
            {transmittals.data?.length ? (
              <div className="divide-y divide-[#ece8df]">
                {transmittals.data.map((item) => {
                  const isResolution = item.transmittalNumber.startsWith("BAC-RES") || item.subject.toLowerCase().includes("resolution");
                  return (
                    <div key={item.id} className="flex flex-wrap items-center justify-between gap-4 p-5 hover:bg-neutral-50/50 transition-colors">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold font-mono text-[#7b1e1e]">{item.transmittalNumber}</p>
                          {isResolution && (
                            <Badge className="bg-[#7b1e1e] text-[10px] py-0 px-1.5 text-white">
                              BAC Resolution
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm font-medium text-[#3f4a57]">{item.subject}</p>
                        <p className="text-[11px] text-[#77818d]">
                          {item.fromOffice} → <strong>{item.toOffice}</strong> · {new Date(item.createdAt).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })}
                        </p>
                        {item.remarks && (
                          <p className="text-[11px] italic text-neutral-600 bg-neutral-50 p-1.5 rounded border border-neutral-200 mt-1 max-w-xl">
                            {item.remarks}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge tone={statusTone(item.status)}>{item.status.toUpperCase()}</StatusBadge>
                        {item.status === "sent" && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const name = window.prompt("Name of acknowledging recipient");
                              if (name) acknowledge.mutate({ transmittalId: item.id, acknowledgedByName: name });
                            }}
                            className="h-8 rounded-[4px] text-[11px]"
                          >
                            <CheckCircle2 className="mr-1 h-3 w-3 text-emerald-600" />
                            Acknowledge
                          </Button>
                        )}
                        {isResolution ? (
                          <>
                            {item.purchaseRequestId && (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={directToPoMutation.isPending}
                                onClick={() => {
                                  const resMatch = item.subject.match(/BAC Resolution No\.\s*([^-\s]+)/i);
                                  const resNum = resMatch ? resMatch[1] : "2601-GAS2-009";
                                  directToPoMutation.mutate({
                                    purchaseRequestId: item.purchaseRequestId!,
                                    resolutionNumber: resNum,
                                    remarks: item.remarks || undefined,
                                  });
                                }}
                                className="h-8 rounded-[4px] text-[11px] border-emerald-700 text-emerald-800 hover:bg-emerald-50"
                                title="Direct approved Letter of Approval to PO to serve"
                              >
                                <Send className="mr-1 h-3.5 w-3.5 text-emerald-700" />
                                Direct to PO
                              </Button>
                            )}
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const resMatch = item.subject.match(/BAC Resolution No\.\s*([^-\s]+)/i);
                                const resNum = resMatch ? resMatch[1] : "2601-GAS2-009";
                                setLocation(`/print/bac-resolution?prId=${item.purchaseRequestId || 0}&resNo=${resNum}`);
                              }}
                              className="h-8 rounded-[4px] text-[11px] border-[#7b1e1e] text-[#7b1e1e]"
                            >
                              <Printer className="mr-1 h-3.5 w-3.5" />
                              Print Resolution
                            </Button>
                          </>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setLocation(`/print/transmittal?id=${item.id}`)}
                            className="h-8 rounded-[4px] text-[11px]"
                          >
                            <Printer className="mr-1 h-3.5 w-3.5" />
                            Print Transmittal
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="p-8 text-center text-[11px] text-[#77818d]">No BAC Resolutions or Transmittals recorded yet.</p>
            )}
          </section>
        </TabsContent>

        {/* TAB 2: GENERAL BAC TRANSMITTALS */}
        <TabsContent value="transmittals" className="mt-4 space-y-6">
          <section className="flat-panel p-5">
            <h3 className="font-semibold text-sm text-[#202833] mb-4">New Document Transmittal</h3>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                createTransmittal.mutate({
                  purchaseRequestId: transmittalPrId ? Number(transmittalPrId) : undefined,
                  fromOffice: fromOffice.trim() || "Bids and Awards Committee",
                  toOffice: toOffice.trim() || "Procurement Office",
                  subject: String(form.get("subject") || ""),
                  remarks: String(form.get("remarks") || "") || undefined,
                  sendNow: form.get("sendNow") === "on",
                });
              }}
            >
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <Field label="Linked Purchase Request">
                  <Select value={transmittalPrId} onValueChange={setTransmittalPrId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Optional linked PR" />
                    </SelectTrigger>
                    <SelectContent>
                      {(dashboard.data?.purchaseRequests ?? []).map((pr) => (
                        <SelectItem key={pr.id} value={String(pr.id)}>
                          {pr.prNumber}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="From Office (Originating)">
                  <OfficeSelect value={fromOffice} valueMode="name" onChange={setFromOffice} placeholder="Search originating office..." />
                </Field>
                <Field label="To Office (Routing / Destination)">
                  <OfficeSelect value={toOffice} valueMode="name" onChange={setToOffice} placeholder="Search destination office..." />
                </Field>
                <Field label="Subject">
                  <Input name="subject" placeholder="Documents transmitted" required />
                </Field>
                <div className="md:col-span-2">
                  <Field label="Remarks">
                    <Textarea name="remarks" className="min-h-20 text-xs" placeholder="List the enclosed procurement documents and routing instructions." />
                  </Field>
                </div>
              </div>
              <div className="mt-5 flex items-center justify-between">
                <label className="flex items-center gap-2 text-[11px] text-[#566171]">
                  <input name="sendNow" type="checkbox" className="accent-[#7b1e1e]" defaultChecked />
                  Mark as sent immediately
                </label>
                <SubmitButton pending={createTransmittal.isPending} label="Save transmittal" />
              </div>
            </form>
          </section>

          <section className="flat-panel overflow-hidden">
            <div className="border-b border-[#ece8df] px-5 py-4">
              <p className="text-sm font-semibold">General Transmittal Register</p>
            </div>
            {transmittals.data?.length ? (
              <div className="divide-y divide-[#ece8df]">
                {transmittals.data.map((item) => (
                  <div key={item.id} className="flex flex-wrap items-center justify-between gap-4 p-5">
                    <div>
                      <p className="text-xs font-semibold text-[#7b1e1e]">{item.transmittalNumber}</p>
                      <p className="mt-1 text-sm font-medium text-[#3f4a57]">
                        {item.fromOffice} → {item.toOffice}
                      </p>
                      <p className="mt-1 text-[11px] text-[#77818d]">{item.subject}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge tone={statusTone(item.status)}>{item.status.toUpperCase()}</StatusBadge>
                      {item.status === "sent" && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const name = window.prompt("Name of acknowledging recipient");
                            if (name) acknowledge.mutate({ transmittalId: item.id, acknowledgedByName: name });
                          }}
                          className="h-8 rounded-[4px] text-[11px]"
                        >
                          Acknowledge
                        </Button>
                      )}
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setLocation(`/print/transmittal?id=${item.id}`)}
                        className="h-8 rounded-[4px] text-[11px]"
                      >
                        <Printer className="mr-1 h-3.5 w-3.5" />
                        Print
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="p-8 text-center text-[11px] text-[#77818d]">No BAC Transmittals have been created.</p>
            )}
          </section>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export function SupplierEvaluationsPage() {
  const setup = trpc.procurement.setup.details.useQuery(undefined, { retry: false });
  const dashboard = trpc.procurement.dashboard.useQuery(undefined, { retry: false });
  const evaluations = trpc.procurement.officer.supplierEvaluations.list.useQuery(undefined, { retry: false });
  const utils = trpc.useUtils();
  const [, setLocation] = useLocation();
  const [supplierId, setSupplierId] = useState("");
  const [purchaseOrderId, setPurchaseOrderId] = useState("");
  const [editing, setEditing] = useState<({ id: number; supplierId: number; purchaseOrderId: number | null; qualityScore: number; deliveryScore: number; pricingScore: number; complianceScore: number; remarks: string | null } & Record<string, any>) | null>(null);

  // Standardized document preview modal
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<SupplierEvaluationFormData | null>(null);

  const refresh = () => void utils.procurement.officer.supplierEvaluations.list.invalidate();
  const create = trpc.procurement.officer.supplierEvaluations.create.useMutation({ onSuccess: () => { toast.success("Supplier evaluation saved."); refresh(); }, onError: (error) => toast.error(error.message) });
  const update = trpc.procurement.officer.supplierEvaluations.update.useMutation({ onSuccess: () => { toast.success("Supplier evaluation updated."); setEditing(null); setSupplierId(""); setPurchaseOrderId(""); refresh(); }, onError: (error) => toast.error(error.message) });
  const submit = (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = new FormData(event.currentTarget); const values = { qualityScore: Number(form.get("qualityScore")), deliveryScore: Number(form.get("deliveryScore")), pricingScore: Number(form.get("pricingScore")), complianceScore: Number(form.get("complianceScore")), remarks: String(form.get("remarks") || "") || undefined }; if (editing) return update.mutate({ evaluationId: editing.id, ...values }); if (!supplierId) return toast.error("Select the supplier being evaluated."); create.mutate({ supplierId: Number(supplierId), purchaseOrderId: purchaseOrderId ? Number(purchaseOrderId) : undefined, ...values }); };

  const handleOpenPreview = (evaluation: any) => {
    const supplier = setup.data?.suppliers.find((s) => s.id === evaluation.supplierId);
    const po = dashboard.data?.purchaseOrders.find((p) => p.id === evaluation.purchaseOrderId);
    const pr = po ? dashboard.data?.purchaseRequests.find((r) => r.id === po.purchaseRequestId) : null;
    const responseScores = (evaluation.responseScores as Record<string, number>) || {
      quality_standards: evaluation.qualityScore,
      timely_delivery: evaluation.deliveryScore,
      pricing_transparency: evaluation.pricingScore,
      statutory_compliance: evaluation.complianceScore,
    };
    setPreviewData({
      audience: evaluation.evaluationAudience || "procurement_office",
      supplierName: supplier?.companyName || `Supplier #${evaluation.supplierId}`,
      goodsServicesType: evaluation.goodsServicesType || "Goods / Services",
      purchaseRequestNumber: evaluation.reportedPurchaseRequestNumber || pr?.prNumber || null,
      purchaseOrderNumber: po?.poNumber || "PO-Recorded",
      supplierRegistryReference: evaluation.evaluationAudience === "end_user" ? null : (evaluation.supplierRegistryReference || supplier?.philgepsRegistrationNumber || null),
      supplierRegistryRegisteredAt: evaluation.evaluationAudience === "end_user" ? null : (evaluation.supplierRegistryRegisteredAt || supplier?.philgepsRegistrationDate || null),
      supplierRegistryExpiresAt: evaluation.evaluationAudience === "end_user" ? null : (evaluation.supplierRegistryExpiresAt || supplier?.philgepsExpirationDate || null),
      responseScores,
      remarks: evaluation.remarks,
      respondentName: evaluation.respondentName || "Procurement Officer",
      evaluatedAt: evaluation.evaluatedAt,
      electronicApproval: null,
    });
    setPreviewOpen(true);
  };

  return <div className="mx-auto max-w-[1120px]"><PageHeader eyebrow="Supplier performance" title="Supplier evaluation form" description="Record or update post-award quality, delivery, pricing, and compliance scores for legitimate supplier performance analysis." action={{ label: "Open Official Form", onClick: () => setLocation("/supplier-evaluation-form") }} /><section className="flat-panel mt-7 p-5"><form key={editing?.id ?? "new"} onSubmit={submit}><div className="mb-5 flex items-center justify-between border-b border-[#ece8df] pb-3"><p className="text-sm font-semibold text-[#3f4a57]">{editing ? "Edit evaluation" : "New evaluation"}</p>{editing && <Button type="button" size="sm" variant="outline" onClick={() => { setEditing(null); setSupplierId(""); setPurchaseOrderId(""); }} className="h-8 rounded-[4px] text-[11px]">Cancel edit</Button>}</div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><Field label="Supplier"><Select value={supplierId} onValueChange={setSupplierId} disabled={Boolean(editing)}><SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger><SelectContent>{(setup.data?.suppliers ?? []).map((supplier) => <SelectItem key={supplier.id} value={String(supplier.id)}>{supplier.companyName}</SelectItem>)}</SelectContent></Select></Field><Field label="Related Purchase Order"><Select value={purchaseOrderId} onValueChange={setPurchaseOrderId} disabled={Boolean(editing)}><SelectTrigger><SelectValue placeholder="Optional PO" /></SelectTrigger><SelectContent>{(dashboard.data?.purchaseOrders ?? []).map((po) => <SelectItem key={po.id} value={String(po.id)}>{po.poNumber}</SelectItem>)}</SelectContent></Select></Field>{["qualityScore", "deliveryScore", "pricingScore", "complianceScore"].map((name) => <Field key={name} label={name.replace("Score", " score").replace(/^./, (value) => value.toUpperCase())}><Input name={name} type="number" min="1" max="5" defaultValue={editing ? editing[name] : "5"} /></Field>)}<div className="sm:col-span-2 lg:col-span-3"><Field label="Evaluation remarks"><Textarea name="remarks" defaultValue={editing?.remarks || ""} className="min-h-20 text-xs" placeholder="Record observed performance, evidence, and any required follow-up." /></Field></div></div><div className="mt-5 flex justify-end"><SubmitButton pending={create.isPending || update.isPending} label={editing ? "Update evaluation" : "Save evaluation"} /></div></form></section><section className="flat-panel mt-6 overflow-hidden"><div className="border-b border-[#ece8df] px-5 py-4"><p className="text-sm font-semibold">Recorded evaluations</p></div>{evaluations.data?.length ? <div className="divide-y divide-[#ece8df]">{evaluations.data.map((evaluation) => <div key={evaluation.id} className="flex flex-wrap items-center justify-between gap-3 p-5"><div><p className="text-sm font-semibold text-[#3f4a57]">{setup.data?.suppliers.find((supplier) => supplier.id === evaluation.supplierId)?.companyName || `Supplier #${evaluation.supplierId}`}</p><p className="mt-1 text-[11px] text-[#77818d]">Quality {evaluation.qualityScore}/5 · Delivery {evaluation.deliveryScore}/5 · Pricing {evaluation.pricingScore}/5 · Compliance {evaluation.complianceScore}/5</p></div><div className="flex items-center gap-2"><Button type="button" size="sm" variant="outline" onClick={() => handleOpenPreview(evaluation)} className="h-8 rounded-[4px] text-[11px]"><FileText className="mr-1 h-3.5 w-3.5 text-[#7b1e1e]" />View Official Form</Button><Button type="button" size="sm" variant="outline" onClick={() => { setEditing(evaluation); setSupplierId(String(evaluation.supplierId)); setPurchaseOrderId(evaluation.purchaseOrderId ? String(evaluation.purchaseOrderId) : ""); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="h-8 rounded-[4px] text-[11px]">Edit</Button><div className="flex items-center gap-1 text-[#9a6d19]"><Star className="h-3.5 w-3.5 fill-current" /><span className="text-xs font-semibold">{((evaluation.qualityScore + evaluation.deliveryScore + evaluation.pricingScore + evaluation.complianceScore) / 4).toFixed(1)}</span></div></div></div>)}</div> : <p className="p-8 text-center text-[11px] text-[#77818d]">No supplier evaluations have been recorded.</p>}</section><SupplierEvaluationPreviewModal open={previewOpen} onOpenChange={setPreviewOpen} evaluationData={previewData} /></div>;
}

export function ForecastPage() {
  const forecast = trpc.procurement.officer.forecast.get.useQuery(undefined, { retry: false }); const utils = trpc.useUtils(); const [supplierId, setSupplierId] = useState(""); const setup = trpc.procurement.setup.details.useQuery(undefined, { retry: false }); const record = trpc.procurement.officer.forecast.recordHistoricalPrice.useMutation({ onSuccess: () => { toast.success("Historical price recorded."); void utils.procurement.officer.forecast.get.invalidate(); }, onError: (error) => toast.error(error.message) });
  return <div className="mx-auto max-w-[1240px]"><PageHeader eyebrow="Decision support" title="Procurement forecasting" description="Forecast estimates are calculated from recorded HistoricalPrice observations only; no sample price history is created by the system." /><section className="flat-panel mt-7 p-5"><form onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); record.mutate({ itemDescription: String(form.get("itemDescription") || ""), unit: String(form.get("unit") || ""), unitPrice: Number(form.get("unitPrice")), supplierId: supplierId ? Number(supplierId) : undefined, observedAt: new Date(`${String(form.get("observedAt"))}T00:00:00`) }); }}><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Field label="Item description"><Input name="itemDescription" placeholder="e.g., Bond paper" /></Field><Field label="Unit"><Input name="unit" placeholder="Ream" /></Field><Field label="Actual unit price"><Input name="unitPrice" type="number" min="0.01" step="0.01" /></Field><Field label="Observed date"><Input name="observedAt" type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></Field><Field label="Supplier"><Select value={supplierId} onValueChange={setSupplierId}><SelectTrigger><SelectValue placeholder="Optional supplier" /></SelectTrigger><SelectContent>{(setup.data?.suppliers ?? []).map((supplier) => <SelectItem key={supplier.id} value={String(supplier.id)}>{supplier.companyName}</SelectItem>)}</SelectContent></Select></Field></div><div className="mt-5 flex justify-end"><SubmitButton pending={record.isPending} label="Record HistoricalPrice" /></div></form></section><div className="mt-6 grid gap-6 lg:grid-cols-2">{forecast.data?.map((item) => <section key={item.itemDescription} className="flat-panel overflow-hidden"><div className="border-b border-[#ece8df] px-5 py-4"><div className="flex items-center justify-between"><div><p className="text-sm font-semibold">{item.itemDescription}</p><p className="mt-1 text-[11px] text-[#77818d]">Average {money(item.averagePrice)} / {item.unit} · Forecast {money(item.forecastPrice)}</p></div><LineChartIcon className="h-4 w-4 text-[#9a6d19]" /></div></div><div className="h-52 p-4"><ResponsiveContainer width="100%" height="100%"><LineChart data={item.points.map((point) => ({ date: new Date(point.observedAt).toLocaleDateString("en-PH", { month: "short", year: "2-digit" }), price: point.unitPrice }))}><XAxis dataKey="date" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} width={44} /><Tooltip formatter={(value) => money(Number(value))} /><Line type="monotone" dataKey="price" stroke="#7b1e1e" strokeWidth={2} dot={{ r: 3 }} /></LineChart></ResponsiveContainer></div><p className="px-5 pb-4 text-[11px] text-[#77818d]">Trend: {item.trendPercent >= 0 ? "+" : ""}{item.trendPercent.toFixed(1)}% across recorded observations.</p></section>)}</div>{!forecast.isLoading && !forecast.data?.length && <section className="flat-panel mt-6 grid min-h-48 place-items-center text-center"><div><LineChartIcon className="mx-auto h-7 w-7 text-[#b0a38d]" /><p className="mt-3 text-sm font-semibold">No HistoricalPrice observations yet</p><p className="mt-1 text-[11px] text-[#77818d]">Record legitimate historical procurement prices to build forecast charts.</p></div></section>}</div>;
}
