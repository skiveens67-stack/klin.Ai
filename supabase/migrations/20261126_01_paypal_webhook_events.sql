-- Server-only inbox for verified PayPal webhook deliveries.
-- Subscription entitlements are intentionally not changed here until the PayPal
-- checkout flow stores a trusted Klin user/plan association for each subscription.
create table if not exists public.paypal_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider_event_id text not null unique,
  event_type text not null,
  resource_type text,
  resource_id text,
  processing_status text not null default 'received'
    check (processing_status in ('received','processed','failed','ignored')),
  payload jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

create index if not exists paypal_webhook_events_received_idx
  on public.paypal_webhook_events(received_at desc);
create index if not exists paypal_webhook_events_type_idx
  on public.paypal_webhook_events(event_type, received_at desc);

alter table public.paypal_webhook_events enable row level security;
revoke all on public.paypal_webhook_events from anon, authenticated;
grant all on public.paypal_webhook_events to service_role;

comment on table public.paypal_webhook_events is
  'Server-only inbox of signature-verified PayPal webhook events. Does not itself grant subscription entitlements.';
