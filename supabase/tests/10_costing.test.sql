begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

create function pg_temp.act_as(uid uuid) returns void language plpgsql as $$
begin perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true); end $$;

-- Seed: Neha 70h @ band 1100, Aarav 40h @ 800, Ananya 30h @ 1800 on P1 BOQ stage
select pg_temp.act_as('00000000-0000-4000-8000-000000000003');   -- PM
set local role authenticated;
select is((select blended_cost from project_cost_rollup() where project_id = 'a1000000-0000-4000-8000-000000000001'),
  (70 * 1100 + 40 * 800 + 30 * 1800)::numeric, 'blended cost visible to PM');
-- cost_rate_privacy
select is((select actual_cost from project_cost_rollup() where project_id = 'a1000000-0000-4000-8000-000000000001'), null, 'PM gets no actual cost');
select throws_ok($$ select cost_rate_on('00000000-0000-4000-8000-000000000004', current_date) $$, '42501', null, 'rate lookup not callable');
reset role;

select pg_temp.act_as('00000000-0000-4000-8000-000000000006');   -- finance
set local role authenticated;
-- Neha: 5 days @1000 (Sep 28-Oct 2 straddles the 1 Oct change: 3 days @1000, 2 days @1150) + 5 days @1000
select is((select actual_cost from project_cost_rollup() where project_id = 'a1000000-0000-4000-8000-000000000001'),
  (8 * 7 * 1000 + 2 * 7 * 1150 + 40 * 750 + 30 * 1700)::numeric, 'actual cost uses the rate effective on each date');
reset role;

select pg_temp.act_as('00000000-0000-4000-8000-000000000004');   -- architect
set local role authenticated;
select is((select count(*)::int from project_cost_rollup()), 0, 'architect sees no project costs');
select is((select count(distinct profile_id)::int from staff_week_hours('2026-09-21', '2026-10-04')), 1, 'architect sees only own hours');
reset role;

-- unrated hours are reported
select pg_temp.act_as('00000000-0000-4000-8000-000000000001');   -- owner
update profiles set rate_band_id = null where id = '00000000-0000-4000-8000-000000000005';
select is((select unrated_hours from project_cost_rollup() where project_id = 'a1000000-0000-4000-8000-000000000001'), 40.00::numeric, 'unrated hours counted');

select * from finish();
rollback;
