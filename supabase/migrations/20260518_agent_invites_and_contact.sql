-- Agent self-registration: one-time invite links (token stored hashed only).
create table if not exists public.agent_invites (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  invited_email text,
  expires_at timestamptz not null,
  used_at timestamptz,
  used_by_agent_id uuid references public.agents(id) on delete set null,
  created_by_admin text not null,
  created_at timestamptz not null default now()
);

create index if not exists agent_invites_pending_idx
  on public.agent_invites (created_at desc)
  where used_at is null;

alter table public.agents
  add column if not exists phone text,
  add column if not exists whatsapp_number text;

alter table public.agent_invites disable row level security;
