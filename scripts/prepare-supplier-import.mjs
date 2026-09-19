import { readFileSync, writeFileSync } from "node:fs";

const sourcePath = "/home/ubuntu/upload/pasted_content_2.txt";
const outputSqlPath = "/home/ubuntu/procurewise/supplier_import.sql";
const outputReportPath = "/home/ubuntu/procurewise/supplier_import_report.md";
const lines = readFileSync(sourcePath, "utf8").trim().split(/\r?\n/);

const clean = (value) => value.replace(/\s+/g, " ").trim();
const escapeSql = (value) => `'${value.replaceAll("'", "''")}'`;
const rows = lines.slice(1).map((line, index) => {
  const [businessName = "", owner = "", tin = ""] = line.split("\t");
  return { sourceRow: index + 2, businessName: clean(businessName), owner: clean(owner), tin: clean(tin) || null };
});
const invalid = rows.filter((row) => !row.businessName);
if (invalid.length) throw new Error(`Cannot import rows without a business name: ${invalid.map((row) => row.sourceRow).join(", ")}`);

const tinGroups = new Map();
for (const row of rows.filter((row) => row.tin)) {
  const key = row.tin.replaceAll("-", "");
  tinGroups.set(key, [...(tinGroups.get(key) ?? []), row]);
}
const duplicatedTins = [...tinGroups.values()].filter((group) => group.length > 1);
const missingTin = rows.filter((row) => !row.tin);

const values = rows.map((row, index) => [
  escapeSql(`SUP-${String(index + 1).padStart(3, "0")}`),
  escapeSql(row.businessName),
  row.owner ? escapeSql(row.owner) : "NULL",
  row.tin ? escapeSql(row.tin) : "NULL",
  "'pending'",
  "1",
  "1",
].join(", "));
const sql = [
  "-- User-supplied Batanes supplier registry import. Generated for review; no fields were invented.",
  "INSERT INTO `suppliers` (`supplierCode`, `companyName`, `contactPerson`, `tin`, `accreditationStatus`, `isActive`, `createdById`) VALUES",
  values.map((value) => `  (${value})`).join(",\n"),
  ";",
  "",
].join("\n");
writeFileSync(outputSqlPath, sql);

const duplicateLines = duplicatedTins.length
  ? duplicatedTins.map((group) => `- ${group.map((row) => `${row.businessName} (${row.tin})`).join("; ")}`).join("\n")
  : "- None";
const report = `# Supplier Import Preflight\n\n| Check | Result |\n|---|---:|\n| Supplied rows | ${rows.length} |\n| Business names ready for import | ${rows.length} |\n| TIN not supplied | ${missingTin.length} |\n| Repeated normalized TIN groups | ${duplicatedTins.length} |\n| Existing ProcureWise supplier rows | 0 (verified separately) |\n\nAll records will be created with generated internal codes **SUP-001** through **SUP-${String(rows.length).padStart(3, "0")}**, status **pending**, and blank fields where the source did not provide information.\n\n## Missing TIN\n\n${missingTin.length ? missingTin.map((row) => `- ${row.businessName}`).join("\n") : "- None"}\n\n## Repeated TIN review\n\n${duplicateLines}\n\nThe repeated TIN values are retained because the user supplied distinct business names. No duplicate business name was automatically removed.\n`;
writeFileSync(outputReportPath, report);
console.log(`Prepared ${rows.length} supplier rows, ${missingTin.length} missing TIN values, and ${duplicatedTins.length} repeated-TIN groups.`);
