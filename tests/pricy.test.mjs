import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateInstallmentSchedule,
  calculateLateAppealRefundSplit,
  calculateMarketplaceSplit,
  calculateQuoteTotal,
} from "../lib/pricy.ts";

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

test("quote totals use supplied prices and do not invent a tax rate", () => {
  const result = calculateQuoteTotal([
    { description: "Design", quantity: 2, unitPriceCents: 1250 },
    { description: "Build", quantity: 1, unitPriceCents: 5000 },
  ]);
  assert.equal(result.subtotalCents, 7500);
  assert.equal(result.taxCents, null);
  assert.equal(result.totalCents, 7500);
  assert.deepEqual(result.lineItems.map((item) => item.lineTotalCents), [2500, 5000]);
});

test("quote discounts and explicitly supplied tax rates use basis points", () => {
  const result = calculateQuoteTotal(
    [{ description: "Work", quantity: 1, unitPriceCents: 10001 }],
    { discountBps: 1000, taxBps: 825 },
  );
  assert.equal(result.discountCents, 1000);
  assert.equal(result.taxableCents, 9001);
  assert.equal(result.taxCents, 743);
  assert.equal(result.totalCents, 9744);
});

test("rejects invalid quote inputs and arithmetic overflow", () => {
  assert.throws(() => calculateQuoteTotal([{ description: "x", quantity: 0, unitPriceCents: 100 }]), RangeError);
  assert.throws(() => calculateQuoteTotal([{ description: "x", quantity: 1, unitPriceCents: 100 }], { taxBps: 10001 }), RangeError);
  assert.throws(() => calculateQuoteTotal([{ description: "x", quantity: 2, unitPriceCents: Number.MAX_SAFE_INTEGER }]), RangeError);
});

test("installment schedule distributes remainder cents without losing value", () => {
  const schedule = calculateInstallmentSchedule(10001, 3);
  assert.deepEqual(schedule, [
    { paymentNumber: 1, amountCents: 3334 },
    { paymentNumber: 2, amountCents: 3334 },
    { paymentNumber: 3, amountCents: 3333 },
  ]);
  assert.equal(schedule.reduce((sum, payment) => sum + payment.amountCents, 0), 10001);
});

test("rejects invalid installment counts", () => {
  assert.throws(() => calculateInstallmentSchedule(1000, 0), RangeError);
  assert.throws(() => calculateInstallmentSchedule(1000, 37), RangeError);
});
