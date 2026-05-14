-- Allow admins to invalidate unused invites (mistakes, leaked links).
alter table public.agent_invites
  add column if not exists revoked_at timestamptz;

create index if not exists agent_invites_pending_valid_idx
  on public.agent_invites (created_at desc)
  where used_at is null and revoked_at is null;
