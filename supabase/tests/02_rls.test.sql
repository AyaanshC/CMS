begin;
create extension if not exists pgtap with schema extensions;
select plan(20);

-- Helper: act as a user for the rest of the statement batch.
create function pg_temp.act_as(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
end $$;

-- Architect Neha: member of P1 only
select pg_temp.act_as('00000000-0000-4000-8000-000000000004');
set local role authenticated;
select is((select count(*)::int from projects), 1, 'architect sees only member projects');
select is((select count(*)::int from invoices), 0, 'architect sees no invoices');
select throws_ok($$ insert into payments (invoice_id, amount, payment_date, mode) values ('e1000000-0000-4000-8000-000000000001', 10, current_date, 'cash') $$,
  '42501', null, 'architect cannot record payments');
reset role;

-- PM Ananya: manager of P1 and P3
select pg_temp.act_as('00000000-0000-4000-8000-000000000003');
set local role authenticated;
select is((select count(*)::int from projects), 2, 'PM sees managed projects');
select is((select count(*)::int from invoices), 2, 'PM sees invoices of managed projects incl. drafts');
select is((select count(*)::int from expenses), 2, 'PM sees expenses of managed projects');
reset role;

-- Admin Sunil: all projects, no finance
select pg_temp.act_as('00000000-0000-4000-8000-000000000007');
set local role authenticated;
select is((select count(*)::int from projects), 3, 'admin sees all projects');
select is((select count(*)::int from invoices), 0, 'admin sees no invoices');
select is((select count(*)::int from clients), 3, 'admin sees all clients');
reset role;

-- Finance Meera
select pg_temp.act_as('00000000-0000-4000-8000-000000000006');
set local role authenticated;
select is((select count(*)::int from invoices), 3, 'finance sees all invoices');
select lives_ok($$ insert into payments (invoice_id, amount, payment_date, mode) values ('e1000000-0000-4000-8000-000000000001', 1000, current_date, 'upi') $$,
  'finance can record payments');
reset role;

-- Client Arun (C1 / P1)  [rls_client_isolation]
select pg_temp.act_as('00000000-0000-4000-8000-000000000011');
set local role authenticated;
select is((select count(*)::int from projects), 1, 'client sees only own project');
select is((select count(*)::int from projects where id = 'a1000000-0000-4000-8000-000000000002'), 0, 'client cannot see another client project');
select is((select count(*)::int from invoices), 1, 'client sees only non-draft invoices of own project');
select is((select count(*)::int from expenses), 0, 'client sees no expenses');
select is((select count(*)::int from tasks), 1, 'client sees only non-internal tasks');
select is((select count(*)::int from boq_versions), 1, 'client sees submitted BOQ only');
select is((select count(*)::int from clients), 1, 'client sees only own client record');
reset role;

-- BOQ lock  [rls_boq_locked]: PM cannot add items to a submitted BOQ
select pg_temp.act_as('00000000-0000-4000-8000-000000000003');
set local role authenticated;
select throws_ok($$ insert into boq_line_items (section_id, description, unit, quantity, unit_rate) values ('b1000000-0000-4000-8000-000000000001', 'x', 'nos', 1, 1) $$,
  '42501', null, 'items of a submitted BOQ are locked');
reset role;

-- Owner can edit a draft BOQ
select pg_temp.act_as('00000000-0000-4000-8000-000000000001');
set local role authenticated;
select lives_ok($$ insert into boq_line_items (section_id, description, unit, quantity, unit_rate) values ('b1000000-0000-4000-8000-000000000002', 'Chair', 'nos', 40, 6500) $$,
  'draft BOQ items are editable');
reset role;

select * from finish();
rollback;
