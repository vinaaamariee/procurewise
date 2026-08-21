import { readFile } from "node:fs/promises";
import { Client } from "pg";

const password = process.env.SUPABASE_DB_PASSWORD;
if (!password) throw new Error("SUPABASE_DB_PASSWORD is required.");
const backup = JSON.parse(await readFile(new URL("../imports/mysql-to-supabase-backup.json", import.meta.url), "utf8"));
const connectionString = `postgresql://postgres.wchgxpvviebvwuhrsrvj:${encodeURIComponent(password)}@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres`;
const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
const quoteIdentifier = (value) => `"${value.replaceAll('"', '""')}"`;

try {
  await client.connect();
  const countComparison = {};
  for (const [table, sourceRows] of Object.entries(backup.tables)) {
    const result = await client.query(`SELECT COUNT(*)::int AS count FROM ${quoteIdentifier(table)}`);
    countComparison[table] = { source: sourceRows.length, target: result.rows[0].count, matches: sourceRows.length === result.rows[0].count };
  }
  const workflow = await client.query(`SELECT pr."prNumber", pc."preCanvassNumber", a."abstractNumber", a."status" AS abstract_status, s."supplierCode" AS recommended_supplier FROM "purchase_requests" pr JOIN "pre_canvasses" pc ON pc."purchaseRequestId" = pr.id JOIN "abstracts_of_canvass" a ON a."preCanvassId" = pc.id JOIN "suppliers" s ON s.id = a."recommendedSupplierId" ORDER BY pr.id DESC LIMIT 1`);
  const complete = Object.values(countComparison).every((entry) => entry.matches);
  console.log(JSON.stringify({ valid: complete, countComparison, workflow: workflow.rows[0] ?? null }, null, 2));
  if (!complete) process.exitCode = 1;
} finally {
  await client.end();
}
