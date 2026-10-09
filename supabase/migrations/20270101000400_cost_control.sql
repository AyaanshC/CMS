create type public.expense_status as enum ('pending', 'approved', 'rejected');
create type public.cost_type as enum ('design', 'execution');

alter table public.expenses
  add column vendor_id uuid references public.vendors(id),
  add column boq_line_item_id uuid references public.boq_line_items(id) on delete set null,
  add column cost_type public.cost_type not null default 'design',
  add column status public.expense_status not null default 'approved',
  add column decided_by uuid references public.profiles(id),
  add column decision_note text;

create function public.expense_approval() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.boq_line_item_id is not null then new.cost_type := 'execution'; end if;
  if new.amount > (select (approval_thresholds->>'expense')::numeric from firm_settings)
     and not (public.has_role('owner') or public.has_role('finance')) then
    new.status := 'pending';
  else
    new.status := 'approved';
  end if;
  return new;
end $$;
create trigger expenses_approval before insert on public.expenses for each row execute function public.expense_approval();

create function public.decide_expense(p_expense uuid, p_approve boolean, p_note text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not (public.has_role('owner') or public.has_role('finance')) then raise exception 'Not allowed'; end if;
  if not p_approve and coalesce(trim(p_note), '') = '' then raise exception 'Give a reason'; end if;
  update expenses set status = case when p_approve then 'approved'::expense_status else 'rejected' end,
         decided_by = auth.uid(), decision_note = nullif(trim(p_note), '')
   where id = p_expense and status = 'pending';
  if not found then raise exception 'Only pending expenses can be decided'; end if;
end $$;

alter table public.snags add column vendor_id uuid references public.vendors(id);

create function public.boq_cost_control()
returns table (project_id uuid, line_item_id uuid, category text, description text, unit text, quantity numeric,
               sell_rate numeric, cost_rate numeric, sell_amount numeric, budget numeric, committed numeric, actual numeric)
language sql stable security definer set search_path = public as $$
  select v.project_id, li.id, s.category, li.description, li.unit, li.quantity, li.unit_rate, c.cost_rate,
         round(li.quantity * li.unit_rate, 2),
         case when c.cost_rate is null then null else round(li.quantity * c.cost_rate, 2) end,
         coalesce((select sum(l.amount) from po_lines l join purchase_orders o on o.id = l.po_id
                   where l.boq_line_item_id = li.id and o.status in ('approved', 'issued', 'closed')), 0),
         coalesce((select sum(bl.amount) from vendor_bill_lines bl join vendor_bills b on b.id = bl.bill_id
                   join po_lines l on l.id = bl.po_line_id
                   where l.boq_line_item_id = li.id and b.status = 'approved'), 0)
         + coalesce((select sum(e.amount) from expenses e where e.boq_line_item_id = li.id and e.status = 'approved'), 0)
  from boq_versions v
  join boq_sections s on s.boq_version_id = v.id
  join boq_line_items li on li.section_id = s.id
  left join boq_line_costs c on c.line_item_id = li.id
  where v.status = 'approved' and v.is_active and public.can_procure(v.project_id)
$$;

create policy expenses_read_procurement on expenses for select to authenticated using (public.can_procure(project_id));
