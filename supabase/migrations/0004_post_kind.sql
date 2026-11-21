-- Type of image for community uploads, same codes as the map's Type filter:
-- p photo, c postcard, i illustration or print, m map, b blueprint or plan, d document
alter table public.posts add column if not exists kind text not null default 'p'
  check (kind in ('p','c','i','m','b','d'));
