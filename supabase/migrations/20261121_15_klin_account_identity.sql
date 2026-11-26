-- Klin public account identities. Repository-only migration; do not apply to production without owner approval.
create table if not exists public.klin_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  account_number char(6) not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint klin_profiles_username_length check (char_length(username) > 3 and char_length(username) < 50)
);
create unique index if not exists klin_profiles_username_lower_uidx on public.klin_profiles (lower(username));
create index if not exists klin_profiles_account_number_idx on public.klin_profiles(account_number);
alter table public.klin_profiles enable row level security;
revoke all on public.klin_profiles from anon, authenticated;
grant select on public.klin_profiles to authenticated;
create policy "Users can read their own Klin profile"
  on public.klin_profiles for select to authenticated
  using (auth.uid() = user_id);

create or replace function public.klin_create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  candidate text;
  requested_username text;
begin
  requested_username := coalesce(new.raw_user_meta_data ->> 'username', '');
  if char_length(requested_username) <= 3 or char_length(requested_username) >= 50 then
    requested_username := 'user_' || substr(replace(new.id::text, '-', ''), 1, 12);
  end if;

  loop
    candidate := lpad((floor(random() * 1000000))::bigint::text, 6, '0');
    exit when not exists (select 1 from public.klin_profiles p where p.account_number = candidate);
  end loop;

  insert into public.klin_profiles(user_id, username, account_number)
  values (new.id, requested_username, candidate)
  on conflict (user_id) do nothing;
  return new;
exception when unique_violation then
  raise exception 'Klin username is already taken. Choose another username.';
end;
$$;

drop trigger if exists klin_create_profile_after_signup on auth.users;
create trigger klin_create_profile_after_signup
  after insert on auth.users
  for each row execute function public.klin_create_profile_for_new_user();
