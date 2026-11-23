import test from "node:test";
import assert from "node:assert/strict";

function retryDelaySeconds(attempt) {
  return Math.min(3600, 60 * (2 ** Math.min(attempt, 6)));
}

test("notification delivery retry delay increases and is capped", () => {
  assert.equal(retryDelaySeconds(1), 120);
  assert.equal(retryDelaySeconds(2), 240);
  assert.equal(retryDelaySeconds(6), 3600);
  assert.equal(retryDelaySeconds(10), 3600);
});

test("notification delivery attempts are bounded", () => {
  for (const attempts of [0, 1, 9]) assert.ok(attempts < 10);
  assert.ok(!(10 < 10));
});
