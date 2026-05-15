-- LandVerify initial schema
-- Run in Supabase SQL editor or as a migration.

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'request_status') then
    create type request_status as enum (
      'received',
      'assigned',
      'in_progress',
      'report_submitted',
      'pending_manager_review',
      'report_ready',
      'completed',
      'done',
      'closed'
    );
  end if;
end $$;

create table if not exists public.requests (
  id uuid primary key default gen_random_uuid(),
  request_code text unique not null,
  product_id text not null check (product_id in ('basic', 'standard', 'premium')),
  full_name text not null,
  email text not null,
  email_normalized text generated always as (lower(trim(email))) stored,
  phone text not null,
  whatsapp_number text not null,
  state text not null,
  lga text not null,
  land_location_description text not null,
  google_maps_link text,
  coordinates_lat double precision,
  coordinates_lng double precision,
  seller_name text not null,
  seller_phone text not null,
  additional_notes text,
  document_names text[] not null default '{}',
  document_attachments jsonb not null default '[]'::jsonb,
  payment_status text not null default 'unpaid',
  assigned_agent_id uuid,
  assigned_agent_name text,
  assigned_at timestamptz,
  agent_ack_at timestamptz,
  report_submitted_at timestamptz,
  manager_reviewed_at timestamptz,
  completed_at timestamptz,
  done_at timestamptz,
  sla_due_at timestamptz,
  status request_status not null default 'received',
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists requests_email_normalized_idx on public.requests (email_normalized);
create index if not exists requests_status_idx on public.requests (status);
create index if not exists requests_assigned_agent_id_idx on public.requests(assigned_agent_id);
create index if not exists requests_sla_due_at_idx on public.requests(sla_due_at);

create table if not exists public.agents (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  username text unique,
  password_hash text,
  full_name text not null,
  phone text,
  whatsapp_number text,
  coverage_states text[] not null default '{}',
  is_active boolean not null default true,
  agent_onboarding_completed_at timestamptz,
  agent_onboarding_policy_version text,
  last_seen_at timestamptz,
  commission_percent_bp int not null default 2500,
  payout_account_name text,
  payout_bank_name text,
  payout_account_number text,
  created_at timestamptz not null default now()
);

create index if not exists agents_coverage_states_gin_idx
  on public.agents using gin (coverage_states);

create table if not exists public.agent_invites (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  invited_email text,
  expires_at timestamptz not null,
  used_at timestamptz,
  revoked_at timestamptz,
  used_by_agent_id uuid references public.agents(id) on delete set null,
  created_by_admin text not null,
  created_at timestamptz not null default now()
);

create index if not exists agent_invites_pending_idx
  on public.agent_invites (created_at desc)
  where used_at is null;

create index if not exists agent_invites_pending_valid_idx
  on public.agent_invites (created_at desc)
  where used_at is null and revoked_at is null;

create table if not exists public.agent_security_tokens (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents(id) on delete cascade,
  token_hash text not null unique,
  purpose text not null check (purpose in ('password_reset')),
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists agent_security_tokens_agent_created_idx
  on public.agent_security_tokens (agent_id, created_at desc);

create table if not exists public.request_status_events (
  id bigserial primary key,
  request_id uuid not null references public.requests(id) on delete cascade,
  status request_status not null,
  note text,
  actor text not null default 'system',
  created_at timestamptz not null default now()
);

create index if not exists request_status_events_request_id_idx
  on public.request_status_events (request_id, created_at desc);

create table if not exists public.payments (
  id bigserial primary key,
  request_id uuid references public.requests(id) on delete cascade,
  provider text,
  reference text,
  amount_kobo bigint,
  currency text default 'NGN',
  status text not null default 'pending',
  verified_at timestamptz,
  paid_at timestamptz,
  paystack_access_code text,
  metadata jsonb not null default '{}'::jsonb,
  card_origin text,
  channel text,
  customer_email text,
  created_at timestamptz not null default now()
);

create index if not exists payments_request_id_idx on public.payments(request_id);

create unique index if not exists payments_reference_unique
  on public.payments (reference)
  where reference is not null;

create table if not exists public.report_outputs (
  id bigserial primary key,
  request_id uuid not null references public.requests(id) on delete cascade,
  report_version integer not null default 1,
  storage_path text,
  summary text,
  published_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists report_outputs_request_id_idx on public.report_outputs(request_id);

create table if not exists public.request_messages (
  id bigserial primary key,
  request_id uuid not null references public.requests(id) on delete cascade,
  sender_role text not null check (sender_role in ('requester', 'admin', 'manager', 'agent')),
  sender_name text not null,
  sender_email text,
  message_body text not null,
  source text not null default 'web' check (source in ('web', 'mailgun', 'admin')),
  status text not null default 'sent' check (status in ('sent', 'read', 'replied')),
  replied_at timestamptz,
  channel text not null default 'internal' check (channel in ('case', 'internal')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists request_messages_request_id_idx on public.request_messages(request_id, created_at);
create index if not exists request_messages_case_pending_idx
  on public.request_messages (request_id, created_at)
  where channel = 'case' and sender_role = 'requester' and status in ('sent', 'read');

create table if not exists public.agent_findings (
  id bigserial primary key,
  request_id uuid not null references public.requests(id) on delete cascade,
  agent_id uuid references public.agents(id),
  section_key text not null,
  findings text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (request_id, section_key)
);

create index if not exists agent_findings_request_id_idx on public.agent_findings(request_id);

create table if not exists public.agent_response_attachments (
  id bigserial primary key,
  request_id uuid not null references public.requests(id) on delete cascade,
  agent_id uuid not null references public.agents(id) on delete cascade,
  bucket text not null,
  path text not null,
  filename text not null,
  content_type text,
  size_bytes bigint not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists agent_response_attachments_request_id_idx
  on public.agent_response_attachments (request_id, created_at desc);

create table if not exists public.case_tags (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

insert into public.case_tags (slug, label, sort_order)
values
  ('rush', 'Rush', 10),
  ('partner', 'Partner lead', 20),
  ('vip', 'VIP / repeat', 30),
  ('ministry', 'Ministry / official', 40)
on conflict (slug) do nothing;

create table if not exists public.request_case_tags (
  request_id uuid not null references public.requests(id) on delete cascade,
  tag_id uuid not null references public.case_tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (request_id, tag_id)
);

create index if not exists request_case_tags_tag_id_idx on public.request_case_tags (tag_id);

create table if not exists public.agent_payout_batches (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents(id) on delete cascade,
  period_year int not null,
  period_month int not null check (period_month >= 1 and period_month <= 12),
  total_kobo bigint not null check (total_kobo >= 0),
  payment_reference text,
  notes text,
  created_by_admin text not null,
  created_at timestamptz not null default now()
);

create index if not exists agent_payout_batches_agent_period_idx
  on public.agent_payout_batches (agent_id, period_year desc, period_month desc);

create table if not exists public.agent_payout_batch_lines (
  batch_id uuid not null references public.agent_payout_batches(id) on delete cascade,
  request_id uuid not null references public.requests(id) on delete cascade,
  agent_share_kobo bigint not null check (agent_share_kobo >= 0),
  primary key (batch_id, request_id)
);

create table if not exists public.request_agent_economics (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.requests(id) on delete cascade,
  agent_id uuid not null references public.agents(id) on delete cascade,
  revenue_kobo bigint not null check (revenue_kobo >= 0),
  agent_percent_bp int not null check (agent_percent_bp >= 0 and agent_percent_bp <= 10000),
  agent_share_kobo bigint not null check (agent_share_kobo >= 0),
  finalized_at timestamptz not null default now(),
  settled_at timestamptz,
  payout_batch_id uuid references public.agent_payout_batches(id) on delete set null
);

create index if not exists request_agent_economics_agent_settled_idx
  on public.request_agent_economics (agent_id, settled_at, finalized_at desc);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists requests_set_updated_at on public.requests;
create trigger requests_set_updated_at
before update on public.requests
for each row
execute function public.set_updated_at();

drop trigger if exists request_messages_set_updated_at on public.request_messages;
create trigger request_messages_set_updated_at
before update on public.request_messages
for each row
execute function public.set_updated_at();

-- Keep RLS disabled for now (service-role-only server actions).
-- Enable + tighten policies before exposing anon key reads.
alter table public.requests disable row level security;
alter table public.agents disable row level security;
alter table public.request_status_events disable row level security;
alter table public.payments disable row level security;
alter table public.report_outputs disable row level security;
alter table public.request_messages disable row level security;
alter table public.agent_findings disable row level security;
alter table public.agent_response_attachments disable row level security;
alter table public.agent_security_tokens disable row level security;
alter table public.agent_invites disable row level security;
alter table public.case_tags disable row level security;
alter table public.request_case_tags disable row level security;
alter table public.agent_payout_batches disable row level security;
alter table public.agent_payout_batch_lines disable row level security;
alter table public.request_agent_economics disable row level security;

