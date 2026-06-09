import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { URL } from "url";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

const createPrismaClient = () => {
  let connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set in environment variables.");
  }

  // Strip carriage returns (\r), whitespace, and outer quotes (common Windows CRLF issue)
  connectionString = connectionString.replace(/\r/g, "").trim().replace(/^["']|["']$/g, "").trim();

  const dbUrl = new URL(connectionString);
  
  const pool = new Pool({
    user: dbUrl.username,
    password: decodeURIComponent(dbUrl.password || ""),
    host: dbUrl.hostname,
    port: dbUrl.port ? parseInt(dbUrl.port) : 5432,
    database: dbUrl.pathname.substring(1),
    ssl: dbUrl.searchParams.get("sslmode") !== "disable" ? { rejectUnauthorized: false } : undefined,
    connectionTimeoutMillis: 30000,
  });

  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
};

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
