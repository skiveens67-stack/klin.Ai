-- Communications, creator economy, media, social, and learning schema.
create table if not exists public.trusted_contacts (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 display_name text not null check(char_length(display_name) between 1 and 80),
 channel text not null check(channel in ('sms','email','whatsapp','discord','slack','phone')),
 secret_reference text not null, priority integer not null default 100 check(priority between 1 and 1000),
 is_emergency boolean not null default false, verified_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists trusted_contacts_user_idx on public.trusted_contacts(user_id);
create table if not exists public.communication_rules (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 channel text not null check(channel in ('sms','email','whatsapp','discord','slack','phone')),
 permission_tier text not null check(permission_tier in ('ask_first','trusted_circle_auto','full_proxy')),
 enabled boolean not null default false, rule_config jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(user_id,channel)
);
create table if not exists public.scheduled_actions (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 channel text not null, action_type text not null, payload jsonb not null default '{}'::jsonb,
 status text not null default 'pending_approval' check(status in ('pending_approval','approved','queued','processing','completed','canceled','failed','expired')),
 requires_approval boolean not null default true, approved_at timestamptz, run_at timestamptz not null,
 idempotency_key text not null unique, completed_at timestamptz, last_error text, created_at timestamptz not null default now()
);
create index if not exists scheduled_actions_due_idx on public.scheduled_actions(status,run_at) where status in ('approved','queued');
create table if not exists public.checkin_sessions (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 cadence_minutes integer not null check(cadence_minutes between 15 and 10080), last_confirmed_at timestamptz,
 next_due_at timestamptz not null, emergency_contact_id uuid references public.trusted_contacts(id) on delete set null,
 status text not null default 'active' check(status in ('active','paused','completed','escalated')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists checkin_sessions_due_idx on public.checkin_sessions(status,next_due_at);

create table if not exists public.creator_projects (
 id uuid primary key default gen_random_uuid(), owner_user_id uuid not null references auth.users(id) on delete cascade,
 project_type text not null check(project_type in ('website','app','game','music','image','video','other')),
 title text not null check(char_length(title) between 1 and 120), description text not null default '',
 visibility text not null default 'private' check(visibility in ('private','unlisted','public')),
 status text not null default 'draft' check(status in ('draft','published','archived')),
 content_reference text, metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), published_at timestamptz
);
create index if not exists creator_projects_owner_idx on public.creator_projects(owner_user_id,updated_at desc);
create index if not exists creator_projects_public_idx on public.creator_projects(status,visibility,published_at desc);
create table if not exists public.marketplace_listings (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references public.creator_projects(id) on delete cascade,
 seller_user_id uuid not null references auth.users(id) on delete cascade,
 listing_type text not null check(listing_type in ('fixed_price','auction')),
 price_minor bigint check(price_minor is null or price_minor>0), currency text not null default 'usd' check(currency='usd'),
 status text not null default 'draft' check(status in ('draft','active','sold','closed','suspended')),
 starts_at timestamptz not null default now(), ends_at timestamptz,
 creator_share_bps integer not null default 8500 check(creator_share_bps between 0 and 10000),
 platform_share_bps integer not null default 1000 check(platform_share_bps between 0 and 10000),
 charity_share_bps integer not null default 500 check(charity_share_bps between 0 and 10000),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(creator_share_bps+platform_share_bps+charity_share_bps=10000),
 check((listing_type='fixed_price' and price_minor is not null) or listing_type='auction')
);
create index if not exists marketplace_listings_active_idx on public.marketplace_listings(status,starts_at,ends_at);
create index if not exists marketplace_listings_seller_idx on public.marketplace_listings(seller_user_id,created_at desc);
create table if not exists public.marketplace_orders (
 id uuid primary key default gen_random_uuid(), listing_id uuid not null references public.marketplace_listings(id),
 buyer_user_id uuid not null references auth.users(id) on delete restrict, seller_user_id uuid not null references auth.users(id) on delete restrict,
 amount_minor bigint not null check(amount_minor>0), currency text not null default 'usd' check(currency='usd'),
 status text not null default 'pending' check(status in ('pending','paid','refunded','disputed','canceled')),
 stripe_checkout_session_id text unique, stripe_payment_intent_id text unique,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists marketplace_orders_buyer_idx on public.marketplace_orders(buyer_user_id,created_at desc);
create index if not exists marketplace_orders_seller_idx on public.marketplace_orders(seller_user_id,created_at desc);
create table if not exists public.creator_payouts (
 id uuid primary key default gen_random_uuid(), creator_user_id uuid not null references auth.users(id) on delete restrict,
 order_id uuid references public.marketplace_orders(id) on delete set null,
 amount_minor bigint not null check(amount_minor>0), currency text not null default 'usd' check(currency='usd'),
 status text not null default 'pending_review' check(status in ('pending_review','approved','processing','paid','failed','held')),
 provider_transfer_id text unique, created_at timestamptz not null default now(), paid_at timestamptz
);
create index if not exists creator_payouts_creator_idx on public.creator_payouts(creator_user_id,created_at desc);

create table if not exists public.social_posts (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 project_id uuid references public.creator_projects(id) on delete set null, body text not null default '',
 visibility text not null default 'public' check(visibility in ('public','followers','private')),
 status text not null default 'published' check(status in ('draft','published','removed')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists social_posts_public_idx on public.social_posts(status,visibility,created_at desc);
create index if not exists social_posts_user_idx on public.social_posts(user_id,created_at desc);
create table if not exists public.social_interactions (
 id uuid primary key default gen_random_uuid(), post_id uuid not null references public.social_posts(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 interaction_type text not null check(interaction_type in ('like','comment')), body text, created_at timestamptz not null default now(),
 check((interaction_type='comment' and body is not null and char_length(body) between 1 and 2000) or (interaction_type='like' and body is null))
);
create unique index if not exists social_interactions_one_like on public.social_interactions(post_id,user_id) where interaction_type='like';
create index if not exists social_interactions_post_idx on public.social_interactions(post_id,created_at);

create table if not exists public.media_assets (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 asset_type text not null check(asset_type in ('image','video','audio','document')),
 storage_bucket text not null, storage_path text not null, content_type text, size_bytes bigint check(size_bytes is null or size_bytes>=0),
 status text not null default 'uploaded' check(status in ('uploading','uploaded','processing','ready','failed','deleted')),
 metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), unique(storage_bucket,storage_path)
);
create index if not exists media_assets_user_idx on public.media_assets(user_id,created_at desc);
create table if not exists public.media_jobs (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 asset_id uuid references public.media_assets(id) on delete set null, job_type text not null, provider text,
 status text not null default 'queued' check(status in ('queued','processing','completed','failed','canceled')),
 idempotency_key text not null unique, request_metadata jsonb not null default '{}'::jsonb,
 result_metadata jsonb not null default '{}'::jsonb, error_message text, created_at timestamptz not null default now(), completed_at timestamptz
);
create index if not exists media_jobs_user_idx on public.media_jobs(user_id,created_at desc);
create index if not exists media_jobs_queue_idx on public.media_jobs(status,created_at) where status in ('queued','failed');

create table if not exists public.learning_progress (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 course_key text not null, progress_percent numeric(5,2) not null default 0 check(progress_percent between 0 and 100),
 score numeric(6,2) check(score is null or score between 0 and 100), completed_at timestamptz,
 metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(), unique(user_id,course_key)
);
create index if not exists learning_progress_user_idx on public.learning_progress(user_id,updated_at desc);

do $$ declare t text; begin
 foreach t in array array['trusted_contacts','communication_rules','checkin_sessions','creator_projects','marketplace_listings','marketplace_orders','social_posts','learning_progress'] loop
  execute format('drop trigger if exists %I_set_updated_at on public.%I',t,t);
  execute format('create trigger %I_set_updated_at before update on public.%I for each row execute function public.set_updated_at()',t,t);
 end loop;
end $$;

alter table public.trusted_contacts enable row level security;
alter table public.communication_rules enable row level security;
alter table public.scheduled_actions enable row level security;
alter table public.checkin_sessions enable row level security;
alter table public.creator_projects enable row level security;
alter table public.marketplace_listings enable row level security;
alter table public.marketplace_orders enable row level security;
alter table public.creator_payouts enable row level security;
alter table public.social_posts enable row level security;
alter table public.social_interactions enable row level security;
alter table public.media_assets enable row level security;
alter table public.media_jobs enable row level security;
alter table public.learning_progress enable row level security;

create policy trusted_contacts_self on public.trusted_contacts for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy communication_rules_self on public.communication_rules for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy scheduled_actions_select_self on public.scheduled_actions for select to authenticated using(user_id=(select auth.uid()));
create policy scheduled_actions_insert_self on public.scheduled_actions for insert to authenticated with check(user_id=(select auth.uid()) and status='pending_approval' and requires_approval=true);
create policy checkin_sessions_self on public.checkin_sessions for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy creator_projects_select on public.creator_projects for select to authenticated using(owner_user_id=(select auth.uid()) or (status='published' and visibility='public'));
create policy creator_projects_insert on public.creator_projects for insert to authenticated with check(owner_user_id=(select auth.uid()));
create policy creator_projects_update on public.creator_projects for update to authenticated using(owner_user_id=(select auth.uid())) with check(owner_user_id=(select auth.uid()));
create policy marketplace_listings_select on public.marketplace_listings for select to authenticated using(seller_user_id=(select auth.uid()) or (status='active' and starts_at<=now() and (ends_at is null or ends_at>now())));
create policy marketplace_listings_insert on public.marketplace_listings for insert to authenticated with check(seller_user_id=(select auth.uid()) and exists(select 1 from public.creator_projects p where p.id=project_id and p.owner_user_id=(select auth.uid())));
create policy marketplace_listings_update on public.marketplace_listings for update to authenticated using(seller_user_id=(select auth.uid())) with check(seller_user_id=(select auth.uid()));
create policy marketplace_orders_select on public.marketplace_orders for select to authenticated using(buyer_user_id=(select auth.uid()) or seller_user_id=(select auth.uid()));
create policy creator_payouts_select on public.creator_payouts for select to authenticated using(creator_user_id=(select auth.uid()));
create policy social_posts_select on public.social_posts for select to authenticated using(user_id=(select auth.uid()) or (status='published' and visibility='public'));
create policy social_posts_insert on public.social_posts for insert to authenticated with check(user_id=(select auth.uid()));
create policy social_posts_update on public.social_posts for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy social_interactions_select on public.social_interactions for select to authenticated using(exists(select 1 from public.social_posts p where p.id=post_id and (p.user_id=(select auth.uid()) or (p.status='published' and p.visibility='public'))));
create policy social_interactions_insert on public.social_interactions for insert to authenticated with check(user_id=(select auth.uid()) and exists(select 1 from public.social_posts p where p.id=post_id and p.status='published' and p.visibility='public'));
create policy social_interactions_delete on public.social_interactions for delete to authenticated using(user_id=(select auth.uid()));
create policy media_assets_self on public.media_assets for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy media_jobs_select_self on public.media_jobs for select to authenticated using(user_id=(select auth.uid()));
create policy learning_progress_self on public.learning_progress for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));

grant select,insert,update,delete on public.trusted_contacts,public.communication_rules,public.checkin_sessions,
 public.creator_projects,public.marketplace_listings,public.social_posts,public.social_interactions,public.media_assets,public.learning_progress to authenticated;
grant select,insert on public.scheduled_actions to authenticated;
grant select on public.marketplace_orders,public.creator_payouts,public.media_jobs to authenticated;
