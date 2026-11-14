-- Klin core platform backend schema. Applied to Supabase project Klin.Ai.
create extension if not exists pgcrypto;

create table if not exists public.families (
 id uuid primary key default gen_random_uuid(), owner_user_id uuid not null references auth.users(id) on delete cascade,
 name text not null check(char_length(name) between 1 and 80), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index if not exists families_one_per_owner_idx on public.families(owner_user_id);
create table if not exists public.managed_profiles (
 id uuid primary key default gen_random_uuid(), family_id uuid not null references public.families(id) on delete cascade,
 display_name text not null check(char_length(display_name) between 1 and 40),
 age_band text not null default 'unknown' check(age_band in ('under_13','13_15','16_17','18_plus','unknown')),
 avatar_url text, controls jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists managed_profiles_family_id_idx on public.managed_profiles(family_id);
create table if not exists public.family_members (
 id uuid primary key default gen_random_uuid(), family_id uuid not null references public.families(id) on delete cascade,
 user_id uuid references auth.users(id) on delete cascade, managed_profile_id uuid references public.managed_profiles(id) on delete cascade,
 role text not null default 'member' check(role in ('owner','administrator','parent_guardian','member','child')),
 status text not null default 'active' check(status in ('invited','active','suspended','removed')),
 permissions jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check((user_id is not null and managed_profile_id is null) or (user_id is null and managed_profile_id is not null))
);
create unique index if not exists family_members_user_unique on public.family_members(family_id,user_id) where user_id is not null;
create unique index if not exists family_members_managed_unique on public.family_members(family_id,managed_profile_id) where managed_profile_id is not null;
create index if not exists family_members_user_id_idx on public.family_members(user_id);
create index if not exists family_members_managed_profile_idx on public.family_members(managed_profile_id);
create table if not exists public.family_invitations (
 id uuid primary key default gen_random_uuid(), family_id uuid not null references public.families(id) on delete cascade,
 invited_by_user_id uuid not null references auth.users(id) on delete cascade, invited_email text not null,
 role text not null default 'member' check(role in ('administrator','parent_guardian','member')),
 token_hash text not null unique, expires_at timestamptz not null, accepted_at timestamptz, revoked_at timestamptz,
 created_at timestamptz not null default now()
);
create index if not exists family_invitations_family_id_idx on public.family_invitations(family_id);
create index if not exists family_invitations_invited_by_idx on public.family_invitations(invited_by_user_id);

create table if not exists public.wallets (
 user_id uuid primary key references auth.users(id) on delete cascade, balance_gems bigint not null default 0 check(balance_gems>=0),
 currency text not null default 'GEMS' check(currency='GEMS'), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.wallet_transactions (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 delta_gems bigint not null check(delta_gems<>0), balance_after bigint not null check(balance_after>=0),
 transaction_type text not null check(transaction_type in ('purchase','subscription_grant','creator_payout','refund','promotion','adjustment','spend','reversal')),
 status text not null default 'posted' check(status in ('posted','reversed')), idempotency_key text not null,
 provider_reference text, description text, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(),
 unique(user_id,idempotency_key)
);
create index if not exists wallet_transactions_user_created_idx on public.wallet_transactions(user_id,created_at desc);

create table if not exists public.subscriptions (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 provider text not null default 'stripe' check(provider='stripe'), provider_customer_id text, provider_subscription_id text unique,
 provider_price_id text, plan_code text not null,
 status text not null check(status in ('incomplete','trialing','active','past_due','canceled','unpaid','paused','incomplete_expired')),
 current_period_start timestamptz, current_period_end timestamptz, cancel_at_period_end boolean not null default false,
 canceled_at timestamptz, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists subscriptions_user_status_idx on public.subscriptions(user_id,status);
create table if not exists public.payment_events (
 id uuid primary key default gen_random_uuid(), provider text not null default 'stripe' check(provider='stripe'),
 provider_event_id text not null unique, event_type text not null,
 processing_status text not null default 'received' check(processing_status in ('received','processing','processed','failed','ignored')),
 payload jsonb not null default '{}'::jsonb, error_message text, received_at timestamptz not null default now(), processed_at timestamptz
);
create table if not exists public.ai_usage_events (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 provider text not null, model text, feature text not null, input_units bigint not null default 0 check(input_units>=0),
 output_units bigint not null default 0 check(output_units>=0), cost_microusd bigint not null default 0 check(cost_microusd>=0),
 request_id text, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create index if not exists ai_usage_events_user_created_idx on public.ai_usage_events(user_id,created_at desc);
create table if not exists public.notifications (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 category text not null, title text not null check(char_length(title) between 1 and 160), body text not null default '',
 action_url text, read_at timestamptz, created_at timestamptz not null default now()
);
create index if not exists notifications_user_created_idx on public.notifications(user_id,created_at desc);
create table if not exists public.connected_integrations (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 provider text not null, external_account_id text, display_name text, scopes text[] not null default '{}',
 status text not null default 'pending' check(status in ('pending','connected','expired','revoked','error')),
 secret_reference text, connected_at timestamptz, last_synced_at timestamptz, created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(), unique(user_id,provider,external_account_id)
);
create index if not exists connected_integrations_user_idx on public.connected_integrations(user_id);

create table if not exists public.conversations (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 title text not null default 'New conversation', assistant_key text not null default 'klinie', archived_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists conversations_user_updated_idx on public.conversations(user_id,updated_at desc);
create table if not exists public.messages (
 id uuid primary key default gen_random_uuid(), conversation_id uuid not null references public.conversations(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade, role text not null check(role in ('user','assistant','system','tool')),
 content text not null, status text not null default 'complete' check(status in ('pending','complete','failed')),
 provider text, model text, token_count bigint check(token_count is null or token_count>=0),
 metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create index if not exists messages_conversation_created_idx on public.messages(conversation_id,created_at);
create index if not exists messages_user_idx on public.messages(user_id);

create table if not exists public.integration_jobs (
 id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete set null,
 provider text not null, job_type text not null, status text not null default 'queued' check(status in ('queued','processing','completed','failed','canceled')),
 idempotency_key text not null unique, payload jsonb not null default '{}'::jsonb, attempts integer not null default 0 check(attempts>=0),
 available_at timestamptz not null default now(), locked_at timestamptz, completed_at timestamptz, last_error text, created_at timestamptz not null default now()
);
create index if not exists integration_jobs_queue_idx on public.integration_jobs(status,available_at) where status in ('queued','failed');
create index if not exists integration_jobs_user_idx on public.integration_jobs(user_id);

create table if not exists public.devices (
 id uuid primary key default gen_random_uuid(), owner_user_id uuid not null references auth.users(id) on delete cascade,
 device_type text not null check(device_type in ('thangie_rover','drone','incense_tracker')),
 name text not null check(char_length(name) between 1 and 80), serial_number text unique,
 status text not null default 'unpaired' check(status in ('unpaired','online','offline','maintenance','disabled')),
 last_seen_at timestamptz, firmware_version text, metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists devices_owner_idx on public.devices(owner_user_id);
create table if not exists public.device_telemetry (
 id bigint generated always as identity primary key, device_id uuid not null references public.devices(id) on delete cascade,
 recorded_at timestamptz not null default now(), battery_percent numeric(5,2) check(battery_percent is null or battery_percent between 0 and 100),
 latitude double precision, longitude double precision, speed_mph numeric(6,3) check(speed_mph is null or speed_mph>=0),
 safe_state text, metrics jsonb not null default '{}'::jsonb
);
create index if not exists device_telemetry_device_time_idx on public.device_telemetry(device_id,recorded_at desc);
create table if not exists public.device_commands (
 id uuid primary key default gen_random_uuid(), device_id uuid not null references public.devices(id) on delete cascade,
 requested_by_user_id uuid not null references auth.users(id) on delete cascade, command_type text not null,
 parameters jsonb not null default '{}'::jsonb,
 status text not null default 'pending_approval' check(status in ('pending_approval','queued','sent','acknowledged','completed','rejected','expired','failed')),
 requires_confirmation boolean not null default true, expires_at timestamptz not null default(now()+interval '2 minutes'),
 created_at timestamptz not null default now(), completed_at timestamptz
);
create index if not exists device_commands_device_created_idx on public.device_commands(device_id,created_at desc);
create index if not exists device_commands_requester_idx on public.device_commands(requested_by_user_id);
create table if not exists public.audit_logs (
 id bigint generated always as identity primary key, actor_user_id uuid references auth.users(id) on delete set null,
 action text not null, resource_type text not null, resource_id text,
 outcome text not null default 'success' check(outcome in ('success','denied','error')),
 ip_hash text, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create index if not exists audit_logs_created_idx on public.audit_logs(created_at desc);
create index if not exists audit_logs_actor_user_idx on public.audit_logs(actor_user_id);

create or replace function public.set_updated_at() returns trigger language plpgsql set search_path=public as $$
begin new.updated_at=now(); return new; end; $$;
do $$ declare t text; begin
 foreach t in array array['families','managed_profiles','family_members','wallets','subscriptions','connected_integrations','conversations','devices'] loop
  execute format('drop trigger if exists %I_set_updated_at on public.%I',t,t);
  execute format('create trigger %I_set_updated_at before update on public.%I for each row execute function public.set_updated_at()',t,t);
 end loop;
end $$;

create or replace function public.create_wallet_for_new_profile() returns trigger
language plpgsql security definer set search_path=public as $$
begin insert into public.wallets(user_id) values(new.id) on conflict(user_id) do nothing; return new; end; $$;
drop trigger if exists profiles_create_wallet on public.profiles;
create trigger profiles_create_wallet after insert on public.profiles for each row execute function public.create_wallet_for_new_profile();
insert into public.wallets(user_id) select id from auth.users on conflict(user_id) do nothing;

create or replace function public.post_wallet_transaction(
 p_user_id uuid,p_delta_gems bigint,p_transaction_type text,p_idempotency_key text,
 p_description text default null,p_provider_reference text default null,p_metadata jsonb default '{}'::jsonb
) returns public.wallet_transactions language plpgsql security definer set search_path=public as $$
declare w public.wallets%rowtype; existing_tx public.wallet_transactions%rowtype; result_tx public.wallet_transactions%rowtype; new_balance bigint;
begin
 if p_delta_gems=0 then raise exception 'Transaction amount cannot be zero'; end if;
 if p_idempotency_key is null or length(trim(p_idempotency_key))<8 then raise exception 'A valid idempotency key is required'; end if;
 if p_transaction_type not in ('purchase','subscription_grant','creator_payout','refund','promotion','adjustment','spend','reversal') then raise exception 'Invalid transaction type'; end if;
 select * into existing_tx from public.wallet_transactions where user_id=p_user_id and idempotency_key=p_idempotency_key;
 if found then return existing_tx; end if;
 insert into public.wallets(user_id) values(p_user_id) on conflict(user_id) do nothing;
 select * into w from public.wallets where user_id=p_user_id for update;
 new_balance:=w.balance_gems+p_delta_gems;
 if new_balance<0 then raise exception 'Insufficient Gems balance'; end if;
 update public.wallets set balance_gems=new_balance where user_id=p_user_id;
 insert into public.wallet_transactions(user_id,delta_gems,balance_after,transaction_type,idempotency_key,provider_reference,description,metadata)
 values(p_user_id,p_delta_gems,new_balance,p_transaction_type,p_idempotency_key,p_provider_reference,p_description,coalesce(p_metadata,'{}'::jsonb))
 returning * into result_tx;
 return result_tx;
end; $$;

alter table public.families enable row level security;
alter table public.managed_profiles enable row level security;
alter table public.family_members enable row level security;
alter table public.family_invitations enable row level security;
alter table public.wallets enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payment_events enable row level security;
alter table public.ai_usage_events enable row level security;
alter table public.notifications enable row level security;
alter table public.connected_integrations enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.integration_jobs enable row level security;
alter table public.devices enable row level security;
alter table public.device_telemetry enable row level security;
alter table public.device_commands enable row level security;
alter table public.audit_logs enable row level security;

create policy families_select_owner on public.families for select to authenticated using(owner_user_id=(select auth.uid()));
create policy families_insert_owner on public.families for insert to authenticated with check(owner_user_id=(select auth.uid()));
create policy families_update_owner on public.families for update to authenticated using(owner_user_id=(select auth.uid())) with check(owner_user_id=(select auth.uid()));
create policy managed_profiles_select_family on public.managed_profiles for select to authenticated using(exists(select 1 from public.families f where f.id=family_id and f.owner_user_id=(select auth.uid())));
create policy managed_profiles_insert_family on public.managed_profiles for insert to authenticated with check(exists(select 1 from public.families f where f.id=family_id and f.owner_user_id=(select auth.uid())));
create policy managed_profiles_update_family on public.managed_profiles for update to authenticated using(exists(select 1 from public.families f where f.id=family_id and f.owner_user_id=(select auth.uid()))) with check(exists(select 1 from public.families f where f.id=family_id and f.owner_user_id=(select auth.uid())));
create policy family_members_select_self_or_owner on public.family_members for select to authenticated using(user_id=(select auth.uid()) or exists(select 1 from public.families f where f.id=family_id and f.owner_user_id=(select auth.uid())));
create policy family_members_insert_owner on public.family_members for insert to authenticated with check(exists(select 1 from public.families f where f.id=family_id and f.owner_user_id=(select auth.uid())));
create policy family_members_update_owner on public.family_members for update to authenticated using(exists(select 1 from public.families f where f.id=family_id and f.owner_user_id=(select auth.uid()))) with check(exists(select 1 from public.families f where f.id=family_id and f.owner_user_id=(select auth.uid())));
create policy family_members_delete_owner on public.family_members for delete to authenticated using(exists(select 1 from public.families f where f.id=family_id and f.owner_user_id=(select auth.uid())));
create policy family_invitations_select_owner on public.family_invitations for select to authenticated using(exists(select 1 from public.families f where f.id=family_id and f.owner_user_id=(select auth.uid())));
create policy family_invitations_insert_owner on public.family_invitations for insert to authenticated with check(invited_by_user_id=(select auth.uid()) and exists(select 1 from public.families f where f.id=family_id and f.owner_user_id=(select auth.uid())));
create policy family_invitations_delete_owner on public.family_invitations for delete to authenticated using(exists(select 1 from public.families f where f.id=family_id and f.owner_user_id=(select auth.uid())));
create policy wallets_select_self on public.wallets for select to authenticated using(user_id=(select auth.uid()));
create policy wallet_transactions_select_self on public.wallet_transactions for select to authenticated using(user_id=(select auth.uid()));
create policy subscriptions_select_self on public.subscriptions for select to authenticated using(user_id=(select auth.uid()));
create policy ai_usage_events_select_self on public.ai_usage_events for select to authenticated using(user_id=(select auth.uid()));
create policy notifications_select_self on public.notifications for select to authenticated using(user_id=(select auth.uid()));
create policy notifications_update_self on public.notifications for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy connected_integrations_select_self on public.connected_integrations for select to authenticated using(user_id=(select auth.uid()));
create policy connected_integrations_delete_self on public.connected_integrations for delete to authenticated using(user_id=(select auth.uid()));
create policy conversations_select_self on public.conversations for select to authenticated using(user_id=(select auth.uid()));
create policy conversations_insert_self on public.conversations for insert to authenticated with check(user_id=(select auth.uid()));
create policy conversations_update_self on public.conversations for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy messages_select_self on public.messages for select to authenticated using(user_id=(select auth.uid()));
create policy messages_insert_self on public.messages for insert to authenticated with check(user_id=(select auth.uid()) and role='user' and exists(select 1 from public.conversations c where c.id=conversation_id and c.user_id=(select auth.uid())));
create policy devices_select_owner on public.devices for select to authenticated using(owner_user_id=(select auth.uid()));
create policy devices_insert_owner on public.devices for insert to authenticated with check(owner_user_id=(select auth.uid()));
create policy devices_update_owner on public.devices for update to authenticated using(owner_user_id=(select auth.uid())) with check(owner_user_id=(select auth.uid()));
create policy device_telemetry_select_owner on public.device_telemetry for select to authenticated using(exists(select 1 from public.devices d where d.id=device_id and d.owner_user_id=(select auth.uid())));
create policy device_commands_select_owner on public.device_commands for select to authenticated using(exists(select 1 from public.devices d where d.id=device_id and d.owner_user_id=(select auth.uid())));
create policy device_commands_insert_owner on public.device_commands for insert to authenticated with check(requested_by_user_id=(select auth.uid()) and exists(select 1 from public.devices d where d.id=device_id and d.owner_user_id=(select auth.uid())));
create policy payment_events_deny_clients on public.payment_events for all to anon,authenticated using(false) with check(false);
create policy integration_jobs_deny_clients on public.integration_jobs for all to anon,authenticated using(false) with check(false);
create policy audit_logs_deny_clients on public.audit_logs for all to anon,authenticated using(false) with check(false);

revoke all on public.payment_events,public.integration_jobs,public.audit_logs from anon,authenticated;
revoke insert,update,delete on public.wallets,public.wallet_transactions,public.subscriptions,public.ai_usage_events from anon,authenticated;
revoke insert,update,delete on public.device_telemetry from anon,authenticated;
revoke update on public.notifications from authenticated;
grant update(read_at) on public.notifications to authenticated;
revoke update on public.devices from authenticated;
grant update(name) on public.devices to authenticated;
revoke all on function public.post_wallet_transaction(uuid,bigint,text,text,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.post_wallet_transaction(uuid,bigint,text,text,text,text,jsonb) to service_role;
revoke all on function public.create_wallet_for_new_profile() from public,anon,authenticated;
revoke all on function public.set_updated_at() from public,anon,authenticated;
