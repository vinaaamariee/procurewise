import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Vercel deployment configuration", () => {
  it("keeps the Express API entrypoint and static SPA rewrite boundaries", () => {
    const entrypoint = readFileSync(new URL("../server.ts", import.meta.url), "utf8");
    const config = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8")) as {
      buildCommand?: string;
      outputDirectory?: string;
      rewrites?: Array<{ source: string; destination: string }>;
    };

    expect(entrypoint).toContain("export default app");
    expect(entrypoint).toContain("registerOAuthRoutes(app)");
    expect(entrypoint).toContain('"/api/trpc"');
    expect(config.buildCommand).toBe("pnpm build");
    expect(config.outputDirectory).toBe("dist/public");
    expect(config.rewrites).toContainEqual({ source: "/api/(.*)", destination: "/server.ts" });
    expect(config.rewrites).toContainEqual({ source: "/(.*)", destination: "/index.html" });
  });
});
