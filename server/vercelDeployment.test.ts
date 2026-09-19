import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Vercel deployment configuration", () => {
  it("uses the committed Express bundle and static SPA rewrite boundaries", () => {
    const config = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8")) as {
      buildCommand?: string;
      outputDirectory?: string;
      functions?: Record<string, unknown>;
      rewrites?: Array<{ source: string; destination: string }>;
    };
    const apiBundle = readFileSync(new URL("../api/index.mjs", import.meta.url), "utf8");
    const apiSource = readFileSync(new URL("../server/vercelApiEntrypoint.ts", import.meta.url), "utf8");

    expect(existsSync(new URL("../api/index.mjs", import.meta.url))).toBe(true);
    expect(existsSync(new URL("../api/index.ts", import.meta.url))).toBe(false);
    expect(existsSync(new URL("../server.ts", import.meta.url))).toBe(false);
    expect(apiSource).toContain('import express from "express"');
    expect(apiSource).toContain('import { appRouter } from "./routers"');
    expect(apiSource).toContain('app.use("/api/trpc"');
    expect(apiSource).toContain("export default app");
    expect(apiBundle).toContain('app.use("/api/trpc"');
    expect(apiBundle).toContain("export {");
    expect(apiBundle).not.toContain("registerOAuthRoutes(app)");
    expect(config.buildCommand).toBe("pnpm build");
    expect(config.outputDirectory).toBe("dist/public");
    expect(config.functions).toBeUndefined();
    expect(config.rewrites).toContainEqual({ source: "/api/(.*)", destination: "/api/index" });
    expect(config.rewrites).toContainEqual({ source: "/(.*)", destination: "/index.html" });
  });
});
