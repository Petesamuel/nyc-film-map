-- Per-user settings that follow the account between the website and the phone apps:
-- saved addresses, recently viewed pins, blocked users. Only the owner can read or write their row.
create table if not exists public.user_prefs (
  user_id uuid primary key references auth.users on delete cascade,
  data jsonb not null default '{}'::jsonb check (pg_column_size(data) < 60000),
  updated_at timestamptz not null default now()
);
alter table public.user_prefs enable row level security;
drop policy if exists "own prefs read" on public.user_prefs;
drop policy if exists "own prefs insert" on public.user_prefs;
drop policy if exists "own prefs update" on public.user_prefs;
drop policy if exists "own prefs delete" on public.user_prefs;
create policy "own prefs read" on public.user_prefs for select to authenticated using (user_id = auth.uid());
create policy "own prefs insert" on public.user_prefs for insert to authenticated with check (user_id = auth.uid());
create policy "own prefs update" on public.user_prefs for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own prefs delete" on public.user_prefs for delete to authenticated using (user_id = auth.uid());
grant select, insert, update, delete on public.user_prefs to authenticated;
