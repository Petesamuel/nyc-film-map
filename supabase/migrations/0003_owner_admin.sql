-- The map owner's account becomes admin automatically on first sign in.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username, display_name, role)
  values (new.id, 'user_' || substr(replace(new.id::text,'-',''),1,10),
          coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
          case when lower(new.email) = 'p.samuel.kouz@gmail.com' then 'admin' else 'user' end);
  return new;
end $$;
-- In case the account already exists:
update public.profiles set role = 'admin'
where id in (select id from auth.users where lower(email) = 'p.samuel.kouz@gmail.com');
