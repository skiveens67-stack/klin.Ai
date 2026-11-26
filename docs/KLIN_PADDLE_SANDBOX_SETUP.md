# Klin Paddle Sandbox Integration

## Scope

This branch adds Paddle as a separate sandbox checkout option. Existing Stripe checkout remains unchanged. No live Paddle token is accepted by the sandbox route, and no Paddle API key is exposed to the browser.

## Vercel environment variables

Set these on the `klin-ai-preview` project:

- `next_public_paddle_client_token`: the Paddle **sandbox client-side token**. It must start with `test_`. This value is safe for frontend checkout use, but this implementation reads it server-side and returns it only to a signed-in, email-verified user.
- `PADDLE_WEBHOOK_SECRET`: the secret generated for the Paddle sandbox notification destination. Keep this server-only. Do not use a Paddle API key as the webhook secret.

The checkout config endpoint deliberately returns HTTP 503 unless the client token starts with `test_`.

## Paddle notification destination

Create a notification destination in the Paddle **sandbox** dashboard and point it to:

`https://<your-klin-ai-preview-domain>/api/webhooks/paddle`

Subscribe to these subscription events:

- `subscription.created`
- `subscription.updated`
- `subscription.activated`
- `subscription.trialing`
- `subscription.past_due`
- `subscription.paused`
- `subscription.resumed`
- `subscription.canceled`

Copy that destination's endpoint secret key into `PADDLE_WEBHOOK_SECRET` in Vercel Preview. Do not paste the secret into chat or commit it to Git.

## Checkout behavior

- The Paddle buttons use the supplied `pri_...` price IDs.
- Checkout custom data includes the authenticated Klin user ID and plan code so the signed webhook can associate the subscription with the account.
- The webhook verifies the `Paddle-Signature` header against the raw request body, applies a five-second timestamp tolerance, and records event IDs idempotently in `payment_events`.
- Verified subscription events are upserted into the existing `subscriptions` table with provider `paddle`.
- A successful browser checkout is not itself proof of payment or entitlement. The server-side webhook is authoritative.
- Keep this integration in sandbox until end-to-end webhook delivery, database persistence, plan entitlements, cancellations, and renewals have been tested. Do not switch to a live token as part of this change.

## Price mapping

The frontend uses only Paddle price IDs. Product IDs are not required to open checkout. The configured prices map to the existing Klin membership and Builder plan codes in `components/billing/PaddleSandboxCheckout.tsx`.
