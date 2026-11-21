import test from "node:test";
import assert from "node:assert/strict";
import { calculateLateAppealRefundSplit, calculateMarketplaceSplit } from "../lib/pricy.ts";

test("marketplace split allocates 15 percent to Klin and 85 percent to seller", () => {
  assert.deepEqual(calculateMarketplaceSplit(10000), {
    grossCents: 10000, klinFeeCents: 1500, recipientCents: 8500, currency: "usd",
  });
});

test("late appeal split allocates 15 percent of awarded refund to Klin", () => {
  assert.deepEqual(calculateLateAppealRefundSplit(2001), {
    grossCents: 2001, klinFeeCents: 300, recipientCents: 1701, currency: "usd",
  });
});

test("rejects fractional cents and negative amounts", () => {
  assert.throws(() => calculateMarketplaceSplit(1.5), RangeError);
  assert.throws(() => calculateLateAppealRefundSplit(-1), RangeError);
});
