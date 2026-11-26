drop policy if exists creator_projects_insert on public.creator_projects;
create policy creator_projects_insert on public.creator_projects for insert to authenticated
with check(owner_user_id=(select auth.uid()) and status='draft');
drop policy if exists creator_projects_update on public.creator_projects;
create policy creator_projects_update on public.creator_projects for update to authenticated
using(owner_user_id=(select auth.uid())) with check(owner_user_id=(select auth.uid()) and status in ('draft','archived'));

drop policy if exists social_posts_insert on public.social_posts;
create policy social_posts_insert on public.social_posts for insert to authenticated
with check(user_id=(select auth.uid()) and status='draft');
drop policy if exists social_posts_update on public.social_posts;
create policy social_posts_update on public.social_posts for update to authenticated
using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()) and status in ('draft','removed'));

drop policy if exists marketplace_listings_insert on public.marketplace_listings;
create policy marketplace_listings_insert on public.marketplace_listings for insert to authenticated
with check(seller_user_id=(select auth.uid()) and status='draft' and exists(
 select 1 from public.creator_projects p where p.id=project_id and p.owner_user_id=(select auth.uid()) and p.status='draft'
));
drop policy if exists marketplace_listings_update on public.marketplace_listings;
create policy marketplace_listings_update on public.marketplace_listings for update to authenticated
using(seller_user_id=(select auth.uid())) with check(seller_user_id=(select auth.uid()) and status in ('draft','closed'));

create or replace function public.enforce_marketplace_listing_controls()
returns trigger language plpgsql set search_path=public as $$
declare project_owner uuid;
begin
 select owner_user_id into project_owner from public.creator_projects where id=new.project_id;
 if project_owner is null or project_owner<>new.seller_user_id then raise exception 'Marketplace seller must own the listed project'; end if;
 new.creator_share_bps:=8500; new.platform_share_bps:=1000; new.charity_share_bps:=500;
 if coalesce(auth.role(),'')='authenticated' and new.status not in ('draft','closed') then raise exception 'Listings require backend moderation before activation'; end if;
 return new;
end; $$;
drop trigger if exists marketplace_listing_controls on public.marketplace_listings;
create trigger marketplace_listing_controls before insert or update on public.marketplace_listings
for each row execute function public.enforce_marketplace_listing_controls();
revoke all on function public.enforce_marketplace_listing_controls() from public,anon,authenticated;
alter table public.social_posts alter column status set default 'draft';
