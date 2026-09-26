import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  SupplierEvaluationDocumentSheet,
  SupplierEvaluationPreviewModal,
  SupplierEvaluationToolbar,
  type EvaluationDocumentOrientation,
  type SupplierEvaluationFormData,
} from "@/components/SupplierEvaluationDocument";
import { downloadSupplierEvaluationFormPdf } from "@/lib/procurementPdf";
import { trpc } from "@/lib/trpc";
import { normalizeProcurementRole } from "../../../shared/procurementRules";
import { criteriaForSupplierEvaluation, SUPPLIER_EVALUATION_RATINGS, type SupplierEvaluationAudience } from "../../../shared/supplierEvaluationForm";
import { ArrowRight, Download, Eye, LoaderCircle, ShieldCheck } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";

type FormPdf = Parameters<typeof downloadSupplierEvaluationFormPdf>[0];
const consentStatement = "I confirm that I am the authorized approver and electronically approve this completed Supplier Evaluation Form.";
const initialResponses = (audience: SupplierEvaluationAudience) => Object.fromEntries(criteriaForSupplierEvaluation(audience).map((criterion) => [criterion.key, 4])) as Record<string, number>;
const groupedCriteria = (audience: SupplierEvaluationAudience) => Array.from(new Set(criteriaForSupplierEvaluation(audience).map((criterion) => criterion.section))).map((section) => ({ section, criteria: criteriaForSupplierEvaluation(audience).filter((criterion) => criterion.section === section) }));

export function SupplierEvaluationFormPage() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const role = user ? normalizeProcurementRole(user.role) : "end_user";
  const audience: SupplierEvaluationAudience | null = role === "end_user" ? "end_user" : role === "procurement_officer" || role === "admin" ? "procurement_office" : null;
  const isApprover = role === "administrative_approver" || role === "admin";
  const setup = trpc.procurement.setup.details.useQuery(undefined, { enabled: Boolean(audience), retry: false });
  const dashboard = trpc.procurement.dashboard.useQuery(undefined, { enabled: audience === "procurement_office", retry: false });
  const eligibleOrders = trpc.procurement.officer.supplierEvaluations.eligibleOrders.useQuery(undefined, { enabled: audience === "end_user", retry: false });
  const pendingApprovals = trpc.procurement.officer.supplierEvaluations.pendingApprovals.useQuery(undefined, { enabled: isApprover, retry: false });

  const [orientation, setOrientation] = useState<EvaluationDocumentOrientation>("portrait");
  const [purchaseOrderId, setPurchaseOrderId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [respondentName, setRespondentName] = useState(user?.name || "");
  const [goodsServicesType, setGoodsServicesType] = useState("");
  const [registryReference, setRegistryReference] = useState("");
  const [registryRegisteredAt, setRegistryRegisteredAt] = useState("");
  const [registryExpiresAt, setRegistryExpiresAt] = useState("");
  const [reportedPurchaseRequestNumber, setReportedPurchaseRequestNumber] = useState("");
  const [urgentPurchaseRequestReason, setUrgentPurchaseRequestReason] = useState("");
  const [remarks, setRemarks] = useState("");
  const [responses, setResponses] = useState<Record<string, number>>(() => initialResponses(audience ?? "end_user"));
  const [completedPdf, setCompletedPdf] = useState<FormPdf | null>(null);
  const [approvalEvaluationId, setApprovalEvaluationId] = useState("");
  const [approverDesignation, setApproverDesignation] = useState("");
  const [approvalConsent, setApprovalConsent] = useState(false);
  const [signedPdf, setSignedPdf] = useState<FormPdf | null>(null);

  // Preview modal state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<SupplierEvaluationFormData | null>(null);

  const selectedEndUserOrder = useMemo(() => eligibleOrders.data?.find((entry) => entry.order.id === Number(purchaseOrderId)) ?? null, [eligibleOrders.data, purchaseOrderId]);
  const selectedProcurementOrder = useMemo(() => dashboard.data?.purchaseOrders.find((order) => order.id === Number(purchaseOrderId)) ?? null, [dashboard.data?.purchaseOrders, purchaseOrderId]);
  const selectedPrNumber = selectedProcurementOrder ? dashboard.data?.purchaseRequests.find((request) => request.id === selectedProcurementOrder.purchaseRequestId)?.prNumber || "" : "";
  const selectedSupplier = useMemo(() => setup.data?.suppliers.find((supplier) => supplier.id === (audience === "end_user" ? selectedEndUserOrder?.order.supplierId : Number(supplierId))) ?? null, [audience, selectedEndUserOrder?.order.supplierId, setup.data?.suppliers, supplierId]);
  const selectedOfficeName = selectedEndUserOrder?.request?.officeId ? setup.data?.offices.find((office) => office.id === selectedEndUserOrder.request?.officeId)?.name || "" : "";
  const officialPrNumber = audience === "end_user" ? selectedEndUserOrder?.request?.prNumber || "" : selectedPrNumber;
  const selectedPhilgepsNumber = audience === "end_user" ? selectedSupplier?.philgepsRegistrationNumber || "" : registryReference;
  const selectedPhilgepsRegisteredAt = audience === "end_user" ? selectedSupplier?.philgepsRegistrationDate || null : (registryRegisteredAt ? new Date(`${registryRegisteredAt}T00:00:00`) : null);
  const selectedPhilgepsExpiresAt = audience === "end_user" ? selectedSupplier?.philgepsExpirationDate || null : (registryExpiresAt ? new Date(`${registryExpiresAt}T00:00:00`) : null);
  const shownPrNumber = audience === "procurement_office" ? reportedPurchaseRequestNumber || officialPrNumber : officialPrNumber;
  const isUrgentPrReference = audience === "procurement_office" && Boolean(shownPrNumber) && shownPrNumber !== officialPrNumber;
  const criteria = audience ? groupedCriteria(audience) : [];
  const selectedPendingApproval = pendingApprovals.data?.find((entry) => entry.evaluation.id === Number(approvalEvaluationId)) ?? null;

  const buildCurrentPdf = (): FormPdf => ({
    audience: audience ?? "end_user",
    supplierName: selectedSupplier?.companyName || "",
    goodsServicesType,
    officeName: selectedOfficeName,
    purchaseRequestNumber: shownPrNumber || null,
    purchaseOrderNumber: audience === "end_user" ? selectedEndUserOrder?.order.poNumber || "" : selectedProcurementOrder?.poNumber || "",
    supplierRegistryReference: selectedPhilgepsNumber,
    supplierRegistryRegisteredAt: selectedPhilgepsRegisteredAt,
    supplierRegistryExpiresAt: selectedPhilgepsExpiresAt,
    responseScores: { ...responses },
    remarks,
    respondentName,
    evaluatedAt: new Date(),
  });

  const handleOpenCurrentPreview = () => {
    setPreviewData({
      audience: audience ?? "end_user",
      supplierName: selectedSupplier?.companyName || (audience === "end_user" ? "Selected Supplier" : "Supplier"),
      goodsServicesType,
      officeName: selectedOfficeName,
      purchaseRequestNumber: shownPrNumber || null,
      purchaseOrderNumber: audience === "end_user" ? selectedEndUserOrder?.order.poNumber || "PO-Pending" : selectedProcurementOrder?.poNumber || "PO-Pending",
      supplierRegistryReference: selectedPhilgepsNumber,
      supplierRegistryRegisteredAt: selectedPhilgepsRegisteredAt,
      supplierRegistryExpiresAt: selectedPhilgepsExpiresAt,
      responseScores: { ...responses },
      remarks,
      respondentName,
      evaluatedAt: new Date(),
      electronicApproval: null,
    });
    setPreviewOpen(true);
  };

  const handleOpenPendingApprovalPreview = () => {
    if (!selectedPendingApproval) return;
    const ev = selectedPendingApproval.evaluation;
    setPreviewData({
      audience: ev.evaluationAudience as SupplierEvaluationAudience,
      supplierName: selectedPendingApproval.supplier?.companyName || "Supplier",
      goodsServicesType: ev.goodsServicesType,
      officeName: null,
      purchaseRequestNumber: ev.reportedPurchaseRequestNumber,
      purchaseOrderNumber: selectedPendingApproval.purchaseOrder?.poNumber || "PO",
      supplierRegistryReference: ev.supplierRegistryReference,
      supplierRegistryRegisteredAt: ev.supplierRegistryRegisteredAt,
      supplierRegistryExpiresAt: ev.supplierRegistryExpiresAt,
      responseScores: (ev.responseScores as Record<string, number>) || {},
      remarks: ev.remarks,
      respondentName: ev.respondentName,
      evaluatedAt: ev.evaluatedAt,
      electronicApproval: null,
    });
    setPreviewOpen(true);
  };

  const endUserSubmit = trpc.procurement.officer.supplierEvaluations.submitEndUserForm.useMutation({
    onSuccess: () => { setCompletedPdf(buildCurrentPdf()); toast.success("Supplier Evaluation Form submitted. A controlled PDF is available below."); setPurchaseOrderId(""); setGoodsServicesType(""); setRemarks(""); setResponses(initialResponses("end_user")); },
    onError: (error) => toast.error(error.message),
  });
  const procurementSubmit = trpc.procurement.officer.supplierEvaluations.submitProcurementOfficeForm.useMutation({
    onSuccess: () => { setCompletedPdf(buildCurrentPdf()); toast.success("Supplier Evaluation Form submitted. A controlled PDF is available below."); setPurchaseOrderId(""); setSupplierId(""); setRemarks(""); setResponses(initialResponses("procurement_office")); },
    onError: (error) => toast.error(error.message),
  });
  const signApproval = trpc.procurement.officer.supplierEvaluations.signApproval.useMutation({
    onSuccess: (result) => {
      if (selectedPendingApproval) {
        setSignedPdf({ audience: result.evaluation.evaluationAudience, supplierName: selectedPendingApproval.supplier?.companyName || "", goodsServicesType: result.evaluation.goodsServicesType, purchaseRequestNumber: result.evaluation.reportedPurchaseRequestNumber, purchaseOrderNumber: selectedPendingApproval.purchaseOrder?.poNumber || "", supplierRegistryReference: result.evaluation.supplierRegistryReference, supplierRegistryRegisteredAt: result.evaluation.supplierRegistryRegisteredAt, supplierRegistryExpiresAt: result.evaluation.supplierRegistryExpiresAt, responseScores: result.evaluation.responseScores || {}, remarks: result.evaluation.remarks, respondentName: result.evaluation.respondentName, evaluatedAt: result.evaluation.evaluatedAt, electronicApproval: result.approval });
      }
      void utils.procurement.officer.supplierEvaluations.pendingApprovals.invalidate();
      setApprovalEvaluationId(""); setApproverDesignation(""); setApprovalConsent(false);
      toast.success("Electronic approval has been recorded with an integrity reference.");
    },
    onError: (error) => toast.error(error.message),
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!audience) return;
    const resolvedSupplierId = audience === "end_user" ? selectedEndUserOrder?.order.supplierId : Number(supplierId);
    const selectedOrderId = Number(purchaseOrderId);
    if (!selectedOrderId || !resolvedSupplierId) return toast.error("Complete the supplier and Purchase Order fields.");
    if (!respondentName.trim()) return toast.error("Complete the respondent name and signature field.");
    if (audience === "end_user") {
      if (!goodsServicesType.trim()) return toast.error("Complete the type of goods/services provided field.");
      return endUserSubmit.mutate({ supplierId: resolvedSupplierId, purchaseOrderId: selectedOrderId, goodsServicesType: goodsServicesType.trim(), responseScores: responses, remarks: remarks.trim() || undefined, respondentName: respondentName.trim() });
    }
    if (isUrgentPrReference && urgentPurchaseRequestReason.trim().length < 8) return toast.error("Provide an urgent Purchase Request reference reason before submitting.");
    return procurementSubmit.mutate({ supplierId: resolvedSupplierId, purchaseOrderId: selectedOrderId, supplierRegistryReference: registryReference.trim() || undefined, supplierRegistryRegisteredAt: registryRegisteredAt ? new Date(`${registryRegisteredAt}T00:00:00`) : undefined, supplierRegistryExpiresAt: registryExpiresAt ? new Date(`${registryExpiresAt}T00:00:00`) : undefined, reportedPurchaseRequestNumber: shownPrNumber || undefined, urgentPurchaseRequestReason: isUrgentPrReference ? urgentPurchaseRequestReason.trim() : undefined, responseScores: responses, remarks: remarks.trim() || undefined, respondentName: respondentName.trim() });
  };

  const isSaving = endUserSubmit.isPending || procurementSubmit.isPending;

  return (
    <div className="mx-auto max-w-[1120px] py-2">
      {/* Top Document Toolbar with Print and Orientation Controls */}
      {audience && (
        <SupplierEvaluationToolbar
          orientation={orientation}
          onOrientationChange={setOrientation}
          onPrint={() => window.print()}
          onDownloadPdf={completedPdf ? async () => await downloadSupplierEvaluationFormPdf(completedPdf) : undefined}
        />
      )}

      {audience ? (
        <form onSubmit={submit} className="w-full">
          {/* STANDARDIZED EVALUATION DOCUMENT CANVAS */}
          <article
            className={`evaluation-document-sheet relative mx-auto flex flex-col justify-between bg-white text-[#202833] border border-[#dfd9ce] shadow-sm transition-all dark:bg-white dark:text-[#202833] print:border-0 print:shadow-none print:m-0 print:p-0 ${
              orientation === "portrait" ? "portrait max-w-[850px] w-full" : "landscape max-w-[1120px] w-full"
            }`}
          >
            {/* REGION 1: DYNAMIC EDGE-TO-EDGE HEADER (width: 100%, padding: 0, margin: 0, flush against sheet borders) */}
            <header className="evaluation-header-container official-form-header print-include w-full p-0 m-0 leading-none overflow-hidden select-none border-b border-[#9a6d19] print:border-b-0 print:p-0 print:m-0">
              <img
                src="/header.png"
                alt="Batanes State College official header"
                className="w-full h-auto block object-cover print:w-full"
              />
            </header>

            {/* REGION 2: FORM CONTENT AREA (internal padding exclusively for form title, tables, scoring, PhilGEPS fields, and signatures) */}
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
                  ({audience === "end_user" ? (goodsServicesType?.trim() ? goodsServicesType : "Goods") : "Goods / Services"})
                </p>
                <p className="mt-0.5 text-xs italic text-[#52606d]">
                  To be accomplished by {audience === "end_user" ? "end-user" : "Procurement Office"}
                </p>
              </div>

              {/* Form Fields / Evaluation Parameters */}
              <div className="mt-5 grid gap-x-8 gap-y-4 md:grid-cols-2">
                {audience === "end_user" ? (
                  <>
                    <FormSelect
                      label="Name of Supplier"
                      value={purchaseOrderId}
                      onValueChange={(next) => {
                        setPurchaseOrderId(next);
                        setResponses(initialResponses("end_user"));
                      }}
                      placeholder="Select Purchase Order"
                    >
                      {eligibleOrders.data?.map((entry) => (
                        <SelectItem key={entry.order.id} value={String(entry.order.id)}>
                          {entry.order.poNumber} — {setup.data?.suppliers.find((supplier) => supplier.id === entry.order.supplierId)?.companyName || `Supplier #${entry.order.supplierId}`}
                        </SelectItem>
                      ))}
                    </FormSelect>
                    <FormField
                      label="Type of Goods/Services Provided"
                      value={goodsServicesType}
                      editable
                      onChange={setGoodsServicesType}
                    />
                    <FormField label="Office/Unit" value={selectedOfficeName} />
                    <FormField label="Purchase Order No." value={selectedEndUserOrder?.order.poNumber || ""} />
                    <FormField label="PhilGEPS Registration" value={selectedPhilgepsNumber || "Not recorded in supplier registry"} />
                    <FormField
                      label="Registration Date"
                      value={selectedPhilgepsRegisteredAt ? new Date(selectedPhilgepsRegisteredAt).toLocaleDateString("en-PH") : "Not recorded in supplier registry"}
                    />
                    <FormField
                      label="PhilGEPS Expiration Date"
                      value={selectedPhilgepsExpiresAt ? new Date(selectedPhilgepsExpiresAt).toLocaleDateString("en-PH") : "Not recorded in supplier registry"}
                    />
                  </>
                ) : (
                  <>
                    <FormSelect
                      label="Name of Supplier"
                      value={supplierId}
                      onValueChange={setSupplierId}
                      placeholder="Select supplier"
                    >
                      {setup.data?.suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={String(supplier.id)}>
                          {supplier.companyName}
                        </SelectItem>
                      ))}
                    </FormSelect>
                    <FormField
                      label="Purchase Request No."
                      value={shownPrNumber}
                      editable
                      onChange={setReportedPurchaseRequestNumber}
                    />
                    <FormSelect
                      label="Purchase Order No."
                      value={purchaseOrderId}
                      onValueChange={(next) => {
                        setPurchaseOrderId(next);
                        const order = dashboard.data?.purchaseOrders.find((entry) => entry.id === Number(next));
                        const pr = dashboard.data?.purchaseRequests.find((entry) => entry.id === order?.purchaseRequestId)?.prNumber || "";
                        setReportedPurchaseRequestNumber(pr);
                      }}
                      placeholder="Select Purchase Order"
                    >
                      {dashboard.data?.purchaseOrders.filter((order) => !supplierId || order.supplierId === Number(supplierId)).map((order) => (
                        <SelectItem key={order.id} value={String(order.id)}>
                          {order.poNumber}
                        </SelectItem>
                      ))}
                    </FormSelect>
                    <FormField
                      label="Supplier Registry RN"
                      value={registryReference}
                      editable
                      onChange={setRegistryReference}
                    />
                    <FormField
                      label="Date Registered"
                      value={registryRegisteredAt}
                      type="date"
                      editable
                      onChange={setRegistryRegisteredAt}
                    />
                    <FormField
                      label="Expiration Date"
                      value={registryExpiresAt}
                      type="date"
                      editable
                      onChange={setRegistryExpiresAt}
                    />
                  </>
                )}
              </div>

              {audience === "end_user" && selectedSupplier && !selectedPhilgepsNumber && (
                <div className="mt-4 border border-[#d9c28f] bg-[#fffaf0] p-3 text-[11px] leading-5 text-[#72561d] dark:border-[#635028] dark:bg-[#272118] dark:text-[#f0c36a]">
                  PhilGEPS registration information is not recorded for this supplier. Procurement Staff should update the supplier registry before relying on this evaluation record.
                </div>
              )}

              {isUrgentPrReference && (
                <div className="mt-4 border border-[#d9c28f] bg-[#fffaf0] dark:border-[#635028] dark:bg-[#272118] p-3">
                  <Label htmlFor="urgent-pr-reason" className="text-[11px] font-semibold text-[#634b1d] dark:text-[#f0c36a]">
                    Urgent Purchase Request reference reason (system audit control)
                  </Label>
                  <Textarea
                    id="urgent-pr-reason"
                    value={urgentPurchaseRequestReason}
                    onChange={(event) => setUrgentPurchaseRequestReason(event.target.value)}
                    className="mt-2 min-h-16 text-xs dark:bg-[#1b2229] dark:text-[#f1f5f8] dark:border-[#46515c]"
                    maxLength={1000}
                    placeholder="State why the displayed PR reference differs from the linked Purchase Request."
                  />
                </div>
              )}

              <OfficialInstructions />

              <div className="mt-4 flex items-center gap-2 border border-[#222] dark:border-[#64717d] bg-[#fffaf0] dark:bg-[#272118] px-3 py-2 text-[10px] text-[#72561d] dark:text-[#f0c36a] sm:hidden print:hidden no-print">
                <ArrowRight className="h-3.5 w-3.5 shrink-0" />
                Swipe the matrix horizontally to view and rate all response columns.
              </div>

              {/* Scoring Matrix */}
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-[800px] w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-white dark:bg-[#2b3540] text-[10px] font-bold text-black dark:text-[#ffffff]">
                      <th className="w-[48%] border border-[#222] dark:border-[#64717d] px-3 py-2 text-center text-[#1f2933] dark:text-[#ffffff]">
                        CRITERIA
                      </th>
                      {SUPPLIER_EVALUATION_RATINGS.map((rating) => (
                        <th
                          key={rating.score}
                          className="w-[13%] border border-[#222] dark:border-[#64717d] px-2 py-2 text-center leading-3 text-[#1f2933] dark:text-[#ffffff]"
                        >
                          {rating.label.toUpperCase()}<br />({rating.score})
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {criteria.map((group) => (
                      <GroupRows
                        key={group.section}
                        section={group.section}
                        criteria={group.criteria}
                        responses={responses}
                        setResponses={setResponses}
                      />
                    ))}
                    <tr>
                      <td colSpan={5} className="border border-[#222] dark:border-[#64717d] px-3 py-2">
                        <Label htmlFor="evaluation-remarks" className="text-[11px] italic text-[#52606d] dark:text-[#d1dae2]">
                          Additional comments, suggestions, recommendations, and/or feedback.
                        </Label>
                        <Textarea
                          id="evaluation-remarks"
                          value={remarks}
                          onChange={(event) => setRemarks(event.target.value)}
                          className="mt-2 min-h-20 border-0 p-0 text-xs shadow-none focus-visible:ring-0 text-[#1f2933] dark:text-[#f1f5f8] dark:bg-transparent"
                          maxLength={3000}
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Signatures & Form Submission Controls */}
              <div className="flex flex-wrap items-end justify-between gap-5 pb-2 pt-6">
                <div className="w-full max-w-md">
                  <Label htmlFor="respondent-name" className="text-[11px] text-[#1f2933] dark:text-[#f1f5f8]">
                    Name and Signature of Respondent:
                  </Label>
                  <Input
                    id="respondent-name"
                    value={respondentName}
                    onChange={(event) => setRespondentName(event.target.value)}
                    className="mt-1 h-8 rounded-none border-x-0 border-t-0 border-b border-[#222] dark:border-[#64717d] dark:bg-[#1b2229] dark:text-[#f1f5f8] px-0 text-xs shadow-none"
                    maxLength={180}
                  />
                </div>
                <div className="w-40">
                  <Label className="text-[11px] text-[#1f2933] dark:text-[#f1f5f8]">Date:</Label>
                  <div className="mt-1 h-8 border-b border-[#222] dark:border-[#64717d] pt-1 text-xs text-[#1f2933] dark:text-[#f1f5f8]">
                    {new Date().toLocaleDateString("en-PH")}
                  </div>
                </div>
                <div className="flex items-center gap-2 print:hidden no-print">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleOpenCurrentPreview}
                    className="h-9 rounded-[4px] border-[#c8c2b5] text-xs font-medium dark:border-[#46515c]"
                  >
                    <Eye className="mr-1.5 h-3.5 w-3.5 text-[#7b1e1e]" />
                    Preview Form
                  </Button>
                  <Button
                    disabled={isSaving}
                    className="h-9 rounded-[4px] bg-[#7b1e1e] text-xs text-white hover:bg-[#641818] dark:bg-[#d65c50] dark:text-white dark:hover:bg-[#eb766a]"
                  >
                    {isSaving && <LoaderCircle className="mr-1.5 h-3.5 w-3.5 animate-spin text-white" />}
                    Submit
                  </Button>
                </div>
              </div>
            </main>

            {/* REGION 3: DYNAMIC EDGE-TO-EDGE FOOTER (width: 100%, padding: 0, margin: 0, pinned flush to sheet bottom) */}
            <footer className="evaluation-footer-container official-form-footer print-include w-full p-0 m-0 leading-none overflow-hidden select-none border-t border-[#d8b04d] mt-auto print:border-t-0 print:p-0 print:m-0">
              <img
                src="/footer.png"
                alt="Batanes State College official footer"
                className="w-full h-auto block object-cover print:w-full"
              />
            </footer>
          </article>
        </form>
      ) : (
        <div className="border border-[#dfd9ce] bg-white dark:border-[#46515c] dark:bg-[#1b2229] p-8 text-center">
          <ShieldCheck className="mx-auto h-7 w-7 text-[#9a6d19] dark:text-[#f0c36a]" />
          <p className="mt-3 text-sm font-semibold text-[#1f2933] dark:text-[#f1f5f8]">
            Supplier Evaluation Form
          </p>
          <p className="mt-1 text-[11px] text-[#77818d] dark:text-[#aeb9c4]">
            This controlled form is completed only by its designated End-User or Procurement Office respondent.
          </p>
        </div>
      )}

      {/* Completed PDF Panel */}
      {completedPdf && (
        <div className="print:hidden no-print">
          <DownloadPanel title="Completed Supplier Evaluation Form saved" input={completedPdf} />
        </div>
      )}

      {/* Approver Electronic Approval Clearance Block */}
      {isApprover && (
        <div className="print:hidden no-print">
          <ElectronicApprovalSection
            pending={pendingApprovals.data ?? []}
            selectedId={approvalEvaluationId}
            onSelectedIdChange={setApprovalEvaluationId}
            designation={approverDesignation}
            onDesignationChange={setApproverDesignation}
            consent={approvalConsent}
            onConsentChange={setApprovalConsent}
            isSaving={signApproval.isPending}
            approverName={user?.name || user?.email || "Authorized approver"}
            onPreview={handleOpenPendingApprovalPreview}
            onSign={() => {
              if (!selectedPendingApproval) return toast.error("Select a completed Supplier Evaluation Form to approve.");
              if (!approverDesignation.trim()) return toast.error("Enter the authorized approver designation.");
              if (!approvalConsent) return toast.error("Confirm the electronic approval statement before signing.");
              signApproval.mutate({ supplierEvaluationId: selectedPendingApproval.evaluation.id, approverDesignation: approverDesignation.trim() });
            }}
          />
        </div>
      )}

      {/* Signed PDF Panel */}
      {signedPdf && (
        <div className="print:hidden no-print">
          <DownloadPanel title="Electronic approval recorded" input={signedPdf} />
        </div>
      )}

      {/* Standardized Preview & Print Dialog */}
      <SupplierEvaluationPreviewModal
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        evaluationData={previewData}
      />
    </div>
  );
}

function OfficialInstructions() {
  return (
    <section className="mt-6 text-[11px] leading-5 text-[#222] dark:text-[#d1dae2]">
      <p className="font-bold italic text-[#1f2933] dark:text-[#ffffff]">Instructions:</p>
      <p className="mt-1">
        This is a survey on the performance of our suppliers. It aims to improve our procurement service/system. Your sincere and honest answers will be highly appreciated and treated with utmost confidentiality.
      </p>
      <p className="mt-3">
        Please rate the supplier according to each criterion provided and put a checkmark (✓) on the column that best corresponds to your answer.
      </p>
      <p className="mt-3">Thank you very much.</p>
    </section>
  );
}

function FormSelect({
  label,
  value,
  onValueChange,
  placeholder,
  children,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label className="text-[11px] font-medium text-[#1f2933] dark:text-[#f1f5f8]">{label} :</Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="mt-1 h-8 rounded-none border-x-0 border-t-0 border-b border-[#222] dark:border-[#64717d] dark:bg-[#1b2229] dark:text-[#f1f5f8] px-0 text-xs shadow-none">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="dark:bg-[#1b2229] dark:border-[#46515c] dark:text-[#f1f5f8]">
          {children}
        </SelectContent>
      </Select>
    </div>
  );
}

function FormField({
  label,
  value,
  editable,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  editable?: boolean;
  onChange?: (value: string) => void;
  type?: "text" | "date";
}) {
  return (
    <div>
      <Label className="text-[11px] font-medium text-[#1f2933] dark:text-[#f1f5f8]">{label} :</Label>
      {editable ? (
        <Input
          type={type}
          value={value}
          onChange={(event) => onChange?.(event.target.value)}
          className="mt-1 h-8 rounded-none border-x-0 border-t-0 border-b border-[#222] dark:border-[#64717d] dark:bg-[#1b2229] dark:text-[#f1f5f8] px-0 text-xs shadow-none"
        />
      ) : (
        <div className="mt-1 h-8 border-b border-[#222] dark:border-[#64717d] pt-1 text-xs text-[#1f2933] dark:text-[#f1f5f8]">
          {value}
        </div>
      )}
    </div>
  );
}

function GroupRows({
  section,
  criteria,
  responses,
  setResponses,
}: {
  section: string;
  criteria: Array<{ key: string; label: string }>;
  responses: Record<string, number>;
  setResponses: React.Dispatch<React.SetStateAction<Record<string, number>>>;
}) {
  return (
    <>
      <tr>
        <th
          colSpan={5}
          className="border border-[#222] dark:border-[#64717d] bg-[#f1f3f5] dark:bg-[#232c35] px-3 py-1.5 text-left text-[10px] font-bold uppercase text-[#1f2933] dark:text-[#ffffff]"
        >
          {section}
        </th>
      </tr>
      {criteria.map((criterion) => (
        <tr key={criterion.key} className="hover:bg-[#fcfaf7] dark:hover:bg-[#242d36]">
          <td className="border border-[#222] dark:border-[#64717d] px-3 py-1.5 text-[11px] leading-4 text-[#1f2933] dark:text-[#f1f5f8]">
            {criterion.label}
          </td>
          {SUPPLIER_EVALUATION_RATINGS.map((rating) => (
            <td
              key={rating.score}
              className="border border-[#222] dark:border-[#64717d] px-2 py-1 text-center align-middle"
            >
              <input
                aria-label={`${criterion.label}: ${rating.label}`}
                type="radio"
                name={criterion.key}
                value={rating.score}
                checked={responses[criterion.key] === rating.score}
                onChange={() =>
                  setResponses((current) => ({
                    ...current,
                    [criterion.key]: rating.score,
                  }))
                }
                className="h-3.5 w-3.5 accent-[#8f2424] dark:accent-[#d65c50] cursor-pointer"
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function DownloadPanel({ title, input }: { title: string; input: FormPdf }) {
  return (
    <section className="mt-5 flex flex-wrap items-center justify-between gap-3 border border-[#d9c28f] bg-[#fffaf0] dark:border-[#635028] dark:bg-[#272118] px-4 py-3">
      <p className="text-xs text-[#634b1d] dark:text-[#f0c36a]">
        {title}. Download the supplied-form PDF for printing or authorized sharing.
      </p>
      <Button
        type="button"
        size="sm"
        onClick={async () => await downloadSupplierEvaluationFormPdf(input)}
        className="h-8 rounded-[4px] bg-[#7b1e1e] text-[11px] text-white hover:bg-[#641818] dark:bg-[#d65c50] dark:text-white dark:hover:bg-[#eb766a]"
      >
        <Download className="mr-1.5 h-3.5 w-3.5 text-white" />
        Download PDF
      </Button>
    </section>
  );
}

function ElectronicApprovalSection({
  pending,
  selectedId,
  onSelectedIdChange,
  designation,
  onDesignationChange,
  consent,
  onConsentChange,
  isSaving,
  approverName,
  onPreview,
  onSign,
}: {
  pending: Array<{
    evaluation: {
      id: number;
      reportedPurchaseRequestNumber: string | null;
      evaluationAudience: string;
      goodsServicesType?: string | null;
      supplierRegistryReference?: string | null;
      supplierRegistryRegisteredAt?: Date | string | null;
      supplierRegistryExpiresAt?: Date | string | null;
      responseScores?: unknown;
      remarks?: string | null;
      respondentName?: string | null;
      evaluatedAt: Date | string;
    };
    supplier: { companyName: string } | null;
    purchaseOrder: { poNumber: string } | null;
  }>;
  selectedId: string;
  onSelectedIdChange: (value: string) => void;
  designation: string;
  onDesignationChange: (value: string) => void;
  consent: boolean;
  onConsentChange: (value: boolean) => void;
  isSaving: boolean;
  approverName: string;
  onPreview?: () => void;
  onSign: () => void;
}) {
  return (
    <section className="mt-5 border border-[#d9c28f] bg-[#fffaf0] dark:border-[#635028] dark:bg-[#272118] p-5">
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-0.5 h-4 w-4 text-[#7b1e1e] dark:text-[#ff837a]" />
        <div>
          <p className="text-sm font-semibold text-[#4d3711] dark:text-[#f0c36a]">
            Electronic approval signature
          </p>
          <p className="mt-1 text-[11px] leading-5 text-[#705e35] dark:text-[#d1dae2]">
            This secure system control is recorded below—not inside—the controlled government form. It binds the authenticated approver, designation, consent, timestamp, and integrity reference to the completed evaluation.
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <FormSelect
          label="Completed Supplier Evaluation Form"
          value={selectedId}
          onValueChange={onSelectedIdChange}
          placeholder="Select completed form"
        >
          {pending.map((entry) => (
            <SelectItem key={entry.evaluation.id} value={String(entry.evaluation.id)}>
              {entry.purchaseOrder?.poNumber || `Evaluation #${entry.evaluation.id}`} — {entry.supplier?.companyName || "Recorded supplier"}
            </SelectItem>
          ))}
        </FormSelect>
        <FormField label="Authorized approver" value={approverName} />
        <FormField label="Designation" value={designation} editable onChange={onDesignationChange} />
      </div>
      {!pending.length && (
        <p className="mt-4 text-xs text-[#705e35] dark:text-[#aeb9c4]">
          There are no completed Supplier Evaluation Forms awaiting electronic approval.
        </p>
      )}
      <label className="mt-4 flex items-start gap-2 text-xs leading-5 text-[#4d3711] dark:text-[#d1dae2]">
        <Checkbox checked={consent} onCheckedChange={(checked) => onConsentChange(checked === true)} className="mt-0.5" />
        {consentStatement}
      </label>
      <div className="mt-4 flex items-center justify-end gap-2">
        {Boolean(selectedId) && onPreview && (
          <Button
            type="button"
            variant="outline"
            onClick={onPreview}
            className="h-9 rounded-[4px] border-[#c8c2b5] text-xs font-medium dark:border-[#46515c]"
          >
            <Eye className="mr-1.5 h-3.5 w-3.5 text-[#7b1e1e]" />
            Preview Official Form
          </Button>
        )}
        <Button
          type="button"
          disabled={isSaving || !pending.length}
          onClick={onSign}
          className="h-9 rounded-[4px] bg-[#7b1e1e] text-xs text-white hover:bg-[#641818] dark:bg-[#d65c50] dark:text-white dark:hover:bg-[#eb766a]"
        >
          {isSaving && <LoaderCircle className="mr-1.5 h-3.5 w-3.5 animate-spin text-white" />}
          Apply electronic signature
        </Button>
      </div>
    </section>
  );
}
