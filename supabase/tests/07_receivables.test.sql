begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

-- payment terms default the due date on send
update clients set payment_terms_days = 30 where id = 'c1000000-0000-4000-8000-000000000001';
insert into invoices (id, project_id, status, subtotal, gst_rate) values ('e1000000-0000-4000-8000-000000000009', 'a1000000-0000-4000-8000-000000000001', 'draft', 100000, 18);
update invoices set status = 'sent' where id = 'e1000000-0000-4000-8000-000000000009';
select is((select due_date - issue_date from invoices where id = 'e1000000-0000-4000-8000-000000000009'), 30, 'due date from client terms');

-- tds_settlement: total 118000
insert into payments (invoice_id, amount, tds_amount, payment_date, mode) values ('e1000000-0000-4000-8000-000000000009', 100000, 10000, current_date, 'bank_transfer');
select is((select amount_due from invoice_summary where id = 'e1000000-0000-4000-8000-000000000009'), 8000.00::numeric, 'TDS counts towards settlement');
select throws_like($$ insert into payments (invoice_id, amount, tds_amount, payment_date, mode) values ('e1000000-0000-4000-8000-000000000009', 7000, 1001, current_date, 'upi') $$,
  '%exceeds amount due%', 'amount + TDS over balance rejected');
insert into payments (invoice_id, amount, tds_amount, payment_date, mode) values ('e1000000-0000-4000-8000-000000000009', 7200, 800, current_date, 'upi');
select is((select effective_status from invoice_summary where id = 'e1000000-0000-4000-8000-000000000009'), 'paid', 'paid when amount + TDS covers total');

-- credit notes
select throws_like($$ insert into credit_notes (invoice_id, amount, reason) values ('e1000000-0000-4000-8000-000000000001', 200000, 'too much') $$,
  '%exceeds%', 'credit cannot exceed balance');
insert into credit_notes (invoice_id, amount, reason) values ('e1000000-0000-4000-8000-000000000001', 5000, 'Rate correction');
select matches((select number from credit_notes where reason = 'Rate correction'), '^CN/\d{2}-\d{2}/\d{4}$', 'credit note numbered');
select is((select amount_due from invoice_summary where id = 'e1000000-0000-4000-8000-000000000001'), 190000.00::numeric, 'credit reduces due');

-- retention is held out of amount due until released
update invoices set retention_amount = 10000 where id = 'e1000000-0000-4000-8000-000000000001';
select is((select amount_due from invoice_summary where id = 'e1000000-0000-4000-8000-000000000001'), 180000.00::numeric, 'retention held');
update invoices set retention_released_at = now() where id = 'e1000000-0000-4000-8000-000000000001';
select is((select amount_due from invoice_summary where id = 'e1000000-0000-4000-8000-000000000001'), 190000.00::numeric, 'retention released');

select * from finish();
rollback;
