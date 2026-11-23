import assert from "node:assert/strict";
import { test } from "node:test";
import { validateFamilyMemberUpdate } from "../lib/family-member-permissions.ts";

test("family member updates accept supported roles", () => {
  assert.deepEqual(validateFamilyMemberUpdate({ role: "parent_guardian" }), { ok: true, role: "parent_guardian" });
});

test("family member updates accept only allowlisted boolean permissions", () => {
  assert.deepEqual(validateFamilyMemberUpdate({ permissions: { can_chat: true, can_publish_projects: false } }), {
    ok: true, permissions: { can_chat: true, can_publish_projects: false },
  });
});

test("family member updates reject owner escalation and unknown permission keys", () => {
  assert.equal(validateFamilyMemberUpdate({ role: "owner" }).ok, false);
  assert.equal(validateFamilyMemberUpdate({ permissions: { can_manage_family: true } }).ok, false);
  assert.equal(validateFamilyMemberUpdate({ permissions: { can_chat: "yes" } }).ok, false);
  assert.equal(validateFamilyMemberUpdate({ role: "member", admin: true }).ok, false);
});
