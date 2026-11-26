# Klin internal AI team: Klinie, Xzello and Pricy

**Status:** Product architecture and guarded application hooks added to the backend branch. Provider model IDs, inbound feedback email, database migration, and payment operations still require configuration and verification.

## Agent responsibilities

- **Klinie** is the customer-facing lead. It gathers requirements, plans work, writes code, coordinates agents, explains decisions and presents results.
- **Xzello** is a private creative and operations specialist. It supports image and animation direction, visual design, layouts, branding, business listing quality, appeal evidence summaries and recommendations. It does not independently issue refunds, release funds, suspend accounts or make final binding appeal decisions.
- **Pricy** is a private pricing and payment-planning specialist. It helps calculate project quotes, cost assumptions, payment plans and marketplace splits. Customers cannot chat with Pricy directly. Pricy cannot initiate Stripe writes or access account credentials.
- **Klin Tester** independently tests deliverables and reports reproducible failures.

## Private agent execution

The chat API may consult Xzello and Pricy server-side when a request matches their domain. Their notes are passed privately to Klinie's system context; their names and internal notes are not returned as separate customer messages. If the optional model environment variables are absent or a provider fails, Klinie's normal reply continues without the consultation.

Configure only server-side:
- `XZELLO_MODEL`: AI Gateway model ID for Xzello text reasoning.
- `PRICY_MODEL`: AI Gateway model ID for Pricy pricing reasoning.
- `XZELLO_IMAGE_MODEL`: image model ID used by the Creative Studio image route.
- Existing `KLINIE_MODEL`: customer-facing Klinie model.
- Existing `AI_GATEWAY_API_KEY` or Vercel OIDC: server-side gateway authentication.

## Xzello model catalogue

The product catalogue reserves model names for the owner's intended lineup. These are names, not proof that provider models exist:
- Regular VX1–VX6: `XZELLO_VX1_MODEL` through `XZELLO_VX6_MODEL`.
- Ultra VX1–VX6: `XZELLO_ULTRA_VX1_MODEL` through `XZELLO_ULTRA_VX6_MODEL`.
- Mega VX1–VX6: `XZELLO_MEGA_VX1_MODEL` through `XZELLO_MEGA_VX6_MODEL`.
- Named variants: `XZELLO_ULTRA_X1_MODEL`, `XZELLO_ULTRA_SMART_1_MODEL`, `XZELLO_ULTRA_X1_MIXED_MODEL`, and `XZELLO_ULTRA_SMART_VX6_MODEL`.

Each environment variable must point to a real model supported by the configured provider. Do not invent model IDs or silently map these labels to unrelated models.

## Pricy calculation policy

The currently specified marketplace split is 15% Klin / 85% seller before separately disclosed provider fees, taxes, refunds or chargebacks. The late partial-refund proposal is 15% Klin / 85% buyer from the amount actually awarded. Arithmetic uses integer cents. A fee must not be represented as a government tax. Project quotes must be based on disclosed requirements and a deterministic price schedule, then shown to the customer for approval.

## Feedback email

The intended feedback address is on `xzello.online`. Resend currently lists the domain but inbound receiving is disabled and the domain verification state has not yet been confirmed. Before emails can be ingested:
1. Complete the DNS records Resend shows at GoDaddy.
2. Enable inbound receiving for the domain.
3. Choose and create the feedback recipient/inbox.
4. Configure a signed Resend webhook for inbound email events.
5. Add the webhook secret and recipient/inbox configuration to the preview environment.
6. Apply the new feedback-table migration only after reconciling it against the live Supabase migration history.

Email content is untrusted input. Xzello may summarize and categorize ideas, but an email must never authorize code execution, account changes, payment actions, secret disclosure or deployment.

## Stripe and customer consent

Pricy can prepare payment plans and server-side quote data. Stripe account ownership remains with the account holder. Klin must clearly distinguish Klin's platform Stripe account from a customer's connected Stripe account. Connecting a customer account requires explicit user initiation and Stripe-hosted Connect onboarding; never ask customers to paste secret keys. Payment creation, refunds, transfers, payouts and live-mode configuration remain behind explicit approval and verified Stripe webhooks. Stripe is not a general-purpose escrow or bank account.

## Not yet complete

- Xzello/Pricey provider model IDs and image model must be set and verified.
- No live agent tools, project file-editing worker, or autonomous build queue is connected by this change.
- Feedback email DNS, receiving, recipient and webhook are not yet enabled.
- The feedback/appeals/quote migration is committed but not applied.
- Appeals UI, evidence upload review, human decision workflow, quote UI and payment-plan checkout integration remain to be implemented.
- No Stripe account was connected or changed.
