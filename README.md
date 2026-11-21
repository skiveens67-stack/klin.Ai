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

The new `/plans` page separates general memberships, Autonomous Builder capacity plans, and the V6 Ultra Smart add-on. Paid checkout remains fail-closed until each matching Klin Stripe Price ID is configured. V7 safety prompts do not constitute the planned zero-knowledge vault: cryptographic vaulting for identity, biometric, voiceprint and GPS data remains unimplemented and must not be advertised as active.
