# Klin

Klin is a multi-service AI platform. This repository contains the backend foundation and the standalone App Router frontend scaffold.

- Backend and application branch: `chatgpt/backend-foundation`
- Frontend entry points: `app/`
- Shared workspace UI: `components/`
- API contracts and implementation notes: `docs/`

The current frontend includes authentication, Klinie Chat history, account settings, API-backed workspace modules, project estimates with configurable 5%–20% report intervals, offline project drafts with idempotent sync support, agent entitlement previews, and an Autonomous Builder quote/plans interface. Project execution, active-time billing, worker orchestration, checkpoint previews, and generated-project QA remain gated on runtime infrastructure. The original Grok-generated local frontend source was not present in this repository when this scaffold was integrated, so the current UI is a standalone implementation rather than a merge of those unavailable local files.

Production secrets must be configured through the deployment environment and must never be committed. Keep `main` unchanged until the draft pull request has passed the full acceptance process and the product owner approves the merge and deployment.


The Autonomous Builder includes the Free, Starter, Pro, and Business builder-tier catalogue, verified plan-based entitlement previews, a quote preview with the requested deposit arithmetic, and Stripe checkout routes for paid builder subscriptions. The live multi-agent scheduler, build deposit collection, isolated generated-project QA, cloud checkpoints, offline pause/resume, watermarked delivery sandbox, and pay-to-publish controls are not yet operational; see `docs/KLIN_AUTONOMOUS_BUILDER_SPEC.md` for the implementation boundary and remaining work.


Klin Modules now provides six reusable specialist profiles (Tester, Builder, Animator, Calculator, Helper, Safety & Law), local profile duplication, Klin V1–V6 model-level selection, and authenticated single-module and bounded team execution through the AI Gateway. V2–V6 require their own server-side model IDs. V6 Ultra Smart is a separate paid subscription add-on; V7 Ultra Safe is a free, always-on safety policy applied to every module. Browser-offline cancellation and explicit Continue retry are implemented for an in-flight module request; durable cloud builds and parallel worker scheduling are not yet connected. See `docs/KLIN_AUTONOMOUS_BUILDER_SPEC.md` and `docs/KLIN_PROJECT_EXECUTION_RULES.md`.

Stripe subscription checkout is separate from marketplace seller payouts. The intended user-to-user marketplace model is Stripe Connect with verified connected accounts and payout reconciliation. Klin must not describe itself as a bank or hold user funds in a proprietary cash balance without an approved regulated financial structure. See `docs/KLIN_STRIPE_MARKETPLACE_PAYMENTS.md`.


Klin Modules also supports a bounded parallel team run: enabled module profiles can analyze the same task concurrently, with the server enforcing the user's per-batch agent count and model-level entitlement. Including Klin Builder requires a project with a Stripe-webhook-verified deposit. The current team run returns specialist responses and token usage; it does not yet edit project files or persist a background build job.


Creative Studio includes an AI Image Creator using Klin's Vercel AI Gateway image model or a user's Gemini API key for a single request; Gemini keys are not stored. Video generation remains marked Coming Soon. Signup verification uses Supabase Admin-generated links delivered through Resend. The sending domains are `klin.website` and `klin.help`; runtime deployment requires `RESEND_API_KEY` and the other documented server-only variables in `.env.example`. The preview Vercel project currently has no environment variables, so authentication, AI and payment flows cannot be runtime-verified until the owner configures the preview environment.

The new `/plans` page separates general memberships, Autonomous Builder capacity plans, and the V6 Ultra Smart add-on. Paid checkout remains fail-closed until each matching Klin Stripe Price ID is configured. V7 safety prompts do not constitute the planned cloud zero-knowledge vault: the V7 local vault now encrypts manually entered identity, biometric-pose, voiceprint, GPS and private-note records in the browser with AES-256-GCM, and supports encrypted backup import/export. Cloud sync, automatic capture, account recovery and independent security audit remain outstanding; do not market the local vault as an audited zero-knowledge cloud vault.


Klin V7 Ultra Safe follows three shields: (1) V7 Vaulting for identity, biometric-pose, voice-print, GPS and private records; (2) Dignity Shield private financial assistance and fee waivers with no public hardship badge; and (3) a 21+ Compliance Firewall for Business Exchange. The local encrypted vault is implemented with AES-256-GCM and PBKDF2 and stores ciphertext in browser local storage. Cloud sync, key recovery and independent audit remain outstanding. Dignity Shield assistance is not accepting requests until eligibility/funding rules are approved. Business Exchange remains unavailable until verified 21+ checks and legal review are connected.

The V7 membership proposal is Starter Free, Plus $9.99, Pro $24.99, Family Fortress $34.99, and Merchant & Enterprise $79.99 per month. The plans page also keeps additional creator/developer tiers, Builder plans and the separate V6 Ultra Smart plan. Stripe Price IDs are required before paid checkout can be used. The seven V7 revenue streams are documented in `docs/KLIN_AUTONOMOUS_BUILDER_SPEC.md`; marketplace fees, escrow closing fees, hardware sales, classroom licensing and instant-payout margins are not enabled.


## Website-first AI capability roadmap

Klin.AI is being developed website-first. Video creation remains marked **Coming Soon**. The approved roadmap also includes Klin Voice, Deep Research, user-controlled Memory, a permissioned Computer Agent, scheduled Tasks, a repository-aware Code Agent, Data Lab, secure third-party Connect integrations, a consent-based Meeting Assistant, a searchable Knowledge Base, user-created Custom Agents, and collaborative Workspaces. These are approved product capabilities, not claims that each system is already implemented. They will be delivered in phases with security, privacy, consent, testing, and operational gates. Existing postponed capabilities remain on the roadmap; Business Exchange and escrow are retained, with actual escrow money movement disabled until an approved legal/provider arrangement is in place. See `docs/KLIN_RELEASE_DECISIONS.md`, section G, for scope and boundaries.
