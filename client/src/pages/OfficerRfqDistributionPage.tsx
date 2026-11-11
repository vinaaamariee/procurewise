import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { normalizeProcurementRole } from "../../../shared/procurementRules";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  Globe,
  LoaderCircle,
  Printer,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UsersRound,
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Link } from "wouter";

function formatMoney(amount: number | string | null | undefined) {
  const numeric = typeof amount === "number" ? amount : Number(amount ?? 0);
  return `₱${numeric.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function OfficerRfqDistributionPage({
  initialTab = "distribution",
}: {
  initialTab?: "distribution" | "philgeps";
} = {}) {
  const { user } = useAuth();
  const role = user ? normalizeProcurementRole(user.role) : "end_user";
  const isOfficerOrAdmin = role === "procurement_officer" || role === "procurement_staff" || role === "admin";

  const [activeTab, setActiveTab] = useState<"distribution" | "philgeps">(initialTab);
  const [searchQuery, setSearchQuery] = useState("");

  // Distribution Update Modal
  const [selectedRfqForDist, setSelectedRfqForDist] = useState<any | null>(null);
  const [distActionType, setDistActionType] = useState<"distributed" | "retrieved">("distributed");
  const [canvasserName, setCanvasserName] = useState("");
  const [distDate, setDistDate] = useState(new Date().toISOString().split("T")[0]);
  const [distRemarks, setDistRemarks] = useState("");

  // BAC Transmittal Modal
  const [selectedRfqForBac, setSelectedRfqForBac] = useState<any | null>(null);
  const [bacOffice, setBacOffice] = useState("Bids and Awards Committee Secretariat");
  const [bacSubject, setBacSubject] = useState("");
  const [bacRemarks, setBacRemarks] = useState("");

  // PhilGEPS Record Modal
  const [selectedPkgForPhilgeps, setSelectedPkgForPhilgeps] = useState<any | null>(null);
  const [philgepsRef, setPhilgepsRef] = useState("");
  const [philgepsPostingDate, setPhilgepsPostingDate] = useState(new Date().toISOString().split("T")[0]);
  const [philgepsClosingDate, setPhilgepsClosingDate] = useState("");
  const [philgepsRemarks, setPhilgepsRemarks] = useState("");

  const utils = trpc.useUtils();

  const rfqDistQuery = trpc.procurement.officer.rfqDistribution.list.useQuery(undefined, {
    retry: false,
    enabled: isOfficerOrAdmin,
  });

  const philgepsQuery = trpc.procurement.officer.philgeps.list.useQuery(undefined, {
    retry: false,
    enabled: isOfficerOrAdmin,
  });

  const updateDistMutation = trpc.procurement.officer.rfqDistribution.update.useMutation({
    onSuccess: () => {
      toast.success(
        distActionType === "distributed"
          ? "Outward RFQ distribution to canvasser/suppliers recorded."
          : "RFQ retrieval and collected quotations logged."
      );
      setSelectedRfqForDist(null);
      void utils.procurement.officer.rfqDistribution.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const transmitBacMutation = trpc.procurement.officer.rfqDistribution.transmitToBac.useMutation({
    onSuccess: (data) => {
      toast.success(`RFQ package formally transmitted to BAC Secretariat (Transmittal: ${data.transmittalNumber}).`);
      setSelectedRfqForBac(null);
      void utils.procurement.officer.rfqDistribution.list.invalidate();
      void utils.procurement.officer.transmittals.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const recordPhilgepsMutation = trpc.procurement.officer.philgeps.record.useMutation({
    onSuccess: () => {
      toast.success("PhilGEPS posting details and reference number documented.");
      setSelectedPkgForPhilgeps(null);
      setPhilgepsRef("");
      setPhilgepsRemarks("");
      void utils.procurement.officer.philgeps.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const distItems = rfqDistQuery.data ?? [];
  const philgepsItems = philgepsQuery.data ?? [];

  // Metrics
  const metrics = useMemo(() => {
    let pendingDist = 0;
    let inCanvass = 0;
    let retrieved = 0;
    let transmitted = 0;

    for (const item of distItems) {
      if (item.distributionStatus === "transmitted_to_bac") transmitted++;
      else if (item.distributionStatus === "retrieved") retrieved++;
      else if (item.distributionStatus === "distributed") inCanvass++;
      else pendingDist++;
    }

    const postedCount = philgepsItems.filter((p) => p.isPosted).length;
    const pendingPhilgeps = philgepsItems.length - postedCount;

    return { pendingDist, inCanvass, retrieved, transmitted, postedCount, pendingPhilgeps };
  }, [distItems, philgepsItems]);

  const handleOpenDistModal = (item: any, type: "distributed" | "retrieved") => {
    setSelectedRfqForDist(item);
    setDistActionType(type);
    setCanvasserName(item.canvasserName || user?.name || "");
    setDistDate(new Date().toISOString().split("T")[0]);
    setDistRemarks("");
  };

  const handleConfirmDistUpdate = () => {
    if (!selectedRfqForDist) return;
    updateDistMutation.mutate({
      rfqId: selectedRfqForDist.rfq.id,
      status: distActionType,
      canvasserName: canvasserName.trim() || undefined,
      distributionDate: distActionType === "distributed" ? new Date(distDate) : undefined,
      retrievalDate: distActionType === "retrieved" ? new Date(distDate) : undefined,
      remarks: distRemarks.trim() || undefined,
    });
  };

  const handleOpenBacModal = (item: any) => {
    setSelectedRfqForBac(item);
    setBacOffice("Bids and Awards Committee Secretariat");
    setBacSubject(`Transmittal of Retrieved RFQ Quotations for ${item.purchaseRequest?.prNumber || item.rfq.rfqNumber}`);
    setBacRemarks("All canvasser/supplier quotation envelopes have been retrieved and are hereby transmitted to the BAC for Abstract of Quotations (AOQ) evaluation.");
  };

  const handleConfirmBacTransmit = () => {
    if (!selectedRfqForBac) return;
    transmitBacMutation.mutate({
      rfqId: selectedRfqForBac.rfq.id,
      toOffice: bacOffice,
      subject: bacSubject,
      remarks: bacRemarks,
    });
  };

  const handleOpenPhilgepsModal = (pkg: any) => {
    setSelectedPkgForPhilgeps(pkg);
    setPhilgepsRef(pkg.philgepsReferenceNumber || "");
    setPhilgepsPostingDate(pkg.postingDate ? new Date(pkg.postingDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]);
    setPhilgepsClosingDate(pkg.closingDate ? new Date(pkg.closingDate).toISOString().split("T")[0] : "");
    setPhilgepsRemarks(pkg.remarks || "");
  };

  const handleConfirmPhilgeps = () => {
    if (!selectedPkgForPhilgeps || !philgepsRef.trim()) {
      toast.error("PhilGEPS Reference Number is required.");
      return;
    }
    recordPhilgepsMutation.mutate({
      purchaseRequestId: selectedPkgForPhilgeps.purchaseRequestId,
      rfqId: selectedPkgForPhilgeps.rfqId,
      philgepsReferenceNumber: philgepsRef.trim(),
      postingDate: new Date(philgepsPostingDate),
      closingDate: philgepsClosingDate ? new Date(philgepsClosingDate) : undefined,
      remarks: philgepsRemarks.trim() || undefined,
    });
  };

  if (!isOfficerOrAdmin) {
    return (
      <div className="mx-auto max-w-4xl py-12 px-4 text-center">
        <ShieldAlert className="mx-auto h-12 w-12 text-rose-500" />
        <h2 className="mt-4 text-xl font-bold text-slate-900 dark:text-white">Access Restricted</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          This workbench is mandated for Procurement Officer and Staff to distribute RFQs, transmit to BAC for AOQ preparation, and document PhilGEPS postings.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#881337]/10 text-[#881337] dark:bg-[#881337]/20 dark:text-rose-300">
                <Send className="h-5 w-5" />
              </span>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                  RFQ Distribution & PhilGEPS
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Manage outward RFQ canvass distribution, retrieve quotations, transmit to BAC, and document PhilGEPS postings.
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void utils.procurement.officer.rfqDistribution.list.invalidate();
                void utils.procurement.officer.philgeps.list.invalidate();
              }}
              className="h-8 gap-1.5 text-xs text-slate-600 dark:text-slate-300"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="mt-5 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setActiveTab("distribution")}
            className={`flex items-center gap-2 pb-2 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === "distribution"
                ? "border-[#881337] text-[#881337] dark:border-rose-400 dark:text-rose-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Send className="h-3.5 w-3.5" />
            RFQ Distribution & Retrieval ({distItems.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("philgeps")}
            className={`flex items-center gap-2 pb-2 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === "philgeps"
                ? "border-[#881337] text-[#881337] dark:border-rose-400 dark:text-rose-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Globe className="h-3.5 w-3.5" />
            PhilGEPS Postings ({philgepsItems.length})
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {activeTab === "distribution" ? (
          <>
            <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Awaiting Distribution</span>
                <span className="rounded-md bg-amber-50 p-1.5 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
                  <Clock className="h-4 w-4" />
                </span>
              </div>
              <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{metrics.pendingDist}</div>
              <p className="mt-1 text-[11px] text-slate-500">Drafted by Staff, ready to dispatch</p>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">In Active Canvass</span>
                <span className="rounded-md bg-blue-50 p-1.5 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                  <UsersRound className="h-4 w-4" />
                </span>
              </div>
              <div className="mt-2 text-2xl font-bold text-blue-600 dark:text-blue-400">{metrics.inCanvass}</div>
              <p className="mt-1 text-[11px] text-slate-500">Distributed to canvassers/suppliers</p>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Retrieved from Suppliers</span>
                <span className="rounded-md bg-indigo-50 p-1.5 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
                  <FileSpreadsheet className="h-4 w-4" />
                </span>
              </div>
              <div className="mt-2 text-2xl font-bold text-indigo-600 dark:text-indigo-400">{metrics.retrieved}</div>
              <p className="mt-1 text-[11px] text-slate-500">Ready for formal BAC transmission</p>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Transmitted to BAC</span>
                <span className="rounded-md bg-emerald-50 p-1.5 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                </span>
              </div>
              <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">{metrics.transmitted}</div>
              <p className="mt-1 text-[11px] text-slate-500">Transmittal slip issued to BAC Secretariat</p>
            </div>
          </>
        ) : (
          <>
            <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">PhilGEPS Verified</span>
                <span className="rounded-md bg-emerald-50 p-1.5 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                </span>
              </div>
              <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">{metrics.postedCount}</div>
              <p className="mt-1 text-[11px] text-slate-500">Reference number logged and active</p>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Posting Pending</span>
                <span className="rounded-md bg-amber-50 p-1.5 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
                  <Clock className="h-4 w-4" />
                </span>
              </div>
              <div className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">{metrics.pendingPhilgeps}</div>
              <p className="mt-1 text-[11px] text-slate-500">Active packages awaiting reference logging</p>
            </div>
          </>
        )}
      </div>

      {/* Main Content Areas */}
      {activeTab === "distribution" ? (
        <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">RFQ Outward Distribution & Transmittal Queue</h3>
              <p className="text-xs text-slate-500">Mandated tasks: Outward distribution to canvassers, retrieval of quotes, and formal transmittal to BAC.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50/75 dark:border-slate-800 dark:bg-slate-800/50">
                <tr>
                  <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">RFQ Number</th>
                  <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">PR Reference & Purpose</th>
                  <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Distribution Status</th>
                  <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Canvasser / Dates</th>
                  <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">BAC Transmittal</th>
                  <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {distItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      No RFQ packages in the distribution queue.
                    </td>
                  </tr>
                ) : (
                  distItems.map((item) => {
                    const status = item.distributionStatus;
                    const prEstimate = Number(item.purchaseRequest?.totalEstimate || 0);
                    const requiresPhilgeps = prEstimate > 50000;
                    const matchingPhilgeps = philgepsItems.find(
                      (p) => p.rfqId === item.rfq.id || p.purchaseRequestId === item.purchaseRequest?.id
                    );
                    const isPhilgepsPosted = Boolean(matchingPhilgeps?.isPosted);

                    return (
                      <tr key={item.rfq.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                          {item.rfq.rfqNumber}
                          <div className="text-[11px] text-slate-500 font-normal">
                            {new Date(item.rfq.createdAt).toLocaleDateString("en-PH")}
                          </div>
                        </td>
                        <td className="px-4 py-3 max-w-[220px]">
                          <div className="font-medium text-slate-800 dark:text-slate-200">{item.purchaseRequest?.prNumber || "N/A"}</div>
                          <div className="truncate text-[11px] text-slate-500" title={item.purchaseRequest?.purpose}>
                            {item.purchaseRequest?.purpose || "Procurement Package"}
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            ABC: {formatMoney(item.purchaseRequest?.totalEstimate)}
                          </div>
                          {requiresPhilgeps && (
                            <div className="mt-1">
                              {isPhilgepsPosted ? (
                                <Badge variant="outline" className="border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 text-[9px] py-0 px-1.5 font-normal">
                                  <ShieldCheck className="mr-0.5 h-2.5 w-2.5 inline" /> PhilGEPS #{matchingPhilgeps?.philgepsReferenceNumber}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="border-amber-400 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 text-[9px] py-0 px-1.5 font-medium">
                                  <AlertCircle className="mr-0.5 h-2.5 w-2.5 inline" /> PhilGEPS Req. (&gt; ₱50k)
                                </Badge>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {status === "transmitted_to_bac" ? (
                            <Badge variant="outline" className="border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-[10px]">
                              <CheckCircle2 className="mr-1 h-3 w-3" /> Transmitted to BAC
                            </Badge>
                          ) : status === "retrieved" ? (
                            <Badge variant="outline" className="border-indigo-300 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 text-[10px]">
                              <FileCheck2 className="mr-1 h-3 w-3" /> Retrieved from Suppliers
                            </Badge>
                          ) : status === "distributed" ? (
                            <Badge variant="outline" className="border-blue-300 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 text-[10px]">
                              <Send className="mr-1 h-3 w-3" /> Outward Distributed
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 text-[10px]">
                              <Clock className="mr-1 h-3 w-3" /> Pending Distribution
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {item.canvasserName ? (
                            <div>
                              <div className="font-medium text-slate-800 dark:text-slate-200">{item.canvasserName}</div>
                              <div className="text-[10px] text-slate-500">
                                {item.distributionDate && `Dispatched: ${new Date(item.distributionDate).toLocaleDateString("en-PH")}`}
                                {item.retrievalDate && ` · Retrieved: ${new Date(item.retrievalDate).toLocaleDateString("en-PH")}`}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px]">Not yet dispatched</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {item.transmittal ? (
                            <div>
                              <Link
                                href={`/print/transmittal?id=${item.transmittal.id}`}
                                className="font-mono text-[11px] text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300 font-semibold underline decoration-dotted block"
                                title="Click to view/print official BAC transmittal slip"
                              >
                                {item.transmittal.transmittalNumber}
                              </Link>
                              <div className="text-[10px] text-slate-500">
                                Transmitted {item.transmittal.sentAt ? new Date(item.transmittal.sentAt).toLocaleDateString("en-PH") : ""}
                              </div>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400">None</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {status === "pending_distribution" && (
                              <Button
                                size="sm"
                                onClick={() => handleOpenDistModal(item, "distributed")}
                                className="h-7 text-xs bg-[#881337] hover:bg-[#70102e] text-white"
                              >
                                <Send className="mr-1 h-3 w-3" />
                                Record Distribution
                              </Button>
                            )}
                            {status === "distributed" && (
                              <Button
                                size="sm"
                                onClick={() => handleOpenDistModal(item, "retrieved")}
                                className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                              >
                                <FileCheck2 className="mr-1 h-3 w-3" />
                                Record Retrieval
                              </Button>
                            )}
                            {status === "retrieved" && (
                              <>
                                {requiresPhilgeps && !isPhilgepsPosted && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleOpenPhilgepsModal(matchingPhilgeps || {
                                      purchaseRequestId: item.purchaseRequest?.id,
                                      rfqId: item.rfq.id,
                                      prNumber: item.purchaseRequest?.prNumber || `PR-#${item.purchaseRequest?.id}`,
                                      rfqNumber: item.rfq.rfqNumber,
                                    })}
                                    className="h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white"
                                    title="Document PhilGEPS Reference (Mandatory for ABC > ₱50k)"
                                  >
                                    <Globe className="mr-1 h-3 w-3" />
                                    Post PhilGEPS
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  onClick={() => handleOpenBacModal(item)}
                                  className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                                >
                                  <ArrowRight className="mr-1 h-3 w-3" />
                                  Transmit to BAC
                                </Button>
                              </>
                            )}
                            {status === "transmitted_to_bac" && (
                              <div className="flex items-center gap-1.5">
                                <Badge variant="outline" className="border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-[10px]">
                                  Ready for BAC AOQ
                                </Badge>
                                {item.transmittal && (
                                  <Link href={`/print/transmittal?id=${item.transmittal.id}`}>
                                    <Button size="sm" variant="outline" className="h-6 text-[10px] px-1.5 gap-1 border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300">
                                      <Printer className="h-3 w-3" /> Transmittal
                                    </Button>
                                  </Link>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* PhilGEPS Postings Table */
        <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">PhilGEPS Posting Registry & Compliance</h3>
              <p className="text-xs text-slate-500">Document and verify required PhilGEPS postings for active procurement packages.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50/75 dark:border-slate-800 dark:bg-slate-800/50">
                <tr>
                  <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Package / PR Reference</th>
                  <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">RFQ Number</th>
                  <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Estimated Budget</th>
                  <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">PhilGEPS Status</th>
                  <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Reference Number</th>
                  <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Posting Date</th>
                  <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {philgepsItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      No active RFQ packages requiring PhilGEPS documentation found.
                    </td>
                  </tr>
                ) : (
                  philgepsItems.map((pkg) => (
                    <tr key={pkg.rfqId} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900 dark:text-white">{pkg.prNumber}</div>
                        <div className="truncate max-w-[200px] text-[11px] text-slate-500" title={pkg.purpose}>
                          {pkg.purpose}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{pkg.rfqNumber}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{formatMoney(pkg.totalEstimate)}</td>
                      <td className="px-4 py-3">
                        {pkg.isPosted ? (
                          <Badge variant="outline" className="border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-[10px]">
                            <CheckCircle2 className="mr-1 h-3 w-3" /> PhilGEPS Verified
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 text-[10px]">
                            <Clock className="mr-1 h-3 w-3" /> Posting Required
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-800 dark:text-slate-200">
                        {pkg.philgepsReferenceNumber || <span className="text-slate-400 font-sans">Pending</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                        {pkg.postingDate ? new Date(pkg.postingDate).toLocaleDateString("en-PH") : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          size="sm"
                          onClick={() => handleOpenPhilgepsModal(pkg)}
                          className="h-7 text-xs bg-[#881337] hover:bg-[#70102e] text-white"
                        >
                          <Globe className="mr-1 h-3 w-3" />
                          {pkg.isPosted ? "Update PhilGEPS" : "Record PhilGEPS"}
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Distribution Modal */}
      {selectedRfqForDist && (
        <Dialog open={Boolean(selectedRfqForDist)} onOpenChange={(open) => !open && setSelectedRfqForDist(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
                {distActionType === "distributed" ? "Log Outward RFQ Distribution" : "Log RFQ Retrieval from Suppliers"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                RFQ {selectedRfqForDist.rfq.rfqNumber} · PR {selectedRfqForDist.purchaseRequest?.prNumber}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 pt-2 text-xs">
              <div>
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Canvasser / Dispatch Officer:
                </Label>
                <Input
                  value={canvasserName}
                  onChange={(e) => setCanvasserName(e.target.value)}
                  placeholder="Full name of designated canvasser"
                  className="mt-1 h-8 text-xs"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {distActionType === "distributed" ? "Distribution / Dispatch Date:" : "Retrieval Date:"}
                </Label>
                <Input
                  type="date"
                  value={distDate}
                  onChange={(e) => setDistDate(e.target.value)}
                  className="mt-1 h-8 text-xs"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Remarks / Supplier Notes:</Label>
                <Textarea
                  value={distRemarks}
                  onChange={(e) => setDistRemarks(e.target.value)}
                  placeholder="Canvass areas, suppliers served, or quotation envelopes retrieved..."
                  className="mt-1 text-xs min-h-[70px]"
                />
              </div>
            </div>

            <DialogFooter className="mt-3">
              <Button variant="outline" size="sm" onClick={() => setSelectedRfqForDist(null)} className="text-xs">
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={updateDistMutation.isPending}
                onClick={handleConfirmDistUpdate}
                className="text-xs bg-[#881337] hover:bg-[#70102e] text-white"
              >
                {updateDistMutation.isPending && <LoaderCircle className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                Confirm Log
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* BAC Transmittal Modal */}
      {selectedRfqForBac && (() => {
        const prEstimate = Number(selectedRfqForBac.purchaseRequest?.totalEstimate || 0);
        const requiresPhilgeps = prEstimate > 50000;
        const matchingPhilgeps = philgepsItems.find(
          (p) => p.rfqId === selectedRfqForBac.rfq.id || p.purchaseRequestId === selectedRfqForBac.purchaseRequest?.id
        );
        const isPhilgepsPosted = Boolean(matchingPhilgeps?.isPosted);
        const canTransmit = !requiresPhilgeps || isPhilgepsPosted;

        return (
          <Dialog open={Boolean(selectedRfqForBac)} onOpenChange={(open) => !open && setSelectedRfqForBac(null)}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
                  Formal Transmittal to Bids & Awards Committee (BAC)
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Formally transmit retrieved quotations to the BAC Secretariat for Abstract of Quotations (AOQ) preparation.
                </DialogDescription>
              </DialogHeader>

              {/* Section 54.2 Compliance Alert */}
              {requiresPhilgeps && !isPhilgepsPosted && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200 text-xs space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">RA 12009 (NGPA) Article III / PhilGEPS Electronic Posting Compliance Guard</p>
                      <p className="mt-0.5 text-[11px] leading-relaxed">
                        This procurement package has an ABC of <strong>{formatMoney(prEstimate)}</strong> (exceeding ₱50,000.00). RA 12009 Article III (Procurement by Electronic Means) mandates a documented PhilGEPS posting reference number before transmittal to the BAC Secretariat.
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const pkgToPost = matchingPhilgeps || {
                        purchaseRequestId: selectedRfqForBac.purchaseRequest?.id,
                        rfqId: selectedRfqForBac.rfq.id,
                        prNumber: selectedRfqForBac.purchaseRequest?.prNumber || `PR-#${selectedRfqForBac.purchaseRequest?.id}`,
                        rfqNumber: selectedRfqForBac.rfq.rfqNumber,
                      };
                      setSelectedRfqForBac(null);
                      handleOpenPhilgepsModal(pkgToPost);
                    }}
                    className="w-full text-xs border-amber-400 text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-amber-900/50 font-medium"
                  >
                    <Globe className="mr-1.5 h-3.5 w-3.5" />
                    Document PhilGEPS Posting Reference Now
                  </Button>
                </div>
              )}

              {requiresPhilgeps && isPhilgepsPosted && (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>PhilGEPS Reference Documented: <strong>{matchingPhilgeps?.philgepsReferenceNumber}</strong> (Section 54.2 Verified)</span>
                </div>
              )}

              <div className="space-y-3 pt-2 text-xs">
                <div>
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Recipient Office / Committee:</Label>
                  <Input
                    value={bacOffice}
                    onChange={(e) => setBacOffice(e.target.value)}
                    className="mt-1 h-8 text-xs"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Transmittal Subject:</Label>
                  <Input
                    value={bacSubject}
                    onChange={(e) => setBacSubject(e.target.value)}
                    className="mt-1 h-8 text-xs"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Transmittal Remarks / Scope:</Label>
                  <Textarea
                    value={bacRemarks}
                    onChange={(e) => setBacRemarks(e.target.value)}
                    className="mt-1 text-xs min-h-[80px]"
                  />
                </div>
              </div>

              <DialogFooter className="mt-3">
                <Button variant="outline" size="sm" onClick={() => setSelectedRfqForBac(null)} className="text-xs">
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={transmitBacMutation.isPending || !canTransmit}
                  onClick={handleConfirmBacTransmit}
                  className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
                >
                  {transmitBacMutation.isPending && <LoaderCircle className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                  Transmit to BAC
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        );
      })()}

      {/* PhilGEPS Modal */}
      {selectedPkgForPhilgeps && (
        <Dialog open={Boolean(selectedPkgForPhilgeps)} onOpenChange={(open) => !open && setSelectedPkgForPhilgeps(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
                Document PhilGEPS Posting
              </DialogTitle>
              <DialogDescription className="text-xs">
                Package: {selectedPkgForPhilgeps.prNumber} · {selectedPkgForPhilgeps.rfqNumber}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 pt-2 text-xs">
              <div>
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  PhilGEPS Reference Number: <span className="text-rose-500">*</span>
                </Label>
                <Input
                  value={philgepsRef}
                  onChange={(e) => setPhilgepsRef(e.target.value)}
                  placeholder="e.g. PHILGEPS-2026-004821"
                  className="mt-1 h-8 text-xs font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Posting Date:</Label>
                  <Input
                    type="date"
                    value={philgepsPostingDate}
                    onChange={(e) => setPhilgepsPostingDate(e.target.value)}
                    className="mt-1 h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Closing Date (Optional):</Label>
                  <Input
                    type="date"
                    value={philgepsClosingDate}
                    onChange={(e) => setPhilgepsClosingDate(e.target.value)}
                    className="mt-1 h-8 text-xs"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Posting Notes / Remarks:</Label>
                <Textarea
                  value={philgepsRemarks}
                  onChange={(e) => setPhilgepsRemarks(e.target.value)}
                  placeholder="Document posting URL, PhilGEPS bulletin confirmation, or verification notes..."
                  className="mt-1 text-xs min-h-[70px]"
                />
              </div>
            </div>

            <DialogFooter className="mt-3">
              <Button variant="outline" size="sm" onClick={() => setSelectedPkgForPhilgeps(null)} className="text-xs">
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={recordPhilgepsMutation.isPending || !philgepsRef.trim()}
                onClick={handleConfirmPhilgeps}
                className="text-xs bg-[#881337] hover:bg-[#70102e] text-white"
              >
                {recordPhilgepsMutation.isPending && <LoaderCircle className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                Save PhilGEPS Record
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
