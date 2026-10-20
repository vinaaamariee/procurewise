import { Client } from "pg";

const connectionString = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!connectionString) throw new Error("SUPABASE_DATABASE_URL or DATABASE_URL is required.");
const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
  const result = await client.query("select table_name from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE' order by table_name");
  console.log(JSON.stringify({ publicTables: result.rows.map((row) => row.table_name), count: result.rows.length }, null, 2));
} finally {
  await client.end();
}
