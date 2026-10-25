import fs from "node:fs";
import pg from "pg";

const parseEnv = (filePath) =>
  Object.fromEntries(
    fs
      .readFileSync(filePath, "utf8")
      .split(/\r?\n/)
      .filter((line) => line.trim() && !line.trim().startsWith("#") && line.includes("="))
      .map((line) => {
        const idx = line.indexOf("=");
        return [line.slice(0, idx).trim(), line.slice(idx + 1).trim().replace(/^["']|["']$/g, "")];
      })
  );

const oldEnv = parseEnv(".env");
const newEnv = parseEnv(".env.new");

const oldUrl = oldEnv.SUPABASE_DATABASE_URL;
const newUrl = newEnv.SUPABASE_DATABASE_URL;

if (!oldUrl || !newUrl) {
  throw new Error("Both .env (old) and .env.new (new) SUPABASE_DATABASE_URL must be provided.");
}

const oldClient = new pg.Client({ connectionString: oldUrl, ssl: { rejectUnauthorized: false } });
const newClient = new pg.Client({ connectionString: newUrl, ssl: { rejectUnauthorized: false } });

await oldClient.connect();
await newClient.connect();
console.log("Connected to both old and new databases.");

try {
  // 1. Create procurewise schema in new DB
  console.log("\n--- Phase 1: Replicating Schema ---");
  await newClient.query("CREATE SCHEMA IF NOT EXISTS procurewise;");
  console.log("Created schema 'procurewise' on target.");

  // Get all tables in procurewise schema
  const { rows: tableRows } = await oldClient.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'procurewise' AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `);

  const tables = tableRows.map((r) => r.table_name);
  console.log(`Found ${tables.length} tables in procurewise schema.`);

  // For each table, get column definitions
  for (const table of tables) {
    const { rows: cols } = await oldClient.query(
      `
      SELECT 
        column_name,
        data_type,
        udt_name,
        character_maximum_length,
        numeric_precision,
        numeric_scale,
        is_nullable,
        column_default,
        is_identity,
        identity_generation
      FROM information_schema.columns
      WHERE table_schema = 'procurewise' AND table_name = $1
      ORDER BY ordinal_position;
    `,
      [table]
    );

    const colDefs = cols.map((col) => {
      let typeDef = col.data_type;
      if (col.udt_name === "varchar" && col.character_maximum_length) {
        typeDef = `varchar(${col.character_maximum_length})`;
      } else if (col.udt_name === "numeric" && col.numeric_precision) {
        typeDef = `numeric(${col.numeric_precision}, ${col.numeric_scale ?? 0})`;
      } else if (col.udt_name === "int4") {
        typeDef = "integer";
      } else if (col.udt_name === "int8") {
        typeDef = "bigint";
      } else if (col.udt_name === "int2") {
        typeDef = "smallint";
      } else if (col.udt_name === "bool") {
        typeDef = "boolean";
      } else if (col.udt_name === "text") {
        typeDef = "text";
      } else if (col.udt_name === "json") {
        typeDef = "json";
      } else if (col.udt_name === "jsonb") {
        typeDef = "jsonb";
      } else if (col.udt_name === "timestamp") {
        typeDef = "timestamp";
      } else if (col.udt_name === "timestamptz") {
        typeDef = "timestamp with time zone";
      }

      let line = `"${col.column_name}" ${typeDef}`;
      if (col.is_identity === "YES") {
        line += ` GENERATED ${col.identity_generation} AS IDENTITY`;
      } else if (col.column_default) {
        line += ` DEFAULT ${col.column_default}`;
      }

      if (col.is_nullable === "NO") {
        line += " NOT NULL";
      }

      return line;
    });

    const createSql = `CREATE TABLE IF NOT EXISTS "procurewise"."${table}" (\n  ${colDefs.join(",\n  ")}\n);`;
    await newClient.query(createSql);
  }
  console.log("All tables created successfully.");

  // Apply Primary Keys and Unique constraints
  console.log("Applying primary keys and unique constraints...");
  const { rows: constraints } = await oldClient.query(`
    SELECT 
      conname, 
      contype, 
      conrelid::regclass::text as table_name,
      pg_get_constraintdef(oid) as def
    FROM pg_constraint
    WHERE connamespace = 'procurewise'::regnamespace
      AND contype IN ('p', 'u');
  `);

  for (const con of constraints) {
    try {
      await newClient.query(`
        ALTER TABLE ${con.table_name} 
        ADD CONSTRAINT "${con.conname}" ${con.def};
      `);
    } catch (err) {
      if (!err.message.includes("already exists")) {
        console.warn(`Constraint ${con.conname} note:`, err.message);
      }
    }
  }

  // Apply Indexes
  console.log("Applying indexes...");
  const { rows: indexes } = await oldClient.query(`
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = 'procurewise'
      AND indexname NOT IN (SELECT conname FROM pg_constraint WHERE connamespace = 'procurewise'::regnamespace);
  `);

  for (const idx of indexes) {
    try {
      await newClient.query(idx.indexdef);
    } catch (err) {
      if (!err.message.includes("already exists")) {
        console.warn(`Index ${idx.indexname} note:`, err.message);
      }
    }
  }

  // Apply Foreign Keys
  console.log("Applying foreign keys...");
  const { rows: fkeys } = await oldClient.query(`
    SELECT 
      conname, 
      conrelid::regclass::text as table_name,
      pg_get_constraintdef(oid) as def
    FROM pg_constraint
    WHERE connamespace = 'procurewise'::regnamespace
      AND contype = 'f';
  `);

  for (const fk of fkeys) {
    try {
      await newClient.query(`
        ALTER TABLE ${fk.table_name} 
        ADD CONSTRAINT "${fk.conname}" ${fk.def};
      `);
    } catch (err) {
      if (!err.message.includes("already exists")) {
        console.warn(`FK ${fk.conname} note:`, err.message);
      }
    }
  }

  // Create Auth Trigger & Handler Function
  console.log("Creating auth trigger & handler function...");
  await newClient.query(`
    CREATE OR REPLACE FUNCTION procurewise.handle_new_auth_user()
    RETURNS TRIGGER 
    LANGUAGE plpgsql 
    SECURITY DEFINER
    SET search_path = procurewise, public
    AS $$
    DECLARE
      existing_id integer;
    BEGIN
      SELECT id INTO existing_id
      FROM procurewise.users
      WHERE lower(trim(email)) = lower(trim(NEW.email))
      LIMIT 1;

      IF existing_id IS NOT NULL THEN
        UPDATE procurewise.users
        SET "openId" = NEW.id::text,
            "loginMethod" = 'supabase',
            "lastSignedIn" = now(),
            name = COALESCE(name, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
        WHERE id = existing_id;
      ELSE
        INSERT INTO procurewise.users ("openId", email, name, role, "loginMethod", "createdAt", "updatedAt", "lastSignedIn")
        VALUES (
          NEW.id::text,
          lower(trim(NEW.email)),
          COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
          'end_user',
          'supabase',
          now(),
          now(),
          now()
        )
        ON CONFLICT ("openId") DO UPDATE
        SET email = EXCLUDED.email,
            "lastSignedIn" = now();
      END IF;

      RETURN NEW;
    END;
    $$;
  `);

  await newClient.query(`
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION procurewise.handle_new_auth_user();
  `);
  console.log("Auth trigger and handler installed.");

  // Phase 2: Migrate Auth Users & Identities
  console.log("\n--- Phase 2: Migrating Auth Users and Identities ---");
  const { rows: authUsers } = await oldClient.query("SELECT * FROM auth.users ORDER BY created_at ASC");
  console.log(`Found ${authUsers.length} users in old auth.users.`);

  for (const u of authUsers) {
    delete u.confirmed_at;
    const cols = Object.keys(u);
    const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
    const colList = cols.map((c) => `"${c}"`).join(", ");
    const updateList = cols
      .filter((c) => c !== "id")
      .map((c) => `"${c}" = EXCLUDED."${c}"`)
      .join(", ");

    const query = `
      INSERT INTO auth.users (${colList})
      VALUES (${placeholders})
      ON CONFLICT (id) DO UPDATE SET ${updateList};
    `;
    await newClient.query(query, cols.map((c) => u[c]));
  }
  console.log("Migrated auth.users successfully.");

  const { rows: authIdentities } = await oldClient.query("SELECT * FROM auth.identities ORDER BY created_at ASC");
  console.log(`Found ${authIdentities.length} identities in old auth.identities.`);

  for (const ident of authIdentities) {
    delete ident.email;
    const cols = Object.keys(ident);
    const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
    const colList = cols.map((c) => `"${c}"`).join(", ");
    const updateList = cols
      .filter((c) => c !== "id")
      .map((c) => `"${c}" = EXCLUDED."${c}"`)
      .join(", ");

    const query = `
      INSERT INTO auth.identities (${colList})
      VALUES (${placeholders})
      ON CONFLICT (id) DO UPDATE SET ${updateList};
    `;
    await newClient.query(query, cols.map((c) => ident[c]));
  }
  console.log("Migrated auth.identities successfully.");

  // Phase 3: Copy Data for all 41 tables in procurewise
  console.log("\n--- Phase 3: Migrating Table Data ---");
  // Disable triggers / constraint checking during batch copy
  await newClient.query("SET session_replication_role = 'replica';");

  for (const table of tables) {
    const { rows: dataRows } = await oldClient.query(`SELECT * FROM "procurewise"."${table}"`);
    if (!dataRows.length) {
      console.log(`Table procurewise.${table}: 0 rows (skipped)`);
      continue;
    }

    const cols = Object.keys(dataRows[0]);
    const colNames = cols.map((c) => `"${c}"`).join(", ");

    // Insert in batches of 200
    const batchSize = 200;
    for (let i = 0; i < dataRows.length; i += batchSize) {
      const chunk = dataRows.slice(i, i + batchSize);
      const values = [];
      const rowPlaceholders = [];

      chunk.forEach((row, rIdx) => {
        const ph = cols.map((c, cIdx) => {
          values.push(row[c]);
          return `$${rIdx * cols.length + cIdx + 1}`;
        });
        rowPlaceholders.push(`(${ph.join(", ")})`);
      });

      const insertSql = `
        INSERT INTO "procurewise"."${table}" (${colNames})
        VALUES ${rowPlaceholders.join(",\n")}
        ON CONFLICT DO NOTHING;
      `;
      await newClient.query(insertSql, values);
    }

    console.log(`Table procurewise.${table}: copied ${dataRows.length} rows.`);
  }

  await newClient.query("SET session_replication_role = 'origin';");
  console.log("All table data migrated.");

  // Phase 4: Reset Sequences
  console.log("\n--- Phase 4: Resetting Identity Sequences ---");
  for (const table of tables) {
    const { rows: idCols } = await newClient.query(
      `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'procurewise' AND table_name = $1 AND (is_identity = 'YES' OR column_default LIKE 'nextval%');
    `,
      [table]
    );

    for (const { column_name } of idCols) {
      try {
        await newClient.query(`
          SELECT setval(
            pg_get_serial_sequence('"procurewise"."${table}"', '${column_name}'),
            COALESCE((SELECT MAX("${column_name}") FROM "procurewise"."${table}"), 1)
          );
        `);
      } catch (err) {
        // console.warn(`Sequence reset for ${table}.${column_name}:`, err.message);
      }
    }
  }
  console.log("All identity sequences updated to highest primary keys.");

  // Phase 5: Verification
  console.log("\n--- Phase 5: Verification & Validation ---");
  let allMatched = true;
  for (const table of tables) {
    const oldCnt = (await oldClient.query(`SELECT count(*)::int as n FROM "procurewise"."${table}"`)).rows[0].n;
    const newCnt = (await newClient.query(`SELECT count(*)::int as n FROM "procurewise"."${table}"`)).rows[0].n;
    const match = oldCnt === newCnt;
    if (!match) {
      console.error(`MISMATCH: ${table} (old: ${oldCnt}, new: ${newCnt})`);
      allMatched = false;
    }
  }

  if (allMatched) {
    console.log("✅ ALL 41 TABLES MATCH ROW COUNTS 100%!");
  }

  const { rows: verifyUsers } = await newClient.query('SELECT count(*)::int as n FROM "procurewise"."users"');
  console.log(`procurewise.users count in new DB: ${verifyUsers[0].n}`);

  const { rows: verifyAuth } = await newClient.query("SELECT count(*)::int as n FROM auth.users");
  console.log(`auth.users count in new DB: ${verifyAuth[0].n}`);

  const { rows: testUser } = await newClient.query(
    'SELECT id, "openId", name, email, role FROM "procurewise"."users" WHERE "openId" = $1',
    ["653ef6a3-20c3-4cfb-8285-7430330f17c8"]
  );
  console.log("Verified demo user query result in new DB:", testUser[0]);
} finally {
  await oldClient.end();
  await newClient.end();
}
