# Klin Backend API Contracts

Base URL: the same origin as the Klin web application. All account routes use the signed-in Supabase session cookie. Authenticated responses are marked `Cache-Control: no-store`. Mutating browser routes require an Origin header that exactly matches the request origin; missing or mismatched origins are rejected.

## Identity and account
- `GET /api/health` — public liveness.
- `GET /api/account/me` — canonical current-user profile endpoint.
- `PATCH /api/account/me` — canonical profile update endpoint; allowlisted fields only: full_name, username, display_name, avatar_url, bio.
- `GET /api/me` and `PATCH /api/me` — compatibility aliases to the same secured handlers and response contract.
- `GET /api/account/referrals` — current user's referral activity; no referred users' private details.

Email, phone, verification timestamps, account activation, waitlist position, and referral identifiers cannot be edited through the profile API.

## Family and trusted circle
- `GET|POST /api/family` — read/create the account's family. One family per owner.
- `POST /api/family/profiles` — create a managed family profile. Database limit: five managed profiles.\n- `PATCH|DELETE /api/family/members/:memberId` — family owners can update a member's role and allowlisted feature permissions, or remove a non-owner member. The owner role cannot be changed or removed.
- `GET|POST /api/trusted-contacts` — list/add trusted contacts. Contact destinations are encrypted server-side and the ciphertext column is not selectable by authenticated clients.
- `DELETE /api/trusted-contacts/:contactId` — remove a trusted contact.
- `GET|PUT /api/communications/rules` — read/save channel permission tiers.
- `GET|POST /api/communications/actions` — create/list scheduled actions. New actions require approval.
- `PATCH /api/communications/actions/:actionId` — approve or cancel a pending action.
- `GET|POST /api/checkins` — create/list check-in schedules.
- `POST /api/checkins/:checkinId/confirm` — confirm a check-in.

Important: permission settings and approved actions are stored, but no external SMS, email, WhatsApp, Discord, Slack, phone, or emergency-escalation worker is enabled yet. Approval does not send a message by itself.

## Klinie conversation data
- `GET|POST /api/conversations` — list/create private conversations. GET accepts `?archived=false` (default), `?archived=true`, or `?archived=all`.
- `GET /api/conversations/:conversationId` — retrieve the current user's conversation and messages, including archived conversations.
- `PATCH /api/conversations/:conversationId` — rename a conversation (`title`) and/or archive or restore it (`archived: true|false`). Only the owning account can update it; unknown fields are rejected.
- `POST /api/conversations/:conversationId/messages` — persist a user message (maximum 20,000 characters; 80 KiB request-body cap), update the conversation's activity timestamp, and create an initial title from the first message when the title is still `New conversation`. Conversation create/update bodies are capped at 4 KiB.

Conversation persistence is implemented. Model inference, streaming responses, provider selection, and AI worker execution still require provider credentials and an approved runtime configuration; the API does not fabricate an assistant answer.

## Gems, subscriptions, and payments
- `GET /api/wallet` — current Gems balance and recent immutable ledger entries.
- `GET /api/subscriptions` — current user's subscription records.
- `POST /api/billing/checkout` — create a subscription Checkout Session for an allowlisted plan code: galaxy, studio_pro, ultimate.
- `POST /api/stripe/checkout` — compatibility alias to the same secured handler. It accepts `plan_code` only; never send a client-controlled Stripe `priceId`.
- `POST /api/billing/gems-checkout` — create a one-time Gems Checkout Session for an allowlisted pack code.
- `POST /api/webhooks/stripe` — verify the raw Stripe signature (request body capped at 1 MiB), deduplicate events, sync subscriptions, and credit Gems only after a paid checkout is verified.

The wallet ledger is server-write-only. `post_wallet_transaction` is atomic, locks the wallet row, prevents negative balances, and uses a per-user idempotency key. Never credit Gems from a browser response or redirect.

Required server-only environment variables:
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_GALAXY`, `STRIPE_PRICE_STUDIO_PRO`, `STRIPE_PRICE_ULTIMATE`
- `STRIPE_PRICE_BUILDER_STARTER`, `STRIPE_PRICE_BUILDER_PRO`, `STRIPE_PRICE_BUILDER_BUSINESS`
- `STRIPE_PRICE_GEMS_1000`, `STRIPE_PRICE_GEMS_5000`, `STRIPE_PRICE_GEMS_10000`
- `KLIN_GEMS_AMOUNT_1000`, `KLIN_GEMS_AMOUNT_5000`, `KLIN_GEMS_AMOUNT_10000`
- `SUPABASE_SERVICE_ROLE_KEY` (server only; never add a NEXT_PUBLIC_ prefix)

The connected Stripe account verified for this project is named `Klin.ai` and is currently in test mode. A read-only inspection returned zero products, zero prices, and zero webhook endpoints. Checkout and webhook routes therefore remain fail-closed until the `Klin.ai` account's own server-side keys, approved price IDs, and webhook secret are configured. Do not use credentials from the separate account named `Klin` or from Kai.AI.

## Business Talk
- `GET|POST /api/business/conversations` — list conversations for the signed-in participant or create a private conversation with 1–10 other account IDs.
- `GET|POST /api/business/conversations/:conversationId/messages` — list messages for an active participant or create an idempotent message (1–10,000 characters).
- Business Talk is separate from Klinie's AI conversations. Membership checks are enforced on every read/write. A pending schema draft is in `docs/sql/medium_features_pending_reconciliation.sql`; these routes fail closed until that schema is reconciled and approved.
- New messages enqueue in-app/email notifications according to per-category preferences when the required tables are present.

## AI usage, notifications, and integrations
- `GET /api/usage?since=<ISO date>` — current user's AI usage aggregates and events. Successful assistant replies now record gateway token counts server-side when the provider supplies them. Gateway cost is explicitly reported as unavailable unless a verified cost field is added; the database's required numeric zero is not presented as proof of free usage.
- `GET /api/notifications` — list notifications.
- `PATCH /api/notifications` — mark one or all notifications read.
- `GET|PUT /api/notifications/preferences` — read/update per-category in-app and email preferences.
- `POST /api/internal/notifications/dispatch` — worker-secret-protected Resend email delivery, with bounded retries and service-role-only queue access.
- Notification preference and delivery tables are defined in the pending schema draft; email delivery also requires `KLIN_WORKER_SECRET`, `KLIN_NOTIFICATION_FROM_EMAIL`, `RESEND_API_KEY`, and the Supabase service-role key.
- `connected_integrations` stores provider metadata and secret references only; OAuth tokens must remain in a secure secret store.
- `integration_jobs` is a service-only queue. Provider-specific OAuth callbacks, refresh-token storage, and sync workers remain unconnected; no provider is represented as connected merely because its catalog entry exists.

## Projects, social, marketplace, and learning
- `GET|POST /api/projects` — list visible projects/create a private draft.
- `GET|POST /api/marketplace/listings` — view eligible listings/create a draft listing.
- `GET|POST /api/marketplace/bids` — view eligible bids/place a bid on an active auction.
- `GET|POST /api/social/posts` — view eligible posts/create a draft post.
- `PATCH /api/social/posts/:postId` — edit an owned social post only while it remains a draft. The endpoint validates body and visibility, rejects owner/status changes, and cannot publish a post.
- `GET|PUT /api/learning/progress` — read/update the current user's progress.
- `GET /api/media/assets` — list private media metadata.
- `POST /api/media/upload-url` — create a signed upload URL for the private `klin-user-assets` bucket (100 MB per file).
- `POST /api/media/assets/:assetId/confirm` — verify that the uploaded object exists and that its stored size and content type match the registered asset before marking it uploaded.

Public publishing and listing activation are intentionally blocked pending moderation. Marketplace orders, payouts, Stripe Connect, and charity disbursements are not enabled. The schema records the proposed 85/10/5 distribution, but actual payout logic requires legal/compliance review and a dedicated Connect account.

## Devices
- `GET|POST /api/devices` — list/register devices.
- `POST /api/devices/:deviceId/commands` — record a command request for an online device. Every command requires confirmation and expires after two minutes.

The command route only records requests; it does not actuate hardware. Thangie rover commands are capped at 1.5 mph in the API and database. Firmware must independently enforce the same limit, emergency stop, and safe halt on connectivity loss.

## Data access and security
- User-owned records use Supabase RLS.
- Payment events, integration jobs, audit logs, ledger writes, and device telemetry are server-only.
- Trusted contact destinations are encrypted using AES-256-GCM and cannot be selected directly by authenticated clients.
- Social posts and creator projects are drafts until a moderation service approves publication.
- No service-role key or Stripe secret is shipped to browser code.
- Mutating JSON API routes use route-specific request-body byte limits before JSON parsing.

## Required next integrations
1. Reconcile the 16 live Supabase migrations against exact source SQL, then independently review the pending Business Talk and notification schema before applying it.
2. Configure Klin's own Stripe keys, product/price IDs, webhook endpoint, and Supabase service-role key in Vercel.
3. Configure a 32-byte base64 `KLIN_CONTACT_ENCRYPTION_KEY`.
4. Select and configure Klinie's model provider(s), API keys, streaming runtime, and usage accounting.
5. Select approved OAuth/SMS/voice/calendar providers, register their OAuth apps, and configure provider credentials and workers.
6. Build moderation/review workers before enabling public content.
7. Build the authenticated device gateway and firmware safety controls before enabling hardware commands.
8. Complete runtime tests with verified test accounts and Stripe test-mode events before merging to production.


## Autonomous Builder
- `GET /api/agents/limits` — reads the signed-in user's active builder subscription and reports the plan's agent limit. It does not start or enforce agents.
- `POST /api/projects/estimate` — returns an authenticated quote estimate, verified builder plan, agent limit and eligible Pro/Business discount.
- `POST /api/builder/quotes` — recalculates scope, verifies active plan/duration, computes deposit and final-balance ranges server-side, and saves a private draft quote in the existing project metadata.
- `POST /api/billing/checkout` accepts the allowlisted builder subscription codes `builder_starter`, `builder_pro`, and `builder_business` in addition to the existing membership codes. Checkout fails closed when the matching Klin Stripe price ID is not configured.
- Builder subscription price IDs must be configured as server-only environment variables. Do not create live products/prices or use another Stripe account without explicit owner approval.
- The quote UI applies the $20 / 15% deposit arithmetic, but deposit checkout, build authorization, agent orchestration, worker pause/resume, generated-project QA and pay-to-publish are not implemented.


## Klin specialist modules
- `GET /api/agents/limits` — returns the signed-in user's active builder plan and agent capacity.
- `POST /api/agents/run` — runs one authenticated specialist module request. The Builder role requires a project owned by the user with a Stripe-webhook-verified deposit; other specialist roles can run without a build deposit. Allowed roles: tester, builder, animator, calculator, helper, safety. Allowed levels: v1–v7. Initial verified-plan ceilings: Free V1, Starter V3, Pro V5, Business V7. V1 uses `KLINIE_MODEL`; V2–V7 require `KLIN_MODULE_V2_MODEL` through `KLIN_MODULE_V7_MODEL`. All model IDs are server-only Vercel AI Gateway configuration.
- The V7 request adds a stricter safety instruction set. A module request returns text only; it cannot modify files or call external integrations.
- The Klin Modules UI stores cloned module profiles and a pending retry task in browser local storage. If the browser goes offline it aborts the active request where possible and marks the task paused; the user must press Continue after reconnecting to retry.
- Local module profiles and client-side plan limits are not a substitute for server-side concurrent worker admission. The persistent agent scheduler is not yet connected.
- Marketplace seller payouts are a separate Stripe Connect integration. See `docs/KLIN_STRIPE_MARKETPLACE_PAYMENTS.md`; no Klin-held stored-value balance or escrow is enabled.


The current module execution endpoint returns a specialist model response only. It does not create a durable build job, write project source files, launch parallel workers, or guarantee that an upstream model provider stops immediately when a client disconnects. Use the local Continue control to retry an interrupted short request; long builds require the future durable job runtime.


## Builder deposit checkout
- `POST /api/builder/quotes/deposit` — accepts a private project ID, verifies project ownership and the saved quote server-side, computes the deposit from the stored high estimate, and creates a one-time Stripe Checkout Session. The client cannot choose the amount.
- Stripe idempotency is scoped to the authenticated user, project and quote version. An open Checkout Session is reused. Expired or asynchronously failed sessions increment a quote-scoped attempt counter; completed sessions wait for the signed success/failure webhook before another attempt.
- The signed Stripe webhook handles `checkout.session.completed` and `checkout.session.async_payment_succeeded` for `purchase_type=builder_deposit`, verifies user/project ownership, quote version, currency and exact paid amount, then marks the quote deposit as paid in project metadata. Signed async-failure and expiry events clear the matching session and allow a new attempt without reusing the old Stripe idempotency key.
- A checkout redirect is not proof of payment. A verified webhook is required. The deposit is credited at 100% toward the eventual final invoice.
- Deposit payment does not start a build because the durable builder runtime is not connected. Final invoice collection and pay-to-publish remain pending.


- `POST /api/agents/team-run` — launches a bounded parallel batch of enabled specialist module requests. The server verifies the active builder plan, batch size and each worker's maximum allowed model level. If the Builder role is included, it also requires a project owned by the user with a Stripe-webhook-verified paid deposit.
- Team results return per-worker status, model ID and token usage. Each worker is an independent model request; duplicated profiles of the same role can run in the same batch.
- Team execution is request-scoped and bounded to one Vercel function invocation. It is not a durable background job, does not edit files or package a product, and does not enforce a global per-user concurrency lock across separate browser sessions.


**Abuse-control limitation:** Module endpoints cap tokens per worker and enforce the verified plan limit within each team batch, but a durable per-user rate limit, daily usage quota and global concurrency lock across separate browser sessions are not implemented yet. Set AI Gateway account spending limits before enabling module execution for public users.


## Creator project draft management
- `PATCH /api/projects/:projectId` — update an owned project draft's title, description, visibility, or draft/archive status.
- The endpoint accepts only allowlisted fields, trims text, enforces title/description limits, and rejects attempts to set public visibility or published status while moderation and public publishing remain disabled.
- Project ownership is enforced in the update query. The route does not change project type, owner, content reference, published timestamp, or listing/payment state.
