create type public.timesheet_activity as enum
  ('design','drafting','visualisation','site_visit','client_meeting','coordination','approvals','admin','business_development','training','leave');
create type public.timesheet_status as enum ('draft','submitted','approved','rejected');

create table public.rate_bands (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  blended_rate numeric(10,2) not null check (blended_rate >= 0)
);
alter table public.rate_bands enable row level security;
create policy rate_bands_read on rate_bands for select to authenticated using (is_staff());
create policy rate_bands_write on rate_bands for all to authenticated using (has_role('owner')) with check (has_role('owner'));

alter table public.profiles
  add column weekly_capacity_hours numeric(4,1) not null default 45 check (weekly_capacity_hours between 0 and 80),
  add column billable_target_percent int not null default 75 check (billable_target_percent between 0 and 100),
  add column rate_band_id uuid references public.rate_bands(id);
grant update (weekly_capacity_hours, billable_target_percent, rate_band_id) on public.profiles to authenticated;

-- Capacity, targets and rate band are set by the owner, not by the person.
create function public.guard_staff_terms() returns trigger language plpgsql as $$
begin
  if (new.weekly_capacity_hours, new.billable_target_percent, new.rate_band_id)
     is distinct from (old.weekly_capacity_hours, old.billable_target_percent, old.rate_band_id)
     and auth.uid() is not null and not has_role('owner') then
    raise exception 'Only the owner can change capacity, targets or rate bands';
  end if;
  return new;
end $$;
create trigger profiles_staff_terms before update on public.profiles for each row execute function public.guard_staff_terms();

-- Individual cost rates: owner and finance only.
create table public.staff_cost_rates (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  effective_from date not null,
  cost_rate numeric(10,2) not null check (cost_rate >= 0),
  unique (profile_id, effective_from)
);
alter table public.staff_cost_rates enable row level security;
create policy cost_rates_all on staff_cost_rates for all to authenticated
  using (has_role('owner') or has_role('finance')) with check (has_role('owner') or has_role('finance'));
create trigger staff_cost_rates_audit after insert or update or delete on public.staff_cost_rates for each row execute function public.audit_row();

create table public.timesheet_entries (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) default auth.uid(),
  work_date date not null,
  project_id uuid references public.projects(id),
  fee_stage_id uuid references public.project_fee_stages(id),
  activity public.timesheet_activity not null,
  hours numeric(4,2) not null check (hours > 0 and hours <= 24),
  billable boolean not null default true,
  notes text,
  status public.timesheet_status not null default 'draft',
  submitted_at timestamptz,
  decided_by uuid references public.profiles(id),
  decided_at timestamptz,
  decision_note text,
  created_at timestamptz not null default now(),
  check (project_id is not null or not billable),
  check (fee_stage_id is null or project_id is not null)
);
create index on public.timesheet_entries (profile_id, work_date);
create index on public.timesheet_entries (project_id, status);
alter table public.timesheet_entries enable row level security;

create function public.guard_timesheet_entry() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.fee_stage_id is not null and not exists (select 1 from project_fee_stages where id = new.fee_stage_id and project_id = new.project_id) then
    raise exception 'Stage does not belong to the project';
  end if;
  if (select coalesce(sum(hours), 0) from timesheet_entries
      where profile_id = new.profile_id and work_date = new.work_date and id <> new.id) + new.hours > 24 then
    raise exception 'Cannot log more than 24 hours on %', new.work_date;
  end if;
  return new;
end $$;
create trigger timesheet_entries_guard before insert or update on public.timesheet_entries
  for each row execute function public.guard_timesheet_entry();

create function public.manages_project(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from projects where id = p and (manager_id = auth.uid() or director_id = auth.uid()))
$$;

create policy ts_read on timesheet_entries for select to authenticated using (
  profile_id = auth.uid() or has_role('owner') or has_role('finance') or (project_id is not null and manages_project(project_id)));
create policy ts_insert on timesheet_entries for insert to authenticated with check (
  profile_id = auth.uid() and status = 'draft' and (project_id is null or can_see_project(project_id)));
create policy ts_update on timesheet_entries for update to authenticated
  using (profile_id = auth.uid() and status in ('draft', 'rejected'))
  with check (profile_id = auth.uid() and status = 'draft' and (project_id is null or can_see_project(project_id)));
create policy ts_delete on timesheet_entries for delete to authenticated using (profile_id = auth.uid() and status in ('draft', 'rejected'));
