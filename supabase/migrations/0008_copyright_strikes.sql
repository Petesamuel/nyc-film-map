-- Repeat infringer policy (needed for DMCA safe harbor).
-- Each photo rejected or removed for copyright gives its uploader a strike. Three strikes bans the account.
alter table public.profiles add column if not exists copyright_strikes int not null default 0;

-- Only admins (or the strike trigger) can change strikes; a user editing their own profile can't reset them.
create or replace function public.guard_profile_strikes() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.copyright_strikes is distinct from old.copyright_strikes
     and not public.is_admin() and coalesce(current_setting('pastpost.strike', true), '') <> '1' then
    new.copyright_strikes := old.copyright_strikes;
  end if;
  return new;
end $$;
drop trigger if exists profiles_guard_strikes on public.profiles;
create trigger profiles_guard_strikes before update on public.profiles
  for each row execute function public.guard_profile_strikes();

create or replace function public.count_copyright_strike() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status in ('rejected', 'removed') and old.status is distinct from new.status
     and coalesce(new.mod_note, '') ilike 'copyright%' then
    perform set_config('pastpost.strike', '1', true);
    update public.profiles
       set copyright_strikes = copyright_strikes + 1,
           banned = banned or copyright_strikes + 1 >= 3
     where id = new.user_id and role = 'user';
    perform set_config('pastpost.strike', '', true);
  end if;
  return new;
end $$;
drop trigger if exists posts_copyright_strike on public.posts;
create trigger posts_copyright_strike after update of status on public.posts
  for each row execute function public.count_copyright_strike();

-- Formal DMCA notice fields on the removal form
alter table public.takedown_requests add column if not exists contact text check (char_length(contact) <= 1000);
alter table public.takedown_requests add column if not exists goodfaith boolean not null default false;
alter table public.takedown_requests add column if not exists perjury boolean not null default false;
alter table public.takedown_requests add column if not exists signature text check (char_length(signature) <= 200);
