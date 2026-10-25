import express from "express";
import { sql } from "drizzle-orm";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerStorageProxy } from "./_core/storageProxy";
import { appRouter } from "./routers";
import { createContext } from "./_core/context";
import { getDb, testDatabaseConnectivity } from "./db";

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
    const diag = await testDatabaseConnectivity();
    const hasServiceRoleKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY);
    const hasAnonKey = Boolean(
      process.env.VITE_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    );

    const maskRef = (ref: string | null) => (ref ? `${ref.slice(0, 4)}...${ref.slice(-4)}` : null);
    const isHealthy = diag.connectivity && Boolean(diag.usersTableExists);

    res.status(isHealthy ? 200 : (diag.configured ? 503 : 500)).json({
      status: isHealthy ? "ok" : "degraded",
      database: diag.connectivity,
      usersTable: Boolean(diag.usersTableExists),
      usersCount: diag.usersCount ?? 0,
      authProjectRef: maskRef(diag.authProjectRef),
      dbProjectRef: maskRef(diag.dbProjectRef),
      connectionSource: diag.source,
      projectMatch: diag.isProjectMatched,
      host: diag.host,
      port: diag.port,
      isPooler: diag.isPooler,
      latencyMs: diag.latencyMs,
      hasServiceRoleKey,
      hasAnonKey,
      error: diag.error?.message ?? null,
      errorCategory: diag.error?.category ?? null,
      errorCode: diag.error?.code ?? null,
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
