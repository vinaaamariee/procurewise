import { jsPDF } from "jspdf";

import type { BestValuePolicyHistoryEntry } from "./procurementExports";
import { criteriaForSupplierEvaluation, SUPPLIER_EVALUATION_RATINGS, type SupplierEvaluationAudience } from "../../../shared/supplierEvaluationForm";

type LineItem = { description: string; quantity: string | number; unit: string; amount: string | number; specification?: string | null; stockPropertyNo?: string | null };
const money = (value: string | number | null | undefined) => `₱${Number(value || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
const date = (value: Date | string | null | undefined) => value ? new Date(value).toLocaleDateString("en-PH") : "";
const value = (item: string | number | null | undefined) => String(item ?? "").trim();

const BSC_HEADER_URL = "/manus-storage/bsc-header_31d256ab.png";
const BSC_FOOTER_URL = "/manus-storage/bsc-footer_9296dc8a.png";
let bscLetterheadPromise: Promise<{ header: string; footer: string }> | null = null;

async function imageUrlToDataUrl(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Unable to load print branding asset: ${url}`);
  const blob = await response.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Unable to read print branding asset."));
    reader.readAsDataURL(blob);
  });
}

async function addBscLetterhead(doc: jsPDF) {
  bscLetterheadPromise ??= Promise.all([imageUrlToDataUrl(BSC_HEADER_URL), imageUrlToDataUrl(BSC_FOOTER_URL)]).then(([header, footer]) => ({ header, footer }));
  const { header, footer } = await bscLetterheadPromise;
  doc.addImage(header, "PNG", 0, 0, 210, 24.2);
  doc.addImage(footer, "PNG", 0, 263, 210, 32.6);
}

export function officialFormFileName(kind: "purchase_request" | "pre_canvass" | "abstract" | "purchase_order" | "ppmp", recordNumber: string) { return `${recordNumber}_${{ purchase_request: "Appendix60", pre_canvass: "AnnexD", abstract: "AnnexF", purchase_order: "Appendix61", ppmp: "PPMP" }[kind]}.pdf`; }
export function invokeOfficialPdfDownload(doc: Pick<jsPDF, "save">, fileName: string) { doc.save(fileName); }

function formTitle(doc: jsPDF, marker: string, title: string) {
  doc.setFont("helvetica", "bold"); doc.setTextColor(0, 0, 0); doc.setFontSize(8); doc.text(marker, 196, 10, { align: "right" });
  doc.setFontSize(12); doc.text("BATANES STATE COLLEGE", 105, 15, { align: "center" }); doc.setFontSize(14); doc.text(title, 105, 22, { align: "center" });
}
function line(doc: jsPDF, x: number, y: number, width: number, label: string, fieldValue?: string | number | null) { doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.text(label, x, y); doc.line(x + doc.getTextWidth(label) + 2, y + 1, x + width, y + 1); if (value(fieldValue)) doc.text(value(fieldValue), x + doc.getTextWidth(label) + 4, y); }
function cell(doc: jsPDF, x: number, y: number, width: number, height: number, label: string, content?: string | number | null, align: "left" | "center" | "right" = "left") { doc.rect(x, y, width, height); doc.setFont("helvetica", "bold"); doc.setFontSize(6.4); doc.text(label, x + 2, y + 4); doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); const lines = doc.splitTextToSize(value(content), width - 4); doc.text(lines.slice(0, 2), align === "right" ? x + width - 2 : align === "center" ? x + width / 2 : x + 2, y + 9, { align }); }
function signBlock(doc: jsPDF, y: number, leftHeading: string, rightHeading: string, leftValue?: string | null, rightValue?: string | null) { doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.text(leftHeading, 20, y); doc.text(rightHeading, 116, y); doc.line(20, y + 18, 92, y + 18); doc.line(116, y + 18, 188, y + 18); doc.setFontSize(6.5); doc.text(value(leftValue) || "Signature over printed name", 56, y + 22, { align: "center" }); doc.text(value(rightValue) || "Signature over printed name", 152, y + 22, { align: "center" }); }
function footer(doc: jsPDF) { doc.setFont("helvetica", "normal"); doc.setFontSize(5.8); doc.setTextColor(90, 90, 90); doc.text("Controlled offline copy generated from the ProcureWise recorded transaction. Blank fields have not been assumed.", 14, 260); }
function tableHead(doc: jsPDF, y: number, columns: Array<{ label: string; x: number; width: number }>) { columns.forEach((column) => { doc.setFont("helvetica", "bold"); doc.setFontSize(6.2); doc.rect(column.x, y, column.width, 8); doc.text(column.label, column.x + column.width / 2, y + 5, { align: "center" }); }); }

export async function downloadPurchaseRequestPdf(input: { purchaseRequest: { prNumber: string; entityName: string; purpose: string; fundSource: string | null; fundCluster: string; responsibilityCenterCode: string | null; requesterDesignation: string | null; totalEstimate: string; createdAt: Date }; items: Array<{ description: string; stockPropertyNo?: string | null; specification: string | null; quantity: string; unit: string; estimatedUnitCost: string; totalCost: string }> }) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  await addBscLetterhead(doc);
  doc.setFont("helvetica", "italic"); doc.setFontSize(7); doc.text("Appendix 60", 196, 10, { align: "right" }); doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.text("PURCHASE REQUEST", 105, 24, { align: "center" });
  doc.setDrawColor(0, 0, 0); doc.setLineWidth(0.2); doc.setFont("helvetica", "normal"); doc.setFontSize(7);
  line(doc, 14, 34, 88, "Entity Name:", input.purchaseRequest.entityName); line(doc, 108, 34, 88, "Fund Cluster:", input.purchaseRequest.fundCluster);
  line(doc, 14, 41, 61, "Office/Section:"); line(doc, 75, 41, 60, "PR No.:", input.purchaseRequest.prNumber); line(doc, 135, 41, 61, "Date:", date(input.purchaseRequest.createdAt));
  line(doc, 75, 48, 121, "Responsibility Center Code:", input.purchaseRequest.responsibilityCenterCode);
  const cols = [{ label: "Stock/ Property\nNo.", x: 14, width: 30 }, { label: "Unit", x: 44, width: 22 }, { label: "Item Description", x: 66, width: 63 }, { label: "Quantity", x: 129, width: 27 }, { label: "Unit\nCost", x: 156, width: 19 }, { label: "Total Cost", x: 175, width: 21 }];
  const tableY = 54; cols.forEach((column) => { doc.rect(column.x, tableY, column.width, 10); doc.setFont("helvetica", "bold"); doc.setFontSize(6.2); doc.text(column.label.split("\n"), column.x + column.width / 2, tableY + 4, { align: "center" }); });
  let y = tableY + 10; const rows = Math.max(20, input.items.length);
  for (let index = 0; index < rows; index += 1) { const item = input.items[index]; cols.forEach((column) => doc.rect(column.x, y, column.width, 6.5)); if (item) { doc.setFont("helvetica", "normal"); doc.setFontSize(6.3); doc.text(value(item.stockPropertyNo), 15.5, y + 4.3); doc.text(item.unit, 55, y + 4.3, { align: "center" }); doc.text(doc.splitTextToSize([item.description, item.specification].filter(Boolean).join(" "), 59).slice(0, 1), 67.5, y + 4.3); doc.text(String(item.quantity), 142.5, y + 4.3, { align: "center" }); doc.text(money(item.estimatedUnitCost), 173.5, y + 4.3, { align: "right" }); doc.text(money(item.totalCost), 194, y + 4.3, { align: "right" }); } y += 6.5; }
  doc.setFont("helvetica", "bold"); doc.setFontSize(7); doc.text("Purpose:", 14, y + 6); doc.setFont("helvetica", "normal"); const purposeLines = doc.splitTextToSize(input.purchaseRequest.purpose, 175).slice(0, 3); doc.text(purposeLines, 14, y + 12); doc.line(14, y + 14, 196, y + 14); doc.line(14, y + 20, 196, y + 20); doc.line(14, y + 26, 196, y + 26);
  const signatureY = y + 34; doc.line(14, signatureY - 4, 196, signatureY - 4); doc.line(105, signatureY - 4, 105, signatureY + 24); doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.text("Requested by:", 45, signatureY, { align: "center" }); doc.text("Approved by:", 150, signatureY, { align: "center" }); ["Signature :", "Printed Name :", "Designation :"].forEach((label, index) => { const rowY = signatureY + 7 + index * 6; doc.text(label, 15, rowY); doc.line(45, rowY + 1, 86, rowY + 1); doc.line(137, rowY + 1, 187, rowY + 1); }); doc.text(input.purchaseRequest.requesterDesignation || "", 45, signatureY + 19, { align: "center" });
  invokeOfficialPdfDownload(doc, officialFormFileName("purchase_request", input.purchaseRequest.prNumber));
}

export async function downloadPreCanvassPdf(input: { preCanvass: { preCanvassNumber: string; approvedBudget: string | null; quotationDeadline: Date | null; deliveryPeriodDays: number | null; priceEvaluationMode: string | null; createdAt: Date }; supplierName?: string | null; items: Array<{ description: string; quantity: string; unit: string }> }) {
  const doc = new jsPDF({ unit: "mm", format: "a4" }); await addBscLetterhead(doc); doc.setFont("helvetica", "italic"); doc.setFontSize(7); doc.text("Annex D", 14, 9); doc.setFont("helvetica", "normal"); doc.setFontSize(7); line(doc, 164, 9, 32, "Date:", date(input.preCanvass.createdAt)); doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.text("REQUEST FOR PRICE QUOTATION", 105, 19, { align: "center" }); doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.text(input.supplierName || "", 14, 25); doc.text(doc.splitTextToSize("Please give us your best and final price offer for the item/s listed below, have this signed and submit this by you or by your duly authorized representative WITHIN SEVEN (7) CALENDAR DAYS upon receipt to Procurement Section, Batanes State College.", 180), 14, 30);
  const notes = [
    "NOTE: 1. THE DEFAULT MODE OF PRICE EVALUATION SHALL BE ON A LOT BASIS, OTHERWISE PER ITEMS EVALUATION SHALL BE USED IF THERE WILL BE LACKING ITEMS IN ALL RFQ's AND SUBJECT TO END-USER APPROVAL., (Clause 15.2, Section I, Instruction to Bidders of the Philippine Bidding Documents for goods and infrastructure projects)",
    `2. DELIVERY PERIOD: ${input.preCanvass.deliveryPeriodDays ? `${input.preCanvass.deliveryPeriodDays} calendar days.` : "Thirty (30) calendar days."}`,
    "3. Submission of price quotation shall be in sealed envelope.",
    "4. THE APPROVED BUDGET FOR THIS PROCUREMENT IS",
    input.preCanvass.approvedBudget ? money(input.preCanvass.approvedBudget) : "₱",
    "5. PURSUANT TO ANNEX \"H\", APPENDIX A, SECTION II, SUBMISSION OF APPLICABLE DOCUMENTS (e.g.MAYORS/BUSINESS PERMIT, PROFESSIONAL LICENSE/CURRICULUM VITAE (CONSULTING SERVICES),PHILGEPS CERT. NO., PCAB LICENSE (INFRA), INCOME/BUSINESS TAX RETURN,OMNIBUS SWORN STATEMENT SHALL BE REQUIRED BEFORE THE ISSUANCE OF NOA OR PRIOR TO PAYMENT.",
    "6. In case the item is not availble, please write \"None\".",
  ];
  let y = 43; doc.setFontSize(5.6); notes.forEach((note) => { const lines = doc.splitTextToSize(note, 179); doc.text(lines, 16, y); y += Math.max(4, lines.length * 2.6); });
  const cols = [{ label: "Item #", x: 14, width: 18 }, { label: "Qty.", x: 32, width: 17 }, { label: "Unit", x: 49, width: 18 }, { label: "PARTICULAR", x: 67, width: 73 }, { label: "Unit Price", x: 140, width: 28 }, { label: "Total", x: 168, width: 28 }]; tableHead(doc, y + 2, cols); y += 10;
  for (let index = 0; index < Math.max(10, input.items.length); index += 1) { const item = input.items[index]; cols.forEach((column) => doc.rect(column.x, y, column.width, 7)); doc.setFont("helvetica", "normal"); doc.setFontSize(6.3); doc.text(String(index + 1).padStart(3, "0"), 23, y + 4.7, { align: "center" }); if (item) { doc.text(item.quantity, 40.5, y + 4.7, { align: "center" }); doc.text(item.unit, 58, y + 4.7, { align: "center" }); doc.text(doc.splitTextToSize(item.description, 69).slice(0, 1), 68.5, y + 4.7); } y += 7; }
  doc.setFont("helvetica", "bold"); doc.setFontSize(7); doc.text("Total", 168, y + 5); y += 10; doc.setFont("helvetica", "normal"); doc.setFontSize(6.2); doc.text(doc.splitTextToSize("After having carefully read and accepted your conditions, I/We have place my /our best and final price offer on the item/s listed above.", 178), 14, y); y += 16; doc.line(14, y, 196, y); doc.line(105, y, 105, y + 23); doc.setFontSize(7); doc.text("Printed Name/Signature", 18, y + 11); doc.text("Very truly yours,", 144, y + 11); doc.line(14, y + 23, 196, y + 23); doc.text("Ref.#", 15, y + 30); doc.text("BAC Chairperson", 157, y + 30, { align: "center" });
  invokeOfficialPdfDownload(doc, officialFormFileName("pre_canvass", input.preCanvass.preCanvassNumber));
}

export async function downloadRfqAcknowledgementPdf(input: { preCanvassNumber: string; suppliers: Array<{ companyName: string; receivedBy?: string | null; receivedAt?: Date | string | null }> }) {
  const doc = new jsPDF({ unit: "mm", format: "a4" }); await addBscLetterhead(doc); doc.setFont("helvetica", "italic"); doc.setFontSize(7); doc.text("Annex E", 14, 9); doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.text("Acknowledgement for Request for Quotation", 105, 18, { align: "center" }); doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.text(`RIS# ${input.preCanvassNumber}`, 14, 25);
  const drawRegister = (title: string, startY: number, includeRemarks: boolean) => { const cols = includeRemarks ? [{ label: "No.", x: 14, width: 12 }, { label: "Supplier", x: 26, width: 75 }, { label: "Released by:", x: 101, width: 35 }, { label: "Date & Time:", x: 136, width: 34 }, { label: "Remarks", x: 170, width: 26 }] : [{ label: "No.", x: 14, width: 12 }, { label: "Supplier", x: 26, width: 88 }, { label: "Received by:", x: 114, width: 42 }, { label: "Date & Time:", x: 156, width: 40 }]; doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.text(title, 14, startY - 3); tableHead(doc, startY, cols); let y = startY + 8; for (let index = 0; index < Math.max(8, input.suppliers.length); index += 1) { const supplier = input.suppliers[index]; cols.forEach((column) => doc.rect(column.x, y, column.width, 7)); doc.setFont("helvetica", "normal"); doc.setFontSize(6.3); doc.text(String(index + 1), 20, y + 4.7, { align: "center" }); if (supplier) { doc.text(doc.splitTextToSize(supplier.companyName, includeRemarks ? 71 : 84).slice(0, 1), 28, y + 4.7); if (!includeRemarks) { doc.text(value(supplier.receivedBy), 116, y + 4.7); doc.text(date(supplier.receivedAt), 158, y + 4.7); } } y += 7; } return y; };
  let y = drawRegister("", 31, false); const notes = ["NOTE: 1. MODE OF PRICE EVALUATION SHALL BE ON A LOT BASIS, OTHERWISE PER ITEMS EVALUATION SHALL BE USED IF THERE WILL BE LACKING ITEMS IN ALL RFQ'S AND THE END-USER AGREED, . (Clause 15.2, Section II, Instructions to Bidders of the Philippine Bidding Documents for goods and infrastructure projects)", "2. DELIVERY PERIOD: Thirty (30) calendar days.", "3. WARRANTY SHALL BE FOR A PERIOD OF SIX (6) MONTHS FOR SUPPLIES AND MATERIALS, ONE (1) YEAR FOR EQUIPMENT, FROM THE DATE OF ACCEPTANCE BY THE PROCURING ENTITY.", "4. THE APPROVED BUDGET CEILING FOR THIS PROCUREMENT IS PHP (GPPB Resolution no. 09-2009)", "₱", "5. PRICE VALIDITY SHALL BE OR THE PERIOD OF 30 CALENDAR DAYS.", "6. BIDDERS SHALL SUBMIT ORIGINAL BROCHURES SHOWING SPECIFICATIONS OF THE PRODUCT BEING OFFERED IF APPLICABLE.", "In compliance with GPPB Resolution No. 09-2009"]; doc.setFontSize(5.6); notes.forEach((note) => { const lines = doc.splitTextToSize(note, 180); doc.text(lines, 16, y + 3); y += Math.max(4, lines.length * 2.6); }); drawRegister("Retrieval of Request for Quotation", y + 7, true); invokeOfficialPdfDownload(doc, `${input.preCanvassNumber}_AnnexE_Acknowledgement.pdf`);
}

export async function downloadAbstractPdf(input: { abstract: { abstractNumber: string; openingDate: Date; openingLocation: string; procurementCategory: string; recommendationReason: string; status: string; recommendedSupplierId: number }; suppliers: string[]; items: Array<{ description: string }> }) {
  const doc = new jsPDF({ unit: "mm", format: "a4" }); await addBscLetterhead(doc); doc.setFont("helvetica", "italic"); doc.setFontSize(7); doc.text("Annex F", 14, 9); doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.text("ABSTRACT OF QUOTATION", 105, 19, { align: "center" }); doc.setFont("helvetica", "normal"); doc.setFontSize(6.5); doc.text("(x) Furnishing/delivery of supplies, and materials or equipment", 34, 28); doc.text("( x ) Furnishing Labor, services, etc.", 34, 34); doc.text("(   ) Rental or use of transportation facilities equipment, quarters, rooms, lot or space, etc.", 34, 40); doc.text(`Bids opened at ${input.abstract.openingLocation || "Basco, Batanes"}`, 196, 31, { align: "right" }); doc.text(date(input.abstract.openingDate) || "___________", 196, 37, { align: "right" }); doc.text("To be furnished at  BATANES STATE COLLEGE", 70, 47); doc.setFontSize(5.6); doc.text("(State place or site of Office or project where articles or services be furnished or returned)", 70, 52);
  const displayedSuppliers = input.suppliers.slice(0, 5); while (displayedSuppliers.length < 5) displayedSuppliers.push(""); const cols = [{ x: 14, width: 65, label: "NAME OF ARTICLES OR SERVICES TO BE\nFURNISHED, RENDERED OR FACILITIES TO\nBE RENTED" }, ...displayedSuppliers.map((supplier, index) => ({ x: 79 + index * 23.4, width: 23.4, label: supplier }))]; const tableY = 57; cols.forEach((column) => { doc.rect(column.x, tableY, column.width, 22); doc.setFont("helvetica", "bold"); doc.setFontSize(5.2); doc.text(doc.splitTextToSize(column.label, column.width - 3).slice(0, 4), column.x + column.width / 2, tableY + 5, { align: "center" }); }); let y = tableY + 22;
  for (let index = 0; index < Math.max(12, input.items.length); index += 1) { const item = input.items[index]; cols.forEach((column) => doc.rect(column.x, y, column.width, 8)); if (item) { doc.setFont("helvetica", "normal"); doc.setFontSize(5.8); doc.text(doc.splitTextToSize(item.description, 61).slice(0, 2), 16, y + 3.5); } y += 8; }
  cols.forEach((column) => doc.rect(column.x, y, column.width, 8)); doc.setFont("helvetica", "bold"); doc.setFontSize(7); doc.text("TOTAL", 47, y + 5, { align: "center" }); y += 15; doc.setFont("helvetica", "normal"); doc.setFontSize(6.5); doc.text("Lowest calculated bidder", 28, y); doc.text("in the amount of", 85, y); doc.text("is awarded to", 134, y); y += 19; ["BAC Member", "BAC Member", "BAC Member"].forEach((label, index) => doc.text(label, 44 + index * 62, y, { align: "center" })); y += 15; doc.text("End-User/Provisional Member", 45, y, { align: "center" }); doc.text("BAC Vice Chair", 105, y, { align: "center" }); doc.text("BAC Chairperson", 165, y, { align: "center" }); doc.text("BAC Sec. Cert. No:", 154, y + 8, { align: "center" });
  invokeOfficialPdfDownload(doc, officialFormFileName("abstract", input.abstract.abstractNumber));
}

export async function downloadPpmpPdf(input: { fiscalYear: number; entries: Array<{ description: string; plannedAmount: string | number; actualAmount: string | number; status: string; officeName: string; objectOfExpenditureName: string; projectTitle?: string | null; papCode?: string | null; modeOfProcurement?: string | null; fundSource?: string | null; procurementSchedule?: string | null }> }) {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" }); await addBscLetterhead(doc); formTitle(doc, "PPMP", "PROJECT PROCUREMENT MANAGEMENT PLAN");
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

export async function downloadAbstractPackagePdf(input: { abstract: { abstractNumber: string; openingDate: Date; openingLocation: string; procurementCategory: string; recommendationReason: string; status: string; recommendedSupplierId: number }; preCanvassNumber: string; quotes: Array<{ supplierId: number; totalPrice: string | number; deliveryDays: number; isCompliant: number; quotationReference?: string | null; acknowledgedAt?: Date | null; receivedBy?: string | null; notes?: string | null }>; supplierNames: Map<number, string>; items: Array<{ description: string; specification?: string | null; quantity: string | number; unit: string; estimatedUnitCost?: string | number }> }) {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" }); await addBscLetterhead(doc); formTitle(doc, "Annex F", "ABSTRACT OF QUOTATION — PACKAGE"); const right = 283;
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

export async function downloadSupplierEvaluationFormPdf(input: { audience: SupplierEvaluationAudience; supplierName: string; goodsServicesType?: string | null; officeName?: string | null; purchaseRequestNumber?: string | null; purchaseOrderNumber: string; supplierRegistryReference?: string | null; supplierRegistryRegisteredAt?: Date | string | null; supplierRegistryExpiresAt?: Date | string | null; responseScores: Record<string, number>; remarks?: string | null; respondentName?: string | null; evaluatedAt: Date | string; electronicApproval?: { approverName: string; approverDesignation: string; consentStatement: string; signatureDigest: string; approvedAt: Date | string } | null }) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  await addBscLetterhead(doc);
  formTitle(doc, "Procurement Unit", "SUPPLIER EVALUATION FORM");
  doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.text("(Goods)", 105, 27, { align: "center" });
  doc.setFont("helvetica", "italic"); doc.setFontSize(8); doc.text(`To be accomplished by ${input.audience === "end_user" ? "End-User" : "Procurement Office"}`, 105, 33, { align: "center" });
  let y = 42;
  line(doc, 14, y, 88, "Name of Supplier:", input.supplierName); line(doc, 110, y, 86, "Purchase Order No.:", input.purchaseOrderNumber); y += 7;
  if (input.audience === "end_user") { line(doc, 14, y, 88, "Type of Goods/Services Provided:", input.goodsServicesType); line(doc, 110, y, 86, "Office/Unit:", input.officeName); y += 7; }
  else { line(doc, 14, y, 88, "Purchase Request No.:", input.purchaseRequestNumber); line(doc, 110, y, 86, "Supplier registry reference:", input.supplierRegistryReference); y += 7; line(doc, 14, y, 88, "Date Registered:", date(input.supplierRegistryRegisteredAt)); line(doc, 110, y, 86, "Expiration Date:", date(input.supplierRegistryExpiresAt)); y += 7; }
  doc.setFont("helvetica", "bold"); doc.setFontSize(7.3); doc.text("Instructions:", 14, y + 2); doc.setFont("helvetica", "normal");
  doc.text(doc.splitTextToSize("This is a survey on the performance of our suppliers. It aims to improve our procurement service/system. Your sincere and honest answers will be highly appreciated and treated with utmost confidentiality.", 180), 14, y + 7); y += 17;
  doc.text(doc.splitTextToSize("Please rate the supplier according to each criterion provided and put a mark on the column that best corresponds to your answer.", 180), 14, y); y += 9;
  const columns = [{ label: "CRITERIA", x: 14, width: 90 }, ...SUPPLIER_EVALUATION_RATINGS.map((rating, index) => ({ label: `${rating.label.toUpperCase()}\n(${rating.score})`, x: 104 + index * 23, width: 23 }))];
  columns.forEach((column) => { doc.rect(column.x, y, column.width, 11); doc.setFont("helvetica", "bold"); doc.setFontSize(5.6); doc.text(column.label.split("\n"), column.x + column.width / 2, y + 4, { align: "center" }); }); y += 11;
  const criteria = criteriaForSupplierEvaluation(input.audience);
  let lastSection = "";
  criteria.forEach((criterion) => {
    if (criterion.section !== lastSection) { lastSection = criterion.section; columns.forEach((column) => doc.rect(column.x, y, column.width, 5)); doc.setFont("helvetica", "bold"); doc.setFontSize(6.2); doc.text(criterion.section.toUpperCase(), 16, y + 3.5); y += 5; }
    const lines = doc.splitTextToSize(criterion.label, 86); const height = Math.max(10, lines.length * 3.4 + 4);
    columns.forEach((column) => doc.rect(column.x, y, column.width, height)); doc.setFont("helvetica", "normal"); doc.setFontSize(6.6); doc.text(lines, 16, y + 3.8);
    SUPPLIER_EVALUATION_RATINGS.forEach((rating, index) => { if (input.responseScores[criterion.key] === rating.score) { doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.text("X", 115.5 + index * 23, y + height / 2 + 1.5, { align: "center" }); } }); y += height;
  });
  const remarksHeight = 19; columns.forEach((column) => doc.rect(column.x, y, column.width, remarksHeight)); doc.setFont("helvetica", "italic"); doc.setFontSize(6.8); doc.text("Additional comments, suggestions, recommendations, and/or feedback.", 16, y + 4); doc.setFont("helvetica", "normal"); doc.text(doc.splitTextToSize(input.remarks || "", 176).slice(0, 3), 16, y + 9); y += remarksHeight + 10;
  doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.text(`Name and Signature of Respondent: ${input.respondentName || "____________________________"}`, 14, Math.min(y, 275)); doc.text(`Date: ${date(input.evaluatedAt)}`, 142, Math.min(y, 275));
  if (input.electronicApproval) {
    const signatureY = Math.min(y + 12, 267);
    doc.setDrawColor(130, 95, 26); doc.rect(14, signatureY, 182, 18); doc.setFont("helvetica", "bold"); doc.setFontSize(6.8); doc.text("ELECTRONIC APPROVAL — SYSTEM RECORD", 16, signatureY + 4.5);
    doc.setFont("helvetica", "normal"); doc.setFontSize(6.3); doc.text(`Authorized approver: ${input.electronicApproval.approverName} · ${input.electronicApproval.approverDesignation}`, 16, signatureY + 8.5); doc.text(`Approved: ${date(input.electronicApproval.approvedAt)} · Integrity reference: ${input.electronicApproval.signatureDigest.slice(0, 16)}`, 16, signatureY + 12.5); doc.text(doc.splitTextToSize(input.electronicApproval.consentStatement, 176).slice(0, 1), 16, signatureY + 16);
  }
  footer(doc);
  invokeOfficialPdfDownload(doc, `${input.purchaseOrderNumber}_SupplierEvaluation_${input.audience === "end_user" ? "EndUser" : "ProcurementOffice"}.pdf`);
}

export async function downloadPurchaseOrderPdf(input: { purchaseOrder: { poNumber: string; totalAmount: string; status: string; placeOfDelivery: string | null; scheduledDeliveryDate: Date | null; deliveryTerm: string | null; paymentTerm: string | null; modeOfProcurement: string | null; fundCluster: string | null; orsBursNumber: string | null; fundsAvailable: string | null; authorizedOfficialName: string | null; authorizedOfficialDesignation: string | null; chiefAccountantName: string | null }; supplierName?: string; supplierTin?: string | null; items?: Array<{ description: string; stockPropertyNo?: string | null; unit: string; quantity: string; estimatedUnitCost: string; totalCost: string }> }) {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
  await addBscLetterhead(doc);
  doc.setFont("helvetica", "italic"); doc.setFontSize(7); doc.text("Appendix 61", 196, 10, { align: "right" }); doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.text("PURCHASE ORDER", 105, 24, { align: "center" }); doc.setFont("helvetica", "normal"); doc.setFontSize(7);
  line(doc, 14, 33, 182, "Entity Name:", "Batanes State College"); line(doc, 14, 40, 88, "Supplier :", input.supplierName); line(doc, 108, 40, 88, "P.O. No. :", input.purchaseOrder.poNumber); line(doc, 14, 47, 88, "Address :"); line(doc, 108, 47, 88, "Date :", date(input.purchaseOrder.scheduledDeliveryDate)); line(doc, 14, 54, 88, "TIN :", input.supplierTin); line(doc, 108, 54, 88, "Mode of Procurement :", input.purchaseOrder.modeOfProcurement);
  doc.text("Gentlemen:", 14, 63); doc.text("Please furnish this Office the following articles subject to the terms and conditions contained herein:", 18, 69); line(doc, 14, 77, 88, "Place of Delivery :", input.purchaseOrder.placeOfDelivery); line(doc, 108, 77, 88, "Delivery Term :", input.purchaseOrder.deliveryTerm || "FOB Destination"); line(doc, 14, 84, 88, "Date of Delivery :", date(input.purchaseOrder.scheduledDeliveryDate)); line(doc, 108, 84, 88, "Payment Term :", input.purchaseOrder.paymentTerm || "15 days upon complete delivery");
  const cols = [{ label: "Stock/\nProperty No.", x: 14, width: 31 }, { label: "Unit", x: 45, width: 18 }, { label: "Description", x: 63, width: 72 }, { label: "Quantity", x: 135, width: 20 }, { label: "Unit Cost", x: 155, width: 20 }, { label: "Amount", x: 175, width: 21 }]; const tableY = 90; cols.forEach((column) => { doc.rect(column.x, tableY, column.width, 9); doc.setFont("helvetica", "bold"); doc.setFontSize(6.2); doc.text(column.label.split("\n"), column.x + column.width / 2, tableY + 3.5, { align: "center" }); }); let y = tableY + 9;
  for (let index = 0; index < 10; index += 1) { const item = input.items?.[index]; cols.forEach((column) => doc.rect(column.x, y, column.width, 7)); doc.setFont("helvetica", "normal"); doc.setFontSize(6.3); doc.text(String(index + 1), 22, y + 4.7, { align: "center" }); if (item) { doc.text(value(item.stockPropertyNo), 15.5, y + 4.7); doc.text(item.unit, 54, y + 4.7, { align: "center" }); doc.text(doc.splitTextToSize(item.description, 68).slice(0, 1), 64.5, y + 4.7); doc.text(item.quantity, 145, y + 4.7, { align: "center" }); doc.text(money(item.estimatedUnitCost), 173.5, y + 4.7, { align: "right" }); doc.text(money(item.totalCost), 194, y + 4.7, { align: "right" }); } else doc.text("-", 194, y + 4.7, { align: "right" }); y += 7; }
  doc.setFont("helvetica", "bold"); doc.setFontSize(7); doc.text("Total", 18, y + 5); doc.text(money(input.purchaseOrder.totalAmount), 194, y + 5, { align: "right" }); y += 10; doc.rect(14, y, 182, 10); doc.setFont("helvetica", "bold"); doc.text("(Total Amount in Words)", 16, y + 4.5); y += 15; doc.setFont("helvetica", "normal"); doc.setFontSize(6.5); doc.text(doc.splitTextToSize("In case of failure to make the full delivery within the time specified above, a penalty of one-tenth (1/10) of one percent for every day of delay shall be imposed on the undelivered item/s.", 178), 14, y); y += 16;
  doc.line(14, y, 196, y); doc.line(105, y, 105, y + 32); doc.setFontSize(7); doc.text("Conforme:", 16, y + 6); doc.text("Very truly yours,", 110, y + 6); doc.line(22, y + 21, 94, y + 21); doc.line(112, y + 21, 188, y + 21); doc.setFontSize(6); doc.text("Signature over Printed Name of Supplier", 58, y + 25, { align: "center" }); doc.text("Signature over Printed Name of Authorized", 150, y + 25, { align: "center" }); doc.text("Official", 150, y + 28, { align: "center" }); doc.text("Date", 58, y + 32, { align: "center" }); doc.text(input.purchaseOrder.authorizedOfficialDesignation || "SUC President I", 150, y + 32, { align: "center" });
  const accountingY = y + 38; line(doc, 14, accountingY, 88, "Fund Cluster :", input.purchaseOrder.fundCluster); line(doc, 108, accountingY, 88, "ORS/BURS No. :", input.purchaseOrder.orsBursNumber); line(doc, 14, accountingY + 7, 88, "Funds Available :", input.purchaseOrder.fundsAvailable ? money(input.purchaseOrder.fundsAvailable) : ""); line(doc, 108, accountingY + 7, 88, "Date of the ORS/BURS:"); line(doc, 108, accountingY + 14, 88, "Amount :", input.purchaseOrder.totalAmount ? money(input.purchaseOrder.totalAmount) : ""); doc.line(14, accountingY + 24, 102, accountingY + 24); doc.setFontSize(5.8); doc.text(input.purchaseOrder.chiefAccountantName || "Signature over Printed Name of Chief Accountant / Head of Accounting Division/Unit", 58, accountingY + 28, { align: "center" });
  invokeOfficialPdfDownload(doc, officialFormFileName("purchase_order", input.purchaseOrder.poNumber));
}
