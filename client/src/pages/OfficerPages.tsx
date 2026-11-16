import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { Award, CheckCircle2, FileCheck, FilePlus2, FileSpreadsheet, FileText, Filter, Layers, LineChart as LineChartIcon, LoaderCircle, Printer, RefreshCw, ScrollText, Search, Send, SendHorizontal, Star } from "lucide-react";
import { SupplierEvaluationPreviewModal, type SupplierEvaluationFormData } from "@/components/SupplierEvaluationDocument";
import { OfficeSelect } from "@/components/OfficeSelect";
import { DEFAULT_BSC_BAC_MEMBERS, OfficialBacResolutionCanvas, type BacSignatory } from "@/components/OfficialBacResolutionCanvas";
import { OfficialBacAbstractOfQuotations } from "@/components/OfficialBacAbstractOfQuotations";
import { useEffect, useMemo, useState } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";

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

export { NoticesPage } from "./NoticeWorkflowPage";

// ── Statutory Step Quick Navigation Stepper ─────────────────────────────────
export function StatutoryWorkflowNav({ activeStep }: { activeStep: "5.3" | "5.4-5.6" | "5.7" | "5.7.1" | "5.8" | "register" }) {
  const transmittals = trpc.procurement.officer.transmittals.list.useQuery(undefined, { retry: false });
  const transmittalCount = transmittals.data?.length ?? 0;

  return (
    <nav aria-label="Statutory Procurement Procedure" className="mb-6">
      <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-xl bg-stone-100/90 dark:bg-[#131a22] border border-stone-200 dark:border-stone-800">
        <Link href="/officer/transmittals">
          <Button
            type="button"
            variant={activeStep === "5.3" ? "default" : "ghost"}
            size="sm"
            className={cn(
              "h-8 text-xs font-semibold px-3.5 flex items-center gap-2 rounded-lg transition-all",
              activeStep === "5.3"
                ? "bg-[#7b1e1e] text-white hover:bg-[#641818] shadow-sm font-bold"
                : "text-stone-700 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white hover:bg-white dark:hover:bg-[#1e2733]"
            )}
            title="Step 5.3: Prepare Resolution & Endorsement to BAC Members and HoPE for Signature"
          >
            <ScrollText className="h-3.5 w-3.5 shrink-0" />
            <span>Step 5.3: BAC Resolution (Mode & ABC)</span>
          </Button>
        </Link>

        <span className="text-stone-400 dark:text-stone-600 select-none font-bold text-xs">→</span>

        <Link href="/rfq-management">
          <Button
            type="button"
            variant={activeStep === "5.4-5.6" ? "default" : "ghost"}
            size="sm"
            className={cn(
              "h-8 text-xs font-semibold px-3 flex items-center gap-1.5 rounded-lg transition-all",
              activeStep === "5.4-5.6"
                ? "bg-[#7b1e1e] text-white hover:bg-[#641818] shadow-sm font-bold"
                : "text-stone-700 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white hover:bg-white dark:hover:bg-[#1e2733]"
            )}
            title="Step 5.4 Prepare RFQ, 5.5 Distribute & Canvass, 5.6 PhilGEPS Posting"
          >
            <Layers className="h-3.5 w-3.5 shrink-0" />
            <span>Steps 5.4–5.6: RFQ & Canvass</span>
          </Button>
        </Link>

        <span className="text-stone-400 dark:text-stone-600 select-none font-bold text-xs">→</span>

        <Link href="/officer/abstract-of-quotations">
          <Button
            type="button"
            variant={activeStep === "5.7" || activeStep === "5.7.1" ? "default" : "ghost"}
            size="sm"
            className={cn(
              "h-8 text-xs font-semibold px-3.5 flex items-center gap-2 rounded-lg transition-all",
              activeStep === "5.7" || activeStep === "5.7.1"
                ? "bg-[#7b1e1e] text-white hover:bg-[#641818] shadow-sm font-bold"
                : "text-stone-700 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white hover:bg-white dark:hover:bg-[#1e2733]"
            )}
            title="Step 5.7: Forward to BAC for Preparation of Abstract of Quotations (5.7.1 Opening & AOQ)"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 shrink-0" />
            <span>Step 5.7: Forward to BAC & AOQ</span>
          </Button>
        </Link>

        <span className="text-stone-400 dark:text-stone-600 select-none font-bold text-xs">→</span>

        <Link href="/officer/award-resolution">
          <Button
            type="button"
            variant={activeStep === "5.8" ? "default" : "ghost"}
            size="sm"
            className={cn(
              "h-8 text-xs font-semibold px-3.5 flex items-center gap-2 rounded-lg transition-all",
              activeStep === "5.8"
                ? "bg-[#7b1e1e] text-white hover:bg-[#641818] shadow-sm font-bold"
                : "text-stone-700 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white hover:bg-white dark:hover:bg-[#1e2733]"
            )}
            title="Step 5.8: Recommendation on the Award of Contract (S/LCRQ to HoPE)"
          >
            <Award className="h-3.5 w-3.5 shrink-0" />
            <span>Step 5.8: Award of Contract Resolution (S/LCRQ)</span>
          </Button>
        </Link>

        <div className="h-4 w-px bg-stone-300 dark:bg-stone-700 mx-1 hidden sm:block" />

        <Link href="/officer/transmittal-register">
          <Button
            type="button"
            variant={activeStep === "register" ? "default" : "ghost"}
            size="sm"
            className={cn(
              "h-8 text-xs font-medium px-3 flex items-center gap-1.5 rounded-lg transition-all",
              activeStep === "register"
                ? "bg-stone-800 text-white dark:bg-stone-200 dark:text-stone-900 shadow-sm font-semibold"
                : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white hover:bg-white dark:hover:bg-[#1e2733]"
            )}
          >
            <SendHorizontal className="h-3.5 w-3.5 shrink-0" />
            <span>Transmittal Register ({transmittalCount})</span>
          </Button>
        </Link>
      </div>
    </nav>
  );
}

// ── Reusable BAC Resolution Form State Hook ──────────────────────────────────
interface SupplierChoice {
  key: string;
  supplierId?: number;
  supplierName: string;
  quotedPrice?: number;
  deliveryDays?: number;
  isCompliant?: boolean;
  isLowest?: boolean;
  group: "pr_quotes" | "registered";
  label: string;
  badge?: string;
}

function useBacResolutionForm(defaultCategory: "mode_of_procurement" | "award_of_contract") {
  const dashboard = trpc.procurement.dashboard.useQuery(undefined, { retry: false });
  const setup = trpc.procurement.setup.details.useQuery(undefined, { retry: false });
  const utils = trpc.useUtils();
  const [, setLocation] = useLocation();

  const [resolutionCategory] = useState<"mode_of_procurement" | "award_of_contract">(defaultCategory);

  const [selectedPrId, setSelectedPrId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const search = new URLSearchParams(window.location.search);
      return search.get("prId") || "";
    }
    return "";
  });

  const [customPrNumber, setCustomPrNumber] = useState<string>("2026-009");
  const [resolutionNumber, setResolutionNumber] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const search = new URLSearchParams(window.location.search);
      return search.get("resNo") || (defaultCategory === "award_of_contract" ? "BAC-RES-AWARD-2026-009" : "2601-GAS2-009");
    }
    return defaultCategory === "award_of_contract" ? "BAC-RES-AWARD-2026-009" : "2601-GAS2-009";
  });

  const [modeOfProcurement, setModeOfProcurement] = useState<string>("Small Value Procurement");
  const [evaluationMode, setEvaluationMode] = useState<"lot_basis" | "per_item">("lot_basis");
  const [approvedBudget, setApprovedBudget] = useState<number>(53600);
  const [winningSupplierName, setWinningSupplierName] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const search = new URLSearchParams(window.location.search);
      return search.get("winningSupplier") || "";
    }
    return "";
  });

  const [winningQuotationAmount, setWinningQuotationAmount] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const search = new URLSearchParams(window.location.search);
      const val = Number(search.get("awardedAmount"));
      return val > 0 ? val : 0;
    }
    return 0;
  });

  const [savingsAmount, setSavingsAmount] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const search = new URLSearchParams(window.location.search);
      const val = Number(search.get("savings"));
      return val > 0 ? val : 0;
    }
    return 0;
  });

  const [selectedSupplierKey, setSelectedSupplierKey] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const search = new URLSearchParams(window.location.search);
      const supp = search.get("winningSupplier");
      return supp ? "param-" + supp : "";
    }
    return "";
  });
  const [isCustomSupplier, setIsCustomSupplier] = useState<boolean>(false);

  const [rfqNumber, setRfqNumber] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const search = new URLSearchParams(window.location.search);
      return search.get("rfqNo") || "";
    }
    return "";
  });

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

  const activePrId = Number(selectedPrId);
  const activeLinkedRfq = useMemo(() => {
    if (!activePrId) return undefined;
    return (dashboard.data?.rfqs ?? []).find((r) => r.purchaseRequestId === activePrId);
  }, [dashboard.data?.rfqs, activePrId]);

  const activeRfqQuotes = useMemo(() => {
    if (!activeLinkedRfq) return [];
    return (dashboard.data?.supplierQuotations ?? []).filter((q) => q.rfqId === activeLinkedRfq.id);
  }, [dashboard.data?.supplierQuotations, activeLinkedRfq]);

  const activePreCanvass = useMemo(() => {
    if (!activePrId) return undefined;
    return (dashboard.data?.preCanvasses ?? []).find((pc) => pc.purchaseRequestId === activePrId);
  }, [dashboard.data?.preCanvasses, activePrId]);

  const activePreCanvassQuotes = useMemo(() => {
    if (!activePreCanvass) return [];
    return (dashboard.data?.preCanvassQuotes ?? []).filter((pq) => pq.preCanvassId === activePreCanvass.id);
  }, [dashboard.data?.preCanvassQuotes, activePreCanvass]);

  const availableSupplierOptions = useMemo<SupplierChoice[]>(() => {
    const list: SupplierChoice[] = [];
    const suppliers = setup.data?.suppliers ?? [];
    const supplierMap = new Map(suppliers.map((s) => [s.id, s]));

    if (activeRfqQuotes.length > 0) {
      const compliant = activeRfqQuotes.filter((q) => q.isCompliant === 1 || q.isCompliant === (true as any));
      const lowestPrice = compliant.length > 0
        ? Math.min(...compliant.map((q) => Number(q.totalPrice)))
        : null;

      activeRfqQuotes.forEach((q) => {
        const supp = supplierMap.get(q.supplierId);
        const name = supp?.companyName || "Supplier #" + q.supplierId;
        const price = Number(q.totalPrice);
        const isComp = q.isCompliant === 1 || q.isCompliant === (true as any);
        const isLowest = isComp && lowestPrice !== null && price === lowestPrice;

        list.push({
          key: "rfq-quote-" + q.id,
          supplierId: q.supplierId,
          supplierName: name,
          quotedPrice: price,
          deliveryDays: q.deliveryDays ?? undefined,
          isCompliant: isComp,
          isLowest,
          group: "pr_quotes",
          label: name + " — ₱" + price.toLocaleString("en-PH", { minimumFractionDigits: 2 }),
          badge: isLowest
            ? "Single or Lowest Calculated Responsive Quotation (S/LCRQ)"
            : isComp
            ? "Compliant & Responsive Quotation"
            : "Non-compliant Quotation",
        });
      });
    } else if (activePreCanvassQuotes.length > 0) {
      activePreCanvassQuotes.forEach((pq) => {
        const supp = supplierMap.get(pq.supplierId);
        const name = supp?.companyName || "Supplier #" + pq.supplierId;
        const price = Number(pq.totalPrice);
        list.push({
          key: "precanvass-quote-" + pq.id,
          supplierId: pq.supplierId,
          supplierName: name,
          quotedPrice: price,
          deliveryDays: pq.deliveryDays ?? undefined,
          isCompliant: Boolean(pq.isCompliant),
          group: "pr_quotes",
          label: name + " — ₱" + price.toLocaleString("en-PH", { minimumFractionDigits: 2 }) + " (Canvass Quote)",
          badge: "Canvass Quote",
        });
      });
    }

    suppliers.forEach((s) => {
      const alreadyListed = list.some((item) => item.supplierId === s.id);
      if (!alreadyListed) {
        list.push({
          key: "reg-supp-" + s.id,
          supplierId: s.id,
          supplierName: s.companyName,
          group: "registered",
          label: s.companyName + (s.supplierCode ? " (" + s.supplierCode + ")" : ""),
        });
      }
    });

    return list;
  }, [activeRfqQuotes, activePreCanvassQuotes, setup.data?.suppliers]);

  const handleSelectSupplierOption = (val: string) => {
    setSelectedSupplierKey(val);
    if (val === "custom") {
      setIsCustomSupplier(true);
      setWinningSupplierName("");
      setWinningQuotationAmount(0);
      setSavingsAmount(0);
      return;
    }
    setIsCustomSupplier(false);
    const choice = availableSupplierOptions.find((c) => c.key === val);
    if (choice) {
      setWinningSupplierName(choice.supplierName);
      if (choice.quotedPrice !== undefined && choice.quotedPrice > 0) {
        setWinningQuotationAmount(choice.quotedPrice);
        const abc = approvedBudget > 0 ? approvedBudget : (prDetailQuery.data?.purchaseRequest?.totalEstimate ? Number(prDetailQuery.data.purchaseRequest.totalEstimate) : 0);
        setSavingsAmount(Math.max(0, abc - choice.quotedPrice));
      } else {
        setWinningQuotationAmount(0);
        setSavingsAmount(0);
      }
    }
  };

  const handlePrSelect = (prIdStr: string) => {
    setSelectedPrId(prIdStr);
    setSelectedSupplierKey("");
    setWinningSupplierName("");
    setWinningQuotationAmount(0);
    setSavingsAmount(0);
    setIsCustomSupplier(false);
  };

  useEffect(() => {
    if (prDetailQuery.data?.purchaseRequest) {
      const pr = prDetailQuery.data.purchaseRequest;
      const items = prDetailQuery.data.items ?? [];
      const cleanPrNum = pr.prNumber.replace(/^PR-/, "");
      setCustomPrNumber(pr.prNumber);
      if (defaultCategory === "award_of_contract") {
        setResolutionNumber("BAC-RES-AWARD-2026-" + cleanPrNum);
      } else {
        setResolutionNumber("2601-GAS2-" + cleanPrNum);
      }
      if (items.length > 0) {
        const itemSum = items.map((i: any) => i.description + (i.specification ? " (" + i.specification + ")" : "")).join(", ");
        setPurposeOrItems(itemSum + " -- " + pr.purpose);
        const total = items.reduce((sum: number, i: any) => sum + Number(i.quantity) * Number(i.estimatedUnitCost), 0);
        if (total > 0) setApprovedBudget(total);
      } else {
        setPurposeOrItems(pr.purpose);
        if (pr.totalEstimate) setApprovedBudget(Number(pr.totalEstimate));
      }
      if (pr.requestedSignatoryName) setEndUserName(pr.requestedSignatoryName);
      else if (pr.requesterDesignation) setEndUserName(pr.requesterDesignation);

      const linkedRfq = (dashboard.data?.rfqs ?? []).find((r) => r.purchaseRequestId === pr.id);
      if (linkedRfq) {
        setRfqNumber(linkedRfq.rfqNumber);
      }
    }
  }, [prDetailQuery.data, dashboard.data?.rfqs, defaultCategory]);

  const endorseMutation = trpc.procurement.officer.transmittals.endorseResolution.useMutation({
    onSuccess: () => {
      toast.success(
        "BAC Resolution No. " + resolutionNumber + " successfully endorsed to End-User, BAC Members, and HoPE for signature!"
      );
      void utils.procurement.officer.transmittals.list.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const directToPoMutation = trpc.procurement.officer.transmittals.directLetterToPo.useMutation({
    onSuccess: (res: any) => {
      toast.success(
        "Letter of Approval for Resolution " + resolutionNumber + " directed to Procurement Officer (PO) to serve!"
      );
      void utils.procurement.officer.transmittals.list.invalidate();
      if (res?.trackingUrl) {
        setLocation(res.trackingUrl);
      }
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleDirectToPo = () => {
    if (!selectedPrId || Number(selectedPrId) <= 0) {
      toast.error("Please select a Purchase Request before directing to PO.");
      return;
    }
    directToPoMutation.mutate({
      purchaseRequestId: Number(selectedPrId),
      resolutionNumber: resolutionNumber.trim(),
      remarks: remarks.trim() || undefined,
    });
  };

  const handleResetDefaults = () => {
    setResolutionNumber(defaultCategory === "award_of_contract" ? "BAC-RES-AWARD-2026-009" : "2601-GAS2-009");
    setCustomPrNumber("2026-009");
    setModeOfProcurement("Small Value Procurement");
    setEvaluationMode("lot_basis");
    setApprovedBudget(53600);
    setWinningSupplierName("");
    setWinningQuotationAmount(0);
    setSavingsAmount(0);
    setSelectedSupplierKey("");
    setIsCustomSupplier(false);
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

  const handlePrintResolution = (catOverride?: "mode_of_procurement" | "award_of_contract") => {
    const cat = catOverride || resolutionCategory;
    const params = new URLSearchParams({
      category: cat,
      prId: selectedPrId || "0",
      prNo: customPrNumber,
      resNo: resolutionNumber,
      mode: modeOfProcurement,
      evalMode: evaluationMode,
      abc: String(approvedBudget),
      purpose: purposeOrItems,
      endUser: endUserName,
      docType: docType,
      winningSupplier: cat === "award_of_contract" ? winningSupplierName : "",
      awardedAmount: cat === "award_of_contract" ? String(winningQuotationAmount) : "0",
      savings: cat === "award_of_contract" ? String(savingsAmount) : "0",
      rfqNo: rfqNumber,
    });
    setLocation("/print/bac-resolution?" + params.toString());
  };

  const handleEndorse = (e: React.FormEvent, catOverride?: "mode_of_procurement" | "award_of_contract") => {
    e.preventDefault();
    const effectiveCategory = catOverride || resolutionCategory;
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

    if (effectiveCategory === "award_of_contract") {
      if (!winningSupplierName.trim()) {
        toast.error("Please choose a winning supplier from the supplier options above for Step 5.8 Award of Contract.");
        return;
      }
      if (!winningQuotationAmount || winningQuotationAmount <= 0) {
        toast.error("Please specify a valid offered contract price for the winning supplier.");
        return;
      }
      if (approvedBudget > 0 && winningQuotationAmount > approvedBudget) {
        toast.error("The offered contract price cannot exceed the Approved Budget for the Contract (ABC).");
        return;
      }
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
      resolutionType: effectiveCategory,
      winningSupplierName: effectiveCategory === "award_of_contract" ? winningSupplierName : undefined,
      awardedAmount: effectiveCategory === "award_of_contract" ? winningQuotationAmount : undefined,
    });
  };

  const handleSignatoryUpdate = (index: number, field: keyof BacSignatory, val: string) => {
    const updated = [...bacMembers];
    updated[index] = { ...updated[index], [field]: val };
    setBacMembers(updated);
  };

  const handleCanvasFieldChange = (field: string, val: any) => {
    if (field === "documentType") setDocType(val);
    if (field === "resolutionNumber") setResolutionNumber(val);
    if (field === "prNumber") setCustomPrNumber(val);
    if (field === "approvedBudget") setApprovedBudget(val);
    if (field === "purposeOrItems") setPurposeOrItems(val);
    if (field === "winningSupplierName") setWinningSupplierName(val);
    if (field === "winningQuotationAmount") setWinningQuotationAmount(Number(val));
    if (field === "entityName") setEntityName(val);
    if (field === "collegePresidentName") setCollegePresidentName(val);
    if (field === "collegePresidentDesignation") setCollegePresidentDesignation(val);
    if (field === "dateResolved") setDateResolved(val);
    if (field === "bacMembers") setBacMembers(val);
  };

  const renderSignatoriesEditor = () => (
    <div className="rounded-lg border border-stone-200 dark:border-stone-700 bg-[#faf8f5] dark:bg-[#19232c] overflow-hidden w-full min-w-0">
      <button
        type="button"
        onClick={() => setSignatoriesExpanded(!signatoriesExpanded)}
        className="w-full flex items-center justify-between p-3 text-[11px] font-semibold text-neutral-800 dark:text-stone-200 hover:bg-[#f3ede3] dark:hover:bg-[#202c38] transition-colors"
      >
        <span className="flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
          Edit Signatories & Approving Authority
        </span>
        <span className="text-[10px] text-neutral-500 font-normal">
          {signatoriesExpanded ? "▲ Collapse" : "▼ Expand (6 Members + President)"}
        </span>
      </button>

      {signatoriesExpanded && (
        <div className="p-3 border-t border-stone-200 dark:border-stone-700 space-y-3">
          <p className="text-[10px] text-neutral-500 leading-tight">
            Official Batanes State College Bids and Awards Committee and Approving Authority:
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

          <div className="pt-2 border-t border-neutral-200 dark:border-neutral-700 space-y-2 w-full min-w-0">
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
  );

  return {
    dashboard,
    setup,
    utils,
    resolutionCategory,
    selectedPrId,
    setSelectedPrId,
    customPrNumber,
    setCustomPrNumber,
    resolutionNumber,
    setResolutionNumber,
    modeOfProcurement,
    setModeOfProcurement,
    evaluationMode,
    setEvaluationMode,
    approvedBudget,
    setApprovedBudget,
    purposeOrItems,
    setPurposeOrItems,
    endUserName,
    setEndUserName,
    remarks,
    setRemarks,
    entityName,
    setEntityName,
    dateResolved,
    setDateResolved,
    docType,
    setDocType,
    collegePresidentName,
    collegePresidentDesignation,
    bacMembers,
    isDirectCanvasEdit,
    setIsDirectCanvasEdit,
    signatoriesExpanded,
    setSignatoriesExpanded,
    winningSupplierName,
    setWinningSupplierName,
    winningQuotationAmount,
    setWinningQuotationAmount,
    savingsAmount,
    setSavingsAmount,
    selectedSupplierKey,
    setSelectedSupplierKey,
    isCustomSupplier,
    setIsCustomSupplier,
    rfqNumber,
    activeRfqQuotes,
    availableSupplierOptions,
    handleSelectSupplierOption,
    handlePrSelect,
    endorseMutation,
    directToPoMutation,
    handleDirectToPo,
    handleResetDefaults,
    handlePrintResolution,
    handleEndorse,
    handleCanvasFieldChange,
    renderSignatoriesEditor,
  };
}

// ── WINDOW 1: Step 5.3 Mode of Procurement Resolution & Endorsement ─────────
export function TransmittalsPage() {
  const [, setLocation] = useLocation();
  const formState = useBacResolutionForm("mode_of_procurement");

  // Backward compatibility redirect for legacy tab query parameters
  useEffect(() => {
    if (typeof window !== "undefined") {
      const search = new URLSearchParams(window.location.search);
      const tabParam = search.get("tab");
      const categoryParam = search.get("category");
      if (tabParam === "award_resolution" || tabParam === "award" || categoryParam === "award_of_contract") {
        setLocation("/officer/award-resolution?" + search.toString());
      } else if (tabParam === "aoq") {
        setLocation("/officer/abstract-of-quotations?" + search.toString());
      } else if (tabParam === "transmittals") {
        setLocation("/officer/transmittal-register?" + search.toString());
      }
    }
  }, [setLocation]);

  return (
    <div className="mx-auto max-w-[1300px]">
      <PageHeader
        eyebrow="BAC Secretariat & Bids and Awards Committee — BSC-PRO-QP-95-1 §5.3"
        title="Step 5.3: Prepare Resolution & Endorsement to BAC Members and HoPE for Signature"
        description="Pursuant to Section 5.3.1, the BAC Secretariat or designated staff shall prepare the Resolution where it contains the ABC and mode of procurement of the request. The resolution shall then be endorsed to the end-user, BAC Members, and HoPE for signature."
        action={{
          label: "Transmittal Register",
          onClick: () => setLocation("/officer/transmittal-register"),
        }}
      />

      <StatutoryWorkflowNav activeStep="5.3" />

      {/* Statutory Mandate Banner */}
      <div className="rounded-lg border border-[#eed9a8] dark:border-[#54431f] bg-[#fdf9ee] dark:bg-[#1f1a10] p-4 text-xs text-[#7b5316] dark:text-[#e4c284] flex items-start gap-3 shadow-sm mb-6">
        <ScrollText className="h-5 w-5 text-[#9a6d19] dark:text-[#f3ba4b] shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-sm text-[#64420e] dark:text-[#f8d88e]">
            Procedure 5.3: Prepare resolution, endorsement to BAC members and HoPE for signature
          </p>
          <p className="mt-1 leading-relaxed text-[#7c561a] dark:text-[#e0cb9e]">
            <strong>Section 5.3.1:</strong> The BAC Secretariat or designated staff shall prepare the <strong>Resolution</strong> where it contains the{" "}
            <strong>Approved Budget for the Contract (ABC)</strong> and the <strong>mode of procurement</strong> of the request.
            The resolution shall then be endorsed to the end-user and BAC Members for signature, and to the Head of the Procuring Entity (HoPE / College President) for approval prior to canvassing.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full min-w-0">
        {/* Form Column (5 cols) */}
        <div className="lg:col-span-5 min-w-0 w-full space-y-5">
          <section className="w-full overflow-hidden rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-[#171e27] p-6 shadow-sm min-w-0">
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3 mb-4">
              <div>
                <h3 className="font-semibold text-sm text-[#202833] dark:text-stone-100 flex items-center gap-2">
                  <ScrollText className="h-4 w-4 text-[#7b1e1e]" />
                  Step 5.3: Prepare Resolution & Endorsement Form
                </h3>
                <p className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                  Section 5.3.1: Preparation of ABC & Mode of Procurement and endorsement to BAC members & HoPE
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={formState.handleResetDefaults}
                className="h-7 text-[11px] text-neutral-600 dark:text-neutral-300 hover:text-[#7b1e1e] dark:hover:text-[#ef9a9a]"
              >
                Reset Defaults
              </Button>
            </div>

            <form onSubmit={(e) => formState.handleEndorse(e, "mode_of_procurement")} className="space-y-4 w-full min-w-0">
              <Field label="Select Purchase Request (PR) to Prepare Resolution For *">
                <Select value={formState.selectedPrId} onValueChange={formState.handlePrSelect}>
                  <SelectTrigger className="h-9 text-xs w-full min-w-0 box-border truncate overflow-hidden bg-white dark:bg-[#151c24] font-medium">
                    <SelectValue placeholder="Choose Purchase Request to load..." className="truncate" />
                  </SelectTrigger>
                  <SelectContent>
                    {(formState.dashboard.data?.purchaseRequests ?? []).map((pr) => (
                      <SelectItem key={pr.id} value={String(pr.id)} className="text-xs">
                        {pr.prNumber} — {pr.purpose?.slice(0, 45)}...
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Document to Prepare & Preview">
                <Select value={formState.docType} onValueChange={(val: any) => formState.setDocType(val)}>
                  <SelectTrigger className="h-9 text-xs w-full min-w-0 box-border truncate overflow-hidden bg-[#fffaf0] dark:bg-[#251d1a] border-[#ecdcc0] dark:border-[#4d2d25] font-semibold text-[#7b1e1e] dark:text-[#fca5a5]">
                    <SelectValue className="truncate" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="resolution">1. BAC Resolution (Recommendation to HoPE)</SelectItem>
                    <SelectItem value="hope_approval">2. Letter of Approval of HoPE (Approval of Resolution)</SelectItem>
                    <SelectItem value="both">Complete Package (Both Documents)</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full min-w-0">
                <Field label="Resolution Number *">
                  <Input
                    value={formState.resolutionNumber}
                    onChange={(e) => formState.setResolutionNumber(e.target.value)}
                    placeholder="e.g. 2601-GAS2-009"
                    className="h-9 text-xs font-mono font-semibold w-full min-w-0 box-border"
                    required
                  />
                </Field>

                <Field label="Purchase Request No. *">
                  <Input
                    value={formState.customPrNumber}
                    onChange={(e) => formState.setCustomPrNumber(e.target.value)}
                    placeholder="e.g. 2026-009"
                    className="h-9 text-xs font-mono w-full min-w-0 box-border"
                    required
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full min-w-0">
                <Field label="Recommended Mode of Procurement *">
                  <Input
                    value={formState.modeOfProcurement}
                    onChange={(e) => formState.setModeOfProcurement(e.target.value)}
                    placeholder="e.g. Small Value Procurement"
                    className="h-9 text-xs font-semibold w-full min-w-0 box-border"
                    required
                  />
                </Field>

                <Field label="Resolution Date">
                  <Input
                    value={formState.dateResolved}
                    onChange={(e) => formState.setDateResolved(e.target.value)}
                    placeholder="e.g. September 29, 2026"
                    className="h-9 text-xs w-full min-w-0 box-border"
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full min-w-0">
                <Field label="Approved Budget (ABC) (₱) *">
                  <Input
                    type="number"
                    step="0.01"
                    min="1"
                    value={formState.approvedBudget}
                    onChange={(e) => formState.setApprovedBudget(Number(e.target.value))}
                    className="h-9 text-xs font-semibold text-[#7b1e1e] w-full min-w-0 box-border"
                    required
                  />
                </Field>

                <Field label="Mode of Evaluation">
                  <Select value={formState.evaluationMode} onValueChange={(val: any) => formState.setEvaluationMode(val)}>
                    <SelectTrigger className="h-9 text-xs w-full min-w-0 box-border truncate overflow-hidden bg-white dark:bg-[#151c24]">
                      <SelectValue className="truncate" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lot_basis">Lot Basis (S/LCRQ on Entire Lot)</SelectItem>
                      <SelectItem value="per_item">Per Item Basis (Line-Item Evaluation)</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full min-w-0">
                <Field label="Entity / Agency Name">
                  <Input
                    value={formState.entityName}
                    onChange={(e) => formState.setEntityName(e.target.value)}
                    className="h-9 text-xs w-full min-w-0 box-border"
                  />
                </Field>

                <Field label="End-User / Requesting Official">
                  <Input
                    value={formState.endUserName}
                    onChange={(e) => formState.setEndUserName(e.target.value)}
                    placeholder="e.g. MARIE FE E. PABLEO"
                    className="h-9 text-xs w-full min-w-0 box-border"
                  />
                </Field>
              </div>

              <Field label="Procurement Purpose / Item Description *">
                <Textarea
                  value={formState.purposeOrItems}
                  onChange={(e) => formState.setPurposeOrItems(e.target.value)}
                  rows={4}
                  className="text-xs leading-relaxed w-full min-w-0 box-border"
                  placeholder="Official purpose or list of items covered by this BAC Resolution..."
                  required
                />
              </Field>

              <Field label="Transmittal Remarks / Notes (Optional)">
                <Input
                  value={formState.remarks}
                  onChange={(e) => formState.setRemarks(e.target.value)}
                  placeholder="e.g. Endorsed for expedited HoPE approval for Q3 activity"
                  className="h-8 text-xs w-full min-w-0 box-border"
                />
              </Field>

              {formState.renderSignatoriesEditor()}

              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-stone-200 dark:border-stone-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={formState.handleDirectToPo}
                  disabled={formState.directToPoMutation.isPending}
                  className="h-9 text-xs text-stone-700 dark:text-stone-300 border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-[#1a222c] px-3 flex items-center justify-center gap-1.5 transition-all"
                  title="Direct approved Letter of Approval to Procurement Officer (PO) for serving"
                >
                  {formState.directToPoMutation.isPending ? (
                    <LoaderCircle className="h-3.5 w-3.5 animate-spin shrink-0" />
                  ) : (
                    <Send className="h-3.5 w-3.5 shrink-0 text-emerald-700" />
                  )}
                  <span>Direct Letter to PO to Serve</span>
                </Button>
                <Button
                  type="submit"
                  disabled={formState.endorseMutation.isPending}
                  className="w-full sm:w-auto h-9 text-xs bg-[#7b1e1e] text-white hover:bg-[#641818] px-4 py-2 flex items-center justify-center gap-1.5"
                >
                  {formState.endorseMutation.isPending ? (
                    <LoaderCircle className="h-3.5 w-3.5 animate-spin shrink-0" />
                  ) : (
                    <Send className="h-3.5 w-3.5 shrink-0" />
                  )}
                  <span>Endorse Step 5.3 Resolution to End-User, BAC Members & HoPE</span>
                </Button>
              </div>
            </form>
          </section>
        </div>

        {/* Live Canvas Preview Column (7 cols) */}
        <div className="lg:col-span-7 min-w-0 w-full space-y-4">
          <div className="flex items-center justify-between bg-neutral-100 dark:bg-[#1a212d] p-2.5 rounded-lg border border-neutral-200 dark:border-[#2f3b4c]">
            <div className="flex items-center gap-2">
              <ScrollText className="h-4 w-4 text-[#7b1e1e]" />
              <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-200">
                Live Official Canvas Preview — Step 5.3: Mode of Procurement Resolution & Endorsement
              </span>
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-[11px] font-medium text-neutral-600 dark:text-neutral-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={formState.isDirectCanvasEdit}
                  onChange={(e) => formState.setIsDirectCanvasEdit(e.target.checked)}
                  className="accent-[#7b1e1e] rounded h-3.5 w-3.5"
                />
                Direct Canvas Editing
              </label>
              <Button
                size="sm"
                variant="outline"
                onClick={() => formState.handlePrintResolution("mode_of_procurement")}
                className="h-7 text-[11px] bg-white dark:bg-[#232c3a] text-[#7b1e1e] dark:text-[#ff9b9b] border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-[#2c3748] ml-2"
              >
                <Printer className="mr-1 h-3 w-3" />
                Print / Save PDF
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[850px] overflow-y-auto rounded-lg border border-neutral-300 dark:border-neutral-700 shadow-inner bg-neutral-200/50 dark:bg-[#10151c] p-4">
            <OfficialBacResolutionCanvas
              resolutionCategory="mode_of_procurement"
              documentType={formState.docType}
              onDocumentTypeChange={formState.setDocType}
              resolutionNumber={formState.resolutionNumber}
              prNumber={formState.customPrNumber}
              rfqNumber={formState.rfqNumber}
              purposeOrItems={formState.purposeOrItems}
              approvedBudget={formState.approvedBudget}
              modeOfProcurement={formState.modeOfProcurement}
              evaluationMode={formState.evaluationMode}
              winningSupplierName=""
              winningQuotationAmount={0}
              savingsAmount={0}
              entityName={formState.entityName}
              dateResolved={formState.dateResolved}
              collegePresidentName={formState.collegePresidentName}
              collegePresidentDesignation={formState.collegePresidentDesignation}
              bacMembers={formState.bacMembers}
              endUserName={formState.endUserName}
              editable={formState.isDirectCanvasEdit}
              onFieldChange={formState.handleCanvasFieldChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── WINDOW 2: Step 5.7 Forward to BAC for Preparation of Abstract of Quotations ──
export function BacAbstractOfQuotationsPage() {
  const dashboard = trpc.procurement.dashboard.useQuery(undefined, { retry: false });
  const utils = trpc.useUtils();
  const [, setLocation] = useLocation();
  const [selectedAoqRfqId, setSelectedAoqRfqId] = useState<number | undefined>(undefined);

  return (
    <div className="mx-auto max-w-[1300px] space-y-6">
      <PageHeader
        eyebrow="BAC Secretariat & Bids and Awards Committee — BSC-PRO-QP-95-1 §5.7"
        title="Step 5.7: Forward to BAC for Preparation of Abstract of Quotations"
        description="Pursuant to Section 5.7.1, after the deadline for submission of quotations, the same shall be forwarded to BAC Chairperson for opening. An Abstract of Quotations/Ratings is prepared setting forth the names of those who responded to the RFQ, their corresponding price quotations."
        action={{
          label: "Proceed to Award Resolution (Step 5.8) →",
          onClick: () => setLocation("/officer/award-resolution"),
        }}
      />

      <StatutoryWorkflowNav activeStep="5.7" />

      {dashboard.data?.rfqs?.length ? (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white dark:bg-[#171e27] border border-stone-200 dark:border-stone-800 rounded-xl shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#7b1e1e]/10 text-[#7b1e1e]">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100">
                  Step 5.7: BAC Opening & Abstract of Quotations Workbench
                </h4>
                <p className="text-[11px] text-stone-500 dark:text-stone-400">
                  Section 5.7.1: After deadline for submission of quotations, the same shall be forwarded to BAC Chairperson for opening and preparation of official Abstract of Quotations / Ratings setting forth supplier bids and compliance.
                </p>
              </div>
            </div>
            {dashboard.data.rfqs.length > 1 && (
              <div className="flex items-center gap-2">
                <Label className="text-[11px] text-stone-600 dark:text-stone-400 whitespace-nowrap">Select RFQ:</Label>
                <Select
                  value={String(selectedAoqRfqId ?? dashboard.data.rfqs[0]?.id ?? "")}
                  onValueChange={(val) => setSelectedAoqRfqId(Number(val))}
                >
                  <SelectTrigger className="h-8 text-xs min-w-[220px]">
                    <SelectValue placeholder="Choose RFQ..." />
                  </SelectTrigger>
                  <SelectContent>
                    {dashboard.data.rfqs.map((r) => {
                      const quotes = (dashboard.data?.supplierQuotations ?? []).filter((q) => q.rfqId === r.id).length;
                      const hasAb = (dashboard.data?.quotationAbstracts ?? []).some((a) => a.rfqId === r.id);
                      return (
                        <SelectItem key={r.id} value={String(r.id)} className="text-xs">
                          {r.rfqNumber} (PR #{r.purchaseRequestId}) — {quotes}/3 Quotes {hasAb ? "• AOQ Ready" : ""}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <OfficialBacAbstractOfQuotations
            rfqId={selectedAoqRfqId ?? dashboard.data.rfqs[0].id}
            onSuccess={() => void utils.procurement.dashboard.invalidate()}
          />
        </div>
      ) : (
        <div className="flat-panel p-8 text-center text-xs text-[#72808c]">
          <FileSpreadsheet className="h-8 w-8 mx-auto text-stone-400 mb-2" />
          <p className="font-semibold text-stone-700 dark:text-stone-300">No active RFQs available</p>
          <p className="mt-1">Create an RFQ from an approved Purchase Request in RFQ Management first.</p>
          <Link href="/rfq-management">
            <Button size="sm" variant="outline" className="mt-4 text-xs border-[#7b1e1e] text-[#7b1e1e]">
              Go to RFQ Management →
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}

// ── WINDOW 3: Step 5.8 Award of Contract Resolution ─────────────────────────
export function BacAwardResolutionPage() {
  const [, setLocation] = useLocation();
  const formState = useBacResolutionForm("award_of_contract");

  return (
    <div className="mx-auto max-w-[1300px]">
      <PageHeader
        eyebrow="BAC Secretariat & Bids and Awards Committee"
        title="Step 5.8: Award of Contract Resolution (S/LCRQ to HoPE)"
        description="Statutory preparation of BAC Resolution recommending the award of contract in favor of the Single or Lowest Calculated and Responsive Quotation (S/LCRQ) to the Head of the Procuring Entity pursuant to RA 9184 §5.8 and RA 12009."
        action={{
          label: "View Step 5.7 Abstract of Quotations (AOQ)",
          onClick: () => setLocation("/officer/abstract-of-quotations"),
        }}
      />

      <StatutoryWorkflowNav activeStep="5.8" />

      {/* Statutory Mandate Banner */}
      <div className="rounded-lg border border-[#eed9a8] dark:border-[#54431f] bg-[#fdf9ee] dark:bg-[#1f1a10] p-4 text-xs text-[#7b5316] dark:text-[#e4c284] flex items-start gap-3 shadow-sm mb-6">
        <Award className="h-5 w-5 text-[#9a6d19] dark:text-[#f3ba4b] shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-sm text-[#64420e] dark:text-[#f8d88e]">
            Procedure 5.8: BAC Statutory Mandate — Recommending Award of Contract to HoPE
          </p>
          <p className="mt-1 leading-relaxed text-[#7c561a] dark:text-[#e0cb9e]">
            <strong>5.8.1:</strong> The BAC recommends to the HoPE the award of contract in favor of the supplier or contractor with the{" "}
            <strong>Single or Lowest Calculated and Responsive Quotation (S/LCRQ)</strong> after opening and evaluating the Abstract of Quotations (AOQ).
            The approved resolution authorizes issuance of the Notice of Award and Purchase Order.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full min-w-0">
        {/* Form Column (5 cols) */}
        <div className="lg:col-span-5 min-w-0 w-full space-y-5">
          <section className="w-full overflow-hidden rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-[#171e27] p-6 shadow-sm min-w-0">
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3 mb-4">
              <div>
                <h3 className="font-semibold text-sm text-[#202833] dark:text-stone-100 flex items-center gap-2">
                  <Award className="h-4 w-4 text-[#7b1e1e]" />
                  Step 5.8: Award of Contract Resolution Form
                </h3>
                <p className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                  Statutory recommendation of S/LCRQ to HoPE based on AOQ results
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={formState.handleResetDefaults}
                className="h-7 text-[11px] text-neutral-600 dark:text-neutral-300 hover:text-[#7b1e1e] dark:hover:text-[#ef9a9a]"
              >
                Reset Defaults
              </Button>
            </div>

            <form onSubmit={(e) => formState.handleEndorse(e, "award_of_contract")} className="space-y-4 w-full min-w-0">
              <Field label="Select Purchase Request (PR) to Prepare Award Resolution For *">
                <Select value={formState.selectedPrId} onValueChange={formState.handlePrSelect}>
                  <SelectTrigger className="h-9 text-xs w-full min-w-0 box-border truncate overflow-hidden bg-white dark:bg-[#151c24] font-medium">
                    <SelectValue placeholder="Choose Purchase Request to load..." className="truncate" />
                  </SelectTrigger>
                  <SelectContent>
                    {(formState.dashboard.data?.purchaseRequests ?? []).map((pr) => (
                      <SelectItem key={pr.id} value={String(pr.id)} className="text-xs">
                        {pr.prNumber} — {pr.purpose?.slice(0, 45)}...
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              {/* Statutory S/LCRQ Winning Supplier Selection */}
              <div className="rounded-lg border border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/60 dark:bg-[#13231c] p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-950 dark:text-emerald-200 flex items-center gap-1.5 uppercase tracking-wide">
                    <Award className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                    Recommended Winning Supplier (S/LCRQ Selection) *
                  </span>
                  {formState.activeRfqQuotes.length > 0 && (
                    <Badge variant="outline" className="text-[10px] bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold">
                      {formState.activeRfqQuotes.length} AOQ Quotes Available
                    </Badge>
                  )}
                </div>

                <Field label="Choose Winning Supplier according to PR / Abstract of Quotations *">
                  <Select
                    value={formState.isCustomSupplier ? "custom" : formState.selectedSupplierKey}
                    onValueChange={formState.handleSelectSupplierOption}
                  >
                    <SelectTrigger className="h-9 text-xs w-full min-w-0 box-border truncate overflow-hidden bg-white dark:bg-[#151c24] font-semibold border-emerald-300 dark:border-emerald-700">
                      <SelectValue placeholder="Select supplier with S/LCRQ quotation..." className="truncate" />
                    </SelectTrigger>
                    <SelectContent className="max-h-80">
                      {formState.availableSupplierOptions.some((o) => o.group === "pr_quotes") && (
                        <SelectGroup>
                          <SelectLabel className="text-[10px] font-bold uppercase text-emerald-800 dark:text-emerald-400 tracking-wider">
                            Quoted Suppliers for Selected PR / RFQ (From Abstract of Quotations)
                          </SelectLabel>
                          {formState.availableSupplierOptions
                            .filter((o) => o.group === "pr_quotes")
                            .map((choice) => (
                              <SelectItem key={choice.key} value={choice.key} className="text-xs py-1.5">
                                <div className="flex flex-col gap-0.5">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-stone-900 dark:text-stone-100">
                                      {choice.supplierName}
                                    </span>
                                    {choice.quotedPrice !== undefined && (
                                      <span className="font-mono text-emerald-700 dark:text-emerald-400 font-bold">
                                        ₱{choice.quotedPrice.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                                      </span>
                                    )}
                                  </div>
                                  {choice.badge && (
                                    <span
                                      className={cn(
                                        "text-[10px] font-medium",
                                        choice.isLowest
                                          ? "text-emerald-700 dark:text-emerald-400 font-bold"
                                          : choice.isCompliant
                                          ? "text-blue-600 dark:text-blue-400"
                                          : "text-amber-600 dark:text-amber-400"
                                      )}
                                    >
                                      ★ {choice.badge}
                                    </span>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                        </SelectGroup>
                      )}

                      <SelectGroup>
                        <SelectLabel className="text-[10px] font-bold uppercase text-stone-500 tracking-wider">
                          All BSC Registered Suppliers
                        </SelectLabel>
                        {formState.availableSupplierOptions
                          .filter((o) => o.group === "registered")
                          .map((choice) => (
                            <SelectItem key={choice.key} value={choice.key} className="text-xs">
                              {choice.label}
                            </SelectItem>
                          ))}
                      </SelectGroup>

                      <SelectGroup>
                        <SelectLabel className="text-[10px] font-bold uppercase text-stone-500 tracking-wider">
                          Custom
                        </SelectLabel>
                        <SelectItem value="custom" className="text-xs font-semibold text-[#7b1e1e]">
                          ✎ Enter Supplier / Contractor Manually...
                        </SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full min-w-0 pt-1">
                  <Field label="Winning Supplier Name *">
                    <Input
                      value={formState.winningSupplierName}
                      onChange={(e) => {
                        formState.setWinningSupplierName(e.target.value);
                        formState.setIsCustomSupplier(true);
                        formState.setSelectedSupplierKey("custom");
                      }}
                      placeholder="e.g. Basco General Merchandise"
                      className="h-9 text-xs font-semibold w-full min-w-0 box-border bg-white dark:bg-[#151c24]"
                      required
                    />
                  </Field>

                  <Field label="Offered Contract Price (₱) *">
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={formState.winningQuotationAmount > 0 ? formState.winningQuotationAmount : ""}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        formState.setWinningQuotationAmount(val);
                        if (formState.approvedBudget > val) formState.setSavingsAmount(formState.approvedBudget - val);
                      }}
                      placeholder="0.00"
                      className="h-9 text-xs font-bold text-emerald-800 dark:text-emerald-300 font-mono w-full min-w-0 box-border bg-white dark:bg-[#151c24]"
                      required
                    />
                  </Field>
                </div>

                {formState.winningQuotationAmount > 0 && formState.approvedBudget > formState.winningQuotationAmount && (
                  <div className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded bg-emerald-100/70 dark:bg-emerald-900/40 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800">
                    <span>Government Savings Generated against ABC:</span>
                    <span className="font-bold font-mono">
                      ₱{(formState.approvedBudget - formState.winningQuotationAmount).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
              </div>

              <Field label="Document to Prepare & Preview">
                <Select value={formState.docType} onValueChange={(val: any) => formState.setDocType(val)}>
                  <SelectTrigger className="h-9 text-xs w-full min-w-0 box-border truncate overflow-hidden bg-[#fffaf0] dark:bg-[#251d1a] border-[#ecdcc0] dark:border-[#4d2d25] font-semibold text-[#7b1e1e] dark:text-[#fca5a5]">
                    <SelectValue className="truncate" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="resolution">1. BAC Resolution (Recommendation to HoPE)</SelectItem>
                    <SelectItem value="hope_approval">2. Letter of Approval of HoPE (Approval of Resolution)</SelectItem>
                    <SelectItem value="both">Complete Package (Both Documents)</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full min-w-0">
                <Field label="Award Resolution Number *">
                  <Input
                    value={formState.resolutionNumber}
                    onChange={(e) => formState.setResolutionNumber(e.target.value)}
                    placeholder="e.g. BAC-RES-AWARD-2026-009"
                    className="h-9 text-xs font-mono font-semibold w-full min-w-0 box-border"
                    required
                  />
                </Field>

                <Field label="Purchase Request No. *">
                  <Input
                    value={formState.customPrNumber}
                    onChange={(e) => formState.setCustomPrNumber(e.target.value)}
                    placeholder="e.g. 2026-009"
                    className="h-9 text-xs font-mono w-full min-w-0 box-border"
                    required
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full min-w-0">
                <Field label="Mode of Procurement *">
                  <Input
                    value={formState.modeOfProcurement}
                    onChange={(e) => formState.setModeOfProcurement(e.target.value)}
                    placeholder="e.g. Small Value Procurement"
                    className="h-9 text-xs font-semibold w-full min-w-0 box-border"
                    required
                  />
                </Field>

                <Field label="Award Date">
                  <Input
                    value={formState.dateResolved}
                    onChange={(e) => formState.setDateResolved(e.target.value)}
                    placeholder="e.g. September 29, 2026"
                    className="h-9 text-xs w-full min-w-0 box-border"
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full min-w-0">
                <Field label="Approved Budget (ABC) (₱) *">
                  <Input
                    type="number"
                    step="0.01"
                    min="1"
                    value={formState.approvedBudget}
                    onChange={(e) => formState.setApprovedBudget(Number(e.target.value))}
                    className="h-9 text-xs font-semibold text-[#7b1e1e] w-full min-w-0 box-border"
                    required
                  />
                </Field>

                <Field label="Mode of Evaluation">
                  <Select value={formState.evaluationMode} onValueChange={(val: any) => formState.setEvaluationMode(val)}>
                    <SelectTrigger className="h-9 text-xs w-full min-w-0 box-border truncate overflow-hidden bg-white dark:bg-[#151c24]">
                      <SelectValue className="truncate" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lot_basis">Lot Basis (S/LCRQ on Entire Lot)</SelectItem>
                      <SelectItem value="per_item">Per Item Basis (Line-Item Evaluation)</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full min-w-0">
                <Field label="Entity / Agency Name">
                  <Input
                    value={formState.entityName}
                    onChange={(e) => formState.setEntityName(e.target.value)}
                    className="h-9 text-xs w-full min-w-0 box-border"
                  />
                </Field>

                <Field label="End-User / Requesting Official">
                  <Input
                    value={formState.endUserName}
                    onChange={(e) => formState.setEndUserName(e.target.value)}
                    placeholder="e.g. MARIE FE E. PABLEO"
                    className="h-9 text-xs w-full min-w-0 box-border"
                  />
                </Field>
              </div>

              <Field label="Procurement Purpose / Item Description *">
                <Textarea
                  value={formState.purposeOrItems}
                  onChange={(e) => formState.setPurposeOrItems(e.target.value)}
                  rows={4}
                  className="text-xs leading-relaxed w-full min-w-0 box-border"
                  placeholder="Official purpose or list of items covered by this BAC Resolution..."
                  required
                />
              </Field>

              <Field label="Transmittal Remarks / Notes (Optional)">
                <Input
                  value={formState.remarks}
                  onChange={(e) => formState.setRemarks(e.target.value)}
                  placeholder="e.g. Endorsed for expedited HoPE approval for Q3 activity"
                  className="h-8 text-xs w-full min-w-0 box-border"
                />
              </Field>

              {formState.renderSignatoriesEditor()}

              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-stone-200 dark:border-stone-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={formState.handleDirectToPo}
                  disabled={formState.directToPoMutation.isPending}
                  className="h-9 text-xs text-stone-700 dark:text-stone-300 border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-[#1a222c] px-3 flex items-center justify-center gap-1.5 transition-all"
                  title="Direct approved Letter of Approval to Procurement Officer (PO) for serving"
                >
                  {formState.directToPoMutation.isPending ? (
                    <LoaderCircle className="h-3.5 w-3.5 animate-spin shrink-0" />
                  ) : (
                    <Send className="h-3.5 w-3.5 shrink-0 text-emerald-700" />
                  )}
                  <span>Direct Letter to PO to Serve</span>
                </Button>
                <Button
                  type="submit"
                  disabled={formState.endorseMutation.isPending}
                  className="w-full sm:w-auto h-9 text-xs bg-[#7b1e1e] text-white hover:bg-[#641818] px-4 py-2 flex items-center justify-center gap-1.5"
                >
                  {formState.endorseMutation.isPending ? (
                    <LoaderCircle className="h-3.5 w-3.5 animate-spin shrink-0" />
                  ) : (
                    <Send className="h-3.5 w-3.5 shrink-0" />
                  )}
                  <span>Endorse Step 5.8 Award Resolution to HoPE</span>
                </Button>
              </div>
            </form>
          </section>
        </div>

        {/* Live Canvas Preview Column (7 cols) */}
        <div className="lg:col-span-7 min-w-0 w-full space-y-4">
          <div className="flex items-center justify-between bg-neutral-100 dark:bg-[#1a212d] p-2.5 rounded-lg border border-neutral-200 dark:border-[#2f3b4c]">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-[#7b1e1e]" />
              <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-200">
                Live Official Canvas Preview — Step 5.8: Award of Contract (S/LCRQ)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-[11px] font-medium text-neutral-600 dark:text-neutral-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={formState.isDirectCanvasEdit}
                  onChange={(e) => formState.setIsDirectCanvasEdit(e.target.checked)}
                  className="accent-[#7b1e1e] rounded h-3.5 w-3.5"
                />
                Direct Canvas Editing
              </label>
              <Button
                size="sm"
                variant="outline"
                onClick={() => formState.handlePrintResolution("award_of_contract")}
                className="h-7 text-[11px] bg-white dark:bg-[#232c3a] text-[#7b1e1e] dark:text-[#ff9b9b] border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-[#2c3748] ml-2"
              >
                <Printer className="mr-1 h-3 w-3" />
                Print / Save PDF
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[850px] overflow-y-auto rounded-lg border border-neutral-300 dark:border-neutral-700 shadow-inner bg-neutral-200/50 dark:bg-[#10151c] p-4">
            <OfficialBacResolutionCanvas
              resolutionCategory="award_of_contract"
              documentType={formState.docType}
              onDocumentTypeChange={formState.setDocType}
              resolutionNumber={formState.resolutionNumber}
              prNumber={formState.customPrNumber}
              rfqNumber={formState.rfqNumber}
              purposeOrItems={formState.purposeOrItems}
              approvedBudget={formState.approvedBudget}
              modeOfProcurement={formState.modeOfProcurement}
              evaluationMode={formState.evaluationMode}
              winningSupplierName={formState.winningSupplierName}
              winningQuotationAmount={formState.winningQuotationAmount}
              savingsAmount={formState.savingsAmount}
              entityName={formState.entityName}
              dateResolved={formState.dateResolved}
              collegePresidentName={formState.collegePresidentName}
              collegePresidentDesignation={formState.collegePresidentDesignation}
              bacMembers={formState.bacMembers}
              endUserName={formState.endUserName}
              editable={formState.isDirectCanvasEdit}
              onFieldChange={formState.handleCanvasFieldChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function TransmittalRegisterPage() {
  const transmittals = trpc.procurement.officer.transmittals.list.useQuery(undefined, { retry: false });
  const utils = trpc.useUtils();
  const [, setLocation] = useLocation();

  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "resolution" | "rfq" | "general">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "sent" | "acknowledged">("all");

  const acknowledge = trpc.procurement.officer.transmittals.acknowledge.useMutation({
    onSuccess: () => {
      toast.success("Transmittal acknowledged.");
      void utils.procurement.officer.transmittals.list.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const directToPoMutation = trpc.procurement.officer.transmittals.directLetterToPo.useMutation({
    onSuccess: (data) => {
      toast.success(
        `Letter of Approval directed to PO. Notice of Award generated (${data.noticeNumber}).`,
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

  const allRecords = transmittals.data ?? [];

  // Summary Metrics
  const metrics = useMemo(() => {
    let resolutions = 0;
    let rfqTransmittals = 0;
    let acknowledged = 0;

    for (const item of allRecords) {
      if (item.transmittalNumber.startsWith("BAC-RES") || item.subject.toLowerCase().includes("resolution")) {
        resolutions++;
      } else if (item.transmittalNumber.startsWith("BAC-T") || item.subject.toLowerCase().includes("rfq")) {
        rfqTransmittals++;
      }
      if (item.status === "acknowledged") acknowledged++;
    }

    return { total: allRecords.length, resolutions, rfqTransmittals, acknowledged };
  }, [allRecords]);

  // Filtered Records
  const filteredRecords = useMemo(() => {
    return allRecords.filter((item) => {
      const isRes = item.transmittalNumber.startsWith("BAC-RES") || item.subject.toLowerCase().includes("resolution");
      const isRfq = item.transmittalNumber.startsWith("BAC-T") || item.subject.toLowerCase().includes("rfq");

      if (typeFilter === "resolution" && !isRes) return false;
      if (typeFilter === "rfq" && !isRfq) return false;
      if (typeFilter === "general" && (isRes || isRfq)) return false;

      if (statusFilter !== "all" && item.status !== statusFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesNo = item.transmittalNumber.toLowerCase().includes(q);
        const matchesSubj = item.subject.toLowerCase().includes(q);
        const matchesFrom = item.fromOffice.toLowerCase().includes(q);
        const matchesTo = item.toOffice.toLowerCase().includes(q);
        const matchesRemarks = item.remarks?.toLowerCase().includes(q);
        const matchesAck = item.acknowledgedByName?.toLowerCase().includes(q);
        if (!matchesNo && !matchesSubj && !matchesFrom && !matchesTo && !matchesRemarks && !matchesAck) {
          return false;
        }
      }

      return true;
    });
  }, [allRecords, typeFilter, statusFilter, searchQuery]);

  return (
    <div className="mx-auto max-w-[1300px] space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          eyebrow="BAC Secretariat & Bids and Awards Committee"
          title="BAC Resolution Endorsement & Transmittal Register"
          description="Chronological record of official resolutions and transmittals endorsed to End-User, BAC Members, and HoPE."
        />
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void utils.procurement.officer.transmittals.list.invalidate()}
            className="h-8 gap-1.5 text-xs text-slate-600 dark:text-slate-300"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => setLocation("/officer/transmittals")}
            className="h-8 gap-1.5 text-xs bg-[#7b1e1e] hover:bg-[#641818] text-white"
          >
            <ScrollText className="h-3.5 w-3.5" />
            Step 3: BAC Resolution
          </Button>
        </div>
      </div>

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Transmittals</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{metrics.total}</p>
        </div>
        <div className="rounded-xl border border-[#eed9a8] bg-[#fdf9ee] p-4 shadow-sm dark:border-[#54431f] dark:bg-[#1f1a10]">
          <p className="text-xs font-medium text-[#7b5316] dark:text-[#e4c284]">Endorsed BAC Resolutions</p>
          <p className="mt-1 text-2xl font-bold text-[#7b1e1e] dark:text-[#f87171]">{metrics.resolutions}</p>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 shadow-sm dark:border-blue-900/40 dark:bg-blue-950/20">
          <p className="text-xs font-medium text-blue-700 dark:text-blue-300">RFQ Transmittals (AOQ)</p>
          <p className="mt-1 text-2xl font-bold text-blue-900 dark:text-blue-200">{metrics.rfqTransmittals}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-sm dark:border-emerald-900/40 dark:bg-emerald-950/20">
          <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">Acknowledged</p>
          <p className="mt-1 text-2xl font-bold text-emerald-900 dark:text-emerald-200">{metrics.acknowledged}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search transmittal #, PR, subject, office, remarks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Category Chips */}
          <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setTypeFilter("all")}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                typeFilter === "all"
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400"
              }`}
            >
              All ({metrics.total})
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter("resolution")}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                typeFilter === "resolution"
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400"
              }`}
            >
              Resolutions ({metrics.resolutions})
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter("rfq")}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                typeFilter === "rfq"
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400"
              }`}
            >
              RFQ Transmittals ({metrics.rfqTransmittals})
            </button>
          </div>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
            <SelectTrigger className="h-9 w-36 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="sent">Sent / Pending</SelectItem>
              <SelectItem value="acknowledged">Acknowledged</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Transmittal Register Table / List */}
      <section className="flat-panel overflow-hidden">
        <div className="border-b border-[#ece8df] px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">BAC Resolution Endorsement & Transmittal Register</p>
            <p className="text-[11px] text-[#77818d]">
              Chronological record of official resolutions and transmittals endorsed to End-User, BAC Members, and HoPE.
            </p>
          </div>
          <Badge variant="secondary" className="text-xs">
            {filteredRecords.length} {filteredRecords.length === 1 ? "Record" : "Records"}
          </Badge>
        </div>

        {filteredRecords.length ? (
          <div className="divide-y divide-[#ece8df]">
            {filteredRecords.map((item) => {
              const isResolution = item.transmittalNumber.startsWith("BAC-RES") || item.subject.toLowerCase().includes("resolution");
              const isRfqTransmittal = item.transmittalNumber.startsWith("BAC-T") || item.subject.toLowerCase().includes("rfq");
              return (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-4 p-5 hover:bg-neutral-50/50 dark:hover:bg-neutral-800/40 transition-colors"
                >
                  <div className="space-y-1 max-w-2xl">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold font-mono text-[#7b1e1e] dark:text-[#f87171]">{item.transmittalNumber}</p>
                      {isResolution ? (
                        <Badge className="bg-[#7b1e1e] text-[10px] py-0 px-1.5 text-white">
                          BAC Resolution
                        </Badge>
                      ) : isRfqTransmittal ? (
                        <Badge className="bg-blue-700 text-[10px] py-0 px-1.5 text-white">
                          RFQ Transmittal to BAC
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                          General Transmittal
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm font-medium text-[#3f4a57] dark:text-slate-200">{item.subject}</p>
                    <p className="text-[11px] text-[#77818d] dark:text-slate-400">
                      {item.fromOffice} → <strong className="text-slate-800 dark:text-slate-200">{item.toOffice}</strong> ·{" "}
                      {new Date(item.createdAt).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })}
                      {item.acknowledgedByName ? ` · Acknowledged by ${item.acknowledgedByName}` : ""}
                    </p>
                    {item.remarks && (
                      <p className="text-[11px] italic text-neutral-600 dark:text-[#cbd5e1] bg-neutral-50 dark:bg-[#141b22] p-2 rounded border border-neutral-200 dark:border-[#2b3744] mt-1.5 max-w-xl">
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
                            className="h-8 rounded-[4px] text-[11px] border-emerald-700 text-emerald-800 hover:bg-emerald-50 dark:border-emerald-600 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
                            title="Direct approved Letter of Approval to PO to serve"
                          >
                            <Send className="mr-1 h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" />
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
                          className="h-8 rounded-[4px] text-[11px] border-[#7b1e1e] text-[#7b1e1e] hover:bg-[#7b1e1e]/5 dark:border-[#f87171] dark:text-[#f87171]"
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
          <div className="p-12 text-center text-slate-500">
            <p className="text-xs">No resolutions or transmittals match the selected filters.</p>
            {(searchQuery || typeFilter !== "all" || statusFilter !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setTypeFilter("all");
                  setStatusFilter("all");
                }}
                className="mt-2 text-xs text-[#7b1e1e]"
              >
                Clear Filters
              </Button>
            )}
          </div>
        )}
      </section>
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
