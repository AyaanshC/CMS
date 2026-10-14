begin;
create extension if not exists pgtap with schema extensions;
select plan(14);
create function pg_temp.act_as(uid uuid) returns void language plpgsql as $$
begin perform set_config('request.jwt.claims',json_build_object('sub',uid,'role','authenticated')::text,true); end $$;

insert into project_files(project_id,file_name,storage_path,file_type,is_client_visible) values
('a1000000-0000-4000-8000-000000000001','internal.dat','a1000000-0000-4000-8000-000000000001/audit-private.dat','application/octet-stream',false),
('a1000000-0000-4000-8000-000000000001','public.dat','a1000000-0000-4000-8000-000000000001/audit-visible.dat','application/octet-stream',true);
insert into storage.objects(bucket_id,name) values
('project-files','a1000000-0000-4000-8000-000000000001/audit-private.dat'),
('project-files','a1000000-0000-4000-8000-000000000001/audit-visible.dat'),
('project-files','a1000000-0000-4000-8000-000000000001/audit-unregistered.dat');
select pg_temp.act_as('00000000-0000-4000-8000-000000000011');
set local role authenticated;
select is((select count(*)::int from storage.objects where name like '%audit-%'),1,'client sees only explicitly visible objects');
select is(can_read_project_object('a1000000-0000-4000-8000-000000000001/audit-private.dat'),false,'metadata hidden by RLS does not expose the private file');
reset role;
select pg_temp.act_as(null);
update profiles set active=false where id='00000000-0000-4000-8000-000000000001';
select pg_temp.act_as('00000000-0000-4000-8000-000000000001');
set local role authenticated;
select is(public.has_role('owner'::public.app_role),false,'disabled owner has no privilege');
update profiles set active=true where id=auth.uid();
select is((select active from profiles where id=auth.uid()),false,'disabled owner cannot reactivate self');
select is((select count(*)::int from invoices),0,'disabled existing session cannot read finance');
reset role;
select pg_temp.act_as(null);
update profiles set active=true where id='00000000-0000-4000-8000-000000000001';
select pg_temp.act_as('00000000-0000-4000-8000-000000000001');
set local role authenticated;
select throws_like($$update projects set status='handover' where id='a1000000-0000-4000-8000-000000000001'$$,'%all snags%','handover cannot bypass open snags');
select throws_like($$select configure_staff('00000000-0000-4000-8000-000000000001',array['architect']::app_role[])$$,'%own owner%','role transaction protects owner');
reset role;
insert into purchase_orders(id,project_id,vendor_id,status,number) values
('f1000000-0000-4000-8000-000000000016','a1000000-0000-4000-8000-000000000001',(select id from vendors where name like 'Bright%'),'issued','AUDIT-16');
insert into po_lines(id,po_id,description,unit,quantity,rate,gst_rate) values
('f2000000-0000-4000-8000-000000000016','f1000000-0000-4000-8000-000000000016','Test cable','nos',2,100,0);
select pg_temp.act_as('00000000-0000-4000-8000-000000000005');
set local role authenticated;
select throws_like($$select record_goods_receipt('{"po_id":"f1000000-0000-4000-8000-000000000016","received_on":"2026-10-14","lines":[{"po_line_id":"f2000000-0000-4000-8000-000000000016","quantity_received":3}]}'::jsonb)$$,'%exceeds%','over-receipt rejected');
select is((select count(*)::int from goods_receipts where po_id='f1000000-0000-4000-8000-000000000016'),0,'failed receipt creates no orphan header');
select lives_ok($$select record_goods_receipt('{"request_id":"f3000000-0000-4000-8000-000000000016","po_id":"f1000000-0000-4000-8000-000000000016","received_on":"2026-10-14","lines":[{"po_line_id":"f2000000-0000-4000-8000-000000000016","quantity_received":2}]}'::jsonb)$$,'valid receipt commits');
select lives_ok($$select record_goods_receipt('{"request_id":"f3000000-0000-4000-8000-000000000016","po_id":"f1000000-0000-4000-8000-000000000016","received_on":"2026-10-14","lines":[{"po_line_id":"f2000000-0000-4000-8000-000000000016","quantity_received":2}]}'::jsonb)$$,'retry is idempotent');
select is((select count(*)::int from goods_receipts where po_id='f1000000-0000-4000-8000-000000000016'),1,'retry creates no duplicate receipt');
reset role;
insert into vendor_bills(id,vendor_id,project_id,bill_number,bill_date,status) values
('f4000000-0000-4000-8000-000000000016',(select id from vendors where name like 'Bright%'),'a1000000-0000-4000-8000-000000000001','AUDIT-16',current_date,'approved');
insert into vendor_bill_lines(bill_id,description,quantity,rate,gst_rate) values('f4000000-0000-4000-8000-000000000016','Cable',1,100,0);
select pg_temp.act_as('00000000-0000-4000-8000-000000000006');
set local role authenticated;
select throws_like($$insert into vendor_payments(vendor_id,project_id,bill_id,amount,paid_on,mode) values((select id from vendors where name like 'Bright%'),'a1000000-0000-4000-8000-000000000001','f4000000-0000-4000-8000-000000000016',101,current_date,'cash')$$,'%outstanding%','vendor overpayment rejected');
select throws_like($$insert into vendor_payments(vendor_id,project_id,bill_id,amount,paid_on,mode) values((select id from vendors where name like 'Bright%'),'a1000000-0000-4000-8000-000000000002','f4000000-0000-4000-8000-000000000016',10,current_date,'cash')$$,'%same project%','wrong project payment rejected');
reset role;
select * from finish();
rollback;
