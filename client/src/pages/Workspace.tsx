import { EmptyWorkspace } from "@/components/EmptyWorkspace";
import { PurchaseRequestHistory } from "@/components/PurchaseRequestHistory";
import { useAuth } from "@/_core/hooks/useAuth";
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
import { OfficeSelect } from "@/components/OfficeSelect";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { IntegratedPreCanvassModal } from "@/components/IntegratedPreCanvassModal";
import { AuditHistoryDrawer, QuietCompliancePill } from "@/components/compliance";
import { trpc } from "@/lib/trpc";
import { formatFriendlyError } from "@/lib/formatError";
import { countValidPreCanvassQuotes, detectMixedCategories, hasRequiredSupplierQuotations, normalizeProcurementRole, SECTION_5_1_1_CATEGORIES } from "../../../shared/procurementRules";
import { AlertTriangle, ArrowLeft, ArrowRight, Download, Eye, CheckCircle2, CircleAlert, ChevronDown, ChevronUp, ExternalLink, FileCheck, FileCheck2, FileSearch, FileText, Folder, Info, LoaderCircle, MailCheck, Plus, PlusCircle, Search, Send, ShieldAlert, Star, Trash2, Upload, UploadCloud, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearch } from "wouter";
import { toast } from "sonner";

type WorkspaceKind = "rfq" | "po" | "plans" | "suppliers" | "budgets" | "analytics" | "audit";
type RequestItem = { catalogItemId: string; stockPropertyNo: string; description: string; specification: string; quantity: string; unit: string; estimatedUnitCost: string };

interface PrCreationDraft {
  isCreating: boolean;
  currentStep: 1 | 2 | 3 | 4;
  ppmpOfficeId: string;
  ppmpObjectId: string;
  customPpmpBudget: string;
  customPpmpTitle: string;
  customPpmpYear: number;
  customFundSource: string;
  uploadedFile: { name: string; type: string; size: number; base64: string } | null;
  marketScopingFile: { name: string; type: string; size: number; base64: string } | null;
  preCanvassFile: { name: string; type: string; size: number; base64: string } | null;
  selectedCategory: string;
  items: RequestItem[];
  purpose: string;
  requestedSignatoryChoice: string;
  approvedSignatoryChoice: string;
  updatedAt: number;
}

let inMemoryPrDraft: Partial<PrCreationDraft> | null = null;

function loadPrDraft(): Partial<PrCreationDraft> | null {
  if (inMemoryPrDraft) return inMemoryPrDraft;
  try {
    const raw = localStorage.getItem("procurewise.prCreationDraft") || sessionStorage.getItem("procurewise.prCreationDraft");
    if (raw) {
      const parsed = JSON.parse(raw);
      inMemoryPrDraft = parsed;
      return parsed;
    }
  } catch {}
  return null;
}

function savePrDraft(draft: Partial<PrCreationDraft>) {
  inMemoryPrDraft = { ...(inMemoryPrDraft || {}), ...draft, updatedAt: Date.now() };
  try {
    const serialized = JSON.stringify(inMemoryPrDraft);
    localStorage.setItem("procurewise.prCreationDraft", serialized);
    sessionStorage.setItem("procurewise.prCreationDraft", serialized);
  } catch {
    try {
      const lightweight = {
        ...inMemoryPrDraft,
        uploadedFile: inMemoryPrDraft.uploadedFile ? { name: inMemoryPrDraft.uploadedFile.name, type: inMemoryPrDraft.uploadedFile.type, size: inMemoryPrDraft.uploadedFile.size, base64: "" } : null,
        marketScopingFile: inMemoryPrDraft.marketScopingFile ? { name: inMemoryPrDraft.marketScopingFile.name, type: inMemoryPrDraft.marketScopingFile.type, size: inMemoryPrDraft.marketScopingFile.size, base64: "" } : null,
        preCanvassFile: inMemoryPrDraft.preCanvassFile ? { name: inMemoryPrDraft.preCanvassFile.name, type: inMemoryPrDraft.preCanvassFile.type, size: inMemoryPrDraft.preCanvassFile.size, base64: "" } : null,
      };
      localStorage.setItem("procurewise.prCreationDraft", JSON.stringify(lightweight));
      sessionStorage.setItem("procurewise.prCreationDraft", JSON.stringify(inMemoryPrDraft));
    } catch {}
  }
}

function clearPrDraft() {
  inMemoryPrDraft = null;
  try {
    localStorage.removeItem("procurewise.prCreationDraft");
    sessionStorage.removeItem("procurewise.prCreationDraft");
    sessionStorage.removeItem("procurewise.prWizardStep");
  } catch {}
}

function DocumentPreviewDialog({
  doc,
  onClose,
}: {
  doc: {
    title: string;
    file: { name: string; type: string; size: number; base64: string };
  } | null;
  onClose: () => void;
}) {
  const blobUrl = useMemo(() => {
    if (!doc?.file?.base64) return null;
    try {
      const byteCharacters = atob(doc.file.base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const mime =
        doc.file.type ||
        (doc.file.name.toLowerCase().endsWith(".pdf")
          ? "application/pdf"
          : doc.file.name.toLowerCase().endsWith(".xlsx")
          ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          : doc.file.name.toLowerCase().endsWith(".docx")
          ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          : "application/octet-stream");
      const blob = new Blob([byteArray], { type: mime });
      return URL.createObjectURL(blob);
    } catch {
      return null;
    }
  }, [doc]);

  useEffect(() => {
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [blobUrl]);

  if (!doc) return null;

  const isPdf =
    doc.file.name.toLowerCase().endsWith(".pdf") ||
    doc.file.type.toLowerCase().includes("pdf");
  const isImage =
    doc.file.type.toLowerCase().startsWith("image/") ||
    /\.(jpg|jpeg|png|webp|gif)$/i.test(doc.file.name);

  return (
    <Dialog open={Boolean(doc)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[95vw] sm:max-w-4xl lg:max-w-5xl max-h-[92vh] flex flex-col p-6 bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700">
        <DialogHeader className="border-b pb-3 dark:border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <FileText className="h-5 w-5 text-[#881337] dark:text-rose-400" />
                <span>{doc.title}</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {doc.file.name} · {(doc.file.size / 1024).toFixed(1)} KB · Verified Attachment
              </DialogDescription>
            </div>
            {blobUrl && (
              <a
                href={blobUrl}
                download={doc.file.name}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <Download className="h-3.5 w-3.5" />
                Download / Open
              </a>
            )}
          </div>
        </DialogHeader>

        <div className="my-3 flex-1 overflow-auto min-h-[450px] max-h-[65vh] rounded-xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-950/60 flex items-center justify-center">
          {blobUrl && isPdf ? (
            <iframe
              src={blobUrl}
              title={`Preview of ${doc.file.name}`}
              className="h-full w-full min-h-[550px] rounded-lg bg-white"
            />
          ) : blobUrl && isImage ? (
            <img
              src={blobUrl}
              alt={doc.file.name}
              className="max-h-[60vh] max-w-full rounded-lg object-contain shadow-sm"
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center max-w-md">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 mb-4">
                <FileCheck2 className="h-8 w-8" />
              </div>
              <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {doc.file.name}
              </h4>
              <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                This document is verified and attached to your procurement package. You can open or download it to view all contents locally.
              </p>
              {blobUrl && (
                <a
                  href={blobUrl}
                  download={doc.file.name}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#881337] px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#70102e]"
                >
                  <Download className="h-4 w-4" />
                  Download &amp; Open Document
                </a>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="border-t pt-3 dark:border-slate-800">
          <Button type="button" variant="outline" onClick={onClose} className="h-9">
            Close Preview
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DocumentUploadCard({
  title,
  badge,
  subtitle,
  acceptedFormats,
  file,
  isDragging,
  onDragOver,
  onDragLeave,
  onDrop,
  onBrowseClick,
  onPreview,
  onRemove,
  fileInputRef,
  inputAccept,
  onFileInputChange,
  inputId,
}: {
  title: string;
  badge: string;
  subtitle: string;
  acceptedFormats: string;
  file: { name: string; size: number } | null;
  isDragging: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onBrowseClick: () => void;
  onPreview?: () => void;
  onRemove: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null> | React.RefObject<HTMLInputElement>;
  inputAccept: string;
  onFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  inputId: string;
}) {
  return (
    <div className="flex flex-col justify-between rounded-xl border-2 border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/40">
      <div>
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
            <FileText className={`h-4 w-4 ${file ? "text-emerald-600 dark:text-emerald-400" : "text-[#881337] dark:text-rose-400"}`} />
            {title}
          </span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
            file
              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
              : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
          }`}>
            {file ? "Attached" : badge}
          </span>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-snug mb-3">
          {subtitle}
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept={inputAccept}
          onChange={onFileInputChange}
          className="hidden"
          id={inputId}
        />

        {!file ? (
          <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            className={`min-h-[140px] rounded-lg border-2 border-dashed p-4 flex flex-col items-center justify-center text-center transition-colors ${
              isDragging
                ? "border-[#881337] bg-rose-50/80 dark:border-rose-400 dark:bg-rose-950/40"
                : "border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-900"
            }`}
          >
            <UploadCloud className="h-7 w-7 text-[#881337] dark:text-rose-400" aria-hidden="true" />
            <p className="mt-2 text-xs font-bold text-slate-900 dark:text-slate-100">
              Drag file here
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
              {acceptedFormats}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onBrowseClick}
              className="mt-3 h-8 border-slate-300 px-3 text-xs font-semibold dark:border-slate-700"
            >
              <Folder className="mr-1.5 h-3.5 w-3.5 text-[#881337] dark:text-rose-400" />
              Browse File
            </Button>
          </div>
        ) : (
          <div className="min-h-[140px] rounded-lg border-2 border-emerald-300 bg-emerald-50/80 p-3.5 dark:border-emerald-800 dark:bg-emerald-950/30 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span className="text-xs font-bold truncate" title={file.name}>
                  {file.name}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-emerald-700 dark:text-emerald-400 pl-5.5">
                {(file.size / 1024).toFixed(1)} KB · Verified Document
              </p>
            </div>
            <div className="mt-3 flex items-center gap-1.5 pt-2 border-t border-emerald-200 dark:border-emerald-800">
              {onPreview && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onPreview}
                  className="h-7 flex-1 border-blue-400 bg-white text-[11px] font-semibold text-blue-800 hover:bg-blue-50 dark:border-blue-700 dark:bg-slate-900 dark:text-blue-300"
                >
                  <Eye className="mr-1 h-3 w-3" />
                  Preview
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onBrowseClick}
                className="h-7 flex-1 border-emerald-400 bg-white text-[11px] font-semibold text-emerald-800 hover:bg-emerald-50 dark:border-emerald-700 dark:bg-slate-900 dark:text-emerald-300"
              >
                <Upload className="mr-1 h-3 w-3" />
                Change
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onRemove}
                className="h-7 border-rose-300 bg-white px-2 text-[11px] font-semibold text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:bg-slate-900 dark:text-rose-400"
                title="Remove file"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CatalogItemPicker({
  value,
  catalogItems,
  favoriteIds,
  onSelect,
  onClear,
}: {
  value: string;
  catalogItems: Array<{ id: number; productCode: string; description: string; referencePrice: string; unit?: string | null }>;
  favoriteIds: Set<number>;
  onSelect: (item: { id: number; productCode: string; description: string; referencePrice: string; unit?: string | null }) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selectedItem = useMemo(() => {
    if (!value || value === "manual-item") return null;
    return catalogItems.find((item) => String(item.id) === String(value)) || null;
  }, [value, catalogItems]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return catalogItems;
    return catalogItems.filter(
      (item) =>
        item.productCode.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q)
    );
  }, [catalogItems, search]);

  return (
    <div className="relative">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex min-h-11 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 dark:border-slate-700"
          >
            {selectedItem ? (
              <div className="flex w-full items-center justify-between gap-3 text-left">
                <div className="flex items-center gap-1.5 truncate">
                  {favoriteIds.has(selectedItem.id) && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500 shrink-0" />}
                  <span className="font-mono font-semibold text-slate-700 dark:text-slate-300 shrink-0">{selectedItem.productCode}</span>
                  <span className="text-slate-400">—</span>
                  <span className="truncate font-medium text-slate-900 dark:text-slate-100">{selectedItem.description}</span>
                </div>
                <div className="shrink-0 text-right">
                  <span className="rounded bg-rose-50 px-2 py-0.5 font-mono text-xs font-bold text-[#881337] dark:bg-rose-950/60 dark:text-rose-300">
                    ₱{Number(selectedItem.referencePrice).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            ) : (
              <span className="text-muted-foreground text-xs sm:text-sm">
                Manual entry — type specifications directly below or click to search catalog...
              </span>
            )}
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[340px] max-w-[650px] p-0" align="start">
          <div className="border-b border-border p-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Type item code or name to filter catalog items..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 pl-8 text-xs"
                autoFocus
              />
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto divide-y divide-border/60">
            <button
              type="button"
              onClick={() => {
                onClear();
                setOpen(false);
              }}
              className="flex w-full items-center justify-between px-3 py-2 text-left text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <span>Manual entry — type specifications directly below</span>
              {!selectedItem && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}
            </button>
            {filteredItems.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">
                No catalog items match "{search}". You can type manual specifications directly below.
              </div>
            ) : (
              filteredItems.map((catItem) => (
                <button
                  type="button"
                  key={catItem.id}
                  onClick={() => {
                    onSelect(catItem);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-xs transition-colors hover:bg-[#fff9f0] dark:hover:bg-[#252c34] ${
                    selectedItem?.id === catItem.id ? "bg-rose-50/70 font-semibold dark:bg-rose-950/40" : ""
                  }`}
                >
                  <div className="flex items-center gap-1.5 truncate pr-2">
                    {favoriteIds.has(catItem.id) && (
                      <Star className="h-3 w-3 fill-amber-400 text-amber-500 shrink-0" />
                    )}
                    <span className="font-mono font-bold text-slate-600 dark:text-slate-400 shrink-0">
                      {catItem.productCode}
                    </span>
                    <span className="text-slate-300 dark:text-slate-600">—</span>
                    <span className="truncate text-slate-900 dark:text-slate-100 font-medium">
                      {catItem.description}
                    </span>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="rounded bg-rose-50 px-2 py-0.5 font-mono text-xs font-bold text-[#881337] dark:bg-rose-950/70 dark:text-rose-300 whitespace-nowrap">
                      ₱{Number(catItem.referencePrice).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}


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
  const { user } = useAuth();
  const role = user ? normalizeProcurementRole(user.role) : "end_user";

  if (role !== "end_user" && role !== "admin") {
    return (
      <div className="mx-auto max-w-[1240px] px-4 py-16 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400">
          <CircleAlert className="h-7 w-7" />
        </div>
        <h2 className="mt-4 text-xl font-bold text-foreground">Access Restricted: End-User Workspace Only</h2>
        <p className="mx-auto mt-2 max-w-lg text-xs leading-relaxed text-muted-foreground">
          The PPMP-linked Purchase Requests module and creation workspace is strictly restricted to the End-User / Requesting Unit.
          Procurement Staff, Procurement Officers, BAC members, Budget Officers, and HoPE must manage procurement records from their designated modules.
        </p>
        <div className="mt-6">
          <Button asChild className="bg-rose-700 hover:bg-rose-800 text-white text-xs">
            <a href="/dashboard">Return to Dashboard</a>
          </Button>
        </div>
      </div>
    );
  }

  const search = useSearch();
  const searchParams = new URLSearchParams(search);
  const [catalogSelection] = useState<Array<{ id: number; quantity: string }>>(() => { try { return JSON.parse(sessionStorage.getItem("procurewise.catalogSelection") || "[]") as Array<{ id: number; quantity: string }>; } catch { return []; } });
  const catalogItemIds = useMemo(() => catalogSelection.map((item) => item.id), [catalogSelection]);
  const [isCreating, setIsCreating] = useState(() => {
    if (searchParams.get("create") === "1") return true;
    const draft = loadPrDraft();
    return Boolean(draft?.isCreating);
  });
  const [activeCanvassPr, setActiveCanvassPr] = useState<{ id: number; prNumber: string; purpose: string; totalEstimate: string; officeId?: number; status: string } | null>(null);

  useEffect(() => {
    const count = Number(sessionStorage.getItem("procurewise.catalogSelectionNotice") || 0);
    if (!count) return;
    sessionStorage.removeItem("procurewise.catalogSelectionNotice");
    toast.success(`${count} catalog item${count === 1 ? "" : "s"} loaded into this new Purchase Request.`);
  }, []);
  const utils = trpc.useUtils();
  const purchaseRequests = trpc.procurement.purchaseRequests.list.useQuery(undefined, { retry: false });
  const setup = trpc.procurement.setup.details.useQuery(undefined, { retry: false });
  const dashboard = trpc.procurement.dashboard.useQuery(undefined, { retry: false });
  const submitRequest = trpc.procurement.purchaseRequests.advance.useMutation({
    onSuccess: () => { toast.success("Complete procurement package forwarded to the Procurement Officer."); void utils.procurement.purchaseRequests.list.invalidate(); void utils.procurement.dashboard.invalidate(); },
    onError: (error) => toast.error(formatFriendlyError(error)),
  });
  const rejectRequest = trpc.procurement.purchaseRequests.reject.useMutation({
    onSuccess: () => { toast.success("Purchase Request rejected and the employee was notified."); void utils.procurement.purchaseRequests.list.invalidate(); void utils.procurement.dashboard.invalidate(); },
    onError: (error) => toast.error(formatFriendlyError(error)),
  });
  const resubmitRequest = trpc.procurement.purchaseRequests.resubmit.useMutation({
    onSuccess: () => { toast.success("Corrected package resubmitted to the Procurement Officer."); setResubmitFiles([]); setResubmitRemarks(""); void utils.procurement.purchaseRequests.list.invalidate(); void utils.procurement.dashboard.invalidate(); },
    onError: (error) => toast.error(formatFriendlyError(error)),
  });
  const [resubmitFiles, setResubmitFiles] = useState<Array<{ name: string; type: string; size: number; base64: string }>>([]);
  const [resubmitRemarks, setResubmitRemarks] = useState("");
  const resubmitFileInputRef = useRef<HTMLInputElement>(null);

  const handleResubmitFile = (file: File) => {
    if (!/\.(pdf|xlsx|xls|docx|doc|png|jpe?g)$/i.test(file.name)) {
      toast.error("Choose a PDF, Excel, Word, or image document.");
      return;
    }
    if (file.size > 14 * 1024 * 1024) {
      toast.error("File exceeds 14MB limit. Please upload a smaller document.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      setResubmitFiles((prev) => [...prev, { name: file.name, type: file.type, size: file.size, base64 }]);
      toast.success(`Attached corrected document: ${file.name}`);
    };
    reader.readAsDataURL(file);
  };

  const handleResubmit = async (purchaseRequestId: number) => {
    for (const file of resubmitFiles) {
      try {
        await attachDocumentMutation.mutateAsync({
          entityType: "purchase_request",
          entityId: purchaseRequestId,
          documentType: "Corrected Attachment",
          originalFileName: file.name,
          mimeType: file.type || "application/octet-stream",
          dataBase64: file.base64,
        });
      } catch (attachErr: any) {
        toast.warning(`Document ${file.name} could not be attached: ${attachErr.message || "upload issue"}`);
      }
    }
    resubmitRequest.mutate({ purchaseRequestId, remarks: resubmitRemarks.trim() || undefined });
  };
    const advanceRequestMutation = trpc.procurement.purchaseRequests.advance.useMutation();
  const createPreCanvassMutation = trpc.procurement.preCanvasses.create.useMutation();
  const createPpmpMutation = trpc.procurement.setup.createAppPpmpEntry.useMutation();
  const attachDocumentMutation = trpc.procurement.documents.attach.useMutation();
  const [isSubmittingPackage, setIsSubmittingPackage] = useState(false);

  const createRequest = trpc.procurement.purchaseRequests.create.useMutation({
    onSuccess: (created) => {
      void navigator.clipboard?.writeText(created.trackingToken);
      clearPrDraft();
      setIsCreating(false);
      void utils.procurement.purchaseRequests.list.invalidate();
      void utils.procurement.dashboard.invalidate();
    },
    onError: (error) => toast.error(formatFriendlyError(error)),
  });

  const handleCreatePurchaseRequest = async (
    input: Parameters<typeof createRequest.mutateAsync>[0],
    uploadedPpmpFile?: { name: string; type: string; size: number; base64: string } | null,
    newPpmpData?: { title: string; fiscalYear: number; plannedAmount?: number } | null,
    marketScopingFile?: { name: string; type: string; size: number; base64: string } | null,
    preCanvassFile?: { name: string; type: string; size: number; base64: string } | null
  ) => {
    setIsSubmittingPackage(true);
    try {
      let resolvedPpmpId = input.ppmpEntryId;

      if (!resolvedPpmpId && newPpmpData) {
        const estTotal = input.items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.estimatedUnitCost) || 0), 0);
        const ceiling = Number(newPpmpData.plannedAmount) || 0;
        if (ceiling > 0 && estTotal > ceiling + 0.01) {
          toast.error(
            `Total Estimated Cost (₱${estTotal.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}) exceeds the Approved PPMP Budget Ceiling of ₱${ceiling.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`
          );
          return;
        }
        const createdPpmp = await createPpmpMutation.mutateAsync({
          fiscalYear: newPpmpData.fiscalYear,
          officeId: input.officeId,
          objectOfExpenditureId: input.objectOfExpenditureId,
          description: newPpmpData.title.trim() || input.purpose.trim() || "Annual Department PPMP",
          plannedAmount: ceiling > 0 ? ceiling : Math.max(estTotal, 1000),
          fundSource: input.fundSource,
          modeOfProcurement: "Small Value Procurement",
        });
        resolvedPpmpId = createdPpmp.id;
        void utils.procurement.dashboard.invalidate();
      }

      const created = await createRequest.mutateAsync({
        ...input,
        ppmpEntryId: resolvedPpmpId,
      });

      // 1. Attach PPMP
      if (uploadedPpmpFile) {
        try {
          await attachDocumentMutation.mutateAsync({
            entityType: "purchase_request",
            entityId: created.id,
            documentType: "Project Procurement Management Plan (PPMP)",
            originalFileName: uploadedPpmpFile.name,
            mimeType: uploadedPpmpFile.type || "application/pdf",
            dataBase64: uploadedPpmpFile.base64,
          });

          if (resolvedPpmpId) {
            void attachDocumentMutation.mutateAsync({
              entityType: "app_ppmp_entry",
              entityId: resolvedPpmpId,
              documentType: "Approved PPMP Document",
              originalFileName: uploadedPpmpFile.name,
              mimeType: uploadedPpmpFile.type || "application/pdf",
              dataBase64: uploadedPpmpFile.base64,
            }).catch(() => {});
          }
        } catch (attachErr: any) {
          console.warn("PPMP attachment notice:", attachErr);
        }
      }

      // 2. Attach Market Scoping
      if (marketScopingFile) {
        try {
          await attachDocumentMutation.mutateAsync({
            entityType: "purchase_request",
            entityId: created.id,
            documentType: "Market Scoping",
            originalFileName: marketScopingFile.name,
            mimeType: marketScopingFile.type || "application/octet-stream",
            dataBase64: marketScopingFile.base64,
          });
        } catch (attachErr: any) {
          console.warn("Market Scoping attachment notice:", attachErr);
        }
      }

      // 3. Attach Pre-Canvass Form
      let createdPreCanvassId: number | null = null;
      try {
        const pc = await createPreCanvassMutation.mutateAsync({
          purchaseRequestId: created.id,
          approvedBudget: Number(created.totalEstimate),
          deliveryPeriodDays: 30,
          priceEvaluationMode: "lot_basis",
        });
        createdPreCanvassId = pc.id;
      } catch (pcErr: any) {
        console.warn("PreCanvass initialization notice:", pcErr);
      }

      if (preCanvassFile) {
        try {
          await attachDocumentMutation.mutateAsync({
            entityType: "purchase_request",
            entityId: created.id,
            documentType: "Pre-Canvass Form",
            originalFileName: preCanvassFile.name,
            mimeType: preCanvassFile.type || "application/pdf",
            dataBase64: preCanvassFile.base64,
          });

          if (createdPreCanvassId) {
            await attachDocumentMutation.mutateAsync({
              entityType: "pre_canvass",
              entityId: createdPreCanvassId,
              documentType: "Preliminary Abstract of Quotations",
              originalFileName: preCanvassFile.name,
              mimeType: preCanvassFile.type || "application/pdf",
              dataBase64: preCanvassFile.base64,
            }).catch(() => {});
          }
        } catch (attachErr: any) {
          console.warn("Pre-Canvass attachment notice:", attachErr);
        }
      }

      // 4. Advance PR directly to procurement_review (for Procurement Officer verification)
      try {
        await advanceRequestMutation.mutateAsync({
          purchaseRequestId: created.id,
        });
      } catch (advErr: any) {
        console.warn("Advance to procurement_review notice:", advErr);
      }

      clearPrDraft();
      setIsCreating(false);
      toast.success(`Purchase Request ${created.prNumber} successfully submitted and forwarded to Procurement Officer for verification!`);
      void utils.procurement.purchaseRequests.list.invalidate();
      void utils.procurement.dashboard.invalidate();
    } catch (err: any) {
      toast.error(err.message || "Failed to create Purchase Request.");
    } finally {
      setIsSubmittingPackage(false);
    }
  };

  const [selectedPrId, setSelectedPrId] = useState<number | null>(null);

  const selectedPr = useMemo(() => {
    if (!purchaseRequests.data?.length) return null;
    if (selectedPrId) {
      const found = purchaseRequests.data.find((p) => p.id === selectedPrId);
      if (found) return found;
    }
    return purchaseRequests.data[0];
  }, [purchaseRequests.data, selectedPrId]);

  const [creationInitialMode, setCreationInitialMode] = useState<"upload" | "existing">("upload");

  return <div className="content-shell">
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
      <PageHeader
        eyebrow="End-User package"
        title="PPMP-linked Purchase Requests"
        description="Every Purchase Request must originate from an approved Department PPMP. Establish or link your PPMP first, prepare itemized line items, and complete the preliminary 3-supplier pre-canvass."
      />
      {!isCreating && (
        <div className="flex items-center gap-2 shrink-0 pt-2">
          <Button
            onClick={() => {
              setCreationInitialMode("upload");
              savePrDraft({ isCreating: true });
              setIsCreating(true);
            }}
            className="h-9 rounded-[4px] bg-[#7b1e1e] text-xs font-semibold text-white hover:bg-[#641818] dark:bg-[#d65c50] dark:hover:bg-[#eb766a] shadow-xs"
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Create purchase request
          </Button>
        </div>
      )}
    </div>
    {isCreating ? <PurchaseRequestForm setup={setup.data} ppmpEntries={dashboard.data?.appPpmpEntries} catalogItemIds={catalogItemIds} catalogSelection={catalogSelection} isSaving={isSubmittingPackage || createRequest.isPending} initialMode={creationInitialMode} onCancel={() => { setIsCreating(false); savePrDraft({ isCreating: false }); }} onCreate={handleCreatePurchaseRequest} /> : (
      <div className="mt-7">
        {purchaseRequests.isLoading ? <LoadingPanel label="Loading Purchase Requests" /> : purchaseRequests.data?.length ? <>
          <PurchaseRequestTable
            records={purchaseRequests.data}
            preCanvasses={dashboard.data?.preCanvasses ?? []}
            preCanvassQuotes={dashboard.data?.preCanvassQuotes ?? []}
            canReject={Boolean(user && ["procurement_officer", "administrative_approver", "admin"].includes(normalizeProcurementRole(user.role)))}
            onSubmit={(purchaseRequestId) => {
              setSelectedPrId(purchaseRequestId);
              submitRequest.mutate({ purchaseRequestId });
            }}
            onReject={(purchaseRequestId, reason) => rejectRequest.mutate({ purchaseRequestId, reason })}
            onResubmit={(purchaseRequestId) => handleResubmit(purchaseRequestId)}
            resubmittingId={resubmitRequest.isPending ? resubmitRequest.variables?.purchaseRequestId : undefined}
            onOpenCanvass={(pr) => {
              setSelectedPrId(pr.id);
              setActiveCanvassPr(pr);
            }}
            submittingId={submitRequest.isPending ? submitRequest.variables?.purchaseRequestId : undefined}
            selectedPrId={selectedPr?.id}
            onSelectPr={(id) => setSelectedPrId(id)}
          />
          {selectedPr?.status === "returned" && (
            <div className="mt-5 rounded-[4px] border border-[#e4c88a] bg-[#fffaf0] p-4 sm:p-5 dark:border-[#8a6a1f] dark:bg-[#2a2010]">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#9a6d19] dark:text-[#f0c36a]" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[#79551a] dark:text-[#f0c36a]">This package was returned for correction — action needed</p>
                  <p className="mt-1 text-xs leading-5 text-[#75643e] dark:text-[#d9c58e]">
                    Review the reviewer comments in the history, make the requested changes, attach any corrected documents below, then resubmit. The resubmitted package goes back to the Procurement Officer for verification.
                  </p>
                  <input
                    ref={resubmitFileInputRef}
                    type="file"
                    accept=".pdf,.xlsx,.xls,.docx,.doc,.png,.jpg,.jpeg"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) handleResubmitFile(file);
                      event.target.value = "";
                    }}
                  />
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => resubmitFileInputRef.current?.click()}
                      className="h-8 rounded-[4px] border-[#d8c39a] text-xs font-semibold text-[#79551a] hover:bg-[#fdf4dd] dark:border-[#8a6a1f] dark:text-[#f0c36a] dark:hover:bg-[#3a2d12]"
                    >
                      <Upload className="mr-1.5 h-3.5 w-3.5" />
                      Upload corrected document
                    </Button>
                    <Button
                      size="sm"
                      disabled={resubmitRequest.isPending}
                      onClick={() => selectedPr && handleResubmit(selectedPr.id)}
                      className="h-8 rounded-[4px] bg-[#9a6d19] text-xs font-semibold text-white hover:bg-[#7e5712] dark:bg-[#b98a2b] dark:hover:bg-[#a1771f]"
                    >
                      {resubmitRequest.isPending ? <LoaderCircle className="mr-1.5 h-3.5 w-3.5 animate-spin text-white" /> : <FileCheck2 className="mr-1.5 h-3.5 w-3.5" />}
                      Update and Resubmit
                    </Button>
                  </div>
                  {resubmitFiles.length > 0 && (
                    <ul className="mt-3 space-y-1">
                      {resubmitFiles.map((file, index) => (
                        <li key={index} className="flex items-center justify-between gap-2 rounded-[4px] bg-white/70 px-2.5 py-1.5 text-xs text-[#5c4d21] dark:bg-black/20 dark:text-[#e6d9ae]">
                          <span className="truncate">{file.name} · {(file.size / 1024).toFixed(0)} KB</span>
                          <button type="button" onClick={() => setResubmitFiles((prev) => prev.filter((_, i) => i !== index))} className="shrink-0 text-[#9c2525] hover:underline dark:text-[#ff837a]">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-3">
                    <Label className="text-xs text-[#75643e] dark:text-[#d9c58e]">Remarks for the Procurement Officer (optional)</Label>
                    <Textarea
                      value={resubmitRemarks}
                      onChange={(event) => setResubmitRemarks(event.target.value)}
                      placeholder="Describe the corrections you made..."
                      className="mt-1.5 min-h-16 border-[#d8c39a] bg-white/70 text-xs dark:border-[#8a6a1f] dark:bg-black/20"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
          <WorkflowTimeline
            status={selectedPr?.status ?? "draft"}
            pr={selectedPr}
            allPrs={purchaseRequests.data}
            onSelectPr={(id) => setSelectedPrId(id)}
          />
        </> : <EmptyWorkspace eyebrow="Purchase Request register" title="No PPMP-linked Purchase Requests have been submitted." description="Start with PPMP planning, prepare the PR and PPMP, complete the preliminary pre-canvass quotations, then submit the three-file package to Procurement." actionLabel="Create your first PR" actionOnClick={() => setIsCreating(true)} />}
      </div>
    )}

    {activeCanvassPr && (
      <IntegratedPreCanvassModal
        open={Boolean(activeCanvassPr)}
        onOpenChange={(open) => {
          if (!open) setActiveCanvassPr(null);
        }}
        purchaseRequest={activeCanvassPr}
        onCompleted={() => {
          setActiveCanvassPr(null);
          void utils.procurement.purchaseRequests.list.invalidate();
          void utils.procurement.dashboard.invalidate();
        }}
      />
    )}
  </div>;
}

function PurchaseRequestTable({
  records,
  preCanvasses,
  preCanvassQuotes,
  canReject,
  onSubmit,
  onReject,
  onResubmit,
  onOpenCanvass,
  submittingId,
  resubmittingId,
  selectedPrId,
  onSelectPr,
}: {
  records: Array<{ id: number; prNumber: string; purpose: string; totalEstimate: string; status: string; createdAt: Date; rejectionCount?: number; rejectionReason?: string | null; officeId?: number }>;
  preCanvasses: Array<{ id: number; purchaseRequestId: number }>;
  preCanvassQuotes: Array<{ id: number; preCanvassId: number; supplierId?: number; totalPrice?: string | number }>;
  canReject: boolean;
  onSubmit: (purchaseRequestId: number) => void;
  onReject: (purchaseRequestId: number, reason: string) => void;
  onResubmit: (purchaseRequestId: number) => void;
  onOpenCanvass: (pr: { id: number; prNumber: string; purpose: string; totalEstimate: string; officeId?: number; status: string }) => void;
  submittingId?: number;
  resubmittingId?: number;
  selectedPrId?: number;
  onSelectPr?: (id: number) => void;
}) {
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [reason, setReason] = useState("");

  const getPrStatusDisplay = (status: string) => {
    switch (status) {
      case "draft":
        return { label: "DRAFT", tone: "draft" as const };
      case "procurement_review":
        return { label: "PENDING PO VERIFICATION", tone: "active" as const };
      case "approval_review":
        return { label: "VERIFIED BY PO", tone: "verified" as const };
      case "budget_review":
        return { label: "BUDGET REVIEW", tone: "pending" as const };
      case "supply_review":
        return { label: "SUPPLY REVIEW", tone: "pending" as const };
      case "bac_review":
        return { label: "BAC REVIEW", tone: "pending" as const };
      case "rfq":
        return { label: "CANVASS / RFQ", tone: "active" as const };
      case "po":
      case "po_issued":
        return { label: "PO PREPARED", tone: "verified" as const };
      case "approved":
        return { label: "APPROVED", tone: "approved" as const };
      case "delivered":
        return { label: "DELIVERED", tone: "approved" as const };
      case "returned":
        return { label: "RETURNED FOR REVISION", tone: "returned" as const };
      case "rejected":
        return { label: "REJECTED", tone: "returned" as const };
      case "closed":
      case "pmr_logged":
        return { label: "CLOSED / PMR LOGGED", tone: "draft" as const };
      default:
        return { label: status.replaceAll("_", " ").toUpperCase(), tone: "pending" as const };
    }
  };

  const sortedRecords = useMemo(() => {
    return [...records].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() ||
        b.id - a.id
    );
  }, [records]);

  // Helper to count quotes for a PR using unified validation helper
  const getQuotesCount = (prId: number) => {
    const pc = preCanvasses.find((item) => item.purchaseRequestId === prId);
    if (!pc) return 0;
    return countValidPreCanvassQuotes(preCanvassQuotes, pc.id);
  };

  return <RecordTable><RecordTableHeader><tr><th className="px-4 py-3 font-semibold">PR number</th><th className="px-4 py-3 font-semibold">Purpose</th><th className="px-4 py-3 font-semibold">Amount</th><th className="px-4 py-3 font-semibold">Status / history</th><th className="px-4 py-3 font-semibold">Created</th><th className="px-4 py-3 font-semibold">Action</th></tr></RecordTableHeader><tbody className="divide-y divide-[#efebe4] dark:divide-[#46515c]">{sortedRecords.map((record) => {
    const quotesCount = getQuotesCount(record.id);
    const hasEnoughQuotes = hasRequiredSupplierQuotations(quotesCount);

    return <tr key={record.id} onClick={() => onSelectPr?.(record.id)} className={`cursor-pointer transition-colors ${selectedPrId === record.id ? "bg-[#fbf7f0] dark:bg-[#2b3540] ring-1 ring-inset ring-[#7b1e1e]/25 dark:ring-[#ff837a]/30" : "hover:bg-[#fdfcf9] dark:hover:bg-[#232c35]"}`}><td className="px-4 py-3 font-semibold text-[#7b1e1e] dark:text-[#ff837a]">{record.prNumber}<PurchaseRequestHistory purchaseRequestId={record.id} /></td><td className="max-w-[350px] px-4 py-3 text-[#3e4855] dark:text-[#f1f5f8]">{record.purpose}</td><td className="px-4 py-3 text-[#3e4855] dark:text-[#f1f5f8]">₱{Number(record.totalEstimate).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</td><td className="px-4 py-3">{(() => { const s = getPrStatusDisplay(record.status); return <StatusBadge tone={s.tone}>{s.label}</StatusBadge>; })()}{record.status === "draft" && <span className={`ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${hasEnoughQuotes ? "bg-[#eff9f2] text-[#27633b] dark:bg-[#1a3824] dark:text-[#8ce6aa]" : "bg-[#fffaf0] text-[#9a6d19] dark:bg-[#342817] dark:text-[#f0c36a]"}`}>{quotesCount < 3 ? `${quotesCount}/3 Canvass Quotes (Min 3)` : `${quotesCount}/10 Canvass Quotes`}</span>}{record.rejectionCount ? <p className="mt-1 text-[10px] text-[#9c2525] dark:text-[#ff837a]">Rejected {record.rejectionCount} time{record.rejectionCount === 1 ? "" : "s"}{record.rejectionReason ? `: ${record.rejectionReason}` : ""}</p> : null}</td><td className="px-4 py-3 text-[#74808c] dark:text-[#d1dae2]">{new Date(record.createdAt).toLocaleDateString("en-PH")}</td><td className="px-4 py-3">{rejectingId === record.id ? <div className="min-w-[220px]"><Textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Reason for rejection (required)" className="min-h-16 text-[11px]" /><div className="mt-2 flex gap-1.5"><Button size="sm" variant="outline" onClick={() => { setRejectingId(null); setReason(""); }} className="h-7 text-[10px]">Cancel</Button><Button size="sm" disabled={reason.trim().length < 10} onClick={() => { onReject(record.id, reason.trim()); setRejectingId(null); setReason(""); }} className="h-7 bg-[#9c2525] text-[10px] text-white hover:bg-[#7d1d1d]">Reject</Button></div></div> : <div className="flex flex-wrap gap-1.5">{record.status === "draft" && (
      <Button
        size="sm"
        onClick={() => onSubmit(record.id)}
        disabled={submittingId === record.id}
        className="h-7 rounded-[4px] bg-[#27633b] px-2.5 text-[10px] text-white hover:bg-[#1f5030] dark:bg-[#348e53] dark:text-white"
      >
        {submittingId === record.id ? <LoaderCircle className="mr-1 h-3 w-3 animate-spin text-white" /> : <Send className="mr-1 h-3 w-3" />}
        Forward Package
      </Button>
    )}
    {canReject && !["draft", "rejected", "delivered", "pmr_logged", "closed"].includes(record.status) && (
      <>
        <Button
          size="sm"
          onClick={() => onSubmit(record.id)}
          disabled={submittingId === record.id}
          className="h-7 rounded-[4px] bg-[#881337] px-2.5 text-[10px] font-medium text-white hover:bg-[#70102b] dark:bg-[#9f1239] dark:hover:bg-[#881337]"
        >
          {submittingId === record.id ? <LoaderCircle className="mr-1 h-3 w-3 animate-spin text-white" /> : <CheckCircle2 className="mr-1 h-3 w-3" />}
          {record.status === "approval_review" ? "Accept Package" : "Approve & Forward"}
        </Button>
        <Button size="sm" variant="outline" onClick={() => setRejectingId(record.id)} className="h-7 border-[#d8a7a7] px-2.5 text-[10px] text-[#9c2525] dark:border-[#ff837a] dark:text-[#ff837a]">
          Reject
        </Button>
      </>
    )}
    {record.status === "returned" && !canReject && (
      <Button
        size="sm"
        onClick={() => { onSelectPr?.(record.id); onResubmit(record.id); }}
        disabled={resubmittingId === record.id}
        className="h-7 rounded-[4px] bg-[#9a6d19] px-2.5 text-[10px] font-semibold text-white hover:bg-[#7e5712] dark:bg-[#b98a2b] dark:hover:bg-[#a1771f]"
      >
        {resubmittingId === record.id ? <LoaderCircle className="mr-1 h-3 w-3 animate-spin text-white" /> : <FileCheck2 className="mr-1 h-3 w-3" />}
        Update and Resubmit
      </Button>
    )}
    {record.status !== "draft" && record.status !== "returned" && !canReject && <span className="text-[11px] text-[#87909b] dark:text-[#aeb9c4]">{record.status === "delivered" ? "Final records in progress" : "In progress"}</span>}
  </div>}</td></tr>;
  })}</tbody></RecordTable>;
}

const BSC_PR_CATEGORIES = [
  "Office Supplies",
  "Hardware & Construction",
  "Computers & ICT Equipment",
  "Printing Services",
  "Food & Catering",
  "Janitorial & Cleaning",
  "Laboratory Supplies",
  "Sports & Athletic Goods",
  "Vehicle Maintenance & Fuel",
] as const;

const BSC_PR_UNITS = ["Ream", "Box", "Piece", "Pack", "Unit", "Lot", "Set"] as const;

const WIZARD_STEP_TITLES: Record<1 | 2 | 3 | 4, string> = {
  1: "Upload Your Approved Budget Plan",
  2: "Select Category and Add Items",
  3: "Purpose of Request & Market Scoping",
  4: "Review & Submit: Review Your Request Before Submitting",
};

const STRICT_PPMP_ACCEPT =
  ".pdf, .xlsx, .xls, application/pdf, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel";
const MAX_PPMP_BYTES = 10 * 1024 * 1024; // 10MB

function isStrictPpmpFileValid(file: File): boolean {
  const validExt = /\.(pdf|xlsx|xls)$/i.test(file.name.trim());
  const validMime =
    [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "application/octet-stream",
      "",
    ].includes(file.type) && validExt;
  const validSize = file.size > 0 && file.size <= MAX_PPMP_BYTES;
  return Boolean(validExt && validMime && validSize);
}

function PurchaseRequestForm({
  setup,
  ppmpEntries,
  catalogItemIds,
  catalogSelection,
  isSaving,
  initialMode = "upload",
  onCancel,
  onCreate,
}: {
  setup?: {
    offices: Array<{ id: number; code: string; name: string }>;
    objectsOfExpenditure: Array<{ id: number; code: string; name: string }>;
    settings: {
      entityName: string;
      authorizedOfficialName?: string | null;
      authorizedOfficialDesignation?: string | null;
    } | null;
  };
  ppmpEntries?: Array<{
    id: number;
    description: string;
    plannedAmount: string | null;
    fiscalYear: number;
    officeId: number;
    objectOfExpenditureId: number;
    fundSource?: string | null;
    modeOfProcurement?: string | null;
  }>;
  catalogItemIds: number[];
  catalogSelection: Array<{ id: number; quantity: string }>;
  isSaving: boolean;
  initialMode?: "upload" | "existing";
  onCancel: () => void;
  onCreate: (
    input: {
      purpose: string;
      category?: string;
      officeId: number;
      objectOfExpenditureId: number;
      ppmpEntryId?: number;
      fundSource?: string;
      fundCluster?: string;
      responsibilityCenterCode?: string;
      requesterDesignation?: string;
      requestedSignatoryId?: number;
      approvedSignatoryId?: number;
      items: Array<{
        catalogItemId?: number;
        stockPropertyNo?: string;
        description: string;
        specification?: string;
        quantity: number;
        unit: string;
        estimatedUnitCost: number;
      }>;
    },
    uploadedPpmpFile?: { name: string; type: string; size: number; base64: string } | null,
    newPpmpData?: { title: string; fiscalYear: number; plannedAmount?: number } | null,
    marketScopingFile?: { name: string; type: string; size: number; base64: string } | null,
    preCanvassFile?: { name: string; type: string; size: number; base64: string } | null
  ) => void;
}) {
  const utils = trpc.useUtils();
  const { user } = useAuth();
  const initialDraft = useMemo(() => loadPrDraft(), []);

  // Wizard Step (1: Upload Documents, 2: Items, 3: Purpose & Signatories, 4: Review)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(() => {
    return (initialDraft?.currentStep as 1 | 2 | 3 | 4) || 1;
  });

  // Step 1: PPMP & Documents state
  const [ppmpMode, setPpmpMode] = useState<"upload" | "existing">("upload");
  const [selectedPpmpId, setSelectedPpmpId] = useState<string>("");
  const [customPpmpTitle, setCustomPpmpTitle] = useState(() => initialDraft?.customPpmpTitle || "");
  const [customPpmpYear, setCustomPpmpYear] = useState<number>(() => initialDraft?.customPpmpYear || new Date().getFullYear());
  const [ppmpOfficeId, setPpmpOfficeId] = useState(() => initialDraft?.ppmpOfficeId || "");
  const [ppmpObjectId, setPpmpObjectId] = useState(() => initialDraft?.ppmpObjectId || "");
  const [customPpmpBudget, setCustomPpmpBudget] = useState(() => initialDraft?.customPpmpBudget || "");
  const [customFundSource, setCustomFundSource] = useState(() => initialDraft?.customFundSource || "General Appropriations Act");

  // Combined 3-Document Upload states
  const [uploadedFile, setUploadedFile] = useState<{ name: string; type: string; size: number; base64: string } | null>(
    () => initialDraft?.uploadedFile || null
  );
  const [marketScopingFile, setMarketScopingFile] = useState<{ name: string; type: string; size: number; base64: string } | null>(
    () => initialDraft?.marketScopingFile || null
  );
  const [previewingDoc, setPreviewingDoc] = useState<{
    title: string;
    file: { name: string; type: string; size: number; base64: string };
  } | null>(null);
  const [preCanvassFile, setPreCanvassFile] = useState<{ name: string; type: string; size: number; base64: string } | null>(
    () => initialDraft?.preCanvassFile || null
  );

  const [ppmpFileError, setPpmpFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingPpmpFile, setIsDraggingPpmpFile] = useState(false);

  const marketScopingFileInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingMarketScopingFile, setIsDraggingMarketScopingFile] = useState(false);

  const preCanvassFileInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingPreCanvassFile, setIsDraggingPreCanvassFile] = useState(false);

  // Office & Object preselection
  useEffect(() => {
    if (!ppmpOfficeId && setup?.offices?.length) {
      if (user?.officeName) {
        const match = setup.offices.find(
          (o) =>
            o.name.toLowerCase() === user.officeName!.toLowerCase() ||
            o.code.toLowerCase() === user.officeName!.toLowerCase() ||
            o.name.toLowerCase().includes(user.officeName!.toLowerCase()) ||
            user.officeName!.toLowerCase().includes(o.name.toLowerCase())
        );
        if (match) {
          setPpmpOfficeId(String(match.id));
          setOfficeId(String(match.id));
          return;
        }
      }
      setPpmpOfficeId(String(setup.offices[0].id));
      setOfficeId(String(setup.offices[0].id));
    }
  }, [user?.officeName, setup?.offices, ppmpOfficeId]);

  useEffect(() => {
    if (!ppmpObjectId && setup?.objectsOfExpenditure?.length) {
      setPpmpObjectId(String(setup.objectsOfExpenditure[0].id));
      setObjectId(String(setup.objectsOfExpenditure[0].id));
    }
  }, [setup?.objectsOfExpenditure, ppmpObjectId]);

  // Step 2: Category & Items state
  const [selectedCategory, setSelectedCategory] = useState<string>(() => initialDraft?.selectedCategory || "Office Supplies");
  const [items, setItems] = useState<RequestItem[]>(() => {
    if (initialDraft?.items && initialDraft.items.length > 0) {
      return initialDraft.items;
    }
    return [
      {
        catalogItemId: "",
        stockPropertyNo: "",
        description: "",
        specification: "",
        quantity: "1",
        unit: "Piece",
        estimatedUnitCost: "",
      },
    ];
  });

  // Step 3: Purpose & Signatories state
  const [purpose, setPurpose] = useState(() => initialDraft?.purpose || "");
  const [fundSource, setFundSource] = useState(() => initialDraft?.customFundSource || "General Appropriations Act");
  const [fundCluster, setFundCluster] = useState("01101101");
  const [responsibilityCenterCode, setResponsibilityCenterCode] = useState("");
  const [requestedSignatoryChoice, setRequestedSignatoryChoice] = useState(() => initialDraft?.requestedSignatoryChoice || "");
  const [approvedSignatoryChoice, setApprovedSignatoryChoice] = useState(() => initialDraft?.approvedSignatoryChoice || "");
  const [officeId, setOfficeId] = useState(() => initialDraft?.ppmpOfficeId || "");
  const [objectId, setObjectId] = useState(() => initialDraft?.ppmpObjectId || "");
  const [showAppendixPreview, setShowAppendixPreview] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  // Auto-save draft on every change
  useEffect(() => {
    savePrDraft({
      isCreating: true,
      currentStep,
      ppmpOfficeId: ppmpOfficeId || officeId,
      ppmpObjectId: ppmpObjectId || objectId,
      customPpmpBudget,
      customPpmpTitle,
      customPpmpYear,
      customFundSource,
      uploadedFile,
      marketScopingFile,
      preCanvassFile,
      selectedCategory,
      items,
      purpose,
      requestedSignatoryChoice,
      approvedSignatoryChoice,
    });
  }, [
    currentStep,
    ppmpOfficeId,
    officeId,
    ppmpObjectId,
    objectId,
    customPpmpBudget,
    customPpmpTitle,
    customPpmpYear,
    customFundSource,
    uploadedFile,
    marketScopingFile,
    preCanvassFile,
    selectedCategory,
    items,
    purpose,
    requestedSignatoryChoice,
    approvedSignatoryChoice,
  ]);

  // File Handlers
  const handlePpmpFile = (file?: File) => {
    if (!file) return;
    if (!isStrictPpmpFileValid(file)) {
      const errMsg = "File not accepted. Please upload only official PDF or Excel (.xlsx, .xls) files under 10MB.";
      setPpmpFileError(errMsg);
      toast.error(errMsg);
      return;
    }
    setPpmpFileError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      setUploadedFile({
        name: file.name,
        type: file.type || "application/pdf",
        size: file.size,
        base64,
      });
      if (!customPpmpTitle.trim()) {
        setCustomPpmpTitle(file.name.replace(/\.[^/.]+$/, ""));
      }
      toast.success(`Verified PPMP document: ${file.name}`);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    handlePpmpFile(event.target.files?.[0]);
    event.currentTarget.value = "";
  };

  const removeUploadedFile = () => {
    setUploadedFile(null);
    setPpmpFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleMarketScopingFile = (file?: File | null) => {
    if (!file) return;
    if (file.size > MAX_PPMP_BYTES) {
      toast.error("Market Scoping file exceeds the 10MB limit.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      setMarketScopingFile({
        name: file.name,
        type: file.type || "application/pdf",
        size: file.size,
        base64: result.includes(",") ? result.split(",")[1] : result,
      });
      toast.success(`Attached Market Scoping: ${file.name}`);
    };
    reader.readAsDataURL(file);
  };

  const removeMarketScopingFile = () => {
    setMarketScopingFile(null);
    if (marketScopingFileInputRef.current) marketScopingFileInputRef.current.value = "";
  };

  const handlePreCanvassFile = (file?: File | null) => {
    if (!file) return;
    if (file.size > MAX_PPMP_BYTES) {
      toast.error("Pre-Canvass file exceeds the 10MB limit.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      setPreCanvassFile({
        name: file.name,
        type: file.type || "application/pdf",
        size: file.size,
        base64: result.includes(",") ? result.split(",")[1] : result,
      });
      toast.success(`Attached Pre-Canvass Form: ${file.name}`);
    };
    reader.readAsDataURL(file);
  };

  const removePreCanvassFile = () => {
    setPreCanvassFile(null);
    if (preCanvassFileInputRef.current) preCanvassFileInputRef.current.value = "";
  };

  // Common-use Catalog queries
  const catalog = trpc.procurement.catalog.list.useQuery(undefined, { retry: false });
  const favorites = trpc.procurement.catalog.favorites.useQuery(undefined, { retry: false });
  const signatories = trpc.procurement.purchaseRequests.signatories.useQuery(undefined, { retry: false });
  const favoriteIds = useMemo(() => new Set((favorites.data ?? []).map((c) => c.id)), [favorites.data]);
  const catalogItems = useMemo(() => catalog.data?.items ?? [], [catalog.data?.items]);

  useEffect(() => {
    const selectedItems = (catalog.data?.items ?? []).filter((item) => catalogItemIds.includes(item.id));
    if (!selectedItems.length) return;
    const quantityById = new Map(catalogSelection.map((selection) => [selection.id, selection.quantity]));
    setItems((current) =>
      current.length === 1 && !current[0].description && !current[0].catalogItemId
        ? selectedItems.map((selected) => ({
            catalogItemId: String(selected.id),
            stockPropertyNo: selected.productCode,
            description: selected.description,
            specification: selected.remarks || "",
            quantity: quantityById.get(selected.id) || "1",
            unit: selected.unit || "Piece",
            estimatedUnitCost: String(selected.referencePrice),
          }))
        : current
    );
    sessionStorage.removeItem("procurewise.catalogSelection");
  }, [catalog.data?.items, catalogItemIds, catalogSelection]);

  const configurationReady = Boolean(setup?.offices.length && setup.objectsOfExpenditure.length);
  const requesterSignatories = useMemo(
    () => (signatories.data ?? []).filter((signatory) => Boolean(signatory.mayRequest)),
    [signatories.data]
  );
  const approverSignatories = useMemo(
    () => (signatories.data ?? []).filter((signatory) => Boolean(signatory.mayApprove)),
    [signatories.data]
  );
  const signatoryLabel = (signatory: { fullName: string; designation: string }) =>
    `${signatory.fullName} — ${signatory.designation}`;
  const selectedRequestedSignatory = requesterSignatories.find(
    (signatory) => signatoryLabel(signatory) === requestedSignatoryChoice
  );
  const selectedApprovedSignatory = approverSignatories.find(
    (signatory) => signatoryLabel(signatory) === approvedSignatoryChoice
  );

  const resolvedOfficeIdValue = officeId || ppmpOfficeId;
  const resolvedObjectIdValue = objectId || ppmpObjectId;
  const selectedOffice = setup?.offices.find((office) => String(office.id) === resolvedOfficeIdValue);

  const total = useMemo(
    () =>
      items.reduce(
        (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.estimatedUnitCost) || 0),
        0
      ),
    [items]
  );

  const categoryAnalysis = useMemo(() => {
    const validItems = items.filter((item) => item.description.trim().length > 0);
    return detectMixedCategories(validItems);
  }, [items]);

  const updateItem = (index: number, field: keyof RequestItem, value: string) =>
    setItems((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item))
    );

  const addItem = () =>
    setItems((current) => [
      ...current,
      {
        catalogItemId: "",
        stockPropertyNo: "",
        description: "",
        specification: "",
        quantity: "1",
        unit: "Piece",
        estimatedUnitCost: "",
      },
    ]);

  const activeBudgetCeiling = useMemo(() => {
    const custom = Number(customPpmpBudget);
    return !isNaN(custom) && custom > 0 ? custom : 0;
  }, [customPpmpBudget]);

  const isOverBudget = activeBudgetCeiling > 0 && total > activeBudgetCeiling + 0.001;
  const remainingBudget = activeBudgetCeiling > 0 ? Math.max(0, activeBudgetCeiling - total) : 0;
  const overBudgetAmount = isOverBudget ? total - activeBudgetCeiling : 0;
  const budgetUtilizationRatio = activeBudgetCeiling > 0 ? total / activeBudgetCeiling : 0;
  const budgetUtilizationPct = activeBudgetCeiling > 0 ? Math.min(Math.round(budgetUtilizationRatio * 100), 999) : 0;

  const isCustomBudgetValid = !isNaN(Number(customPpmpBudget)) && Number(customPpmpBudget) > 0;
  const isStep1Valid = Boolean(
    (uploadedFile || selectedPpmpId) &&
    marketScopingFile &&
    preCanvassFile &&
    isCustomBudgetValid &&
    (ppmpOfficeId || officeId) &&
    (ppmpObjectId || objectId)
  );

  const handleAdvanceFromStep1 = () => {
    if (!uploadedFile && !selectedPpmpId) {
      toast.error("Please upload your approved PPMP file (Annex B).");
      return;
    }
    if (!marketScopingFile) {
      toast.error("Please upload your Market Scoping document (mandatory under RA 12009 Art. II).");
      return;
    }
    if (!preCanvassFile) {
      toast.error("Please upload your Pre-Canvass Form (preliminary quotation worksheet).");
      return;
    }
    if (!customPpmpBudget.trim() || isNaN(Number(customPpmpBudget)) || Number(customPpmpBudget) <= 0) {
      toast.error("Please enter a valid Approved PPMP Budget Ceiling greater than ₱0.00.");
      return;
    }
    if (ppmpOfficeId) setOfficeId(ppmpOfficeId);
    if (ppmpObjectId) setObjectId(ppmpObjectId);
    setFundSource(customFundSource.trim() || "General Appropriations Act");
    setCurrentStep(2);
  };

  const handleAdvanceFromStep2 = () => {
    setAttemptedSubmit(true);
    if (!selectedCategory.trim()) {
      toast.error("Please choose an Item Category under Rule 5.1.1.");
      return;
    }
    if (!items.length) {
      toast.error("Please add at least one line item.");
      return;
    }
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const itemNum = i + 1;
      if (!item.description.trim()) {
        toast.error(`Item #${itemNum}: Please enter the Item Name & Specification.`);
        return;
      }
      const qty = Number(item.quantity);
      if (!item.quantity.trim() || isNaN(qty) || qty <= 0) {
        toast.error(`Item #${itemNum}: Quantity must be greater than 0.`);
        return;
      }
      if (!item.unit.trim()) {
        toast.error(`Item #${itemNum}: Please choose a Unit.`);
        return;
      }
      const cost = Number(item.estimatedUnitCost);
      if (!item.estimatedUnitCost.trim() || isNaN(cost) || cost <= 0) {
        toast.error(`Item #${itemNum}: Estimated Unit Price must be greater than ₱0.00.`);
        return;
      }
    }
    if (categoryAnalysis.isMixed) {
      toast.error(
        `Rule 5.1.1 Alert: Mixed item categories detected (${categoryAnalysis.categoryLabels.join(
          " + "
        )}). Please keep only one type of item in this request.`
      );
      return;
    }
    if (isOverBudget) {
      toast.error(
        `Budget Limiter Alert: Total Estimated Cost (₱${total.toLocaleString("en-PH", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}) exceeds the Approved PPMP Budget Ceiling of ₱${activeBudgetCeiling.toLocaleString("en-PH", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })} by ₱${overBudgetAmount.toLocaleString("en-PH", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}. Please adjust item quantities or unit prices before proceeding.`
      );
      return;
    }
    setAttemptedSubmit(false);
    setCurrentStep(3);
  };

  const handleAdvanceFromStep3 = () => {
    if (purpose.trim().length < 10) {
      toast.error(
        "Please explain the purpose of your request in at least 10 characters (1–2 plain sentences)."
      );
      return;
    }
    setCurrentStep(4);
  };

  const handleFinalSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setAttemptedSubmit(true);

    if (isOverBudget) {
      toast.error(
        `Cannot submit: Total Estimated Cost (₱${total.toLocaleString("en-PH", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}) exceeds the Approved PPMP Budget Ceiling of ₱${activeBudgetCeiling.toLocaleString("en-PH", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}.`
      );
      return;
    }

    const resolvedOffice = setup?.offices.find(
      (o) => String(o.id) === (officeId || ppmpOfficeId)
    );
    const resolvedObject = setup?.objectsOfExpenditure.find(
      (obj) => String(obj.id) === (objectId || ppmpObjectId)
    );

    if (!resolvedOffice || !resolvedObject) {
      toast.error("Please ensure the Office and Budget Allocation Class are selected.");
      return;
    }

    onCreate(
      {
        purpose: purpose.trim(),
        category: selectedCategory,
        officeId: resolvedOffice.id,
        objectOfExpenditureId: resolvedObject.id,
        ppmpEntryId: ppmpMode === "existing" && selectedPpmpId ? Number(selectedPpmpId) : undefined,
        fundSource: fundSource.trim() || undefined,
        fundCluster: fundCluster.trim() || undefined,
        responsibilityCenterCode: responsibilityCenterCode.trim() || undefined,
        requesterDesignation: user?.name ? "Faculty / Staff Requisitioner" : undefined,
        requestedSignatoryId: selectedRequestedSignatory?.id,
        approvedSignatoryId: selectedApprovedSignatory?.id,
        items: items.map((item) => ({
          catalogItemId: item.catalogItemId ? Number(item.catalogItemId) : undefined,
          stockPropertyNo: item.stockPropertyNo || undefined,
          description: item.description.trim(),
          specification: item.specification?.trim() || undefined,
          quantity: Number(item.quantity) || 1,
          unit: item.unit.trim() || "Piece",
          estimatedUnitCost: Number(item.estimatedUnitCost) || 0,
        })),
      },
      uploadedFile,
      ppmpMode === "upload"
        ? {
            title: customPpmpTitle.trim() || "Annual Department PPMP",
            fiscalYear: customPpmpYear,
            plannedAmount: activeBudgetCeiling,
          }
        : null,
      marketScopingFile,
      preCanvassFile
    );
  };

  return (
    <form onSubmit={handleFinalSubmit} className="space-y-6">
      {/* Draft Auto-Saved Indicator Banner */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-xs font-medium text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span><strong>Draft auto-saved:</strong> Your progress and inputs are saved automatically. You will not lose your work if you click another page.</span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            if (window.confirm("Are you sure you want to discard this draft and start over?")) {
              clearPrDraft();
              onCancel();
            }
          }}
          className="h-6 text-[11px] font-semibold text-rose-700 hover:text-rose-900 hover:bg-rose-100/50 dark:text-rose-400"
        >
          Discard Draft
        </Button>
      </div>

      {/* 1. Clickable Stepper Progress Header */}
      <nav aria-label="Purchase Request creation steps" className="flex flex-col gap-2 rounded-2xl bg-slate-100 p-4 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Step {currentStep} of 4: {WIZARD_STEP_TITLES[currentStep]}
          </span>
          <QuietCompliancePill
            stepNumber="Step 5.1"
            annexForm="Annex A, B & D"
            procedureRef="BSC – PRO -QP- 95 – 1"
            role="End-User"
          />
        </div>
        <div
          className="grid grid-cols-4 gap-2 pt-1"
          role="progressbar"
          aria-label="Purchase Request 4-Step Wizard Progress"
          aria-valuemin={1}
          aria-valuemax={4}
          aria-valuenow={currentStep}
        >
          {([1, 2, 3, 4] as const).map((stepNumber) => (
            <button
              key={stepNumber}
              type="button"
              onClick={() => {
                if (stepNumber <= currentStep) {
                  setCurrentStep(stepNumber);
                } else if (stepNumber === 2 && isStep1Valid) {
                  setCurrentStep(2);
                } else if (stepNumber === 3 && isStep1Valid && !isOverBudget) {
                  setCurrentStep(3);
                }
              }}
              title={stepNumber <= currentStep ? `Click to return to Step ${stepNumber}` : undefined}
              className={`flex flex-col gap-1 text-left transition-all ${
                stepNumber <= currentStep ? "cursor-pointer" : "cursor-not-allowed opacity-60"
              }`}
            >
              <div
                className={
                  stepNumber <= currentStep
                    ? "h-3 rounded-full bg-[#881337] transition-colors hover:bg-[#a01842]"
                    : "h-3 rounded-full bg-slate-300 dark:bg-slate-700 transition-colors"
                }
              />
              <span className={`text-[11px] font-semibold truncate ${stepNumber === currentStep ? "text-[#881337] dark:text-rose-400 font-bold" : "text-slate-500"}`}>
                {stepNumber}. {stepNumber === 1 ? "Documents" : stepNumber === 2 ? "Items" : stepNumber === 3 ? "Purpose" : "Review"}
              </span>
            </button>
          ))}
        </div>
      </nav>

      {/* ===================================================================== */}
      {/* STEP 1 OF 4: UPLOAD REQUIRED DOCUMENTS & BUDGET PLAN                  */}
      {/* ===================================================================== */}
      {currentStep === 1 && (
        <section className="rounded-2xl border-2 border-slate-300 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900 space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-slate-200 pb-4 dark:border-slate-800">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Step 1 of 4: Upload Required Documents &amp; Budget Plan
              </h2>
              <p className="mt-1.5 text-base text-slate-700 dark:text-slate-300">
                Upload your signed PPMP, Market Scoping document, and Pre-Canvass Form together on one window before adding line items.
              </p>
            </div>
            <QuietCompliancePill
              stepNumber="Step 5.1"
              annexForm="PPMP, Market Scoping & Pre-Canvass"
              procedureRef="BSC – PRO -QP- 95 – 1"
              role="End-User"
            />
          </div>

          {/* Unified 3-Document Upload Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            {/* Card 1: PPMP */}
            <DocumentUploadCard
              title="1. Approved PPMP Plan"
              badge="Required"
              subtitle="Linked PPMP entry: Signed Project Procurement Management Plan (Annex B)"
              acceptedFormats=".pdf, .xlsx, .xls (Max: 10MB)"
              file={uploadedFile}
              isDragging={isDraggingPpmpFile}
              onDragOver={(e) => { e.preventDefault(); setIsDraggingPpmpFile(true); }}
              onDragLeave={() => setIsDraggingPpmpFile(false)}
              onDrop={(e) => { e.preventDefault(); setIsDraggingPpmpFile(false); handlePpmpFile(e.dataTransfer.files?.[0]); }}
              onBrowseClick={() => fileInputRef.current?.click()}
              onPreview={uploadedFile ? () => setPreviewingDoc({ title: "Approved PPMP Plan", file: uploadedFile }) : undefined}
              onRemove={removeUploadedFile}
              fileInputRef={fileInputRef}
              inputAccept={STRICT_PPMP_ACCEPT}
              onFileInputChange={handleFileChange}
              inputId="ppmp-strict-file-upload"
            />

            {/* Card 2: Market Scoping */}
            <DocumentUploadCard
              title="2. Market Scoping"
              badge="Required"
              subtitle="Strategic Market Scoping & Price Sounding (RA 12009 Art. II)"
              acceptedFormats=".pdf, .xlsx, .xls, .docx (Max: 10MB)"
              file={marketScopingFile}
              isDragging={isDraggingMarketScopingFile}
              onDragOver={(e) => { e.preventDefault(); setIsDraggingMarketScopingFile(true); }}
              onDragLeave={() => setIsDraggingMarketScopingFile(false)}
              onDrop={(e) => { e.preventDefault(); setIsDraggingMarketScopingFile(false); handleMarketScopingFile(e.dataTransfer.files?.[0]); }}
              onBrowseClick={() => marketScopingFileInputRef.current?.click()}
              onPreview={marketScopingFile ? () => setPreviewingDoc({ title: "Strategic Market Scoping", file: marketScopingFile }) : undefined}
              onRemove={removeMarketScopingFile}
              fileInputRef={marketScopingFileInputRef}
              inputAccept=".pdf, .xlsx, .xls, .docx, application/pdf, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onFileInputChange={(e) => { handleMarketScopingFile(e.target.files?.[0]); e.currentTarget.value = ""; }}
              inputId="market-scoping-file-upload-step1"
            />

            {/* Card 3: Pre-Canvass Form */}
            <DocumentUploadCard
              title="3. Pre-Canvass Form"
              badge="Required"
              subtitle="Preliminary canvass quotation worksheet / form"
              acceptedFormats=".pdf, .xlsx, .xls (Max: 10MB)"
              file={preCanvassFile}
              isDragging={isDraggingPreCanvassFile}
              onDragOver={(e) => { e.preventDefault(); setIsDraggingPreCanvassFile(true); }}
              onDragLeave={() => setIsDraggingPreCanvassFile(false)}
              onDrop={(e) => { e.preventDefault(); setIsDraggingPreCanvassFile(false); handlePreCanvassFile(e.dataTransfer.files?.[0]); }}
              onBrowseClick={() => preCanvassFileInputRef.current?.click()}
              onPreview={preCanvassFile ? () => setPreviewingDoc({ title: "Pre-Canvass Form", file: preCanvassFile }) : undefined}
              onRemove={removePreCanvassFile}
              fileInputRef={preCanvassFileInputRef}
              inputAccept=".pdf, .xlsx, .xls, application/pdf, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
              onFileInputChange={(e) => { handlePreCanvassFile(e.target.files?.[0]); e.currentTarget.value = ""; }}
              inputId="pre-canvass-file-upload-step1"
            />
          </div>

          {/* Department / Office & Budget Allocation Details */}
          <div className="grid gap-4 pt-2 sm:grid-cols-3">
            <div>
              <Label className="text-base font-bold text-slate-900 dark:text-slate-100">
                Requesting Office / Department
              </Label>
              <div className="mt-2">
                <OfficeSelect
                  value={ppmpOfficeId}
                  valueMode="id"
                  onChange={(val) => {
                    setPpmpOfficeId(val);
                    setOfficeId(val);
                  }}
                  customOffices={setup?.offices}
                  disabled={!configurationReady}
                  placeholder="Select your BSC Office / Department"
                />
              </div>
            </div>

            <div>
              <Label className="text-base font-bold text-slate-900 dark:text-slate-100">
                Budget Allocation Class
              </Label>
              <Select
                value={ppmpObjectId}
                onValueChange={(val) => {
                  setPpmpObjectId(val);
                  setObjectId(val);
                }}
                disabled={!configurationReady}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select expenditure class" />
                </SelectTrigger>
                <SelectContent>
                  {setup?.objectsOfExpenditure.map((object) => (
                    <SelectItem key={object.id} value={String(object.id)}>
                      {object.code} — {object.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="ppmp-budget-ceiling" className="text-base font-bold text-slate-900 dark:text-slate-100">
                Approved PPMP Budget Ceiling (PHP) <span className="text-rose-700 dark:text-rose-400">*</span>
              </Label>
              <Input
                id="ppmp-budget-ceiling"
                type="number"
                min="1"
                step="0.01"
                value={customPpmpBudget}
                onChange={(e) => setCustomPpmpBudget(e.target.value)}
                placeholder="e.g., 50000.00"
                className={`mt-2 ${
                  customPpmpBudget.trim() && (isNaN(Number(customPpmpBudget)) || Number(customPpmpBudget) <= 0)
                    ? "border-rose-500 focus-visible:ring-rose-500"
                    : ""
                }`}
              />
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Mandatory budget ceiling under BSC Budgetary Control. Total line items in Step 2 cannot exceed this amount.
              </p>
            </div>
          </div>

          {/* Step 1 Bottom Navigation */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-t-2 border-slate-200 pt-5 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (window.confirm("Do you want to discard this draft and return to the list?")) {
                  clearPrDraft();
                  onCancel();
                }
              }}
              className="min-h-12"
            >
              <X className="h-5 w-5" />
              <span>Cancel Request</span>
            </Button>

            <Button
              type="button"
              disabled={!isStep1Valid}
              onClick={handleAdvanceFromStep1}
              className="min-h-12 bg-[#881337] text-white hover:bg-[#70102e]"
            >
              <span>Next Step: Select Category &amp; Add Items</span>
              <ArrowRight className="h-5 w-5" />
            </Button>
          </div>
        </section>
      )}

      {/* ===================================================================== */}
      {/* STEP 2 OF 4: SELECT CATEGORY AND ADD ITEMS                            */}
      {/* ===================================================================== */}
      {currentStep === 2 && (
        <section className="rounded-2xl border-2 border-slate-300 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900 space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-slate-200 pb-4 dark:border-slate-800">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Step 2 of 4: Select Category and Add Items
              </h2>
              <p className="mt-1.5 text-base text-slate-700 dark:text-slate-300">
                Choose the single item category for this Purchase Request and list each item you need.
              </p>
            </div>
            <QuietCompliancePill
              stepNumber="Clause 5.1.1"
              annexForm="Appendix 60 (Annex A)"
              procedureRef="Single-Category Rule"
              role="End-User"
            />
          </div>

          {/* PPMP Budget Ceiling Context Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/90 px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-800/50">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                Approved Budget Plan:
              </span>
              <span className="truncate text-slate-600 dark:text-slate-400">
                {uploadedFile?.name || "Verified PPMP Document"}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
              <span className="text-slate-700 dark:text-slate-300">
                Ceiling: <strong>₱{activeBudgetCeiling.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</strong>
              </span>
              <span className="text-slate-700 dark:text-slate-300">
                Est. Cost: <strong className={isOverBudget ? "text-rose-600" : "text-emerald-600"}>₱{total.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</strong>
              </span>
              <span className={isOverBudget ? "text-rose-600 font-bold" : "text-emerald-700 dark:text-emerald-400 font-bold"}>
                Remaining: ₱{remainingBudget.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Category Selector */}
          <div>
            <Label htmlFor="item-category-select" className="text-base font-bold text-slate-900 dark:text-slate-100">
              Item Category <span className="text-rose-700">*</span>
            </Label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger id="item-category-select" className="mt-2 min-h-12 text-base">
                <SelectValue placeholder="Select single category" />
              </SelectTrigger>
              <SelectContent>
                {SECTION_5_1_1_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Line Items List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-base font-bold text-slate-900 dark:text-slate-100">
                Line Items ({items.length})
              </span>
            </div>

            {items.map((item, index) => {
              const lineTotal = (Number(item.quantity) || 0) * (Number(item.estimatedUnitCost) || 0);
              return (
                <div
                  key={index}
                  className="rounded-xl border-2 border-slate-200 bg-slate-50/50 p-5 dark:border-slate-800 dark:bg-slate-900/50 space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3 dark:border-slate-800">
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      Item #{index + 1}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-[#881337] dark:text-rose-400">
                        Line Subtotal: ₱{lineTotal.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      {items.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setItems((current) => current.filter((_, idx) => idx !== index))}
                          className="h-8 border-rose-300 text-xs text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300"
                        >
                          <Trash2 className="mr-1 h-3.5 w-3.5" />
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Choosing Catalog Item (Editable with right-edge price display) */}
                  <div>
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Choose from Common-Use Catalog (or enter specifications manually below)
                    </Label>
                    <div className="mt-1.5">
                      <CatalogItemPicker
                        value={item.catalogItemId}
                        catalogItems={catalogItems}
                        favoriteIds={favoriteIds}
                        onSelect={(catItem) => {
                          setItems((current) =>
                            current.map((currentItem, itemIndex) =>
                              itemIndex === index
                                ? {
                                    ...currentItem,
                                    catalogItemId: String(catItem.id),
                                    stockPropertyNo: catItem.productCode,
                                    description: catItem.description,
                                    unit: catItem.unit || "Piece",
                                    estimatedUnitCost: Number(catItem.referencePrice).toFixed(2),
                                  }
                                : currentItem
                            )
                          );
                        }}
                        onClear={() => updateItem(index, "catalogItemId", "")}
                      />
                    </div>
                  </div>

                  {/* Item Reference No. & Description, Quantity, Unit, Unit Price */}
                  <div className="grid gap-3 sm:grid-cols-12">
                    <div className="sm:col-span-4">
                      <Label htmlFor={`item-ref-${index}`} className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Reference / Stock No. (Stock / property no.)
                      </Label>
                      <Input
                        id={`item-ref-${index}`}
                        value={item.stockPropertyNo}
                        onChange={(e) => updateItem(index, "stockPropertyNo", e.target.value)}
                        placeholder="e.g., 13111203-AC-F01"
                        className="mt-1.5 font-mono text-xs sm:text-sm"
                      />
                    </div>

                    <div className="sm:col-span-8">
                      <Label htmlFor={`item-desc-${index}`} className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Item Name &amp; Specification <span className="text-rose-700">*</span>
                      </Label>
                      <Input
                        id={`item-desc-${index}`}
                        value={item.description}
                        onChange={(e) => updateItem(index, "description", e.target.value)}
                        placeholder="e.g., A4 Bond Paper, 80gsm, White"
                        className="mt-1.5 text-xs sm:text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-12 pt-2">
                    <div className="sm:col-span-3">
                      <Label htmlFor={`item-qty-${index}`} className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Quantity <span className="text-rose-700">*</span>
                      </Label>
                      <Input
                        id={`item-qty-${index}`}
                        type="number"
                        min="1"
                        step="any"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, "quantity", e.target.value)}
                        placeholder="1"
                        className="mt-1.5 text-xs sm:text-sm"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Unit <span className="text-rose-700">*</span>
                      </Label>
                      <Select
                        value={BSC_PR_UNITS.includes(item.unit as any) ? item.unit : "Piece"}
                        onValueChange={(val) => updateItem(index, "unit", val)}
                      >
                        <SelectTrigger className="mt-1.5 h-9 text-xs sm:text-sm">
                          <SelectValue placeholder="Unit" />
                        </SelectTrigger>
                        <SelectContent>
                          {BSC_PR_UNITS.map((u) => (
                            <SelectItem key={u} value={u}>
                              {u}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="sm:col-span-3">
                      <Label htmlFor={`item-price-${index}`} className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Unit Price (₱) <span className="text-rose-700">*</span>
                      </Label>
                      <Input
                        id={`item-price-${index}`}
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={item.estimatedUnitCost}
                        onChange={(e) => updateItem(index, "estimatedUnitCost", e.target.value)}
                        placeholder="0.00"
                        className="mt-1.5 text-xs sm:text-sm"
                      />
                    </div>

                    <div className="sm:col-span-3 flex flex-col justify-end">
                      <div className="h-9 rounded-md border border-slate-200 bg-slate-100/80 px-3 flex items-center justify-between font-bold text-xs sm:text-sm dark:border-slate-800 dark:bg-slate-800/60">
                        <span className="text-[11px] text-slate-500 font-normal">Subtotal:</span>
                        <span className="text-[#881337] dark:text-rose-400">
                          ₱{((Number(item.quantity) || 0) * (Number(item.estimatedUnitCost) || 0)).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            <Button
              type="button"
              variant="outline"
              onClick={addItem}
              className="w-full border-dashed border-2 border-slate-300 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Add Another Line Item
            </Button>
          </div>

          {/* Step 2 Bottom Navigation */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-t-2 border-slate-200 pt-5 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              disabled={isSaving}
              onClick={() => setCurrentStep(1)}
              className="min-h-12 border-2"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>← Back to Step 1 (Documents &amp; Budget)</span>
            </Button>

            <Button
              type="button"
              disabled={isOverBudget}
              onClick={handleAdvanceFromStep2}
              className={`min-h-12 text-white ${
                isOverBudget
                  ? "bg-slate-400 cursor-not-allowed opacity-60 dark:bg-slate-700 hover:bg-slate-400"
                  : "bg-[#881337] hover:bg-[#70102e]"
              }`}
            >
              <span>Next Step: Purpose of Request</span>
              <ArrowRight className="h-5 w-5" />
            </Button>
          </div>
        </section>
      )}

      {/* ===================================================================== */}
      {/* STEP 3 OF 4: PURPOSE OF REQUEST & SIGNATORIES                         */}
      {/* ===================================================================== */}
      {currentStep === 3 && (
        <section className="rounded-2xl border-2 border-slate-300 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900 space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-slate-200 pb-4 dark:border-slate-800">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Step 3 of 4: Purpose of Request &amp; Signatories
              </h2>
              <p className="mt-1.5 text-base text-slate-700 dark:text-slate-300">
                State the official college purpose for this procurement request and review attached documents.
              </p>
            </div>
            <QuietCompliancePill
              stepNumber="Step 5.1"
              annexForm="Appendix 60 (Annex A)"
              procedureRef="BSC – PRO -QP- 95 – 1"
              role="End-User"
            />
          </div>

          {/* Attached Documents Overview from Step 1 */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/40">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Attached Documents (from Step 1)
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setCurrentStep(1)}
                className="h-6 text-xs text-[#881337] dark:text-rose-400"
              >
                Change in Step 1
              </Button>
            </div>
            <div className="grid gap-2 sm:grid-cols-3 text-xs">
              <div className="rounded-md border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-900 truncate">
                <span className="text-slate-500 text-[10px] block">PPMP Plan:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">{uploadedFile?.name || "Verified PPMP"}</span>
              </div>
              <div className="rounded-md border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-900 truncate">
                <span className="text-slate-500 text-[10px] block">Market Scoping:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">{marketScopingFile?.name || "Verified Document"}</span>
              </div>
              <div className="rounded-md border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-900 truncate">
                <span className="text-slate-500 text-[10px] block">Pre-Canvass Form:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">{preCanvassFile?.name || "Verified Worksheet"}</span>
              </div>
            </div>
          </div>

          {/* Purpose of Request */}
          <div>
            <Label htmlFor="pr-purpose" className="text-base font-bold text-slate-900 dark:text-slate-100">
              Purpose of Request <span className="text-rose-700">*</span>
            </Label>
            <Textarea
              id="pr-purpose"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="State the clear educational, administrative, or research purpose of this procurement (at least 10 characters)..."
              className="mt-2 min-h-24 text-sm"
            />
          </div>

          {/* Signatories */}
          <div className="grid gap-4 sm:grid-cols-2 pt-2">
            <div>
              <Label htmlFor="pr-requested-by" className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Requested By (Optional Signatory)
              </Label>
              <Input
                id="pr-requested-by"
                list="pr-requested-signatories"
                value={requestedSignatoryChoice}
                onChange={(e) => setRequestedSignatoryChoice(e.target.value)}
                placeholder="Select or leave blank for your account name"
                className="mt-1.5"
              />
              <datalist id="pr-requested-signatories">
                {requesterSignatories.map((sig) => (
                  <option key={sig.id} value={signatoryLabel(sig)} />
                ))}
              </datalist>
            </div>

            <div>
              <Label htmlFor="pr-approved-by" className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Approved By (HoPE / Authorized Approver)
              </Label>
              <Input
                id="pr-approved-by"
                list="pr-approved-signatories"
                value={approvedSignatoryChoice}
                onChange={(e) => setApprovedSignatoryChoice(e.target.value)}
                placeholder="Select authorized approving official"
                className="mt-1.5"
              />
              <datalist id="pr-approved-signatories">
                {approverSignatories.map((sig) => (
                  <option key={sig.id} value={signatoryLabel(sig)} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Step 3 Bottom Navigation */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-t-2 border-slate-200 pt-5 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              disabled={isSaving}
              onClick={() => setCurrentStep(2)}
              className="min-h-12 border-2"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>← Back to Step 2 (Category &amp; Items)</span>
            </Button>

            <Button
              type="button"
              disabled={purpose.trim().length < 10}
              onClick={handleAdvanceFromStep3}
              className={`min-h-12 text-white ${
                purpose.trim().length < 10
                  ? "bg-slate-400 cursor-not-allowed opacity-60 dark:bg-slate-700 hover:bg-slate-400"
                  : "bg-[#881337] hover:bg-[#70102e]"
              }`}
            >
              <span>Next Step: Review &amp; Submit</span>
              <ArrowRight className="h-5 w-5" />
            </Button>
          </div>
        </section>
      )}

      {/* ===================================================================== */}
      {/* STEP 4 OF 4: REVIEW YOUR REQUEST BEFORE SUBMITTING                    */}
      {/* ===================================================================== */}
      {currentStep === 4 && (
        <section className="rounded-2xl border-2 border-slate-300 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900 space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-slate-200 pb-4 dark:border-slate-800">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Step 4 of 4: Review Your Request Before Submitting
              </h2>
              <p className="mt-1.5 text-base text-slate-700 dark:text-slate-300">
                Verify all details, attached documents, and line items before submitting to Procurement.
              </p>
            </div>
            <QuietCompliancePill
              stepNumber="Step 5.1"
              annexForm="Appendix 60, Annex B & D"
              procedureRef="BSC – PRO -QP- 95 – 1"
              role="End-User"
            />
          </div>

          {/* Attached Documents Verified List */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/50">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-2">
              Attached Procurement Documents (3/3)
            </h3>
            <div className="grid gap-2 sm:grid-cols-3 text-xs">
              <div className="flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                <span className="truncate">PPMP: <strong>{uploadedFile?.name || "Verified"}</strong></span>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                <span className="truncate">Market Scoping: <strong>{marketScopingFile?.name || "Verified"}</strong></span>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                <span className="truncate">Pre-Canvass Form: <strong>{preCanvassFile?.name || "Verified"}</strong></span>
              </div>
            </div>
          </div>

          {/* Canvas Preview */}
          <div className="rounded-xl border-2 border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <OfficialPurchaseRequestCanvas
              entityName={setup?.settings?.entityName || "Batanes State College"}
              fundCluster={fundCluster}
              officeSection={selectedOffice ? `${selectedOffice.code} — ${selectedOffice.name}` : user?.officeName || ""}
              responsibilityCenterCode={responsibilityCenterCode}
              items={items}
              purpose={purpose}
              requestedByName={selectedRequestedSignatory?.fullName || user?.name || ""}
              requestedByDesignation={selectedRequestedSignatory?.designation || ""}
              approvedByName={selectedApprovedSignatory?.fullName || setup?.settings?.authorizedOfficialName || ""}
              approvedByDesignation={selectedApprovedSignatory?.designation || setup?.settings?.authorizedOfficialDesignation || ""}
            />
          </div>

          {/* Budget Limiter Over-Ceiling Blocker Banner */}
          {isOverBudget && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-xl border-2 border-rose-500 bg-rose-50 p-4 text-base font-semibold text-rose-950 dark:border-rose-600 dark:bg-rose-950/60 dark:text-rose-100"
            >
              <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-rose-600 dark:text-rose-400" />
              <div>
                <p className="font-bold">Cannot Submit: Approved PPMP Budget Ceiling Exceeded</p>
                <p className="text-sm font-normal">
                  Total Estimated Cost (₱{total.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}) exceeds the Approved PPMP Budget Ceiling of ₱{activeBudgetCeiling.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} by ₱{overBudgetAmount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}. Please return to Step 2 to adjust line items.
                </p>
              </div>
            </div>
          )}

          {/* Notification Info Banner */}
          <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-4 text-xs sm:text-sm text-blue-900 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-100">
            <div className="flex items-start gap-3">
              <MailCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-800 dark:text-blue-300" />
              <p className="font-medium leading-relaxed">
                Upon submission, your Purchase Request and 3 attached documents will be forwarded directly to the Procurement Officer for Step 5.1 verification and supplier canvassing.
              </p>
            </div>
          </div>

          {/* Step 4 Bottom Navigation Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-t-2 border-slate-200 pt-5 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              disabled={isSaving}
              onClick={() => setCurrentStep(3)}
              className="min-h-12 px-6 py-3 border-2"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>← Back to Step 3 (Purpose &amp; Signatories)</span>
            </Button>

            <Button
              type="submit"
              disabled={isSaving || isOverBudget}
              className={`min-h-12 px-6 py-3 text-base font-bold text-white ${
                isOverBudget
                  ? "bg-slate-400 cursor-not-allowed opacity-60 dark:bg-slate-700 hover:bg-slate-400"
                  : "bg-[#881337] hover:bg-[#70102e]"
              }`}
            >
              {isSaving ? (
                <LoaderCircle className="h-5 w-5 animate-spin text-white" />
              ) : (
                <CheckCircle2 className="h-5 w-5" />
              )}
              <span>Submit Purchase Request</span>
            </Button>
          </div>
        </section>
      )}
      <DocumentPreviewDialog doc={previewingDoc} onClose={() => setPreviewingDoc(null)} />
    </form>
  );
}

function LoadingPanel({ label }: { label: string }) { return <div className="flat-panel grid min-h-72 place-items-center text-center"><div><LoaderCircle className="mx-auto h-5 w-5 animate-spin text-[#7b1e1e]" /><p className="mt-3 text-xs text-[#6e7885]">{label}</p></div></div>; }

export function WorkspacePage({ kind }: { kind: WorkspaceKind }) {
  const details = content[kind];
  const action = kind === "suppliers" ? "Register supplier" : kind === "plans" ? "Add planning entry" : kind === "budgets" ? "Add budget allotment" : undefined;
  return <div className="mx-auto max-w-[1240px]"><PageHeader eyebrow={details.eyebrow} title={details.title} description={details.description} action={action ? { label: action, onClick: () => toast.info("This configured workspace is ready for the appropriate authorised role.") } : undefined} />
    <div className="mt-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-2"><StatusBadge tone="draft">RECORD-BASED</StatusBadge><p className="text-[11px] text-[#74808c]">No placeholder transactions are shown.</p></div><div className="relative w-full sm:w-64"><Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9098a2]" /><Input placeholder="Search records" className="h-9 rounded-[4px] border-[#dfdbd3] bg-white pl-9 text-xs" /></div></div>
    <div className="mt-4"><EmptyWorkspace eyebrow={details.eyebrow} title={details.emptyTitle} description={details.emptyDescription} /></div>
    {kind === "rfq" && <div className="mt-6 flex items-start gap-3 border border-[#e4d4ae] bg-[#fffaf0] p-4"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-[#9a6d19]" /><p className="text-[11px] leading-5 text-[#75643e]">The End-User's preliminary quotation document is validated here. Procurement Staff/BAC completes the final canvass and prepares the official Abstract of Quotations.</p></div>}
  </div>;
}
