import { storageGetSignedUrl } from "../storage";

type StorageRequest = {
  params: Record<string, string>;
  query?: Record<string, unknown>;
  path?: string;
  url?: string;
};
type StorageResponse = {
  status: (code: number) => StorageResponse;
  send: (body: string) => void;
  set: (field: string, value: string) => StorageResponse;
  redirect: (status: number, url: string) => void;
};
type StorageApplication = {
  get: (path: string | string[], handler: (req: StorageRequest, res: StorageResponse) => Promise<void>) => unknown;
};

export function registerStorageProxy(app: StorageApplication) {
  app.get(["/manus-storage/*", "/api/manus-storage/*"], async (req, res) => {
    const rawKey =
      req.params[0] ||
      (req.path || req.url || "").split("?")[0].replace(/^\/?(api\/)?manus-storage\/?/, "");
    const key = rawKey.replace(/^\/+/, "");
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }

    try {
      const downloadParam = req.query?.download;
      const download =
        downloadParam === "1" || downloadParam === "true" || typeof downloadParam === "string"
          ? downloadParam
          : undefined;
      const url = await storageGetSignedUrl(key, { download });
      res.set("Cache-Control", "no-store");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err instanceof Error ? err.message : "Unknown storage error");
      res.status(502).send("Storage proxy error");
    }
  });
}
