import { readFileSync, writeFileSync } from "node:fs";

const inputPath = "/home/ubuntu/procurewise/imports/philgepscatalog.txt";
const outputJson = "/home/ubuntu/procurewise/imports/philgeps_catalog_items.json";
const outputSql = "/home/ubuntu/procurewise/imports/philgeps_catalog_import.sql";
const outputReport = "/home/ubuntu/procurewise/imports/philgeps_catalog_import_report.md";
const units = new Set(["ROLL", "Can", "Gallon", "bottle", "Pack", "Unit", "Bundle", "Tube", "Piece", "Box", "PIECE", "POUCH", "Cart", "BOX", "SET", "Set", "BOTTL", "Book", "PAD", "Ream", "REAM", "unit", "Units", "piece", "Pair", "BOOK", "Roll"]);
const sqlEscape = (value) => String(value ?? "").replaceAll("\\", "\\\\").replaceAll("'", "''");
const lines = readFileSync(inputPath, "utf8").split(/\r?\n/);
const items = [];

for (const rawLine of lines) {
  const line = rawLine.replace(/\f/g, "").trim();
  const match = line.match(/^([0-9A-Z]+(?:-[0-9A-Z]+)+)\s+(.+?)\s+([0-9][0-9,]*\.\d{2})(?:\s{2,}(.*))?$/i);
  if (!match) continue;
  const [, productCode, beforePrice, price, remarks = ""] = match;
  const columns = beforePrice.trim().split(/\s{2,}/).filter(Boolean);
  const finalColumn = columns.at(-1);
  const unit = units.has(finalColumn) ? finalColumn : null;
  const description = (unit ? columns.slice(0, -1) : columns).join(" ").replace(/\s+/g, " ").trim();
  if (!description) throw new Error(`Missing product description for ${productCode}`);
  items.push({ productCode, description, unit, referencePrice: Number(price.replaceAll(",", "")), remarks: remarks.trim() || null, imageUrl: null, source: "PhilGEPS common-use supplies and equipment", sourceAsOfDate: "2026-08-17" });
}

const duplicates = items.filter((item, index) => items.findIndex((candidate) => candidate.productCode === item.productCode) !== index);
if (items.length !== 242) throw new Error(`Expected 242 PhilGEPS items, parsed ${items.length}.`);
if (duplicates.length) throw new Error(`Duplicate catalog codes detected: ${duplicates.map((item) => item.productCode).join(", ")}`);

writeFileSync(outputJson, `${JSON.stringify(items, null, 2)}\n`);
const sql = `INSERT INTO procurement_catalog_items (source, productCode, description, unit, referencePrice, remarks, imageUrl, sourceAsOfDate, isActive) VALUES\n${items.map((item) => `('${sqlEscape(item.source)}', '${sqlEscape(item.productCode)}', '${sqlEscape(item.description)}', ${item.unit ? `'${sqlEscape(item.unit)}'` : "NULL"}, ${item.referencePrice.toFixed(2)}, ${item.remarks ? `'${sqlEscape(item.remarks)}'` : "NULL"}, NULL, '${item.sourceAsOfDate}', 1)`).join(",\n")}\nON DUPLICATE KEY UPDATE description = VALUES(description), unit = VALUES(unit), referencePrice = VALUES(referencePrice), remarks = VALUES(remarks), source = VALUES(source), sourceAsOfDate = VALUES(sourceAsOfDate), isActive = 1;\n`;
writeFileSync(outputSql, sql);
const withUnits = items.filter((item) => item.unit).length;
const withRemarks = items.filter((item) => item.remarks).length;
writeFileSync(outputReport, `# PhilGEPS Catalog Import Preflight\n\n| Measure | Result |\n|---|---:|\n| Source title | List of Common-Use Supplies and Equipment |\n| Source as-of date | 2026-08-17 |\n| Declared source item count | 242 |\n| Parsed item count | ${items.length} |\n| Product-code duplicates | ${duplicates.length} |\n| Items with a supplied UOM | ${withUnits} |\n| Items with supplied remarks | ${withRemarks} |\n| Catalog images supplied | 0 |\n\nThe supplied PDF is a tabular common-use supplies and equipment list. It provides product code, product description, UOM where shown, reference price, and remarks. It does not include product images, so no images are assigned.\n`);
console.log(`Prepared ${items.length} PhilGEPS catalog items.`);
