// Preconfigured storage helpers for Manus WebDev templates
// Uploads via Forge Server presigned URL to S3 (PUT direct).
// Downloads return /manus-storage/{key} paths served via 307 redirect.

import { createClient } from "@supabase/supabase-js";
import { ENV } from "./_core/env";

type StorageConfiguration =
  | { provider: "forge"; forgeUrl: string; forgeKey: string }
  | { provider: "supabase"; supabaseUrl: string; serviceRoleKey: string; bucket: string };

export function resolveStorageConfiguration(env: Record<string, string | undefined>): StorageConfiguration {
  const forgeUrl = env.BUILT_IN_FORGE_API_URL;
  const forgeKey = env.BUILT_IN_FORGE_API_KEY;
  if (forgeUrl && forgeKey) {
    return { provider: "forge", forgeUrl: forgeUrl.replace(/\/+$/, ""), forgeKey };
  }

  const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (supabaseUrl && serviceRoleKey) {
    return {
      provider: "supabase",
      supabaseUrl: supabaseUrl.replace(/\/+$/, ""),
      serviceRoleKey,
      bucket: env.SUPABASE_STORAGE_BUCKET || "procurewise-documents",
    };
  }

  throw new Error(
    "Document storage is not configured. Set Supabase URL and SUPABASE_SERVICE_ROLE_KEY, or configure both Forge storage variables.",
  );
}

async function ensureSupabaseBucket(configuration: Extract<StorageConfiguration, { provider: "supabase" }>) {
  const client = createClient(configuration.supabaseUrl, configuration.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: lookupError } = await client.storage.getBucket(configuration.bucket);
  if (!lookupError) return client;

  const { error: createError } = await client.storage.createBucket(configuration.bucket, { public: false });
  if (createError && !createError.message.toLowerCase().includes("already exists")) {
    throw new Error(`Supabase storage bucket setup failed: ${createError.message}`);
  }
  return client;
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function appendHashSuffix(relKey: string): string {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  const configuration = resolveStorageConfiguration(process.env);
  const key = appendHashSuffix(normalizeKey(relKey));

  if (configuration.provider === "supabase") {
    const client = await ensureSupabaseBucket(configuration);
    const { error } = await client.storage.from(configuration.bucket).upload(key, Buffer.from(data), {
      contentType,
      upsert: false,
    });
    if (error) throw new Error(`Supabase storage upload failed: ${error.message}`);
    const storedKey = `supabase/${key}`;
    return { key: storedKey, url: `/manus-storage/${storedKey}` };
  }

  const { forgeUrl, forgeKey } = configuration;

  // 1. Get presigned PUT URL from Forge
  const presignUrl = new URL("v1/storage/presign/put", forgeUrl + "/");
  presignUrl.searchParams.set("path", key);

  const presignResp = await fetch(presignUrl, {
    headers: { Authorization: `Bearer ${forgeKey}` },
  });

  if (!presignResp.ok) {
    const msg = await presignResp.text().catch(() => presignResp.statusText);
    throw new Error(`Storage presign failed (${presignResp.status}): ${msg}`);
  }

  const { url: s3Url } = (await presignResp.json()) as { url: string };
  if (!s3Url) throw new Error("Forge returned empty presign URL");

  // 2. PUT file directly to S3
  const blob =
    typeof data === "string"
      ? new Blob([data], { type: contentType })
      : new Blob([data as any], { type: contentType });

  const uploadResp = await fetch(s3Url, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: blob,
  });

  if (!uploadResp.ok) {
    throw new Error(`Storage upload to S3 failed (${uploadResp.status})`);
  }

  return { key, url: `/manus-storage/${key}` };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  return { key, url: `/manus-storage/${key}` };
}

export async function storageGetSignedUrl(relKey: string): Promise<string> {
  const key = normalizeKey(relKey);

  if (key.startsWith("supabase/")) {
    const configuration = resolveStorageConfiguration(process.env);
    if (configuration.provider !== "supabase") {
      throw new Error("Supabase Storage credentials are required to retrieve this document.");
    }
    const client = await ensureSupabaseBucket(configuration);
    const { data, error } = await client.storage
      .from(configuration.bucket)
      .createSignedUrl(key.slice("supabase/".length), 60);
    if (error || !data?.signedUrl) {
      throw new Error(`Supabase storage signed URL failed: ${error?.message ?? "No signed URL returned"}`);
    }
    return data.signedUrl;
  }

  const configuration = resolveStorageConfiguration(process.env);
  if (configuration.provider !== "forge") {
    throw new Error("Forge Storage credentials are required to retrieve this legacy document.");
  }
  const { forgeUrl, forgeKey } = configuration;

  const getUrl = new URL("v1/storage/presign/get", forgeUrl + "/");
  getUrl.searchParams.set("path", key);

  const resp = await fetch(getUrl, {
    headers: { Authorization: `Bearer ${forgeKey}` },
  });

  if (!resp.ok) {
    const msg = await resp.text().catch(() => resp.statusText);
    throw new Error(`Storage signed URL failed (${resp.status}): ${msg}`);
  }

  const { url } = (await resp.json()) as { url: string };
  return url;
}
