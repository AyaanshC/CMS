create type public.engagement_type as enum ('design_only', 'design_and_execution');
create type public.fee_basis as enum ('percent_of_cost', 'lump_sum', 'per_sqft', 'hourly');
create type public.discipline as enum ('architecture', 'interiors', 'both');
create type public.fee_stage_kind as enum ('design_fee', 'execution');
create type public.fee_stage_status as enum ('not_started', 'in_progress', 'complete');

alter table public.projects
  add column engagement_type public.engagement_type,
  add column discipline public.discipline,
  add column fee_basis public.fee_basis,
  add column fee_rate numeric(12,2) check (fee_rate is null or fee_rate >= 0),
  add column fee_amount numeric(14,2) check (fee_amount is null or fee_amount >= 0),
  add column estimated_construction_cost numeric(14,2) check (estimated_construction_cost is null or estimated_construction_cost >= 0);

alter table public.clients add column payment_terms_days int not null default 14 check (payment_terms_days between 0 and 180);

-- Only owner/director change commercial terms.
create function public.guard_fee_terms() returns trigger language plpgsql
security definer set search_path = public as $$
begin
  if (new.fee_basis, new.fee_rate, new.fee_amount, new.estimated_construction_cost, new.engagement_type)
     is distinct from (old.fee_basis, old.fee_rate, old.fee_amount, old.estimated_construction_cost, old.engagement_type)
     and auth.uid() is not null
     and not (public.has_role('owner'::public.app_role) or public.has_role('director'::public.app_role)) then
    raise exception 'Only an owner or director can change fee terms';
  end if;
  return new;
end $$;
create trigger projects_fee_guard before update on public.projects for each row execute function public.guard_fee_terms();

create table public.fee_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  discipline public.discipline not null,
  kind public.fee_stage_kind not null,
  stages jsonb not null   -- [{ "name": text, "percent": number, "checklist": [text] }]
);

create table public.project_fee_stages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  kind public.fee_stage_kind not null,
  name text not null,
  percent numeric(5,2) not null check (percent > 0 and percent <= 100),
  sort_order int not null default 0,
  status public.fee_stage_status not null default 'not_started',
  percent_complete int not null default 0 check (percent_complete between 0 and 100),
  planned_start date,
  planned_end date,
  completed_at timestamptz,
  checklist jsonb not null default '[]'::jsonb,   -- [{ "label": text, "done": bool }]
  created_at timestamptz not null default now()
);
create index on public.project_fee_stages (project_id, kind, sort_order);
alter table public.project_fee_stages enable row level security;
alter table public.fee_templates enable row level security;

create function public.project_fee_value(p uuid) returns numeric
language sql stable security definer set search_path = public as $$
  select coalesce(case fee_basis
    when 'percent_of_cost' then round(coalesce(fee_rate, 0) * coalesce(estimated_construction_cost, 0) / 100, 2)
    when 'per_sqft' then round(coalesce(fee_rate, 0) * coalesce(area_sqft, 0), 2)
    when 'lump_sum' then coalesce(fee_amount, 0)
    else 0 end, 0)
  from projects where id = p
$$;

-- Execution billing base: active approved BOQ items subtotal minus discount (GST is added on the invoice).
create function public.execution_base(p uuid) returns numeric
language sql stable security definer set search_path = public as $$
  select coalesce((
    select sum(round(li.quantity * li.unit_rate, 2)) - max(v.discount_amount)
    from boq_versions v
    join boq_sections s on s.boq_version_id = v.id
    join boq_line_items li on li.section_id = s.id
    where v.project_id = p and v.status = 'approved' and v.is_active
  ), 0)
$$;

create function public.fee_percent_total(p uuid, k public.fee_stage_kind) returns numeric
language sql stable security definer set search_path = public as $$
  select coalesce(sum(percent), 0) from project_fee_stages where project_id = p and kind = k
$$;

alter table public.invoices add column fee_stage_id uuid references public.project_fee_stages(id);
create index on public.invoices (fee_stage_id);

create view public.fee_stage_summary with (security_invoker = true) as
select s.id, s.project_id, s.kind, s.name, s.percent, s.sort_order, s.status, s.percent_complete,
       s.planned_start, s.planned_end, s.completed_at, s.checklist,
       round(case s.kind when 'design_fee' then project_fee_value(s.project_id) else execution_base(s.project_id) end
             * s.percent / 100, 2) as amount,
       round(case s.kind when 'design_fee' then project_fee_value(s.project_id) else execution_base(s.project_id) end
             * s.percent / 100 * s.percent_complete / 100, 2) as earned,
       coalesce((select sum(i.subtotal - i.discount) from invoices i
                 where i.fee_stage_id = s.id and i.status <> 'cancelled'), 0)::numeric(14,2) as invoiced
from public.project_fee_stages s;

-- RLS: staff on the project manage; the client sees the schedule; completion only via RPC (Task 3).
create policy fee_templates_read on fee_templates for select to authenticated using (is_staff());
create policy fee_templates_write on fee_templates for all to authenticated
  using (has_role('owner') or has_role('director')) with check (has_role('owner') or has_role('director'));
create policy fee_stages_read on project_fee_stages for select to authenticated using (
  can_manage_project(project_id) or is_project_client(project_id));
create policy fee_stages_insert on project_fee_stages for insert to authenticated with check (
  can_manage_project(project_id) and status <> 'complete');
create policy fee_stages_update on project_fee_stages for update to authenticated
  using (can_manage_project(project_id) and status <> 'complete')
  with check (can_manage_project(project_id) and status <> 'complete');
create policy fee_stages_delete on project_fee_stages for delete to authenticated using (
  can_manage_project(project_id) and status = 'not_started');

create trigger project_fee_stages_audit after insert or update or delete on public.project_fee_stages
  for each row execute function public.audit_row();
