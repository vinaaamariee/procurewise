/**
 * Resolves the target URL and preserves query parameters (such as tRPC inputs and batching flags)
 * when requests are rewritten by Vercel serverless functions.
 */
export function resolveRewrittenUrl(req: {
  url?: string;
  originalUrl?: string;
  query?: Record<string, unknown>;
  headers: Record<string, string | string[] | undefined>;
}): string {
  const queryPath = typeof req.query?.x_path === "string" ? req.query.x_path : null;
  const forwardedUri = typeof req.headers["x-forwarded-uri"] === "string" ? req.headers["x-forwarded-uri"] : null;
  const originalUrl = typeof req.headers["x-original-url"] === "string" ? req.headers["x-original-url"] : null;
  const matchedPath = typeof req.headers["x-matched-path"] === "string" ? req.headers["x-matched-path"] : null;
  const vercelMatched = typeof req.headers["x-vercel-matched-path"] === "string" ? req.headers["x-vercel-matched-path"] : null;

  const candidate = queryPath
    ? (queryPath.startsWith("/") ? queryPath : `/${queryPath}`)
    : (forwardedUri || originalUrl || matchedPath || vercelMatched || req.url || "");

  // Preserve query parameters (such as ?batch=1&input=...) from the incoming request URL or query object
  let sp: URLSearchParams;
  const rawUrl = (req.url && req.url.includes("?"))
    ? req.url
    : (req.originalUrl && req.originalUrl.includes("?") ? req.originalUrl : "");
  const qIdx = rawUrl.indexOf("?");
  if (qIdx !== -1) {
    sp = new URLSearchParams(rawUrl.slice(qIdx + 1));
  } else if (req.query && typeof req.query === "object") {
    sp = new URLSearchParams();
    for (const [key, value] of Object.entries(req.query)) {
      if (typeof value === "string") {
        sp.set(key, value);
      } else if (Array.isArray(value)) {
        value.forEach((v) => typeof v === "string" && sp.append(key, v));
      }
    }
  } else {
    sp = new URLSearchParams();
  }
  sp.delete("x_path");
  const qs = sp.toString();
  const queryString = qs ? `?${qs}` : "";

  const pathPart = candidate.split("?")[0];
  if (pathPart.includes("/trpc")) {
    const idx = pathPart.indexOf("/trpc");
    return `${pathPart.slice(idx)}${queryString}`;
  }
  if (pathPart.includes("/manus-storage")) {
    const idx = pathPart.indexOf("/manus-storage");
    return `${pathPart.slice(idx)}${queryString}`;
  }
  if (pathPart.includes("/health")) {
    return `/health${queryString}`;
  }
  return req.url || "";
}
