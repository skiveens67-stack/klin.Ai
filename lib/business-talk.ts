export type BusinessConversationInput = { participantIds: string[]; subject: string | null };
export type BusinessMessageInput = { body: string; idempotencyKey: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseBusinessConversationInput(value: unknown):
  | { ok: true; value: BusinessConversationInput }
  | { ok: false; error: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ok: false, error: "Invalid conversation request." };
  const input = value as Record<string, unknown>;
  if (Object.keys(input).some((key) => !["participant_ids", "subject"].includes(key))) return { ok: false, error: "Unexpected conversation field." };
  if (!Array.isArray(input.participant_ids) || input.participant_ids.length < 1 || input.participant_ids.length > 10 ||
      input.participant_ids.some((id) => typeof id !== "string" || !UUID.test(id))) {
    return { ok: false, error: "Provide 1–10 valid participant IDs." };
  }
  const participantIds = [...new Set(input.participant_ids as string[])];
  if (participantIds.length !== input.participant_ids.length) return { ok: false, error: "Participant IDs must be unique." };
  const subject = input.subject === undefined || input.subject === null ? null : typeof input.subject === "string" ? input.subject.trim() : "";
  if (subject !== null && (subject.length < 1 || subject.length > 120)) return { ok: false, error: "Subject must be 1–120 characters." };
  return { ok: true, value: { participantIds, subject } };
}

export function parseBusinessMessageInput(value: unknown, idempotencyKey: string | null):
  | { ok: true; value: BusinessMessageInput }
  | { ok: false; error: string } {
  if (!idempotencyKey || idempotencyKey.length < 8 || idempotencyKey.length > 128 || !/^[a-zA-Z0-9._:-]+$/.test(idempotencyKey)) {
    return { ok: false, error: "A valid Idempotency-Key header is required." };
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ok: false, error: "Invalid message request." };
  const input = value as Record<string, unknown>;
  if (Object.keys(input).some((key) => key !== "body")) return { ok: false, error: "Unexpected message field." };
  if (typeof input.body !== "string" || input.body.trim().length < 1 || input.body.length > 10000) return { ok: false, error: "Message must be 1–10,000 characters." };
  return { ok: true, value: { body: input.body.trim(), idempotencyKey } };
}
