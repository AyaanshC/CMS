begin;
create extension if not exists pgtap with schema extensions;
select plan(5);
insert into auth.users(id,email,raw_app_meta_data,raw_user_meta_data) values
('ff000000-0000-4000-8000-000000000022','unmapped-audit@example.test','{}','{"full_name":"Unmapped fixture"}'),
('ff000000-0000-4000-8000-000000000023','pending-audit@example.test','{"kind":"staff","provisioning_pending":true}','{"full_name":"Pending fixture"}');
select is((select active from profiles where id='ff000000-0000-4000-8000-000000000022'),false,'unmapped signup is inactive');
select is((select active from profiles where id='ff000000-0000-4000-8000-000000000023'),false,'pending staff has no access before provisioning');
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated"}',true);set local role authenticated;
select throws_like($$select configure_staff('ff000000-0000-4000-8000-000000000023','{}'::app_role[],null,true)$$,'%at least one role%','failed setup cannot activate the account');
select lives_ok($$select configure_staff('ff000000-0000-4000-8000-000000000023',array['architect']::app_role[],'Architect',true)$$,'roles and activation commit together');
select ok((select active from profiles where id='ff000000-0000-4000-8000-000000000023') and exists(select 1 from user_roles where user_id='ff000000-0000-4000-8000-000000000023' and role='architect'),'configured staff is active with intended role');
reset role;select * from finish();rollback;
