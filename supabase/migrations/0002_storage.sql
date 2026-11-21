-- Photo storage for community uploads (Supabase Storage for now; can move to Cloudflare R2 later).
-- Files live at uploads/<user id>/<random id>.jpg. Anyone can view a file by its URL,
-- only the owner can add or delete files in their own folder, and admins can remove anything.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('uploads', 'uploads', true, 8388608, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy "upload to own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "delete own files" on storage.objects for delete to authenticated
  using (bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "admins manage uploads" on storage.objects for all to authenticated
  using (bucket_id = 'uploads' and public.is_admin());
