-- DRAFT ONLY — DO NOT APPLY.
-- Reconcile this file against the live Supabase migration history and every
-- applied SQL definition before creating or altering any production objects.
-- This file is intentionally stored under docs/sql, not supabase/migrations.

create table if not exists public.business_conversations (
  id uuid primary key default gen_random_uuid(),
  created_by_user_id uuid not null references auth.users(id) on delete restrict,
  subject text check(subject is null or char_length(subject) between 1 and 120),
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.business_conversation_members (
  conversation_id uuid not null references public.business_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'active' check(status in ('active','muted','left','blocked')),
  joined_at timestamptz not null default now(),
  last_read_at timestamptz,
  primary key(conversation_id,user_id)
);
create index if not exists business_conversation_members_user_idx
  on public.business_conversation_members(user_id,status,joined_at desc);

create table if not exists public.business_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.business_conversations(id) on delete cascade,
  sender_user_id uuid not null references auth.users(id) on delete restrict,
  body text not null check(char_length(body) between 1 and 10000),
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  unique(sender_user_id,idempotency_key)
);
create index if not exists business_messages_conversation_created_idx
  on public.business_messages(conversation_id,created_at desc);

create table if not exists public.notification_preferences (
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check(category in ('account','security','billing','family','business','marketplace','social','learning','product')),
  in_app_enabled boolean not null default true,
  email_enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key(user_id,category)
);

create table if not exists public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  channel text not null check(channel in ('email')),
  status text not null default 'queued' check(status in ('queued','processing','sent','failed','canceled')),
  attempts integer not null default 0 check(attempts between 0 and 10),
  available_at timestamptz not null default now(),
  locked_at timestamptz,
  provider_message_id text,
  last_error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  unique(notification_id,channel)
);
create index if not exists notification_deliveries_queue_idx
  on public.notification_deliveries(status,available_at) where status in ('queued','failed');


alter table public.business_conversations enable row level security;
alter table public.business_conversation_members enable row level security;
alter table public.business_messages enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.notification_deliveries enable row level security;

-- SECURITY DEFINER avoids recursive RLS evaluation when membership policies
-- need to check the membership table itself.
create or replace function public.business_is_active_member(p_conversation_id uuid, p_user_id uuid)
returns boolean language sql stable security definer set search_path=public,pg_temp as $
  select exists(select 1 from public.business_conversation_members m
    where m.conversation_id=p_conversation_id and m.user_id=p_user_id and m.status='active');
$;
revoke all on function public.business_is_active_member(uuid,uuid) from public,anon;
grant execute on function public.business_is_active_member(uuid,uuid) to authenticated;

create policy business_conversations_member_select on public.business_conversations
  for select to authenticated using (public.business_is_active_member(id,(select auth.uid())));
create policy business_conversations_member_update on public.business_conversations
  for update to authenticated using (public.business_is_active_member(id,(select auth.uid())))
  with check (public.business_is_active_member(id,(select auth.uid())));
create policy business_conversations_creator_insert on public.business_conversations
  for insert to authenticated with check(created_by_user_id=(select auth.uid()));
create policy business_conversations_creator_delete on public.business_conversations
  for delete to authenticated using(created_by_user_id=(select auth.uid()));

create policy business_members_member_select on public.business_conversation_members
  for select to authenticated using (public.business_is_active_member(conversation_id,(select auth.uid())));
create policy business_members_creator_insert on public.business_conversation_members
  for insert to authenticated with check (
    exists(select 1 from public.business_conversations c
      where c.id=conversation_id and c.created_by_user_id=(select auth.uid()))
  );
create policy business_members_self_update on public.business_conversation_members
  for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));

create policy business_messages_member_select on public.business_messages
  for select to authenticated using (
    exists(select 1 from public.business_conversation_members m
      where m.conversation_id=business_messages.conversation_id
      and m.user_id=(select auth.uid()) and m.status='active')
  );
create policy business_messages_member_insert on public.business_messages
  for insert to authenticated with check (
    sender_user_id=(select auth.uid()) and exists(
      select 1 from public.business_conversation_members m
      where m.conversation_id=business_messages.conversation_id
      and m.user_id=(select auth.uid()) and m.status='active')
  );

create policy notification_preferences_self on public.notification_preferences
  for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy notification_deliveries_deny_clients on public.notification_deliveries
  for all to anon,authenticated using(false) with check(false);
revoke all on public.notification_deliveries from anon,authenticated;

grant select,insert,delete on public.business_conversations to authenticated;
grant select,insert,update on public.business_conversation_members to authenticated;
grant select,insert on public.business_messages to authenticated;
grant select,insert,update,delete on public.notification_preferences to authenticated;

-- Membership changes are intentionally restricted: only the conversation
-- creator can add initial participants through the API; moderation, blocking,
-- leave/rejoin and role management require dedicated reviewed operations.
