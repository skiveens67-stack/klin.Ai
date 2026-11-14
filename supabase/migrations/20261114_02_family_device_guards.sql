-- Family ownership, managed-profile limits, and device safety guards.
create or replace function public.add_family_owner_member()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 insert into public.family_members(family_id,user_id,role,status)
 values(new.id,new.owner_user_id,'owner','active') on conflict do nothing;
 return new;
end; $$;
drop trigger if exists families_add_owner_member on public.families;
create trigger families_add_owner_member after insert on public.families
for each row execute function public.add_family_owner_member();

create or replace function public.enforce_managed_profile_limit()
returns trigger language plpgsql set search_path=public as $$
declare profile_count integer;
begin
 perform 1 from public.families where id=new.family_id for update;
 select count(*) into profile_count from public.managed_profiles where family_id=new.family_id;
 if tg_op='UPDATE' and old.family_id=new.family_id then return new; end if;
 if profile_count>=5 then raise exception 'A family can have at most five managed profiles'; end if;
 return new;
end; $$;
drop trigger if exists managed_profiles_limit on public.managed_profiles;
create trigger managed_profiles_limit before insert or update of family_id on public.managed_profiles
for each row execute function public.enforce_managed_profile_limit();

create or replace function public.enforce_device_safety_limits()
returns trigger language plpgsql set search_path=public as $$
declare device_kind text; requested_speed numeric;
begin
 select device_type into device_kind from public.devices where id=new.device_id;
 if device_kind='thangie_rover' and new.parameters ? 'speed_mph' then
  begin requested_speed:=(new.parameters->>'speed_mph')::numeric;
  exception when others then raise exception 'Invalid Thangie rover speed value'; end;
  if requested_speed<0 or requested_speed>1.5 then raise exception 'Thangie rover speed must remain between 0 and 1.5 mph'; end if;
 end if;
 new.status:='pending_approval';
 new.requires_confirmation:=true;
 if new.expires_at is null or new.expires_at>now()+interval '2 minutes' then new.expires_at:=now()+interval '2 minutes'; end if;
 return new;
end; $$;
drop trigger if exists device_commands_safety_guard on public.device_commands;
create trigger device_commands_safety_guard before insert on public.device_commands
for each row execute function public.enforce_device_safety_limits();

revoke all on function public.add_family_owner_member() from public,anon,authenticated;
revoke all on function public.enforce_managed_profile_limit() from public,anon,authenticated;
revoke all on function public.enforce_device_safety_limits() from public,anon,authenticated;
