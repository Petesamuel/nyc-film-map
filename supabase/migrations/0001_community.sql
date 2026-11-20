-- NYC Then and Now: community layer (Phase 2a)
-- Accounts, uploads, comments, likes, saves, reports, feedback, removal requests, admin role.
-- Every table has row level security on. Anonymous visitors can read public content and send
-- feedback, removal requests and reports. Only admins can read the inbox tables.

create extension if not exists pg_trgm;

-- ---------- profiles ----------
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  username text unique not null check (username ~ '^[a-z0-9_]{3,24}$'),
  display_name text check (char_length(display_name) <= 60),
  bio text check (char_length(bio) <= 300),
  neighborhood text check (char_length(neighborhood) <= 60),
  avatar_key text,
  role text not null default 'user' check (role in ('user','admin')),
  banned boolean not null default false,
  created_at timestamptz not null default now()
);
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin' and not banned)
$$;

alter table public.profiles enable row level security;
create policy "profiles are public" on public.profiles for select using (true);
create policy "edit own profile" on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid() and role = 'user' and banned = false);
create policy "admins manage profiles" on public.profiles for all using (public.is_admin());

-- New sign ups get a profile with a placeholder username they can change.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username, display_name)
  values (new.id, 'user_' || substr(replace(new.id::text,'-',''),1,10),
          coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- community posts (uploads) ----------
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  description text check (char_length(description) <= 2000),
  year_taken int check (year_taken between 1830 and 2100),
  year_approx boolean not null default false,
  lat double precision not null check (lat between 40.4 and 41.0),
  lon double precision not null check (lon between -74.3 and -73.6),
  place_label text check (char_length(place_label) <= 160),       -- "Bedford Ave & N 7th St"
  pin_method text not null check (pin_method in ('address','intersection','manual')),
  image_key text not null,                                          -- R2 object key
  thumb_key text,
  width int, height int,
  rights text not null check (rights in ('own_photo','family_photo','permission','public_domain')),
  status text not null default 'pending' check (status in ('pending','approved','rejected','removed')),
  mod_note text,
  created_at timestamptz not null default now(),
  approved_at timestamptz
);
create index posts_geo on public.posts (status, lat, lon);
create index posts_user on public.posts (user_id, created_at desc);
alter table public.posts enable row level security;
create policy "approved posts are public" on public.posts for select
  using (status = 'approved' or user_id = auth.uid() or public.is_admin());
create policy "signed in users post" on public.posts for insert
  with check (user_id = auth.uid() and status = 'pending'
              and not exists (select 1 from public.profiles p where p.id = auth.uid() and p.banned));
create policy "edit own pending post" on public.posts for update
  using (user_id = auth.uid() and status = 'pending') with check (user_id = auth.uid() and status = 'pending');
create policy "delete own post" on public.posts for delete using (user_id = auth.uid());
create policy "admins moderate posts" on public.posts for all using (public.is_admin());

-- ---------- comments (on community posts or archive photos) ----------
-- target_type 'post' uses posts.id; 'archive' uses the archive photo's source URL.
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  target_type text not null check (target_type in ('post','archive')),
  target_id text not null,
  parent_id uuid references public.comments on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  status text not null default 'visible' check (status in ('visible','hidden')),
  created_at timestamptz not null default now()
);
create index comments_target on public.comments (target_type, target_id, created_at);
alter table public.comments enable row level security;
create policy "visible comments are public" on public.comments for select
  using (status = 'visible' or user_id = auth.uid() or public.is_admin());
create policy "signed in users comment" on public.comments for insert
  with check (user_id = auth.uid() and status = 'visible'
              and not exists (select 1 from public.profiles p where p.id = auth.uid() and p.banned));
create policy "delete own comment" on public.comments for delete using (user_id = auth.uid());
create policy "admins moderate comments" on public.comments for all using (public.is_admin());

-- ---------- likes and saves ----------
create table public.reactions (
  user_id uuid not null references public.profiles on delete cascade,
  kind text not null check (kind in ('like','save')),
  target_type text not null check (target_type in ('post','archive')),
  target_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, kind, target_type, target_id)
);
create index reactions_target on public.reactions (target_type, target_id, kind);
alter table public.reactions enable row level security;
create policy "likes are public, saves are private" on public.reactions for select
  using (kind = 'like' or user_id = auth.uid());
create policy "own reactions" on public.reactions for insert with check (user_id = auth.uid());
create policy "remove own reactions" on public.reactions for delete using (user_id = auth.uid());

-- Like counts without exposing who saved what
create view public.like_counts with (security_invoker = true) as
  select target_type, target_id, count(*)::int as likes
  from public.reactions where kind = 'like' group by 1, 2;

-- ---------- reports (anyone can flag a post, comment, profile or archive photo) ----------
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles on delete set null,
  target_type text not null check (target_type in ('post','comment','profile','archive')),
  target_id text not null,
  reason text not null check (reason in ('wrong_location','copyright','offensive','spam','privacy','other')),
  details text check (char_length(details) <= 2000),
  status text not null default 'open' check (status in ('open','resolved','dismissed')),
  created_at timestamptz not null default now()
);
alter table public.reports enable row level security;
create policy "anyone can report" on public.reports for insert
  with check (status = 'open' and (reporter_id is null or reporter_id = auth.uid()));
create policy "admins read reports" on public.reports for all using (public.is_admin());

-- ---------- feedback inbox (replaces the email form) ----------
create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles on delete set null,
  email text check (char_length(email) <= 200),
  type text not null check (char_length(type) <= 60),
  link text check (char_length(link) <= 1000),
  message text not null check (char_length(message) between 1 and 5000),
  status text not null default 'new' check (status in ('new','done','ignored')),
  created_at timestamptz not null default now()
);
alter table public.feedback enable row level security;
create policy "anyone can send feedback" on public.feedback for insert
  with check (status = 'new' and (user_id is null or user_id = auth.uid()));
create policy "admins read feedback" on public.feedback for all using (public.is_admin());

-- ---------- removal requests ----------
create table public.takedown_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) <= 200),
  email text not null check (char_length(email) <= 200),
  org text check (char_length(org) <= 200),
  ask text not null check (char_length(ask) <= 100),
  images text not null check (char_length(images) <= 10000),
  notes text check (char_length(notes) <= 5000),
  confirmed boolean not null check (confirmed),
  status text not null default 'new' check (status in ('new','in_progress','done','declined')),
  created_at timestamptz not null default now()
);
alter table public.takedown_requests enable row level security;
create policy "anyone can request removal" on public.takedown_requests for insert with check (status = 'new');
create policy "admins handle removals" on public.takedown_requests for all using (public.is_admin());

-- ---------- simple abuse limits ----------
create or replace function public.limit_rate() returns trigger
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if TG_TABLE_NAME = 'posts' then
    select count(*) into n from public.posts where user_id = new.user_id and created_at > now() - interval '1 day';
    if n >= 30 then raise exception 'Daily upload limit reached'; end if;
  elsif TG_TABLE_NAME = 'comments' then
    select count(*) into n from public.comments where user_id = new.user_id and created_at > now() - interval '1 minute';
    if n >= 5 then raise exception 'Slow down a little'; end if;
  end if;
  return new;
end $$;
create trigger posts_rate before insert on public.posts for each row execute function public.limit_rate();
create trigger comments_rate before insert on public.comments for each row execute function public.limit_rate();

-- After running this, make Pete the admin (replace the email):
-- update public.profiles set role = 'admin' where id = (select id from auth.users where email = 'p.samuel.kouz@gmail.com');
