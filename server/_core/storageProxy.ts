import { storageGetSignedUrl } from "../storage";

type StorageRequest = { params: Record<string, string> };
type StorageResponse = {
  status: (code: number) => StorageResponse;
  send: (body: string) => void;
  set: (field: string, value: string) => StorageResponse;
  redirect: (status: number, url: string) => void;
};
type StorageApplication = {
  get: (path: string, handler: (req: StorageRequest, res: StorageResponse) => Promise<void>) => unknown;
};

export function registerStorageProxy(app: StorageApplication) {
  app.get("/manus-storage/*", async (req, res) => {
    const key = req.params[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }

    try {
      const url = await storageGetSignedUrl(key);
      res.set("Cache-Control", "no-store");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err instanceof Error ? err.message : "Unknown storage error");
      res.status(502).send("Storage proxy error");
    }
  });
}
