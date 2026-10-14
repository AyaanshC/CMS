begin;
create extension if not exists pgtap with schema extensions;
select plan(10);
create function pg_temp.act_as(uid uuid) returns void language plpgsql as $$
begin perform set_config('request.jwt.claims',json_build_object('sub',uid,'role','authenticated')::text,true); end $$;
insert into project_files(project_id,file_name,storage_path,file_type,is_client_visible) values
('a1000000-0000-4000-8000-000000000001','Internal audit','a1000000-0000-4000-8000-000000000001/guard-private.dat','application/octet-stream',false);
insert into storage.objects(bucket_id,name) values('project-files','a1000000-0000-4000-8000-000000000001/guard-private.dat');
select pg_temp.act_as('00000000-0000-4000-8000-000000000011');set local role authenticated;
select throws_like($$insert into messages(project_id,content,file_url) values('a1000000-0000-4000-8000-000000000001','Guess internal file','a1000000-0000-4000-8000-000000000001/guard-private.dat')$$,'%internal or unavailable%','client cannot expose private object through a message');
reset role;select pg_temp.act_as(null);
update profiles set active=false where id='00000000-0000-4000-8000-000000000004';
select pg_temp.act_as('00000000-0000-4000-8000-000000000004');set local role authenticated;
select throws_like($$select submit_timesheet_week('2026-10-05')$$,'%inactive%','disabled session cannot use definer submission');
select is((select count(*)::int from staff_week_hours('2026-01-01','2026-12-31')),0,'disabled session cannot read own time via rollup');
reset role;select pg_temp.act_as(null);
update profiles set active=true where id='00000000-0000-4000-8000-000000000004';
select pg_temp.act_as('00000000-0000-4000-8000-000000000004');set local role authenticated;
select lives_ok($$select save_timesheet_checked('2026-10-19','[{"project_id":"a1000000-0000-4000-8000-000000000001","activity":"design","billable":true,"hours":[2,0,0,0,0,0,0]}]'::jsonb,'{}'::text[],true)$$,'save and submit in one transaction');
select throws_like($$select save_timesheet_checked('2026-10-19','[]'::jsonb,'{}'::text[],false)$$,'%another session%','stale draft cannot overwrite new entries');
reset role;select pg_temp.act_as(null);
insert into alerts(id,kind,dedupe_key,recipient_email,title,body,email_status) values('fb000000-0000-4000-8000-000000000019','timesheet_missing','audit-email-19','audit@example.test','Audit','Fixture','pending');
select is((select count(*)::int from claim_alert_emails('fc000000-0000-4000-8000-000000000019') where id='fb000000-0000-4000-8000-000000000019'),1,'worker claims pending email');
select is((select count(*)::int from claim_alert_emails('fc000000-0000-4000-8000-000000000020') where id='fb000000-0000-4000-8000-000000000019'),0,'second worker cannot claim it again');
insert into file_uploads(path,project_id,uploaded_by,expires_at) values
('a1000000-0000-4000-8000-000000000001/guard-abandoned.dat','a1000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001',now()-interval '1 day'),
('a1000000-0000-4000-8000-000000000001/guard-private.dat','a1000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001',now()-interval '1 day');
select is((select count(*)::int from claim_abandoned_uploads() where path like '%guard-%'),1,'cleanup claims abandoned uploads and protects referenced files');
select is((select count(*)::int from claim_abandoned_uploads() where path like '%guard-%'),0,'cleanup claims do not overlap');
select pg_temp.act_as('00000000-0000-4000-8000-000000000001');set local role authenticated;
select throws_like($$insert into project_files(project_id,file_name,storage_path,file_type) values('a1000000-0000-4000-8000-000000000001','Expired','a1000000-0000-4000-8000-000000000001/guard-abandoned.dat','text/plain')$$,'%upload expired%','metadata cannot race an expired-upload cleanup');
reset role;select * from finish();rollback;
