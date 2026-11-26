-- Data for the private admin dashboard at /admin. Every function checks is_admin() and returns nothing otherwise.

-- Everyone who has signed up, with their email (auth.users isn't readable from the browser).
create or replace function public.admin_users()
returns table (id uuid, email text, provider text, created_at timestamptz, last_sign_in_at timestamptz,
               username text, display_name text, neighborhood text, role text, banned boolean, copyright_strikes int,
               posts_live int, posts_pending int, posts_rejected int, comments int, likes int, saves int, reports_against int)
language sql stable security definer set search_path = public, auth as $$
  select u.id, u.email::text, coalesce(u.raw_app_meta_data->>'provider', 'email'), u.created_at, u.last_sign_in_at,
         p.username, p.display_name, p.neighborhood, p.role, p.banned, p.copyright_strikes,
         (select count(*)::int from posts x where x.user_id = u.id and x.status = 'approved'),
         (select count(*)::int from posts x where x.user_id = u.id and x.status = 'pending'),
         (select count(*)::int from posts x where x.user_id = u.id and x.status in ('rejected','removed')),
         (select count(*)::int from comments c where c.user_id = u.id),
         (select count(*)::int from reactions r where r.user_id = u.id and r.kind = 'like'),
         (select count(*)::int from reactions r where r.user_id = u.id and r.kind = 'save'),
         (select count(*)::int from reports rp where rp.target_type = 'profile' and rp.target_id = u.id::text)
  from auth.users u join profiles p on p.id = u.id
  where public.is_admin()
  order by u.created_at desc
$$;
revoke all on function public.admin_users() from public, anon;
grant execute on function public.admin_users() to authenticated;

-- Daily counts for the activity chart (New York days).
create or replace function public.admin_activity(days int default 30)
returns table (day date, signups int, posts int, comments int, likes int, saves int)
language sql stable security definer set search_path = public, auth as $$
  with d as (select generate_series((now() at time zone 'America/New_York')::date - (least(greatest(days,7),365) - 1),
                                    (now() at time zone 'America/New_York')::date, interval '1 day')::date as day)
  select d.day,
    (select count(*)::int from auth.users u where (u.created_at at time zone 'America/New_York')::date = d.day),
    (select count(*)::int from posts x where (x.created_at at time zone 'America/New_York')::date = d.day),
    (select count(*)::int from comments c where (c.created_at at time zone 'America/New_York')::date = d.day),
    (select count(*)::int from reactions r where r.kind = 'like' and (r.created_at at time zone 'America/New_York')::date = d.day),
    (select count(*)::int from reactions r where r.kind = 'save' and (r.created_at at time zone 'America/New_York')::date = d.day)
  from d where public.is_admin() order by d.day
$$;
revoke all on function public.admin_activity(int) from public, anon;
grant execute on function public.admin_activity(int) to authenticated;

-- Private notes on anything (a user, photo, report, request). Only admins can see them.
create table if not exists public.admin_notes (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('user','post','comment','report','feedback','takedown')),
  target_id text not null,
  body text not null check (char_length(body) between 1 and 4000),
  author uuid references public.profiles on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists admin_notes_target on public.admin_notes (target_type, target_id, created_at);
alter table public.admin_notes enable row level security;
drop policy if exists "admins only" on public.admin_notes;
create policy "admins only" on public.admin_notes for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select, insert, update, delete on public.admin_notes to authenticated;
