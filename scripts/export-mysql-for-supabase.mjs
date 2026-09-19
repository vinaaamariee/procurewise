import { mkdir, writeFile } from "node:fs/promises";
import mysql from "mysql2/promise";

const tables = [
  "users", "offices", "objects_of_expenditure", "budget_allotments", "suppliers", "supplier_tags", "supplier_tag_assignments",
  "procurement_catalog_items", "procurement_catalog_favorites", "app_ppmp_entries", "purchase_requests", "purchase_request_items",
  "pre_canvasses", "pre_canvass_quotes", "abstracts_of_canvass", "rfqs", "supplier_quotations", "quotation_abstracts",
  "purchase_orders", "delivery_receipts", "pmr_logs", "procurement_settings", "procurement_documents", "workflow_corrections",
  "workflow_notifications", "letters_of_notice", "bac_transmittals", "supplier_evaluations", "mcdm_recommendations", "historical_prices",
  "audit_trails", "test_record_archives",
];

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required for source backup.");
const connection = await mysql.createConnection(process.env.DATABASE_URL);
const exported = {};

try {
  for (const table of tables) {
    const [rows] = await connection.query(`SELECT * FROM \`${table}\``);
    exported[table] = rows;
  }
} finally {
  await connection.end();
}

const output = {
  exportedAt: new Date().toISOString(),
  sourceDialect: "mysql",
  tables: exported,
  rowCounts: Object.fromEntries(Object.entries(exported).map(([table, rows]) => [table, rows.length])),
};
await mkdir(new URL("../imports/", import.meta.url), { recursive: true });
await writeFile(new URL("../imports/mysql-to-supabase-backup.json", import.meta.url), JSON.stringify(output, null, 2));
console.log(JSON.stringify({ output: "imports/mysql-to-supabase-backup.json", rowCounts: output.rowCounts }, null, 2));
