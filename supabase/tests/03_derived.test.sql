begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

-- invoice_status: effective status rules
select is((select effective_status from invoice_summary where id = 'e1000000-0000-4000-8000-000000000001'), 'partial', 'part-paid, not yet due = partial');
select is((select effective_status from invoice_summary where id = 'e1000000-0000-4000-8000-000000000002'), 'overdue', 'unpaid past due = overdue');
select is((select effective_status from invoice_summary where id = 'e1000000-0000-4000-8000-000000000003'), 'draft', 'draft stays draft');
select is((select amount_due from invoice_summary where id = 'e1000000-0000-4000-8000-000000000001'), 195000.00::numeric, 'amount due = total - payments');

update invoices set due_date = current_date - 1 where id = 'e1000000-0000-4000-8000-000000000001';
select is((select effective_status from invoice_summary where id = 'e1000000-0000-4000-8000-000000000001'), 'overdue', 'part-paid past due = overdue');
update invoices set due_date = current_date where id = 'e1000000-0000-4000-8000-000000000001';
select is((select effective_status from invoice_summary where id = 'e1000000-0000-4000-8000-000000000001'), 'partial', 'due today is not overdue');

-- payment_overflow
select throws_like($$ insert into payments (invoice_id, amount, payment_date, mode) values ('e1000000-0000-4000-8000-000000000001', 195000.01, current_date, 'upi') $$,
  '%exceeds amount due%', 'overpayment rejected');
insert into payments (invoice_id, amount, payment_date, mode) values ('e1000000-0000-4000-8000-000000000001', 195000, current_date, 'upi');
update invoices set due_date = current_date - 30 where id = 'e1000000-0000-4000-8000-000000000001';
select is((select effective_status from invoice_summary where id = 'e1000000-0000-4000-8000-000000000001'), 'paid', 'fully paid past due = paid');
select throws_like($$ insert into payments (invoice_id, amount, payment_date, mode) values ('e1000000-0000-4000-8000-000000000003', 10, current_date, 'upi') $$,
  '%sent invoices%', 'cannot pay a draft');

-- invoice numbering on send
update invoices set status = 'sent', due_date = current_date + 14 where id = 'e1000000-0000-4000-8000-000000000003';
select matches((select invoice_number from invoices where id = 'e1000000-0000-4000-8000-000000000003'),
  '^PDS/\d{2}-\d{2}/\d{4}$', 'number assigned on send');

-- snag timestamps
update snags set status = 'fixed' where title = 'Wardrobe shutter misaligned';
select isnt((select fixed_at from snags where title = 'Wardrobe shutter misaligned'), null, 'fixed_at stamped');

-- activity + audit
select ok(exists (select 1 from activity_logs where type = 'payment_received'), 'payment writes activity');
select ok(exists (select 1 from audit_log where table_name = 'invoices' and action = 'UPDATE'), 'invoice update audited');

select * from finish();
rollback;
