# Klin release decision register

**Status:** Working checklist for the product owner. No product features were deleted or disabled by this document.
**Scope:** Accessible repository and live-service evidence reviewed through 2026-11-21.
**Rule:** Keep unfinished capabilities hidden, unavailable, or explicitly marked as planned until their implementation and acceptance tests exist. Do not represent a schema, UI concept, or queued record as a working feature.

## A. Work that can continue without product deletion decisions

| Area | Current evidence | Remaining work |
|---|---|---|
| Chat history | Conversation tables, owner-scoped APIs, frontend history UI, and assistant-message persistence path exist. A Vercel AI Gateway adapter is implemented. | Verify provider credentials/model in the deployment, add streaming, and run browser tests. |
| Request security | Shared bounded JSON and raw-text readers cap all JSON mutation bodies and the signed Stripe webhook body. Eight unit tests cover parsing, limits, and origin behavior. Latest CI passed lint, type check, all unit tests, and production build. | Add API integration, abuse/rate-limit, and RLS tests. |
| Media upload | Private bucket is configured with a 100 MiB limit and MIME allowlist; storage RLS restricts read/write/delete to each user's own folder. Signed upload URLs and asset records exist. Confirmation checks stored size and content type. | Add file-signature inspection, malware scanning, image/video re-encoding, quota enforcement, and moderation pipeline. |
| Profile/account | Session-authenticated profile APIs and allowlisted profile updates exist. | Add route integration tests and verify real auth flows with test accounts. |
| Marketplace | Draft listings and auction bids exist with owner checks and idempotency. | Add verified-age authorization, checkout, settlement, refunds, disputes, seller verification, and payouts before enabling transactions. |
| Social/creator | Projects and posts can be saved as drafts; publishing is blocked pending moderation. | Implement and operate moderation worker and public publishing flow. |

## B. Critical release blockers — do not enable until fixed and verified

1. **Frontend source integration:** The backend branch now contains a standalone App Router interface, authenticated workspace pages, and the chat-history UI. It is not a merge of Grok's original local frontend because those source files were not available in the repository. Browser end-to-end tests against a configured preview are still outstanding.
2. **Klinie inference:** A server-side Vercel AI Gateway adapter and assistant-message persistence path exist. The model/provider credentials and selected model are not verified in the deployment, responses are currently non-streaming, and no independent inference worker is configured.
3. **Migration reconciliation:** Live Supabase history has 16 records; the repository has 11 SQL files. Exact source reconciliation is required before any production DDL.
4. **Trusted-contact encryption invariant:** Authenticated still has direct INSERT privilege on `trusted_contacts.secret_reference`. The proposed revoke SQL exists but is not applied. This allows a user to bypass the app encryption route for their own row.
5. **Financial table least privilege:** Broad grants remain on financial tables. Current RLS policies limit observed user access, but grants should be tightened in a reconciled forward migration.
6. **Age and guardian enforcement:** No verified age-assurance system, 18–20/21+ distinction, or complete server-side guardian authorization engine is present. Self-declared age bands are not proof.
7. **Dual-channel OTP:** Email/phone timestamps exist, but a complete email-plus-SMS challenge, resend limits, recovery, and abuse controls are not implemented end to end.
8. **Hardware safety:** Device commands are queued for a future gateway. No authenticated gateway, device acknowledgements, firmware watchdog, physical stop, or real emergency-stop path was verified. Hardware control must remain unavailable.
9. **Moderation and background workers:** No running moderation, communications, media-generation, or general integration worker was verified.
10. **Production operations:** Backup restoration, monitoring/alerting, distributed rate limiting, incident runbooks, and full end-to-end tests still need evidence.
11. **Vercel source binding:** The current Vercel project named `klin` is still linked to GitHub repository `skiveens67-stack/klin`, not `skiveens67-stack/klin.Ai`. Its attached domains are Vercel-generated preview/production hostnames; no custom domain was returned for this project. Do not repoint or deploy until the frontend source and intended hosting/domain arrangement are confirmed.
12. **Primary-domain delegation:** Cloudflare lists `klin.website` as `pending`. Its observed authoritative nameservers are still GoDaddy's `ns65.domaincontrol.com` and `ns66.domaincontrol.com`, while Cloudflare assigned `ganz.ns.cloudflare.com` and `kira.ns.cloudflare.com`. Cloudflare's zone records are therefore not yet authoritative. Do not change registrar nameservers without owner approval.
13. **Support email receiving:** Resend confirms `klin.help` is verified and outbound sending is enabled, but inbound receiving is disabled. If `klin.help` is meant to receive support tickets, its inbound-mail workflow still needs to be selected and configured. If it is only for sending support replies, no change is needed.

## C. Product roadmap decisions for the owner

These are not code deletions. Decide whether each capability remains in the Klin roadmap, is postponed to a later version, or is removed from the product plan.

- Thangie rover, drones, GPS tracker, and emergency hardware controls.
- Tactile avatars, camera-based motion games, and multiplayer AR.
- Klinie Full Proxy / autonomous external actions.
- Dual-gateway banking, Braintree, 85/10/5 settlement, charity disbursements, and creator payouts.
- 21+ Verified Business Exchange, escrow, and business acquisition listings.
- SoundLab, Auto-Cut, image/video generation, and 4K rendering.
- AI tutoring modes, Drama Improv, and live profanity replacement.
- Seasonal prize events and sweepstakes.
- Dignity Shield financial assistance.
- Zero-knowledge encryption claims and any feature that requires broader end-to-end encryption.

## D. Additional live security controls verified

- All four public SECURITY DEFINER functions checked are not executable by `anon` or `authenticated`.
- Their `search_path` is pinned (`public` for application functions, `pg_catalog` for the RLS auto-enable function).
- `anon`, `authenticated`, and `PUBLIC` do not have `CREATE` privilege on the `public` schema.
- No active `anon` policies were found on application tables other than explicit deny-client policies for audit logs, integration jobs, and payment events.
- The trusted-contact INSERT privilege remains the exception described above and must be revoked in a reviewed forward migration.

## E. Explicit non-actions

- No feature or user data was deleted.
- No production Supabase migration or DDL was applied.
- No Stripe products, prices, charges, refunds, or payouts were created.
- No Vercel project, domain, environment variable, or deployment was changed.
- The draft backend pull request remains open and unmerged.
- Kai.AI was not accessed or modified.


## F. Product requirements added 2026-11-20 and implementation status

- **Agent capacity policy:** the source calculates 30 agents for Free and adds 10 for each distinct active paid plan. Unit tests cover Free, paid-plan stacking, duplicate subscription rows, and inactive/unknown plans. This is an entitlement calculation only; the agent scheduler and concurrency enforcement are not connected.
- **Project estimate policy:** the source estimates up to 10 working days (100 active hours), calculates a $7–$35 rate per 10-hour block, and estimates the number of blocks and total. The estimate API request mismatch was corrected so complexity is calculated server-side. This is still a quote only.
- **Payment pause policy:** product rules now specify a 30-minute payment window after each 10 billable active hours, no charge for idle/paused/provider-wait time, idempotent block accounting, verified Stripe payment confirmation, and checkpoint-preserving pause/resume. The timer, notification, checkout-per-block, worker lease, checkpoint persistence, and resume runtime are NOT IMPLEMENTED.
- **Offline policy:** the PWA supports local draft storage and offline status. Project draft sync now carries an idempotency key; its new database column/index is in a forward migration and must not be applied until live migration history is reconciled. The PWA does not currently pause an active cloud build because the cloud build scheduler and durable checkpoint runner are not connected. A production implementation needs worker heartbeats/leases and a persistent job state machine.
- **Test-before-delivery policy:** the required test matrix and delivery states are documented. CI tests this repository itself; there is not yet an isolated project runner that tests each user's generated website, app, game, or video before delivery.

The latest source commit reviewed for this update is `22f231ef085d07d74791fe7b0641b00b44469342`. GitHub Actions run #396 passed dependency installation, lint, TypeScript checking, unit tests, and the Next.js production build. This is CI evidence for the repository, not generated-project QA or launch certification.
