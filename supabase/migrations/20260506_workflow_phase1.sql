-- Phase 1/2 workflow expansion: roles, assignment, manager dashboard support

create extension if not exists pgcrypto;

alter type request_status add value if not exists 'assigned';
alter type request_status add value if not exists 'in_progress';
alter type request_status add value if not exists 'report_submitted';
alter type request_status add value if not exists 'pending_manager_review';
alter type request_status add value if not exists 'completed';
alter type request_status add value if not exists 'done';

create table if not exists public.agents (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  username text unique,
  password_hash text,
  full_name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.agents
  add column if not exists username text unique,
  add column if not exists password_hash text;

alter table public.requests
  add column if not exists payment_status text not null default 'unpaid',
  add column if not exists assigned_agent_id uuid references public.agents(id),
  add column if not exists assigned_agent_name text,
  add column if not exists assigned_at timestamptz,
  add column if not exists agent_ack_at timestamptz,
  add column if not exists report_submitted_at timestamptz,
  add column if not exists manager_reviewed_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists done_at timestamptz,
  add column if not exists sla_due_at timestamptz;

create index if not exists requests_assigned_agent_id_idx on public.requests(assigned_agent_id);
create index if not exists requests_sla_due_at_idx on public.requests(sla_due_at);

create table if not exists public.request_messages (
  id bigserial primary key,
  request_id uuid not null references public.requests(id) on delete cascade,
  sender_role text not null check (sender_role in ('manager', 'agent')),
  sender_name text not null,
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists request_messages_request_id_idx on public.request_messages(request_id, created_at);

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

alter table public.agents disable row level security;
alter table public.request_messages disable row level security;
alter table public.agent_findings disable row level security;
