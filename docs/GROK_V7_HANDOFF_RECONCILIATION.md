# Klin V7 — Grok handoff reconciliation (2026-11-18)

## Scope and evidence

This reconciliation compares the Grok V7 handoff text supplied by the product owner with the accessible public repository `skiveens67-stack/klin.Ai`, branch `chatgpt/backend-foundation`.

The Grok handoff contains documentation and component inventories, but it does not contain the actual frontend source files. The referenced local directory `/home/workdir/artifacts/klin` is not accessible from this GitHub session. No frontend source ZIP or uploaded source tree was supplied. Therefore the Grok frontend cannot safely be imported or merged from the handoff text alone.

## Current repository / CI facts

- Backend branch: `chatgpt/backend-foundation`.
- Draft PR: #1, base `main`; not merged.
- Latest inspected head: `04e4a8cfa779f649f0a8b8a83d0c5db094ae302b`.
- GitHub check runs for that exact SHA: two `Next.js production build` checks, both completed with conclusion `success` on 2026-11-18.
- These checks establish that the configured Next.js production build workflow passed. They do not establish end-to-end functionality, frontend runtime QA, accessibility, payment settlement, or hardware safety.
- The public repository tree on the backend branch contains backend/API code and migrations; the supplied Grok component paths such as `src/components/layout/AppShell.tsx` and `src/components/chat/KlinieChat.tsx` are not present in the accessible branch tree.
- The repository package manifest has `build` and `lint` scripts but no dedicated `typecheck`, unit-test, or browser-test script. A `package-lock.json` is present on the branch (verify package manager consistency before any install/update).

## Reconciled API gaps and mismatches

| Grok UI expectation | Repository evidence | Status / action |
|---|---|---|
| `GET /api/me` | Existing route is `GET /api/account/me` | Contract mismatch. Choose canonical path and adapt frontend or add a compatibility route after source import. |
| `POST /api/chat` streaming | Conversation create/list and message persistence routes exist; message route explicitly returns `assistant.status = not_connected` | No model provider or streaming implementation. Do not represent chat as live. |
| `GET /api/gems` and transactions | Wallet/billing foundations exist, but frontend contract is not wired in this source tree | Verify exact routes and response shapes before wiring. |
| `POST /api/stripe/checkout` with `priceId` | Existing backend route is `/api/billing/checkout` and validates a plan code | Contract mismatch; never accept arbitrary client price IDs. Keep server-owned price mapping. |
| Family / guardian / approvals | Family/profile APIs exist; the full guardian wizard persistence and approvals workflow are not verified as matching Grok contracts | Needs contract-by-contract reconciliation. |
| Thangie emergency stop | Device command route only inserts a pending-approval command and states it does not actuate hardware | Critical blocker. No emergency-stop endpoint or authenticated hardware gateway was verified. Do not connect real hardware. |
| Device telemetry / Incense GPS | Device list and command queue exist; no live device gateway or verified GPS telemetry pipeline | UI must remain offline / unavailable. |
| Studios / Auto-Cut / media generation | Media upload and asset foundations exist; provider generation/render workers are not verified as live | No fake generated output. |
| Integrations OAuth | Connected integration storage exists; provider OAuth execution is not verified | Keep connect actions disabled or explicitly pending. |
| Creator profiles / catalog | Marketplace and social foundations exist; dedicated creator profile frontend route is absent from Grok audit | Grok frontend gap after source import. |

## Safety and security issues to retain

### P0 — Claude architecture / safety review

1. **Thangie emergency stop is not real.** Current device command endpoint records pending-approval work only. There is no verified gateway, firmware acknowledgement, watchdog, or physical stop path. Require a separate high-priority authenticated stop channel, replay protection, device-side watchdog, independent physical stop, signed acknowledgements, loss-of-connectivity tests, and an operational safety case before hardware use.
2. **Age and 21+ eligibility are not implemented end-to-end.** UI gates are not authorization. Define evidence, jurisdiction, data minimization, appeals, expiry, and enforcement for every route/job/query.
3. **Guardian permissions and Klinie execution scopes need a single server-side policy engine.** The three UI modes cannot grant authority. Require scope intersection, revocation, audit, step-up auth, and fail-closed behavior.
4. **Dual OTP is a UI requirement, not a shipped API.** Define verified email/phone state transitions, code hashing, expiry, resend limits, attempt limits, account recovery, SIM-swap risks, and account enumeration protection.
5. **Migration history discrepancy remains unresolved.** Reconcile live migration records with repository migration files before applying the pending trusted-contact privilege SQL patch or adding new production migrations.
6. **Trusted-contact client INSERT privilege remains a live database concern.** Code encrypts through server-only admin insert, but the SQL revoke patch is not applied. Verify direct Data API insert is denied after a reconciled migration.
7. **Distributed rate limiting, request-size limits, consistent error registry, request IDs, and abuse controls need a complete audit.** Do not use in-memory rate limits for serverless deployments.
8. **No verified end-to-end test suite** covers RLS isolation, wallet idempotency, Stripe webhook replay, guardian approvals, marketplace bid races, or device ownership.
9. **Backup/restore, monitoring, environment separation, and incident runbooks** require evidence and restore drills, not configuration assumptions.

### P0 — ChatGPT backend / integration

1. Implement and test a real Klinie provider adapter and streaming endpoint only after provider selection, safety policy, retention rules, cost limits, and minor-user terms are approved.
2. Publish one canonical API contract (OpenAPI 3.1) and reconcile the frontend paths above. Keep prices and entitlements server-owned.
3. Add API integration tests and browser smoke tests; current CI build success is not functional verification.
4. Do not merge PR #1 or deploy to production until frontend source is integrated, checks pass, product/security gates are reviewed, and the product owner authorizes merge/deploy.
5. Do not report Preview as available until an actual deployment URL and its access policy are verified. Vercel controls are not currently exposed through the available tool session.

### P1 — Grok frontend

1. Supply the actual frontend source tree as a ZIP or commit it to a reviewable branch through the authorized workflow. Documentation-only handoff cannot be compiled or merged.
2. Once imported, align frontend calls to the canonical backend paths and response shapes; remove hardcoded placeholder price IDs and sample catalog data from live purchase flows.
3. Add dedicated creator profile screens only when catalog/profile API contracts are stable.
4. Complete keyboard focus trapping in the mobile drawer, runtime responsive checks, reduced-motion checks, contrast measurements, and screen-reader testing.
5. Add Playwright smoke tests for navigation, auth states, chat pending/error/success, guardian setup, approvals, emergency-stop unavailable state, and checkout failure/success redirect.

## AI ownership for remaining work

- **ChatGPT:** GitHub changes, backend implementation, API contract integration, CI, tests, migration coordination, deployment coordination. No production merge/deploy without explicit authorization.
- **Claude:** independent architecture/security review, permission model, OTP and device safety acceptance criteria, migration reconciliation plan, abuse/race-condition test matrix, vendor/legal/minors-term research.
- **Grok:** frontend source delivery, frontend fixes, visual/accessibility/responsive QA against a verified Preview URL. Grok does not need local disk access for review once the source is uploaded to GitHub or attached here; it must not commit or deploy under the current team rules.

## Completion boundary

The backend build workflow passes on the inspected SHA. Klin V7 is not complete. The frontend source is not integrated into the accessible repository; core AI execution, dual OTP, real emergency stop, device gateway, media generation, guardian approval engine, 21+ verification, and production operations remain unverified or unimplemented.


## Follow-up backend hardening on 2026-11-18

Committed after the initial reconciliation:

- `app/api/devices/[deviceId]/commands/route.ts` now caps request bodies at 8 KiB and parameter JSON at 4 KiB, rejects unknown top-level fields, requires parameters to be an object, and reserves emergency-stop command names so they cannot be submitted through the ordinary approval queue.
- The route continues to require an authenticated owner, online device, confirmation, a two-minute expiry, and the 1.5 mph Thangie rover speed ceiling.
- The response explicitly states that the queue does not actuate hardware and that emergency stop requires a separate safety channel.

This is input hardening only. It does not create a hardware gateway, device acknowledgement, or real emergency-stop capability. Automated route tests have not yet been run.


## CI follow-up — 2026-11-18

The latest inspected branch head at the time of this update is `7f5b60bb42667b13187a4bfe19e5defb6291e47c`. GitHub reports the configured `Next.js production build` checks completed successfully for this commit. The draft PR remains open and unmerged. This is build evidence only, not end-to-end or safety certification.

A fresh repository-tree inspection still finds no `src/components/layout/AppShell.tsx` or `src/components/chat/KlinieChat.tsx` in the accessible branch. The supplied Grok frontend source therefore remains unintegrated. Grok's handoff documentation is not a substitute for the component source tree.


## Backend compatibility work — 2026-11-18

- Added `GET/PATCH /api/me` as a compatibility alias that re-exports the authenticated, validated canonical handlers from `/api/account/me`.
- Added `POST /api/stripe/checkout` as a compatibility alias that re-exports the canonical server-side billing handler from `/api/billing/checkout`. The contract remains `plan_code` only; browser-supplied Stripe price IDs are not accepted.
- Commits: `929d9b29266fbc82f39ed1a13559dbf4ac9cd517` and `84849ea10e815290e5a8b6a6c9c1466027a6f363`.
- GitHub Actions workflow `Klin Backend CI` was observed in progress for the latest compatibility commit; final result must be checked before claiming verification.
- Current Supabase primary project `Klin.Ai` is active/healthy. A fresh security-advisor query returned no lints. Live migration history contains 16 migrations. Do not infer that migration history matches the repository until the repository migration directory is enumerated and compared.
- Current Vercel project inspection confirms project `klin` is still linked to GitHub repository `skiveens67-stack/klin`; its latest production deployment is built from the old repository's `main` commit. The project has only the verified `klin-teal.vercel.app` domain. Its listed environment variables are only the public Supabase URL and publishable key, shared across Development, Preview, and Production. This project is not to be repointed or altered as part of backend work; establish a separate reviewed deployment path for `klin.Ai` after the frontend source is integrated.
- The selected Stripe account `Klin.ai` is `acct_1Uc4xKENLoSrK7qA` in test mode. The separate account named `Klin` was not selected or accessed. Continue to use only the exact `Klin.ai` context for Klin billing review.
