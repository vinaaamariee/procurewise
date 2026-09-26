import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { downloadSupplierEvaluationFormPdf } from "@/lib/procurementPdf";
import {
  criteriaForSupplierEvaluation,
  SUPPLIER_EVALUATION_RATINGS,
  type SupplierEvaluationAudience,
} from "../../../shared/supplierEvaluationForm";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Download,
  FileText,
  Maximize2,
  Printer,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import React, { useMemo, useState } from "react";

export type EvaluationDocumentOrientation = "portrait" | "landscape";

export interface SupplierEvaluationFormData {
  audience: SupplierEvaluationAudience;
  supplierName: string;
  goodsServicesType?: string | null;
  officeName?: string | null;
  purchaseRequestNumber?: string | null;
  purchaseOrderNumber: string;
  supplierRegistryReference?: string | null;
  supplierRegistryRegisteredAt?: Date | string | null;
  supplierRegistryExpiresAt?: Date | string | null;
  responseScores: Record<string, number>;
  remarks?: string | null;
  respondentName?: string | null;
  evaluatedAt: Date | string;
  electronicApproval?: {
    approverName: string;
    approverDesignation: string;
    consentStatement: string;
    signatureDigest: string;
    approvedAt: Date | string;
  } | null;
}

// ============================================================================
// STANDARDIZED SUPPLIER EVALUATION DOCUMENT SHEET
// ============================================================================
export function SupplierEvaluationDocumentSheet({
  data,
  orientation = "portrait",
  isInteractive = false,
  onResponsesChange,
  onFieldChange,
  children,
  className = "",
}: {
  data: SupplierEvaluationFormData;
  orientation?: EvaluationDocumentOrientation;
  isInteractive?: boolean;
  onResponsesChange?: (responses: Record<string, number>) => void;
  onFieldChange?: (field: string, value: string) => void;
  children?: React.ReactNode;
  className?: string;
}) {
  const criteria = useMemo(() => {
    const list = criteriaForSupplierEvaluation(data.audience);
    const sections = Array.from(new Set(list.map((c) => c.section)));
    return sections.map((section) => ({
      section,
      criteria: list.filter((c) => c.section === section),
    }));
  }, [data.audience]);

  const handleScoreChange = (key: string, score: number) => {
    if (onResponsesChange) {
      onResponsesChange({
        ...data.responseScores,
        [key]: score,
      });
    }
  };

  const isPortrait = orientation === "portrait";

  return (
    <article
      className={`evaluation-document-sheet relative mx-auto flex flex-col justify-between bg-white text-[#202833] border border-[#dfd9ce] shadow-sm transition-all dark:bg-white dark:text-[#202833] print:border-0 print:shadow-none print:m-0 print:p-0 ${
        isPortrait ? "portrait max-w-[850px] w-full" : "landscape max-w-[1120px] w-full"
      } ${className}`}
      style={{
        boxSizing: "border-box",
      }}
    >
      {/* =====================================================================
          1. HEADER CONTAINER: 100% width, 0 padding, 0 margin, edge-to-edge
          ===================================================================== */}
      <header className="evaluation-header-container w-full p-0 m-0 leading-none overflow-hidden select-none border-b border-[#9a6d19] print:border-b-0 print:p-0 print:m-0">
        <img
          src="/header.png"
          alt="Batanes State College official header"
          className="w-full h-auto block object-cover print:w-full"
        />
      </header>

      {/* =====================================================================
          2. FORM CONTENT AREA: Internal padding exclusively for title, tables,
             scoring, PhilGEPS fields, and signatures (20mm-25mm standard)
          ===================================================================== */}
      <main className="evaluation-content-area flex-1 px-6 sm:px-9 py-6 text-xs leading-normal print:px-[15mm] print:py-[8mm] print:text-[8pt]">
        {/* Form Title & Subtitle */}
        <div className="text-center pb-3 border-b-2 border-[#9a6d19]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7b1e1e]">
            Procurement Unit
          </p>
          <h1 className="mt-1 text-base sm:text-lg font-bold tracking-tight text-[#202833]">
            SUPPLIER EVALUATION FORM
          </h1>
          <p className="text-xs sm:text-sm font-semibold text-[#1f2933]">
            ({data.goodsServicesType?.trim() ? data.goodsServicesType : "Goods / Services"})
          </p>
          <p className="mt-0.5 text-xs italic text-[#52606d]">
            To be accomplished by {data.audience === "end_user" ? "end-user" : "Procurement Office"}
          </p>
        </div>

        {/* Metadata Fields Section */}
        {children ? (
          <div className="mt-4">{children}</div>
        ) : (
          <div className="mt-4 grid gap-x-8 gap-y-2.5 sm:grid-cols-2 text-xs">
            <div className="flex items-baseline gap-2">
              <span className="font-semibold text-[#3e4855] shrink-0">Name of Supplier:</span>
              <span className="flex-1 border-b border-[#222] pb-0.5 font-medium text-[#1f2933]">
                {data.supplierName || "—"}
              </span>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="font-semibold text-[#3e4855] shrink-0">
                {data.audience === "end_user" ? "Type of Goods/Services Provided:" : "Purchase Request No.:"}
              </span>
              <span className="flex-1 border-b border-[#222] pb-0.5 font-medium text-[#1f2933]">
                {data.audience === "end_user"
                  ? data.goodsServicesType || "—"
                  : data.purchaseRequestNumber || "—"}
              </span>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="font-semibold text-[#3e4855] shrink-0">
                {data.audience === "end_user" ? "Office/Unit:" : "Purchase Order No.:"}
              </span>
              <span className="flex-1 border-b border-[#222] pb-0.5 font-medium text-[#1f2933]">
                {data.audience === "end_user"
                  ? data.officeName || "—"
                  : data.purchaseOrderNumber || "—"}
              </span>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="font-semibold text-[#3e4855] shrink-0">
                {data.audience === "end_user" ? "Purchase Order No.:" : "Supplier Registry RN:"}
              </span>
              <span className="flex-1 border-b border-[#222] pb-0.5 font-medium text-[#1f2933]">
                {data.audience === "end_user"
                  ? data.purchaseOrderNumber || "—"
                  : data.supplierRegistryReference || "—"}
              </span>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="font-semibold text-[#3e4855] shrink-0">PhilGEPS Registration:</span>
              <span className="flex-1 border-b border-[#222] pb-0.5 font-medium text-[#1f2933]">
                {data.supplierRegistryReference || "Not recorded in registry"}
              </span>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="font-semibold text-[#3e4855] shrink-0">Registration Date:</span>
              <span className="flex-1 border-b border-[#222] pb-0.5 font-medium text-[#1f2933]">
                {data.supplierRegistryRegisteredAt
                  ? new Date(data.supplierRegistryRegisteredAt).toLocaleDateString("en-PH")
                  : "Not recorded"}
              </span>
            </div>

            <div className="flex items-baseline gap-2 sm:col-span-2">
              <span className="font-semibold text-[#3e4855] shrink-0">PhilGEPS Expiration Date:</span>
              <span className="flex-1 border-b border-[#222] pb-0.5 font-medium text-[#1f2933]">
                {data.supplierRegistryExpiresAt
                  ? new Date(data.supplierRegistryExpiresAt).toLocaleDateString("en-PH")
                  : "Not recorded"}
              </span>
            </div>
          </div>
        )}

        {/* Instructions */}
        <section className="mt-5 text-[11px] leading-5 text-[#222]">
          <p className="font-bold italic text-[#1f2933]">Instructions:</p>
          <p className="mt-0.5">
            This is a survey on the performance of our suppliers. It aims to improve our procurement service/system. Your sincere and honest answers will be highly appreciated and treated with utmost confidentiality.
          </p>
          <p className="mt-1.5">
            Please rate the supplier according to each criterion provided and put a checkmark (✓) on the column that best corresponds to your answer.
          </p>
        </section>

        {/* Swipe alert for small screens */}
        <div className="mt-4 flex items-center gap-2 border border-[#d4a029] bg-[#fffaf0] px-3 py-1.5 text-[10px] text-[#72561d] sm:hidden print:hidden no-print">
          <ArrowRight className="h-3.5 w-3.5 shrink-0" />
          <span>Swipe the evaluation table horizontally to review or score all ratings.</span>
        </div>

        {/* Criteria & Rating Grid */}
        <div className="mt-3.5 overflow-x-auto">
          <table className="w-full min-w-[700px] border-collapse text-left text-xs">
            <thead>
              <tr className="bg-white text-[10px] font-bold text-black border-t-2 border-b border-[#222]">
                <th className="w-[50%] border border-[#222] px-3 py-2 text-center text-[#1f2933]">
                  CRITERIA
                </th>
                {SUPPLIER_EVALUATION_RATINGS.map((rating) => (
                  <th
                    key={rating.score}
                    className="w-[12.5%] border border-[#222] px-2 py-2 text-center leading-3 text-[#1f2933]"
                  >
                    <span className="block font-bold">{rating.label.toUpperCase()}</span>
                    <span className="text-[9px] font-normal">({rating.score})</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {criteria.map((group) => (
                <React.Fragment key={group.section}>
                  <tr>
                    <th
                      colSpan={5}
                      className="border border-[#222] bg-[#f1f3f5] px-3 py-1.5 text-left text-[10px] font-bold uppercase text-[#1f2933]"
                    >
                      {group.section}
                    </th>
                  </tr>
                  {group.criteria.map((criterion) => {
                    const currentScore = data.responseScores[criterion.key];
                    return (
                      <tr key={criterion.key} className="hover:bg-[#fcfaf7]">
                        <td className="border border-[#222] px-3 py-1.5 text-[11px] leading-4 text-[#1f2933]">
                          {criterion.label}
                        </td>
                        {SUPPLIER_EVALUATION_RATINGS.map((rating) => {
                          const isChecked = currentScore === rating.score;
                          return (
                            <td
                              key={rating.score}
                              className="border border-[#222] px-2 py-1 text-center align-middle"
                            >
                              {isInteractive ? (
                                <input
                                  type="radio"
                                  name={criterion.key}
                                  value={rating.score}
                                  checked={isChecked}
                                  onChange={() => handleScoreChange(criterion.key, rating.score)}
                                  className="h-3.5 w-3.5 accent-[#7b1e1e] cursor-pointer"
                                  aria-label={`${criterion.label}: ${rating.label}`}
                                />
                              ) : isChecked ? (
                                <span className="inline-grid h-5 w-5 place-items-center text-sm font-bold text-[#7b1e1e]">
                                  ✓
                                </span>
                              ) : (
                                <span className="text-gray-300">—</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </React.Fragment>
              ))}

              {/* Remarks Row */}
              <tr>
                <td colSpan={5} className="border border-[#222] px-3 py-2.5">
                  <Label htmlFor="remarks-field" className="text-[11px] italic text-[#52606d]">
                    Additional comments, suggestions, recommendations, and/or feedback:
                  </Label>
                  {isInteractive ? (
                    <Textarea
                      id="remarks-field"
                      value={data.remarks || ""}
                      onChange={(e) => onFieldChange?.("remarks", e.target.value)}
                      className="mt-1.5 min-h-16 border border-gray-300 p-2 text-xs shadow-none text-[#1f2933]"
                      placeholder="Record specific supplier performance observations or recommendations..."
                    />
                  ) : (
                    <p className="mt-1 min-h-8 text-xs italic text-[#1f2933]">
                      {data.remarks?.trim() ? data.remarks : "No additional remarks recorded."}
                    </p>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Signature & Date Block */}
        <div className="mt-6 flex flex-wrap items-end justify-between gap-6">
          <div className="w-full max-w-sm">
            <Label className="text-[11px] text-[#1f2933]">Name and Signature of Respondent:</Label>
            {isInteractive ? (
              <Input
                value={data.respondentName || ""}
                onChange={(e) => onFieldChange?.("respondentName", e.target.value)}
                placeholder="Full name of respondent"
                className="mt-1 h-8 rounded-none border-x-0 border-t-0 border-b border-[#222] px-0 text-xs shadow-none"
              />
            ) : (
              <div className="mt-2 border-b border-[#222] pb-1 text-xs font-semibold text-[#1f2933]">
                {data.respondentName || "Authorized Respondent"}
              </div>
            )}
          </div>

          <div className="w-36">
            <Label className="text-[11px] text-[#1f2933]">Date:</Label>
            <div className="mt-2 border-b border-[#222] pb-1 text-xs text-[#1f2933]">
              {new Date(data.evaluatedAt).toLocaleDateString("en-PH")}
            </div>
          </div>
        </div>

        {/* Electronic Approval Stamp (if approved) */}
        {data.electronicApproval && (
          <div className="mt-6 rounded border border-[#85d0ad] bg-[#f4fbf7] p-3 text-xs text-[#125736]">
            <div className="flex items-center gap-1.5 font-bold">
              <ShieldCheck className="h-4 w-4 text-[#136a43]" />
              <span>Official Electronic Approval &amp; Clearance Recorded</span>
            </div>
            <p className="mt-1 text-[11px] leading-4 text-[#1e6643]">
              Approver: <strong>{data.electronicApproval.approverName}</strong> (
              {data.electronicApproval.approverDesignation}) • Signed on{" "}
              {new Date(data.electronicApproval.approvedAt).toLocaleDateString("en-PH")}
            </p>
            <p className="mt-0.5 font-mono text-[9px] text-[#2c7551]">
              Digest: {data.electronicApproval.signatureDigest}
            </p>
          </div>
        )}
      </main>

      {/* =====================================================================
          3. FOOTER CONTAINER: 100% width, 0 padding, 0 margin, pinned flush
             to the bottom boundary
          ===================================================================== */}
      <footer className="evaluation-footer-container w-full p-0 m-0 leading-none overflow-hidden select-none border-t border-[#d8b04d] mt-auto print:border-t-0 print:p-0 print:m-0">
        <img
          src="/footer.png"
          alt="Batanes State College official footer"
          className="w-full h-auto block object-cover print:w-full"
        />
      </footer>
    </article>
  );
}

// ============================================================================
// STANDARDIZED DOCUMENT TOOLBAR (ORIENTATION & PRINT CONTROLS)
// ============================================================================
export function SupplierEvaluationToolbar({
  orientation,
  onOrientationChange,
  onPrint,
  onDownloadPdf,
  isDownloading = false,
  showOrientation = true,
}: {
  orientation: EvaluationDocumentOrientation;
  onOrientationChange: (o: EvaluationDocumentOrientation) => void;
  onPrint?: () => void;
  onDownloadPdf?: () => void;
  isDownloading?: boolean;
  showOrientation?: boolean;
}) {
  const handlePrint = () => {
    if (onPrint) onPrint();
    else window.print();
  };

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#e5dfd5] bg-white p-3 shadow-xs dark:border-[#384554] dark:bg-[#1a232c] print:hidden no-print">
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-[#7b1e1e] dark:text-[#ff837a]" />
        <span className="text-xs font-semibold text-[#202833] dark:text-[#f1f5f8]">
          Official Supplier Evaluation Document
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* Orientation Toggle */}
        {showOrientation && (
          <div className="flex items-center rounded-md border border-[#dfd8cc] bg-[#fbf9f5] p-0.5 text-xs dark:border-[#46515c] dark:bg-[#232c35]">
            <button
              type="button"
              onClick={() => onOrientationChange("portrait")}
              className={`rounded px-2.5 py-1 text-xs font-medium transition ${
                orientation === "portrait"
                  ? "bg-[#7b1e1e] text-white shadow-xs font-semibold"
                  : "text-[#5e6977] hover:text-[#202833] dark:text-[#aeb9c4] dark:hover:text-white"
              }`}
            >
              Portrait (A4)
            </button>
            <button
              type="button"
              onClick={() => onOrientationChange("landscape")}
              className={`rounded px-2.5 py-1 text-xs font-medium transition ${
                orientation === "landscape"
                  ? "bg-[#7b1e1e] text-white shadow-xs font-semibold"
                  : "text-[#5e6977] hover:text-[#202833] dark:text-[#aeb9c4] dark:hover:text-white"
              }`}
            >
              Landscape (A4)
            </button>
          </div>
        )}

        {/* Print Button */}
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handlePrint}
          className="h-8 rounded-[4px] border-[#d4cebe] text-xs font-medium dark:border-[#46515c]"
        >
          <Printer className="mr-1.5 h-3.5 w-3.5" />
          Print Document
        </Button>

        {/* Download PDF Button */}
        {onDownloadPdf && (
          <Button
            type="button"
            size="sm"
            onClick={onDownloadPdf}
            disabled={isDownloading}
            className="h-8 rounded-[4px] bg-[#7b1e1e] px-3 text-xs font-semibold text-white hover:bg-[#641818]"
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Download PDF
          </Button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// STANDARDIZED EVALUATION PREVIEW & REVIEW MODAL
// ============================================================================
export function SupplierEvaluationPreviewModal({
  open,
  onOpenChange,
  evaluationData,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  evaluationData: SupplierEvaluationFormData | null;
}) {
  const [orientation, setOrientation] = useState<EvaluationDocumentOrientation>("portrait");
  const [isDownloading, setIsDownloading] = useState(false);

  if (!evaluationData) return null;

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await downloadSupplierEvaluationFormPdf({
        audience: evaluationData.audience,
        supplierName: evaluationData.supplierName,
        goodsServicesType: evaluationData.goodsServicesType,
        officeName: evaluationData.officeName,
        purchaseRequestNumber: evaluationData.purchaseRequestNumber,
        purchaseOrderNumber: evaluationData.purchaseOrderNumber,
        supplierRegistryReference: evaluationData.supplierRegistryReference,
        supplierRegistryRegisteredAt: evaluationData.supplierRegistryRegisteredAt,
        supplierRegistryExpiresAt: evaluationData.supplierRegistryExpiresAt,
        responseScores: evaluationData.responseScores,
        remarks: evaluationData.remarks,
        respondentName: evaluationData.respondentName,
        evaluatedAt: evaluationData.evaluatedAt,
        electronicApproval: evaluationData.electronicApproval,
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto border-[#dcd7cb] bg-[#f8f7f4] p-4 sm:p-6 dark:border-[#384554] dark:bg-[#151c23]">
        <DialogHeader className="print:hidden no-print">
          <DialogTitle className="text-base font-bold text-[#202833] dark:text-[#f1f5f8]">
            Supplier Evaluation Form Preview
          </DialogTitle>
          <DialogDescription className="text-xs text-[#707c8a] dark:text-[#aeb9c4]">
            Official evaluation record for {evaluationData.supplierName} ({evaluationData.purchaseOrderNumber}).
          </DialogDescription>
        </DialogHeader>

        {/* Toolbar */}
        <SupplierEvaluationToolbar
          orientation={orientation}
          onOrientationChange={setOrientation}
          onDownloadPdf={handleDownload}
          isDownloading={isDownloading}
        />

        {/* Document Sheet */}
        <div className="overflow-x-auto py-2">
          <SupplierEvaluationDocumentSheet
            data={evaluationData}
            orientation={orientation}
            isInteractive={false}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
