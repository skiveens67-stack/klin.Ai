-- Idempotent project creation for offline draft sync.
-- Reconcile the live Supabase migration history before applying this migration.
alter table public.creator_projects
  add column if not exists idempotency_key text;

create unique index if not exists creator_projects_owner_idempotency_key_uidx
  on public.creator_projects(owner_user_id, idempotency_key)
  where idempotency_key is not null;
