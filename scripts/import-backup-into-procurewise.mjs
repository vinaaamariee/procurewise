// Loads imports/mysql-to-supabase-backup.json into the procurewise schema of the project in SUPABASE_DATABASE_URL.
// Runs in one transaction and refuses to touch tables that already hold rows.
// Usage: node scripts/import-backup-into-procurewise.mjs [--dry-run]   (dry run rolls back)
import "dotenv/config";
import { readFile } from "node:fs/promises";
import pg from "pg";

const dryRun = process.argv.includes("--dry-run");
const connectionString = process.env.SUPABASE_DATABASE_URL;
if (!connectionString) throw new Error("SUPABASE_DATABASE_URL is required.");
const backup = JSON.parse(await readFile(new URL("../imports/mysql-to-supabase-backup.json", import.meta.url), "utf8"));
const q = (name) => `"procurewise"."${name.replaceAll('"', '""')}"`;
const col = (name) => `"${name.replaceAll('"', '""')}"`;
const toParam = (value) => (value !== null && typeof value === "object" ? JSON.stringify(value) : value ?? null);

const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });
await client.connect();
try {
  await client.query("BEGIN");

  for (const [table, rows] of Object.entries(backup.tables)) {
    if (table === "users" || !rows.length) continue;
    const { rows: [{ n }] } = await client.query(`select count(*)::int n from ${q(table)}`);
    if (n) throw new Error(`procurewise.${table} already has ${n} rows; refusing to import over existing data.`);
  }

  // Backup test users map onto the seeded demo accounts by role; any other backup user is imported as-is.
  const demoByRole = new Map((await client.query(`select id, role from ${q("users")} where email like '%@procurewise.demo'`)).rows.map((r) => [r.role, r.id]));
  const userIdMap = new Map();
  const summary = { usersMappedToDemo: [], usersImported: [] };
  for (const user of backup.tables.users) {
    const existing = (await client.query(`select id from ${q("users")} where lower(email) = lower($1) or "openId" = $2`, [user.email, user.openId])).rows[0];
    if (existing) { userIdMap.set(user.id, existing.id); continue; }
    if (user.loginMethod === "test-only" && demoByRole.has(user.role)) {
      userIdMap.set(user.id, demoByRole.get(user.role));
      summary.usersMappedToDemo.push(`${user.email} -> demo ${user.role}`);
      continue;
    }
    const { id: _oldId, ...values } = user;
    const columns = Object.keys(values);
    const { rows: [{ id }] } = await client.query(
      `insert into ${q("users")} (${columns.map(col).join(", ")}) values (${columns.map((_, i) => `$${i + 1}`).join(", ")}) returning id`,
      columns.map((c) => toParam(values[c])),
    );
    userIdMap.set(user.id, id);
    summary.usersImported.push(`${user.email} (${user.role})`);
  }

  const imported = {};
  for (const [table, rows] of Object.entries(backup.tables)) {
    if (table === "users" || !rows.length) { if (table !== "users") imported[table] = 0; continue; }
    const columns = Object.keys(rows[0]);
    const userRefs = columns.filter((c) => /ById$/.test(c));
    for (const row of rows) {
      const values = columns.map((c) => {
        const value = row[c];
        if (userRefs.includes(c) && value !== null) {
          if (!userIdMap.has(value)) throw new Error(`${table}.${c} references unknown user id ${value}.`);
          return userIdMap.get(value);
        }
        return toParam(value);
      });
      await client.query(`insert into ${q(table)} (${columns.map(col).join(", ")}) values (${columns.map((_, i) => `$${i + 1}`).join(", ")})`, values);
    }
    if (columns.includes("id")) {
      await client.query(`select setval(pg_get_serial_sequence($1, 'id'), coalesce((select max("id") from ${q(table)}), 0) + 1, false)`, [`procurewise.${table}`]);
    }
    imported[table] = rows.length;
  }

  // Verify every table now holds at least the backup's row count.
  for (const [table, count] of Object.entries(imported)) {
    const { rows: [{ n }] } = await client.query(`select count(*)::int n from ${q(table)}`);
    if (n !== count) throw new Error(`Verification failed for ${table}: expected ${count}, found ${n}.`);
  }

  await client.query(dryRun ? "ROLLBACK" : "COMMIT");
  console.log(JSON.stringify({ mode: dryRun ? "DRY RUN (rolled back)" : "committed", ...summary, rowCounts: Object.fromEntries(Object.entries(imported).filter(([, n]) => n)) }, null, 2));
} catch (error) {
  await client.query("ROLLBACK").catch(() => {});
  console.error("Import failed and was rolled back:", error.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
