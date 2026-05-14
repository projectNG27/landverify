-- Sync Paystack columns on `payments` if the database never applied 20260513_paystack_payments.sql.
-- Safe to run multiple times (IF NOT EXISTS).

alter table public.payments add column if not exists paystack_access_code text;
alter table public.payments add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.payments add column if not exists card_origin text;
alter table public.payments add column if not exists channel text;
alter table public.payments add column if not exists customer_email text;
alter table public.payments add column if not exists paid_at timestamptz;

create unique index if not exists payments_reference_unique
  on public.payments (reference)
  where reference is not null;
