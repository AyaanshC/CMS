create type public.vendor_status as enum ('active', 'preferred', 'blacklisted');

create table public.vendors (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  category text not null,
  gstin text,
  pan text,
  phone text,
  email text,
  address text,
  bank_details jsonb not null default '{}'::jsonb,
  payment_terms_days int not null default 30 check (payment_terms_days between 0 and 180),
  status public.vendor_status not null default 'active',
  notes text,
  created_at timestamptz not null default now(),
  unique (name, gstin)
);
alter table public.vendors enable row level security;
create policy vendors_read on vendors for select to authenticated using (public.is_staff());
create policy vendors_write on vendors for all to authenticated
  using (public.has_role('owner') or public.has_role('director') or public.has_role('procurement') or public.has_role('finance'))
  with check (public.has_role('owner') or public.has_role('director') or public.has_role('procurement') or public.has_role('finance'));
create trigger vendors_audit after insert or update or delete on public.vendors for each row execute function public.audit_row();

alter table public.firm_settings add column approval_thresholds jsonb not null
  default '{"po_director":100000,"po_owner":500000,"expense":10000}'::jsonb;
alter table public.item_library add column standard_cost_rate numeric(14,2);

create function public.can_procure(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select can_bill_project(p)
      or (public.has_role('procurement') and exists (select 1 from projects where id = p and engagement_type = 'design_and_execution'))
$$;

-- Procurement reads the execution projects it buys for (additional permissive policies).
create policy projects_read_procurement on projects for select to authenticated using (can_procure(id));
create policy boq_read_procurement on boq_versions for select to authenticated using (can_procure(project_id));

create table public.boq_line_costs (
  line_item_id uuid primary key references public.boq_line_items(id) on delete cascade,
  cost_rate numeric(14,2) not null check (cost_rate >= 0),
  updated_at timestamptz not null default now()
);
alter table public.boq_line_costs enable row level security;

create function public.line_project(l uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select v.project_id from boq_line_items li join boq_sections s on s.id = li.section_id join boq_versions v on v.id = s.boq_version_id where li.id = l
$$;

create policy line_costs_all on boq_line_costs for all to authenticated
  using (can_procure(line_project(line_item_id))) with check (can_procure(line_project(line_item_id)));
create trigger boq_line_costs_updated before update on public.boq_line_costs for each row execute function public.set_updated_at();
create trigger boq_line_costs_audit after insert or update or delete on public.boq_line_costs for each row execute function public.audit_row();
