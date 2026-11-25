create table if not exists public.klin_protected_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  account_type text not null check (account_type in ('ceo','test')),
  security_email text not null,
  security_email_verified_at timestamptz,
  state text not null default 'active' check (state in ('active','locked')),
  lock_reason text,
  locked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.klin_security_change_challenges (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  change_type text not null check (change_type in ('email','password')),
  new_email text,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts integer not null default 0 check (attempts between 0 and 5),
  verified_at timestamptz,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint klin_security_change_email_required check (
    (change_type = 'email' and new_email is not null) or
    (change_type = 'password' and new_email is null)
  )
);

create index if not exists klin_security_change_user_created_idx
  on public.klin_security_change_challenges(user_id, created_at desc);
create index if not exists klin_security_change_expiry_idx
  on public.klin_security_change_challenges(expires_at)
  where consumed_at is null;

create table if not exists public.klin_security_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  outcome text not null check (outcome in ('allowed','blocked','pending','failed','alert')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists klin_security_events_user_created_idx
  on public.klin_security_events(user_id, created_at desc);

alter table public.klin_protected_accounts enable row level security;
alter table public.klin_security_change_challenges enable row level security;
alter table public.klin_security_events enable row level security;

revoke all on public.klin_protected_accounts from anon, authenticated;
revoke all on public.klin_security_change_challenges from anon, authenticated;
revoke all on public.klin_security_events from anon, authenticated;

comment on table public.klin_protected_accounts is
  'Server-managed protected CEO and test account registry. No client role has direct access.';
comment on table public.klin_security_change_challenges is
  'Server-only one-time email verification challenges for sensitive account changes.';
comment on table public.klin_security_events is
  'Server-only append-oriented audit trail for account security events.';
