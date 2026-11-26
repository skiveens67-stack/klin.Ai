create table if not exists public.support_email_cases (
  id uuid primary key default gen_random_uuid(),
  resend_email_id text not null unique,
  inbox_id text not null,
  thread_id text not null,
  sender text not null,
  sender_address text not null,
  subject text not null default '(no subject)',
  body_text text not null,
  category text not null default 'other' check (category in ('account','billing','technical','product_question','feedback','privacy','security','legal','other')),
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  summary text,
  ai_draft text,
  final_reply text,
  status text not null default 'processing' check (status in ('processing','awaiting_review','needs_human','sent','failed','ignored')),
  requires_human boolean not null default true,
  escalation_reason text,
  processing_error text,
  sent_email_id text,
  sent_by uuid references auth.users(id) on delete set null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists support_email_cases_status_received_idx on public.support_email_cases(status, received_at desc);
create index if not exists support_email_cases_thread_idx on public.support_email_cases(thread_id, received_at desc);
alter table public.support_email_cases enable row level security;
revoke all on public.support_ema¶»§q«^