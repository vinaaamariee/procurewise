import mysql from "mysql2/promise";
import { createAbstractOfCanvass } from "../server/db.ts";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required for the authorised test workflow.");

const connection = await mysql.createConnection(process.env.DATABASE_URL);

try {
  const [[procurementOfficer]] = await connection.query("SELECT id, openId, name, email, loginMethod, role, createdAt, updatedAt, lastSignedIn FROM users WHERE openId = ?", ["test-workflow-officer-2026"]);
  const [[preCanvass]] = await connection.query("SELECT pc.id, pc.preCanvassNumber, pc.purchaseRequestId FROM pre_canvasses pc LEFT JOIN abstracts_of_canvass a ON a.preCanvassId = pc.id JOIN purchase_requests pr ON pr.id = pc.purchaseRequestId WHERE pc.status = 'submitted' AND pr.purpose LIKE 'TEST ONLY — PPMP to Abstract verification%' AND a.id IS NULL ORDER BY pc.id DESC LIMIT 1");
  if (!procurementOfficer || !preCanvass) throw new Error("No resumable authorised test Pre-Canvass package was found.");

  await createAbstractOfCanvass(Number(preCanvass.id), procurementOfficer);

  const [[abstract]] = await connection.query("SELECT id, abstractNumber, status, recommendedSupplierId, recommendationReason FROM abstracts_of_canvass WHERE preCanvassId = ?", [preCanvass.id]);
  const [quotes] = await connection.query("SELECT supplierId, totalPrice, deliveryDays, isCompliant, quotationReference FROM pre_canvass_quotes WHERE preCanvassId = ? ORDER BY totalPrice", [preCanvass.id]);
  console.log(JSON.stringify({ preCanvass, abstract, quoteCount: quotes.length, quotes }, null, 2));
} finally {
  await connection.end();
}
