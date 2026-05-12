-- Case channel (requester <-> admin) vs internal (manager <-> agent).

alter table public.request_messages add column if not exists sender_email text;
alter table public.request_messages add column if not exists source text;
alter table public.request_messages add column if not exists status text;
alter table public.request_messages add column if not exists replied_at timestamptz;
alter table public.request_messages add column if not exists updated_at timestamptz;
alter table public.request_messages add column if not exists channel text;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'request_messages' and column_name = 'message'
  )
  and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'request_messages' and column_name = 'message_body'
  ) then
    alter table public.request_messages rename column message to message_body;
  end if;
end $$;

-- Drop legacy sender_role check(s).
do $$
declare cname text;
begin
  for cname in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'request_messages'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%sender_role%'
  loop
    execute format('alter table public.request_messages drop constraint %I', cname);
  end loop;
end $$;

alter table public.request_messages drop constraint if exists request_messages_sender_role_check;

alter table public.request_messages
  add constraint request_messages_sender_role_check
  check (sender_role in ('requester', 'admin', 'manager', 'agent'));

-- Backfill before NOT NULL / strict checks
update public.request_messages
set
  channel = coalesce(nullif(trim(channel), ''), 'internal'),
  source = coalesce(source, 'admin'),
  status = coalesce(status, 'replied'),
  updated_at = coalesce(updated_at, created_at),
  replied_at = coalesce(replied_at, created_at)
where true;

alter table public.request_messages alter column channel set not null;
alter table public.request_messages alter column channel set default 'internal';

alter table public.request_messages alter column source set not null;
alter table public.request_messages alter column source set default 'web';

alter table public.request_messages alter column status set not null;
alter table public.request_messages alter column status set default 'sent';

alter table public.request_messages alter column updated_at set not null;
alter table public.request_messages alter column updated_at set default now();

alter table public.request_messages drop constraint if exists request_messages_channel_check;
alter table public.request_messages drop constraint if exists request_messages_source_check;
alter table public.request_messages drop constraint if exists request_messages_status_check;

alter table public.request_messages
  add constraint request_messages_channel_check
  check (channel in ('case', 'internal'));

alter table public.request_messages
  add constraint request_messages_source_check
  check (source in ('web', 'mailgun', 'admin'));

alter table public.request_messages
  add constraint request_messages_status_check
  check (status in ('sent', 'read', 'replied'));

create index if not exists request_messages_case_pending_idx
  on public.request_messages (request_id, created_at)
  where channel = 'case' and sender_role = 'requester' and status in ('sent', 'read');

drop trigger if exists request_messages_set_updated_at on public.request_messages;
create trigger request_messages_set_updated_at
before update on public.request_messages
for each row execute function public.set_updated_at();

comment on column public.request_messages.channel is 'case = requester/admin; internal = manager/agent';
comment on column public.request_messages.status is 'Requester case: sent -> read (admin opened) -> replied (admin replied)';
