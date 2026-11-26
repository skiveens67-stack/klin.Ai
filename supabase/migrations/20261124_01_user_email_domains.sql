create table if not exists public.user_email_domains (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  domain text not null unique,
  resend_domain_id text not null unique,
  status text not null default 'pending' check (status in ('pending', 'verified', 'failed')),
  dns_records jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_email_domains_domain_format check (
    domain = lower(domain)
    and domain ~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$'
  )
);

alter table public.user_email_domains enable row level security;

drop policy if exists "Users can view their own email domains" on public.user_email_domains;
create policy "Users can view their own email domains"
  on public.user_email_domains for select to authenticated
  using ((select auth.uid()) = user_id);

revoke insert, update, delete on public.user_email_domains from anon, authenticated;
grant select on public.user_email_domains to authenticated;

create index if not exists user_email_domains_user_id_idx
  on public.user_email_domains(user_id);
