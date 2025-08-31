-- Supabase schema for Return Visit Tracker contacts sync
-- Run this in Supabase SQL Editor (connected to your project)

-- 1) Table: contacts
create table if not exists public.contacts (
  id bigserial primary key,
  user_id uuid not null,
  remote_uuid uuid not null unique,
  name text not null default '',
  phone text not null default '',
  bucket text not null default 'Saturday',
  next_visit_at date null,
  hostel_name text not null default '',
  location_detail text not null default '',
  last_outcome text not null default '',
  notes text not null default '',
  tags text not null default '',
  display_order integer not null default 0,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Optional FK: requires rights to reference auth.users
-- alter table public.contacts
--   add constraint contacts_user_id_fkey
--   foreign key (user_id) references auth.users(id) on delete cascade;

create index if not exists contacts_user_id_idx on public.contacts(user_id);
create index if not exists contacts_updated_at_idx on public.contacts(updated_at);

alter table public.contacts enable row level security;

drop policy if exists "contacts_select_own" on public.contacts;
create policy "contacts_select_own"
  on public.contacts for select
  using (auth.uid() = user_id);

drop policy if exists "contacts_insert_own" on public.contacts;
create policy "contacts_insert_own"
  on public.contacts for insert
  with check (auth.uid() = user_id);

drop policy if exists "contacts_update_own" on public.contacts;
create policy "contacts_update_own"
  on public.contacts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "contacts_delete_own" on public.contacts;
create policy "contacts_delete_own"
  on public.contacts for delete
  using (auth.uid() = user_id);

-- 3) updated_at trigger (server authoritative)
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_contacts_updated_at on public.contacts;
create trigger set_contacts_updated_at
before update on public.contacts
for each row execute function public.set_updated_at();

-- 4) Helpful: unique constraint by user (optional if remote_uuid is unique globally)
-- alter table public.contacts add constraint contacts_user_remote_uuid_unique
--   unique (user_id, remote_uuid);

-- Done.


