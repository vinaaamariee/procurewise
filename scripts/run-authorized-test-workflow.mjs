import mysql from "mysql2/promise";
import {
  addPreCanvassQuote,
  advancePurchaseRequest,
  createAbstractOfCanvass,
  createAppPpmpEntry,
  createPreCanvass,
  createPurchaseRequest,
  submitPreCanvass,
} from "../server/db.ts";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required for the authorised test workflow.");

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const marker = `TEST ONLY — PPMP to Abstract verification ${new Date().toISOString().replace(/[:.]/g, "-")}`;

try {
  const [[endUser]] = await connection.query("SELECT id, openId, name, email, loginMethod, role, createdAt, updatedAt, lastSignedIn FROM users WHERE openId = ?", ["test-workflow-end-user-2026"]);
  const [[procurementOfficer]] = await connection.query("SELECT id, openId, name, email, loginMethod, role, createdAt, updatedAt, lastSignedIn FROM users WHERE openId = ?", ["test-workflow-officer-2026"]);
  const [[office]] = await connection.query("SELECT id FROM offices WHERE code = ?", ["TEST-PPMP-2026"]);
  const [[objectOfExpenditure]] = await connection.query("SELECT id FROM objects_of_expenditure WHERE code = ?", ["TEST-EO-2026"]);
  const [suppliers] = await connection.query("SELECT id, supplierCode FROM suppliers WHERE supplierCode IN ('TEST-SUP-A', 'TEST-SUP-B', 'TEST-SUP-C') ORDER BY supplierCode");
  const [[catalogItem]] = await connection.query("SELECT id, productCode, description, unit, referencePrice FROM procurement_catalog_items WHERE isActive = 1 AND referencePrice <= 1000 ORDER BY id LIMIT 1");

  if (!endUser || !procurementOfficer || !office || !objectOfExpenditure || !catalogItem || suppliers.length !== 3) {
    throw new Error("The authorised workflow test references could not be resolved.");
  }

  const fiscalYear = new Date().getFullYear();
  const unitCost = Number(catalogItem.referencePrice);
  const quantity = 2;
  const ppmp = await createAppPpmpEntry({
    fiscalYear,
    officeId: Number(office.id),
    objectOfExpenditureId: Number(objectOfExpenditure.id),
    catalogItemId: Number(catalogItem.id),
    description: marker,
    plannedAmount: unitCost * quantity,
    papCode: "TEST-ONLY-2026",
    projectTitle: "TEST ONLY — Non-operational catalog workflow verification",
    modeOfProcurement: "Small Value Procurement",
    fundSource: "TEST ONLY — Not for obligation",
    procurementSchedule: "Verification run only",
    remarks: "Explicitly authorised non-operational test record. Do not use for procurement, approval, or obligation.",
  }, endUser);

  const purchaseRequest = await createPurchaseRequest({
    purpose: marker,
    fundSource: "TEST ONLY — Not for obligation",
    fundCluster: "TEST-ONLY",
    responsibilityCenterCode: "TEST-PPMP-2026",
    requesterDesignation: "TEST ONLY — End-User Workflow",
    ppmpEntryId: ppmp.id,
    officeId: Number(office.id),
    objectOfExpenditureId: Number(objectOfExpenditure.id),
    items: [{
      catalogItemId: Number(catalogItem.id),
      stockPropertyNo: catalogItem.productCode,
      description: catalogItem.description,
      specification: "TEST ONLY — sourced from the common-use procurement catalog",
      quantity,
      unit: catalogItem.unit || "unit",
      estimatedUnitCost: unitCost,
    }],
  }, endUser);

  const preCanvass = await createPreCanvass({
    purchaseRequestId: purchaseRequest.id,
    approvedBudget: unitCost * quantity,
    deliveryPeriodDays: 7,
    priceEvaluationMode: "lot_basis",
  }, endUser);

  const quoteInputs = [
    { totalPrice: unitCost * quantity * 1.05, deliveryDays: 7, isCompliant: true, quotationReference: "TEST-Q-A", notes: "TEST ONLY — Supplier A" },
    { totalPrice: unitCost * quantity, deliveryDays: 6, isCompliant: true, quotationReference: "TEST-Q-B", notes: "TEST ONLY — Supplier B, lowest compliant quote" },
    { totalPrice: unitCost * quantity * 0.98, deliveryDays: 5, isCompliant: false, quotationReference: "TEST-Q-C", notes: "TEST ONLY — Supplier C, non-compliant for verification" },
  ];

  for (const [index, supplier] of suppliers.entries()) {
    await addPreCanvassQuote({ preCanvassId: preCanvass.id, supplierId: Number(supplier.id), ...quoteInputs[index] }, endUser);
  }

  await submitPreCanvass(preCanvass.id, endUser);
  await advancePurchaseRequest({ purchaseRequestId: purchaseRequest.id, nextStatus: "procurement_review" }, endUser);
  await createAbstractOfCanvass(preCanvass.id, procurementOfficer);

  const [[abstract]] = await connection.query("SELECT id, abstractNumber, status, recommendedSupplierId, recommendationReason FROM abstracts_of_canvass WHERE preCanvassId = ?", [preCanvass.id]);
  const [quotes] = await connection.query("SELECT supplierId, totalPrice, deliveryDays, isCompliant, quotationReference FROM pre_canvass_quotes WHERE preCanvassId = ? ORDER BY totalPrice", [preCanvass.id]);

  console.log(JSON.stringify({
    marker,
    ppmp: { id: ppmp.id, status: ppmp.status, plannedAmount: ppmp.plannedAmount },
    purchaseRequest: { id: purchaseRequest.id, prNumber: purchaseRequest.prNumber, status: "procurement_review" },
    preCanvass: { id: preCanvass.id, preCanvassNumber: preCanvass.preCanvassNumber, status: "abstracted", quoteCount: quotes.length },
    abstract,
    catalogItem: { productCode: catalogItem.productCode, description: catalogItem.description },
    quotes,
  }, null, 2));
} finally {
  await connection.end();
}
