# Klin Medium Stage — Completion and Launch Gates

Branch: `chatgpt/backend-foundation`

This document distinguishes code implemented on the backend branch from services that are not yet configured, approved, or safe to activate. A route or schema draft is not proof that the production feature is operational.

## Implemented in the backend branch

- Family account foundations, managed profiles, member permissions, invitations, trusted contacts, communication rules, check-in schedules, and explicit approval/cancel records.
- Separate Business Talk conversation and message APIs with active-member checks, bounded message sizes, and idempotent message writes.
- Notification inbox read state, per-category in-app/email preference API, preference-aware notification creation, and a worker-secret-protected Resend email delivery worker with bounded retries and opt-out rechecks.
- Integration connection metadata API and idempotent sync-job request queue API.
- Creator project private draft create/edit, quote estimation, deposit verification gates, and private version snapshot/restore APIs.
- Social and marketplace draft creation/editing, moderation submission and restricted review APIs, and buyer/seller marketplace order-history API.
- Auction bid API with idempotency checks.
- Initial AI Foundations, Web Development Basics, and Creator Business Basics courses, with per-user learning progress APIs.
- Device registration and command-request recording with confirmation and expiry checks; the API does not actuate hardware.
- Subscription, Gems wallet, Stripe webhook, usage metering, and server-side agent entitlement foundations.

## Still blocked before full Medium launch

1. **Supabase schema:** The live migration history has not been reconciled against exact source SQL. New Business Talk, notification preference/delivery, moderation queue, and project version objects are only in `docs/sql/medium_features_pending_reconciliation.sql`. Do not apply until the historical migration audit and independent review are complete.
2. **Business Talk live activation:** Requires the approved schema, verified account lookup/invitation policy, abuse reporting/blocking controls, and runtime tests.
3. **Notification delivery:** Email worker requires `KLIN_WORKER_SECRET`, `KLIN_NOTIFICATION_FROM_EMAIL`, `RESEND_API_KEY`, and the Supabase service-role key in the intended runtime. No SMS, WhatsApp, phone, or push delivery is claimed.
4. **OAuth integrations:** Provider OAuth apps, callback URLs, encrypted token storage/rotation, and provider-specific workers are not configured. Sync requests remain queued until a matching worker exists.
5. **Moderation:** Submission/review backend is present, but moderator operations, evidence handling, appeal workflows, and independent safety testing must be completed before public publishing or marketplace listing activation.
6. **Marketplace payments:** Buyer checkout, seller onboarding, Connect transfers, payouts, refunds, disputes, and double-entry reconciliation are not enabled. The order-history API is read-only. Stripe Connect is not escrow.
7. **Business Exchange escrow:** Keep the product concept, but do not accept or hold escrow funds until the legal/compliance structure, merchant-of-record model, provider capabilities, custody/segregation, refund/dispute rules, and licensed partners are approved.
8. **Builder runtime:** Quotes, deposit verification, and version snapshots are foundations only. Durable autonomous build workers, checkpoints during execution, recovery, artifact packaging, QA gates, and final invoice settlement belong to the next implementation stage.
9. **Devices:** No hardware command is sent by the current API. Device identity provisioning, signed gateway, replay protection, telemetry, emergency stop, safe-state firmware, and physical testing are required before actuation.
10. **Billing reconciliation:** Subscription webhook ingestion and wallet ledger foundations exist, but end-to-end reconciliation against the actual Klin Stripe account, products/prices, webhook configuration, refund/dispute cases, and test transactions remains unverified. Live payments remain disabled until explicitly approved.

## Release rule

Medium is not marked production-complete until the pending schema is reconciled and approved, provider credentials and workers are configured, required tests pass, and each launch gate above has an owner-approved verification record. No production migration, deployment, live payment, Connect account creation, payout, escrow, or hardware actuation is authorized by this document.
