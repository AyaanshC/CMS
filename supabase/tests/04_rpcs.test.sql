begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

create function pg_temp.act_as(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
end $$;

-- client_decide_boq
select pg_temp.act_as('00000000-0000-4000-8000-000000000012');   -- Rohit, not P1's client
set local role authenticated;
select throws_like($$ select client_decide_boq('b0000000-0000-4000-8000-000000000001', true, 'Rohit', null) $$,
  '%Not allowed%', 'other client cannot decide');
reset role;

select pg_temp.act_as('00000000-0000-4000-8000-000000000011');   -- Arun, P1's client
set local role authenticated;
select throws_like($$ select client_decide_boq('b0000000-0000-4000-8000-000000000001', false, 'Arun', '  ') $$,
  '%reason is required%', 'rejection needs a reason');
select lives_ok($$ select client_decide_boq('b0000000-0000-4000-8000-000000000001', true, 'Arun Sharma', 'Looks good') $$, 'client approves');
select throws_like($$ select client_decide_boq('b0000000-0000-4000-8000-000000000001', true, 'Arun Sharma', null) $$,
  '%Only submitted%', 'cannot approve twice');
reset role;
select is((select status::text from boq_versions where id = 'b0000000-0000-4000-8000-000000000001'), 'approved', 'status approved');
select is((select approved_by from boq_versions where id = 'b0000000-0000-4000-8000-000000000001'), 'Arun Sharma', 'signer recorded');

-- client_close_snag only from fixed/verified
select pg_temp.act_as('00000000-0000-4000-8000-000000000011');
set local role authenticated;
select throws_like($$ select client_close_snag((select id from snags where title = 'Cove light gap near window')) $$,
  '%only after it is fixed%', 'cannot close an unfixed snag');
reset role;

-- create_boq_version is atomic and numbers versions
select pg_temp.act_as('00000000-0000-4000-8000-000000000003');
set local role authenticated;
select lives_ok($$ select create_boq_version('{"project_id":"a1000000-0000-4000-8000-000000000001","version_label":"Rev 2","sections":[{"name":"Kitchen","category":"Carpentry","items":[{"description":"Base unit","unit":"rft","quantity":12,"unit_rate":2400}]}]}'::jsonb) $$, 'PM creates v2');
reset role;
select is((select max(version_number) from boq_versions where project_id = 'a1000000-0000-4000-8000-000000000001'), 2, 'version numbered 2');

-- submit_onboarding as anon
set local role anon;
select matches(submit_onboarding('{"full_name":"Test Lead","phone":"+91 90000 00000","area_sqft":1200,"rooms":["Living","Kitchen"]}'::jsonb),
  '^PRJ-', 'anon onboarding returns reference');
reset role;

select * from finish();
rollback;
