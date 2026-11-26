import "server-only";

export function getResendApiKey() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("Resend is not configured.");
  return apiKey;
}

export function getSupportInboxId() {
  const inboxId = process.env.KLIN_SUPPORT_INBOX_ID;
  if (!inboxId) throw new Error("Klin support inbox is not configured.");
  return inboxId;
}

export async function resendInboxRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch("https://api.resend.com" + path, {
    ...init,
    headers: {
      Authorization: "Bearer " + getResendApiKey(),
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
    cache: "no-store",
    signal: init.signal || AbortSignal.timeout(20000),
  });
  const payload = await response.json().catch(() => null) as { message?: string; error?: string } | T | null;
  if (!response.ok) {
    const errorMessage = payload && typeof payload === "object" && "message" in payload && typeof payload.message === "string"
      ? payload.message : "Resend API returned HTTP " + response.status + ".";
    throw new Error(errorMessage);
  }
  return payload as T;
}
