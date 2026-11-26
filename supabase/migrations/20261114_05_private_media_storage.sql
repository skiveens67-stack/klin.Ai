insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('klin-user-assets','klin-user-assets',false,104857600,array[
'image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','audio/mpeg','audio/wav','audio/mp4','application/pdf'
]) on conflict(id) do nothing;

drop policy if exists klin_user_assets_select on storage.objects;
create policy klin_user_assets_select on storage.objects for select to authenticated
using(bucket_id='klin-user-assets' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists klin_user_assets_insert on storage.objects;
create policy klin_user_assets_insert on storage.objects for insert to authenticated
with check(bucket_id='klin-user-assets' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists klin_user_assets_update on storage.objects;
create policy klin_user_assets_update on storage.objects for update to authenticated
using(bucket_id='klin-user-assets' and (storage.foldername(name))[1]=(select auth.uid())::text)
with check(bucket_id='klin-user-assets' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists klin_user_assets_delete on storage.objects;
create policy klin_user_assets_delete on storage.objects for delete to authenticated
using(bucket_id='klin-user-assets' and (storage.foldername(name))[1]=(select auth.uid())::text);
