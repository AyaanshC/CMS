begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

create function pg_temp.act_as(uid uuid) returns void language plpgsql as $$
begin perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true); end $$;

update boq_versions set status = 'approved', is_active = true, approved_at = now() where id = 'b0000000-0000-4000-8000-000000000001';
insert into boq_line_costs (line_item_id, cost_rate) select id, 70 from boq_line_items where description like 'Gypsum%';
insert into purchase_orders (id, project_id, vendor_id, status, number) values
  ('f1000000-0000-4000-8000-000000000020', 'a1000000-0000-4000-8000-000000000001', (select id from vendors limit 1), 'issued', 'PO/T/2');
insert into po_lines (po_id, boq_line_item_id, description, unit, quantity, rate) select 'f1000000-0000-4000-8000-000000000020', id, 'Gypsum', 'sqft', 240, 75 from boq_line_items where description like 'Gypsum%';

select pg_temp.act_as('00000000-0000-4000-8000-000000000003');   -- PM
set local role authenticated;
select is((select budget from boq_cost_control() where description like 'Gypsum%'), 16800.00::numeric, 'budget = qty x cost');
select is((select committed from boq_cost_control() where description like 'Gypsum%'), 18000.00::numeric, 'committed from issued PO');
-- no_budget_line
select is((select budget from boq_cost_control() where description like 'Wall putty%'), null, 'line without cost rate has no budget');
reset role;

select pg_temp.act_as('00000000-0000-4000-8000-000000000011');   -- client
set local role authenticated;
select is((select count(*)::int from boq_cost_control()), 0, 'client gets nothing');
reset role;

-- expense approval threshold
select pg_temp.act_as('00000000-0000-4000-8000-000000000005');   -- site supervisor
set local role authenticated;
insert into expenses (project_id, category, description, amount, expense_date, cost_type) values ('a1000000-0000-4000-8000-000000000001', 'Materials', 'Local purchase', 15000, current_date, 'execution');
insert into expenses (project_id, category, description, amount, expense_date) values ('a1000000-0000-4000-8000-000000000001', 'Travel', 'Auto fare', 400, current_date);
reset role;   -- site supervisors cannot read expenses; check as postgres
select is((select status::text from expenses where description = 'Local purchase'), 'pending', 'large expense waits for approval');
select is((select status::text from expenses where description = 'Auto fare'), 'approved', 'small expense auto-approved');

select pg_temp.act_as('00000000-0000-4000-8000-000000000006');   -- finance
set local role authenticated;
select lives_ok($$ select decide_expense((select id from expenses where description = 'Local purchase'), true, null) $$, 'finance approves');
reset role;

update purchase_orders set expected_delivery = current_date - 2 where id = 'f1000000-0000-4000-8000-000000000020';
select ok(generate_procurement_alerts(current_date) >= 2, 'late delivery alerts procurement and PM');

select * from finish();
rollback;
