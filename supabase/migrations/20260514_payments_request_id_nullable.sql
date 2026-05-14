-- Allow Paystack rows before a request exists (pay-first intake).

alter table public.payments alter column request_id drop not null;
