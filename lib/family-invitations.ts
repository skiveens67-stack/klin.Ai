import { createHash, randomBytes } from "node:crypto";

export const FAMILY_INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function normalizeInvitationEmail(value: string) {
  return value.trim().toLowerCase();
}

export function createFamilyInvitationToken() {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  return { token, tokenHash };
}

export function hashFamilyInvitationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function getFamilyInvitationExpiry(now = Date.now()) {
  return new Date(now + FAMILY_INVITATION_TTL_MS).toISOString();
}
