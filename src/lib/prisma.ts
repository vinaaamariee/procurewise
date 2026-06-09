import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

const createPrismaClient = () => {
  let connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set in environment variables.");
  }

  // Strip carriage returns (\r), whitespace, and outer quotes (common Windows CRLF issue)
  connectionString = connectionString.replace(/\r/g, "").trim().replace(/^["']|["']$/g, "").trim();

  // Securely log connection details (masking the password) for debugging
  const maskedConn = connectionString.replace(/:[^:@]+@/, ":[MASKED]@");
  console.log(`[PRISMA DIAGNOSTICS] Connecting with URL: ${maskedConn}`);

  // Pass connectionString directly to pg Pool
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 30000, // 30 seconds connection timeout
  });

  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
};

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
