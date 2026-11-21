# Klin

Klin is a multi-service AI platform. This repository contains the backend foundation and the standalone App Router frontend scaffold.

- Backend and application branch: `chatgpt/backend-foundation`
- Frontend entry points: `app/`
- Shared workspace UI: `components/`
- API contracts and implementation notes: `docs/`

The current frontend includes authentication, Klinie Chat history, account settings, API-backed workspace modules, project estimates with configurable 5%–20% report intervals, offline project drafts with idempotent sync support, agent entitlement previews, and an Autonomous Builder quote/plans interface. Project execution, active-time billing, worker orchestration, checkpoint previews, and generated-project QA remain gated on runtime infrastructure. The original Grok-generated local frontend source was not present in this repository when this scaffold was integrated, so the current UI is a standalone implementation rather than a merge of those unavailable local files.

Production secrets must be configured through the deployment environment and must never be committed. Keep `main` unchanged until the draft pull request has passed the full acceptance process and the product owner approves the merge and deployment.


The Autonomous Builder includes the Free, Starter, Pro, and Business builder-tier catalogue, verified plan-based entitlement previews, a quote preview with the requested deposit arithmetic, and Stripe checkout routes for paid builder subscriptions. The live multi-agent scheduler, build deposit collection, isolated generated-project QA, cloud checkpoints, offline pause/resume, watermarked delivery sandbox, and pay-to-publish controls are not yet operational; see `docs/KLIN_AUTONOMOUS_BUILDER_SPEC.md` for the implementation boundary and remaining work.
