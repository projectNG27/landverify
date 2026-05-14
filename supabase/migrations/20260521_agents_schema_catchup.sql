-- Idempotent catch-up for `public.agents` columns used by agent registration and dashboard.
-- Run in Supabase → SQL Editor if you see errors like:
--   "Could not find the 'agent_onboarding_completed_at' column of 'agents' in the schema cache"
-- (Also run the rest of supabase/migrations in order for invites, attachments, etc.)

alter table public.agents add column if not exists agent_onboarding_completed_at timestamptz;
alter table public.agents add column if not exists agent_onboarding_policy_version text;
alter table public.agents add column if not exists phone text;
alter table public.agents add column if not exists whatsapp_number text;
alter table public.agents add column if not exists last_seen_at timestamptz;
alter table public.agents add column if not exists coverage_states text[] not null default '{}';

create index if not exists agents_coverage_states_gin_idx on public.agents using gin (coverage_states);

notify pgrst, 'reload schema';
