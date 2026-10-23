-- Pat Automates site: database, file storage and security rules.
-- Run this once in Supabase: Dashboard > SQL Editor > New query > paste > Run.
-- It's safe to run again (it updates rather than duplicates).

-- ---------------------------------------------------------------------------
-- Who is the admin?
-- Only this email can publish, delete, upload files and read inquiries.
-- If you change it, also change adminEmail in src/lib/site.ts.
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(lower(auth.jwt() ->> 'email'), '') = 'pat@patgpt-ai.com'
$$;

grant execute on function public.is_admin() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Breakdowns (your posts)
-- ---------------------------------------------------------------------------
create table if not exists public.breakdowns (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  title       text not null check (char_length(title) between 1 and 140),
  category    text not null default 'Other' check (char_length(category) <= 40),
  tags        text[] not null default '{}' check (cardinality(tags) <= 5),
  description text check (char_length(description) <= 400),
  body        text check (char_length(body) <= 50000),
  link        text check (link is null or link ~* '^https?://'),
  files       jsonb not null default '[]'::jsonb check (jsonb_typeof(files) = 'array'),
  created_at  timestamptz not null default now()
);

create index if not exists breakdowns_created_at_idx on public.breakdowns (created_at desc);

alter table public.breakdowns enable row level security;

drop policy if exists "Anyone can read breakdowns" on public.breakdowns;
create policy "Anyone can read breakdowns"
  on public.breakdowns for select
  to anon, authenticated
  using (true);

drop policy if exists "Admin can add breakdowns" on public.breakdowns;
create policy "Admin can add breakdowns"
  on public.breakdowns for insert
  to authenticated
  with check ((select public.is_admin()));

drop policy if exists "Admin can edit breakdowns" on public.breakdowns;
create policy "Admin can edit breakdowns"
  on public.breakdowns for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "Admin can delete breakdowns" on public.breakdowns;
create policy "Admin can delete breakdowns"
  on public.breakdowns for delete
  to authenticated
  using ((select public.is_admin()));

grant select on public.breakdowns to anon, authenticated;
grant insert, update, delete on public.breakdowns to authenticated;

-- ---------------------------------------------------------------------------
-- Inquiries (the Work with me form)
-- Visitors can send one; only the admin can read or delete them.
-- ---------------------------------------------------------------------------
create table if not exists public.inquiries (
  id          uuid primary key default gen_random_uuid(),
  type        text not null check (type in ('promotion', 'consulting', 'general')),
  name        text not null check (char_length(name) between 1 and 80),
  email       text not null check (char_length(email) between 3 and 120 and email like '%_@_%'),
  business    text check (char_length(business) <= 120),
  product     text check (char_length(product) <= 300),
  budget      text check (char_length(budget) <= 40),
  message     text not null check (char_length(message) between 1 and 2000),
  created_at  timestamptz not null default now()
);

create index if not exists inquiries_created_at_idx on public.inquiries (created_at desc);

alter table public.inquiries enable row level security;

drop policy if exists "Anyone can send an inquiry" on public.inquiries;
create policy "Anyone can send an inquiry"
  on public.inquiries for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Admin can read inquiries" on public.inquiries;
create policy "Admin can read inquiries"
  on public.inquiries for select
  to authenticated
  using ((select public.is_admin()));

drop policy if exists "Admin can delete inquiries" on public.inquiries;
create policy "Admin can delete inquiries"
  on public.inquiries for delete
  to authenticated
  using ((select public.is_admin()));

-- Visitors may only fill in the form fields (not the id or date).
revoke all on public.inquiries from anon, authenticated;
grant insert (type, name, email, business, product, budget, message) on public.inquiries to anon, authenticated;
grant select, delete on public.inquiries to authenticated;

-- ---------------------------------------------------------------------------
-- File storage for PDFs and attachments
-- Public to read (so readers can view and download), admin-only to change.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'breakdown-files',
  'breakdown-files',
  true,
  20971520, -- 20 MB
  array[
    'application/pdf', 'text/markdown', 'text/plain', 'text/csv', 'application/json',
    'image/png', 'image/jpeg', 'image/gif', 'image/webp', 'video/mp4', 'video/webm'
  ]
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Admin can list breakdown files" on storage.objects;
create policy "Admin can list breakdown files"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'breakdown-files' and (select public.is_admin()));

drop policy if exists "Admin can upload breakdown files" on storage.objects;
create policy "Admin can upload breakdown files"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'breakdown-files' and (select public.is_admin()));

drop policy if exists "Admin can replace breakdown files" on storage.objects;
create policy "Admin can replace breakdown files"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'breakdown-files' and (select public.is_admin()))
  with check (bucket_id = 'breakdown-files' and (select public.is_admin()));

drop policy if exists "Admin can delete breakdown files" on storage.objects;
create policy "Admin can delete breakdown files"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'breakdown-files' and (select public.is_admin()));
