import { useAuth } from "@/_core/hooks/useAuth";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { normalizeProcurementRole } from "../../../shared/procurementRules";
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  Download,
  Eye,
  FileCode2,
  FileSpreadsheet,
  Filter,
  History,
  Layers,
  LoaderCircle,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Table,
  Upload,
} from "lucide-react";
import React, { useMemo, useState } from "react";
import { toast } from "sonner";

// ============================================================================
// CORE FIVE FORM DEFINITIONS
// ============================================================================
interface FormTabInfo {
  key: string;
  name: string;
  shortCode: string;
  standard: string;
  isLandscape?: boolean;
  color: string;
  description: string;
}

const FIVE_CORE_FORMS: FormTabInfo[] = [
  {
    key: "purchase_request",
    name: "Purchase Request (PR)",
    shortCode: "Appendix 60",
    standard: "GAM Vol. II",
    isLandscape: false,
    color: "#7b1e1e",
    description: "Official requisition sheet with fund clusters, dynamic item lines, estimated costs, and required signatories.",
  },
  {
    key: "rfq",
    name: "Request for Quotation (RFQ)",
    shortCode: "Annex D",
    standard: "R.A. 9184 Standard",
    isLandscape: false,
    color: "#1d4ed8",
    description: "Market canvass document with deadline, general terms & conditions, delivery terms, and vendor quotation grid.",
  },
  {
    key: "abstract_of_quotations",
    name: "Abstract of Quotations (AOQ)",
    shortCode: "Annex F",
    standard: "Landscape Canvas",
    isLandscape: true,
    color: "#b45309",
    description: "Multi-bidder side-by-side comparative canvass, compliance verification, and BAC award recommendation matrix.",
  },
  {
    key: "purchase_order",
    name: "Purchase Order (PO)",
    shortCode: "Appendix 61",
    standard: "GAM Vol. II",
    isLandscape: false,
    color: "#047857",
    description: "Formal contract with supplier containing delivery/payment terms, penalty clauses, and accounting fund certification.",
  },
  {
    key: "acknowledgement_receipt",
    name: "Acknowledgement Receipt (AR)",
    shortCode: "Property Issuance",
    standard: "COA Property Rules",
    isLandscape: false,
    color: "#6b21a8",
    description: "Inventory handover and accountability receipt tracking serial numbers, property tags, and custodian signoff.",
  },
];

// Helper to trigger browser downloads of base64 files
function downloadBase64File(base64: string, filename: string, mimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
  try {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Failed to download file:", error);
    toast.error("Failed to download file. Please check console for details.");
  }
}

export default function FormTemplatesPage() {
  const { user } = useAuth();
  const procurementRole = user ? normalizeProcurementRole(user.role) : "end_user";
  const isAdmin = procurementRole === "admin";

  const [activeFormKey, setActiveFormKey] = useState<string>("purchase_request");
  const [activeViewTab, setActiveViewTab] = useState<"preview" | "placeholders" | "versions" | "payload">("preview");
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [placeholderSearch, setPlaceholderSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [previewScale, setPreviewScale] = useState<number>(100);

  // Upload modal state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadDisplayName, setUploadDisplayName] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadFileBase64, setUploadFileBase64] = useState<string>("");
  const [activateImmediately, setActivateImmediately] = useState(true);

  const utils = trpc.useUtils();

  // Queries
  const supportedFormsQuery = trpc.procurement.templates.listSupportedForms.useQuery(undefined, {
    staleTime: 60_000,
  });

  const templatesListQuery = trpc.procurement.templates.list.useQuery(undefined, {
    staleTime: 30_000,
  });

  const previewQuery = trpc.procurement.templates.previewPopulatedTemplate.useQuery(
    { templateKey: activeFormKey },
    {
      staleTime: 10_000,
      refetchOnWindowFocus: false,
    }
  );

  // Mutations
  const downloadMasterMutation = trpc.procurement.templates.downloadMasterXlsx.useMutation({
    onSuccess: (data) => {
      downloadBase64File(data.base64, data.fileName);
      toast.success(`Downloaded master template: ${data.fileName}`);
    },
    onError: (err) => {
      toast.error(`Download failed: ${err.message}`);
    },
  });

  const uploadTemplateMutation = trpc.procurement.templates.uploadXlsxTemplate.useMutation({
    onSuccess: (data) => {
      toast.success(`Template "${data.displayName}" uploaded successfully.`);
      setIsUploadOpen(false);
      setUploadFile(null);
      setUploadFileBase64("");
      setUploadDisplayName("");
      void utils.procurement.templates.list.invalidate();
      void utils.procurement.templates.previewPopulatedTemplate.invalidate({ templateKey: activeFormKey });
    },
    onError: (err) => {
      toast.error(`Upload error: ${err.message}`);
    },
  });

  const activateMutation = trpc.procurement.templates.activate.useMutation({
    onSuccess: () => {
      toast.success("Template version activated.");
      void utils.procurement.templates.list.invalidate();
      void utils.procurement.templates.previewPopulatedTemplate.invalidate({ templateKey: activeFormKey });
    },
    onError: (err) => toast.error(err.message),
  });

  const restoreMutation = trpc.procurement.templates.restoreVersion.useMutation({
    onSuccess: () => {
      toast.success("Template restored as a new draft.");
      void utils.procurement.templates.list.invalidate();
      void utils.procurement.templates.previewPopulatedTemplate.invalidate({ templateKey: activeFormKey });
    },
    onError: (err) => toast.error(err.message),
  });

  // Current active form metadata
  const currentTab = useMemo(
    () => FIVE_CORE_FORMS.find((f) => f.key === activeFormKey) || FIVE_CORE_FORMS[0],
    [activeFormKey]
  );

  const currentBackendMeta = useMemo(() => {
    return supportedFormsQuery.data?.find((f) => f.key === activeFormKey);
  }, [supportedFormsQuery.data, activeFormKey]);

  const versionsForForm = useMemo(() => {
    return (templatesListQuery.data ?? []).filter((t) => t.templateKey === activeFormKey);
  }, [templatesListQuery.data, activeFormKey]);

  // Helper to categorize placeholders
  function getPlaceholderCategory(token: string): string {
    if (
      token.includes("item_") ||
      token.includes("qty") ||
      token.includes("unit") ||
      token.includes("cost") ||
      token.includes("amount") ||
      token.includes("bid_") ||
      token.includes("price") ||
      token.includes("savings")
    ) {
      return "Items & Financial";
    }
    if (
      token.includes("signatory") ||
      token.includes("approved") ||
      token.includes("chair") ||
      token.includes("received_by") ||
      token.includes("issued_by") ||
      token.includes("conforme")
    ) {
      return "Signatories";
    }
    if (
      token.includes("supplier") ||
      token.includes("tin_") ||
      token.includes("philgeps") ||
      token.includes("bidder")
    ) {
      return "Supplier & Vendors";
    }
    return "General & Metadata";
  }

  // Placeholders list with filtering
  const filteredPlaceholders = useMemo(() => {
    const list = currentBackendMeta?.placeholders ?? [];
    return list.filter((p) => {
      const category = getPlaceholderCategory(p.token);
      const matchesSearch =
        p.token.toLowerCase().includes(placeholderSearch.toLowerCase()) ||
        p.label.toLowerCase().includes(placeholderSearch.toLowerCase()) ||
        p.description.toLowerCase().includes(placeholderSearch.toLowerCase());
      const matchesCategory = selectedCategory === "all" || category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [currentBackendMeta?.placeholders, placeholderSearch, selectedCategory]);

  const placeholderCategories = useMemo(() => {
    const set = new Set<string>();
    currentBackendMeta?.placeholders.forEach((p) => set.add(getPlaceholderCategory(p.token)));
    return ["all", ...Array.from(set)];
  }, [currentBackendMeta?.placeholders]);

  // Actions
  const handleDownloadMaster = () => {
    downloadMasterMutation.mutate({ templateKey: activeFormKey });
  };

  const handleDownloadPopulatedXlsx = () => {
    if (!previewQuery.data?.xlsxBase64) {
      toast.error("Populated spreadsheet preview not ready.");
      return;
    }
    const fileName = `${currentTab.name.replace(/[^a-zA-Z0-9]/g, "_")}_Populated.xlsx`;
    downloadBase64File(previewQuery.data.xlsxBase64, fileName);
    toast.success(`Exported populated spreadsheet: ${fileName}`);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    setCopiedToken(token);
    toast.success(`Copied placeholder: ${token}`);
    setTimeout(() => setCopiedToken(null), 2500);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".xlsx")) {
      toast.error("Please select a valid Microsoft Excel workbook (.xlsx)");
      return;
    }
    setUploadFile(file);
    if (!uploadDisplayName) {
      setUploadDisplayName(file.name.replace(/\.xlsx$/i, "").replace(/[_-]/g, " "));
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      setUploadFileBase64(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadSubmit = () => {
    if (!uploadFileBase64 || !uploadFile) {
      toast.error("Please choose a .xlsx file to upload");
      return;
    }
    uploadTemplateMutation.mutate({
      templateKey: activeFormKey,
      displayName: uploadDisplayName.trim() || uploadFile.name,
      fileName: uploadFile.name,
      fileBase64: uploadFileBase64,
      activateNow: activateImmediately,
    });
  };

  return (
    <div className="mx-auto max-w-[1400px] px-2 sm:px-4 py-4 print:p-0">
      {/* -------------------------------------------------------------
          1. HEADER & HIGH-LEVEL OVERVIEW (Hidden during Print)
          ------------------------------------------------------------- */}
      <div className="no-print">
        <PageHeader
          eyebrow="Decoupled Template Architecture"
          title="Forms Hub & Excel-Driven Templates"
          description="Institutional procurement forms are fully decoupled from frontend markup. Administrators download master .xlsx workbooks, modify layouts in Microsoft Excel, and upload templates with automatic dynamic token injection and edge-to-edge A4 printing."
        />

        {/* Feature Highlights Pills */}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-[#485361]">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#d6cfc4] bg-[#fbf9f5] px-3 py-1 font-medium">
            <FileSpreadsheet className="h-3.5 w-3.5 text-[#047857]" />
            ExcelJS v4.4 Master Engine
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#d6cfc4] bg-[#fbf9f5] px-3 py-1 font-medium">
            <Layers className="h-3.5 w-3.5 text-[#1d4ed8]" />
            5 Core Institutional Forms
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#d6cfc4] bg-[#fbf9f5] px-3 py-1 font-medium">
            <Sparkles className="h-3.5 w-3.5 text-[#b45309]" />
            Dynamic Placeholder Injection
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#d6cfc4] bg-[#fbf9f5] px-3 py-1 font-medium">
            <Printer className="h-3.5 w-3.5 text-[#7b1e1e]" />
            Edge-to-Edge A4 Canvas &amp; PDF Consistency
          </span>
        </div>

        {/* -------------------------------------------------------------
            2. FIVE CORE FORM SELECTOR TABS
            ------------------------------------------------------------- */}
        <div className="mt-6 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
          {FIVE_CORE_FORMS.map((form) => {
            const isSelected = form.key === activeFormKey;
            return (
              <button
                key={form.key}
                type="button"
                onClick={() => {
                  setActiveFormKey(form.key);
                  setPlaceholderSearch("");
                  setSelectedCategory("all");
                }}
                className={`relative flex flex-col justify-between rounded-lg border p-3.5 text-left transition-all ${
                  isSelected
                    ? "border-[#7b1e1e] bg-white shadow-md ring-2 ring-[#7b1e1e]/20"
                    : "border-[#e0dad0] bg-[#faf8f4] hover:border-[#c5bcad] hover:bg-white"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#7b1e1e]">
                      {form.shortCode}
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-[9px] px-1.5 py-0 font-medium ${
                        form.isLandscape
                          ? "border-[#b45309] text-[#b45309] bg-[#fffbf2]"
                          : "border-[#52606d] text-[#52606d]"
                      }`}
                    >
                      {form.isLandscape ? "A4 Landscape" : "A4 Portrait"}
                    </Badge>
                  </div>
                  <h3 className="mt-1.5 text-xs font-bold leading-snug text-[#1f2933]">
                    {form.name}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-[11px] leading-tight text-[#52606d]">
                    {form.description}
                  </p>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-[#ece7de] pt-2 text-[10px] font-semibold text-[#667280]">
                  <span>{form.standard}</span>
                  {isSelected && (
                    <span className="flex items-center gap-1 font-bold text-[#7b1e1e]">
                      Selected <Check className="h-3 w-3" />
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* -------------------------------------------------------------
            3. ACTIVE FORM CONTROL BANNER & ACTION BAR
            ------------------------------------------------------------- */}
        <div className="mt-5 rounded-lg border border-[#ded8cc] bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded bg-[#7b1e1e] px-2 py-0.5 text-[11px] font-bold tracking-wide text-white uppercase">
                  {currentTab.shortCode}
                </span>
                <h2 className="text-base font-bold text-[#1f2933]">
                  {currentTab.name}
                </h2>
                <Badge variant="outline" className="text-[11px] font-medium text-[#52606d]">
                  {currentBackendMeta?.regulatoryStandard || currentTab.standard}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-[#52606d]">
                {currentBackendMeta?.description || currentTab.description}
              </p>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Master .xlsx Download */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadMaster}
                disabled={downloadMasterMutation.isPending}
                className="h-9 gap-1.5 border-[#047857] text-[#047857] hover:bg-[#ecfdf5] text-xs font-semibold"
                title="Download the official master Excel template to edit offline in Microsoft Excel"
              >
                {downloadMasterMutation.isPending ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                <span>Download Master .xlsx</span>
              </Button>

              {/* Upload Custom .xlsx Template (Admin) */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (!isAdmin) {
                    toast.info("Template uploading is restricted to System Administrators.");
                    return;
                  }
                  setIsUploadOpen(true);
                }}
                className="h-9 gap-1.5 border-[#1d4ed8] text-[#1d4ed8] hover:bg-[#eff6ff] text-xs font-semibold"
                title="Upload updated Excel template with custom layouts, fonts, or institutional rules"
              >
                <Upload className="h-4 w-4" />
                <span>Upload New .xlsx</span>
              </Button>

              {/* Populated .xlsx Download */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadPopulatedXlsx}
                disabled={previewQuery.isLoading}
                className="h-9 gap-1.5 border-[#52606d] text-[#1f2933] hover:bg-[#f3f4f6] text-xs font-semibold"
                title="Download populated spreadsheet with runtime transaction data injected"
              >
                <FileSpreadsheet className="h-4 w-4 text-[#047857]" />
                <span>Download Populated .xlsx</span>
              </Button>

              {/* Print / Save as PDF (A4) */}
              <Button
                size="sm"
                onClick={handlePrint}
                className="h-9 gap-1.5 bg-[#7b1e1e] text-white hover:bg-[#641818] text-xs font-semibold shadow-sm"
                title="Print or export clean A4 sheet with edge-to-edge header & footer"
              >
                <Printer className="h-4 w-4" />
                <span>Print / Save as PDF (A4)</span>
              </Button>
            </div>
          </div>

          {/* Sub-Navigation Tabs */}
          <div className="mt-4 flex flex-wrap items-center justify-between border-t border-[#f0ece5] pt-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setActiveViewTab("preview")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                  activeViewTab === "preview"
                    ? "bg-[#7b1e1e] text-white shadow-sm"
                    : "bg-[#f5f2eb] text-[#52606d] hover:bg-[#ece7de] hover:text-[#1f2933]"
                }`}
              >
                <Eye className="h-3.5 w-3.5" />
                <span>A4 Live Print Preview</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveViewTab("placeholders")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                  activeViewTab === "placeholders"
                    ? "bg-[#7b1e1e] text-white shadow-sm"
                    : "bg-[#f5f2eb] text-[#52606d] hover:bg-[#ece7de] hover:text-[#1f2933]"
                }`}
              >
                <FileCode2 className="h-3.5 w-3.5" />
                <span>Placeholder Reference Guide</span>
                <span className="ml-1 rounded-full bg-white/20 px-1.5 py-0.2 text-[10px]">
                  {currentBackendMeta?.placeholders.length || 0}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveViewTab("versions")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                  activeViewTab === "versions"
                    ? "bg-[#7b1e1e] text-white shadow-sm"
                    : "bg-[#f5f2eb] text-[#52606d] hover:bg-[#ece7de] hover:text-[#1f2933]"
                }`}
              >
                <History className="h-3.5 w-3.5" />
                <span>Template Versions</span>
                <span className="ml-1 rounded-full bg-white/20 px-1.5 py-0.2 text-[10px]">
                  {versionsForForm.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveViewTab("payload")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                  activeViewTab === "payload"
                    ? "bg-[#7b1e1e] text-white shadow-sm"
                    : "bg-[#f5f2eb] text-[#52606d] hover:bg-[#ece7de] hover:text-[#1f2933]"
                }`}
              >
                <Table className="h-3.5 w-3.5" />
                <span>Runtime Transaction Payload</span>
              </button>
            </div>

            {/* Injection Stats indicator */}
            {previewQuery.data?.meta && (
              <div className="flex items-center gap-2 text-[11px] text-[#52606d]">
                <span className="inline-flex items-center gap-1 font-semibold text-[#047857]">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {previewQuery.data.meta.injectedTokensCount} tokens injected
                </span>
                <span>•</span>
                <span className="font-semibold text-[#1d4ed8]">
                  {previewQuery.data.meta.itemsCount} line items cloned
                </span>
                <span>•</span>
                <span className="text-[#64748b]">
                  Sheet: {previewQuery.data.sheetName}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* -------------------------------------------------------------
          4. MAIN VIEW CONTENT
          ------------------------------------------------------------- */}

      {/* TAB 1: LIVE A4 PRINTABLE PREVIEW */}
      {activeViewTab === "preview" && (
        <div className="mt-5">
          {/* Preview Toolbar (Hidden in Print) */}
          <div className="no-print mb-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-[#e5dfd5] bg-[#faf8f4] px-4 py-2 text-xs">
            <div className="flex items-center gap-3 text-[#52606d]">
              <span className="font-semibold text-[#1f2933]">
                {currentTab.isLandscape ? "Landscape A4 (297mm × 210mm)" : "Portrait A4 (210mm × 297mm)"}
              </span>
              <span>•</span>
              <span className="italic">
                Edge-to-edge header &amp; footer preserved with accurate spreadsheet cell borders and font weights
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[#6b7280]">Preview Scale:</span>
              {[80, 90, 100].map((scale) => (
                <button
                  key={scale}
                  type="button"
                  onClick={() => setPreviewScale(scale)}
                  className={`rounded px-2 py-0.5 text-[11px] font-semibold transition-all ${
                    previewScale === scale
                      ? "bg-[#7b1e1e] text-white"
                      : "bg-white border border-[#dcd7ce] text-[#52606d] hover:bg-[#f3ede3]"
                  }`}
                >
                  {scale}%
                </button>
              ))}

              <Button
                variant="ghost"
                size="sm"
                onClick={() => previewQuery.refetch()}
                className="h-7 px-2 text-[11px] text-[#52606d] hover:text-[#1f2933]"
                title="Reload preview"
              >
                <RefreshCw className={`h-3 w-3 ${previewQuery.isFetching ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>

          {/* Loading or Error State */}
          {previewQuery.isLoading ? (
            <div className="flex min-h-[400px] flex-col items-center justify-center rounded-lg border border-[#e5dfd5] bg-white p-8">
              <LoaderCircle className="h-8 w-8 animate-spin text-[#7b1e1e]" />
              <p className="mt-3 text-xs font-semibold text-[#1f2933]">
                Parsing Excel template and injecting live transaction data…
              </p>
              <p className="mt-1 text-[11px] text-[#52606d]">
                Extracting cell borders, merged ranges, font styles, and header/footer alignment
              </p>
            </div>
          ) : previewQuery.isError ? (
            <div className="rounded-lg border border-[#fca5a5] bg-[#fef2f2] p-6 text-center text-xs text-[#991b1b]">
              <AlertCircle className="mx-auto h-7 w-7 text-[#dc2626]" />
              <p className="mt-2 font-bold">Failed to render template preview</p>
              <p className="mt-1 text-[11px]">{previewQuery.error?.message}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => previewQuery.refetch()}
                className="mt-4 border-[#dc2626] text-[#dc2626] hover:bg-[#fee2e2]"
              >
                Retry
              </Button>
            </div>
          ) : (
            /* =========================================================
               STANDARDIZED A4 PRINT CANVAS WITH EDGE-TO-EDGE HEADER/FOOTER
               ========================================================= */
            <div className="overflow-x-auto py-2 flex justify-center">
              <article
                className={`evaluation-document-sheet relative mx-auto flex flex-col justify-between bg-white text-[#202833] border border-[#dfd9ce] shadow-md transition-all dark:bg-white dark:text-[#202833] print:border-0 print:shadow-none print:m-0 print:p-0 ${
                  currentTab.isLandscape
                    ? "landscape max-w-[1120px] w-full"
                    : "portrait max-w-[850px] w-full"
                }`}
                style={{
                  boxSizing: "border-box",
                  transform: previewScale !== 100 ? `scale(${previewScale / 100})` : "none",
                  transformOrigin: "top center",
                }}
              >
                {/* 1. HEADER CONTAINER: 100% width, 0 padding, edge-to-edge */}
                <header className="evaluation-header-container official-form-header print-include w-full p-0 m-0 leading-none overflow-hidden select-none border-b border-[#9a6d19] print:border-b-0 print:p-0 print:m-0">
                  <img
                    src="/header.png"
                    alt="Official Institutional Header"
                    className="w-full h-auto block object-cover print:w-full"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = "none";
                    }}
                  />
                </header>

                {/* 2. FORM CONTENT AREA: Excel populated HTML table */}
                <main className="evaluation-content-area flex-1 px-4 sm:px-8 py-5 text-xs leading-normal print:px-[12mm] print:py-[6mm] print:text-[8pt] overflow-x-auto print:overflow-visible">
                  {previewQuery.data?.htmlTable ? (
                    <div
                      className="print:w-full max-w-full overflow-x-auto"
                      dangerouslySetInnerHTML={{ __html: previewQuery.data.htmlTable }}
                    />
                  ) : (
                    <div className="p-8 text-center text-xs text-[#52606d]">
                      No populated HTML content generated for this template.
                    </div>
                  )}
                </main>

                {/* 3. FOOTER CONTAINER: 100% width, 0 padding, edge-to-edge flush to bottom */}
                <footer className="evaluation-footer-container official-form-footer print-include w-full p-0 m-0 leading-none overflow-hidden select-none border-t border-[#d8b04d] mt-auto print:border-t-0 print:p-0 print:m-0">
                  <img
                    src="/footer.png"
                    alt="Official Institutional Footer"
                    className="w-full h-auto block object-cover print:w-full"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = "none";
                    }}
                  />
                </footer>
              </article>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PLACEHOLDER REFERENCE GUIDE */}
      {activeViewTab === "placeholders" && (
        <div className="mt-5 space-y-4 no-print">
          {/* Guide Header Banner */}
          <div className="rounded-lg border border-[#cfe2ff] bg-[#f0f7ff] p-4 text-xs text-[#1e429f]">
            <div className="flex items-start gap-3">
              <FileCode2 className="h-5 w-5 shrink-0 text-[#1d4ed8]" />
              <div>
                <h4 className="font-bold text-sm text-[#1e3a8a]">
                  How Dynamic Excel Injection Works
                </h4>
                <p className="mt-1 text-[11px] leading-relaxed text-[#1e429f]">
                  Simply type dynamic tokens like <code>&#123;&#123;pr_no&#125;&#125;</code> or <code>&#123;&#123;office&#125;&#125;</code> anywhere in your Excel workbook. When ProcureWise processes the transaction, it automatically replaces tokens with live database values while preserving your font styles, cell borders, text alignments, and number formats.
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] font-semibold text-[#1d4ed8]">
                  <span>✨ <strong>Repeating Item Rows:</strong> Put <code>&#123;&#123;item_no&#125;&#125;</code> and <code>&#123;&#123;item_desc&#125;&#125;</code> in a table row. ProcureWise will dynamically clone that exact row formatting for all items in the purchase request.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Search & Category Filter Controls */}
          <div className="flex flex-col gap-3 rounded-lg border border-[#e5dfd5] bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#77818d]" />
              <Input
                placeholder="Search placeholder token, field label, or description…"
                value={placeholderSearch}
                onChange={(e) => setPlaceholderSearch(e.target.value)}
                className="h-9 pl-9 text-xs"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <Filter className="h-3.5 w-3.5 text-[#52606d]" />
              <span className="text-[11px] font-semibold text-[#52606d]">Category:</span>
              {placeholderCategories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-all ${
                    selectedCategory === cat
                      ? "bg-[#7b1e1e] text-white"
                      : "bg-[#f5f2eb] text-[#52606d] hover:bg-[#e8e2d5]"
                  }`}
                >
                  {cat === "all" ? "All Categories" : cat.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Placeholders Table */}
          <div className="overflow-hidden rounded-lg border border-[#e5dfd5] bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-[#e5dfd5] bg-[#fbf9f5] text-[11px] font-bold uppercase text-[#52606d]">
                    <th className="py-3 px-4">Placeholder Token</th>
                    <th className="py-3 px-4">Field Name</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Runtime Example Value</th>
                    <th className="py-3 px-4">COA / R.A. 9184 Guidelines</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0ece5]">
                  {filteredPlaceholders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-xs text-[#77818d]">
                        No placeholder tokens matching "{placeholderSearch}".
                      </td>
                    </tr>
                  ) : (
                    filteredPlaceholders.map((p) => {
                      const isCopied = copiedToken === p.token;
                      return (
                        <tr key={p.token} className="hover:bg-[#fcfbf9] transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-[#7b1e1e]">
                            <code>{p.token}</code>
                          </td>
                          <td className="py-3 px-4 font-semibold text-[#1f2933]">
                            {p.label}
                          </td>
                          <td className="py-3 px-4">
                            <Badge
                              variant="outline"
                              className="text-[10px] font-semibold uppercase tracking-wider text-[#52606d]"
                            >
                              {getPlaceholderCategory(p.token)}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 font-medium text-[#202833]">
                            {p.example}
                          </td>
                          <td className="py-3 px-4 text-[11px] text-[#52606d]">
                            {p.description}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCopyToken(p.token)}
                              className="h-7 px-2 text-[11px] text-[#7b1e1e] hover:bg-[#fbf2f2]"
                              title="Copy token to clipboard"
                            >
                              {isCopied ? (
                                <span className="flex items-center gap-1 font-bold text-[#047857]">
                                  <Check className="h-3.5 w-3.5" /> Copied
                                </span>
                              ) : (
                                <span className="flex items-center gap-1">
                                  <Copy className="h-3.5 w-3.5" /> Copy
                                </span>
                              )}
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: TEMPLATE VERSIONS & UPLOAD AUDIT */}
      {activeViewTab === "versions" && (
        <div className="mt-5 space-y-4 no-print">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-[#1f2933]">
                Annual Template Version History ({currentTab.name})
              </h3>
              <p className="text-xs text-[#52606d]">
                Each time an administrator uploads an Excel workbook, a versioned draft is created. Activate the version once you have confirmed the print preview.
              </p>
            </div>

            {isAdmin && (
              <Button
                size="sm"
                onClick={() => setIsUploadOpen(true)}
                className="gap-1.5 bg-[#7b1e1e] text-white hover:bg-[#641818] text-xs font-semibold"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>Upload New Version (.xlsx)</span>
              </Button>
            )}
          </div>

          <div className="overflow-hidden rounded-lg border border-[#e5dfd5] bg-white shadow-sm">
            {templatesListQuery.isLoading ? (
              <div className="p-8 text-center">
                <LoaderCircle className="mx-auto h-6 w-6 animate-spin text-[#7b1e1e]" />
              </div>
            ) : versionsForForm.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#52606d]">
                No custom versions uploaded for this form yet. The default COA / Appendix master template is currently active.
              </div>
            ) : (
              <div className="divide-y divide-[#f0ece5]">
                {versionsForForm.map((tpl) => {
                  const cfg = tpl.configurationJson as any;
                  const isActive = tpl.status === "active";
                  const isDraft = tpl.status === "draft";

                  return (
                    <div
                      key={tpl.id}
                      className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between hover:bg-[#fcfbf9]"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-[#1f2933]">
                            Version {tpl.version}: {tpl.displayName}
                          </span>
                          <Badge
                            className={`text-[10px] uppercase font-bold tracking-wider ${
                              isActive
                                ? "bg-[#047857] text-white"
                                : isDraft
                                ? "bg-[#b45309] text-white"
                                : "bg-[#64748b] text-white"
                            }`}
                          >
                            {tpl.status}
                          </Badge>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#52606d]">
                          {cfg?.fileName && (
                            <span className="flex items-center gap-1 font-mono text-[10px] text-[#1d4ed8]">
                              <FileSpreadsheet className="h-3 w-3" />
                              {cfg.fileName}
                            </span>
                          )}
                          {cfg?.rowCount && (
                            <span>{cfg.rowCount} rows × {cfg.columnCount} columns</span>
                          )}
                          {cfg?.placeholdersDetected && (
                            <span>{cfg.placeholdersDetected.length} placeholders detected</span>
                          )}
                          <span>
                            Updated {new Date(tpl.updatedAt).toLocaleDateString("en-PH", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </div>
                      </div>

                      {isAdmin && (
                        <div className="flex items-center gap-2">
                          {isDraft && (
                            <Button
                              size="sm"
                              onClick={() => activateMutation.mutate({ templateId: tpl.id })}
                              disabled={activateMutation.isPending}
                              className="h-8 gap-1 bg-[#047857] text-white hover:bg-[#035e44] text-[11px] font-semibold"
                            >
                              <ShieldCheck className="h-3.5 w-3.5" />
                              <span>Activate</span>
                            </Button>
                          )}

                          {!isActive && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => restoreMutation.mutate({ templateId: tpl.id })}
                              disabled={restoreMutation.isPending}
                              className="h-8 gap-1 border-[#dcd7ce] text-[#52606d] hover:bg-[#f3ede3] text-[11px]"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                              <span>Restore as Draft</span>
                            </Button>
                          )}

                          {cfg?.fileBase64 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const fn = cfg.fileName || `${tpl.templateKey}_v${tpl.version}.xlsx`;
                                downloadBase64File(cfg.fileBase64, fn);
                                toast.success(`Downloaded: ${fn}`);
                              }}
                              className="h-8 px-2 text-[11px] text-[#1d4ed8] hover:bg-[#eff6ff]"
                              title="Download this specific Excel workbook version"
                            >
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: RUNTIME TRANSACTION PAYLOAD INSPECTOR */}
      {activeViewTab === "payload" && (
        <div className="mt-5 space-y-4 no-print">
          <div className="rounded-lg border border-[#e5dfd5] bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#1f2933]">
                  Runtime Procurement Payload ({currentTab.name})
                </h3>
                <p className="text-xs text-[#52606d]">
                  This is the transaction record being injected into the Excel template placeholders.
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(
                    JSON.stringify(previewQuery.data?.sampleData || {}, null, 2)
                  );
                  toast.success("Payload copied to clipboard.");
                }}
                className="h-8 gap-1 text-xs"
              >
                <Copy className="h-3.5 w-3.5" />
                <span>Copy JSON</span>
              </Button>
            </div>

            <div className="mt-4 rounded-md border border-[#2e3440] bg-[#1e222a] p-4 text-[#e5e9f0] font-mono text-[11px] overflow-x-auto max-h-[500px]">
              <pre>
                {previewQuery.data?.sampleData
                  ? JSON.stringify(previewQuery.data.sampleData, null, 2)
                  : "// Loading payload…"}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          5. UPLOAD TEMPLATE MODAL DIALOG
          ------------------------------------------------------------- */}
      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base text-[#1f2933]">
              <FileSpreadsheet className="h-5 w-5 text-[#047857]" />
              <span>Upload Custom Excel Template (.xlsx)</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-[#52606d]">
              Target: <strong>{currentTab.name}</strong> ({currentTab.shortCode}).
              The server will parse detected placeholders, column widths, and cell borders automatically.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-semibold text-[#1f2933]">
                Template Display Name
              </Label>
              <Input
                placeholder="e.g. Standard Institutional 2026 Appendix 60"
                value={uploadDisplayName}
                onChange={(e) => setUploadDisplayName(e.target.value)}
                className="mt-1 h-9 text-xs"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-[#1f2933]">
                Excel File (.xlsx)
              </Label>
              <div className="mt-1 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-[#dcd7ce] bg-[#fbf9f5] p-6 hover:bg-[#f6f2e9] transition-all">
                <FileSpreadsheet className="h-8 w-8 text-[#047857]" />
                <label className="mt-2 cursor-pointer rounded bg-[#7b1e1e] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#641818]">
                  Browse Excel File
                  <input
                    type="file"
                    accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
                <p className="mt-1 text-[11px] text-[#52606d]">
                  {uploadFile ? uploadFile.name : "Select master .xlsx file from your computer"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded border border-[#e5dfd5] bg-[#faf8f4] p-3 text-xs">
              <input
                type="checkbox"
                id="activateImmediately"
                checked={activateImmediately}
                onChange={(e) => setActivateImmediately(e.target.checked)}
                className="h-4 w-4 rounded border-[#dcd7ce] text-[#7b1e1e] focus:ring-[#7b1e1e]"
              />
              <label htmlFor="activateImmediately" className="font-semibold text-[#1f2933] cursor-pointer">
                Activate immediately upon successful upload
              </label>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsUploadOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleUploadSubmit}
              disabled={uploadTemplateMutation.isPending || !uploadFileBase64}
              className="gap-1.5 bg-[#7b1e1e] text-white hover:bg-[#641818] text-xs font-semibold"
            >
              {uploadTemplateMutation.isPending ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              <span>Upload &amp; Validate Template</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
