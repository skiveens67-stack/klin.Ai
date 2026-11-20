# Klin release decision register

**Status:** Working checklist for the product owner. No product features were deleted or disabled by this document.
**Scope:** Accessible repository and live-service evidence reviewed through 2026-11-20.
**Rule:** Keep unfinished capabilities hidden, unavailable, or explicitly marked as planned until their implementation and acceptance tests exist. Do not represent a schema, UI concept, or queued record as a working feature.

## A. Work that can continue without product deletion decisions

| Area | Current evidence | Remaining work |
|---|---|---|
| Chat history | Conversation tables and owner-scoped APIs exist. APIs now list, open, rename, archive, restore, and save user messages. | Integrate the frontend history UI; connect a real Klinie model/streaming provider; persist assistant replies server-side; add browser tests. |
| Request security | Shared bounded JSON parser is used by mutating JSON APIs. Six unit tests cover parser and origin behavior. | Wait for CI test run; add API integration and RLS tests. |
| Media upload | Private storage bucket, signed upload URLs, and asset records exist. Confirmation now checks stored size and content type. | Add file-signature inspection, malware scanning, image/video re-encoding, quota enforcement, and moderation pipeline. |
| Profile/account | Session-authenticated profile APIs and allowlisted profile updates exist. | Add route integration tests and verify real auth flows with test accounts. |
| Marketplace | Draft listings and auction bids exist with owner checks and idempotency. | Add verified-age authorization, checkout, settlement, refunds, disputes, seller verification, and payouts before enabling transactions. |
| Social/creator | Projects and posts can be saved as drafts; publishing is blocked pending moderation. | Implement and operate moderation worker and public publishing flow. |

## B. Critical release blockers — do not enable until fixed and verified

1. **Frontend source integration:** The accessible GitHub repository's `main` branch contains only a README. The backend branch does not contain the Grok frontend component tree. The live Klin interface cannot be fully reviewed, wired to the new chat history APIs, or browser-tested from this source.
2. **Klinie inference:** Conversation storage exists, but no approved model provider, streaming endpoint, provider credentials, worker, or assistant-message persistence flow is connected.
3. **Migration reconciliation:** Live Supabase history has 16 records; the repository has 11 SQL files. Exact source reconciliation is required before any production DDL.
4. **Trusted-contact encryption invariant:** Authenticated still has direct INSERT privilege on `trusted_contacts.secret_reference`. The proposed revoke SQL exists but is not applied. This allows a user to bypass the app encryption route for their own row.
5. **Financial table least privilege:** Broad grants remain on financial tables. Current RLS policies limit observed user access, but grants should be tightened in a reconciled forward migration.
6. **Age and guardian enforcement:** No verified age-assurance system, 18–20/21+ distinction, or complete server-side guardian authorization engine is present. Self-declared age bands are not proof.
7. **Dual-channel OTP:** Email/phone timestamps exist, but a complete email-plus-SMS challenge, resend limits, recovery, and abuse controls are not implemented end to end.
8. **Hardware safety:** Device commands are queued for a future gateway. No authenticated gateway, device acknowledgements, firmware watchdog, physical stop, or real emergency-stop path was verified. Hardware control must remain unavailable.
9. **Moderation and background workers:** No running moderation, communications, media-generation, or general integration worker was verified.
10. **Production operations:** Backup restoration, monitoring/alerting, distributed rate limiting, incident runbooks, and full end-to-end tests still need evidence.
11. **Vercel source binding:** The current Vercel project named `klin` is still linked to GitHub repository `skiveens67-stack/klin`, not `skiveens67-stack/klin.Ai`. Its attached domains are Vercel-generated preview/production hostnames; no custom domain was returned for this project. Do not repoint or deploy until the frontend source and intended hosting/domain arrangement are confirmed.

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

## D. Explicit non-actions

- No feature or user data was deleted.
- No production Supabase migration or DDL was applied.
- No Stripe products, prices, charges, refunds, or payouts were created.
- No Vercel project, domain, environment variable, or deployment was changed.
- The draft backend pull request remains open and unmerged.
- Kai.AI was not accessed or modified.
