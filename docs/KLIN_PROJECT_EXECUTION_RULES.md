# Klin product execution rules

Updated 2026-11-20. These are product requirements, not evidence that every dependent runtime is already operational.

## Offline operation
- Klin is installable as a progressive web app.
- The service worker may cache the offline fallback and versioned static application assets.
- Offline project drafts are stored in browser IndexedDB and are synced only after the user reconnects and is authenticated.
- Never cache authenticated HTML, private API responses, conversation history, account data, wallet balances, payment data, or credentials in the service worker cache.
- Offline mode supports local draft capture and access to the offline screen. It does not run cloud AI models, remote agents, payments, publishing, integrations, or account operations.
- Local browser drafts are currently not encrypted by Klin. Users must not save passwords, payment details, or highly sensitive data in them. A future encrypted local vault requires a separate threat model and recovery design.
- Sync must be idempotent and must retain unsynced local drafts when a network or server error occurs.

## Project estimates and work billing
- Estimate project time from project type, complexity, feature count, integrations, and assets.
- The maximum estimate is 200 active build hours, or 25 eight-hour workdays. Smaller projects should be estimated below that cap.
- Each two-hour active work block is priced from $10 to $35 based on complexity.
- An estimate is not a charge. Before paid work starts, show the selected rate, the next two-hour block amount, the estimated number of blocks, the estimated total, and what happens if the estimate changes.
- Obtain explicit authorization before charging. Do not charge for idle time, waiting for a provider, or work that is paused.
- Do not silently charge another block. At each two-hour boundary, require an approved payment authorization or stop work and ask the user.
- The current project estimator calculates a quote only. It does not create a Stripe payment, start a build job, meter actual active time, or collect consent. Those runtime functions remain blocked until implemented and tested.

## Agent capacity
- Free plan base limit: 30 agents.
- Each distinct active paid subscription plan adds 10 to the account's maximum agent capacity.
- Entitlements are calculated server-side from active subscription records. Browser-provided plan names or agent counts must never grant capacity.
- Do not count canceled, expired, trial, unknown, or duplicate copies of the same plan.
- The current capacity endpoint and page report the entitlement. They do not run agents or enforce concurrent execution because the agent orchestration runtime is not connected.
- Before launch, enforce the limit inside the server-side agent scheduler and re-check entitlements at job admission and during long-running work.

## Test-before-delivery gate
A generated artifact must not be labeled ready until its applicable checks pass. Store the test report with the project version and make failures visible.

### Website and web app
1. Dependency installation and lockfile integrity.
2. Lint, formatting, strict type checks, unit tests, and production build.
3. Route smoke tests, authentication/authorization checks, and API contract tests.
4. Browser tests at desktop and mobile viewports.
5. Accessibility checks for keyboard navigation, focus, labels, contrast, and reduced motion.
6. Security checks for secrets, unsafe dependencies, authorization boundaries, input validation, and common web vulnerabilities.
7. Preview deployment health check before delivery.

### Mobile app
1. Static analysis, unit tests, dependency and secret scans.
2. Build for each requested platform.
3. Simulator/device smoke tests, permissions, offline transitions, and accessibility.
4. Release signing and store compliance are separate owner-approved steps.

### Video app and media projects
1. Validate input formats, file size, duration, and codecs.
2. Run rendering/transcoding in an isolated worker with CPU, memory, disk, and time limits.
3. Verify output can be decoded, expected duration/dimensions, audio/video synchronization, and no truncated output.
4. Scan uploaded and generated files; moderate content where required.
5. Retain a reproducible job log and preview artifact before delivery.

### Business platforms and integrations
1. Unit/integration tests against sandbox services.
2. Permission and tenant-isolation tests.
3. Webhook signature, replay, idempotency, and failure-recovery tests.
4. No live external writes or customer charges during QA unless separately approved.

### Delivery states
- draft: editable; not tested.
- building: generation is in progress.
- testing: automated checks are running.
- needs_attention: one or more checks failed or could not run.
- ready_for_review: required checks passed; owner review is still required.
- delivered: user accepted the reviewed version.

Never change a failed or skipped test to passed. Never claim a test ran unless its result is recorded.

## Runtime blockers that must remain visible
- Agent orchestration and concurrency enforcement.
- Active-time metering, two-hour work-block approval, and Stripe collection/refunds.
- Isolated project build runners and preview deployments.
- Browser/device end-to-end QA infrastructure.
- Malware/file-signature scanning and media re-encoding/moderation.
- Provider-specific model, storage, rendering, and integration credentials.
- Reconciled Supabase migration history before any production schema changes.