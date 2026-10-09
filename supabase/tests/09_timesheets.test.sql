begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

create function pg_temp.act_as(uid uuid) returns void language plpgsql as $$
begin perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true); end $$;

select pg_temp.act_as('00000000-0000-4000-8000-000000000004');   -- architect Neha (member of P1)
set local role authenticated;
select lives_ok($$ insert into timesheet_entries (work_date, project_id, activity, hours) values ('2026-09-28', 'a1000000-0000-4000-8000-000000000001', 'design', 8) $$, 'log own time on a member project');
select throws_ok($$ insert into timesheet_entries (work_date, project_id, activity, hours) values ('2026-09-28', 'a1000000-0000-4000-8000-000000000002', 'design', 2) $$,
  '42501', null, 'cannot log to a project you cannot see');
select throws_like($$ insert into timesheet_entries (work_date, project_id, activity, hours) values ('2026-09-28', 'a1000000-0000-4000-8000-000000000001', 'drafting', 17) $$,
  '%more than 24 hours%', 'daily cap');
select throws_like($$ insert into timesheet_entries (work_date, activity, hours, billable) values ('2026-09-28', 'leave', 4, true) $$,
  '%violates check constraint%', 'billable needs a project');
select throws_ok($$ insert into timesheet_entries (profile_id, work_date, project_id, activity, hours) values ('00000000-0000-4000-8000-000000000005', '2026-09-28', 'a1000000-0000-4000-8000-000000000001', 'design', 1) $$,
  '42501', null, 'cannot log for someone else');
select is((select count(*)::int from staff_cost_rates), 0, 'architect cannot read cost rates');
reset role;

select pg_temp.act_as('00000000-0000-4000-8000-000000000003');   -- PM Ananya manages P1
set local role authenticated;
select ok((select count(*) from timesheet_entries where profile_id = '00000000-0000-4000-8000-000000000004') > 0, 'PM sees time on managed project');
reset role;

select pg_temp.act_as('00000000-0000-4000-8000-000000000006');   -- finance
set local role authenticated;
select ok((select count(*) from staff_cost_rates) > 0, 'finance reads cost rates');
reset role;

select * from finish();
rollback;
