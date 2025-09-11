## Supabase SQL steps for multi-date scheduling (visit_occurrences)

1) Create table and RLS

Paste into the Supabase SQL editor and run:

```sql
-- create-visit-occurrences.sql
-- (copy the contents of create-visit-occurrences.sql from this repo)
```

2) Backfill from existing contacts

Run this to create one occurrence for any contact that already has `next_visit_at` set:

```sql
-- backfill-visit-occurrences.sql
-- (copy the contents of backfill-visit-occurrences.sql from this repo)
```

That's it. New app versions will push/pull `visit_occurrences` automatically and show them in the Agenda and notifications.


