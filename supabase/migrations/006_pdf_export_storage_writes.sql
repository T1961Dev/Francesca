create policy "Users upload own PDF exports" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'pdf-exports'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users update own PDF exports" on storage.objects
for update to authenticated
using (
  bucket_id = 'pdf-exports'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'pdf-exports'
  and (storage.foldername(name))[1] = auth.uid()::text
);
