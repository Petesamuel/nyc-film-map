-- Keep a small snapshot (title, thumbnail, location) with each save/like so they show on any device.
alter table public.reactions add column if not exists meta jsonb
  check (meta is null or pg_column_size(meta) < 4000);
-- Comment counts per photo without loading every comment
create or replace view public.comment_counts with (security_invoker = true) as
  select target_type, target_id, count(*)::int as n from public.comments where status = 'visible' group by 1, 2;
