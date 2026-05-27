insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('deck-uploads', 'deck-uploads', false, 20971520, array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]),
  ('pdf-exports', 'pdf-exports', false, 20971520, array['application/pdf'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "Users upload own deck files" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'deck-uploads'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users read own deck files" on storage.objects
for select to authenticated
using (
  bucket_id = 'deck-uploads'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users update own deck files" on storage.objects
for update to authenticated
using (
  bucket_id = 'deck-uploads'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'deck-uploads'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users read own PDF exports" on storage.objects
for select to authenticated
using (
  bucket_id = 'pdf-exports'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Service role full storage access" on storage.objects
for all to service_role using (true) with check (true);
