create type public.change_order_reason as enum ('client_request', 'site_condition', 'regulatory', 'design_error');
create type public.change_order_status as enum ('draft', 'submitted', 'approved', 'rejected');

create table public.change_orders (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  number text not null,
  title text not null check (length(trim(title)) > 0),
  description text,
  reason public.change_order_reason not null,
  fee_impact numeric(14,2) not null default 0 check (fee_impact >= 0),
  cost_impact numeric(14,2) not null default 0,
  schedule_impact_days int not null default 0,
  status public.change_order_status not null default 'draft',
  submitted_at timestamptz,
  decided_at timestamptz,
  decided_by text,
  decision_note text,
  created_by uuid references public.profiles(id) default auth.uid(),
  created_at timestamptz not null default now(),
  unique (project_id, number),
  check (reason <> 'design_error' or fee_impact = 0)
);
create index on public.change_orders (project_id);
alter table public.change_orders enable row level security;

alter table public.invoices add column change_order_id uuid references public.change_orders(id);
create index on public.invoices (change_order_id);

create function public.number_change_order() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.reason = 'design_error' and new.fee_impact > 0 then
    raise exception 'A design error is the studio''s cost; it cannot carry a fee to the client';
  end if;
  new.number := 'CO-' || lpad((select count(*) + 1 from change_orders where project_id = new.project_id)::text, 2, '0');
  return new;
end $$;
create trigger change_orders_number before insert on public.change_orders for each row execute function public.number_change_order();

create policy co_read on change_orders for select to authenticated using (
  can_manage_project(project_id) or (is_project_client(project_id) and status <> 'draft'));
create policy co_insert on change_orders for insert to authenticated with check (can_manage_project(project_id) and status = 'draft');
create policy co_update on change_orders for update to authenticated
  using (can_manage_project(project_id) and status = 'draft')
  with check (can_manage_project(project_id) and status in ('draft', 'submitted'));
create policy co_delete on change_orders for delete to authenticated using (can_manage_project(project_id) and status = 'draft');

create function public.client_decide_change_order(p_co uuid, p_approve boolean, p_signer text, p_note text) returns void
language plpgsql security definer set search_path = public as $$
declare v record;
begin
  select * into v from change_orders where id = p_co for update;
  if v.id is null or not is_project_client(v.project_id) then raise exception 'Not allowed'; end if;
  if v.status <> 'submitted' then raise exception 'Only submitted change orders can be approved or rejected'; end if;
  if p_approve and coalesce(trim(p_signer), '') = '' then raise exception 'Signer name is required'; end if;
  if not p_approve and coalesce(trim(p_note), '') = '' then raise exception 'A reason is required to decline'; end if;

  update change_orders
     set status = case when p_approve then 'approved'::change_order_status else 'rejected' end,
         decided_at = now(), decided_by = nullif(trim(p_signer), ''), decision_note = nullif(trim(p_note), '')
   where id = p_co;

  if p_approve and v.fee_impact > 0 then
    insert into invoices (project_id, status, subtotal, gst_rate, change_order_id, notes)
    values (v.project_id, 'draft', v.fee_impact, (select gst_rate from firm_settings), p_co, v.number || ': ' || v.title);
  end if;

  perform log_activity(v.project_id, null, v.number || (case when p_approve then ' approved' else ' declined' end), coalesce(p_note, ''), 'note');
  perform notify_project_staff(v.project_id, 'change_order_decided', v.number || (case when p_approve then ' approved' else ' declined' end),
                               v.title, '/projects/' || v.project_id);
end $$;

create function public.on_change_order_submitted() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'submitted' and old.status = 'draft' then
    perform notify_project_clients(new.project_id, 'change_order_submitted', 'Change order ' || new.number || ' needs your approval', new.title, null);
  end if;
  return new;
end $$;
create trigger change_orders_submitted after update of status on public.change_orders
  for each row execute function public.on_change_order_submitted();

create trigger change_orders_audit after insert or update or delete on public.change_orders
  for each row execute function public.audit_row();
