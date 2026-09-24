import fs from "node:fs/promises";
import { Client } from "pg";

const inputPath = process.argv[2] || "/home/ubuntu/procwise-pmr-import/pmr-2025-normalized.json";
const connectionString = process.env.SUPABASE_DATABASE_URL;
if (!connectionString) throw new Error("SUPABASE_DATABASE_URL is required.");
const rows = JSON.parse(await fs.readFile(inputPath, "utf8"));
const columns = ["recordKey", "sourceWorkbook", "sourceRow", "fiscalYear", "month", "endUser", "positionDesignation", "fundCode", "fundClass", "prNumber", "modality", "item", "quantity", "unitOfIssue", "unitBudget", "estimatedTotal", "unitLcrb", "total", "purpose", "office", "lonReceivedDate", "bacAwardApprovedDate", "poContractDate", "poContractDateReceived", "deliveryDate", "supplier", "iarDate", "sectionCodeDepartment", "releasedDate", "status", "remarks", "obrNumber", "rfqsPrinted", "salesChargeInvoice"];
const fields = ["recordKey", "sourceWorkbook", "sourceRow", "fiscalYear", "month", "endUser", "positionDesignation", "fundCode", "fundClass", "prNumber", "modality", "item", "quantity", "unitOfIssue", "unitBudget", "estimatedTotal", "unitLcrb", "total", "purpose", "office", "lonReceivedDate", "bacAwardApprovedDate", "poContractDate", "poContractDateReceived", "deliveryDate", "supplier", "iarDate", "sectionCodeDepartment", "releasedDate", "status", "remarks", "obrNumber", "rfqsPrinted", "salesChargeInvoice"];
const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
try {
  await client.connect();
  let attempted = 0;
  for (let offset = 0; offset < rows.length; offset += 100) {
    const batch = rows.slice(offset, offset + 100);
    const values = [];
    const tuples = batch.map((row, rowIndex) => `(${fields.map((field, fieldIndex) => { values.push(row[field] ?? null); return `$${rowIndex * fields.length + fieldIndex + 1}`; }).join(", ")})`).join(", ");
    await client.query(`INSERT INTO "procurewise"."pmr_historical_records" (${columns.map((column) => `"${column}"`).join(", ")}) VALUES ${tuples} ON CONFLICT ("recordKey") DO NOTHING`, values);
    attempted += batch.length;
  }
  const result = await client.query('SELECT COUNT(*)::int AS count, COUNT(DISTINCT "prNumber")::int AS purchase_requests FROM "procurewise"."pmr_historical_records" WHERE "fiscalYear" = 2025');
  console.log(JSON.stringify({ attempted, fiscalYear: 2025, ...result.rows[0] }, null, 2));
} finally {
  await client.end();
}
