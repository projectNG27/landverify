-- Case tags, agent commission & payout details, per-request economics, monthly payout batches.

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

alter table public.agents
  add column if not exists commission_percent_bp int not null default 2500;

comment on column public.agents.commission_percent_bp is 'Agent share of case revenue in basis points (10000 = 100%). Default 2500 = 25%.';

alter table public.agents
  add column if not exists payout_account_name text,
  add column if not exists payout_bank_name text,
  add column if not exists payout_account_number text;

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

alter table public.case_tags disable row level security;
alter table public.request_case_tags disable row level security;
alter table public.agent_payout_batches disable row level security;
alter table public.agent_payout_batch_lines disable row level security;
alter table public.request_agent_economics disable row level security;

notify pgrst, 'reload schema';
