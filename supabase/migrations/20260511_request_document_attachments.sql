-- Stored file metadata for Supabase Storage (bucket holds binaries; this column holds pointers).
alter table public.requests
  add column if not exists document_attachments jsonb not null default '[]'::jsonb;

comment on column public.requests.document_attachments is 'Array of {bucket, path, filename, content_type, size} for intake uploads';
