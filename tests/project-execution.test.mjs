import assert from "node:assert/strict";
import { test } from "node:test";
import {
  BILLING_BLOCK_SECONDS,
  PAYMENT_WINDOW_SECONDS,
  getNextProgressCheckpoint,
  getRequiredBillingBlock,
  getPaymentWindowState,
  isWorkerLeaseExpired,
} from "../lib/project-execution.ts";

test("progress checkpoints can be configured from 5% through 20%", () => {
  assert.equal(getNextProgressCheckpoint(0, 5), 5);
  assert.equal(getNextProgressCheckpoint(12, 5), 15);
  assert.equal(getNextProgressCheckpoint(20, 20), 40);
  assert.equal(getNextProgressCheckpoint(96, 10), 100);
  assert.equal(getNextProgressCheckpoint(100, 10), null);
});

test("checkpoint intervals outside 5%-20% are rejected", () => {
  assert.throws(() => getNextProgressCheckpoint(0, 4), RangeError);
  assert.throws(() => getNextProgressCheckpoint(0, 21), RangeError);
});

test("a payment block becomes due only after ten active billable hours", () => {
  assert.equal(getRequiredBillingBlock(BILLING_BLOCK_SECONDS - 1, 0), null);
  assert.deepEqual(getRequiredBillingBlock(BILLING_BLOCK_SECONDS, 0), {
    block_number: 1,
    due_at_active_seconds: BILLING_BLOCK_SECONDS,
  });
  assert.deepEqual(getRequiredBillingBlock(BILLING_BLOCK_SECONDS * 2, 1), {
    block_number: 2,
    due_at_active_seconds: BILLING_BLOCK_SECONDS * 2,
  });
});

test("payment confirmation resumes; expiry pauses without payment", () => {
  const deadline = 50_000;
  assert.equal(getPaymentWindowState(deadline, deadline - 1, false), "payment_due");
  assert.equal(getPaymentWindowState(deadline, deadline, false), "pause");
  assert.equal(getPaymentWindowState(deadline, deadline + PAYMENT_WINDOW_SECONDS, true), "resume");
});

test("expired worker leases must stop work and require checkpoint recovery", () => {
  assert.equal(isWorkerLeaseExpired(100, 99), false);
  assert.equal(isWorkerLeaseExpired(100, 100), true);
  assert.equal(isWorkerLeaseExpired(null, 100), true);
});
