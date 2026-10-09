begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

-- Monday 2026-10-12: nobody except seeded people submitted week of 2026-10-05
select ok(generate_delivery_alerts('2026-10-12') > 0, 'Monday run creates reminders');
select ok(exists (select 1 from alerts where kind = 'timesheet_missing' and recipient_id = '00000000-0000-4000-8000-000000000004'), 'architect reminded');
select ok(not exists (select 1 from alerts where kind = 'timesheet_missing' and recipient_id = '00000000-0000-4000-8000-000000000011'), 'clients never reminded');
select ok(generate_delivery_alerts('2026-10-13') > 0, 'Tuesday escalates');
select ok(exists (select 1 from alerts where kind = 'timesheet_missing_manager' and recipient_id = '00000000-0000-4000-8000-000000000003'), 'PM told about their team');

select * from finish();
rollback;
