begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

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

select * from finish();
rollback;
