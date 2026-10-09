begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

select has_table('public', 'projects', 'projects table exists');
select has_table('public', 'invoices', 'invoices table exists');
select has_table('public', 'payments', 'payments table exists');
select is(public.financial_year('2026-03-31'), '25-26', 'March belongs to previous FY');
select is(public.financial_year('2026-04-01'), '26-27', 'April starts new FY');
select matches(public.next_project_reference(), '^PRJ-\d{4}-\d{4}$', 'project reference format');
select is(
  (select relrowsecurity from pg_class where oid = 'public.invoices'::regclass),
  true, 'RLS enabled on invoices');
select is(
  (select count(*)::int from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity),
  0, 'RLS enabled on every public table');

select * from finish();
rollback;
