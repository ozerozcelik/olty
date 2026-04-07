insert into storage.buckets (id, name, public)
values ('gear-photos', 'gear-photos', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "gear_photos_insert_own" on storage.objects;
create policy "gear_photos_insert_own"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'gear-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "gear_photos_update_own" on storage.objects;
create policy "gear_photos_update_own"
on storage.objects for update
to authenticated
using (
  bucket_id = 'gear-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'gear-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "gear_photos_delete_own" on storage.objects;
create policy "gear_photos_delete_own"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'gear-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);
