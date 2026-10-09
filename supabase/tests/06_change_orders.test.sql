begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

create function pg_temp.act_as(uid uuid) returns void language plpgsql as $$
begin perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true); end $$;

select pg_temp.act_as('00000000-0000-4000-8000-000000000003');   -- PM on P1
set local role authenticated;
insert into change_orders (project_id, title, reason, fee_impact, schedule_impact_days) values
  ('a1000000-0000-4000-8000-000000000001', 'Add study room design', 'client_request', 45000, 7);
select is((select number from change_orders where title = 'Add study room design'), 'CO-01', 'numbered per project');
select throws_like($$ insert into change_orders (project_id, title, reason, fee_impact) values ('a1000000-0000-4000-8000-000000000001', 'Fix our error', 'design_error', 1000) $$,
  '%design error%', 'internal errors cannot be charged');
update change_orders set status = 'submitted', submitted_at = now() where title = 'Add study room design';
reset role;

-- Client sees submitted, decides
select pg_temp.act_as('00000000-0000-4000-8000-000000000011');
set local role authenticated;
select is((select count(*)::int from change_orders), 1, 'client sees submitted change order');
select lives_ok($$ select client_decide_change_order((select id from change_orders where title = 'Add study room design'), true, 'Arun Sharma', null) $$, 'client approves');
select throws_like($$ select client_decide_change_order((select id from change_orders where title = 'Add study room design'), true, 'Arun Sharma', null) $$,
  '%Only submitted%', 'cannot decide twice');
reset role;

select is((select status::text from change_orders where title = 'Add study room design'), 'approved', 'approved');
select is((select subtotal from invoices where change_order_id = (select id from change_orders where title = 'Add study room design') and status = 'draft'),
  45000.00::numeric, 'approved fee impact queued as draft invoice');

-- Other client cannot see it
select pg_temp.act_as('00000000-0000-4000-8000-000000000012');
set local role authenticated;
select is((select count(*)::int from change_orders), 0, 'other client sees nothing');
reset role;

select * from finish();
rollback;
