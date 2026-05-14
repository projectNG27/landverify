-- Paystack settlement metadata and receipt fields

alter table public.payments add column if not exists paystack_access_code text;
alter table public.payments add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.payments add column if not exists card_origin text;
alter table public.payments add column if not exists channel text;
alter table public.payments add column if not exists customer_email text;
alter table public.payments add column if not exists paid_at timestamptz;

create unique index if not exists payments_reference_unique
  on public.payments (reference)
  where reference is not null;

comment on column public.payments.card_origin is 'Derived from Paystack authorization.country_code for card channel: local (NG), international, non_card, unknown';
