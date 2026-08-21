import { readFile } from "node:fs/promises";
import { Client } from "pg";

const password = process.env.SUPABASE_DB_PASSWORD;
if (!password) throw new Error("SUPABASE_DB_PASSWORD is required.");
const backup = JSON.parse(await readFile(new URL("../imports/mysql-to-supabase-backup.json", import.meta.url), "utf8"));
const connectionString = `postgresql://postgres.wchgxpvviebvwuhrsrvj:${encodeURIComponent(password)}@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres`;
const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

const quoteIdentifier = (value) => `"${value.replaceAll('"', '""')}"`;
const imported = {};

try {
  await client.connect();
  await client.query("BEGIN");
  for (const [table, rows] of Object.entries(backup.tables)) {
    if (!rows.length) { imported[table] = 0; continue; }
    const columns = Object.keys(rows[0]);
    const values = rows.map((row) => columns.map((column) => row[column] ?? null));
    const rowPlaceholders = columns.map((_, index) => `$${index + 1}`).join(", ");
    for (const row of values) {
      await client.query(`INSERT INTO ${quoteIdentifier(table)} (${columns.map(quoteIdentifier).join(", ")}) VALUES (${rowPlaceholders})`, row);
    }
    if (columns.includes("id")) {
      await client.query(`SELECT setval(pg_get_serial_sequence($1, 'id'), COALESCE((SELECT MAX("id") FROM ${quoteIdentifier(table)}), 1), true)`, [table]);
    }
    imported[table] = rows.length;
  }
  await client.query("COMMIT");
  console.log(JSON.stringify({ import: "completed", rowCounts: imported }, null, 2));
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  await client.end();
}
