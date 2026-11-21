-- Idempotent wallet credits and ownership checks for check-in contacts.
create or replace function public.post_wallet_transaction(
 p_user_id uuid,p_delta_gems bigint,p_transaction_type text,p_idempotency_key text,
 p_description text default null,p_provider_reference text default null,p_metadata jsonb default '{}'::jsonb
) returns public.wallet_transactions language plpgsql security definer set search_path=public as $$
declare w public.wallets%rowtype; existing_tx public.wallet_transactions%rowtype; result_tx public.wallet_transactions%rowtype; new_balance bigint;
begin
 if p_delta_gems=0 then raise exception 'Transaction amount cannot be zero'; end if;
 if p_idempotency_key is null or length(trim(p_idempotency_key))<8 then raise exception 'A valid idempotency key is required'; end if;
 if p_transaction_type not in ('purchase','subscription_grant','creator_payout','refund','promotion','adjustment','spend','reversal') then raise exception 'Invalid transaction type'; end if;
 perform pg_advisory_xact_lock(hashtext(p_user_id::text),hashtext(p_idempotency_key));
 select * into existing_tx from public.wallet_transactions where user_id=p_user_id and idempotency_key=p_idempotency_key;
 if found then return existing_tx; end if;
 insert into public.wallets(user_id) values(p_user_id) on conflict(user_id) do nothing;
 select * into w from public.wallets where user_id=p_user_id for update;
 new_balance:=w.balance_gems+p_delta_gems;
 if new_balance<0 then raise exception 'Insufficient Gems balance'; end if;
 update public.wallets set balance_gems=new_balance where user_id=p_user_id;
 insert into public.wallet_transactions(user_id,delta_gems,balance_after,transaction_type,idempotency_key,provider_reference,description,metadata)
 values(p_user_id,p_delta_gems,new_balance,p_transaction_type,p_idempotency_key,p_provider_reference,p_description,coalesce(p_metadata,'{}'::jsonb))
 returning * into result_tx;
 return result_tx;
end; $$;

drop policy if exists checkin_sessions_self on public.checkin_sessions;
create policy checkin_sessions_select_self on public.checkin_sessions for select to authenticated using(user_id=(select auth.uid()));
create policy checkin_sessions_insert_self on public.checkin_sessions for insert to authenticated with check(
 user_id=(select auth.uid()) and (emergency_contact_id is null or exists(select 1 from public.trusted_contacts c where c.id=emergency_contact_id and c.user_id=(select auth.uid())))
);
create policy checkin_sessions_update_self on public.checkin_sessions for update to authenticated using(user_id=(select auth.uid())) with check(
 user_id=(select auth.uid()) and (emergency_contact_id is null or exists(select 1 from public.trusted_contacts c where c.id=emergency_contact_id and c.user_id=(select auth.uid())))
);
create policy checkin_sessions_delete_self on public.checkin_sessions for delete to authenticated using(user_id=(select auth.uid()));

revoke update on public.media_assets from authenticated;
