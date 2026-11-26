import assert from "node:assert/strict";
import { test } from "node:test";
import { parseProjectDraftUpdate } from "../lib/project-draft-updates.ts";

test("project draft updates accept only editable fields and normalize text", () => {
  assert.deepEqual(parseProjectDraftUpdate({
    title: "  New title  ",
    description: "  A description  ",
    visibility: "unlisted",
  }), {
    ok: true,
    value: { title: "New title", description: "A description", visibility: "unlisted" },
  });
});

test("project draft updates reject empty and unknown fields", () => {
  assert.equal(parseProjectDraftUpdate({}).ok, false);
  assert.equal(parseProjectDraftUpdate({ owner_user_id: "attacker" }).ok, false);
  assert.equal(parseProjectDraftUpdate({ content_reference: "private/path" }).ok, false);
});

test("project draft updates reject public visibility and publishing", () => {
  assert.equal(parseProjectDraftUpdate({ visibility: "public" }).ok, false);
  assert.equal(parseProjectDraftUpdate({ status: "published" }).ok, false);
});

test("project draft updates enforce title and description limits", () => {
  assert.equal(parseProjectDraftUpdate({ title: " " }).ok, false);
  assert.equal(parseProjectDraftUpdate({ title: "x".repeat(121) }).ok, false);
  assert.equal(parseProjectDraftUpdate({ description: "x".repeat(5001) }).ok, false);
});

test("project drafts can be archived and restored without publishing", () => {
  assert.deepEqual(parseProjectDraftUpdate({ status: "archived" }), { ok: true, value: { status: "archived" } });
  assert.deepEqual(parseProjectDraftUpdate({ status: "draft" }), { ok: true, value: { status: "draft" } });
});
