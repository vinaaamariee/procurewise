export type CsvCell = string | number | null | undefined;

function csvCell(value: CsvCell) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function buildCsv(headers: string[], rows: CsvCell[][]) {
  return `\uFEFF${[headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n")}\r\n`;
}

export function downloadCsv(fileName: string, csv: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export type BestValuePolicyHistoryEntry = {
  policy: { policyCode: string; name: string; version: number; isActive: number; totalWeight: string | number; createdAt: Date | string; deactivatedAt: Date | string | null };
  criteria: Array<{ criterionKey: string; label: string; description: string | null; weight: string | number; sortOrder: number }>;
  createdBy: { name: string | null; email: string | null } | null;
  activationAudit: { action: string; createdAt: Date | string; performedByRole: string } | null;
};

const reportDate = (value: Date | string | null | undefined) => value ? new Date(value).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" }) : "";

export function buildBestValuePolicyHistoryCsv(history: BestValuePolicyHistoryEntry[]) {
  return buildCsv(
    ["Policy code", "Policy name", "Version", "Status", "Total weight", "Created at", "Deactivated at", "Created by", "Activation audit action", "Activation audit date", "Activation audit role", "Criterion order", "Criterion key", "Criterion label", "Criterion description", "Weight"],
    history.flatMap((entry) => (entry.criteria.length ? entry.criteria : [{ criterionKey: "", label: "", description: "", weight: "", sortOrder: 0 }]).map((criterion) => [
      entry.policy.policyCode,
      entry.policy.name,
      entry.policy.version,
      entry.policy.isActive ? "Active" : "Inactive",
      entry.policy.totalWeight,
      reportDate(entry.policy.createdAt),
      reportDate(entry.policy.deactivatedAt),
      entry.createdBy?.name || entry.createdBy?.email || "",
      entry.activationAudit?.action || "",
      reportDate(entry.activationAudit?.createdAt),
      entry.activationAudit?.performedByRole || "",
      criterion.sortOrder,
      criterion.criterionKey,
      criterion.label,
      criterion.description,
      criterion.weight,
    ])),
  );
}

export function buildPpmpCsv(entries: Array<{ fiscalYear: number; description: string; plannedAmount: string | number; actualAmount: string | number; status: string; officeId: number; objectOfExpenditureId: number; papCode?: string | null; projectTitle?: string | null; modeOfProcurement?: string | null; fundSource?: string | null; procurementSchedule?: string | null; remarks?: string | null }>, offices: Map<number, string>, objectsOfExpenditure: Map<number, string>) {
  return buildCsv(
    ["Fiscal year", "Office", "Object of expenditure", "PAP code", "Project title", "Description", "Planned amount", "Actual amount", "Status", "Mode of procurement", "Fund source", "Procurement schedule", "Remarks"],
    entries.map((entry) => [entry.fiscalYear, offices.get(entry.officeId) || `Office #${entry.officeId}`, objectsOfExpenditure.get(entry.objectOfExpenditureId) || `Object #${entry.objectOfExpenditureId}`, entry.papCode, entry.projectTitle, entry.description, entry.plannedAmount, entry.actualAmount, entry.status, entry.modeOfProcurement, entry.fundSource, entry.procurementSchedule, entry.remarks]),
  );
}

export function buildAbstractPackageCsv(input: { abstract: { abstractNumber: string; status: string; openingDate: Date | string; openingLocation: string; procurementCategory: string; recommendationReason: string; recommendedSupplierId: number }; preCanvassNumber: string; quotes: Array<{ supplierId: number; totalPrice: string | number; deliveryDays: number; isCompliant: number; quotationReference?: string | null; acknowledgedAt?: Date | string | null; receivedBy?: string | null; notes?: string | null }>; supplierNames: Map<number, string>; items: Array<{ description: string; specification?: string | null; quantity: string | number; unit: string; estimatedUnitCost?: string | number }> }) {
  const itemSchedule = input.items.map((item) => `${item.description}${item.specification ? ` — ${item.specification}` : ""} (${item.quantity} ${item.unit})`).join("; ");
  return buildCsv(
    ["Abstract number", "Pre-Canvass number", "Abstract status", "Opening date", "Opening location", "Procurement category", "Recommended supplier", "Supplier", "Quotation reference", "Quoted amount", "Delivery days", "Compliant", "Acknowledged at", "Received by", "Quote notes", "Linked item schedule", "Recommendation reason"],
    (input.quotes.length ? input.quotes : [{ supplierId: input.abstract.recommendedSupplierId, totalPrice: "", deliveryDays: 0, isCompliant: 0 }]).map((quote) => [input.abstract.abstractNumber, input.preCanvassNumber, input.abstract.status, new Date(input.abstract.openingDate).toLocaleDateString("en-PH"), input.abstract.openingLocation, input.abstract.procurementCategory, input.supplierNames.get(input.abstract.recommendedSupplierId) || `Supplier #${input.abstract.recommendedSupplierId}`, input.supplierNames.get(quote.supplierId) || `Supplier #${quote.supplierId}`, quote.quotationReference, quote.totalPrice, quote.deliveryDays, quote.isCompliant ? "Yes" : "No", quote.acknowledgedAt ? new Date(quote.acknowledgedAt).toLocaleDateString("en-PH") : "", quote.receivedBy, quote.notes, itemSchedule, input.abstract.recommendationReason]),
  );
}
