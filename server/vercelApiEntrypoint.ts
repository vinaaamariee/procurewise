import express from "express";
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
  const matched = req.headers["x-matched-path"];
  if (typeof matched === "string" && (matched.startsWith("/api/trpc") || matched.startsWith("/trpc"))) {
    req.url = matched;
  }
  next();
});

const trpcMiddleware = createExpressMiddleware({ router: appRouter, createContext });
app.use("/api/trpc", trpcMiddleware);
app.use("/trpc", trpcMiddleware);

app.get(["/api/health", "/health"], async (_req, res) => {
  try {
    const db = await getDb();
    res.json({
      status: "ok",
      database: Boolean(db),
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
