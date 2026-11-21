# Klin Supabase migration reconciliation — 2026-11-20

**Status: READ-ONLY INVENTORY ONLY — NOT APPROVED FOR DATABASE CHANGES**

Project: `Klin.Ai` (`jkujzqvxzkzgpdlntoek`)

## Observed counts

- Live Supabase migration history: 16 applied records.
- Repository branch `chatgpt/backend-foundation`: 12 SQL migration files.
- The live history uses 14-digit timestamp versions and descriptive names. Repository filenames use the shorter `20261114_NN_...` pattern.
- The counts and naming do not prove a one-to-one mapping. Do not run `db push`, `apply_migration`, direct DDL, reset, or historical migration edits until source SQL for all live records is reconciled.

## Live migration records

| Version | Live name |
|---|---|
| 20261112201331 | restrict_rls_auto_enable_function |
| 20261114150101 | create_klin_identity_and_founder_portal |
| 20261114150228 | increase_referral_code_entropy |
| 20261114164037 | klin_core_platform_backend |
| 20261114164054 | klin_family_and_device_safety_guards |
| 20261114164217 | klin_backend_security_and_query_tuning |
| 20261114164226 | klin_backend_privilege_hardening |
| 20261114164355 | klin_communications_creator_media_learning |
| 20261114164421 | klin_creator_publishing_moderation_guards |
| 20261114164455 | klin_private_media_storage |
| 20261114164547 | klin_backend_foreign_key_indexes |
| 20261114164603 | klin_contact_privacy_and_action_approval |
| 20261114164631 | klin_marketplace_auction_bids |
| 20261114164634 | klin_marketplace_bid_idempotency |
| 20261114164738 | klin_backend_idempotency_and_privacy_fix |
| 20261114164853 | klin_allow_moderation_service_activation |

The twelfth local file, `20261121_12_project_draft_idempotency.sql`, was added after this audit. It is not applied to the live project; do not apply it until the recorded history is reconciled.\n\n## Repository migration files

- `20261114_01_core_platform_backend.sql`
- `20261114_02_family_device_guards.sql`
- `20261114_03_backend_security_hardening.sql`
- `20261114_04_communications_creator_media_learning.sql`
- `20261114_05_private_media_storage.sql`
- `20261114_06_contact_privacy_and_action_approval.sql`
- `20261114_07_creator_moderation_guards.sql`
- `20261114_08_marketplace_auction_bids.sql`
- `20261114_09_backend_foreign_key_indexes.sql`
- `20261114_10_wallet_idempotency_and_privacy.sql`
- `20261114_11_moderation_service_activation.sql`

## Reconciliation work still required

1. Retrieve the authoritative SQL/source for every one of the 16 live migration records.
2. Match each live record to exact repository SQL by content, not by approximate name.
3. Identify every live record that cannot be matched to exact repository SQL content, and determine whether its effects are represented in another repository migration. Do not infer a mapping from similar names or migration counts.
4. Compare live schema, constraints, triggers, functions, grants, RLS policies, storage policies, and indexes against a clean replay in a disposable Supabase project.
5. Record the approved canonical migration order and source commit.
6. Only after independent review, add a forward-only migration for approved privilege fixes.

## Known pending privilege changes

- Revoke authenticated direct INSERT on `public.trusted_contacts`, including `secret_reference`, so contact destinations must pass through the server-side AES-256-GCM encryption route.
- Reduce broad `anon` / `authenticated` table grants on financial tables to the minimum required by their RLS-backed read behavior and service-only write model.

Existing proposed SQL files:
- `docs/sql/revoke_trusted_contact_client_insert.sql`
- `docs/sql/financial_table_least_privilege_after_migration_reconciliation.sql`

Neither patch has been applied to the live project. No production DDL was executed during this review.
