alter table public.payments add column tds_amount numeric(14,2) not null default 0 check (tds_amount >= 0);
alter table public.invoices
  add column retention_amount numeric(14,2) not null default 0 check (retention_amount >= 0),
  add column retention_released_at timestamptz;

create table public.credit_notes (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id),
  number text unique,
  amount numeric(14,2) not null check (amount > 0),
  reason text not null check (length(trim(reason)) > 0),
  issued_at date not null default current_date,
  created_by uuid references public.profiles(id) default auth.uid(),
  created_at timestamptz not null default now()
);
create index on public.credit_notes (invoice_id);
alter table public.credit_notes enable row level security;
create policy credit_notes_read on credit_notes for select to authenticated using (can_see_project_finance(invoice_project(invoice_id)));
create policy credit_notes_insert on credit_notes for insert to authenticated with check (has_role('owner') or has_role('finance'));
create trigger credit_notes_audit after insert or update or delete on public.credit_notes for each row execute function public.audit_row();

-- invoice_summary v2 (same name; callers keep working)
drop view public.invoice_summary;
create view public.invoice_summary with (security_invoker = true) as
with pay as (
  select invoice_id, sum(amount) as paid, sum(tds_amount) as tds, max(payment_date) as last_payment_date
  from public.payments group by invoice_id
), cn as (
  select invoice_id, sum(amount) as credited from public.credit_notes group by invoice_id
)
select i.id, i.project_id,
       coalesce(pay.paid, 0)::numeric(14,2) as amount_paid,
       coalesce(pay.tds, 0)::numeric(14,2) as tds_amount,
       coalesce(cn.credited, 0)::numeric(14,2) as credited,
       (case when i.retention_released_at is null then i.retention_amount else 0 end)::numeric(14,2) as retention_held,
       greatest(i.total_amount - coalesce(pay.paid, 0) - coalesce(pay.tds, 0) - coalesce(cn.credited, 0)
                - case when i.retention_released_at is null then i.retention_amount else 0 end, 0)::numeric(14,2) as amount_due,
       case
         when i.status = 'cancelled' then 'cancelled'
         when i.status = 'draft' then 'draft'
         when i.total_amount - coalesce(pay.paid, 0) - coalesce(pay.tds, 0) - coalesce(cn.credited, 0)
              - case when i.retention_released_at is null then i.retention_amount else 0 end <= 0 then 'paid'
         when i.due_date < current_date then 'overdue'
         when coalesce(pay.paid, 0) + coalesce(pay.tds, 0) > 0 then 'partial'
         else 'sent'
       end as effective_status,
       pay.last_payment_date
from public.invoices i
left join pay on pay.invoice_id = i.id
left join cn on cn.invoice_id = i.id;

-- Payment guard v2: amount + TDS, net of credits.
create or replace function public.guard_payment() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_total numeric; v_status invoice_status; v_settled numeric;
begin
  select total_amount, status into v_total, v_status from invoices where id = new.invoice_id for update;
  if v_status is distinct from 'sent' then raise exception 'Payments can only be recorded against sent invoices'; end if;
  select coalesce(sum(amount + tds_amount), 0) into v_settled from payments where invoice_id = new.invoice_id;
  v_settled := v_settled + coalesce((select sum(amount) from credit_notes where invoice_id = new.invoice_id), 0);
  if v_settled + new.amount + new.tds_amount > v_total then
    raise exception 'Payment of % exceeds amount due %', new.amount + new.tds_amount, v_total - v_settled;
  end if;
  return new;
end $$;

create function public.guard_credit_note() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_due numeric; v_fy text; v_no int;
begin
  select amount_due + retention_held into v_due from invoice_summary where id = new.invoice_id;
  if (select status from invoices where id = new.invoice_id) <> 'sent' then raise exception 'Credit notes apply to sent invoices only'; end if;
  if new.amount > v_due then raise exception 'Credit of % exceeds remaining balance %', new.amount, v_due; end if;
  v_fy := financial_year(new.issued_at);
  insert into invoice_counters (fy, last_no) values ('CN-' || v_fy, 1)
    on conflict (fy) do update set last_no = invoice_counters.last_no + 1 returning last_no into v_no;
  new.number := 'CN/' || v_fy || '/' || lpad(v_no::text, 4, '0');
  return new;
end $$;
create trigger credit_notes_guard before insert on public.credit_notes for each row execute function public.guard_credit_note();

-- Due date from client payment terms when sending without one.
create function public.default_due_date() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'sent' and new.due_date is null then
    new.issue_date := coalesce(new.issue_date, current_date);
    new.due_date := new.issue_date + (select c.payment_terms_days from projects p join clients c on c.id = p.client_id where p.id = new.project_id);
  end if;
  return new;
end $$;
-- Runs before the numbering trigger (alphabetical: invoices_due < invoices_number).
create trigger invoices_due before insert or update of status on public.invoices for each row execute function public.default_due_date();
