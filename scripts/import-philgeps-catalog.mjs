import { readFileSync } from "node:fs";
import mysql from "mysql2/promise";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required for the catalog import.");
const items = JSON.parse(readFileSync("/home/ubuntu/procurewise/imports/philgeps_catalog_items.json", "utf8"));
const catalogSource = "Common-use supplies and equipment catalog";
if (!Array.isArray(items) || items.length !== 242) throw new Error("Validated catalog JSON must contain exactly 242 items.");

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const fields = ["source", "productCode", "description", "unit", "referencePrice", "remarks", "imageUrl", "sourceAsOfDate", "isActive"];
const placeholders = items.map(() => `(${fields.map(() => "?").join(", ")})`).join(", ");
const values = items.flatMap((item) => [catalogSource, item.productCode, item.description, item.unit, item.referencePrice, item.remarks, item.imageUrl, item.sourceAsOfDate, 1]);
const statement = `INSERT INTO procurement_catalog_items (${fields.join(", ")}) VALUES ${placeholders} ON DUPLICATE KEY UPDATE description = VALUES(description), unit = VALUES(unit), referencePrice = VALUES(referencePrice), remarks = VALUES(remarks), source = VALUES(source), sourceAsOfDate = VALUES(sourceAsOfDate), isActive = 1`;

try {
  await connection.beginTransaction();
  await connection.execute(statement, values);
  const [rows] = await connection.query("SELECT COUNT(*) AS catalogCount, COUNT(imageUrl) AS imageCount FROM procurement_catalog_items WHERE source = ? AND isActive = 1", [catalogSource]);
  await connection.commit();
  console.log(JSON.stringify(rows[0]));
} catch (error) {
  await connection.rollback();
  throw error;
} finally {
  await connection.end();
}
