# Klin V7 Engineering Readiness Audit

**Product domain:** `klin.website`  
**Target launch:** November 15, 2027  
**Product specification:** V7 Ultra Safe Vaulting  
**Audit date:** November 17, 2026  
**Repository:** `skiveens67-stack/klin.Ai`  
**Reviewed branch:** `chatgpt/backend-foundation`  
**Related pull request:** [PR #1 — Port Klin backend foundation](https://github.com/skiveens67-stack/klin.Ai/pull/1)

## 0. Scope, limitations, and status language

This document compares the V7 product specification supplied by the product owner with the code and live Supabase project that were accessible during this review.

It is an engineering gap audit, not a certification, penetration test, legal opinion, hardware safety validation, or launch approval.

Status meanings:

- **PRESENT:** Evidence of an implemented component was found.
- **PARTIAL:** Some supporting schema or API exists, but the full user-facing or operational feature is incomplete.
- **NOT IMPLEMENTED:** No implementation was found in the inspected repository/project.
- **NOT VERIFIED:** Available access did not permit a reliable conclusion.
- **NOT DEFINED:** The product specification does not yet give enough detail to implement safely.

A database table is not proof of a working product feature. An API route that records a request is not proof that an external provider or physical device executes it. A security advisor with no findings is not a substitute for code review, abuse testing, and runtime verification.

### 0.1 Systems inspected

- GitHub repository metadata and branch list.
- The open draft backend PR and its changed-file list.
- Backend API documentation, route handlers, shared server utilities, package manifest, CI workflow, and SQL migrations in the backend branch.
- The live Supabase project `Klin.Ai` (`jkujzqvxzkzgpdlntoek`), which reported `ACTIVE_HEALTHY`, region `us-east-1`, PostgreSQL 17.11.0.019.
- Live Supabase migration history, table RLS flags, security/performance advisors, selected table grants, relevant columns, public SECURITY DEFINER function privileges, and deployed Edge Functions.

### 0.2 Access limitations

- The repository default branch `main` contains only a README at the time of inspection. PR #1's backend branch intentionally excludes `app/page.tsx` and the frontend. Grok's local frontend folder is not available in this GitHub repository.
- Vercel project settings, environment variables, domain mappings, and current deployment were not inspected because Vercel management actions were not exposed in this session.
- No production deployment, secret change, billing change, DNS change, production database migration, or PR merge was performed.
- GitHub Actions run #29 for commit `93ba0b2b877d1e3e5d60776fcb94c94927400997` completed successfully. Its workflow installed dependencies, ran ESLint, and completed the Next.js production build. The workflow does not define or run an automated test suite.
- No live end-to-end sign-up, OTP, payment, AI inference, messaging, marketplace settlement, or hardware test was executed.

## 1. Global Architecture & Infrastructure Foundations

**Overall status: PARTIAL**

### Evidence found

- Backend branch uses Next.js 15.5.29, React 19.1.2, TypeScript, Supabase SSR/client libraries, and Stripe.
- Supabase project is active and healthy, in US East 1, running PostgreSQL 17.11.0.019.
- Public tables: 34 of 34 have Row Level Security enabled in the live project.
- Supabase Security Advisor returned zero lints at the time of review.
- The live project has four inspected public SECURITY DEFINER functions. The wallet transaction function's live ACL allows execution by `service_role`, not `anon` or `authenticated`. This is a positive control.
- The code has server-only boundaries around the Supabase admin client, Stripe client, and contact encryption utility.
- The backend workflow pins GitHub Actions actions by commit SHA and uses Node.js 22.

### Gaps

- The V7 design tokens are not implemented in the visible repository. The V7 palette is deep navy `#060913`, glass surface `#0D1324`, cyan `#06B6D4`, indigo `#6366F1`, and emerald `#10B981`. The previous purple design direction should be treated as superseded unless the product owner decides otherwise.
- The backend branch contains no integrated frontend page or component tree.
- The package manifest does not include a visible Tailwind dependency or V7 design system implementation.
- Production hosting configuration and `klin.website` deployment bindings were not verified.
- No production/preview/development separation was verified during this session.
- No deployed Supabase Edge Functions were found (`list_edge_functions` returned an empty list).
- No production backup/restore exercise was performed.
- The live Supabase project has 16 recorded migrations, while the inspected backend branch contains 12 migration files whose `20261114_01...` style names do not match the 14-digit versions in live migration history. This may represent a source-history mismatch. Do not run a blanket migration push until the local and remote histories have been reconciled.
- The performance advisor reported 52 unused indexes. The project is very new; do not delete them automatically. Review after representative workload and query-plan evidence exist.

### Required work

1. Reconcile migration history and establish one canonical source of truth.
2. Restore/integrate Grok's frontend source into a controlled branch.
3. Add automated unit, integration, RLS, API, and end-to-end tests.
4. Verify separate preview and production configuration in Vercel.
5. Add production monitoring, alerting, backup policy, and tested restoration.
6. Verify all secrets are server-only and stored in the intended hosting environment.
7. Publish a versioned API contract (OpenAPI 3.1 is the proposed standard).

## 2. Identity Verification & 2027 VIP Founder Portal

**Overall status: PARTIAL; dual-channel OTP and age compliance are NOT IMPLEMENTED.**

### Evidence found

- The live `profiles` table includes `full_name`, `email`, `phone`, `email_verified_at`, `phone_verified_at`, `account_activated_at`, `waitlist_position`, `referral_code`, and referral linkage.
- The account profile API prevents clients from editing email, phone, verification timestamps, account activation, waitlist position, or referral identifiers.
- A referral activity read API exists.
- Paid Stripe checkout currently checks that the user's email is confirmed.

### Gaps

- No email OTP or SMS OTP challenge tables/columns were found in the inspected public schema.
- No dual-OTP enrollment or verification endpoints were found.
- No SMS provider integration or Twilio credential/configuration was found in the backend branch.
- Phone verification is represented by a timestamp field, but no implemented challenge/verification flow was confirmed.
- No `age_bracket`, date-of-birth, or identity-verification columns were found in the inspected schema.
- Existing managed-profile age bands are `under_13`, `13_15`, `16_17`, `18_plus`, and `unknown`. They do not distinguish 18–20 from 21+.
- A referral activity endpoint exists, but the V7 deterministic code format, founder queue numbering, referral priority scoring, and anti-fraud qualification logic were not verified.
- The V7 registration schema must not store an application-managed `password_hash`; Supabase Auth should own password credential storage and verification.

### Required work

- Define a server-side verification challenge model with separate email and SMS channels, hashed OTP values, short TTL, attempt counters, send/resend limits, replay protection, and one-time consumption.
- Decide whether account activation requires both channels for every account or has a documented recovery/exception path.
- Add rate limits by IP, account, and destination.
- Use a reputable SMS provider after verifying delivery, pricing, country coverage, and sender-registration requirements.
- Define phone-number normalization with a maintained library; do not hard-code individual area-code exceptions.
- Implement founder queue allocation transactionally and make the queue sequence auditable.
- Define referral scoring, qualification, reversals, anti-self-referral rules, device/account fraud detection, and appeal handling.
- Keep identity evidence in a restricted data store. Do not store raw identity documents unless legally and operationally necessary.

## 3. Klinie Personal Executive Assistant — Auto-Delegate Mode

**Overall status: PARTIAL foundation; autonomous assistant behavior is NOT IMPLEMENTED.**

### Evidence found

- Conversation and message persistence APIs exist.
- The API documentation explicitly states that model inference, streaming responses, provider selection, and AI worker execution still require provider credentials and runtime configuration.
- Scheduled communication actions can be stored in a pending-approval state.
- Communication rules and trusted contacts have supporting tables and APIs.
- Trusted-contact destinations are encrypted in the application route using AES-256-GCM.
- No deployed Edge Functions were found, so no Supabase Edge Function worker is currently available for this workload.

### Gaps

- No production Klinie model provider or streaming inference runtime was confirmed.
- No provider OAuth callback/refresh implementation or external communication worker was found.
- SMS, email, WhatsApp, Discord, Slack, Zoom, Google Meet, calendar, phone screening, and voicemail functionality are not confirmed as live integrations.
- The stored scheduled action does not execute by itself. The API response explicitly says it remains saved until a provider worker is connected.
- No verified semantic emergency classification and escalation pipeline was found.
- The three-tier permission architecture is not shown as a complete server-enforced authorization policy.
- No robust autonomous action journal, consent ledger, per-channel scope, spending scope, or emergency-mode revocation mechanism was confirmed.
- Training or adapting to a user's writing style requires explicit consent, data minimization, retention controls, and protection against unauthorized voice/style imitation.
- Meeting stand-in recording and transcription consent rules are NOT DEFINED.
- Full Proxy must not silently gain authority to move money, make purchases, send legally binding communications, or perform other high-risk irreversible actions.

### Required work

- Select and contract approved AI providers; keep provider credentials server-side.
- Implement streaming chat and a background job architecture with retry, dead-letter, and idempotency.
- Define per-tier scopes and enforce them server-side on every action.
- Require explicit confirmation for payments, purchases, legal commitments, deletion, and high-impact account changes.
- Define AI proxy disclosure, meeting recording consent, call recording consent, and applicable jurisdiction handling.
- Add a user-visible action history, an immediate revoke/pause control, and safe fallback behavior.
- Build emergency classification with conservative thresholds and human confirmation/escalation for uncertain cases.

## 4. Thangie Hardware Fleet & 14-Day Incense GPS Tracking

**Overall status: PARTIAL database/API scaffolding; actual hardware operation is NOT IMPLEMENTED.**

### Evidence found

- A `devices` table supports `thangie_rover`, `drone`, and `incense_tracker` device types.
- Device metadata, status, firmware version, serial number, and telemetry tables exist.
- Device command requests can be recorded.
- Commands are marked pending approval, require confirmation, and expire after two minutes.
- The API and a database trigger enforce a maximum rover speed of 1.5 mph when a `speed_mph` parameter is supplied.
- Device command route explicitly states that it records a command for a future authenticated device gateway and does not directly actuate hardware.

### Gaps

- No device gateway, firmware, cryptographic device identity, provisioning/claim protocol, or hardware command acknowledgement service was found.
- A command record is not a physical Emergency Stop.
- No firmware watchdog or verified 2.5-second wireless-loss behavior was tested.
- No solar panel, charging, battery, LiDAR, proximity-sensor, camera, collision-control, drone tethering, geofencing, or return-to-home implementation was available for inspection.
- No 14-day GPS battery/communications validation was performed.
- GPS provides coordinates but does not itself transmit them. Incense requires a defined radio/cellular/satellite communication design and an energy budget.
- Location sharing, bystander privacy, camera recording, retention, and emergency-contact consent are NOT DEFINED.
- The 1.5 mph cap must be enforced independently by firmware, not just the API/database.

### Required work

- Treat hardware as disabled until an authenticated gateway and safety-certified firmware exist.
- Define threat model, device key provisioning, mutual authentication, signed command envelopes, replay prevention, command expiry, telemetry integrity, firmware update signing, and revocation.
- Implement independent physical kill switch and firmware safe state.
- Conduct collision, signal loss, sensor failure, motor failure, geofence, battery, and recovery testing.
- Obtain specialist review of drone operations and applicable aviation rules before field use.
- Do not expose a live-control UI until the device gateway has passed hardware-in-loop tests.

## 5. Tactile Animations & Augmented Reality Motion Engine

**Overall status: NOT IMPLEMENTED.**

### Required components not found

- WebGL/WebGPU avatar rendering pipeline.
- A measured 60fps performance target or device support matrix.
- Cheek-pull spring-mass simulation.
- Front-camera skeletal pose tracking.
- Mirror Pose Matching.
- Floor is Lava room mapping and boundary warnings.
- Freeze Tag motion detection.
- Multiplayer synchronization.

### Required work

- Define supported browsers, devices, camera permissions, accessibility fallback, and frame-rate measurement.
- Process camera frames locally where feasible; do not upload raw camera feeds by default.
- Define retention and deletion for pose vectors and motion data.
- Test false positives, low light, occlusion, camera interruption, and child privacy.
- Add age-appropriate game design and non-camera alternatives.

## 6. Klin Creative Media & Music Studio — SoundLab and Auto-Cut

**Overall status: PARTIAL media storage foundations; generation and editing features are NOT IMPLEMENTED.**

### Evidence found

- Private media asset metadata and signed upload URL endpoints exist.
- The backend documentation describes a private user assets bucket and 100 MB per-file upload limit.
- Moderation-related schema/migration work exists.
- Publishing is intentionally blocked pending moderation.

### Gaps

- No live SoundLab generation provider, stem-separation provider, hum-to-beat pipeline, or audio mastering service was confirmed.
- No Auto-Cut natural-language edit interpreter, timeline editor, beat-sync engine, captioning service, or automated 9:16 reframing pipeline was found.
- No Thangie footage sync worker exists.
- No complete Image Studio generation/editing provider or batch-processing system was confirmed.
- No 4K render pipeline or export entitlement enforcement was found.
- “100% ownership” and “zero watermarks” cannot be promised without provider terms, training-data rights, user-upload rights, and licensing/provenance controls.
- Moderation schema does not mean a moderation worker is running.

### Required work

- Use server-side provider adapters and asynchronous media jobs.
- Add upload MIME/magic-byte validation, malware scanning, re-encoding, size/duration limits, decompression-bomb protection, and private object storage.
- Define job states, cancellation, provider timeout handling, retry budgets, failed-job cost treatment, and refund/Gems-hold release.
- Store provider model/version, terms snapshot, asset provenance, license scope, and sellability status.
- Require moderation before publication or sharing.
- Define export formats, actual maximum resolution, watermark policy, and rights terms before marketing claims.

## 7. Business Marketplace, Storefronts & Verified Business Exchange

**Overall status: PARTIAL marketplace scaffolding; checkout, escrow, business exchange, and payouts are NOT IMPLEMENTED.**

### Evidence found

- Marketplace listing and bid tables/APIs exist.
- User listing creation creates a draft.
- A database trigger sets listing shares to 8,500 / 1,000 / 500 basis points (85% / 10% / 5%).
- Listing activation is blocked for authenticated clients pending backend moderation.
- Auction bid validation checks listing state, timing, seller self-bidding, and bid amount.

### Gaps

- No complete marketplace order/checkout API or settlement workflow was verified.
- Backend documentation states marketplace orders, payouts, Stripe Connect, and charity disbursements are not enabled.
- No business acquisition listing schema or valuation verification workflow was confirmed.
- No escrow service, dispute process, legal handover workflow, verified analytics process, or closing-fee process was confirmed.
- Auction bid API and RLS do not implement the V7 21+ restriction.
- No youth creator supervision/allowance-specific sales policy was confirmed.
- No seller KYC, sanctions screening, tax reporting, refunds/chargebacks workflow, or payout reconciliation was verified.

### Required work

- Separate ordinary digital-product storefronts from whole-business acquisitions.
- Implement the 21+ gate as an authorization decision based on verified age evidence, not a frontend flag.
- Add product rights and moderation gates before activating listings.
- Define escrow provider, custody model, release conditions, disputes, refunds, chargebacks, seller verification, and handover.
- Define jurisdiction-specific business-sale terms and specialist legal review.
- Add atomic auction close and settlement jobs; protect bidding against race conditions.
- Do not accept client-calculated fees or payout splits.

## 8. Academic Tutoring, Drama Improv & TV-Y Elephant Trumpet Safety

**Overall status: PARTIAL learning progress only; tutor, improv, and audio profanity substitution are NOT IMPLEMENTED.**

### Evidence found

- A learning progress API and progress table exist.
- The API currently covers progress records, not a complete AI tutor or lesson engine.

### Gaps

- Nice, Funny, and Strict AI tutor modes are not implemented.
- Virtual Detention behavior is NOT DEFINED beyond the product concept.
- Drama improv engine is NOT IMPLEMENTED.
- TV-Y Elephant Trumpet profanity filtering across all voice channels and games is NOT IMPLEMENTED.
- No speech-to-text moderation, low-latency audio replacement, voice-chat provider, game integration, or profanity policy was found.
- No complete vetted curriculum, teacher/guardian reporting, age-based learning controls, or learning evaluation was confirmed.

### Required work

- Select a curriculum strategy and age-appropriate learning sources.
- Build tutor sessions, message history, skill attempts, mastery, spaced repetition, and progress summary with safety guardrails.
- Keep all persona modes under the same safety policy; avoid shaming or coercive punishment.
- Define whether “Virtual Detention” is only a playful opt-in learning room. It must not lock a child out of core functionality or become humiliating.
- Define voice profanity detection, false-positive handling, processing latency, and whether the replacement sound is used only for live playback or also stored/exported.
- Include reporting and human review for harmful content.

## 9. Dual-Gateway Banking, Klin Gems & the 85/10/5 Split

**Overall status: PARTIAL wallet and Stripe foundations; Braintree, dual gateway, marketplace payout ledger, and charity disbursements are NOT IMPLEMENTED.**

### Evidence found

- Wallet balances and immutable transaction records exist.
- The wallet transaction function uses row locking and an idempotency key.
- Live inspection confirms `post_wallet_transaction` is a SECURITY DEFINER function and execution is denied to `anon` and `authenticated`, while allowed to `service_role`. This is a positive control.
- Stripe Checkout and Stripe webhook routes exist in the backend branch.
- Stripe webhook signature verification is performed against the raw request body.
- Paid Gems checkout events can credit the wallet through the server-side wallet function.
- Marketplace listing trigger sets fixed 85/10/5 basis points.

### Gaps

- Braintree SDK, gateway credentials, webhook handling, and failover are absent from the inspected backend branch.
- Automatic failover cannot blindly retry an in-flight charge on a second provider; it must reconcile idempotency and payment state to avoid double-charging.
- Current subscription codes are `galaxy`, `studio_pro`, and `ultimate`, which do not match V7's Starter, Plus, Pro, Family Fortress, and Merchant & Enterprise plans.
- No actual creator payout, charity disbursement, escrow settlement, or Connect account workflow is enabled.
- The 85/10/5 trigger stores shares on listings; it is not an immutable, complete transaction-level settlement ledger.
- The revenue split calculation base is NOT DEFINED: gross sale, net of processing fees, taxes, refunds, chargebacks, and currency conversion.
- Subscription prices and included quotas are not yet reconciled with AI/provider costs.
- Guardian allowances and minor spending restrictions are not complete.

### Required work

- Define a platform ledger with double-entry accounting, append-only journal entries, idempotent settlement, reversal entries, reconciliation, and immutable audit trail.
- Specify the 85/10/5 calculation base and rounding policy before any live payout.
- Model currency in integer minor units and define exchange-rate source/timestamp.
- Define how refunds, taxes, processing fees, disputes, and chargebacks affect each share.
- Choose and test Stripe/Braintree routing rules and webhook lifecycle handling.
- Keep the wallet's Gems ledger distinct from fiat payment settlement.
- Define guardian-authorized minor purchases and spend caps in server-side policy.

## 10. Three Iron Core Safety, Privacy & Age-Compliance Shields

**Overall status: PARTIAL security foundation; the three V7 shields are NOT IMPLEMENTED as complete systems.**

### Shield 1 — V7 Ultra Safe Vaulting

Evidence:
- Trusted contact destinations are encrypted in the server route with AES-256-GCM.
- The encryption key is read from server-side `KLIN_CONTACT_ENCRYPTION_KEY`.
- The app does not select the encrypted secret column in the normal trusted-contact read endpoint.
- RLS is enabled across all 34 public tables.

Limits:
- This is not end-to-end encryption for all conversations, identity records, biometrics, and GPS.
- It is not a zero-knowledge architecture.
- No general key hierarchy, client-side encryption, recovery design, rotation scheme, or encrypted search design was verified.
- “Military-grade” is not a testable security specification. Use named, reviewed cryptographic algorithms and measurable controls instead.
- “Zero data sales” requires contractual, operational, privacy-policy, and vendor controls; it cannot be proved by an encryption library.

#### Security finding — trusted contact insert privilege

Live database inspection found:
- The `trusted_contacts_self` RLS policy restricts rows to the signed-in user's own `user_id`.
- Authenticated users cannot SELECT `secret_reference`.
- Column-level INSERT privileges are granted to authenticated users for `user_id`, `display_name`, `channel`, `secret_reference`, `priority`, and `is_emergency`.
- The effective column privilege check reports that authenticated can INSERT `secret_reference`.

This does not establish cross-user read access, because the row policy and column SELECT permissions restrict reads. It does mean a user can bypass the application encryption route and submit a plaintext value to their own contact record, weakening the at-rest encryption invariant.

A code change was made on the backend branch so trusted-contact creation now:
1. Authenticates with the Supabase session.
2. Encrypts the destination in the server route.
3. Sets `user_id` from the verified session, not request input.
4. Inserts through the server-only service-role client.

A proposed SQL patch is stored at:
`docs/sql/revoke_trusted_contact_client_insert.sql`

**The SQL patch has NOT been applied to the live database.** It must be applied only after migration history has been reconciled. After application, verify that authenticated cannot insert any of the protected columns and that the server route still creates encrypted records.

### Shield 2 — Dignity Shield Protocol

**NOT IMPLEMENTED; key behavior NOT DEFINED.**

The product concept describes private financial assistance and fee waivers with no public badge or hardship label. It does not yet define:
- Eligibility rules.
- Who can approve assistance.
- Funding source and budget.
- Whether assistance is a discount, waiver, credit, or grant.
- How to prevent fraud without intrusive disclosure.
- Appeals and expiration.
- How accounting records are kept without exposing hardship status.
- Tax, consumer-protection, or charitable-treatment implications.

Required: design a privacy-preserving eligibility and assistance service with minimal data collection, strict staff permissions, audit logging, no public indicator, and clear accounting.

### Shield 3 — 21+ Compliance Firewall

**NOT IMPLEMENTED.**

- The current schema has child age-band values, but no verified adult-age evidence or 18–20/21+ distinction.
- Marketplace bid creation does not enforce 21+ in the inspected API or bid RLS/trigger logic.
- No identity verification provider or age-verification audit record was confirmed.

Required: server-side eligibility checks for every relevant route, API, query, job, and admin operation; verified-age record with provider, timestamp, confidence/status, expiry, and appeal; denial by default; re-check on sensitive actions; privacy minimization and jurisdictional policy review.

## 11. Annual Seasonal Events & Anti-Fraud Sweepstakes

**Overall status: NOT IMPLEMENTED; rules NOT DEFINED.**

The V7 plan lists:
- October 31: Halloween costume reveal and $5,000 prediction sweepstakes, limited to dual-verified accounts.
- November 15: Klin birthday, $50 user credits, 500 Gems, Cake Smash mini-game.
- December 25: $50 Klin Store Credit drop for verified community members.

Gaps:
- No event scheduler or claims service was found.
- No event budget, prize inventory, tax handling, promotion rules, entrant selection algorithm, fraud appeals, or fulfillment workflow was found.
- Dual email/SMS verification is not yet implemented.
- Requiring purchase or paid subscription must not be assumed permissible. Sweepstakes rules, eligibility, alternate methods of entry where required, age restrictions, jurisdictional restrictions, and official terms require specialist legal review.
- Define whether “$50 credit” means cash, wallet balance, store credit, coupon, or promotional value. These are not interchangeable.

## 12. Product Evolution & All Versions (Klin V1 Through V7)

**Overall status: ROADMAP DEFINED AT CONCEPT LEVEL; version acceptance criteria and delivery estimates are NOT DEFINED.**

### V1 — 2027 flagship

V1 includes web app, dual OTP, Klinie Tiers 1–2, tactile avatars, Tutor Mode, SoundLab/Auto-Cut V1, and 85/10/5 storefronts.

Current evidence:
- Backend foundation has account/profile, wallet, family, device, media, learning-progress, marketplace, social, notifications, projects, communications, and Stripe routes.
- It does not yet establish the full V1 user experience or any of the missing systems above.
- Frontend integration remains outstanding in the inspected repository.

### V2

Klinie Tier 3, Computer Use, Thangie rover/drone pairing, 14-day Incense GPS, and Dead-Man's Switch are NOT IMPLEMENTED.

### V3

21+ Verified Business Exchange, escrow settlement, valuation, and handover are NOT IMPLEMENTED.

### V4

Advanced stem separation, hum-to-beat, and synchronized multiplayer AR are NOT IMPLEMENTED.

### V5

Multi-node family safety mesh, school/classroom mode, and unified parental tracking are NOT IMPLEMENTED. School/classroom functionality needs a defined privacy and education-authority model.

### V6

Local Edge AI fallback and peer-to-peer off-grid Thangie mesh communications are NOT IMPLEMENTED. Hardware security and offline conflict resolution are NOT DEFINED.

### V7

Zero-knowledge encryption and Dignity Shield are NOT IMPLEMENTED. A realistic data-flow model must identify which features can be zero-knowledge and which require plaintext processing by a trusted server or provider.

### Required work

- Convert each version into feature-level acceptance criteria and dependency graphs.
- Define feature flags and rollout gates.
- Define a security/safety gate before hardware, payments, minors, and autonomous features become available.
- Do not label a version “complete” until its tests, operational runbooks, and rollback plan pass.

## 13. Subscription Tiers & Seven-Stream Monetization

**Overall status: PARTIAL Stripe subscription/Gems checkout; V7 plan and monetization model NOT IMPLEMENTED.**

V7 proposes:
- Starter — Free.
- Plus — $9.99/month.
- Pro — $24.99/month.
- Family Fortress — $34.99/month.
- Merchant & Enterprise — $79.99/month.

It also lists seven revenue streams:
1. SaaS subscriptions.
2. 10% platform marketplace fee.
3. Business Exchange escrow closing fees.
4. Physical Thangie hardware and beacon sales.
5. Gems micro-transactions.
6. Enterprise/classroom API licenses.
7. Optional instant-payout convenience margins.

### Gaps

- Existing backend subscription price codes are `galaxy`, `studio_pro`, and `ultimate`; these do not map to the V7 plans.
- Current checkout route uses Stripe only.
- The V7 prices, features, quotas, upgrade/downgrade behavior, grace periods, family seat rules, cancellation, proration, refunds, and tax treatment are NOT DEFINED in an implementation-ready plan.
- No entitlement service was found that enforces feature limits consistently across APIs and workers.
- No verified support for recurring physical hardware billing, classroom licensing, escrow closing fees, or instant payout fees was found.
- “Unlimited” creative exports require a fair-use policy, per-provider budget, concurrency limits, and abuse controls.

### Required work

- Create one canonical plan catalog stored server-side.
- Map each plan to entitlements and quotas; UI must read entitlements from the server.
- Implement webhook-driven subscription lifecycle, proration policy, cancellation, refunds, and failed payment recovery.
- Define a cost model for AI generation, storage, egress, moderation, payment fees, and support.
- Require legal/accounting review before enabling revenue distribution or instant payouts.

---

## 14. Five decisions requiring product-owner confirmation

These are decision gates, not assumed facts. Recommended defaults are identified but not approved.

### Decision 1 — Visual identity

**Option A:** Replace the previous purple concept with the V7 navy/cyan/indigo/emerald palette.  
**Option B:** Keep a purple identity and use V7 cyan/indigo/emerald only as supporting status colors.  
**Option C:** Use a hybrid identity with navy base, purple highlights, cyan interactive accents, and emerald security status.

**Recommended default:** Option A, because it follows the latest written V7 reference.

**Status:** NOT CONFIRMED.

### Decision 2 — Age groups and 21+ access

**Option A:** Keep four age groups (under 13, 13–15, 16–17, 18+) and separately enforce the 21+ Business Exchange rule.  
**Option B:** Split adult accounts into 18–20 and 21+ in the primary age model, while retaining child sub-bands.  
**Option C:** Use a legally reviewed age/eligibility decision service with age bands plus per-feature eligibility, instead of treating a single age field as universal permission.

**Recommended default:** Option C. Under-18 users need child safeguards; 18–20 users can be independent adults while still being excluded from a product's 21+ exchange policy if that policy is retained. Legal requirements vary by jurisdiction.

**Status:** NOT CONFIRMED.

### Decision 3 — Klinie Full Proxy authority

**Option A:** Full Proxy may autonomously handle low-risk communication and scheduling but always requires approval for payments, purchases, legal commitments, destructive actions, and high-impact changes.  
**Option B:** User can grant bounded spending and action limits with explicit, revocable scopes, requiring stronger verification and step-up confirmation for exceptional cases.  
**Option C:** Full Proxy is limited to triage, drafting, and recommendations; it cannot execute external actions.

**Recommended default:** Option A for initial release; consider Option B only after extensive security testing. Option C is the safest fallback if required controls are not ready.

**Status:** NOT CONFIRMED.

### Decision 4 — Privacy and encryption model

**Option A:** End-to-end encryption for compatible person-to-person conversations; server-side AI processing occurs only after explicit user action/consent and clear disclosure.  
**Option B:** Client-side encryption for identity/GPS/biometric vault data, with separately consented decryption for specific AI features.  
**Option C:** Server-side encryption for all data with strict key management, least privilege, audit logs, and no third-party data sale; do not market it as zero-knowledge.

**Recommended default:** A hybrid of A and B, with a feature-by-feature data-flow diagram. Do not promise universal zero-knowledge where server-side processing is required.

**Status:** NOT CONFIRMED.

### Decision 5 — Thangie hardware development order

**Option A:** Begin hardware prototypes in parallel with V1 web development.  
**Option B:** Finish and stabilize V1 web platform, then begin rover/drone engineering in V2.  
**Option C:** Prototype one low-speed rover first, validate hardware safety, and defer drones and long-duration GPS until later.

**Recommended default:** Option C for controlled prototyping, with no consumer autonomous deployment until firmware, gateway, emergency stop, and independent safety tests pass. The product roadmap can still place general hardware rollout in V2.

**Status:** NOT CONFIRMED.

---

## 15. Prioritized implementation backlog

### P0 — Resolve before accepting sensitive production workloads

1. Reconcile the 16 live migration records with the 12 local migration files. Do not run broad migration pushes until reconciled.
2. Complete the trusted-contact insert privilege restriction. The API code change is on the backend branch; the SQL patch is documented but not applied.
3. Verify every security-definer function's owner, ACL, search_path, and body-level authorization. The wallet function currently appears restricted to service_role based on live privilege checks.
4. Add automated tests for RLS isolation, wallet debit/credit idempotency, webhook replay, action approvals, and device command ownership.
5. Add rate limits for authentication, OTP/send operations, AI usage, communications, marketplace bids, and device commands.
6. Define age/eligibility model before enabling any minors' purchases, messaging automation, business bidding, or public content.
7. Create production/preview environment separation and confirm secrets are server-only.
8. Add monitoring, incident response, backups, and restore tests.

### P1 — V1 foundations

1. Dual OTP and account recovery.
2. Founder portal queue and anti-abuse referral scoring.
3. Klinie model-provider adapter and streaming.
4. Tier 1 approval engine and strict server-side scope checks.
5. Guardian and family permission engine.
6. Tutor foundation and content moderation.
7. SoundLab/Auto-Cut/Image Studio provider adapters and job workers.
8. Storefront order, payment, refund, and settlement infrastructure.
9. Canonical five-plan entitlement service.
10. Frontend integration and accessibility/responsive test suite.

### P2 — V2 and later

1. Communication provider workers, OAuth integrations, calendars, voice, and meetings.
2. Full Proxy and controlled Computer Use.
3. Thangie device gateway, rover firmware, and Incense communications.
4. Drone controls and aviation compliance.
5. AR motion engine and multiplayer.
6. Business Exchange, escrow, and seller/buyer verification.
7. Braintree integration and carefully reconciled gateway failover.
8. Dignity Shield eligibility and accounting.
9. V7 vault architecture and zero-knowledge feasibility review.

---

## 16. Claude and Grok handoff requirements

### Claude

Review this document and the live/backend evidence independently. Return:
- Confirmed, corrected, and disputed findings.
- A threat model for every P0 and P1 feature.
- The proposed permissions matrix for age, family, guardian, Klinie, marketplace, and device operations.
- A migration reconciliation plan.
- API/OpenAPI proposals.
- A test matrix with positive, negative, race, abuse, and failure cases.
- Provider research with pricing, rights, data handling, and minors' terms.
- Exact code changes or patches where possible.
- Remaining items marked NOT DEFINED when the specification is insufficient.

Do not assume an audit passes because Supabase Advisors returned no findings.

### Grok

Work only on frontend tasks. Return:
- Integrated V7 frontend source or exact patches.
- Screenshots at desktop, tablet, and mobile breakpoints.
- A list of backend API dependencies and missing screens.
- Accessibility and interaction test results.
- No fake service behavior or production deployment.

### ChatGPT

Own GitHub integration and backend implementation. Review both handoffs, preserve working systems, run tests, and merge/deploy only after required checks and product-owner authorization.

---

## 17. Changes made during this audit

**Committed to `chatgpt/backend-foundation`:**

1. `app/api/trusted-contacts/route.ts` now sends new trusted-contact inserts through the server-only Supabase admin client after session authentication. The owner ID comes from the verified session, and the contact destination is encrypted before insert.
2. `docs/sql/revoke_trusted_contact_client_insert.sql` records the privilege-removal patch required to prevent authenticated clients from bypassing the encryption route.
3. `app/api/marketplace/bids/route.ts` now rejects invalid `listing_id` filters instead of silently falling back to a broad bid query, rejects unexpected POST fields, scopes persisted idempotency keys to the authenticated user, returns the original bid for same-key/same-payload retries (including a concurrent retry lookup), and omits bidder account UUIDs from bid API responses.
4. `app/api/billing/checkout/route.ts` now rejects unexpected request fields and uses an own-property plan-code check.

**Additional live marketplace finding:** the live `marketplace_bids` table has a globally unique index on `idempotency_key`. The route now prefixes keys with the authenticated user and operation namespace to avoid cross-user collisions. The API now checks for an existing actor-scoped key and replays the original bid response when the listing and amount match; reusing the same key with a different payload returns 409. This is a route-level replay safeguard, but Claude should still review race behavior, key retention, and whether a dedicated idempotency table/transaction is warranted.

**Not performed:**

- The SQL patch was not applied to the live Supabase project.
- No production config, secrets, DNS, payment settings, or deployment was changed.
- No PR was merged.
- The current branch's lint and production build passed in GitHub Actions run #29 before the latest marketplace/billing hardening commits. Later workflow runs were still in progress or cancelled as additional commits superseded earlier SHAs. No automated integration suite or runtime product test has been run.
- The V7 frontend was not implemented because the frontend source is not present in the reviewed repository branch.

## 18. Immediate verification steps after the code change

Before the change is considered complete:

1. Reconcile migrations and apply the documented privilege patch in an approved migration.
2. Verify authenticated users cannot insert `secret_reference` directly through the Data API.
3. Verify the server route can still create a trusted contact with ciphertext beginning with the expected `enc:v1:` format.
4. Verify the normal authenticated GET endpoint never returns `secret_reference`.
5. Verify one user cannot create or read another user's trusted contact.
6. Verify missing encryption key or service-role credentials fail closed with a service-unavailable response.
7. Add and run integration tests for the trusted-contact insert path, encryption format, authorization boundary, and failure cases.
8. Keep the GitHub Actions lint/build workflow green after follow-up changes.

**Final readiness conclusion:** The current repository is a backend foundation, not a completed V1 or V7 Klin product. The live database has meaningful security controls, but the central V7 product workflows, frontend integration, AI execution, external workers, payout system, identity/age verification, physical hardware, and advanced privacy architecture still require implementation and verification.
