create table if not exists public.marketplace_bids (
 id uuid primary key default gen_random_uuid(), listing_id uuid not null references public.marketplace_listings(id) on delete cascade,
 bidder_user_id uuid not null references auth.users(id) on delete restrict, amount_minor bigint not null check(amount_minor>0),
 status text not null default 'active' check(status in ('active','outbid','accepted','rejected','withdrawn')),
 created_at timestamptz not null default now(), idempotency_key text not null default gen_random_uuid()::text unique
);
create index if not exists marketplace_bids_listing_amount_idx on public.marketplace_bids(listing_id,amount_minor desc,created_at);
create index if not exists marketplace_bids_bidder_idx on public.marketplace_bids(bidder_user_id,created_at desc);
alter table public.marketplace_bids enable row level security;
create policy marketplace_bids_select on public.marketplace_bids for select to authenticated
using(bidder_user_id=(select auth.uid()) or exists(select 1 from public.marketplace_listings l where l.id=listing_id and l.seller_user_id=(select auth.uid())));
create policy marketplace_bids_insert on public.marketplace_bids for insert to authenticated
with check(bidder_user_id=(select auth.uid()) and exists(select 1 from public.marketplace_listings l
where l.id=listing_id and l.status='active' and l.listing_type='auction' and l.seller_user_id<>(select auth.uid())
and l.starts_at<=now() and (l.ends_at is null or l.ends_at>now())));
grant select,insert on public.marketplace_bids to authenticated;

create or replace function public.validate_marketplace_bid()
returns trigger language plpgsql set search_path=public as $$
declare listing_row public.marketplace_listings%rowtype; current_bid bigint;
begin
 select * into listing_row from public.marketplace_listings where id=new.listing_id for update;
 if not found or listing_row.status<>'active' or listing_row.listing_type<>'auction' then raise exception 'Auction is not accepting bids'; end if;
 if listing_row.seller_user_id=new.bidder_user_id then raise exception 'Sellers cannot bid on their own listings'; end if;
 if listing_row.starts_at>now() or (listing_row.ends_at is not null and listing_row.ends_at<=now()) then raise exception 'Auction is not open'; end if;
 select max(amount_minor) into current_bid from public.marketplace_bids where listing_id=new.listing_id and status='active';
 if new.amount_minor<=coalesce(current_bid,listing_row.price_minor,0) then raise exception 'Bid must exceed the current bid or starting price'; end if;
 return new;
end; $$;
drop trigger if exists marketplace_bid_validate on public.marketplace_bids;
create trigger marketplace_bid_validate before insert on public.marketplace_bids for each row execute function public.validate_marketplace_bid();
revoke all on function public.validate_marketplace_bid() from public,anon,authenticated;
