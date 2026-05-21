
-- Fix function search_path
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Replace broad SELECT policies on storage.objects to prevent listing all files.
-- Files remain accessible via direct getPublicUrl() since the buckets are public,
-- but clients cannot enumerate them through the storage.objects table.
drop policy if exists "Anyone can view item images" on storage.objects;
drop policy if exists "Anyone can view avatars" on storage.objects;

create policy "Owners can list own item images"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'item-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Owners can list own avatars"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
