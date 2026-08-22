import { jsPDF } from "jspdf";

import type { BestValuePolicyHistoryEntry } from "./procurementExports";

type LineItem = { description: string; quantity: string | number; unit: string; amount: string | number; specification?: string | null; stockPropertyNo?: string | null };
const money = (value: string | number | null | undefined) => `₱${Number(value || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
const date = (value: Date | string | null | undefined) => value ? new Date(value).toLocaleDateString("en-PH") : "";
const value = (item: string | number | null | undefined) => String(item ?? "").trim();

export function officialFormFileName(kind: "purchase_request" | "pre_canvass" | "abstract" | "purchase_order" | "ppmp", recordNumber: string) { return `${recordNumber}_${{ purchase_request: "Appendix60", pre_canvass: "AnnexD", abstract: "AnnexF", purchase_order: "Appendix61", ppmp: "PPMP" }[kind]}.pdf`; }
export function invokeOfficialPdfDownload(doc: Pick<jsPDF, "save">, fileName: string) { doc.save(fileName); }

function formTitle(doc: jsPDF, marker: string, title: string) {
  doc.setFont("helvetica", "bold"); doc.setTextColor(0, 0, 0); doc.setFontSize(8); doc.text(marker, 196, 10, { align: "right" });
  doc.setFontSize(12); doc.text("BATANES STATE COLLEGE", 105, 15, { align: "center" }); doc.setFontSize(14); doc.text(title, 105, 22, { align: "center" });
}
function line(doc: jsPDF, x: number, y: number, width: number, label: string, fieldValue?: string | number | null) { doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.text(label, x, y); doc.line(x + doc.getTextWidth(label) + 2, y + 1, x + width, y + 1); if (value(fieldValue)) doc.text(value(fieldValue), x + doc.getTextWidth(label) + 4, y); }
function cell(doc: jsPDF, x: number, y: number, width: number, height: number, label: string, content?: string | number | null, align: "left" | "center" | "right" = "left") { doc.rect(x, y, width, height); doc.setFont("helvetica", "bold"); doc.setFontSize(6.4); doc.text(label, x + 2, y + 4); doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); const lines = doc.splitTextToSize(value(content), width - 4); doc.text(lines.slice(0, 2), align === "right" ? x + width - 2 : align === "center" ? x + width / 2 : x + 2, y + 9, { align }); }
function signBlock(doc: jsPDF, y: number, leftHeading: string, rightHeading: string, leftValue?: string | null, rightValue?: string | null) { doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.text(leftHeading, 20, y); doc.text(rightHeading, 116, y); doc.line(20, y + 18, 92, y + 18); doc.line(116, y + 18, 188, y + 18); doc.setFontSize(6.5); doc.text(value(leftValue) || "Signature over printed name", 56, y + 22, { align: "center" }); doc.text(value(rightValue) || "Signature over printed name", 152, y + 22, { align: "center" }); }
function footer(doc: jsPDF) { doc.setFont("helvetica", "normal"); doc.setFontSize(5.8); doc.setTextColor(90, 90, 90); doc.text("Controlled offline copy generated from the ProcureWise recorded transaction. Blank fields have not been assumed.", 14, 291); }
function tableHead(doc: jsPDF, y: number, columns: Array<{ label: string; x: number; width: number }>) { columns.forEach((column) => { doc.setFont("helvetica", "bold"); doc.setFontSize(6.2); doc.rect(column.x, y, column.width, 8); doc.text(column.label, column.x + column.width / 2, y + 5, { align: "center" }); }); }

export function downloadPurchaseRequestPdf(input: { purchaseRequest: { prNumber: string; entityName: string; purpose: string; fundSource: string | null; fundCluster: string; responsibilityCenterCode: string | null; requesterDesignation: string | null; totalEstimate: string; createdAt: Date }; items: Array<{ description: string; specification: string | null; quantity: string; unit: string; estimatedUnitCost: string; totalCost: string }> }) {
  const doc = new jsPDF({ unit: "mm", format: "a4" }); formTitle(doc, "Appendix 60", "PURCHASE REQUEST");
  line(doc, 14, 31, 88, "Entity Name:", input.purchaseRequest.entityName); line(doc, 110, 31, 86, "Fund Cluster:", input.purchaseRequest.fundCluster);
  line(doc, 14, 38, 88, "Office/Section:"); line(doc, 110, 38, 38, "PR No.:", input.purchaseRequest.prNumber); line(doc, 153, 38, 43, "Date:", date(input.purchaseRequest.createdAt)); line(doc, 14, 45, 182, "Responsibility Center Code:", input.purchaseRequest.responsibilityCenterCode);
  const cols = [{ label: "Stock/ Property No.", x: 14, width: 30 }, { label: "Unit", x: 44, width: 17 }, { label: "Item Description", x: 61, width: 73 }, { label: "Quantity", x: 134, width: 18 }, { label: "Unit Cost", x: 152, width: 22 }, { label: "Total Cost", x: 174, width: 22 }]; tableHead(doc, 51, cols); let y = 59;
  input.items.forEach((item) => { const h = 10; cols.forEach((column) => doc.rect(column.x, y, column.width, h)); doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.text(item.unit, 52, y + 6, { align: "center" }); doc.text(String(item.quantity), 143, y + 6, { align: "center" }); doc.text(money(item.estimatedUnitCost), 172, y + 6, { align: "right" }); doc.text(money(item.totalCost), 194, y + 6, { align: "right" }); doc.text(doc.splitTextToSize([item.description, item.specification].filter(Boolean).join(" — "), 69).slice(0, 2), 63, y + 4.5); y += h; });
  for (let row = input.items.length; row < 8; row += 1) { cols.forEach((column) => doc.rect(column.x, y, column.width, 8)); y += 8; }
  doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.text(`TOTAL: ${money(input.purchaseRequest.totalEstimate)}`, 196, y + 6, { align: "right" }); y += 15;
  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.text("Purpose:", 14, y); const purpose = doc.splitTextToSize(input.purchaseRequest.purpose, 176); doc.text(purpose, 14, y + 6); y += Math.max(23, purpose.length * 5 + 11); signBlock(doc, y, "Requested by:", "Approved by:", input.purchaseRequest.requesterDesignation); footer(doc); invokeOfficialPdfDownload(doc, officialFormFileName("purchase_request", input.purchaseRequest.prNumber));
}

export function downloadPreCanvassPdf(input: { preCanvass: { preCanvassNumber: string; approvedBudget: string | null; quotationDeadline: Date | null; deliveryPeriodDays: number | null; priceEvaluationMode: string | null; createdAt: Date }; quotes: Array<{ totalPrice: string; deliveryDays: number; isCompliant: number; quotationReference: string | null; supplierId: number }>; supplierNames: Map<number, string> }) {
  const doc = new jsPDF({ unit: "mm", format: "a4" }); formTitle(doc, "Annex D", "REQUEST FOR PRICE QUOTATION"); line(doc, 148, 31, 48, "Date:", date(input.preCanvass.createdAt));
  doc.setFont("helvetica", "normal"); doc.setFontSize(7.4); doc.text("Please give us your best and final price offer for the item/s listed below, have this signed and submit this by you or your duly authorized representative within the stated period to the Procurement Section, Batanes State College.", 14, 38, { maxWidth: 182 });
  const notes = [`1. The default mode of price evaluation is on a ${input.preCanvass.priceEvaluationMode === "per_item" ? "per item" : "lot"} basis.`, `2. Delivery period: ${input.preCanvass.deliveryPeriodDays ? `${input.preCanvass.deliveryPeriodDays} calendar days.` : "________________ calendar days."}`, "3. Submission of price quotation shall be in sealed envelope.", `4. THE APPROVED BUDGET FOR THIS PROCUREMENT IS ${input.preCanvass.approvedBudget ? money(input.preCanvass.approvedBudget) : "________________"}.`, "5. Applicable documentary requirements may be required before issuance of NOA or prior to payment.", "6. In case an item is not available, please write 'None'."];
  let y = 53; doc.setFontSize(6.5); notes.forEach((note) => { doc.text(doc.splitTextToSize(note, 180), 16, y); y += 6; }); const cols = [{ label: "Item #", x: 14, width: 16 }, { label: "Qty.", x: 30, width: 16 }, { label: "Unit", x: 46, width: 18 }, { label: "PARTICULAR", x: 64, width: 68 }, { label: "Unit Price", x: 132, width: 32 }, { label: "Total", x: 164, width: 32 }]; tableHead(doc, y + 2, cols); y += 10;
  const rows = Math.max(8, input.quotes.length); for (let index = 0; index < rows; index += 1) { const quote = input.quotes[index]; cols.forEach((column) => doc.rect(column.x, y, column.width, 9)); if (quote) { doc.setFont("helvetica", "normal"); doc.setFontSize(6.7); doc.text(String(index + 1).padStart(3, "0"), 22, y + 5.5, { align: "center" }); doc.text(doc.splitTextToSize(input.supplierNames.get(quote.supplierId) || `Supplier #${quote.supplierId}`, 64).slice(0, 2), 66, y + 4); doc.text(money(quote.totalPrice), 194, y + 5.5, { align: "right" }); } y += 9; }
  doc.setFontSize(6.3); doc.text("Supplier signature / authorized representative: ________________________________", 14, Math.min(y + 10, 270)); doc.text(`Quotation deadline: ${date(input.preCanvass.quotationDeadline) || "________________"}`, 112, Math.min(y + 10, 270)); footer(doc); invokeOfficialPdfDownload(doc, officialFormFileName("pre_canvass", input.preCanvass.preCanvassNumber));
}

export function downloadAbstractPdf(input: { abstract: { abstractNumber: string; openingDate: Date; openingLocation: string; procurementCategory: string; recommendationReason: string; status: string; recommendedSupplierId: number }; supplierName?: string }) {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" }); formTitle(doc, "Annex F", "ABSTRACT OF QUOTATION"); const right = 283;
  doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.text(`( x ) Furnishing/delivery of supplies, materials or equipment`, 14, 31); doc.text(`(   ) Furnishing labor, services, etc.`, 14, 37); doc.text(`Bids opened at ${input.abstract.openingLocation || "Basco, Batanes"}`, right, 31, { align: "right" }); doc.text(date(input.abstract.openingDate) || "___________", right, 37, { align: "right" }); doc.text("To be furnished at the BATANES STATE COLLEGE", 14, 46); doc.setFont("helvetica", "bold"); doc.text("NAME OF ARTICLES OR SERVICES TO BE FURNISHED, RENDERED OR FACILITIES TO BE RENTED", 14, 55);
  const cols = [{ label: "ARTICLE / SERVICE", x: 14, width: 75 }, { label: "RECOMMENDED SUPPLIER", x: 89, width: 70 }, { label: "CATEGORY", x: 159, width: 45 }, { label: "OPENING / STATUS", x: 204, width: 32 }, { label: "RECOMMENDATION", x: 236, width: 47 }]; tableHead(doc, 60, cols); cols.forEach((column) => doc.rect(column.x, 68, column.width, 85)); doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.text("Recorded quotation comparison", 16, 75); doc.text(input.supplierName || `Supplier #${input.abstract.recommendedSupplierId}`, 91, 75); doc.text(input.abstract.procurementCategory, 161, 75); doc.text(`${date(input.abstract.openingDate)}\n${input.abstract.status.toUpperCase()}`, 206, 75); doc.text(doc.splitTextToSize(input.abstract.recommendationReason, 43), 238, 75);
  doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.text("CERTIFICATION / RECOMMENDATION", 14, 166); doc.setFont("helvetica", "normal"); doc.setFontSize(7.3); doc.text("The comparative quotation record and lowest compliant supplier recommendation above are based solely on the recorded Pre-Canvass quotations.", 14, 173, { maxWidth: 260 }); signBlock(doc, 196, "Prepared by Procurement / BAC:", "Recommended / approved by:"); footer(doc); invokeOfficialPdfDownload(doc, officialFormFileName("abstract", input.abstract.abstractNumber));
}

export function downloadPpmpPdf(input: { fiscalYear: number; entries: Array<{ description: string; plannedAmount: string | number; actualAmount: string | number; status: string; officeName: string; objectOfExpenditureName: string; projectTitle?: string | null; papCode?: string | null; modeOfProcurement?: string | null; fundSource?: string | null; procurementSchedule?: string | null }> }) {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" }); formTitle(doc, "PPMP", "PROJECT PROCUREMENT MANAGEMENT PLAN");
  line(doc, 14, 31, 130, "Fiscal Year:", input.fiscalYear); line(doc, 153, 31, 130, "Institution:", "Batanes State College");
  const cols = [{ label: "OFFICE / EXPENDITURE OBJECT", x: 14, width: 55 }, { label: "PAP / PROJECT", x: 69, width: 48 }, { label: "DESCRIPTION", x: 117, width: 62 }, { label: "MODE / FUND", x: 179, width: 42 }, { label: "SCHEDULE", x: 221, width: 30 }, { label: "PLANNED", x: 251, width: 32 }, { label: "ACTUAL", x: 283, width: 32 }];
  tableHead(doc, 40, cols); let y = 48; const pageBottom = 185;
  input.entries.forEach((entry) => {
    if (y > pageBottom) { footer(doc); doc.addPage("a4", "landscape"); formTitle(doc, "PPMP", "PROJECT PROCUREMENT MANAGEMENT PLAN"); tableHead(doc, 20, cols); y = 28; }
    const height = 17; cols.forEach((column) => doc.rect(column.x, y, column.width, height)); doc.setFont("helvetica", "normal"); doc.setFontSize(6.3);
    doc.text(doc.splitTextToSize(`${entry.officeName}\n${entry.objectOfExpenditureName}`, 51).slice(0, 3), 16, y + 4); doc.text(doc.splitTextToSize([entry.papCode, entry.projectTitle].filter(Boolean).join(" — ") || "—", 44).slice(0, 3), 71, y + 4); doc.text(doc.splitTextToSize(entry.description, 58).slice(0, 3), 119, y + 4); doc.text(doc.splitTextToSize([entry.modeOfProcurement, entry.fundSource].filter(Boolean).join("\n") || "—", 38).slice(0, 3), 181, y + 4); doc.text(doc.splitTextToSize(entry.procurementSchedule || "—", 26).slice(0, 3), 223, y + 4); doc.text(money(entry.plannedAmount), 281, y + 8, { align: "right" }); doc.text(money(entry.actualAmount), 313, y + 8, { align: "right" });
    y += height;
  });
  if (!input.entries.length) { doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.text("No PPMP entries are included in the authorized current view.", 14, 57); }
  doc.setFont("helvetica", "normal"); doc.setFontSize(6.5); doc.text("This PPMP export includes only records visible to the signed-in user. Blank recorded fields are not assumed.", 14, 198); footer(doc); invokeOfficialPdfDownload(doc, officialFormFileName("ppmp", `PPMP_FY${input.fiscalYear}`));
}

export function downloadAbstractPackagePdf(input: { abstract: { abstractNumber: string; openingDate: Date; openingLocation: string; procurementCategory: string; recommendationReason: string; status: string; recommendedSupplierId: number }; preCanvassNumber: string; quotes: Array<{ supplierId: number; totalPrice: string | number; deliveryDays: number; isCompliant: number; quotationReference?: string | null; acknowledgedAt?: Date | null; receivedBy?: string | null; notes?: string | null }>; supplierNames: Map<number, string>; items: Array<{ description: string; specification?: string | null; quantity: string | number; unit: string; estimatedUnitCost?: string | number }> }) {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" }); formTitle(doc, "Annex F", "ABSTRACT OF QUOTATION — PACKAGE"); const right = 283;
  doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.text(`Pre-Canvass: ${input.preCanvassNumber}`, 14, 31); doc.text(`Bids opened at ${input.abstract.openingLocation || ""}`, right, 31, { align: "right" }); doc.text(`Opening date: ${date(input.abstract.openingDate)}`, right, 37, { align: "right" }); doc.text(`Procurement category: ${input.abstract.procurementCategory}`, 14, 37);
  const quoteCols = [{ label: "SUPPLIER", x: 14, width: 62 }, { label: "QUOTE REF.", x: 76, width: 35 }, { label: "QUOTED AMOUNT", x: 111, width: 35 }, { label: "DELIVERY", x: 146, width: 26 }, { label: "COMPLIANCE", x: 172, width: 31 }, { label: "ACKNOWLEDGEMENT", x: 203, width: 48 }, { label: "RECOMMENDATION", x: 251, width: 32 }]; tableHead(doc, 45, quoteCols); let y = 53;
  input.quotes.forEach((quote) => { const height = 15; quoteCols.forEach((column) => doc.rect(column.x, y, column.width, height)); doc.setFont("helvetica", "normal"); doc.setFontSize(6.5); doc.text(doc.splitTextToSize(input.supplierNames.get(quote.supplierId) || `Supplier #${quote.supplierId}`, 58).slice(0, 2), 16, y + 5); doc.text(quote.quotationReference || "—", 78, y + 8); doc.text(money(quote.totalPrice), 144, y + 8, { align: "right" }); doc.text(`${quote.deliveryDays} day(s)`, 159, y + 8, { align: "center" }); doc.text(quote.isCompliant ? "Compliant" : "Non-compliant", 187.5, y + 8, { align: "center" }); doc.text(doc.splitTextToSize([date(quote.acknowledgedAt), quote.receivedBy].filter(Boolean).join(" · ") || "—", 44).slice(0, 2), 205, y + 5); doc.text(quote.supplierId === input.abstract.recommendedSupplierId ? "Lowest compliant" : "—", 267, y + 8, { align: "center" }); y += height; });
  y += 8; doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.text("LINKED END-USER ITEM SCHEDULE", 14, y); y += 5; const itemCols = [{ label: "DESCRIPTION / SPECIFICATION", x: 14, width: 150 }, { label: "QTY.", x: 164, width: 28 }, { label: "UNIT", x: 192, width: 28 }, { label: "EST. UNIT COST", x: 220, width: 32 }, { label: "EST. TOTAL", x: 252, width: 31 }]; tableHead(doc, y, itemCols); y += 8;
  input.items.forEach((item) => { const height = 12; itemCols.forEach((column) => doc.rect(column.x, y, column.width, height)); doc.setFont("helvetica", "normal"); doc.setFontSize(6.5); doc.text(doc.splitTextToSize([item.description, item.specification].filter(Boolean).join(" — "), 146).slice(0, 2), 16, y + 4.5); doc.text(String(item.quantity), 178, y + 7, { align: "center" }); doc.text(item.unit, 206, y + 7, { align: "center" }); doc.text(item.estimatedUnitCost === undefined ? "—" : money(item.estimatedUnitCost), 250, y + 7, { align: "right" }); y += height; });
  y += 9; doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.text("CERTIFICATION / RECOMMENDATION", 14, y); doc.setFont("helvetica", "normal"); doc.setFontSize(7.2); doc.text(doc.splitTextToSize(input.abstract.recommendationReason, 260), 14, y + 7); signBlock(doc, Math.min(y + 28, 171), "Prepared by Procurement / BAC:", "Recommended / approved by:"); footer(doc); invokeOfficialPdfDownload(doc, `${input.abstract.abstractNumber}_AnnexF_AbstractPackage.pdf`);
}

export function downloadBestValuePolicyHistoryPdf(history: BestValuePolicyHistoryEntry[]) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const issueDate = new Date().toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" });
  const startPage = () => {
    formTitle(doc, "Compliance report", "BEST VALUE POLICY HISTORY");
    doc.setFont("helvetica", "normal"); doc.setFontSize(7.2);
    doc.text(`Generated: ${issueDate}`, 14, 31);
    doc.text("Batanes State College · ProcureWise controlled policy record", 196, 31, { align: "right" });
  };
  startPage();
  let y = 40;
  if (!history.length) {
    doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    doc.text("No saved Best Value policy versions are available in the authorized history.", 14, y);
  }
  history.forEach((entry) => {
    const neededHeight = 41 + Math.max(1, entry.criteria.length) * 11;
    if (y + neededHeight > 278) { footer(doc); doc.addPage("a4"); startPage(); y = 40; }
    doc.setFillColor(entry.policy.isActive ? 239 : 248, entry.policy.isActive ? 249 : 247, entry.policy.isActive ? 242 : 243);
    doc.rect(14, y, 182, 10, "F"); doc.setDrawColor(205, 198, 184); doc.rect(14, y, 182, 10);
    doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); doc.setTextColor(45, 55, 65);
    doc.text(`${entry.policy.policyCode} · VERSION ${entry.policy.version} · ${entry.policy.isActive ? "ACTIVE" : "INACTIVE"}`, 16, y + 6.5);
    doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.text(`Total weight: ${Number(entry.policy.totalWeight).toFixed(2)}%`, 194, y + 6.5, { align: "right" });
    y += 15;
    doc.setTextColor(0, 0, 0); doc.setFontSize(7.2);
    doc.text(`Policy: ${entry.policy.name}`, 16, y); y += 5;
    doc.text(`Created: ${date(entry.policy.createdAt)} · By: ${entry.createdBy?.name || entry.createdBy?.email || "Recorded administrator"}`, 16, y); y += 5;
    doc.text(`Status context: ${entry.activationAudit?.action || "Recorded policy version"} · ${entry.activationAudit ? date(entry.activationAudit.createdAt) : ""}${entry.policy.deactivatedAt ? ` · Deactivated: ${date(entry.policy.deactivatedAt)}` : ""}`, 16, y); y += 7;
    const columns = [{ label: "#", x: 14, width: 10 }, { label: "CRITERION", x: 24, width: 62 }, { label: "EVIDENCE BASIS", x: 86, width: 82 }, { label: "WEIGHT", x: 168, width: 28 }];
    tableHead(doc, y, columns); y += 8;
    entry.criteria.forEach((criterion) => {
      columns.forEach((column) => doc.rect(column.x, y, column.width, 11));
      doc.setFont("helvetica", "normal"); doc.setFontSize(6.6);
      doc.text(String(criterion.sortOrder), 19, y + 6.5, { align: "center" });
      doc.text(doc.splitTextToSize(criterion.label, 58).slice(0, 2), 26, y + 4.2);
      doc.text(doc.splitTextToSize(criterion.description || "", 78).slice(0, 2), 88, y + 4.2);
      doc.text(`${Number(criterion.weight).toFixed(2)}%`, 194, y + 6.5, { align: "right" });
      y += 11;
    });
    y += 7;
  });
  footer(doc);
  invokeOfficialPdfDownload(doc, "BestValuePolicy_History_ComplianceReport.pdf");
}

export function downloadPurchaseOrderPdf(input: { purchaseOrder: { poNumber: string; totalAmount: string; status: string; placeOfDelivery: string | null; scheduledDeliveryDate: Date | null; deliveryTerm: string | null; paymentTerm: string | null; modeOfProcurement: string | null; fundCluster: string | null; orsBursNumber: string | null; fundsAvailable: string | null; authorizedOfficialName: string | null; authorizedOfficialDesignation: string | null; chiefAccountantName: string | null }; supplierName?: string; supplierTin?: string | null }) {
  const doc = new jsPDF({ unit: "mm", format: "a4" }); formTitle(doc, "Appendix 61", "PURCHASE ORDER"); line(doc, 14, 31, 182, "Entity Name:", "Batanes State College"); line(doc, 14, 38, 88, "Supplier:", input.supplierName); line(doc, 110, 38, 86, "P.O. No.:", input.purchaseOrder.poNumber); line(doc, 14, 45, 88, "Address:"); line(doc, 110, 45, 86, "Date:", date(input.purchaseOrder.scheduledDeliveryDate)); line(doc, 14, 52, 88, "TIN:", input.supplierTin); line(doc, 110, 52, 86, "Mode of Procurement:", input.purchaseOrder.modeOfProcurement);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.text("Gentlemen: Please furnish this Office the following articles subject to the terms and conditions contained herein:", 14, 61); line(doc, 14, 69, 88, "Place of Delivery:", input.purchaseOrder.placeOfDelivery); line(doc, 110, 69, 86, "Delivery Term:", input.purchaseOrder.deliveryTerm || "FOB Destination"); line(doc, 14, 76, 88, "Date of Delivery:", date(input.purchaseOrder.scheduledDeliveryDate)); line(doc, 110, 76, 86, "Payment Term:", input.purchaseOrder.paymentTerm || "15 days upon complete delivery");
  const cols = [{ label: "Stock/ Property No.", x: 14, width: 30 }, { label: "Unit", x: 44, width: 17 }, { label: "Description", x: 61, width: 73 }, { label: "Quantity", x: 134, width: 18 }, { label: "Unit Cost", x: 152, width: 22 }, { label: "Amount", x: 174, width: 22 }]; tableHead(doc, 82, cols); let y = 90; for (let row = 0; row < 8; row += 1) { cols.forEach((column) => doc.rect(column.x, y, column.width, 8)); y += 8; } doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.text(`Total ${money(input.purchaseOrder.totalAmount)}`, 194, y + 6, { align: "right" }); doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.text("(Total Amount in Words) _____________________________________________________________", 14, y + 13); doc.text("In case of failure to make the full delivery within the time specified above, a penalty of one-tenth (1/10) of one percent for every day of delay shall be imposed on the undelivered item/s.", 14, y + 22, { maxWidth: 182 }); signBlock(doc, y + 40, "Conforme:", "Very truly yours,", undefined, [input.purchaseOrder.authorizedOfficialName, input.purchaseOrder.authorizedOfficialDesignation].filter(Boolean).join(", "));
  const bottom = y + 70; line(doc, 14, bottom, 88, "Fund Cluster:", input.purchaseOrder.fundCluster); line(doc, 110, bottom, 86, "ORS/BURS No.:", input.purchaseOrder.orsBursNumber); line(doc, 14, bottom + 7, 88, "Funds Available:", input.purchaseOrder.fundsAvailable ? money(input.purchaseOrder.fundsAvailable) : ""); line(doc, 110, bottom + 7, 86, "Amount:", input.purchaseOrder.totalAmount ? money(input.purchaseOrder.totalAmount) : ""); doc.line(14, bottom + 24, 102, bottom + 24); doc.setFontSize(6.5); doc.text(input.purchaseOrder.chiefAccountantName || "Signature over Printed Name of Chief Accountant / Head of Accounting Division / Unit", 58, bottom + 28, { align: "center" }); footer(doc); invokeOfficialPdfDownload(doc, officialFormFileName("purchase_order", input.purchaseOrder.poNumber));
}
