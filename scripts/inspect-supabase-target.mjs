import { Client } from "pg";

const password = process.env.SUPABASE_DB_PASSWORD;
if (!password) throw new Error("SUPABASE_DB_PASSWORD is required.");
const connectionString = `postgresql://postgres.wchgxpvviebvwuhrsrvj:${encodeURIComponent(password)}@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres`;
const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
  const result = await client.query("select table_name from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE' order by table_name");
  console.log(JSON.stringify({ publicTables: result.rows.map((row) => row.table_name), count: result.rows.length }, null, 2));
} finally {
  await client.end();
}
