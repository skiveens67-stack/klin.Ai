import assert from "node:assert/strict";
import { test } from "node:test";
import { parseSocialDraftUpdate } from "../lib/social-draft-updates.ts";

test("social draft updates normalize body and accept supported visibility", () => {
  assert.deepEqual(parseSocialDraftUpdate({ body: "  Updated draft  ", visibility: "followers" }), {
    ok: true,
    value: { body: "Updated draft", visibility: "followers" },
  });
});

test("social draft updates reject empty and unknown fields", () => {
  assert.equal(parseSocialDraftUpdate({}).ok, false);
  assert.equal(parseSocialDraftUpdate({ status: "published" }).ok, false);
  assert.equal(parseSocialDraftUpdate({ user_id: "other-user" }).ok, false);
});

test("social draft updates enforce body length and visibility", () => {
  assert.equal(parseSocialDraftUpdate({ body: " " }).ok, false);
  assert.equal(parseSocialDraftUpdate({ body: "x".repeat(4001) }).ok, false);
  assert.equal(parseSocialDraftUpdate({ visibility: "everyone" }).ok, false);
});
