export type SocialDraftUpdate = { body?: string; visibility?: "public" | "followers" | "private" };
export type SocialDraftUpdateResult =
  | { ok: true; value: SocialDraftUpdate }
  | { ok: false; error: string };

export function parseSocialDraftUpdate(input: unknown): SocialDraftUpdateResult {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, error: "Invalid request body." };
  }
  const record = input as Record<string, unknown>;
  const allowed = new Set(["body", "visibility"]);
  if (Object.keys(record).some((key) => !allowed.has(key))) {
    return { ok: false, error: "Unsupported post field." };
  }

  const value: SocialDraftUpdate = {};
  if ("body" in record) {
    if (typeof record.body !== "string") return { ok: false, error: "Post text must be text." };
    const body = record.body.trim();
    if (body.length < 1 || body.length > 4000) {
      return { ok: false, error: "Post text must be 1–4,000 characters." };
    }
    value.body = body;
  }
  if ("visibility" in record) {
    if (record.visibility !== "public" && record.visibility !== "followers" && record.visibility !== "private") {
      return { ok: false, error: "Invalid post visibility." };
    }
    value.visibility = record.visibility;
  }
  if (Object.keys(value).length === 0) return { ok: false, error: "Provide a post change." };
  return { ok: true, value };
}
