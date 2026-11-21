-- Klin internal agent coordination, feedback ideas, appeals and quote records.
-- Repository-only migration: do not apply to production until the owner approves migration reconciliation.

create table if not exists public.klin_feedback_ideas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  sender_email text,
  source text not null default 'web' check (source in ('web','email')),
  source_message_id text unique,
  title text not null,
  idea text not null,
  category text not null default 'feature' check (category in ('feature','improvement','bug','business','other')),
  status text not null default 'new' check (status in ('new','triaged','planned','declined','implemented')),
  xzello_summary text,
  klinie_decision text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists klin_feedback_ideas_status_created_idx on public.klin_feedback_ideas(status, created_at desc);
alter table public.klin_feedback_ideas enable row level security;
revoke all on public.klin_feedback_ideas from anon, authenticated;
grant select, insert, update, delete on public.klin_feedback_ideas to service_role;

create table if not exists public.klin_appeals (
  id uuid primary key default gen_random_uuid(),
  transaction_reference text not null,
  appellant_user_id uuid references auth.users(id) on delete set null,
  respondent_user_id uuid references auth.users(id) on delete set null,
  appeal_type text not null check (appeal_type in ('order','listing','account','moderation','late_refund','other')),
  status text not null default 'submitted' check (status in ('submitted','evidence_requested','xzello_review','human_review','approved','partially_approved','denied','closed')),
  evidence jsonb not null default '[]'::jsonb,
  xzello_analysis jsonb,
  pricy_refund_award_cents bigint check (pricy_refund_award_cents is null or pricy_refund_award_cents >= 0),
  human_decision_by uuid references auth.users(id) on delete set null,
  human_decision_at timestamptz,
  decision_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists klin_appeals_status_created_idx on public.klin_appeals(status, created_at desc);
alter table public.klin_appeals enable row level security;
revoke all on public.klin_appeals from anon, authenticated;
grant select, insert, update, delete on public.klin_appeals to service_role;

create table if not exists public.klin_pricing_quotes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_type text not null check (project_type in ('website','app','business','other')),
  requirements jsonb not null default '{}'::jsonb,
  currency text not null default 'usd' check (currency = 'usd'),
  subtotal_cents bigint not null check (subtotal_cents >= 0),
  discount_cents bigint not null default 0 check (discount_cents >= 0),
  total_cents bigint not null check (total_cents >= 0),
  payment_plan jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft','presented','accepted','expired','cancelled','paid')),
  stripe_checkout_session_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists klin_pricing_quotes_user_created_idx on public.klin_pricing_quotes(user_id, created_at desc);
alter table public.klin_pricing_quotes enable row level security;
revoke all on public.klin_pricing_quotes from anon, authenticated;
grant select, insert, update, delete on public.klin_pricing_quotes to service_role;
