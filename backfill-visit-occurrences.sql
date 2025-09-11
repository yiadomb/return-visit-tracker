-- Backfill visit_occurrences from contacts.next_visit_at for existing rows
-- This script is idempotent: it won't insert duplicates for the same contact/date.

with cte as (
  select 
    c.remote_uuid as contact_remote_uuid,
    c.user_id,
    c.next_visit_at::timestamptz as scheduled_at,
    coalesce(c.updated_at, now()) as updated_at
  from public.contacts c
  where c.next_visit_at is not null
)
insert into public.visit_occurrences (remote_uuid, user_id, contact_remote_uuid, scheduled_at, reminders, status, created_at, updated_at)
select 
  gen_random_uuid(),
  cte.user_id,
  cte.contact_remote_uuid,
  cte.scheduled_at,
  array['-30']::text[],
  'planned',
  now(),
  cte.updated_at
from cte
where not exists (
  select 1 from public.visit_occurrences vo
  where vo.user_id = cte.user_id
    and vo.contact_remote_uuid = cte.contact_remote_uuid
    and vo.scheduled_at = cte.scheduled_at
);


