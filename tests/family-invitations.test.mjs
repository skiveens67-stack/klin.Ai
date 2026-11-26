import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createFamilyInvitationToken,
  getFamilyInvitationExpiry,
  hashFamilyInvitationToken,
  normalizeInvitationEmail,
  FAMILY_INVITATION_TTL_MS,
} from "../lib/family-invitations.ts";

test("family invitation tokens are random and only their hashes are stored", () => {
  const first = createFamilyInvitationToken();
  const second = createFamilyInvitationToken();
  assert.notEqual(first.token, second.token);
  assert.equal(first.tokenHash, hashFamilyInvitationToken(first.token));
  assert.notEqual(first.tokenHash, first.token);
  assert.equal(first.token.length >= 32, true);
});

test("invitation email normalization is case-insensitive and trims whitespace", () => {
  assert.equal(normalizeInvitationEmail("  Person@Example.COM "), "person@example.com");
});

test("family invitation expiry is seven days after creation", () => {
  const now = 1_800_000_000_000;
  assert.equal(new Date(getFamilyInvitationExpiry(now)).getTime(), now + FAMILY_INVITATION_TTL_MS);
});
