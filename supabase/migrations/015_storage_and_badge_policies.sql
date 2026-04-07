drop policy if exists "public_read_catch_photos" on storage.objects;
create policy "public_read_catch_photos"
on storage.objects for select
using (bucket_id = 'catch-photos');

drop policy if exists "public_read_avatars" on storage.objects;
create policy "public_read_avatars"
on storage.objects for select
using (bucket_id = 'avatars');

drop policy if exists "public_read_gear_photos" on storage.objects;
create policy "public_read_gear_photos"
on storage.objects for select
using (bucket_id = 'gear-photos');
