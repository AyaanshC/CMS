begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

create function pg_temp.act_as(uid uuid) returns void language plpgsql as $$
begin perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true); end $$;

update boq_versions set status = 'approved', is_active = true, approved_at = now() where id = 'b0000000-0000-4000-8000-000000000001';
-- Ceiling line: 240 sqft @ 95 sell; cost 70 -> budget 16,800. Putty line: 450 @ 25 sell; cost 18 -> budget 8,100.
insert into boq_line_costs (line_item_id, cost_rate)
select id, case when description like 'Gypsum%' then 70 else 18 end from boq_line_items where section_id = 'b1000000-0000-4000-8000-000000000001';

select pg_temp.act_as('00000000-0000-4000-8000-000000000008');   -- procurement Kunal
set local role authenticated;

-- Small, within budget -> auto approved
insert into purchase_orders (id, project_id, vendor_id, order_date) values
  ('f1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', (select id from vendors where name like 'Sri Lakshmi%'), current_date);
insert into po_lines (po_id, boq_line_item_id, description, unit, quantity, rate, gst_rate)
select 'f1000000-0000-4000-8000-000000000001', id, description, unit, 240, 68, 18 from boq_line_items where description like 'Gypsum%';
select is(submit_po('f1000000-0000-4000-8000-000000000001'), 'none', 'within budget and threshold: no approval');
select matches((select number from purchase_orders where id = 'f1000000-0000-4000-8000-000000000001'), '^PO/\d{2}-\d{2}/\d{4}$', 'numbered on approval');

-- Over line budget -> director
insert into purchase_orders (id, project_id, vendor_id, order_date) values
  ('f1000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000001', (select id from vendors where name like 'Sri Lakshmi%'), current_date - 1);
insert into po_lines (po_id, boq_line_item_id, description, unit, quantity, rate, gst_rate)
select 'f1000000-0000-4000-8000-000000000002', id, description, unit, 450, 20, 18 from boq_line_items where description like 'Wall putty%';
select is(submit_po('f1000000-0000-4000-8000-000000000002'), 'director', 'over line budget needs a director');

-- split_order_guard: two 3 lakh POs same vendor/project/day -> second needs owner
insert into purchase_orders (id, project_id, vendor_id, order_date) values
  ('f1000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000001', (select id from vendors where name like 'Modern%'), current_date),
  ('f1000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000001', (select id from vendors where name like 'Modern%'), current_date);
insert into po_lines (po_id, description, unit, quantity, rate, gst_rate) values
  ('f1000000-0000-4000-8000-000000000003', 'Wardrobe carcass', 'lot', 1, 300000, 18),
  ('f1000000-0000-4000-8000-000000000004', 'Kitchen carcass', 'lot', 1, 300000, 18);
select is(submit_po('f1000000-0000-4000-8000-000000000003'), 'director', 'unbudgeted 3L needs director');
select is(submit_po('f1000000-0000-4000-8000-000000000004'), 'owner', 'same-day split adds up to owner level');

-- no_self_approval_po: Kunal created PO2 and is not a director anyway; Vikram (director) approves PO2
select throws_like($$ select approve_po('f1000000-0000-4000-8000-000000000002') $$, '%not allowed%', 'creator cannot approve');
reset role;

select pg_temp.act_as('00000000-0000-4000-8000-000000000002');   -- director Vikram
set local role authenticated;
select lives_ok($$ select approve_po('f1000000-0000-4000-8000-000000000002') $$, 'director approves director-level PO');
select throws_like($$ select approve_po('f1000000-0000-4000-8000-000000000004') $$, '%owner%', 'director cannot approve owner-level PO');
reset role;

select pg_temp.act_as('00000000-0000-4000-8000-000000000001');   -- owner
set local role authenticated;
select lives_ok($$ select approve_po('f1000000-0000-4000-8000-000000000004') $$, 'owner approves');
reset role;

select pg_temp.act_as('00000000-0000-4000-8000-000000000008');
set local role authenticated;
select lives_ok($$ select issue_po('f1000000-0000-4000-8000-000000000001') $$, 'procurement issues approved PO');
reset role;

select * from finish();
rollback;
