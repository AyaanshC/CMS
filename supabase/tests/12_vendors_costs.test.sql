begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

create function pg_temp.act_as(uid uuid) returns void language plpgsql as $$
begin perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true); end $$;

update boq_versions set status = 'approved', is_active = true, approved_at = now() where id = 'b0000000-0000-4000-8000-000000000001';
insert into boq_line_costs (line_item_id, cost_rate) select id, round(unit_rate * 0.7, 2) from boq_line_items where section_id = 'b1000000-0000-4000-8000-000000000001';

-- client_no_cost
select pg_temp.act_as('00000000-0000-4000-8000-000000000011');
set local role authenticated;
select ok((select count(*) from boq_line_items) > 0, 'client still reads BOQ lines');
select is((select count(*)::int from boq_line_costs), 0, 'client cannot read cost rates');
select is((select count(*)::int from vendors), 0, 'client cannot read vendors');
reset role;

-- procurement sees execution project BOQ and costs, not design-only projects
select pg_temp.act_as('00000000-0000-4000-8000-000000000008');
set local role authenticated;
select is((select count(*)::int from projects where id = 'a1000000-0000-4000-8000-000000000001'), 1, 'procurement sees execution project');
select is((select count(*)::int from projects where id = 'a1000000-0000-4000-8000-000000000002'), 0, 'procurement does not see design-only project');
select ok((select count(*) from boq_line_costs) > 0, 'procurement reads cost rates');
reset role;

-- architect: member of P1 but no billing rights
select pg_temp.act_as('00000000-0000-4000-8000-000000000004');
set local role authenticated;
select is((select count(*)::int from boq_line_costs), 0, 'architect cannot read cost rates');
reset role;

select * from finish();
rollback;
