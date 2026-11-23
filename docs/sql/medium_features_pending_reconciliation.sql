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

-- SECURITY DEFINER helpers are kept in the non-exposed private schema.
-- They bind authorization to auth.uid() instead of accepting a caller-selected user.
create schema if not exists private;
revoke all on schema private from public,anon;
grant usage on schema private to authenticated,service_role;

create or replace function private.business_is_active_member(p_conversation_id uuid)
returns boolean language sql stable security definer set search_path=public,pg_temp as $fn$
  select exists(select 1 from public.business_conversation_members m
    where m.conversation_id=p_conversation_id and m.user_id=(select auth.uid()) and m.status='active');
$fn$;
revoke all on function private.business_is_active_member(uuid) from public,anon;
grant execute on function private.business_is_active_member(uuid) to authenticated;

create policy business_conversations_member_select on public.business_conversations
  for select to authenticated using (private.business_is_active_member(id));
create policy business_conversations_member_update on public.business_conversations
  for update to authenticated using (private.business_is_active_member(id))
  with check (private.business_is_active_member(id));
create policy business_conversations_creator_insert on public.business_conversations
  for insert to authenticated with check(created_by_user_id=(select auth.uid()));
create policy business_conversations_creator_delete on public.business_conversations
  for delete to authenticated using(created_by_user_id=(select auth.uid()));

create policy business_members_member_select on public.business_conversation_members
  for select to authenticated using (private.business_is_active_member(conversation_id));
create or replace function private.business_is_creator(p_conversation_id uuid)
returns boolean language sql stable security definer set search_path=public,pg_temp as $fn$
  select exists(select 1 from public.business_conversations c
    where c.id=p_conversation_id and c.created_by_user_id=(select auth.uid()));
$fn$;
revoke all on function private.business_is_creator(uuid) from public,anon;
grant execute on function private.business_is_creator(uuid) to authenticated;

create policy business_members_creator_insert on public.business_conversation_members
  for insert to authenticated with check (public.business_is_creator(conversation_id,(select auth.uid())));
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

grant select,insert,delete on public.business_conversations to authenticated;\ngrant update(last_message_at) on public.business_conversations to authenticated;
grant select,insert,update on public.business_conversation_members to authenticated;
grant select,insert on public.business_messages to authenticated;
grant select,insert,update,delete on public.notification_preferences to authenticated;

-- Membership changes are intentionally restricted: only the conversation
-- creator can add initial participants through the API; moderation, blocking,
-- leave/rejoin and role management require dedicated reviewed operations.

 
create table if not exists public.content_moderation_queue (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  content_type text not null check(content_type in ('project','social_post','marketplace_listing')),
  content_id uuid not null,
  status text not null default 'pending' check(status in ('pending','approved','rejected')),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewer_reference text,
  review_reason text,
  unique(content_type,content_id)
);
create index if not exists content_moderation_queue_status_idx
  on public.content_moderation_queue(status,submitted_at);
alter table public.content_moderation_queue enable row level security;
create policy content_moderation_queue_owner_select on public.content_moderation_queue
  for select to authenticated using(owner_user_id=(select auth.uid()));
revoke insert,update,delete on public.content_moderation_queue from anon,authenticated;
grant select on public.content_moderation_queue to authenticated;
grant select,insert,update,delete on public.content_moderation_queue to service_role;

create or replace function private.moderation_review_content(
  p_queue_id uuid, p_decision text, p_reason text, p_reviewer_reference text
) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare q public.content_moderation_queue%rowtype;
begin
  if p_decision not in ('approved','rejected') then raise exception 'Invalid moderation decision'; end if;
  select * into q from public.content_moderation_queue where id=p_queue_id for update;
  if not found or q.status <> 'pending' then raise exception 'Pending moderation item not found'; end if;
  if q.content_type='project' then
    update public.creator_projects set
      status=case when p_decision='approved' then 'published' else 'archived' end,
      visibility=case when p_decision='approved' then 'public' else 'private' end,
      published_at=case when p_decision='approved' then now() else null end
    where id=q.content_id and owner_user_id=q.owner_user_id and status='draft';
  elsif q.content_type='social_post' then
    update public.social_posts set status=case when p_decision='approved' then 'published' else 'removed' end
    where id=q.content_id and user_id=q.owner_user_id and status='draft';
  elsif q.content_type='marketplace_listing' then
    update public.marketplace_listings set status=case when p_decision='approved' then 'active' else 'closed' end
    where id=q.content_id and seller_user_id=q.owner_user_id and status='draft';
  end if;
  if not found then raise exception 'Draft content no longer exists or is not eligible'; end if;
  update public.content_moderation_queue set status=p_decision,reviewed_at=now(),
    reviewer_reference=left(coalesce(p_reviewer_reference,''),120),review_reason=left(coalesce(p_reason,''),1000)
    where id=q.id;
  return jsonb_build_object('id',q.id,'content_type',q.content_type,'content_id',q.content_id,'status',p_decision);
end;
$$;
revoke all on function private.moderation_review_content(uuid,text,text,text) from public,anon,authenticated;
grant execute on function private.moderation_review_content(uuid,text,text,text) to service_role;
create or replace function public.moderation_review_content(
  p_queue_id uuid, p_decision text, p_reason text, p_reviewer_reference text
) returns jsonb language sql security invoker set search_path=public,private,pg_temp as $
  select private.moderation_review_content($1,$2,$3,$4);
$;
revoke all on function public.moderation_review_content(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.moderation_review_content(uuid,text,text,text) to service_role;


create table if not exists public.project_versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.creator_projects(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  version_number integer not null check(version_number > 0),
  label text not null default 'Checkpoint' check(char_length(label) between 1 and 120),
  snapshot jsonb not null,
  created_at timestamptz not null default now(),
  unique(project_id,version_number)
);
create index if not exists project_versions_owner_idx
  on public.project_versions(owner_user_id,project_id,version_number desc);
alter table public.project_versions enable row level security;
create policy project_versions_owner_select on public.project_versions
  for select to authenticated using(owner_user_id=(select auth.uid()));
revoke insert,update,delete on public.project_versions from anon,authenticated;
grant select on public.project_versions to authenticated;
grant select,insert,update,delete on public.project_versions to service_role;

create or replace function private.create_project_version(p_project_id uuid,p_label text default 'Checkpoint')
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare p public.creator_projects%rowtype; next_version integer; v public.project_versions%rowtype;
begin
  select * into p from public.creator_projects
    where id=p_project_id and owner_user_id=(select auth.uid()) for update;
  if not found then raise exception 'Owned project not found'; end if;
  if p.status not in ('draft','archived') then raise exception 'Only private drafts can be versioned'; end if;
  select coalesce(max(version_number),0)+1 into next_version from public.project_versions where project_id=p.id;
  insert into public.project_versions(project_id,owner_user_id,version_number,label,snapshot)
  values(p.id,p.owner_user_id,next_version,left(coalesce(nullif(trim(p_label),''),'Checkpoint'),120),
    jsonb_build_object('project_type',p.project_type,'title',p.title,'description',p.description,
      'visibility',p.visibility,'status',p.status,'content_reference',p.content_reference,'metadata',p.metadata))
  returning * into v;
  return jsonb_build_object('id',v.id,'project_id',v.project_id,'version_number',v.version_number,'label',v.label,'created_at',v.created_at);
end;
$$;
revoke all on function private.create_project_version(uuid,text) from public,anon;
grant execute on function private.create_project_version(uuid,text) to authenticated;
create or replace function public.create_project_version(p_project_id uuid,p_label text default 'Checkpoint')
returns jsonb language sql security invoker set search_path=public,private,pg_temp as $
  select private.create_project_version($1,$2);
$;
revoke all on function public.create_project_version(uuid,text) from public,anon;
grant execute on function public.create_project_version(uuid,text) to authenticated;

create or replace function private.restore_project_version(p_project_id uuid,p_version_id uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare p public.creator_projects%rowtype; v public.project_versions%rowtype; s jsonb; next_version integer;
begin
  select * into p from public.creator_projects
    where id=p_project_id and owner_user_id=(select auth.uid()) for update;
  if not found then raise exception 'Owned project not found'; end if;
  if p.status not in ('draft','archived') then raise exception 'Only private drafts can be restored'; end if;
  select * into v from public.project_versions
    where id=p_version_id and project_id=p.id and owner_user_id=p.owner_user_id;
  if not found then raise exception 'Project version not found'; end if;
  s:=v.snapshot;
  select coalesce(max(version_number),0)+1 into next_version from public.project_versions where project_id=p.id;
  insert into public.project_versions(project_id,owner_user_id,version_number,label,snapshot)
  values(p.id,p.owner_user_id,next_version,'Before restore',
    jsonb_build_object('project_type',p.project_type,'title',p.title,'description',p.description,
      'visibility',p.visibility,'status',p.status,'content_reference',p.content_reference,'metadata',p.metadata));
  update public.creator_projects set
    project_type=case when s->>'project_type' in ('website','app','game','music','image','video','other') then s->>'project_type' else p.project_type end,
    title=s->>'title', description=coalesce(s->>'description',''),
    visibility=case when s->>'visibility' in ('private','unlisted') then s->>'visibility' else 'private' end,
    status=case when s->>'status'='archived' then 'archived' else 'draft' end,
    content_reference=s->>'content_reference', metadata=coalesce(s->'metadata','{}'::jsonb), published_at=null
  where id=p.id and owner_user_id=p.owner_user_id;
  return jsonb_build_object('project_id',p.id,'restored_version_id',v.id,'backup_version_number',next_version);
end;
$$;
revoke all on function private.restore_project_version(uuid,uuid) from public,anon;
grant execute on function private.restore_project_version(uuid,uuid) to authenticated;
create or replace function public.restore_project_version(p_project_id uuid,p_version_id uuid)
returns jsonb language sql security invoker set search_path=public,private,pg_temp as $
  select private.restore_project_version($1,$2);
$;
revoke all on function public.restore_project_version(uuid,uuid) from public,anon;
grant execute on function public.restore_project_version(uuid,uuid) to authenticated;
