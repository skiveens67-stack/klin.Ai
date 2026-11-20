import assert from "node:assert/strict";
import { test } from "node:test";
import { hasTrustedOrigin, readLimitedJson } from "../lib/request-security.ts";

test("readLimitedJson parses a valid object within the byte limit", async () => {
  const request = new Request("https://klin.test/api", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ message: "hello" }),
  });

  const result = await readLimitedJson(request, 1024);
  assert.equal(result.ok, true);
  if (result.ok) assert.deepEqual(result.value, { message: "hello" });
});

test("readLimitedJson rejects malformed JSON", async () => {
  const request = new Request("https://klin.test/api", {
    method: "POST",
    body: "{not-json",
  });

  const result = await readLimitedJson(request, 1024);
  assert.deepEqual(result, {
    ok: false,
    status: 400,
    error: "Invalid JSON request body.",
  });
});

test("readLimitedJson rejects a declared oversized body before parsing", async () => {
  const request = new Request("https://klin.test/api", {
    method: "POST",
    headers: { "content-length": "4097" },
    body: "{}",
  });

  const result = await readLimitedJson(request, 4096);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.status, 413);
});

test("readLimitedJson rejects oversized streamed bodies", async () => {
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode("123456789"));
      controller.close();
    },
  });
  const request = new Request("https://klin.test/api", {
    method: "POST",
    body: stream,
    duplex: "half",
  });

  const result = await readLimitedJson(request, 8);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.status, 413);
});

test("readLimitedJson rejects requests without a body", async () => {
  const request = new Request("https://klin.test/api", { method: "GET" });
  const result = await readLimitedJson(request, 1024);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.status, 400);
});

test("hasTrustedOrigin accepts only the exact request origin", () => {
  assert.equal(
    hasTrustedOrigin(new Request("https://klin.test/api", { headers: { origin: "https://klin.test" } })),
    true,
  );
  assert.equal(
    hasTrustedOrigin(new Request("https://klin.test/api", { headers: { origin: "https://attacker.test" } })),
    false,
  );
  assert.equal(hasTrustedOrigin(new Request("https://klin.test/api")), false);
});
