import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./server/_core/oauth";
import { registerStorageProxy } from "./server/_core/storageProxy";
import { appRouter } from "./server/routers";
import { createContext } from "./server/_core/context";

/**
 * Vercel captures this Express application as one Node.js Function. Static
 * client files are served by Vercel from dist/public; only /api/* is rewritten
 * here by vercel.json. Do not call app.listen() in this entrypoint.
 */
const app = express();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
registerStorageProxy(app);
registerOAuthRoutes(app);
app.use("/api/trpc", createExpressMiddleware({ router: appRouter, createContext }));

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[Vercel] Unhandled API error", error);
  res.status(500).json({ error: "Internal server error" });
});

export default app;
