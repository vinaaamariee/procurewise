import { FormShell } from "@/components/FormShell";
import { PageHeader } from "@/components/PageHeader";
import { RecordTable, RecordTableHeader } from "@/components/RecordTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { downloadAbstractPdf, downloadPreCanvassPdf, downloadPurchaseOrderPdf, downloadPurchaseRequestPdf, downloadRfqAcknowledgementPdf } from "@/lib/procurementPdf";
import { Download, Eye, FileText, FolderUp, LoaderCircle, Paperclip } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type EntityType = "app_ppmp_entry" | "purchase_request" | "pre_canvass" | "abstract_of_canvass" | "purchase_order";

const documentTypeOptions = ["Supporting document", "Signed Purchase Request", "PPMP", "Preliminary quotation / completed pre-canvass", "Supplier quotation", "Canvass acknowledgement", "Official Abstract of Quotations", "Purchase Order", "Delivery receipt", "PMR attachment"];

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

export default function DocumentsPage() {
  const dashboard = trpc.procurement.dashboard.useQuery(undefined, { retry: false });
  const setup = trpc.procurement.setup.details.useQuery(undefined, { retry: false });
  const utils = trpc.useUtils();
  const [entityKey, setEntityKey] = useState("");
  const [documentType, setDocumentType] = useState("Supporting document");
  const [file, setFile] = useState<File | null>(null);
  const recordOptions = useMemo(() => [
    ...(dashboard.data?.appPpmpEntries ?? []).map((record) => ({ key: `app_ppmp_entry:${record.id}`, entityType: "app_ppmp_entry" as const, entityId: record.id, label: `FY ${record.fiscalYear} — ${record.description}` })),
    ...(dashboard.data?.purchaseRequests ?? []).map((record) => ({ key: `purchase_request:${record.id}`, entityType: "purchase_request" as const, entityId: record.id, label: `${record.prNumber} — Purchase Request` })),
    ...(dashboard.data?.preCanvasses ?? []).map((record) => ({ key: `pre_canvass:${record.id}`, entityType: "pre_canvass" as const, entityId: record.id, label: `${record.preCanvassNumber} — Pre-Canvass` })),
    ...(dashboard.data?.abstractsOfCanvass ?? []).map((record) => ({ key: `abstract_of_canvass:${record.id}`, entityType: "abstract_of_canvass" as const, entityId: record.id, label: `${record.abstractNumber} — Abstract of Canvass` })),
    ...(dashboard.data?.purchaseOrders ?? []).map((record) => ({ key: `purchase_order:${record.id}`, entityType: "purchase_order" as const, entityId: record.id, label: `${record.poNumber} — Purchase Order` })),
  ], [dashboard.data]);
  const selectedRecord = recordOptions.find((option) => option.key === entityKey);
  const selectedPreCanvass = selectedRecord?.entityType === "pre_canvass" ? dashboard.data?.preCanvasses.find((record) => record.id === selectedRecord.entityId) : undefined;
  const selectedAbstract = selectedRecord?.entityType === "abstract_of_canvass" ? dashboard.data?.abstractsOfCanvass.find((record) => record.id === selectedRecord.entityId) : undefined;
  const selectedPurchaseOrder = selectedRecord?.entityType === "purchase_order" ? dashboard.data?.purchaseOrders.find((record) => record.id === selectedRecord.entityId) : undefined;
  const abstractPreCanvass = selectedAbstract ? dashboard.data?.preCanvasses.find((record) => record.id === selectedAbstract.preCanvassId) : undefined;
  const linkedPurchaseRequestId = selectedRecord?.entityType === "purchase_request" ? selectedRecord.entityId : selectedPreCanvass?.purchaseRequestId ?? abstractPreCanvass?.purchaseRequestId ?? selectedPurchaseOrder?.purchaseRequestId ?? 0;
  const purchaseRequestDetail = trpc.procurement.purchaseRequests.detail.useQuery({ purchaseRequestId: linkedPurchaseRequestId }, { enabled: Boolean(linkedPurchaseRequestId), retry: false });
  const attach = trpc.procurement.documents.attach.useMutation({
    onSuccess: () => {
      toast.success("Document attached to the procurement record.");
      setFile(null);
      void utils.procurement.dashboard.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const record = recordOptions.find((option) => option.key === entityKey);
    if (!record || !file) return toast.error("Select a procurement record and an allowed document.");
    if (file.size > 10 * 1024 * 1024) return toast.error("Document uploads are limited to 10 MB.");
    try {
      attach.mutate({ entityType: record.entityType, entityId: record.entityId, documentType, originalFileName: file.name, mimeType: file.type || "application/octet-stream", dataBase64: await fileToBase64(file) });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The document could not be prepared for upload.");
    }
  };

  const recordLabel = (entityType: string, entityId: number) => recordOptions.find((option) => option.entityType === entityType && option.entityId === entityId)?.label || `${entityType.replaceAll("_", " ")} #${entityId}`;
  const downloadOfficialForm = async (preview = false) => {
    if (!selectedRecord) return toast.error("Select a procurement record before downloading an official-form copy.");
    const supplierMap = new Map((setup.data?.suppliers ?? []).map((supplier) => [supplier.id, supplier]));
    if (selectedRecord.entityType === "app_ppmp_entry") return toast.info("A PPMP official PDF template has not been supplied; the supporting file can be opened from the register.");
    if (selectedRecord.entityType === "purchase_request") {
      if (!purchaseRequestDetail.data) return toast.error("Purchase Request details are still loading.");
      return await downloadPurchaseRequestPdf(purchaseRequestDetail.data, { preview });
    }
    if (selectedRecord.entityType === "pre_canvass") {
      const preCanvass = selectedPreCanvass;
      if (!preCanvass) return toast.error("Pre-Canvass record is unavailable.");
      if (!purchaseRequestDetail.data) return toast.error("Linked Purchase Request items are still loading.");
      return await downloadPreCanvassPdf({ preCanvass, items: purchaseRequestDetail.data.items }, { preview });
    }
    if (selectedRecord.entityType === "abstract_of_canvass") {
      const abstract = selectedAbstract;
      if (!abstract) return toast.error("Abstract record is unavailable.");
      if (!purchaseRequestDetail.data) return toast.error("Linked Purchase Request items are still loading.");
      const preCanvass = dashboard.data?.preCanvasses.find((record) => record.id === abstract.preCanvassId);
      const supplierNames = (preCanvass ? dashboard.data?.preCanvassQuotes.filter((quote) => quote.preCanvassId === preCanvass.id) ?? [] : []).map((quote) => supplierMap.get(quote.supplierId)?.companyName || "");
      return await downloadAbstractPdf({ abstract, suppliers: supplierNames, items: purchaseRequestDetail.data.items }, { preview });
    }
    const purchaseOrder = selectedPurchaseOrder;
    if (!purchaseOrder) return toast.error("Purchase Order record is unavailable.");
    const supplier = supplierMap.get(purchaseOrder.supplierId);
    if (!purchaseRequestDetail.data) return toast.error("Linked Purchase Request items are still loading.");
    return await downloadPurchaseOrderPdf({ purchaseOrder, supplierName: supplier?.companyName, supplierTin: supplier?.tin, items: purchaseRequestDetail.data.items }, { preview });
  };
  const downloadAcknowledgement = async (preview = false) => {
    if (!selectedPreCanvass) return toast.error("Select a Pre-Canvass record before downloading Annex E.");
    const supplierMap = new Map((setup.data?.suppliers ?? []).map((supplier) => [supplier.id, supplier]));
    return await downloadRfqAcknowledgementPdf({ preCanvassNumber: selectedPreCanvass.preCanvassNumber, suppliers: (dashboard.data?.preCanvassQuotes.filter((quote) => quote.preCanvassId === selectedPreCanvass.id) ?? []).map((quote) => ({ companyName: supplierMap.get(quote.supplierId)?.companyName || `Supplier #${quote.supplierId}`, receivedBy: quote.receivedBy, receivedAt: quote.acknowledgedAt })) }, { preview });
  };

  const previewOfficialForm = () => downloadOfficialForm(true);
  const previewAcknowledgement = () => downloadAcknowledgement(true);
  return <div className="mx-auto max-w-[1240px]">
    <PageHeader eyebrow="Controlled records" title="Procurement document register" description="Attach and retrieve authorised supporting documents, including the End-User's three-file submission package and Procurement Staff/BAC's official Abstract of Quotations." />
    <div className="mt-7 grid gap-6 xl:grid-cols-[0.94fr_1.06fr]">
      <FormShell title="Attach supporting document" description="PDF, JPG, PNG, DOC, DOCX, XLS, and XLSX files up to 10 MB are stored securely against the selected procurement record." icon={<FolderUp className="h-4 w-4" />} onSubmit={submit}>
        <div className="mt-5 grid gap-4">
          <div><Label className="text-[11px] font-semibold">Procurement record</Label><Select value={entityKey} onValueChange={setEntityKey}><SelectTrigger className="mt-1.5 h-9 text-xs"><SelectValue placeholder="Select available record" /></SelectTrigger><SelectContent>{recordOptions.map((option) => <SelectItem key={option.key} value={option.key}>{option.label}</SelectItem>)}</SelectContent></Select>{!recordOptions.length && <p className="mt-1.5 text-[11px] leading-5 text-[#9a6d19]">Create or receive access to a procurement record before attaching supporting documents.</p>}</div>
          <div><Label className="text-[11px] font-semibold">Document classification</Label><Select value={documentType} onValueChange={setDocumentType}><SelectTrigger className="mt-1.5 h-9 text-xs"><SelectValue /></SelectTrigger><SelectContent>{documentTypeOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select></div>
          <div><Label htmlFor="procurement-document" className="text-[11px] font-semibold">File</Label><Input id="procurement-document" type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,application/pdf,image/jpeg,image/png,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event) => setFile(event.target.files?.[0] || null)} className="mt-1.5 h-9 text-xs file:mr-2 file:rounded-[3px] file:border-0 file:bg-[#7b1e1e] file:px-2.5 file:py-1 file:text-xs file:font-medium file:text-white dark:file:bg-[#d65c50]" />{file && <p className="mt-1.5 text-[11px] text-[#677281] dark:text-[#aeb9c4]">{file.name} · {(file.size / 1024).toFixed(1)} KB</p>}</div>
          <Button disabled={attach.isPending || !entityKey || !file} className="mt-1 h-9 rounded-[4px] bg-[#7b1e1e] text-xs text-white hover:bg-[#641818] dark:bg-[#d65c50] dark:text-white dark:hover:bg-[#eb766a]">{attach.isPending ? <LoaderCircle className="mr-1.5 h-3.5 w-3.5 animate-spin text-white" /> : <Paperclip className="mr-1.5 h-3.5 w-3.5 text-white" />}Attach document</Button>
        </div>
      </FormShell>
      <section className="flat-panel overflow-hidden"><div className="border-b border-[#ece8df] dark:border-[#46515c] px-5 py-4"><p className="text-sm font-semibold text-[#34404e] dark:text-[#f1f5f8]">Available documents</p><p className="mt-1 text-[11px] text-[#77818d] dark:text-[#aeb9c4]">You can access only documents associated with records visible to your assigned role.</p></div>{dashboard.isLoading ? <div className="grid min-h-48 place-items-center"><LoaderCircle className="h-5 w-5 animate-spin text-[#7b1e1e] dark:text-[#d65c50]" /></div> : dashboard.data?.documents.length ? <RecordTable className="border-0"><RecordTableHeader><tr><th className="px-4 py-3 font-semibold">Document</th><th className="px-4 py-3 font-semibold">Linked record</th><th className="px-4 py-3 font-semibold">Added</th><th className="px-4 py-3 font-semibold">Open</th></tr></RecordTableHeader><tbody className="divide-y divide-[#efebe4] dark:divide-[#46515c]">{dashboard.data.documents.map((document) => <tr key={document.id}><td className="px-4 py-3"><p className="font-semibold text-[#3f4a57] dark:text-[#f1f5f8]">{document.documentType}</p><p className="mt-0.5 max-w-[210px] truncate text-[11px] text-[#77818d] dark:text-[#aeb9c4]">{document.originalFileName}</p></td><td className="px-4 py-3 text-[11px] text-[#65717e] dark:text-[#d1dae2]">{recordLabel(document.entityType, document.entityId)}</td><td className="px-4 py-3 text-[11px] text-[#77818d] dark:text-[#aeb9c4]">{new Date(document.createdAt).toLocaleDateString("en-PH")}</td><td className="px-4 py-3"><a href={document.storageUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#7b1e1e] hover:underline dark:text-[#ff837a]"><FileText className="h-3.5 w-3.5" />View</a></td></tr>)}</tbody></RecordTable> : <div className="p-8 text-center text-[11px] leading-5 text-[#77818d] dark:text-[#aeb9c4]">No authorised supporting documents are attached to the procurement records available to you.</div>}</section>
    </div>
    <section className="flat-panel mt-6 flex flex-wrap items-center justify-between gap-4 p-5"><div><p className="text-sm font-semibold text-[#34404e] dark:text-[#f1f5f8]">Official-form PDF copy</p><p className="mt-1 text-[11px] leading-5 text-[#77818d] dark:text-[#aeb9c4]">Download the controlled Appendix 60 Purchase Request, Annex D Request for Price Quotation, Annex E acknowledgement, Annex F Abstract, or Appendix 61 Purchase Order for the selected record.</p></div><div className="flex flex-wrap gap-2"><Button type="button" onClick={() => void previewOfficialForm()} disabled={!selectedRecord || purchaseRequestDetail.isLoading || selectedRecord.entityType === "app_ppmp_entry"} variant="outline" className="h-9 rounded-[4px] border-[#d6c6a2] text-xs text-[#7b1e1e] hover:bg-[#fffaf0] dark:border-[#635028] dark:text-[#ff837a] dark:hover:bg-[#272118]"><Eye className="mr-1.5 h-3.5 w-3.5" />Preview before printing</Button><Button type="button" onClick={() => void downloadOfficialForm()} disabled={!selectedRecord || purchaseRequestDetail.isLoading} className="h-9 rounded-[4px] bg-[#7b1e1e] text-xs text-white hover:bg-[#641818] dark:bg-[#d65c50] dark:text-white dark:hover:bg-[#eb766a]"><Download className="mr-1.5 h-3.5 w-3.5 text-white" />Download official PDF</Button>{selectedRecord?.entityType === "pre_canvass" && <><Button type="button" variant="outline" onClick={() => void previewAcknowledgement()} className="h-9 rounded-[4px] border-[#d6c6a2] text-xs text-[#7b1e1e] hover:bg-[#fffaf0] dark:border-[#635028] dark:text-[#ff837a] dark:hover:bg-[#272118]"><Eye className="mr-1.5 h-3.5 w-3.5" />Preview Annex E</Button><Button type="button" variant="outline" onClick={() => void downloadAcknowledgement()} className="h-9 rounded-[4px] border-[#d6c6a2] text-xs text-[#7b1e1e] hover:bg-[#fffaf0] dark:border-[#635028] dark:text-[#ff837a] dark:hover:bg-[#272118]"><Download className="mr-1.5 h-3.5 w-3.5" />Download Annex E</Button></>}</div></section>
  </div>;
}
