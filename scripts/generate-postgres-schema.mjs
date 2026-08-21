import { readFile, writeFile } from "node:fs/promises";

const sourcePath = new URL("../drizzle/schema.mysql.ts", import.meta.url);
const destinationPath = new URL("../drizzle/schema.pg.ts", import.meta.url);
let schema = await readFile(sourcePath, "utf8");

schema = schema
  .replace(/import \{[^}]+\} from "drizzle-orm\/mysql-core";/, 'import { decimal, index, integer, json, pgTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";')
  .replace('mysqlEnum("role", USER_ROLES)', 'varchar("role", { length: 64 }).$type<(typeof USER_ROLES)[number]>()')
  .replace('mysqlEnum("status", PR_STATUSES)', 'varchar("status", { length: 64 }).$type<(typeof PR_STATUSES)[number]>()')
  .replace(/mysqlEnum\("([^"]+)",\s*(?:\[[^\]]*\]|[A-Z_]+)\)/g, 'varchar("$1", { length: 64 })')
  .replaceAll("mysqlTable", "pgTable")
  .replaceAll("int(", "integer(")
  .replaceAll(".autoincrement()", ".generatedByDefaultAsIdentity()")
  .replaceAll(".onUpdateNow()", "");

schema = schema.replace(/varchar\(("[^"]+"),\s*([^\)]+)\)/g, "varchar($1, $2)");
schema = `// Generated from drizzle/schema.ts for Supabase PostgreSQL. Do not edit manually; rerun scripts/generate-postgres-schema.mjs.\n${schema}`;

await writeFile(destinationPath, schema);
console.log(`Generated ${destinationPath.pathname}`);
