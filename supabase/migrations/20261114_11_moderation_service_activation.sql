-- Keep creator publishing blocked for authenticated users, while allowing trusted server-side moderation.
create or replace function public.enforce_marketplace_listing_controls()
returns trigger language plpgsql set search_path=public as $$
declare project_owner uuid;
begin
 select owner_user_id into project_owner from public.creator_projects where id=new.project_id;
 if project_owner is null or project_owner<>new.seller_user_id then raise exception 'Marketplace seller must own the listed project'; end if;
 new.creator_share_bps:=8500; new.platform_share_bps:=1000; new.charity_share_bps:=500;
 if coalesce(auth.role(),'')='authenticated' and new.status not in ('draft','closed') then
  raise exception 'Listings require backend moderation before activation';
 end if;
 return new;
end; $$;
revoke all on function public.enforce_marketplace_listing_controls() from public,anon,authenticated;
