begin;
create extension if not exists pgtap with schema extensions;
select plan(18);

create function pg_temp.act_as(uid uuid) returns void language plpgsql as $$
begin perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true); end $$;

-- Fee value by basis
update projects set fee_basis = 'percent_of_cost', fee_rate = 8, estimated_construction_cost = 10000000 where id = 'a1000000-0000-4000-8000-000000000002';
select is(project_fee_value('a1000000-0000-4000-8000-000000000002'), 800000.00::numeric, '8% of 1 crore');
update projects set fee_basis = 'per_sqft', fee_rate = 150 where id = 'a1000000-0000-4000-8000-000000000002';
select is(project_fee_value('a1000000-0000-4000-8000-000000000002'), 930000.00::numeric, '150/sqft x 6200');
update projects set fee_basis = 'lump_sum', fee_amount = 500000 where id = 'a1000000-0000-4000-8000-000000000002';
select is(project_fee_value('a1000000-0000-4000-8000-000000000002'), 500000.00::numeric, 'lump sum');
update projects set fee_basis = 'hourly' where id = 'a1000000-0000-4000-8000-000000000002';
select is(project_fee_value('a1000000-0000-4000-8000-000000000002'), 0::numeric, 'hourly has no fixed fee');

-- Seeded P1 fee stages (lump sum 300000, interiors template) and summary view
select is((select amount from fee_stage_summary where project_id = 'a1000000-0000-4000-8000-000000000001' and name = 'Design & 3D'), 75000.00::numeric, 'stage amount = fee x percent');
select is(fee_percent_total('a1000000-0000-4000-8000-000000000001', 'design_fee'), 100::numeric, 'seeded design stages total 100');

-- fee_edit_guard
select pg_temp.act_as('00000000-0000-4000-8000-000000000003');   -- PM Ananya
set local role authenticated;
select throws_like($$ update projects set fee_rate = 9 where id = 'a1000000-0000-4000-8000-000000000001' $$,
  '%Only an owner or director%', 'PM cannot change fee terms');
select lives_ok($$ update projects set name = 'Sharma Residence' where id = 'a1000000-0000-4000-8000-000000000001' $$, 'PM can edit other fields');
reset role;
select pg_temp.act_as('00000000-0000-4000-8000-000000000002');   -- Director Vikram
set local role authenticated;
select lives_ok($$ update projects set fee_amount = 320000 where id = 'a1000000-0000-4000-8000-000000000001' $$, 'director can change fee');
reset role;

-- Restore P2's fee terms changed by the assertions above: 6% of 1.5 crore = 9,00,000.
update projects set fee_basis = 'percent_of_cost', fee_rate = 6, estimated_construction_cost = 15000000
  where id = 'a1000000-0000-4000-8000-000000000002';

-- apply_fee_template
select pg_temp.act_as('00000000-0000-4000-8000-000000000001');   -- owner
set local role authenticated;
select is(apply_fee_template('a1000000-0000-4000-8000-000000000002', (select id from fee_templates where name = 'Architecture (standard)')),
  6, 'six architecture stages created');
select throws_like($$ select apply_fee_template('a1000000-0000-4000-8000-000000000002', (select id from fee_templates where name = 'Architecture (standard)')) $$,
  '%already has%', 'template cannot be applied twice');
reset role;

-- percent_total_guard
update project_fee_stages set percent = 11 where project_id = 'a1000000-0000-4000-8000-000000000002' and name = 'Concept';
update project_fee_stages set checklist = '[]' where project_id = 'a1000000-0000-4000-8000-000000000002';
select pg_temp.act_as('00000000-0000-4000-8000-000000000001');
set local role authenticated;
select throws_like($$ select complete_fee_stage((select id from project_fee_stages where project_id = 'a1000000-0000-4000-8000-000000000002' and name = 'Concept')) $$,
  '%total 101%', 'stages must total 100');
reset role;
update project_fee_stages set percent = 10 where project_id = 'a1000000-0000-4000-8000-000000000002' and name = 'Concept';

-- checklist guard + draft invoice
update project_fee_stages set checklist = '[{"label":"Sign-off","done":false}]' where project_id = 'a1000000-0000-4000-8000-000000000002' and name = 'Concept';
select pg_temp.act_as('00000000-0000-4000-8000-000000000001');
set local role authenticated;
select throws_like($$ select complete_fee_stage((select id from project_fee_stages where project_id = 'a1000000-0000-4000-8000-000000000002' and name = 'Concept')) $$,
  '%checklist%', 'checklist must be complete');
reset role;
update project_fee_stages set checklist = '[{"label":"Sign-off","done":true}]' where project_id = 'a1000000-0000-4000-8000-000000000002' and name = 'Concept';
select pg_temp.act_as('00000000-0000-4000-8000-000000000001');
set local role authenticated;
select isnt(complete_fee_stage((select id from project_fee_stages where project_id = 'a1000000-0000-4000-8000-000000000002' and name = 'Concept')),
  null, 'completing returns draft invoice id');
reset role;
select is((select subtotal from invoices where fee_stage_id = (select id from project_fee_stages where project_id = 'a1000000-0000-4000-8000-000000000002' and name = 'Concept')),
  90000.00::numeric, 'draft = 10% of 6% of 1.5 crore');
select is((select progress_percent from projects where id = 'a1000000-0000-4000-8000-000000000002'), 10, 'progress follows stages');

-- no_zero_invoice: execution stage with no approved BOQ on P3
insert into project_fee_stages (project_id, kind, name, percent, sort_order) values ('a1000000-0000-4000-8000-000000000003', 'execution', 'Advance', 100, 1);
select pg_temp.act_as('00000000-0000-4000-8000-000000000003');
set local role authenticated;
select is(complete_fee_stage((select id from project_fee_stages where project_id = 'a1000000-0000-4000-8000-000000000003' and name = 'Advance')),
  null, 'no invoice when amount is zero');
reset role;

-- invoice_amount_frozen: changing the fee later does not touch the existing draft
select pg_temp.act_as('00000000-0000-4000-8000-000000000001');
update projects set estimated_construction_cost = 30000000 where id = 'a1000000-0000-4000-8000-000000000002';
select is((select subtotal from invoices where fee_stage_id = (select id from project_fee_stages where project_id = 'a1000000-0000-4000-8000-000000000002' and name = 'Concept')),
  90000.00::numeric, 'existing invoice unchanged after fee change');

select * from finish();
rollback;
