create table public.goods_receipts (
  id uuid primary key default gen_random_uuid(),
  po_id uuid not null references public.purchase_orders(id),
  received_on date not null default current_date,
  received_by uuid references public.profiles(id) default auth.uid(),
  notes text,
  photo_url text,
  created_at timestamptz not null default now()
);
create table public.grn_lines (
  id uuid primary key default gen_random_uuid(),
  grn_id uuid not null references public.goods_receipts(id) on delete cascade,
  po_line_id uuid not null references public.po_lines(id),
  quantity_received numeric(12,3) not null check (quantity_received > 0),
  quantity_rejected numeric(12,3) not null default 0 check (quantity_rejected >= 0),
  condition_note text,
  check (quantity_rejected <= quantity_received)
);
create index on public.goods_receipts (po_id);
create index on public.grn_lines (po_line_id);
alter table public.goods_receipts enable row level security;
alter table public.grn_lines enable row level security;

-- Receiving: anyone managing the project (site supervisors included), only on issued POs.
create policy grn_read on goods_receipts for select to authenticated using (public.can_procure(po_project(po_id)) or public.can_manage_project(po_project(po_id)));
create policy grn_insert on goods_receipts for insert to authenticated with check (
  public.can_manage_project(po_project(po_id)) and po_status_of(po_id) = 'issued' and received_by = auth.uid());
create policy grn_lines_read on grn_lines for select to authenticated using (exists (select 1 from goods_receipts g where g.id = grn_id));
create policy grn_lines_insert on grn_lines for insert to authenticated with check (
  exists (select 1 from goods_receipts g where g.id = grn_id and g.received_by = auth.uid()));

create type public.vendor_bill_status as enum ('recorded', 'approved', 'disputed');

create table public.vendor_bills (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id),
  project_id uuid not null references public.projects(id),
  po_id uuid references public.purchase_orders(id),
  bill_number text not null,
  bill_date date not null,
  due_date date,
  status public.vendor_bill_status not null default 'recorded',
  notes text,
  file_path text,
  approved_by uuid references public.profiles(id),
  created_by uuid references public.profiles(id) default auth.uid(),
  created_at timestamptz not null default now(),
  unique (vendor_id, bill_number)
);
create table public.vendor_bill_lines (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null references public.vendor_bills(id) on delete cascade,
  po_line_id uuid references public.po_lines(id),
  description text not null,
  quantity numeric(12,3) not null check (quantity > 0),
  rate numeric(14,2) not null check (rate >= 0),
  gst_rate numeric(5,2) not null default 18,
  amount numeric(14,2) generated always as (round(quantity * rate, 2)) stored,
  gst_amount numeric(14,2) generated always as (round(round(quantity * rate, 2) * gst_rate / 100, 2)) stored
);

create view public.po_line_progress with (security_invoker = true) as
select l.id as po_line_id,
       coalesce((select sum(quantity_received) from grn_lines where po_line_id = l.id), 0)::numeric(12,3) as received_qty,
       coalesce((select sum(quantity_rejected) from grn_lines where po_line_id = l.id), 0)::numeric(12,3) as rejected_qty,
       coalesce((select sum(bl.quantity) from vendor_bill_lines bl join vendor_bills b on b.id = bl.bill_id
                 where bl.po_line_id = l.id and b.status <> 'disputed'), 0)::numeric(12,3) as billed_qty
from public.po_lines l;
create table public.vendor_payments (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id),
  bill_id uuid references public.vendor_bills(id),
  project_id uuid not null references public.projects(id),
  amount numeric(14,2) not null check (amount > 0),
  tds_amount numeric(14,2) not null default 0 check (tds_amount >= 0),
  paid_on date not null,
  mode public.payment_mode not null,
  reference text,
  is_advance boolean not null default false,
  created_by uuid references public.profiles(id) default auth.uid(),
  created_at timestamptz not null default now(),
  check (is_advance or bill_id is not null)
);
create index on public.vendor_bills (project_id);
create index on public.vendor_bill_lines (bill_id);
create index on public.vendor_bill_lines (po_line_id);
create index on public.vendor_payments (bill_id);
alter table public.vendor_bills enable row level security;
alter table public.vendor_bill_lines enable row level security;
alter table public.vendor_payments enable row level security;

create function public.bill_status_of(b uuid) returns public.vendor_bill_status language sql stable security definer set search_path = public as $$
  select status from vendor_bills where id = b $$;
create function public.bill_project(b uuid) returns uuid language sql stable security definer set search_path = public as $$
  select project_id from vendor_bills where id = b $$;

create policy bills_read on vendor_bills for select to authenticated using (public.can_procure(project_id));
create policy bills_insert on vendor_bills for insert to authenticated with check (
  (public.has_role('finance') or public.has_role('procurement') or public.has_role('owner')) and public.can_procure(project_id) and status = 'recorded');
create policy bills_update on vendor_bills for update to authenticated
  using ((public.has_role('finance') or public.has_role('owner')) and status = 'recorded')
  with check ((public.has_role('finance') or public.has_role('owner')) and status = 'recorded');
create policy bill_lines_read on vendor_bill_lines for select to authenticated using (exists (select 1 from vendor_bills b where b.id = bill_id));
create policy bill_lines_write on vendor_bill_lines for all to authenticated
  using (public.can_procure(bill_project(bill_id)) and bill_status_of(bill_id) = 'recorded')
  with check (public.can_procure(bill_project(bill_id)) and bill_status_of(bill_id) = 'recorded');
create policy vpay_read on vendor_payments for select to authenticated using (public.can_procure(project_id));
create policy vpay_insert on vendor_payments for insert to authenticated with check (public.has_role('finance') or public.has_role('owner'));

create trigger vendor_bills_audit after insert or update or delete on public.vendor_bills for each row execute function public.audit_row();
create trigger vendor_bill_lines_audit after insert or update or delete on public.vendor_bill_lines for each row execute function public.audit_row();
create trigger vendor_payments_audit after insert or update or delete on public.vendor_payments for each row execute function public.audit_row();
create trigger grn_lines_audit after insert or update or delete on public.grn_lines for each row execute function public.audit_row();

create function public.bill_match_issues(p_bill uuid) returns text[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(issue order by issue), '{}') from (
    select bl.description || ': billed ' || bl.quantity || ' but only ' ||
           (p.received_qty - p.rejected_qty - (p.billed_qty - case when b.status <> 'disputed' then bl.quantity else 0 end)) || ' accepted and unbilled' as issue
    from vendor_bill_lines bl join vendor_bills b on b.id = bl.bill_id
    join po_line_progress p on p.po_line_id = bl.po_line_id
    where bl.bill_id = p_bill
      and bl.quantity > p.received_qty - p.rejected_qty - (p.billed_qty - case when b.status <> 'disputed' then bl.quantity else 0 end)
    union all
    select bl.description || ': rate ' || bl.rate || ' above PO rate ' || l.rate
    from vendor_bill_lines bl join po_lines l on l.id = bl.po_line_id
    where bl.bill_id = p_bill and bl.rate > l.rate
  ) x
$$;

create view public.vendor_bill_summary with (security_invoker = true) as
select b.id,
       coalesce(sum(bl.amount), 0)::numeric(14,2) as subtotal,
       coalesce(sum(bl.gst_amount), 0)::numeric(14,2) as gst_amount,
       (coalesce(sum(bl.amount), 0) + coalesce(sum(bl.gst_amount), 0))::numeric(14,2) as total,
       coalesce((select sum(amount + tds_amount) from vendor_payments where bill_id = b.id), 0)::numeric(14,2) as paid,
       greatest(coalesce(sum(bl.amount), 0) + coalesce(sum(bl.gst_amount), 0)
                - coalesce((select sum(amount + tds_amount) from vendor_payments where bill_id = b.id), 0), 0)::numeric(14,2) as outstanding,
       bill_match_issues(b.id) as match_issues
from public.vendor_bills b
left join public.vendor_bill_lines bl on bl.bill_id = b.id
group by b.id;

create function public.approve_vendor_bill(p_bill uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v record;
begin
  select * into v from vendor_bills where id = p_bill for update;
  if v.id is null or not (public.has_role('finance') or public.has_role('owner')) then raise exception 'Not allowed'; end if;
  if v.status <> 'recorded' then raise exception 'Only recorded bills can be approved'; end if;
  if array_length(bill_match_issues(p_bill), 1) > 0 then
    raise exception 'Bill does not match the purchase order and receipts: %', array_to_string(bill_match_issues(p_bill), '; ');
  end if;
  update vendor_bills set status = 'approved', approved_by = auth.uid(),
         due_date = coalesce(due_date, bill_date + (select payment_terms_days from vendors where id = v.vendor_id))
   where id = p_bill;
end $$;

create function public.dispute_vendor_bill(p_bill uuid, p_note text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not (public.has_role('finance') or public.has_role('owner')) then raise exception 'Not allowed'; end if;
  if coalesce(trim(p_note), '') = '' then raise exception 'Give a reason'; end if;
  update vendor_bills set status = 'disputed', notes = trim(p_note) where id = p_bill and status = 'recorded';
  if not found then raise exception 'Only recorded bills can be disputed'; end if;
end $$;

-- Close a PO once every line is fully accepted and billed.
create function public.maybe_close_po() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_po uuid;
begin
  select l.po_id into v_po from po_lines l where l.id = coalesce(new.po_line_id, null);
  if v_po is null then return null; end if;
  if not exists (
    select 1 from po_lines l join po_line_progress p on p.po_line_id = l.id
    where l.po_id = v_po and (p.received_qty - p.rejected_qty < l.quantity or p.billed_qty < l.quantity)
  ) then
    update purchase_orders set status = 'closed' where id = v_po and status = 'issued';
  end if;
  return null;
end $$;
create trigger grn_lines_close after insert on public.grn_lines for each row execute function public.maybe_close_po();
create trigger bill_lines_close after insert or update on public.vendor_bill_lines for each row execute function public.maybe_close_po();
