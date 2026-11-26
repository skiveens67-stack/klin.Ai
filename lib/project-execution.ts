export const BILLING_BLOCK_SECONDS = 10 * 60 * 60;
export const PAYMENT_WINDOW_SECONDS = 30 * 60;
export const MIN_PROGRESS_CHECKPOINT_PERCENT = 5;
export const MAX_PROGRESS_CHECKPOINT_PERCENT = 20;
export const DEFAULT_PROGRESS_CHECKPOINT_PERCENT = 10;
export const MAX_PROJECT_BUILD_DAYS = 10;
export const HEAVY_PROJECT_TARGET_DAYS = 7;

export type PaymentWindowState = "payment_due" | "resume" | "pause";

export function getNextProgressCheckpoint(
  currentProgress: number,
  intervalPercent = DEFAULT_PROGRESS_CHECKPOINT_PERCENT,
): number | null {
  if (!Number.isFinite(currentProgress) || currentProgress < 0 || currentProgress > 100) {
    throw new RangeError("Progress must be between 0 and 100.");
  }
  if (!Number.isInteger(intervalPercent) || intervalPercent < MIN_PROGRESS_CHECKPOINT_PERCENT || intervalPercent > MAX_PROGRESS_CHECKPOINT_PERCENT) {
    throw new RangeError("Checkpoint interval must be a whole number from 5 to 20 percent.");
  }
  if (currentProgress >= 100) return null;
  return Math.min(100, (Math.floor(currentProgress / intervalPercent) + 1) * intervalPercent);
}

export function getRequiredBillingBlock(
  activeBillableSeconds: number,
  paidBlockCount: number,
): { block_number: number; due_at_active_seconds: number } | null {
  if (!Number.isSafeInteger(activeBillableSeconds) || activeBillableSeconds < 0) {
    throw new RangeError("Billable active seconds must be a non-negative safe integer.");
  }
  if (!Number.isSafeInteger(paidBlockCount) || paidBlockCount < 0) {
    throw new RangeError("Paid block count must be a non-negative safe integer.");
  }
  const nextBlock = paidBlockCount + 1;
  const dueAt = nextBlock * BILLING_BLOCK_SECONDS;
  return activeBillableSeconds >= dueAt
    ? { block_number: nextBlock, due_at_active_seconds: dueAt }
    : null;
}

export function getPaymentWindowState(
  deadlineEpochSeconds: number,
  nowEpochSeconds: number,
  paymentConfirmed: boolean,
): PaymentWindowState {
  if (!Number.isFinite(deadlineEpochSeconds) || !Number.isFinite(nowEpochSeconds)) {
    throw new RangeError("Payment deadline and current time must be valid timestamps.");
  }
  if (paymentConfirmed) return "resume";
  return nowEpochSeconds >= deadlineEpochSeconds ? "pause" : "payment_due";
}

export function isWorkerLeaseExpired(
  leaseExpiresAtEpochSeconds: number | null,
  nowEpochSeconds: number,
): boolean {
  if (leaseExpiresAtEpochSeconds === null) return true;
  if (!Number.isFinite(leaseExpiresAtEpochSeconds) || !Number.isFinite(nowEpochSeconds)) {
    throw new RangeError("Lease timestamps must be valid.");
  }
  return nowEpochSeconds >= leaseExpiresAtEpochSeconds;
}
