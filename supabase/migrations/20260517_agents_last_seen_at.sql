-- Track when an agent last opened their queue (dashboard) for "new since last visit" semantics.
alter table public.agents
  add column if not exists last_seen_at timestamptz;
