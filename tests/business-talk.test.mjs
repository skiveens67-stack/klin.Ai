import test from "node:test";
import assert from "node:assert/strict";
import { parseBusinessConversationInput, parseBusinessMessageInput } from "../lib/business-talk.ts";

const userId = "123e4567-e89b-42d3-a456-426614174000";

test("Business Talk conversation requires unique valid participant IDs", () => {
  assert.deepEqual(parseBusinessConversationInput({ participant_ids: [userId], subject: "Buyer inquiry" }), {
    ok: true, value: { participantIds: [userId], subject: "Buyer inquiry" },
  });
  assert.equal(parseBusinessConversationInput({ participant_ids: [userId, userId] }).ok, false);
  assert.equal(parseBusinessConversationInput({ participant_ids: ["bad"] }).ok, false);
  assert.equal(parseBusinessConversationInput({ participant_ids: [] }).ok, false);
});

test("Business Talk rejects unexpected conversation fields and long subjects", () => {
  assert.equal(parseBusinessConversationInput({ participant_ids: [userId], is_admin: true }).ok, false);
  assert.equal(parseBusinessConversationInput({ participant_ids: [userId], subject: "x".repeat(121) }).ok, false);
});

test("Business Talk message requires idempotency and bounded text", () => {
  assert.deepEqual(parseBusinessMessageInput({ body: " Hello " }, "message-0001"), {
    ok: true, value: { body: "Hello", idempotencyKey: "message-0001" },
  });
  assert.equal(parseBusinessMessageInput({ body: "Hello" }, null).ok, false);
  assert.equal(parseBusinessMessageInput({ body: " " }, "message-0001").ok, false);
  assert.equal(parseBusinessMessageInput({ body: "x".repeat(10001) }, "message-0001").ok, false);
  assert.equal(parseBusinessMessageInput({ body: "Hello", admin: true }, "message-0001").ok, false);
});
