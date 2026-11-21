import "server-only";

/**
 * Returns the canonical Klin origin for external redirects.
 * Do not derive payment return URLs from the incoming Host header.
 */
export function getKlinAppOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (!configured) {
    throw new Error("Klin site URL is not configured.");
  }

  let url: URL;
  try {
    url = new URL(configured);
  } catch {
    throw new Error("Klin site URL is invalid.");
  }

  const isLocalhost = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (url.protocol !== "https:" && !(isLocalhost && url.protocol === "http:")) {
    throw new Error("Klin site URL must use HTTPS.");
  }
  if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("Klin site URL must be an origin without credentials, path, query, or fragment.");
  }

  return url.origin;
}
