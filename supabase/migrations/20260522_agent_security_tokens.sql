-- One-time tokens for agent self-service (e.g. forgot password while logged out).
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

alter table public.agent_security_tokens disable row level security;

notify pgrst, 'reload schema';
