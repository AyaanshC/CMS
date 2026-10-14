-- NOT RUN: requires the isolated, fully migrated and seeded local Supabase DB.
-- These are desired protections and are expected to expose the audit findings.
-- Entire fixture and all mutations roll back. Do not run against production.
begin;
create extension if not exists pgtap with schema extensions;
select plan(3);

insert into public.project_files (project_id, file_name, storage_path, file_type, is_client_visible)
values ('a1000000-0000-4000-8000-000000000001', 'audit-private.dat',
        'a1000000-0000-4000-8000-000000000001/audit-private.dat', 'application/octet-stream', false);
insert into storage.objects (bucket_id, name)
values ('project-files', 'a1000000-0000-4000-8000-000000000001/audit-private.dat');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000011","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from storage.objects where name = 'a1000000-0000-4000-8000-000000000001/audit-private.dat'),
          0, 'client must not read an internal storage object');
reset role;

update public.profiles set active = false where id = '00000000-0000-4000-8000-000000000001';
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select is(public.has_role('owner'), false, 'disabled owner must have no active privilege');
update public.profiles set active = true where id = auth.uid();
select is((select active from public.profiles where id = auth.uid()), false, 'disabled account must not reactivate itself');
reset role;

select * from finish();
rollback;
