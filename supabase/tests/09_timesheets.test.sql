begin;
create extension if not exists pgtap with schema extensions;
select plan(19);

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

-- save_week_replaces_drafts
select pg_temp.act_as('00000000-0000-4000-8000-000000000004');
set local role authenticated;
select is(save_timesheet_week('2026-10-05', '[{"project_id":"a1000000-0000-4000-8000-000000000001","activity":"design","billable":true,"hours":[8,8,0,0,0,0,0]},{"project_id":null,"activity":"leave","billable":false,"hours":[0,0,8,0,0,0,0]}]'::jsonb),
  3, 'three non-zero cells saved');
select is(save_timesheet_week('2026-10-05', '[{"project_id":"a1000000-0000-4000-8000-000000000001","activity":"design","billable":true,"hours":[8,8,0,0,0,0,0]},{"project_id":null,"activity":"leave","billable":false,"hours":[0,0,8,0,0,0,0]}]'::jsonb),
  3, 'saving again replaces');
select is((select sum(hours) from timesheet_entries where profile_id = auth.uid() and work_date between '2026-10-05' and '2026-10-11'), 24.00::numeric, 'no duplicated hours');
select throws_like($$ select save_timesheet_week('2026-10-06', '[]'::jsonb) $$, '%Monday%', 'week must start Monday');
select is(submit_timesheet_week('2026-10-05'), 3, 'submit week');
select is((select status::text from timesheet_entries where profile_id = auth.uid() and activity = 'leave' and work_date = '2026-10-07'), 'approved', 'leave auto-approved');
reset role;

-- no_self_approval: Ananya logs on P1 (she manages it) -> must go to director Vikram
select pg_temp.act_as('00000000-0000-4000-8000-000000000003');
set local role authenticated;
select ok(save_timesheet_week('2026-10-05', '[{"project_id":"a1000000-0000-4000-8000-000000000001","activity":"coordination","billable":true,"hours":[2,0,0,0,0,0,0]}]'::jsonb) > 0, 'setup: PM saves');
select ok(submit_timesheet_week('2026-10-05') > 0, 'setup: PM submits');
select throws_like($$ select decide_timesheet_entries(array(select id from timesheet_entries where profile_id = auth.uid() and work_date = '2026-10-05'), true, null) $$,
  '%not allowed to approve%', 'manager cannot approve own time');
select is(decide_timesheet_entries(array(select id from timesheet_entries where profile_id = '00000000-0000-4000-8000-000000000004' and work_date between '2026-10-05' and '2026-10-06'), true, null),
  2, 'manager approves team time');
reset role;

select pg_temp.act_as('00000000-0000-4000-8000-000000000002');   -- director Vikram
set local role authenticated;
select is(decide_timesheet_entries(array(select id from timesheet_entries where profile_id = '00000000-0000-4000-8000-000000000003' and work_date = '2026-10-05'), true, null),
  1, 'director approves the manager');
reset role;

select * from finish();
rollback;
