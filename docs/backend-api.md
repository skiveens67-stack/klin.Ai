# Klin Backend API Contracts

Base URL: the same origin as the Klin web application. All account routes use the signed-in Supabase session cookie. Authenticated responses are marked `Cache-Control: no-store`. Mutating browser routes reject a mismatched Origin header.

## Identity and account
- `GET /api/health` — public liveness.
- `GET /api/account/me` — current user's own profile.
- `PATCH /api/account/me` — update allowlisted profile fields only: full_name, username, display_name, avatar_url, bio.
- `GET /api/account/referrals` — current user's referral activity; no referred users' private details.

Email, phone, verification timestamps, account activation, waitlist position, and referral identifiers cannot be edited through the profile API.

## Family and trusted circle
- `GET|POST /api/family` — read/create the account's family. One family per owner.
- `POST /api/family/profiles` — create a managed family profile. Database limit: five managed profiles.
- `GET|POST /api/trusted-contacts` — list/add trusted contacts. Contact destinations are encrypted server-side and the ciphertext column is not selectable by authenticated clients.
- `DELETE /api/trusted-contacts/:contactId` — remove a trusted contact.
- `GET|PUT /api/communications/rules` — read/save channel permission tiers.
- `GET|POST /api/communications/actions` — create/list scheduled actions. New actions require approval.
- `PATCH /api/communications/actions/:actionId` — approve or cancel a pending action.
- `GET|POST /api/checkins` — create/list check-in schedules.
- `POST /api/checkins/:checkinId/confirm` — confirm a check-in.

Important: permission settings and approved actions are stored, but no external SMS, email, WhatsApp, Discord, Slack, phone, or emergency-escalation worker is enabled yet. Approval does not send a message by itself.

## Klinie conversation data
- `GET|POST /api/conversations` — list/create private conversations.
- `GET /api/conversations/:conversationId` — retrieve the current user's conversation and messages.
- `POST /api/conversations/:conversationId/messages` — persist a user message.

Conversation persistence is implemented. Model inference, streaming responses, provider selection, and AI worker execution still require provider credentials and an approved runtime configuration; the API does not fabricate an assistant answer.

## Gems, subscriptions, and payments
- `GET /api/wallet` — current Gems balance and recent immutable ledger entries.
- `GET /api/subscriptions` — current user's subscription records.
- `POST /api/billing/checkout` — create a subscription Checkout Session for an allowlisted plan code: galaxy, studio_pro, ultimate.
- `POST /api/billing/gems-checkout` — create a one-time Gems Checkout Session for an allowlisted pack code.
- `POST /api/webhooks/stripe` — verify Stripe signature, deduplicate events, sync subscriptions, and credit Gems only after a paid checkout is verified.

The wallet ledger is server-write-only. `post_wallet_transaction` is atomic, locks the wallet row, prevents negative balances, and uses a per-user idempotency key. Never credit Gems from a browser response or redirect.

Required server-only environment variables:
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_GALAXY`, `STRIPE_PRICE_STUDIO_PRO`, `STRIPE_PRICE_ULTIMATE`
- `STRIPE_PRICE_GEMS_1000`, `STRIPE_PRICE_GEMS_5000`, `STRIPE_PRICE_GEMS_10000`
- `KLIN_GEMS_AMOUNT_1000`, `KLIN_GEMS_AMOUNT_5000`, `KLIN_GEMS_AMOUNT_10000`
- `SUPABASE_SERVICE_ROLE_KEY` (server only; never add a NEXT_PUBLIC_ prefix)

No Klin Stripe account credentials were available during implementation. Checkout and webhook routes fail closed until the Klin account's own keys, price IDs, and webhook secret are configured. Do not use credentials from Kai.AI or another Stripe account.

## AI usage, notifications, and integrations
- `GET /api/usage?since=<ISO date>` — current user's AI usage aggregates and events.
- `GET /api/notifications` — list notifications.
- `PATCH /api/notifications` — mark one or all notifications read.
- `connected_integrations` stores provider metadata and secret references only; OAuth tokens must remain in a secure secret store.
- `integration_jobs` is a service-only queue. Provider workers and OAuth callback handlers remain to be connected.

## Projects, social, marketplace, and learning
- `GET|POST /api/projects` — list visible projects/create a private draft.
- `GET|POST /api/marketplace/listings` — view eligible listings/create a draft listing.
- `GET|POST /api/marketplace/bids` — view eligible bids/place a bid on an active auction.
- `GET|POST /api/social/posts` — view eligible posts/create a draft post.
- `GET|PUT /api/learning/progress` — read/update the current user's progress.
- `GET /api/media/assets` — list private media metadata.
- `POST /api/media/upload-url` — create a signed upload URL for the private `klin-user-assets` bucket (100 MB per file).
- `POST /api/media/assets/:assetId/confirm` — verify that the uploaded object exists and mark it uploaded.

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

## Required next integrations
1. Configure Klin's own Stripe keys, product/price IDs, webhook endpoint, and Supabase service-role key in Vercel.
2. Configure a 32-byte base64 `KLIN_CONTACT_ENCRYPTION_KEY`.
3. Select and configure Klinie's model provider(s), API keys, streaming runtime, and usage accounting.
4. Connect communication OAuth/SMS/voice/calendar providers and background workers.
5. Build moderation/review workers before enabling public content.
6. Build the authenticated device gateway and firmware safety controls before enabling hardware commands.
7. Complete runtime tests with verified test accounts and Stripe test-mode events before merging to production.
