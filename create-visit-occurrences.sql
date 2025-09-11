-- Create visit_occurrences table to schedule multiple visits per contact

-- Enable required extensions (gen_random_uuid)
create extension if not exists pgcrypto;

-- Table
create table if not exists public.visit_occurrences (
  id bigserial primary key,
  remote_uuid uuid not null default gen_random_uuid(),
  user_id uuid not null,
  contact_remote_uuid uuid null,
  scheduled_at timestamptz not null,
  reminders text[] not null default array['-30']::text[],
  status text not null default 'planned',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint visit_occurrences_remote_uuid_unique unique(remote_uuid),
  constraint visit_occurrences_status_check check (status in ('planned','completed','cancelled'))
);

-- Helpful indexes
create index if not exists visit_occurrences_user_id_idx on public.visit_occurrences(user_id);
create index if not exists visit_occurrences_user_date_idx on public.visit_occurrences(user_id, scheduled_at);
create index if not exists visit_occurrences_contact_remote_idx on public.visit_occurrences(contact_remote_uuid);

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_visit_occurrences_updated_at on public.visit_occurrences;
create trigger set_visit_occurrences_updated_at
before update on public.visit_occurrences
for each row execute function public.set_updated_at();

-- RLS
alter table public.visit_occurrences enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'visit_occurrences' and policyname = 'Individuals can view their own occurrences'
  ) then
    create policy "Individuals can view their own occurrences"
    on public.visit_occurrences for select
    using (user_id = auth.uid());
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'visit_occurrences' and policyname = 'Individuals can insert their own occurrences'
  ) then
    create policy "Individuals can insert their own occurrences"
    on public.visit_occurrences for insert
    with check (user_id = auth.uid());
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'visit_occurrences' and policyname = 'Individuals can update their own occurrences'
  ) then
    create policy "Individuals can update their own occurrences"
    on public.visit_occurrences for update
    using (user_id = auth.uid())
    with check (user_id = auth.uid());
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'visit_occurrences' and policyname = 'Individuals can delete their own occurrences'
  ) then
    create policy "Individuals can delete their own occurrences"
    on public.visit_occurrences for delete
    using (user_id = auth.uid());
  end if;
end $$;

-- Optional: backfill from contacts with next_visit_at
-- See separate backfill script file for a safer deduplicated job.


