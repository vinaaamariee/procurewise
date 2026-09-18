import fs from "node:fs";

const path = "drizzle/schema.ts";
let source = fs.readFileSync(path, "utf8");
source = source.replace(
  'import { decimal, index, integer, json, pgTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";',
  'import { decimal, index, integer, json, pgSchema, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";'
);
if (!source.includes('const procurewiseSchema = pgSchema("procurewise");')) {
  source = source.replace(
    'import { PR_STATUSES, USER_ROLES } from "../shared/procurementRules";\n',
    'import { PR_STATUSES, USER_ROLES } from "../shared/procurementRules";\n\nconst procurewiseSchema = pgSchema("procurewise");\n'
  );
}
source = source.replace(/pgTable\("/g, 'procurewiseSchema.table("');
fs.writeFileSync(path, source);
console.log("Qualified", (source.match(/procurewiseSchema\.table\(/g) ?? []).length, "tables in", path);
