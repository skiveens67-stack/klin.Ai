# Klin V7 — Security acceptance plan

**Status:** Proposed engineering controls; not a certification or launch approval.  
**Branch:** `chatgpt/backend-foundation`  
**Scope:** Architecture/security work that can be specified without changing production services.

## 1. Fail-closed permission model

All authorization is enforced server-side. UI toggles, hidden buttons, client-supplied role names, and client-supplied owner IDs are never authorization evidence.

| Actor / context | Permitted by default | Requires explicit server-side grant | Always denied by default |
|---|---|---|---|
| Signed-in account owner | Read and manage own profile, conversations, wallet view, projects, and settings | Each external action, payment, publishing action, device command, or delegated scope | Access to another owner's private records |
| Managed family profile | Read only data explicitly shared with that profile | Age-appropriate feature scopes granted by the family owner/guardian | Billing, account recovery, changing guardian, expanding own permissions |
| Guardian | Manage only linked managed profiles within verified guardian relationship | Sensitive data access and external actions, with audit trail and revocation | Access to unrelated accounts or bypassing age/feature restrictions |
| Klinie assistant | Read only conversation/context needed for the current task | Each tool/action scope, bounded by owner grant and policy | Payments, purchases, legal commitments, destructive actions, safety-critical device control |
| Trusted contact | Receive only the specific approved check-in/escalation content | Any additional data sharing requires separate consent | Login, account management, reading private chat history, acting as guardian |
| Marketplace participant | Read public/approved listings and own bids/orders | Publishing, bidding, purchasing, seller settlement after eligibility checks | Reading private seller/buyer data or bypassing moderation |
| Device | Authenticate as one registered device and submit signed telemetry | Commands through a separately authenticated gateway and approved owner policy | Arbitrary command execution, owner impersonation, bypassing physical safety controls |
| Service worker | Process only its assigned queue and tenant-scoped job | Narrow service-role capability for that job | Interactive user login, unrestricted table access, broad data export |

Authorization evaluation order:

1. Authenticate the session or service identity.
2. Resolve the resource owner from trusted server-side data.
3. Confirm the requested resource belongs to that owner or is explicitly shared.
4. Evaluate account state, age/eligibility, guardian relationship, and current policy version.
5. Intersect the actor's granted scopes with the action's required scopes.
6. Enforce step-up confirmation for high-impact actions.
7. Apply idempotency, rate limits, and replay protection.
8. Record an audit event without logging secrets or unnecessary sensitive payloads.
9. Fail closed on missing policy, unavailable eligibility evidence, stale grants, or policy-service errors.

A UI selection such as Klinie's Assist / Co-pilot / Full Proxy mode is a preference only. It cannot independently grant capabilities. Full Proxy remains unavailable until its scope model and tests are approved.

## 2. High-impact action classes

The following actions always require explicit confirmation in the initial release:

- Payments, purchases, transfers, refunds, subscriptions, and financial commitments.
- Sending messages or invitations to external recipients.
- Publishing public content, listings, projects, or profile information.
- Deleting accounts, records, projects, or user content.
- Changing credentials, recovery methods, guardians, trusted contacts, or privacy settings.
- Device movement, actuation, unlocking, or any safety-relevant command.

Emergency stop is not an ordinary command. It must use a dedicated, independently authenticated safety path and must remain available when the normal app/API is unavailable. Until a device gateway, firmware acknowledgement, watchdog, loss-of-connectivity behavior, and physical stop are independently validated, the UI must state that emergency stop is unavailable and must not imply that a queued command stops hardware.

## 3. Age and eligibility policy gate

The current product policy is not sufficiently confirmed to implement age-based authorization safely. Do not infer age from a UI dropdown or self-declared profile field alone.

Before enabling age-restricted features, product/legal review must define:

- Jurisdictions served and the applicable age thresholds.
- Which features are available to under-13, 13–15, 16–17, 18–20, and 21+ users.
- Acceptable age-assurance evidence, proportionality, retention, deletion, and appeal.
- Guardian relationship evidence, revocation, custody/dispute handling, and audit requirements.
- Whether the 21+ Business Exchange rule applies globally or only in defined jurisdictions.
- How eligibility changes when evidence expires or a user moves jurisdictions.

Until approved, sensitive age-gated capabilities must be disabled server-side. Do not collect identity documents or biometric data merely to fill a missing policy decision.

## 4. Guardian and managed-profile invariants

- A managed profile cannot promote itself to owner or guardian.
- A guardian can manage only profiles with a verified, active relationship.
- Every grant is scoped to a feature, resource, action, and (where appropriate) time window.
- Grants are revocable; revocation takes effect on the next authorization check and invalidates relevant cached permissions.
- A guardian cannot grant a capability that the account's age/eligibility policy forbids.
- Sensitive access and external actions are auditable.
- Removing a guardian or family relationship must not transfer ownership of private records.
- Missing relationship or policy data means deny, not inherit.

## 5. OTP and account recovery acceptance criteria

The current backend/API documentation does not establish a complete dual-OTP lifecycle. Before release, tests must prove:

- Email and phone verification are separate state transitions.
- A code is bound to one account, one destination, and one purpose.
- Codes are stored hashed, expire, and are invalidated after successful use.
- Attempt and resend limits are enforced server-side and distributed across instances.
- Old codes cannot verify a changed destination.
- Concurrent verification attempts cannot activate an account twice or bypass a state transition.
- Responses do not reveal whether an email or phone number has an account.
- Recovery cannot silently replace both verification factors.
- Phone-number changes require fresh verification and risk checks.
- SMS delivery failure leaves the account in a recoverable, unverified state.

Do not claim that email/phone verification is shipped until the UI, provider configuration, server transitions, rate limits, and recovery path have been tested end to end.

## 6. Migration reconciliation procedure

The inspected live Supabase migration history contains 16 records while the backend branch contains 11 SQL migration files. No migration or direct DDL should be applied until this discrepancy is resolved.

Required procedure:

1. Export the live migration history (version, name, applied timestamp) read-only.
2. Enumerate all repository migration filenames and their exact contents.
3. Match each live version to a repository migration or identify it as an out-of-band migration.
4. Retrieve the SQL/source for every unmatched live migration from the authoritative change record.
5. Compare the resulting live schema, grants, RLS policies, indexes, triggers, and functions with a clean replay of the repository migrations in an isolated database.
6. Review drift and data impact with an operator; produce a signed reconciliation table.
7. Only then create a new forward-only migration for approved privilege changes.
8. Test upgrade and rollback/restore strategy in a disposable environment before any production approval.

Never edit historical migrations to make the counts match. Never reset the live project to make repository history appear clean.

## 7. Required automated test matrix

| Area | Positive case | Negative / abuse case | Race / failure case |
|---|---|---|---|
| RLS ownership | Owner reads own row | User A reads/updates User B row | Concurrent ownership/share revocation |
| Trusted contacts | Server inserts encrypted destination | Direct client insert/select of ciphertext denied | Missing encryption key; concurrent duplicate add |
| Wallet | Verified paid event credits once | Browser cannot write balance or ledger | Duplicate and concurrent webhook delivery |
| Stripe webhook | Valid signature accepted | Invalid signature rejected | Replay and out-of-order events |
| Checkout | Allowlisted plan code creates session | Arbitrary price ID / extra fields rejected | Duplicate request and provider timeout |
| Guardian | Active guardian gets granted scope | Unrelated user or revoked guardian denied | Grant revoked during action |
| Klinie actions | Explicitly granted low-risk action runs | Unapproved high-impact action denied | Duplicate tool call / stale grant |
| Marketplace | Eligible user places valid bid | Ineligible, expired, malformed, or cross-user bid denied | Same idempotency key, competing bids at close |
| Device commands | Authorized request is queued | Offline/unowned/unsafe command rejected | Expiry, replay, gateway disconnect, missing acknowledgement |
| Media | Owner uploads within policy | Cross-user asset read and oversized upload denied | Upload succeeds but confirmation fails |
| OTP | Valid unexpired code advances one state | Wrong, expired, reused, or cross-purpose code denied | Concurrent attempts and resend/verify overlap |

Tests must assert both status codes and absence of unintended side effects. For financial, guardian, and device paths, verify database state after every rejected request.

## 8. Operational readiness evidence

Before production workloads:

- Separate development, preview, and production credentials and services.
- Distributed rate limiting for authentication, OTP, chat/model usage, messaging, marketplace, and device routes.
- Request IDs and a consistent error registry; never log access tokens, OTPs, contact plaintext, or payment secrets.
- Monitoring for failed auth, abnormal spend, webhook failures, queue backlog, device disconnects, and repeated authorization denials.
- Tested backup restore and documented recovery-point/recovery-time objectives.
- Incident runbooks for account takeover, data exposure, payment reconciliation, and device safety events.
- Dependency and secret scanning in CI.
- Browser tests for mobile navigation, chat focus, keyboard/viewport behavior, auth, checkout failure/success, and unavailable integrations.
- Accessibility checks for keyboard navigation, focus visibility, screen readers, reduced motion, and contrast.

## 9. Explicit non-claims

This plan does not establish that age assurance, dual OTP, guardian enforcement, Klinie inference, communication delivery, moderation, marketplace settlement, Stripe products/webhooks, device actuation, or emergency stop are implemented. These remain separate engineering and product acceptance gates.
