begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

create function pg_temp.act_as(uid uuid) returns void language plpgsql as $$
begin perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true); end $$;

-- I2 (TechCorp) is 20 days overdue in the seed -> 7-day client reminder (no email on file for C2? seeded: rohit@client.test)
select ok(generate_alerts(current_date) > 0, 'alerts generated');
select is((select count(*)::int from alerts where kind = 'invoice_overdue_7' and invoice_id = 'e1000000-0000-4000-8000-000000000002'), 1, '7-day reminder for I2');
select is((select email_status from alerts where kind = 'invoice_overdue_7' and invoice_id = 'e1000000-0000-4000-8000-000000000002'), 'pending', 'client reminder queued for email');
select is((select recipient_email from alerts where kind = 'invoice_overdue_7' and invoice_id = 'e1000000-0000-4000-8000-000000000002'), 'rohit@client.test', 'sent to client email');

-- alerts_idempotent
select is(generate_alerts(current_date), 0, 'second run creates nothing');

-- 30-day escalation to the project director (Priya directs P2)
select ok(generate_alerts(current_date + 11) > 0, 'later run escalates');
select is((select recipient_id from alerts where kind = 'invoice_overdue_30' and invoice_id = 'e1000000-0000-4000-8000-000000000002'),
  '00000000-0000-4000-8000-000000000001'::uuid, '30-day overdue goes to director');

-- unbilled stage: a draft stage invoice older than 3 days -> finance
insert into invoices (project_id, status, subtotal, gst_rate, fee_stage_id, created_at)
select 'a1000000-0000-4000-8000-000000000001', 'draft', 1000, 18, id, now() - interval '4 days'
from project_fee_stages where project_id = 'a1000000-0000-4000-8000-000000000001' and name = 'Concept & Moodboard';
select ok(generate_alerts(current_date) > 0, 'unbilled draft produces an alert');
select is((select recipient_id from alerts where kind = 'unbilled_stage' limit 1), '00000000-0000-4000-8000-000000000006'::uuid, 'unbilled stage alerts finance');

-- acknowledge: only the recipient
select pg_temp.act_as('00000000-0000-4000-8000-000000000006');
set local role authenticated;
select lives_ok($$ select acknowledge_alert((select id from alerts where kind = 'unbilled_stage' limit 1)) $$, 'recipient acknowledges');
reset role;

select * from finish();
rollback;
