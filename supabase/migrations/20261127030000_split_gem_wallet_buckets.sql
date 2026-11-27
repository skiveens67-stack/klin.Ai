-- Keep Purchased Gems and Subscription Gems in separate balances.
-- balance_gems remains the aggregate total for compatibility with existing readers.

alter table public.wallets
  add column if not exists purchased_gems bigint not null default 0,
  add column if not exists subscription_gems bigint not null default 0;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'wallets_purchased_gems_nonnegative'
      and conrelid = 'public.wallets'::regclass
  ) then
    alter table public.wallets
      add constraint wallets_purchased_gems_nonnegative check (purchased_gems >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'wallets_subscription_gems_nonnegative'
      and conrelid = 'public.wallets'::regclass
  ) then
    alter table public.wallets
      add constraint wallets_subscription_gems_nonnegative check (subscription_gems >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'wallet_transactions_wallet_bucket_check'
      and conrelid = 'public.wallet_transactions'::regclass
  ) then
    alter table public.wallet_transactions
      add constraint wallet_transactions_wallet_bucket_check
      check (wallet_bucket in ('purchased', 'subscription', 'mixed'));
  end if;
end
$$;

alter table public.wallet_transactions
  add column if not exists wallet_bucket text not null default 'purchased';

-- Existing aggregate balances are preserved as Purchased Gems. The preview
-- database currently has no existing balances or transactions.
update public.wallets
set purchased_gems = balance_gems,
    subscription_gems = 0
where purchased_gems = 0
  and subscription_gems = 0
  and balance_gems > 0;

update public.wallets
set balance_gems = purchased_gems + subscription_gems,
    updated_at = now();

comment on column public.wallets.purchased_gems is
  'Purchased Gems. These may be used for Klin Store purchases.';
comment on column public.wallets.subscription_gems is
  'Subscription and promotional Gems. These are not spendable in the Klin Store.';
comment on column public.wallet_transactions.wallet_bucket is
  'Balance bucket affected by this ledger transaction: purchased, subscription, or mixed.';

create or replace function public.post_wallet_transaction(
  p_user_id uuid,
  p_delta_gems bigint,
  p_transaction_type text,
  p_idempotency_key text,
  p_description text default null,
  p_provider_reference text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns public.wallet_transactions
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  w public.wallets%rowtype;
  existing_tx public.wallet_transactions%rowtype;
  result_tx public.wallet_transactions%rowtype;
  v_bucket text;
  v_purchased_delta bigint := 0;
  v_subscription_delta bigint := 0;
  v_amount bigint;
  v_new_balance bigint;
  v_metadata jsonb := coalesce(p_metadata, '{}'::jsonb);
begin
  if p_user_id is null then
    raise exception 'A user is required';
  end if;
  if p_delta_gems = 0 then
    raise exception 'Transaction amount cannot be zero';
  end if;
  if p_idempotency_key is null or length(trim(p_idempotency_key)) < 8 then
    raise exception 'A valid idempotency key is required';
  end if;
  if p_transaction_type not in (
    'purchase', 'subscription_grant', 'creator_payout', 'refund',
    'promotion', 'adjustment', 'spend', 'reversal'
  ) then
    raise exception 'Invalid transaction type';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_user_id::text), hashtext(p_idempotency_key));

  select * into existing_tx
  from public.wallet_transactions
  where user_id = p_user_id and idempotency_key = p_idempotency_key;

  if found then
    return existing_tx;
  end if;

  insert into public.wallets(user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  select * into w
  from public.wallets
  where user_id = p_user_id
  for update;

  if p_delta_gems > 0 then
    v_bucket := coalesce(
      nullif(v_metadata->>'wallet_bucket', ''),
      case
        when p_transaction_type in ('subscription_grant', 'promotion') then 'subscription'
        else 'purchased'
      end
    );

    if p_transaction_type = 'purchase' and v_bucket <> 'purchased' then
      raise exception 'Purchase credits must be posted to the Purchased Gems bucket';
    end if;
    if p_transaction_type = 'subscription_grant' and v_bucket <> 'subscription' then
      raise exception 'Subscription grants must be posted to the Subscription Gems bucket';
    end if;

    if v_bucket = 'purchased' then
      v_purchased_delta := p_delta_gems;
    elsif v_bucket = 'subscription' then
      v_subscription_delta := p_delta_gems;
    else
      raise exception 'Invalid wallet bucket';
    end if;

  elsif p_transaction_type = 'spend' then
    v_bucket := nullif(v_metadata->>'wallet_bucket', '');
    v_amount := abs(p_delta_gems);

    if v_bucket = 'purchased' then
      v_purchased_delta := p_delta_gems;
    elsif v_bucket = 'subscription' then
      v_subscription_delta := p_delta_gems;
    elsif v_bucket is null then
      -- Default AI/feature spending consumes subscription Gems first,
      -- preserving Purchased Gems for Store purchases.
      v_subscription_delta := -least(w.subscription_gems, v_amount);
      v_purchased_delta := -(v_amount - least(w.subscription_gems, v_amount));
      if v_subscription_delta <> 0 and v_purchased_delta <> 0 then
        v_bucket := 'mixed';
      elsif v_subscription_delta <> 0 then
        v_bucket := 'subscription';
      else
        v_bucket := 'purchased';
      end if;
    else
      raise exception 'Invalid wallet bucket';
    end if;

  else
    v_bucket := coalesce(nullif(v_metadata->>'wallet_bucket', ''), 'purchased');
    if v_bucket = 'purchased' then
      v_purchased_delta := p_delta_gems;
    elsif v_bucket = 'subscription' then
      v_subscription_delta := p_delta_gems;
    else
      raise exception 'Invalid wallet bucket';
    end if;
  end if;

  if w.purchased_gems + v_purchased_delta < 0 then
    raise exception 'Insufficient Purchased Gems balance';
  end if;
  if w.subscription_gems + v_subscription_delta < 0 then
    raise exception 'Insufficient Subscription Gems balance';
  end if;

  v_new_balance :=
    w.purchased_gems + v_purchased_delta +
    w.subscription_gems + v_subscription_delta;

  update public.wallets
  set purchased_gems = purchased_gems + v_purchased_delta,
      subscription_gems = subscription_gems + v_subscription_delta,
      balance_gems = v_new_balance,
      updated_at = now()
  where user_id = p_user_id;

  insert into public.wallet_transactions (
    user_id,
    delta_gems,
    balance_after,
    transaction_type,
    wallet_bucket,
    idempotency_key,
    provider_reference,
    description,
    metadata
  )
  values (
    p_user_id,
    p_delta_gems,
    v_new_balance,
    p_transaction_type,
    v_bucket,
    p_idempotency_key,
    p_provider_reference,
    p_description,
    v_metadata || jsonb_build_object(
      'wallet_bucket', v_bucket,
      'purchased_delta_gems', v_purchased_delta,
      'subscription_delta_gems', v_subscription_delta
    )
  )
  returning * into result_tx;

  return result_tx;
end;
$function$;

revoke all on function public.post_wallet_transaction(uuid, bigint, text, text, text, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.post_wallet_transaction(uuid, bigint, text, text, text, text, jsonb)
  to service_role;
