begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

create function pg_temp.act_as(uid uuid) returns void language plpgsql as $$
begin perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true); end $$;

-- Setup as postgres: an issued PO for 100 units @ 50
insert into purchase_orders (id, project_id, vendor_id, status, number, order_date) values
  ('f1000000-0000-4000-8000-000000000010', 'a1000000-0000-4000-8000-000000000001', (select id from vendors where name like 'Bright%'), 'issued', 'PO/TEST/0001', current_date);
insert into po_lines (id, po_id, description, unit, quantity, rate, gst_rate) values
  ('f2000000-0000-4000-8000-000000000010', 'f1000000-0000-4000-8000-000000000010', 'Cable 2.5 sqmm', 'm', 100, 50, 18);

-- Site supervisor receives 60 (5 rejected)
select pg_temp.act_as('00000000-0000-4000-8000-000000000005');
set local role authenticated;
insert into goods_receipts (id, po_id, received_on) values ('f3000000-0000-4000-8000-000000000010', 'f1000000-0000-4000-8000-000000000010', current_date);
insert into grn_lines (grn_id, po_line_id, quantity_received, quantity_rejected) values ('f3000000-0000-4000-8000-000000000010', 'f2000000-0000-4000-8000-000000000010', 60, 5);
select is((select received_qty - rejected_qty from po_line_progress where po_line_id = 'f2000000-0000-4000-8000-000000000010'), 55.000::numeric, 'accepted quantity');
reset role;

-- three_way_match
select pg_temp.act_as('00000000-0000-4000-8000-000000000006');   -- finance
set local role authenticated;
insert into vendor_bills (id, vendor_id, project_id, po_id, bill_number, bill_date) values
  ('f4000000-0000-4000-8000-000000000010', (select id from vendors where name like 'Bright%'), 'a1000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-000000000010', 'BE/778', current_date);
insert into vendor_bill_lines (bill_id, po_line_id, description, quantity, rate, gst_rate) values
  ('f4000000-0000-4000-8000-000000000010', 'f2000000-0000-4000-8000-000000000010', 'Cable', 60, 52, 18);
select is(array_length(bill_match_issues('f4000000-0000-4000-8000-000000000010'), 1), 2, 'quantity and rate issues');
select throws_like($$ select approve_vendor_bill('f4000000-0000-4000-8000-000000000010') $$, '%does not match%', 'mismatched bill cannot be approved');
update vendor_bill_lines set quantity = 55, rate = 50 where bill_id = 'f4000000-0000-4000-8000-000000000010';
select is(bill_match_issues('f4000000-0000-4000-8000-000000000010'), '{}'::text[], 'matched after correction');
select lives_ok($$ select approve_vendor_bill('f4000000-0000-4000-8000-000000000010') $$, 'approve matched bill');
select is((select total from vendor_bill_summary where id = 'f4000000-0000-4000-8000-000000000010'), 3245.00::numeric, '55 x 50 + 18% GST');

-- duplicate_bill
select throws_ok($$ insert into vendor_bills (vendor_id, project_id, bill_number, bill_date) values ((select id from vendors where name like 'Bright%'), 'a1000000-0000-4000-8000-000000000001', 'BE/778', current_date) $$,
  '23505', null, 'same bill number twice rejected');

insert into vendor_payments (vendor_id, bill_id, project_id, amount, paid_on, mode) values
  ((select id from vendors where name like 'Bright%'), 'f4000000-0000-4000-8000-000000000010', 'a1000000-0000-4000-8000-000000000001', 3245, current_date, 'bank_transfer');
select is((select outstanding from vendor_bill_summary where id = 'f4000000-0000-4000-8000-000000000010'), 0.00::numeric, 'paid off');
reset role;

select * from finish();
rollback;
