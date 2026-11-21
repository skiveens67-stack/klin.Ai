# Klin Stripe Payments and Marketplace Money Flow

**Implementation status:** Stripe subscription checkout exists. Stripe Connect seller onboarding, buyer-to-seller marketplace transfers, payout requests, and a reconciled wallet ledger are not implemented. This document defines the safe target architecture.

## 1. Payments that Klin can collect

Use Klin's existing Stripe platform account for:
- Klin subscriptions and builder subscriptions.
- Build deposits and final invoices.
- AI credits/Gems, hosting, storage, promotions and other Klin-owned digital services.
- Marketplace buyer checkout when Klin is the merchant/platform responsible for the transaction.

Use Stripe Checkout or Payment Element. Cash App Pay and Google Pay can be offered when enabled and supported for the account, currency, customer, device and transaction. They are not guaranteed on every checkout. Affirm/Klarna also depend on Stripe account eligibility, transaction and market rules. The checkout must show only payment methods returned/available for that session.

## 2. User-to-user marketplace transactions

Use Stripe Connect for seller onboarding, identity/business verification, seller payment capabilities, platform fees, transfers and payouts. The correct charge type depends on the commercial relationship:
- Direct charges: the seller is the merchant and owns the customer relationship.
- Destination charges: Klin runs marketplace checkout and transfers the seller's share.
- Separate charges and transfers: use when one buyer payment must be split or when a permitted transfer is delayed until the delivery/review condition is satisfied.

For a standard Klin marketplace sale where Klin controls checkout, use a reviewed Connect destination-charge design. If a sale involves multiple sellers or a delayed release after delivery, assess separate charges and transfers. Do not assume destination charges are an escrow product.

## 3. Proposed revenue split

For an eligible sale:
- Gross customer payment: 100%.
- Klin marketplace fee: proposed 15%.
- Seller proceeds: proposed 85%, less disclosed Stripe fees, refunds, taxes, chargebacks or other agreed adjustments as applicable.

The exact amount, tax handling, refund responsibility, dispute liability and seller terms must be disclosed before checkout. Calculate money in integer minor units (cents), never floating-point arithmetic. Use Stripe's authoritative balance transactions and webhook events for reconciliation.

## 4. Klin Wallet versus "Klin Bank"

A Klin dashboard can display:
- Pending earnings.
- Available earnings.
- Transfers in progress.
- Completed payouts.
- Refunds, reversals and disputes.

These are ledger/reporting views of Stripe Connect activity. They are not bank deposits and do not mean Klin holds customer money in a proprietary bank account.

Do not pool user funds in Klin's ordinary operating bank account or advertise a stored-value "Klin Bank" balance, deposits, withdrawals, escrow, or money transmission without a specifically approved regulated financial structure, legal review, and required provider/financial licenses. Stripe Connect is the preferred route for seller onboarding and payouts because Stripe supplies connected-account onboarding, KYC/AML and payout infrastructure subject to eligibility and its agreement.

A safer product name is **Klin Wallet**: a display of seller earnings and Stripe payout status. Users can request a payout only when Stripe Connect reports that the connected account is eligible and the funds are available. A "deposit" feature should mean paying Klin for a purchase or funding an approved Stripe balance flow—not storing a general-purpose user cash balance.

## 5. User onboarding and withdrawals

1. User selects "Set up seller payouts".
2. Klin creates or retrieves a Stripe Connected Account for that authenticated user.
3. User completes Stripe-hosted or embedded Connect onboarding.
4. Klin verifies account status and required capabilities server-side.
5. Marketplace checkout creates the appropriate Stripe charge.
6. Verified webhook events update a double-entry internal transaction ledger.
7. Refunds, disputes, reversals and seller transfers reconcile against Stripe records.
8. A withdrawal request creates a Stripe Connect payout only when the account and funds are eligible.
9. Klin records the Stripe payout ID and reconciles its final status from webhooks.

Never accept a client-supplied "paid", "available balance", seller identity, or payout-complete flag as authoritative. Use idempotency keys for writes and verify Stripe webhook signatures. Keep connected account IDs and transaction IDs server-side.

## 6. Required implementation before launch

- Stripe Connect platform configuration and agreement acceptance.
- Seller account type and merchant-of-record model approved for Klin's actual business.
- Seller onboarding and capability status routes.
- Destination or separate charge/transfer flow, selected per sale type.
- Signed, idempotent webhook processing for checkout, payment, transfer, payout, refund and dispute events.
- Immutable double-entry ledger and reconciliation job.
- Payout request UI with eligibility and failure handling.
- Tax, refund, chargeback, seller terms, prohibited-goods, sanctions and age/region policies.
- Test-mode end-to-end tests, then owner-approved live-mode configuration.

Do not create Connect accounts, transfer money, enable payouts, or claim "Klin Bank" functionality until these requirements are completed and the account owner explicitly approves the Stripe Connect configuration.
