# Klin product execution rules

Updated 2026-11-20. These are product requirements, not evidence that every dependent runtime is already operational.

## Offline operation and safe project pausing
- Klin is installable as a progressive web app.
- The service worker may cache the offline fallback and versioned static application assets only.
- Never cache authenticated HTML, private API responses, conversation history, account data, wallet balances, payment data, or credentials in the service worker cache.
- For a short, browser-initiated module request, listen for the browser offline event, abort the active fetch, save the task and module ID locally, and mark the request paused. When online again, wait for the user to press Continue, then retry the saved task. Do not silently resume or double-submit.
- For a long-running autonomous cloud build, stop dispatching new work when connectivity or the user session is lost. Preserve the last durable checkpoint, project files, logs and completed work; resume only after the user chooses Continue.
- A paused job must resume from its last verified checkpoint after service and authentication recover. It must not restart from zero or delete project data.
- A future persistent worker service must use leases or equivalent crash recovery so abandoned workers do not keep consuming billable time.
- Offline mode supports local draft capture and access to the offline screen. It does not run cloud AI models, remote agents, payments, publishing, integrations, or account operations.
- Offline project drafts and the module retry task are stored locally in the browser and sync/retry only after the user reconnects and is authenticated. Sync uses a per-draft idempotency key and must retain unsynced drafts after a network or server error. The `creator_projects.idempotency_key` migration must be applied before this API path is deployed.
- Local browser drafts are currently not encrypted by Klin. Users must not save passwords, payment details, or highly sensitive data in them. A future encrypted local vault requires a separate threat model and recovery design.

## Project estimates, deposit and final payment
- Estimate projects from type, complexity, feature count, integrations, assets, compute usage and the verified builder tier. Estimates are forecasts until the user accepts a locked quote.
- Builder plans: Free = 4 agents / 30 minutes; Starter = $29/month, 10 agents / 24 hours; Pro = $79/month, 20 agents / 5 days and 10% build discount; Business = $199/month, 30+ agents / 10 days and 20% build discount.
- The plan selected in the browser never grants entitlements. Read verified active subscriptions server-side.
- Before a build starts, show a locked quote with the estimated time, price range, verified plan, discount, deposit, final-balance rule and exclusions.
- Deposit: $20 for a standard build; 15% upfront for multi-day builds with an estimated total above $150. Credit 100% of the deposit against the final invoice.
- No agent starts until the deposit is confirmed by a verified payment webhook. A redirect or client-side success state is not proof of payment.
- At 100% verified completion, show the itemized invoice: approved total minus deposit paid equals remaining balance. The user must pay the remaining balance or have an eligible installment plan confirmed before source/API export, watermark removal or production publishing.
- Never silently charge a saved card. No further build charges may be introduced without explicit quote disclosure and user approval.
- Idle, provider-wait, offline and paused time must not be counted as active compute time. The server-side runtime must record active usage and retain immutable billing records.
- The earlier proposal for charging each 10-hour block with a 30-minute payment deadline is superseded by this deposit-and-final-invoice policy unless the product owner explicitly re-approves it. The existing $7–$35 per 10-hour-block estimate is only a provisional pricing input, not a production compute-rate schedule.
- A quote alone is not a payment, a running build, a time meter, or evidence that the billing runtime works.

## Agent capacity
- Free plan maximum: 4 agents and 30 minutes per build.
- Starter: 10 agents and up to 24 hours.
- Pro: 20 agents and up to 5 days, with a 10% build discount.
- Business: 30+ agents and up to 10 days, with a 20% build discount.
- Initial Klin module intelligence ceilings: Free V1, Starter V3, Pro V5, Business V7 Ultra Safe. The server checks the active builder subscription before each module request. Each V2–V7 model ID must be explicitly configured and tested.
- Verify active builder subscription codes server-side: `builder_starter`, `builder_pro`, and `builder_business`. A user cannot grant capacity by changing browser state.
- Do not count canceled, expired, trial, unknown, or duplicate subscriptions. Higher active tier determines capacity; subscriptions do not stack.
- Enforce the limit inside the server-side agent scheduler at job admission and during long-running work. The current API reports entitlements only; it does not launch agents or enforce concurrent execution because the orchestration runtime is not connected.

## Progress reports and review checkpoints
- Set a checkpoint interval between 5% and 20% for each project; default to 10% unless the user chooses another value.
- At each checkpoint, persist a durable project version, report completed work, list known issues, and provide a safe preview/test environment before continuing.
- The user can test the preview and report problems. A failed checkpoint must return to building or needs_attention; never discard the last good checkpoint.
- Checkpoint progress is based on completed, verified work, not elapsed time or generated token estimates.

## Test-before-delivery gate
A generated artifact must not be labeled ready until its applicable checks pass. Store the test report with the project version and make failures visible to the user.

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
- paused: work is stopped and checkpointed; no active-time billing.
- testing: automated checks are running.
- needs_attention: one or more checks failed or could not run.
- ready_for_review: required checks passed; owner review is still required.
- delivered: user accepted the reviewed version.

Never change a failed or skipped test to passed. Never claim a test ran unless its result is recorded.

## Runtime blockers that must remain visible
- Agent orchestration and concurrency enforcement.
- Active-time metering, durable checkpoints, 10-hour billing blocks, 30-minute payment deadlines, and verified Stripe collection.
- Isolated project build runners and preview deployments.
- Browser/device end-to-end QA infrastructure.
- Malware/file-signature scanning and media re-encoding/moderation.
- Provider-specific model, storage, rendering, and integration credentials.
- Reconciled Supabase migration history before any production schema changes.
