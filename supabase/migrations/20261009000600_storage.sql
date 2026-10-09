insert into storage.buckets (id, name, public) values ('project-files', 'project-files', false)
on conflict (id) do nothing;

create function public.storage_project_id(object_name text) returns uuid
language sql immutable as $$
  select case when split_part(object_name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
              then split_part(object_name, '/', 1)::uuid end
$$;

create policy project_files_read on storage.objects for select to authenticated using (
  bucket_id = 'project-files' and (
    public.can_manage_project(public.storage_project_id(name))
    or (public.is_project_client(public.storage_project_id(name))
        and not exists (select 1 from public.project_files f where f.storage_path = name and not f.is_client_visible))));

create policy project_files_upload on storage.objects for insert to authenticated with check (
  bucket_id = 'project-files' and public.can_see_project(public.storage_project_id(name)));

create policy project_files_delete on storage.objects for delete to authenticated using (
  bucket_id = 'project-files' and public.can_manage_project(public.storage_project_id(name)));
