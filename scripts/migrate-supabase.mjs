import { Client } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

const connectionString = process.env.SUPABASE_DATABASE_URL;
if (!connectionString) throw new Error("SUPABASE_DATABASE_URL is required.");
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
