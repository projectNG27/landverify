-- States an agent can cover (same names as requests.state, e.g. Lagos, Ogun).
alter table public.agents
  add column if not exists coverage_states text[] not null default '{}';

create index if not exists agents_coverage_states_gin_idx
  on public.agents using gin (coverage_states);
