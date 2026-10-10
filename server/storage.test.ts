import { describe, expect, it } from "vitest";
import { resolveStorageConfiguration } from "./storage";

describe("document storage configuration", () => {
  it("prefers Forge when both Forge credentials are configured", () => {
    expect(resolveStorageConfiguration({
      BUILT_IN_FORGE_API_URL: "https://forge.example/",
      BUILT_IN_FORGE_API_KEY: "forge-key",
      VITE_SUPABASE_URL: "https://project.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "service-key",
    })).toEqual({
      provider: "forge",
      forgeUrl: "https://forge.example",
      forgeKey: "forge-key",
    });
  });

  it("uses a private Supabase bucket when Forge credentials are unavailable", () => {
    expect(resolveStorageConfiguration({
      VITE_SUPABASE_URL: "https://project.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "service-key",
    })).toEqual({
      provider: "supabase",
      supabaseUrl: "https://project.supabase.co",
      serviceRoleKey: "service-key",
      bucket: "procurewise-documents",
    });
  });

  it("allows the private bucket name to be configured", () => {
    expect(resolveStorageConfiguration({
      SUPABASE_URL: "https://project.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "service-key",
      SUPABASE_STORAGE_BUCKET: "private-files",
    })).toMatchObject({ provider: "supabase", bucket: "private-files" });
  });

  it("reports supported storage configuration when no provider is ready", () => {
    expect(() => resolveStorageConfiguration({})).toThrow(
      "Document storage is not configured. Set Supabase URL and SUPABASE_SERVICE_ROLE_KEY, or configure both Forge storage variables."
    );
  });
});