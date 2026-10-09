create table public.vendor_quotes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  vendor_id uuid not null references public.vendors(id),
  boq_line_item_id uuid references public.boq_line_items(id) on delete set null,
  package_name text,
  description text,
  quantity numeric(12,3) not null check (quantity > 0),
  rate numeric(14,2) not null check (rate >= 0),
  valid_until date,
  received_at date not null default current_date,
  created_by uuid references public.profiles(id) default auth.uid(),
  created_at timestamptz not null default now(),
  check (boq_line_item_id is not null or package_name is not null)
);
create index on public.vendor_quotes (project_id);
alter table public.vendor_quotes enable row level security;
create policy quotes_all on vendor_quotes for all to authenticated using (public.can_procure(project_id)) with check (public.can_procure(project_id));

create type public.po_status as enum ('draft', 'pending_approval', 'approved', 'issued', 'closed', 'cancelled');

create table public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id),
  vendor_id uuid not null references public.vendors(id),
  number text unique,
  status public.po_status not null default 'draft',
  order_date date not null default current_date,
  expected_delivery date,
  notes text,
  approval_required_role public.app_role,
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  cancel_reason text,
  created_by uuid references public.profiles(id) default auth.uid(),
  created_at timestamptz not null default now()
);
create index on public.purchase_orders (project_id);
create index on public.purchase_orders (vendor_id);
alter table public.purchase_orders enable row level security;

create table public.po_lines (
  id uuid primary key default gen_random_uuid(),
  po_id uuid not null references public.purchase_orders(id) on delete cascade,
  boq_line_item_id uuid references public.boq_line_items(id) on delete set null,
  description text not null,
  unit text not null,
  quantity numeric(12,3) not null check (quantity > 0),
  rate numeric(14,2) not null check (rate >= 0),
  gst_rate numeric(5,2) not null default 18 check (gst_rate between 0 and 28),
  amount numeric(14,2) generated always as (round(quantity * rate, 2)) stored
);
create index on public.po_lines (po_id);
create index on public.po_lines (boq_line_item_id);
alter table public.po_lines enable row level security;

create function public.po_project(p uuid) returns uuid language sql stable security definer set search_path = public as $$
  select project_id from purchase_orders where id = p $$;
create function public.po_status_of(p uuid) returns public.po_status language sql stable security definer set search_path = public as $$
  select status from purchase_orders where id = p $$;

-- POs: procurement-capable roles read; drafts editable by them; status changes via RPCs.
create policy po_read on purchase_orders for select to authenticated using (public.can_procure(project_id) or public.can_manage_project(project_id));
create policy po_insert on purchase_orders for insert to authenticated with check (public.can_procure(project_id) and status = 'draft');
create policy po_update on purchase_orders for update to authenticated
  using (public.can_procure(project_id) and status = 'draft') with check (public.can_procure(project_id) and status = 'draft');
create policy po_delete on purchase_orders for delete to authenticated using (public.can_procure(project_id) and status = 'draft');
create policy po_lines_read on po_lines for select to authenticated using (exists (select 1 from purchase_orders p where p.id = po_id));
create policy po_lines_write on po_lines for all to authenticated
  using (public.can_procure(po_project(po_id)) and po_status_of(po_id) = 'draft')
  with check (public.can_procure(po_project(po_id)) and po_status_of(po_id) = 'draft');

create trigger purchase_orders_audit after insert or update or delete on public.purchase_orders for each row execute function public.audit_row();
create trigger po_lines_audit after insert or update or delete on public.po_lines for each row execute function public.audit_row();

create function public.po_required_role(p_po uuid) returns public.app_role
language plpgsql stable security definer set search_path = public as $$
declare v_po record; v_total numeric; v_t jsonb; v_over boolean;
begin
  select * into v_po from purchase_orders where id = p_po;
  select approval_thresholds into v_t from firm_settings;

  select coalesce(sum(l.amount), 0) into v_total
  from po_lines l join purchase_orders o on o.id = l.po_id
  where o.id = p_po
     or (o.vendor_id = v_po.vendor_id and o.project_id = v_po.project_id and o.order_date = v_po.order_date
         and o.status not in ('draft', 'cancelled'));

  select exists (
    select 1 from po_lines l
    left join boq_line_costs c on c.line_item_id = l.boq_line_item_id
    left join boq_line_items li on li.id = l.boq_line_item_id
    where l.po_id = p_po and (
      l.boq_line_item_id is null or c.cost_rate is null
      or (select coalesce(sum(x.amount), 0) from po_lines x join purchase_orders o on o.id = x.po_id
          where x.boq_line_item_id = l.boq_line_item_id and o.id <> p_po and o.status in ('approved', 'issued', 'closed'))
         + l.amount > round(li.quantity * c.cost_rate, 2))
  ) into v_over;

  if v_total > (v_t->>'po_owner')::numeric then return 'owner'; end if;
  if v_total > (v_t->>'po_director')::numeric or v_over then return 'director'; end if;
  return null;
end $$;

create function public.assign_po_number(p_po uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_fy text := financial_year(current_date); v_no int;
begin
  insert into invoice_counters (fy, last_no) values ('PO-' || v_fy, 1)
    on conflict (fy) do update set last_no = invoice_counters.last_no + 1 returning last_no into v_no;
  update purchase_orders set number = 'PO/' || v_fy || '/' || lpad(v_no::text, 4, '0') where id = p_po and number is null;
end $$;

create function public.submit_po(p_po uuid) returns text
language plpgsql security definer set search_path = public as $$
declare v_po record; v_role app_role;
begin
  select * into v_po from purchase_orders where id = p_po for update;
  if v_po.id is null or not can_procure(v_po.project_id) then raise exception 'Not allowed'; end if;
  if v_po.status <> 'draft' then raise exception 'Only draft purchase orders can be submitted'; end if;
  if not exists (select 1 from po_lines where po_id = p_po) then raise exception 'Add at least one line'; end if;
  if (select status from vendors where id = v_po.vendor_id) = 'blacklisted' then raise exception 'This vendor is blacklisted'; end if;

  v_role := po_required_role(p_po);
  if v_role is null then
    update purchase_orders set status = 'approved', approval_required_role = null, approved_at = now() where id = p_po;
    perform assign_po_number(p_po);
    return 'none';
  end if;
  update purchase_orders set status = 'pending_approval', approval_required_role = v_role where id = p_po;
  insert into notifications (user_id, type, title, body, link)
  select distinct r.user_id, 'po_approval', 'PO awaiting your approval', (select name from projects where id = v_po.project_id), '/projects/' || v_po.project_id
  from user_roles r
  where (r.role = v_role or r.role = 'owner') and r.user_id is distinct from v_po.created_by;
  return v_role::text;
end $$;

create function public.approve_po(p_po uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_po record;
begin
  select * into v_po from purchase_orders where id = p_po for update;
  if v_po.id is null or v_po.status <> 'pending_approval' then raise exception 'Purchase order is not awaiting approval'; end if;
  if v_po.created_by = auth.uid() then raise exception 'You are not allowed to approve your own purchase order'; end if;
  if v_po.approval_required_role = 'owner' and not public.has_role('owner') then
    raise exception 'This purchase order needs the owner''s approval';
  end if;
  if v_po.approval_required_role = 'director' and not (public.has_role('owner') or public.has_role('director')) then
    raise exception 'You are not allowed to approve this purchase order';
  end if;
  update purchase_orders set status = 'approved', approved_by = auth.uid(), approved_at = now() where id = p_po;
  perform assign_po_number(p_po);
end $$;

create function public.issue_po(p_po uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_po record;
begin
  select * into v_po from purchase_orders where id = p_po for update;
  if v_po.id is null or not can_procure(v_po.project_id) then raise exception 'Not allowed'; end if;
  if v_po.status <> 'approved' then raise exception 'Only approved purchase orders can be issued'; end if;
  update purchase_orders set status = 'issued' where id = p_po;
end $$;

create function public.cancel_po(p_po uuid, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare v_po record; v_has_bills boolean := false;
begin
  select * into v_po from purchase_orders where id = p_po for update;
  if v_po.id is null or not can_procure(v_po.project_id) then raise exception 'Not allowed'; end if;
  if coalesce(trim(p_reason), '') = '' then raise exception 'Give a reason'; end if;
  if to_regclass('public.vendor_bill_lines') is not null then
    execute 'select exists (select 1 from public.vendor_bill_lines bl join public.po_lines l on l.id = bl.po_line_id where l.po_id = $1)' into v_has_bills using p_po;
    if v_has_bills then
      raise exception 'This purchase order has bills against it and cannot be cancelled';
    end if;
  end if;
  update purchase_orders set status = 'cancelled', cancel_reason = trim(p_reason) where id = p_po;
end $$;
