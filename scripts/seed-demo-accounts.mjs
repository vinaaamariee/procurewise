// Complete database seed reset, test transaction wipe, and standardized demo user provisioning.
// Usage: pnpm seed:demo
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const DEFAULT_PASSWORD = "Password123!";

const ACCOUNTS = [
  {
    email: "officer.demo@bsc.edu.ph",
    name: "Officer Demo",
    role: "procurement_officer",
    officeName: "Procurement Management Unit",
  },
  {
    email: "staff.demo@bsc.edu.ph",
    name: "Staff Demo",
    role: "procurement_staff",
    officeName: "Procurement Management Unit",
  },
  {
    email: "bac.demo@bsc.edu.ph",
    name: "BAC Demo",
    role: "bac",
    officeName: "Bids and Awards Committee",
  },
  {
    email: "hope.demo@bsc.edu.ph",
    name: "HoPE Demo",
    role: "hope",
    officeName: "Office of the President",
  },
  {
    email: "budget.demo@bsc.edu.ph",
    name: "Budget Demo",
    role: "budget_officer",
    officeName: "Budget and Finance Office",
  },
  {
    email: "enduser.demo@bsc.edu.ph",
    name: "End-User Demo",
    role: "end_user",
    officeName: "Requesting Unit",
  },
];

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
if (!url || !serviceKey) {
  throw new Error("VITE_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY are required in .env.");
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function ensureAuthUser({ email, name, role, officeName }) {
  const attributes = {
    password: DEFAULT_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: name, office_name: officeName, role },
  };

  const created = await supabase.auth.admin.createUser({ email, ...attributes });
  if (!created.error) return { id: created.data.user.id, status: "created" };

  if (created.error.code !== "email_exists") {
    // Try finding by email link or updating
    console.warn(`createUser note for ${email}: ${created.error.message}`);
  }

  // If user already exists, generate link to find id, then update
  const link = await supabase.auth.admin.generateLink({ type: "magiclink", email });
  if (link.error) throw new Error(`${email}: ${link.error.message}`);
  const updated = await supabase.auth.admin.updateUserById(link.data.user.id, attributes);
  if (updated.error) throw new Error(`${email}: ${updated.error.message}`);
  return { id: link.data.user.id, status: "updated" };
}

async function run() {
  console.log("=== ProcureWise Database Wipe & Demo Seed ===");
  console.log("1. Provisioning Supabase Auth demo accounts (Password: Password123!)...");

  const results = [];
  for (const account of ACCOUNTS) {
    try {
      const authResult = await ensureAuthUser(account);
      results.push({ ...account, ...authResult });
      console.log(`  ✓ [${account.role}] ${account.email} -> ${authResult.status} (ID: ${authResult.id})`);
    } catch (err) {
      console.error(`  ✗ Failed provisioning ${account.email}:`, err.message);
      throw err;
    }
  }

  const sqlString = (value) => `'${String(value).replaceAll("'", "''")}'`;

  // SQL statements to wipe test transactions and September 2026 PRs
  const wipeTransactionsSql = `
    -- Purge dependent records first
    DELETE FROM procurewise.pmr_logs;
    DELETE FROM procurewise.delivery_receipts;
    DELETE FROM procurewise.purchase_orders;
    DELETE FROM procurewise.quotation_abstracts;
    DELETE FROM procurewise.supplier_quotations;
    DELETE FROM procurewise.rfqs;
    DELETE FROM procurewise.rfq_number_assignments;
    DELETE FROM procurewise.abstracts_of_canvass;
    DELETE FROM procurewise.mcdm_recommendations;
    DELETE FROM procurewise.pre_canvass_quotes;
    DELETE FROM procurewise.pre_canvasses;
    DELETE FROM procurewise.purchase_request_decisions;
    DELETE FROM procurewise.purchase_request_items;
    DELETE FROM procurewise.letters_of_notice;
    DELETE FROM procurewise.bac_transmittals;
    DELETE FROM procurewise.test_record_archives;

    -- Delete documents and notifications attached to transactional entities
    DELETE FROM procurewise.procurement_documents 
      WHERE "entityType" IN ('purchase_request', 'pre_canvass', 'rfq', 'purchase_order', 'delivery_receipt');
    DELETE FROM procurewise.workflow_corrections 
      WHERE "entityType" IN ('purchase_request', 'pre_canvass', 'rfq', 'purchase_order');
    DELETE FROM procurewise.workflow_notifications 
      WHERE "entityType" IN ('purchase_request', 'pre_canvass', 'rfq', 'purchase_order');

    -- Wipe Purchase Requests created this month (September 2026) and mock submissions
    DELETE FROM procurewise.purchase_requests 
      WHERE "createdAt" >= '2026-09-01' OR "prNumber" ILIKE '%test%' OR "purpose" ILIKE '%test%';

    -- Reset committed amounts on budget allotments so test allocations don't linger
    UPDATE procurewise.budget_allotments SET "committedAmount" = '0.00';
  `;

  // User profile upsert SQL
  const profileSql = `
    -- Upsert standardized demo profiles into procurewise.users
    INSERT INTO procurewise.users ("openId", name, email, "officeName", "loginMethod", role, "updatedAt")
    VALUES
    ${results
      .map(
        (r) =>
          `  (${sqlString(r.id)}, ${sqlString(r.name)}, ${sqlString(r.email)}, ${sqlString(r.officeName)}, 'supabase', ${sqlString(r.role)}, NOW())`
      )
      .join(",\n")}
    ON CONFLICT ("openId") DO UPDATE
      SET name = excluded.name, 
          email = excluded.email, 
          "officeName" = excluded."officeName", 
          role = excluded.role, 
          "updatedAt" = NOW();
  `;

  const fullSql = `-- ProcureWise Reset & Seed Migration
${wipeTransactionsSql}

${profileSql}
`;

  // Save migration SQL artifact
  const sqlPath = path.resolve("scripts/seed-demo-profiles.sql");
  fs.writeFileSync(sqlPath, fullSql);
  console.log(`\n2. Generated SQL migration: ${path.relative(".", sqlPath)}`);

  const connectionString = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;
  if (connectionString) {
    console.log("3. Connecting to PostgreSQL database to apply wipe & user profiles...");
    const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });
    await client.connect();
    try {
      await client.query("SET search_path TO procurewise, public");
      console.log("   Purging September 2026 test PRs, RFQs, transmittals, and orders...");
      await client.query(wipeTransactionsSql);
      console.log("   Applying standardized demo role profiles...");
      await client.query(profileSql);
      console.log("   ✓ Database wipe and profile sync completed successfully!");
    } finally {
      await client.end();
    }
  } else {
    console.log("   ! No SUPABASE_DATABASE_URL found. Execute scripts/seed-demo-profiles.sql in the Supabase SQL editor.");
  }

  console.log("\n=== Demo Accounts Ready ===");
  console.table(
    results.map(({ email, name, role, officeName, status }) => ({
      Role: role,
      Name: name,
      Email: email,
      Office: officeName,
      Password: DEFAULT_PASSWORD,
      Auth: status,
    }))
  );
}

run().catch((err) => {
  console.error("Seed script error:", err);
  process.exit(1);
});
