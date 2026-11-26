-- Apply only after reconciling the live Supabase migration history with
-- supabase/migrations in the repository and converting this patch into a tracked
-- migration. This file is intentionally NOT applied to production by this commit.
--
-- Financial and payout tables are mutated only by trusted server-side handlers.
-- Authenticated users retain owner-scoped SELECT through existing RLS policies.
-- Anonymous clients receive no direct table privileges.

begin;

revoke all privileges on table
  public.wallets,
  public.wallet_transactions,
  public.marketplace_orders,
  public.creator_payouts
from anon, authenticated;

grant select on table
  public.wallets,
  public.wallet_transactions,
  public.marketplace_orders,
  public.creator_payouts
to authenticated;

commit;
