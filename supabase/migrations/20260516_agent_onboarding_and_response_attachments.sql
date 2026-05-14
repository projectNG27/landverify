-- Agent onboarding (integrity acknowledgement) + optional response file uploads

alter table public.agents add column if not exists agent_onboarding_completed_at timestamptz;
alter table public.agents add column if not exists agent_onboarding_policy_version text;

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

alter table public.agent_response_attachments disable row level security;
