export const KLIN_MARKETPLACE_FEE_BPS = 1500;
export const KLIN_SELLER_SHARE_BPS = 8500;

export type MoneySplit = {
  grossCents: number;
  klinFeeCents: number;
  recipientCents: number;
  currency: "usd";
};

function assertCents(value: number) {
  if (!Number.isSafeInteger(value) || value < 0) throw new RangeError("Amount must be a non-negative integer number of cents.");
}

/** Calculates the proposed 15% Klin / 85% seller split using integer cents. */
export function calculateMarketplaceSplit(grossCents: number): MoneySplit {
  assertCents(grossCents);
  const klinFeeCents = Math.round(grossCents * KLIN_MARKETPLACE_FEE_BPS / 10000);
  return { grossCents, klinFeeCents, recipientCents: grossCents - klinFeeCents, currency: "usd" };
}

/** Calculates the proposed 15% Klin / 85% buyer allocation for an approved late partial-refund award. */
export function calculateLateAppealRefundSplit(awardedRefundCents: number): MoneySplit {
  assertCents(awardedRefundCents);
  const klinFeeCents = Math.round(awardedRefundCents * KLIN_MARKETPLACE_FEE_BPS / 10000);
  return { grossCents: awardedRefundCents, klinFeeCents, recipientCents: awardedRefundCents - klinFeeCents, currency: "usd" };
}
