import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { buildProcurementRealtimePayload, getSupabaseRealtimePublicConfig } from "./supabaseRealtime";

const projectRoot = resolve(import.meta.dirname, "..");
const routerSource = readFileSync(resolve(projectRoot, "server/routers.ts"), "utf8");
const workflowSource = readFileSync(resolve(projectRoot, "client/src/pages/WorkflowPages.tsx"), "utf8");
const managementSource = readFileSync(resolve(projectRoot, "client/src/pages/ManagementPages.tsx"), "utf8");

describe("Supabase procurement Realtime", () => {
  it("publishes a metadata-only invalidation signal without a record identifier or transaction fields", () => {
    const signal = buildProcurementRealtimePayload("abstract_of_canvass");
    expect(signal.recordType).toBe("abstract_of_canvass");
    expect(Object.keys(signal).sort()).toEqual(["occurredAt", "recordType"]);
    expect(new Date(signal.occurredAt).getTime()).not.toBeNaN();
  });

  it("exposes only browser-safe connection settings through the protected configuration contract", () => {
    const config = getSupabaseRealtimePublicConfig();
    expect(Object.keys(config).sort()).toEqual(["anonKey", "isConfigured", "url"]);
    expect(config.isConfigured).toBe(true);
    expect(config.anonKey).toBe(process.env.VITE_SUPABASE_ANON_KEY);
  });

  it("wires post-mutation publication and protected dashboard invalidation into both requested workspaces", () => {
    expect(routerSource).toContain('publishProcurementRealtimeUpdate("pre_canvass")');
    expect(routerSource).toContain('publishProcurementRealtimeUpdate("abstract_of_canvass")');
    expect(workflowSource).toContain("useSupabaseRealtime");
    expect(workflowSource).toContain("LiveUpdateBadge");
    expect(managementSource).toContain("Download CSV");
    expect(managementSource).toContain("Download PPMP PDF");
    expect(workflowSource).toContain("Package PDF");
  });
});
