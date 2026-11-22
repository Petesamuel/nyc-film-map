-- In-app account deletion (required by the App Store and Google Play).
-- Deletes the signed-in user's auth record; profiles, posts, comments and reactions go with it (on delete cascade).
-- The app removes the user's uploaded files from storage first.
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  delete from auth.users where id = auth.uid();
end $$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- Simple stats for the admin dashboard
create or replace function public.admin_stats() returns json
language sql stable security definer set search_path = public, auth as $$
  select case when public.is_admin() then json_build_object(
    'users', (select count(*) from auth.users),
    'users_7d', (select count(*) from auth.users where created_at > now() - interval '7 days'),
    'posts_live', (select count(*) from public.posts where status = 'approved'),
    'posts_pending', (select count(*) from public.posts where status = 'pending'),
    'comments', (select count(*) from public.comments where status = 'visible'),
    'comments_7d', (select count(*) from public.comments where created_at > now() - interval '7 days'),
    'likes', (select count(*) from public.reactions where kind = 'like'),
    'saves', (select count(*) from public.reactions where kind = 'save'),
    'reports_open', (select count(*) from public.reports where status = 'open'),
    'feedback_new', (select count(*) from public.feedback where status = 'new')
  ) else null end
$$;
grant execute on function public.admin_stats() to authenticated;
