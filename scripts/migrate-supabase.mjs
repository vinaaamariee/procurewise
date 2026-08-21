import { Client } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

const password = process.env.SUPABASE_DB_PASSWORD;
if (!password) throw new Error("SUPABASE_DB_PASSWORD is required.");
const connectionString = `postgresql://postgres.wchgxpvviebvwuhrsrvj:${encodeURIComponent(password)}@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres`;
const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
  const db = drizzle(client);
  await migrate(db, { migrationsFolder: "drizzle/pg-migrations" });
  const result = await client.query("select table_name from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE' order by table_name");
  console.log(JSON.stringify({ migration: "completed", publicTableCount: result.rows.length, publicTables: result.rows.map((row) => row.table_name) }, null, 2));
} finally {
  await client.end();
}
