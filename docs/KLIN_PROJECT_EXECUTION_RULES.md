# Klin product execution rules

Updated 2026-11-20. These are product requirements, not evidence that every dependent runtime is already operational.

## Offline operation and safe project pausing
- Klin is installable as a progressive web app.
- The service worker may cache the offline fallback and versioned static application assets only.
- Never cache authenticated HTML, private API responses, conversation history, account data, wallet balances, payment data, or credentials in the service worker cache.
- If Klin or the user's connection becomes unavailable during a cloud build, the build scheduler must stop assigning new work, mark the job paused, and retain the last durable checkpoint, project files, logs, and completed work.
- A paused job must resume from its last verified checkpoint after service and authentication recover. It must not restart from zero or delete project data.
- Use worker heartbeats and expiring execution leases so a crashed worker cannot continue consuming billable time. On lease expiry, mark the job interrupted/paused and reconcile its last checkpoint before resuming.
- Offline mode supports local draft capture and access to the offline screen. It does not run cloud AI models, remote agents, payments, publishing, integrations, or account operations.
- Offline project drafts are stored in browser IndexedDB and sync only after the user reconnects and is authenticated. Sync must be idempotent and retain unsynced drafts after a network or server error.
- Local browser drafts are currently not encrypted by Klin. Users must not save passwords, payment details, or highly sensitive data in them. A future encrypted local vault requires a separate threat model and recovery design.

## Project estimates and work billing
- Estimate projects from type, complexity, feature count, integrations, and assets. The estimate is a forecast, not a guarantee.
- A heavy project may take up to 25 working days (up to 200 active build hours using an eight-hour planning day). Smaller projects should be estimated below this cap. Do not promise that every project takes 25 days.
- Billable work is measured in 10-hour blocks of active build time. Idle time, provider wait time, outages, and paused time are not billable.
- The price for each 10-hour block is calculated from project complexity and must be between $10 and $35. Show the selected rate and amount before the user authorizes work.
- Before a paid build starts, show the estimated active hours, likely working days, complexity, price per 10-hour block, estimated number of blocks, estimated total if all blocks are used, and the pause/payment rules.
- At each completed 10 billable active hours, stop new work and issue an in-app notification with the exact block charge and a payment link. The user has 30 minutes from notification delivery to complete payment.
- If payment is confirmed within 30 minutes, record the payment idempotently and resume from the last verified checkpoint. If it is not confirmed by the deadline, pause the project and retain all work. Do not delete, reset, or overwrite the project.
- Never silently charge a saved card or assume consent to future blocks. Each block requires an explicit payment action by the user. Payment success must come from a verified Stripe webhook, not a browser redirect.
- Use server-side active-time metering and immutable work-block records. A block may be invoiced/charged only once, even if workers retry, webhooks repeat, or the browser refreshes.
- A quote alone is not a payment, a running build, a time meter, or evidence that the billing runtime works.

## Agent capacity
- Free plan maximum: 3 agents.
- Each distinct active paid subscription plan adds 5 agents to the account maximum.
- Calculate entitlements server-side from verified active subscription records. Browser-provided plan names or agent counts must never grant capacity.
- Do not count canceled, expired, trial, unknown, or duplicate copies of the same plan.
- Enforce the limit inside the server-side agent scheduler at job admission and during long-running work. If the user's entitlement decreases, do not kill work unsafely; stop admitting new agents and reconcile active work safely.
- The current capacity endpoint and page report entitlements only. They do not run agents or enforce concurrent execution because the orchestration runtime is not connected.

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
