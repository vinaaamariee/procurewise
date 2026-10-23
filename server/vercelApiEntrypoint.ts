import express from "express";
import { sql } from "drizzle-orm";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerStorageProxy } from "./_core/storageProxy";
import { appRouter } from "./routers";
import { createContext } from "./_core/context";
import { getDb } from "./db";

const app = express();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
registerStorageProxy(app);

// Preserve incoming path if rewritten by Vercel
app.use((req, _res, next) => {
  const queryPath = typeof req.query?.x_path === "string" ? req.query.x_path : null;
  const forwardedUri = typeof req.headers["x-forwarded-uri"] === "string" ? req.headers["x-forwarded-uri"] : null;
  const originalUrl = typeof req.headers["x-original-url"] === "string" ? req.headers["x-original-url"] : null;
  const matchedPath = typeof req.headers["x-matched-path"] === "string" ? req.headers["x-matched-path"] : null;
  const vercelMatched = typeof req.headers["x-vercel-matched-path"] === "string" ? req.headers["x-vercel-matched-path"] : null;

  const candidate = queryPath
    ? (queryPath.startsWith("/") ? queryPath : `/${queryPath}`)
    : (forwardedUri || originalUrl || matchedPath || vercelMatched || req.url);

  if (candidate) {
    if (candidate.includes("/trpc")) {
      const idx = candidate.indexOf("/trpc");
      req.url = candidate.slice(idx);
    } else if (candidate.includes("/health")) {
      req.url = "/health";
    }
  }
  next();
});

const trpcMiddleware = createExpressMiddleware({ router: appRouter, createContext });
app.use(["/api/trpc", "/trpc"], trpcMiddleware);

app.get(["/api/health", "/health"], async (_req, res) => {
  try {
    const db = await getDb();
    let usersCount = 0;
    let usersTableFound = false;
    if (db) {
      const result = await db.execute(sql`select count(*) from procurewise.users`);
      usersCount = Number(result.rows[0]?.count ?? 0);
      usersTableFound = true;
    }
    const authUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const dbUrl = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;

    const getRef = (val?: string) => {
      if (!val) return null;
      const m = val.match(/([a-z0-9]{20})/);
      return m ? `${m[1].slice(0, 4)}...${m[1].slice(-4)}` : "set";
    };

    res.json({
      status: "ok",
      database: Boolean(db),
      usersTable: usersTableFound,
      usersCount,
      authProjectRef: getRef(authUrl),
      dbProjectRef: getRef(dbUrl),
      hasServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY),
      hasAnonKey: Boolean(process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default app;
