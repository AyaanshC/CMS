begin;
create extension if not exists pgtap with schema extensions;
select plan(15);
create function pg_temp.act_as(uid uuid) returns void language plpgsql as $$
begin perform set_config('request.jwt.claims',json_build_object('sub',uid,'role','authenticated')::text,true); end $$;
insert into material_options(id,project_id,room_name,category,product_name) values
('f5000000-0000-4000-8000-000000000017','a1000000-0000-4000-8000-000000000001','Audit room','Flooring','Oak'),
('f5000000-0000-4000-8000-000000000018','a1000000-0000-4000-8000-000000000001','Audit room','Flooring','Stone');
select pg_temp.act_as('00000000-0000-4000-8000-000000000011');
set local role authenticated;
select lives_ok($$select select_material('f5000000-0000-4000-8000-000000000017',true)$$,'client chooses material');
select lives_ok($$select select_material('f5000000-0000-4000-8000-000000000018',true)$$,'client changes decision');
select is((select count(*)::int from material_options where room_name='Audit room' and is_selected),1,'one selection per room and category');
select throws_like($$select finalize_material('f5000000-0000-4000-8000-000000000018')$$,'%Not allowed%','client cannot finalize');
reset role;
select pg_temp.act_as('00000000-0000-4000-8000-000000000001');
set local role authenticated;
select lives_ok($$select finalize_material('f5000000-0000-4000-8000-000000000018')$$,'studio finalizes selection');
select throws_like($$update material_options set product_name='Changed' where id='f5000000-0000-4000-8000-000000000018'$$,'%Finalized%','finalized option immutable');
select throws_like($$delete from user_roles where user_id=auth.uid() and role='owner'$$,'%own owner%','direct API cannot remove own owner role');
select create_itemized_invoice('{"project_id":"a1000000-0000-4000-8000-000000000001","notes":"audit itemized","gst_rate":18,"send":true,"items":[{"description":"Design work","quantity":2,"unit_rate":100.25}]}'::jsonb);
select is((select total_amount from invoices where notes='audit itemized'),236.59::numeric,'itemized invoice rounded and taxed');
select is((select count(*)::int from invoice_items where invoice_id=(select id from invoices where notes='audit itemized')),1,'issued invoice retains item lines');
select throws_like($$update invoices set subtotal=1 where notes='audit itemized'$$,'%immutable%','issued totals immutable');
select throws_like($$update invoice_items set unit_rate=1 where invoice_id=(select id from invoices where notes='audit itemized')$$,'%Only draft%','issued invoice lines immutable');
reset role;
select pg_temp.act_as(null);
update projects set fee_basis='hourly',fee_rate=500 where id='a1000000-0000-4000-8000-000000000001';
insert into timesheet_entries(profile_id,work_date,project_id,activity,hours,billable,status) values
('00000000-0000-4000-8000-000000000004','2026-10-14','a1000000-0000-4000-8000-000000000001','design',2,true,'approved');
select pg_temp.act_as('00000000-0000-4000-8000-000000000006');
set local role authenticated;
select lives_ok($$select bill_hourly_time('a1000000-0000-4000-8000-000000000001','2026-10-14','2026-10-14')$$,'hourly billing creates draft');
select is((select subtotal from invoices where notes='Approved billable time: 2026-10-14 to 2026-10-14'),1000.00::numeric,'hourly amount uses approved time');
select throws_like($$select bill_hourly_time('a1000000-0000-4000-8000-000000000001','2026-10-14','2026-10-14')$$,'%No approved, unbilled%','same hours cannot be billed twice');
reset role;
set local role anon;
select is(submit_onboarding('{"full_name":"Audit enquiry","phone":"+91 99999 10017","rooms":[]}'::jsonb),submit_onboarding('{"full_name":"Audit enquiry","phone":"+91 99999 10017","rooms":[]}'::jsonb),'public retry returns same reference');
reset role;
select * from finish();
rollback;
