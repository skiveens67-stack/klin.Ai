import test from "node:test";
import assert from "node:assert/strict";
import {
  canTransitionAgentJob,
  isAgentJobLeaseExpired,
  isAgentJobReclaimable,
} from "../lib/agent-job-state.ts";

test("queued jobs can start or be cancelled", () => {
  assert.equal(canTransitionAgentJob("queued", "running"), true);
  assert.equal(canTransitionAgentJob("queued", "cancelled"), true);
  assert.equal(canTransitionAgentJob("queued", "completed"), false);
});

test("paused and failed jobs require an explicit user request to resume", () => {
  assert.equal(canTransitionAgentJob("paused", "queued"), false);
  assert.equal(canTransitionAgentJob("paused", "queued", { userRequestedResume: true }), true);
  assert.equal(canTransitionAgentJob("failed", "queued"), false);
  assert.equal(canTransitionAgentJob("failed", "queued", { userRequestedResume: true }), true);
});

test("terminal jobs cannot be reopened or modified", () => {
  assert.equal(canTransitionAgentJob("completed", "queued", { userRequestedResume: true }), false);
  assert.equal(canTransitionAgentJob("cancelled", "running"), false);
});

test("lease expiry treats missing and invalid timestamps as expired", () => {
  assert.equal(isAgentJobLeaseExpired(null, 1000), true);
  assert.equal(isAgentJobLeaseExpired("not-a-date", 1000), true);
  assert.equal(isAgentJobLeaseExpired("1970-01-01T00:00:02.000Z", 1000), false);
  assert.equal(isAgentJobLeaseExpired("1970-01-01T00:00:01.000Z", 1000), true);
});

test("only queued jobs or running jobs with expired leases can be reclaimed", () => {
  assert.equal(isAgentJobReclaimable("queued", null, 1000), true);
  assert.equal(isAgentJobReclaimable("running", "1970-01-01T00:00:01.000Z", 1000), true);
  assert.equal(isAgentJobReclaimable("running", "1970-01-01T00:00:10.000Z", 1000), false);
  assert.equal(isAgentJobReclaimable("paused", null, 1000), false);
  assert.equal(isAgentJobReclaimable("completed", null, 1000), false);
});
