-- Query-plan and permission hardening for Klin backend.
create unique index if not exists families_one_per_owner_idx on public.families(owner_user_id);
create index if not exists audit_logs_actor_user_idx on public.audit_logs(actor_user_id);
create index if not exists device_commands_requester_idx on public.device_commands(requested_by_user_id);
create index if not exists family_invitations_invited_by_idx on public.family_invitations(invited_by_user_id);
create index if not exists family_members_managed_profile_idx on public.family_members(managed_profile_id);
create index if not exists integration_jobs_user_idx on public.integration_jobs(user_id);
create index if not exists messages_user_idx on public.messages(user_id);

revoke all on function public.add_family_owner_member() from public,anon,authenticated;
revoke all on function public.create_wallet_for_new_profile() from public,anon,authenticated;
revoke all on function public.set_updated_at() from public,anon,authenticated;
revoke all on function public.enforce_managed_profile_limit() from public,anon,authenticated;
revoke all on function public.enforce_device_safety_limits() from public,anon,authenticated;

-- All policies use a scalar SELECT around auth.uid() to avoid per-row auth re-evaluation.
-- The definitions below are intentionally replaced in place.
drop policy if exists families_select_owner on public.families;
create policy families_select_owner on public.families for select to authenticated using(owner_user_id=(select auth.uid()));
drop policy if exists families_insert_owner on public.families;
create policy families_insert_owner on public.families for insert to authenticated with check(owner_user_id=(select auth.uid()));
drop policy if exists families_update_owner on public.families;
create policy families_update_owner on public.families for update to authenticated using(owner_user_id=(select auth.uid())) with check(owner_user_id=(select auth.uid()));
drop policy if exists managed_profiles_select_family on public.managed_profiles;
create policy managed_profiles_select_family on public.managed_profiles for select to authenticated using(exists(select 1 from public.families f where f.id=family_id and f.owner_user_id=(select auth.uid())));
drop policy if exists managed_profiles_insert_family on public.managed_profiles;
create policy managed_profiles_insert_family on public.managed_profiles for insert to authenticated with check(exists(select 1 from public.families f where f.id=family_id and f.owner_user_id=(select auth.uid())));
drop policy if exists managed_profiles_update_family on public.managed_profiles;
create policy managed_profiles_update_family on public.managed_profiles for update to authenticated using(exists(select 1 from public.families f where f.id=family_id and f.owner_user_id=(select auth.uid()))) with check(exists(select 1 from public.families f where f.id=family_id and f.owner_user_id=(select auth.uid())));
drop policy if exists family_members_select_self_or_owner on public.family_members;
create policy family_members_select_self_or_owner on public.family_members for select to authenticated using(user_id=(select auth.uid()) or exists(select 1 from public.families f where f.id=family_id and f.owner_user_id=(select auth.uid())));
drop policy if exists family_members_insert_owner on public.family_members;
create policy family_members_insert_owner on public.family_members for insert to authenticated with check(exists(select 1 from public.families f where f.id=family_id and f.owner_user_id=(select auth.uid())));
drop policy if exists family_members_update_owner on public.family_members;
create policy family_members_update_owner on public.family_members for update to authenticated using(exists(select 1 from public.families f where f.id=family_id and f.owner_user_id=(select auth.uid()))) with check(exists(select 1 from public.families f where f.id=family_id and f.owner_user_id=(select auth.uid())));
drop policy if exists family_members_delete_owner on public.family_members;
create policy family_members_delete_owner on public.family_members for delete to authenticated using(exists(select 1 from public.families f where f.id=family_id and f.owner_user_id=(select auth.uid())));
drop policy if exists family_invitations_select_owner on public.family_invitations;
create policy family_invitations_select_owner on public.family_invitations for select to authenticated using(exists(select 1 from public.families f where f.id=family_id and f.owner_user_id=(select auth.uid())));
drop policy if exists family_invitations_insert_owner on public.family_invitations;
create policy family_invitations_insert_owner on public.family_invitations for insert to authenticated with check(invited_by_user_id=(select auth.uid()) and exists(select 1 from public.families f where f.id=family_id and f.owner_user_id=(select auth.uid())));
drop policy if exists family_invitations_delete_owner on public.family_invitations;
create policy family_invitations_delete_owner on public.family_invitations for delete to authenticated using(exists(select 1 from public.families f where f.id=family_id and f.owner_user_id=(select auth.uid())));
drop policy if exists wallets_select_self on public.wallets;
create policy wallets_select_self on public.wallets for select to authenticated using(user_id=(select auth.uid()));
drop policy if exists wallet_transactions_select_self on public.wallet_transactions;
create policy wallet_transactions_select_self on public.wallet_transactions for select to authenticated using(user_id=(select auth.uid()));
drop policy if exists subscriptions_select_self on public.subscriptions;
create policy subscriptions_select_self on public.subscriptions for select to authenticated using(user_id=(select auth.uid()));
drop policy if exists ai_usage_events_select_self on public.ai_usage_events;
create policy ai_usage_events_select_self on public.ai_usage_events for select to authenticated using(user_id=(select auth.uid()));
drop policy if exists notifications_select_self on public.notifications;
create policy notifications_select_self on public.notifications for select to authenticated using(user_id=(select auth.uid()));
drop policy if exists notifications_update_self on public.notifications;
create policy notifications_update_self on public.notifications for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
drop policy if exists connected_integrations_select_self on public.connected_integrations;
create policy connected_integrations_select_self on public.connected_integrations for select to authenticated using(user_id=(select auth.uid()));
drop policy if exists connected_integrations_delete_self on public.connected_integrations;
create policy connected_integrations_delete_self on public.connected_integrations for delete to authenticated using(user_id=(select auth.uid()));
drop policy if exists conversations_select_self on public.conversations;
create policy conversations_select_self on public.conversations for select to authenticated using(user_id=(select auth.uid()));
drop policy if exists conversations_insert_self on public.conversations;
create policy conversations_insert_self on public.conversations for insert to authenticated with check(user_id=(select auth.uid()));
drop policy if exists conversations_update_self on public.conversations;
create policy conversations_update_self on public.conversations for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
drop policy if exists messages_select_self on public.messages;
create policy messages_select_self on public.messages for select to authenticated using(user_id=(select auth.uid()));
drop policy if exists messages_insert_self on public.messages;
create policy messages_insert_self on public.messages for insert to authenticated with check(user_id=(select auth.uid()) and role='user' and exists(select 1 from public.conversations c where c.id=conversation_id and c.user_id=(select auth.uid())));
drop policy if exists devices_select_owner on public.devices;
create policy devices_select_owner on public.devices for select to authenticated using(owner_user_id=(select auth.uid()));
drop policy if exists devices_insert_owner on public.devices;
create policy devices_insert_owner on public.devices for insert to authenticated with check(owner_user_id=(select auth.uid()));
drop policy if exists devices_update_owner on public.devices;
create policy devices_update_owner on public.devices for update to authenticated using(owner_user_id=(select auth.uid())) with check(owner_user_id=(select auth.uid()));
drop policy if exists device_telemetry_select_owner on public.device_telemetry;
create policy device_telemetry_select_owner on public.device_telemetry for select to authenticated using(exists(select 1 from public.devices d where d.id=device_id and d.owner_user_id=(select auth.uid())));
drop policy if exists device_commands_select_owner on public.device_commands;
create policy device_commands_select_owner on public.device_commands for select to authenticated using(exists(select 1 from public.devices d where d.id=device_id and d.owner_user_id=(select auth.uid())));
drop policy if exists device_commands_insert_owner on public.device_commands;
create policy device_commands_insert_owner on public.device_commands for insert to authenticated with check(requested_by_user_id=(select auth.uid()) and exists(select 1 from public.devices d where d.id=device_id and d.owner_user_id=(select auth.uid())));

create policy payment_events_deny_clients on public.payment_events for all to anon,authenticated using(false) with check(false);
create policy integration_jobs_deny_clients on public.integration_jobs for all to anon,authenticated using(false) with check(false);
create policy audit_logs_deny_clients on public.audit_logs for all to anon,authenticated using(false) with check(false);

revoke update on public.notifications from authenticated;
grant update(read_at) on public.notifications to authenticated;
revoke update on public.devices from authenticated;
grant update(name) on public.devices to authenticated;
drop policy if exists messages_insert_self on public.messages;
create policy messages_insert_self on public.messages for insert to authenticated with check(user_id=(select auth.uid()) and role='user' and exists(select 1 from public.conversations c where c.id=conversation_id and c.user_id=(select auth.uid())));
create or replace function public.enforce_device_safety_limits() returns trigger language plpgsql set search_path=public as $$
declare device_kind text; requested_speed numeric;
begin
 select device_type into device_kind from public.devices where id=new.device_id;
 if device_kind='thangie_rover' and new.parameters ? 'speed_mph' then
  begin requested_speed:=(new.parameters->>'speed_mph')::numeric;
  exception when others then raise exception 'Invalid Thangie rover speed value'; end;
  if requested_speed<0 or requested_speed>1.5 then raise exception 'Thangie rover speed must remain between 0 and 1.5 mph'; end if;
 end if;
 new.status:='pending_approval'; new.requires_confirmation:=true;
 if new.expires_at is null or new.expires_at>now()+interval '2 minutes' then new.expires_at:=now()+interval '2 minutes'; end if;
 return new;
end; $$;
