revoke all on public.trusted_contacts from anon,authenticated;
grant select(id,user_id,display_name,channel,priority,is_emergency,verified_at,created_at,updated_at) on public.trusted_contacts to authenticated;
grant insert(user_id,display_name,channel,secret_reference,priority,is_emergency) on public.trusted_contacts to authenticated;
grant update(display_name,priority,is_emergency) on public.trusted_contacts to authenticated;
grant delete on public.trusted_contacts to authenticated;

create policy scheduled_actions_update_self on public.scheduled_actions for update to authenticated
using(user_id=(select auth.uid()) and status='pending_approval')
with check(user_id=(select auth.uid()) and status in ('approved','canceled') and (status='canceled' or approved_at is not null));
grant update(status,approved_at) on public.scheduled_actions to authenticated;
