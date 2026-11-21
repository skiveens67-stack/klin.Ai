# Klin Autonomous Builder, Build Billing and Revenue Specification

**Status:** Product specification plus partial UI/API wiring. This document does not certify a live agent runtime, payment collection, generated-project QA, or publishing system.

## Autonomous Builder mission

Klin's builder is intended to plan, design, implement, test and package:
- Websites and full-stack web applications.
- Video applications and media workflows.
- Software products and internal business tools.
- Digital business kits containing a website, payment checkout, CRM/email automation, brand assets and a launch checklist.

Klin supplies digital deliverables and setup instructions. It must not claim to register a company, open a bank account, ship physical products, or perform other offline/legal actions.

## Builder subscription tiers

These are separate builder entitlements. They do not silently replace Klin's existing general membership catalogue.

| Builder plan | Monthly price | Maximum active agents | Maximum build duration | Build discount |
|---|---:|---:|---:|---:|
| Free | $0 | 4 | 30 minutes | 0% |
| Starter | $29 | 10 | 24 hours | 0% |
| Pro | $79 | 20 | 5 days | 10% |
| Business | $199 | 30+ | 10 days | 20% |

The implementation uses distinct Stripe plan codes `builder_starter`, `builder_pro`, and `builder_business`. The API calculates capacity only from verified active subscription rows; the UI's plan selector cannot grant access. Stripe checkout remains fail-closed until the matching price IDs are configured on Klin's Stripe account. Business is displayed as 30+ but the current capacity primitive enforces a floor of 30; expansion above 30 needs a defined scaling rule and runtime capacity.

The earlier general Klin membership catalogue remains separate: Free ($0), Starter ($4.99), Plus ($9.99), Creator ($19.99), Galaxy ($29.99), Studio Pro ($49.99), Developer ($79.99), Ultimate ($149.99), Business (starting at $299), and Enterprise (custom). The existing subscription checkout implementation has only the original paid plan price IDs; do not assume every general membership tier is purchasable yet.

## Locked quote and deposit

Before any builder worker is started, Klin must show:
- Project type, complexity, scope and requested integrations/assets.
- Estimated active compute/build time and expected duration.
- The selected builder plan and verified agent limit.
- A transparent price range and applicable plan discount.
- Deposit amount and the fact that 100% of the deposit is credited toward the final invoice.
- What is excluded, what can change the estimate, and the pause/refund rules.

Deposit rule:
- Standard build: $20 deposit, credited in full.
- Multi-day build with estimated total above $150: 15% deposit, credited in full.
- No agent starts until the deposit is confirmed by a verified payment event.

The current estimator has an existing provisional price range of $7–$35 per 10-hour work block, and the Builder UI derives a range from that policy. This is not yet a true compute-hour/agent-tier cost model. Finance/product owner must approve the compute rates, provider-cost markup, agent-tier multiplier, rounding, taxes, refunds, and quote-expiry policy before the quote can be treated as binding. The UI calls the current calculation an estimate preview and does not start work or charge a deposit.

## Klin Modules as the agent system

Klin's agent architecture uses six reusable specialist modules rather than a separate codebase for every agent:
1. Klin Tester — code, link, accessibility, security and functional QA.
2. Klin Builder — websites, applications, software and digital business kits.
3. Klin Animator — animation, video and media workflows.
4. Klin Calculator — estimates, compute, deposits, discounts and invoices.
5. Klin Helper — user support, explanations and task coordination.
6. Klin Safety & Law — safety, privacy, platform-policy and legal-risk review. It flags issues and is not a substitute for qualified legal counsel.

Module intelligence levels are Klin V1 Free, V2, V3, V4, V5, V6 Ultra and V7 Ultra Safe. Each level maps to a server-side Vercel AI Gateway model ID via `KLIN_MODULE_V2_MODEL` through `KLIN_MODULE_V7_MODEL`; V1 falls back to `KLINIE_MODEL`. Missing model configuration fails closed. A tier name does not magically improve a model: Klin's owner must select and test the actual provider/model IDs, capability, latency and cost for each tier.

The new Klin Modules page supports role profiles, local duplication, per-profile model-level selection, single-module AI Gateway execution, and local pause/retry behavior. Copies are currently stored in browser local storage, not a durable cloud module registry. A module run is one model request with a role-specific system instruction; it does not yet edit repository files or operate connected external services. Parallel execution, durable roster sync and server-side concurrent-agent admission still need the job runtime.

## Agent roles and work isolation

- Planner: requirements, architecture, milestone plan, risk register and task ownership.
- Frontend builder: interface, accessibility, responsive layout and client state.
- Backend builder: APIs, database contracts, authentication and integrations.
- Specialist builders: data, media/video, automation, packaging and documentation as required.
- QA tester: independent syntax, lint, type, unit, link, responsiveness, functional, security and artifact checks.

Agents must not concurrently overwrite shared files. Work must use isolated branches/workspaces or file ownership locks, then a controlled integration stage. Server-side orchestration must enforce the active-plan concurrency cap on admission and while jobs run.

## Checkpoints and user review

- User-selectable progress updates at 5%–10% intervals (the product may offer 5%, 10%, 15% and 20%).
- Progress must be calculated from completed and verified milestones, not generated token counts.
- At every 20% milestone, run the relevant generated-project QA suite, fix failures, create a preview, and wait for user review before continuing.
- A checkpoint must persist a durable version, QA report, logs, issue list and preview reference.
- Failed tests must remain failed or skipped; never relabel them as passed.

The existing repository CI tests Klin itself. It is not the isolated generated-project QA runner, and no user project preview deployment is currently available.

## Offline pause, active time and snapshots

The cloud runtime must heartbeat workers and maintain expiring leases. If the user/client loses connection for more than two minutes, finish only the current safe micro-task, stop dispatching new work, save a durable snapshot and pause the job. Paused, idle, provider-wait and outage time are not billable. On recovery, verify identity, lease and last checkpoint before resuming. A crashed worker must not continue metering time.

Browser offline mode alone cannot guarantee server-side pause or snapshot. This requires a persistent job state machine, worker service and durable storage. Do not store secrets or payment details in local offline drafts.

## Final delivery and pay-to-publish

At 100% verified completion, create a watermarked test sandbox with preview, source package manifest, API export manifest and itemized invoice. Until the final balance is paid or an eligible installment agreement is confirmed:
- Keep the watermark.
- Lock source-code downloads and API exports.
- Lock custom-domain publishing and production deployment.
- Do not mark the project as published.

Invoice arithmetic: total approved build cost minus deposit paid equals remaining balance. A browser redirect is not payment proof; use a verified, idempotent webhook. Stripe is the primary configured integration target. Klarna/Affirm installment availability must be confirmed for the merchant, currency, customer and checkout; PayPal remains a separate accepted checkout option. No payment method may be advertised as available until configured and tested.

## Existing revenue streams to preserve

These are previously discussed Klin/Kai ecosystem ideas. Treat the Kai-branded card/banking items as separate product decisions; do not imply Klin currently provides banking or physical cards.

1. Membership subscriptions and builder subscriptions.
2. AI credits/Gems and metered generation or compute usage.
3. Creator marketplace commissions: 15% platform share / 85% creator share on eligible sales, subject to refunds, payment processing, tax and payout rules.
4. Sales of websites, apps, games, videos, templates, assets, agents and other digital products.
5. Paid promotion/boost placements (previous proposal: $25).
6. Scheduled/automatic posting (previous proposal: $5 per week).
7. Optional attribution removal (previous proposal: $1).
8. Hosting, deployment, storage and bandwidth tiers.
9. Premium analytics and business dashboards.
10. API access, developer usage and enterprise plans.
11. White-label and agency/reseller licensing.
12. Education/school plans and group/team seats.
13. Template, asset and AI-agent marketplace fees.
14. Cloud/media processing and rendering commissions.
15. Qualified creator rewards: previously discussed $500 per 200,000 qualified views/plays/visits/opens. This must be a capped, funded rewards programme with fraud filtering, verification, eligibility terms and pending balances; never promise payment for raw or manipulated traffic.
16. Optional business/charity campaigns and promotions, only after a compliant settlement and disbursement design exists.

Do not activate creator payouts, charity disbursements, escrow, business acquisitions, lending, physical shipping, or card/banking claims without their required legal, compliance, payment-provider and operational review. The current Marketplace is a draft/publishing interface; live settlement and payouts are not enabled.

## Current implementation status

### Present in source
- Authenticated Autonomous Builder page and navigation entry.
- Four builder plan cards and explicit role descriptions.
- Server-side agent entitlement calculation using active subscription records for the new builder plan codes.
- Stripe checkout allowlist and environment-variable placeholders for the three paid builder plans.
- Quote preview and authenticated quote persistence in private project metadata, with server-side subscription verification and the requested $20 / 15% deposit arithmetic. Quote persistence does not collect payment or start a build.
- Existing project estimator, project drafts, offline draft sync, checkpoint policy primitives and repository CI.

### Not operational / requires more work
- Multi-agent scheduler, isolated worker execution and real parallel code generation.
- Server-side plan admission enforcement during long-running jobs.
- Compute-hour and agent-tier cost model; approved final price ranges and binding quotes.
- Deposit checkout and webhook-linked build authorization/credit ledger.
- Durable build jobs, heartbeats, cloud snapshots and server-side resume. The module UI can cancel an active browser request on offline and retain its task locally for an explicit Continue retry, but it cannot guarantee provider cancellation or pause an autonomous cloud worker until the job runtime exists.
- Checkpoint preview deployment and user testing gates.
- Isolated generated-project QA for websites, video apps and software.
- Watermarked sandbox enforcement, source/API export locks and pay-to-publish release.
- Stripe price products/webhook configuration for builder plans; Klarna/Affirm eligibility and checkout support.
- CRM/email automation worker execution and video rendering providers.

No production database schema change or production migration is authorized by this specification.


For marketplace payments and the proposed Klin Wallet, see `docs/KLIN_STRIPE_MARKETPLACE_PAYMENTS.md`. Stripe Connect is the intended route for seller onboarding and payouts; Klin must not pool user funds or advertise a bank/escrow product without an approved regulated structure.
