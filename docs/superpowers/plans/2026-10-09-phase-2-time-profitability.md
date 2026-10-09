# Phase 2: Time and Profitability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Staff log time weekly in under three minutes; PMs approve it; the firm sees each project's real margin, estimate at completion, fee burn by stage, staff utilisation and a ranked project risk score, on role-specific dashboards.

**Architecture:** Timesheet entries live in Postgres with RLS (authors edit drafts; PMs/directors approve through RPCs). Individual cost rates sit in a table only Owner/Finance can read; a security-definer rollup function returns per-project hours and blended cost to anyone allowed to see the project's finances, and actual cost only to Owner/Finance. Profitability, utilisation and risk are pure TypeScript functions over the workspace snapshot, unit-tested with worked examples, so every number on screen has one tested definition.

**Tech Stack:** As Phases 0–1.

**Spec:** `docs/superpowers/specs/2026-10-09-mis-strategic-plan-design.md` (sections 3.1, 3.5, 4.3, 4.5, 5.1 M1/M2/M8/M10/M20, 5.2, 5.3, 6.2 rule 1, 8 R1/R2, 9.2 Phase 2)

**Prerequisite:** Phase 1 complete (`git tag phase-1-complete`). Uses Phase 0–1 names: `mutate`, `run`, `ActionResult`, `WorkspaceSnapshot`, `loadWorkspace`, `FeeStage`, `ChangeOrder`, `Invoice`, `Expense`, `feeValue`, `ratio`, `round2`, `localToday`, `hasAnyRole`, `MetricInfo`, `NotEnoughData`, `generate_alerts`, `alerts`, `can_bill_project`, `can_see_project`, `has_role`, `audit_row`.

## Global Constraints

- All Phase 0–1 global constraints apply.
- Weeks start on Monday (ISO). A timesheet week is identified by its Monday date.
- Default weekly capacity 45 hours; default billable targets: Architect 75%, Senior Architect 70%, Project Manager 60%, Director 40% (set per person; defaults apply to new staff as 75%).
- A person cannot log more than 24 hours on one date. A billable entry must have a project. A stage must belong to the entry's project.
- Only `submitted` and `approved` entries count towards cost and utilisation.
- Approval routing: an entry on a project is approved by that project's manager; if the author is the manager (or the project has none), by the project's director; the owner can approve anything. Nobody approves their own entries. Non-project entries (leave, training, admin, business development) are approved automatically on submit.
- Rejection requires a note. Approved entries are never editable.
- Salary privacy (spec 6.2 rule 1): individual cost rates are readable only by Owner and Finance. Everyone else sees costs at blended rate-band rates. The Owner can toggle margins between blended and actual.
- Margin formulas (spec 4.5): contract value = Σ stage amounts + approved change-order fees; earned = Σ stage earned + change-order fees on sent invoices; labour cost = hours × rate; direct cost = project expenses; margin to date = earned − labour − direct; percent complete = Σ stage earned ÷ Σ stage amounts; EAC margin = contract value − (labour + direct) ÷ percent complete.
- Fee-burn flag: a stage whose labour cost as % of its amount exceeds its % complete by more than 15 points.
- Risk score weights (spec 5.2), stored in `firm_settings.risk_weights`: fee burn 25, overdue receivables 20, schedule slip 15, cost variance 15, stalled approvals 10, open critical snags 10, unapproved change orders 5. Factors whose data does not exist yet (cost variance until Phase 3, stalled approvals until Phase 4) are excluded from the denominator.
- Timesheet alerts: Monday 12:00 IST to the person; Tuesday to managers of projects they logged to in the previous four weeks and a single summary to the Owner. Fee-burn alerts: burn > 80% of a stage's fee while the stage is < 70% complete → PM and Director; burn > 100% → Owner.

## Review Focus

- A PM viewing project margins must never receive any individual's cost rate, including through the rollup function or the network payload. (Task 4 test `cost_rate_privacy`)
- Saving a week twice (double-click) must not double the hours. (Task 2 test `save_week_replaces_drafts`)
- An employee must not be able to approve their own time by being a project's manager. (Task 2 test `no_self_approval`)
- A project with 0% complete must show "Not enough data yet" for EAC, not Infinity or a negative billion. (Task 6 test `eac_zero_progress`)
- Hours from people without a rate band must be visible as a warning, not silently costed at ₹0. (Task 6 test `unrated_hours_reported`)
- Week boundaries: a Sunday entry belongs to the week that started the previous Monday, across month and year ends. (Task 5 test `week_start_edges`)

---

## File Structure

```
supabase/migrations/
  20261201000100_timesheets.sql        rate bands, capacity, cost rates, entries, guards, RLS
  20261201000200_timesheet_rpcs.sql    save/submit week, approve/reject, rollups
  20261201000300_delivery_alerts.sql   timesheet + fee-burn alerts, schedule; risk weights; billing target
supabase/seed.sql                      + rate bands, cost rates, a few weeks of entries
supabase/tests/09_timesheets.test.sql  10_costing.test.sql  11_delivery_alerts.test.sql
src/types/index.ts                     + timesheet, rate band, cost rollup, risk types
src/lib/time/weeks.ts (+ .test.ts)     weekStart, weekDays, addDays
src/lib/time/utilisation.ts (+ .test.ts)
src/lib/finance/profitability.ts (+ .test.ts)
src/lib/metrics/risk.ts (+ .test.ts)
src/lib/data/{snapshot,mappers,load-workspace}.ts
src/lib/actions/schemas.ts (+ .test.ts)
src/app/actions/{timesheets,staff}.ts
src/app/(app)/timesheets/page.tsx                 My Week grid
src/app/(app)/timesheets/approvals/page.tsx       approvals queue
src/components/timesheets/{WeekGrid,ApprovalList}.tsx
src/components/dashboard/{OwnerDashboard,DirectorDashboard,PmDashboard,MyWeekDashboard,RiskTable,UtilisationTable}.tsx
src/components/projects/ProfitabilityCard.tsx
src/app/(app)/dashboard/page.tsx (role router), src/app/(app)/reports/page.tsx, src/app/(app)/settings/page.tsx
```

---

## Task 1: Timesheet, rate and capacity schema

**Files:**
- Create: `supabase/migrations/20261201000100_timesheets.sql`, `supabase/tests/09_timesheets.test.sql`
- Modify: `supabase/seed.sql`

**Interfaces:**
- Produces: enums `timesheet_activity ('design','drafting','visualisation','site_visit','client_meeting','coordination','approvals','admin','business_development','training','leave')`, `timesheet_status ('draft','submitted','approved','rejected')`; tables `rate_bands(id, name, blended_rate)`, `staff_cost_rates(id, profile_id, effective_from, cost_rate)`, `timesheet_entries(id, profile_id, work_date, project_id, fee_stage_id, activity, hours, billable, notes, status, submitted_at, decided_by, decided_at, decision_note, created_at)`; profile columns `weekly_capacity_hours, billable_target_percent, rate_band_id`; function `manages_project(uuid) → boolean`.

- [ ] **Step 1: Write the failing tests**

`supabase/tests/09_timesheets.test.sql`:

```sql
begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

create function pg_temp.act_as(uid uuid) returns void language plpgsql as $$
begin perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true); end $$;

select pg_temp.act_as('00000000-0000-4000-8000-000000000004');   -- architect Neha (member of P1)
set local role authenticated;
select lives_ok($$ insert into timesheet_entries (work_date, project_id, activity, hours) values ('2026-09-28', 'a1000000-0000-4000-8000-000000000001', 'design', 8) $$, 'log own time on a member project');
select throws_ok($$ insert into timesheet_entries (work_date, project_id, activity, hours) values ('2026-09-28', 'a1000000-0000-4000-8000-000000000002', 'design', 2) $$,
  '42501', null, 'cannot log to a project you cannot see');
select throws_like($$ insert into timesheet_entries (work_date, project_id, activity, hours) values ('2026-09-28', 'a1000000-0000-4000-8000-000000000001', 'drafting', 17) $$,
  '%more than 24 hours%', 'daily cap');
select throws_like($$ insert into timesheet_entries (work_date, activity, hours, billable) values ('2026-09-28', 'leave', 4, true) $$,
  '%violates check constraint%', 'billable needs a project');
select throws_ok($$ insert into timesheet_entries (profile_id, work_date, project_id, activity, hours) values ('00000000-0000-4000-8000-000000000005', '2026-09-28', 'a1000000-0000-4000-8000-000000000001', 'design', 1) $$,
  '42501', null, 'cannot log for someone else');
select is((select count(*)::int from staff_cost_rates), 0, 'architect cannot read cost rates');
reset role;

select pg_temp.act_as('00000000-0000-4000-8000-000000000003');   -- PM Ananya manages P1
set local role authenticated;
select ok((select count(*) from timesheet_entries where profile_id = '00000000-0000-4000-8000-000000000004') > 0, 'PM sees time on managed project');
reset role;

select pg_temp.act_as('00000000-0000-4000-8000-000000000006');   -- finance
set local role authenticated;
select ok((select count(*) from staff_cost_rates) > 0, 'finance reads cost rates');
reset role;

select * from finish();
rollback;
```

Run: `npm run test:db` → Expected: FAIL (`relation "timesheet_entries" does not exist`).

- [ ] **Step 2: Migration**

`supabase/migrations/20261201000100_timesheets.sql`:

```sql
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
```

- [ ] **Step 3: Seed**

Append to `supabase/seed.sql`:

```sql
insert into public.rate_bands (name, blended_rate) values
  ('Principal', 3500), ('Director', 2800), ('Project Manager', 1800), ('Senior Architect', 1500),
  ('Architect', 1100), ('Site Supervisor', 800), ('Support', 600);

update public.profiles p set rate_band_id = b.id, billable_target_percent = t.target
from (values
  ('00000000-0000-4000-8000-000000000001'::uuid, 'Principal', 40),
  ('00000000-0000-4000-8000-000000000002'::uuid, 'Director', 40),
  ('00000000-0000-4000-8000-000000000003'::uuid, 'Project Manager', 60),
  ('00000000-0000-4000-8000-000000000004'::uuid, 'Architect', 75),
  ('00000000-0000-4000-8000-000000000005'::uuid, 'Site Supervisor', 75),
  ('00000000-0000-4000-8000-000000000006'::uuid, 'Support', 0),
  ('00000000-0000-4000-8000-000000000007'::uuid, 'Support', 0),
  ('00000000-0000-4000-8000-000000000008'::uuid, 'Support', 50)
) as t(id, band, target)
join public.rate_bands b on b.name = t.band
where p.id = t.id;

insert into public.staff_cost_rates (profile_id, effective_from, cost_rate) values
  ('00000000-0000-4000-8000-000000000001', '2026-04-01', 3000),
  ('00000000-0000-4000-8000-000000000002', '2026-04-01', 2600),
  ('00000000-0000-4000-8000-000000000003', '2026-04-01', 1700),
  ('00000000-0000-4000-8000-000000000004', '2026-04-01', 1000),
  ('00000000-0000-4000-8000-000000000004', '2026-10-01', 1150),
  ('00000000-0000-4000-8000-000000000005', '2026-04-01', 750);

-- Two weeks of approved time on Sharma Residence (weeks starting 2026-09-21 and 2026-09-28).
insert into public.timesheet_entries (profile_id, work_date, project_id, fee_stage_id, activity, hours, status, submitted_at, decided_by, decided_at)
select u.id, d::date, 'a1000000-0000-4000-8000-000000000001',
       (select id from public.project_fee_stages where project_id = 'a1000000-0000-4000-8000-000000000001' and name = 'BOQ & Specifications'),
       u.activity::public.timesheet_activity, u.hours, 'approved', now(), '00000000-0000-4000-8000-000000000003', now()
from (values
  ('00000000-0000-4000-8000-000000000004'::uuid, 'drafting', 7),
  ('00000000-0000-4000-8000-000000000005'::uuid, 'site_visit', 4)) as u(id, activity, hours)
cross join generate_series('2026-09-21'::date, '2026-10-02'::date, interval '1 day') d
where extract(isodow from d) <= 5;

insert into public.timesheet_entries (profile_id, work_date, project_id, fee_stage_id, activity, hours, status, submitted_at, decided_by, decided_at)
select '00000000-0000-4000-8000-000000000003', d::date, 'a1000000-0000-4000-8000-000000000001',
       (select id from public.project_fee_stages where project_id = 'a1000000-0000-4000-8000-000000000001' and name = 'BOQ & Specifications'),
       'coordination', 3, 'approved', now(), '00000000-0000-4000-8000-000000000002', now()
from generate_series('2026-09-21'::date, '2026-10-02'::date, interval '1 day') d where extract(isodow from d) <= 5;
```

- [ ] **Step 4: Run tests and commit**

Run: `npm run db:reset && npm run test:db` → Expected: all `ok`.

```bash
git add supabase
git commit -m "feat(db): timesheets, rate bands, private cost rates and capacity"
```

---

## Task 2: Saving, submitting and approving weeks

**Files:**
- Create: `supabase/migrations/20261201000200_timesheet_rpcs.sql`
- Modify: `supabase/tests/09_timesheets.test.sql`

**Interfaces:**
- Produces RPCs:
  - `save_timesheet_week(p_week date, p_rows jsonb) → int` (entries written). `p_rows`: `[{ "project_id": uuid|null, "fee_stage_id": uuid|null, "activity": text, "billable": bool, "notes": text|null, "hours": [mon..sun numbers] }]`. Replaces the caller's draft/rejected entries for that week; submitted/approved entries are untouched.
  - `submit_timesheet_week(p_week date) → int` (entries submitted; non-project entries auto-approved).
  - `decide_timesheet_entries(p_ids uuid[], p_approve boolean, p_note text) → int`.
  - `can_approve_entry(p_entry uuid) → boolean`.

- [ ] **Step 1: Extend the failing tests**

Change `select plan(8);` to `select plan(19);` and add before `finish()`:

```sql
-- save_week_replaces_drafts
select pg_temp.act_as('00000000-0000-4000-8000-000000000004');
set local role authenticated;
select is(save_timesheet_week('2026-10-05', '[{"project_id":"a1000000-0000-4000-8000-000000000001","activity":"design","billable":true,"hours":[8,8,0,0,0,0,0]},{"project_id":null,"activity":"leave","billable":false,"hours":[0,0,8,0,0,0,0]}]'::jsonb),
  3, 'three non-zero cells saved');
select is(save_timesheet_week('2026-10-05', '[{"project_id":"a1000000-0000-4000-8000-000000000001","activity":"design","billable":true,"hours":[8,8,0,0,0,0,0]},{"project_id":null,"activity":"leave","billable":false,"hours":[0,0,8,0,0,0,0]}]'::jsonb),
  3, 'saving again replaces');
select is((select sum(hours) from timesheet_entries where profile_id = auth.uid() and work_date between '2026-10-05' and '2026-10-11'), 24.00::numeric, 'no duplicated hours');
select throws_like($$ select save_timesheet_week('2026-10-06', '[]'::jsonb) $$, '%Monday%', 'week must start Monday');
select is(submit_timesheet_week('2026-10-05'), 3, 'submit week');
select is((select status::text from timesheet_entries where profile_id = auth.uid() and activity = 'leave' and work_date = '2026-10-07'), 'approved', 'leave auto-approved');
reset role;

-- no_self_approval: Ananya logs on P1 (she manages it) -> must go to director Vikram
select pg_temp.act_as('00000000-0000-4000-8000-000000000003');
set local role authenticated;
select ok(save_timesheet_week('2026-10-05', '[{"project_id":"a1000000-0000-4000-8000-000000000001","activity":"coordination","billable":true,"hours":[2,0,0,0,0,0,0]}]'::jsonb) > 0, 'setup: PM saves');
select ok(submit_timesheet_week('2026-10-05') > 0, 'setup: PM submits');
select throws_like($$ select decide_timesheet_entries(array(select id from timesheet_entries where profile_id = auth.uid() and work_date = '2026-10-05'), true, null) $$,
  '%not allowed to approve%', 'manager cannot approve own time');
select is(decide_timesheet_entries(array(select id from timesheet_entries where profile_id = '00000000-0000-4000-8000-000000000004' and work_date between '2026-10-05' and '2026-10-06'), true, null),
  2, 'manager approves team time');
reset role;

select pg_temp.act_as('00000000-0000-4000-8000-000000000002');   -- director Vikram
set local role authenticated;
select is(decide_timesheet_entries(array(select id from timesheet_entries where profile_id = '00000000-0000-4000-8000-000000000003' and work_date = '2026-10-05'), true, null),
  1, 'director approves the manager');
reset role;
```

Run: `npm run test:db` → Expected: FAIL (`function save_timesheet_week does not exist`).

- [ ] **Step 2: Migration**

`supabase/migrations/20261201000200_timesheet_rpcs.sql`:

```sql
create function public.save_timesheet_week(p_week date, p_rows jsonb) returns int
language plpgsql security invoker set search_path = public as $$
declare v_row jsonb; v_day int; v_hours numeric; v_count int := 0;
begin
  if extract(isodow from p_week) <> 1 then raise exception 'A timesheet week must start on a Monday'; end if;
  delete from timesheet_entries
   where profile_id = auth.uid() and work_date between p_week and p_week + 6 and status in ('draft', 'rejected');
  for v_row in select * from jsonb_array_elements(p_rows) loop
    for v_day in 0..6 loop
      v_hours := coalesce((v_row->'hours'->>v_day)::numeric, 0);
      continue when v_hours <= 0;
      insert into timesheet_entries (profile_id, work_date, project_id, fee_stage_id, activity, hours, billable, notes)
      values (auth.uid(), p_week + v_day, nullif(v_row->>'project_id', '')::uuid, nullif(v_row->>'fee_stage_id', '')::uuid,
              (v_row->>'activity')::timesheet_activity, v_hours,
              coalesce((v_row->>'billable')::boolean, false) and nullif(v_row->>'project_id', '') is not null,
              nullif(v_row->>'notes', ''));
      v_count := v_count + 1;
    end loop;
  end loop;
  return v_count;
end $$;

create function public.submit_timesheet_week(p_week date) returns int
language plpgsql security definer set search_path = public as $$
declare v_count int;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  update timesheet_entries
     set status = case when project_id is null then 'approved'::timesheet_status else 'submitted' end,
         submitted_at = now(),
         decided_at = case when project_id is null then now() end,
         decision_note = null
   where profile_id = auth.uid() and work_date between p_week and p_week + 6 and status in ('draft', 'rejected');
  get diagnostics v_count = row_count;
  return v_count;
end $$;

create function public.can_approve_entry(p_entry uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select e.profile_id <> auth.uid() and (
           has_role('owner')
        or (p.manager_id = auth.uid())
        or (p.director_id = auth.uid() and (p.manager_id is null or p.manager_id = e.profile_id)))
  from timesheet_entries e join projects p on p.id = e.project_id
  where e.id = p_entry
$$;

create function public.decide_timesheet_entries(p_ids uuid[], p_approve boolean, p_note text) returns int
language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_count int;
begin
  if not p_approve and coalesce(trim(p_note), '') = '' then raise exception 'Say why the time is being sent back'; end if;
  foreach v_id in array p_ids loop
    if not coalesce(can_approve_entry(v_id), false) then
      raise exception 'You are not allowed to approve entry %', v_id;
    end if;
  end loop;
  update timesheet_entries
     set status = case when p_approve then 'approved'::timesheet_status else 'rejected' end,
         decided_by = auth.uid(), decided_at = now(), decision_note = nullif(trim(p_note), '')
   where id = any(p_ids) and status = 'submitted';
  get diagnostics v_count = row_count;
  if not p_approve then
    insert into notifications (user_id, type, title, body, link)
    select distinct profile_id, 'timesheet_rejected', 'Timesheet sent back', p_note, '/timesheets'
    from timesheet_entries where id = any(p_ids);
  end if;
  return v_count;
end $$;
```

- [ ] **Step 3: Run tests and commit**

Run: `npm run db:reset && npm run test:db` → Expected: all `ok`.

```bash
git add supabase
git commit -m "feat(db): save, submit and approve timesheet weeks with routing rules"
```

---

## Task 3: Cost rollups and utilisation data

**Files:**
- Create: `supabase/migrations/20261201000250_rollups.sql`, `supabase/tests/10_costing.test.sql`

**Interfaces:**
- Produces:
  - `cost_rate_on(p_profile uuid, p_date date) → numeric` (definer; not granted to `authenticated`)
  - `project_cost_rollup() → table(project_id uuid, fee_stage_id uuid, hours numeric, billable_hours numeric, unrated_hours numeric, blended_cost numeric, actual_cost numeric)` (rows only for projects where `can_bill_project`; `actual_cost` is null unless caller is owner/finance)
  - `staff_week_hours(p_from date, p_to date) → table(profile_id uuid, week_start date, total_hours numeric, billable_hours numeric, submitted boolean)` (owner/director/finance see everyone; others see themselves)

- [ ] **Step 1: Write the failing tests**

`supabase/tests/10_costing.test.sql`:

```sql
begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

create function pg_temp.act_as(uid uuid) returns void language plpgsql as $$
begin perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true); end $$;

-- Seed: Neha 70h @ band 1100, Aarav 40h @ 800, Ananya 30h @ 1800 on P1 BOQ stage
select pg_temp.act_as('00000000-0000-4000-8000-000000000003');   -- PM
set local role authenticated;
select is((select blended_cost from project_cost_rollup() where project_id = 'a1000000-0000-4000-8000-000000000001'),
  (70 * 1100 + 40 * 800 + 30 * 1800)::numeric, 'blended cost visible to PM');
-- cost_rate_privacy
select is((select actual_cost from project_cost_rollup() where project_id = 'a1000000-0000-4000-8000-000000000001'), null, 'PM gets no actual cost');
select throws_ok($$ select cost_rate_on('00000000-0000-4000-8000-000000000004', current_date) $$, '42501', null, 'rate lookup not callable');
reset role;

select pg_temp.act_as('00000000-0000-4000-8000-000000000006');   -- finance
set local role authenticated;
-- Neha: 5 days @1000 (Sep 28-Oct 2 straddles the 1 Oct change: 3 days @1000, 2 days @1150) + 5 days @1000
select is((select actual_cost from project_cost_rollup() where project_id = 'a1000000-0000-4000-8000-000000000001'),
  (8 * 7 * 1000 + 2 * 7 * 1150 + 40 * 750 + 30 * 1700)::numeric, 'actual cost uses the rate effective on each date');
reset role;

select pg_temp.act_as('00000000-0000-4000-8000-000000000004');   -- architect
set local role authenticated;
select is((select count(*)::int from project_cost_rollup()), 0, 'architect sees no project costs');
select is((select count(distinct profile_id)::int from staff_week_hours('2026-09-21', '2026-10-04')), 1, 'architect sees only own hours');
reset role;

-- unrated hours are reported
update profiles set rate_band_id = null where id = '00000000-0000-4000-8000-000000000005';
select is((select unrated_hours from project_cost_rollup() where project_id = 'a1000000-0000-4000-8000-000000000001'), 40.00::numeric, 'unrated hours counted');

select * from finish();
rollback;
```

Run: `npm run test:db` → Expected: FAIL.

- [ ] **Step 2: Migration**

`supabase/migrations/20261201000250_rollups.sql`:

```sql
create function public.cost_rate_on(p_profile uuid, p_date date) returns numeric
language sql stable security definer set search_path = public as $$
  select cost_rate from staff_cost_rates where profile_id = p_profile and effective_from <= p_date
  order by effective_from desc limit 1
$$;
revoke execute on function public.cost_rate_on(uuid, date) from public, anon, authenticated;

create function public.project_cost_rollup()
returns table (project_id uuid, fee_stage_id uuid, hours numeric, billable_hours numeric, unrated_hours numeric, blended_cost numeric, actual_cost numeric)
language sql stable security definer set search_path = public as $$
  select e.project_id, e.fee_stage_id,
         sum(e.hours), coalesce(sum(e.hours) filter (where e.billable), 0),
         coalesce(sum(e.hours) filter (where b.id is null), 0),
         round(sum(e.hours * coalesce(b.blended_rate, 0)), 2),
         case when has_role('owner') or has_role('finance')
              then round(sum(e.hours * coalesce(cost_rate_on(e.profile_id, e.work_date), 0)), 2) end
  from timesheet_entries e
  join profiles pr on pr.id = e.profile_id
  left join rate_bands b on b.id = pr.rate_band_id
  where e.project_id is not null and e.status in ('submitted', 'approved') and can_bill_project(e.project_id)
  group by e.project_id, e.fee_stage_id
$$;

create function public.staff_week_hours(p_from date, p_to date)
returns table (profile_id uuid, week_start date, total_hours numeric, billable_hours numeric, submitted boolean)
language sql stable security definer set search_path = public as $$
  select e.profile_id, date_trunc('week', e.work_date)::date,
         sum(e.hours) filter (where e.status in ('submitted', 'approved')),
         coalesce(sum(e.hours) filter (where e.billable and e.status in ('submitted', 'approved')), 0),
         bool_and(e.status in ('submitted', 'approved'))
  from timesheet_entries e
  where e.work_date between p_from and p_to
    and (has_role('owner') or has_role('director') or has_role('finance') or e.profile_id = auth.uid())
  group by 1, 2
$$;
```

Note on the actual-cost expectation: seeded Neha entries are weekdays 21 Sep–2 Oct (10 days × 7 h). Days on/after 1 Oct (Thu 1, Fri 2) use ₹1,150; the other 8 days use ₹1,000.

- [ ] **Step 3: Run tests and commit**

Run: `npm run db:reset && npm run test:db` → Expected: all `ok`.

```bash
git add supabase
git commit -m "feat(db): project cost rollup with blended/actual split and weekly hours"
```

---

## Task 4: Delivery alerts, risk weights and billing target

**Files:**
- Create: `supabase/migrations/20261201000300_delivery_alerts.sql`, `supabase/tests/11_delivery_alerts.test.sql`

**Interfaces:**
- Produces: `firm_settings.risk_weights jsonb` (defaults from Global Constraints), `firm_settings.monthly_billing_target numeric(14,2)`; function `generate_delivery_alerts(p_today date default current_date) → int`; cron job `delivery-alerts` daily 06:45 UTC (12:15 IST).

- [ ] **Step 1: Failing tests**

`supabase/tests/11_delivery_alerts.test.sql`:

```sql
begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

-- Monday 2026-10-12: nobody except seeded people submitted week of 2026-10-05
select ok(generate_delivery_alerts('2026-10-12') > 0, 'Monday run creates reminders');
select ok(exists (select 1 from alerts where kind = 'timesheet_missing' and recipient_id = '00000000-0000-4000-8000-000000000004'), 'architect reminded');
select ok(not exists (select 1 from alerts where kind = 'timesheet_missing' and recipient_id = '00000000-0000-4000-8000-000000000011'), 'clients never reminded');
select ok(generate_delivery_alerts('2026-10-13') > 0, 'Tuesday escalates');
select ok(exists (select 1 from alerts where kind = 'timesheet_missing_manager' and recipient_id = '00000000-0000-4000-8000-000000000003'), 'PM told about their team');

select * from finish();
rollback;
```

- [ ] **Step 2: Migration**

`supabase/migrations/20261201000300_delivery_alerts.sql`:

```sql
alter table public.firm_settings
  add column risk_weights jsonb not null default
    '{"fee_burn":25,"overdue":20,"schedule":15,"cost_variance":15,"approvals":10,"critical_snags":10,"pending_changes":5}'::jsonb,
  add column monthly_billing_target numeric(14,2);

create function public.generate_delivery_alerts(p_today date default current_date) returns int
language plpgsql security definer set search_path = public as $$
declare v_week date := date_trunc('week', p_today)::date - 7; v_count int := 0; v_n int;
begin
  -- Missing timesheets for last week, from Monday onwards: tell the person.
  drop table if exists pg_temp.missing;   -- the function may run twice in one transaction
  create temp table missing on commit drop as
    select pr.id, pr.full_name from profiles pr
    where pr.kind = 'staff' and pr.active and pr.weekly_capacity_hours > 0
      and not exists (select 1 from timesheet_entries e where e.profile_id = pr.id
                      and e.work_date between v_week and v_week + 6 and e.status in ('submitted', 'approved'));

  insert into alerts (kind, dedupe_key, recipient_id, title, body, link)
  select 'timesheet_missing', 'timesheet_missing:' || m.id || ':' || v_week, m.id,
         'Timesheet for week of ' || to_char(v_week, 'DD Mon') || ' not submitted', 'Please submit it today.', '/timesheets'
  from missing m
  on conflict (dedupe_key) do nothing;
  get diagnostics v_n = row_count; v_count := v_count + v_n;

  if p_today >= v_week + 8 then   -- Tuesday or later
    insert into alerts (kind, dedupe_key, recipient_id, title, body, link)
    select 'timesheet_missing_manager', 'timesheet_missing_manager:' || p.manager_id || ':' || m.id || ':' || v_week, p.manager_id,
           m.full_name || ' has not submitted last week''s timesheet', 'Week of ' || to_char(v_week, 'DD Mon'), '/timesheets/approvals'
    from missing m
    join (select distinct profile_id, project_id from timesheet_entries where work_date >= v_week - 28) recent on recent.profile_id = m.id
    join projects p on p.id = recent.project_id
    where p.manager_id is not null and p.manager_id <> m.id
    on conflict (dedupe_key) do nothing;
    get diagnostics v_n = row_count; v_count := v_count + v_n;

    insert into alerts (kind, dedupe_key, recipient_id, title, body, link)
    select 'timesheet_missing_summary', 'timesheet_missing_summary:' || r.user_id || ':' || v_week, r.user_id,
           (select count(*) from missing) || ' people missed last week''s timesheet',
           (select string_agg(full_name, ', ' order by full_name) from missing), '/timesheets/approvals'
    from user_roles r where r.role = 'owner' and exists (select 1 from missing)
    on conflict (dedupe_key) do nothing;
    get diagnostics v_n = row_count; v_count := v_count + v_n;
  end if;

  -- Fee burn (blended cost) per design stage.
  insert into alerts (kind, dedupe_key, recipient_id, project_id, title, body, link)
  select 'fee_burn', 'fee_burn:' || s.id || ':' || u.uid, u.uid, s.project_id,
         'Fee burn on ' || p.name || ' · ' || s.name,
         round(c.blended / nullif(s.amount, 0) * 100) || '% of the stage fee used at ' || s.percent_complete || '% complete.',
         '/projects/' || s.project_id
  from fee_stage_summary s
  join projects p on p.id = s.project_id
  join (select e.fee_stage_id, sum(e.hours * coalesce(b.blended_rate, 0)) as blended
        from timesheet_entries e join profiles pr on pr.id = e.profile_id left join rate_bands b on b.id = pr.rate_band_id
        where e.status in ('submitted', 'approved') and e.fee_stage_id is not null group by e.fee_stage_id) c on c.fee_stage_id = s.id
  cross join lateral (values (p.manager_id), (p.director_id)) as u(uid)
  where s.kind = 'design_fee' and s.status <> 'complete' and s.amount > 0
    and c.blended > 0.8 * s.amount and s.percent_complete < 70 and u.uid is not null
  on conflict (dedupe_key) do nothing;
  get diagnostics v_n = row_count; v_count := v_count + v_n;

  insert into alerts (kind, dedupe_key, recipient_id, project_id, title, body, link)
  select 'fee_burn_over', 'fee_burn_over:' || s.id || ':' || r.user_id, r.user_id, s.project_id,
         'Stage over budget: ' || p.name || ' · ' || s.name, 'Labour cost has exceeded the stage fee.', '/projects/' || s.project_id
  from fee_stage_summary s
  join projects p on p.id = s.project_id
  join (select e.fee_stage_id, sum(e.hours * coalesce(b.blended_rate, 0)) as blended
        from timesheet_entries e join profiles pr on pr.id = e.profile_id left join rate_bands b on b.id = pr.rate_band_id
        where e.status in ('submitted', 'approved') and e.fee_stage_id is not null group by e.fee_stage_id) c on c.fee_stage_id = s.id
  join user_roles r on r.role = 'owner'
  where s.kind = 'design_fee' and s.amount > 0 and c.blended > s.amount
  on conflict (dedupe_key) do nothing;
  get diagnostics v_n = row_count; v_count := v_count + v_n;

  return v_count;
end $$;

select cron.schedule('delivery-alerts', '45 6 * * *', $$select public.generate_delivery_alerts()$$);
```

- [ ] **Step 3: Run and commit**

Run: `npm run db:reset && npm run test:db` → Expected: all `ok`.

```bash
git add supabase
git commit -m "feat(db): timesheet and fee-burn alerts; risk weights and billing target settings"
```

---

## Task 5: Week and utilisation helpers

**Files:**
- Create: `src/lib/time/weeks.ts`, `src/lib/time/weeks.test.ts`, `src/lib/time/utilisation.ts`, `src/lib/time/utilisation.test.ts`
- Modify: `src/types/index.ts`

**Interfaces:**
- Produces types: `TimesheetActivity`, `TimesheetStatus`, `TimesheetEntry`, `RateBand`, `StaffWeekHours { profile_id; week_start; total_hours; billable_hours; submitted }`, `ProjectCostRow { project_id; fee_stage_id?; hours; billable_hours; unrated_hours; blended_cost; actual_cost?: number }`, `CostRate { id; profile_id; effective_from; cost_rate }`, `ACTIVITY_LABELS`; `TeamMember` gains `weekly_capacity_hours: number; billable_target_percent: number; rate_band_id?: string`.
- Produces functions: `addDays(date: string, n: number): string`, `weekStart(date: string): string`, `weekDays(monday: string): string[]` (7 dates), `utilisation(rows: StaffWeekHours[], team: TeamMember[], weeks: string[]): UtilisationRow[]` with `UtilisationRow = { profile_id; name; capacity; total; billable; totalPct: number | null; billablePct: number | null; target: number; gap: number | null }`, `timesheetCompliance(rows, team, weeks): number | null`.

- [ ] **Step 1: Types**

Add to `src/types/index.ts`:

```ts
export type TimesheetActivity =
  | 'design' | 'drafting' | 'visualisation' | 'site_visit' | 'client_meeting' | 'coordination'
  | 'approvals' | 'admin' | 'business_development' | 'training' | 'leave';
export type TimesheetStatus = 'draft' | 'submitted' | 'approved' | 'rejected';

export const ACTIVITY_LABELS: Record<TimesheetActivity, string> = {
  design: 'Design', drafting: 'Drafting', visualisation: '3D / visualisation', site_visit: 'Site visit',
  client_meeting: 'Client meeting', coordination: 'Coordination', approvals: 'Approvals work', admin: 'Admin',
  business_development: 'Business development', training: 'Training', leave: 'Leave',
};
export const NON_PROJECT_ACTIVITIES: TimesheetActivity[] = ['admin', 'business_development', 'training', 'leave'];

export interface TimesheetEntry {
  id: string;
  profile_id: string;
  profile_name?: string;
  work_date: string;
  project_id?: string;
  project_name?: string;
  fee_stage_id?: string;
  activity: TimesheetActivity;
  hours: number;
  billable: boolean;
  notes?: string;
  status: TimesheetStatus;
  decision_note?: string;
}

export interface RateBand { id: string; name: string; blended_rate: number }
export interface CostRate { id: string; profile_id: string; effective_from: string; cost_rate: number }
export interface StaffWeekHours { profile_id: string; week_start: string; total_hours: number; billable_hours: number; submitted: boolean }
export interface ProjectCostRow {
  project_id: string; fee_stage_id?: string; hours: number; billable_hours: number; unrated_hours: number;
  blended_cost: number; actual_cost?: number;
}
```

Add to `TeamMember`: `weekly_capacity_hours: number; billable_target_percent: number; rate_band_id?: string;`

- [ ] **Step 2: Failing tests**

`src/lib/time/weeks.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { addDays, weekDays, weekStart } from "./weeks";

describe("weeks", () => {
  it("week_start_edges: Monday start across month and year ends", () => {
    expect(weekStart("2026-10-11")).toBe("2026-10-05");   // Sunday
    expect(weekStart("2026-10-05")).toBe("2026-10-05");   // Monday
    expect(weekStart("2026-11-01")).toBe("2026-10-26");   // Sunday, new month
    expect(weekStart("2027-01-01")).toBe("2026-12-28");   // Friday, new year
  });
  it("lists seven days", () => {
    expect(weekDays("2026-12-28")).toEqual(["2026-12-28", "2026-12-29", "2026-12-30", "2026-12-31", "2027-01-01", "2027-01-02", "2027-01-03"]);
  });
  it("adds days in UTC without DST drift", () => {
    expect(addDays("2026-03-28", 2)).toBe("2026-03-30");
  });
});
```

`src/lib/time/utilisation.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { timesheetCompliance, utilisation } from "./utilisation";
import type { StaffWeekHours, TeamMember } from "@/types";

const team = [
  { id: "a", full_name: "Neha", email: "", roles: ["architect"], active: true, weekly_capacity_hours: 45, billable_target_percent: 75 },
  { id: "b", full_name: "Meera", email: "", roles: ["finance"], active: true, weekly_capacity_hours: 0, billable_target_percent: 0 },
  { id: "c", full_name: "Aarav", email: "", roles: ["site_supervisor"], active: true, weekly_capacity_hours: 40, billable_target_percent: 75 },
] as TeamMember[];
const rows: StaffWeekHours[] = [
  { profile_id: "a", week_start: "2026-09-21", total_hours: 45, billable_hours: 36, submitted: true },
  { profile_id: "a", week_start: "2026-09-28", total_hours: 40, billable_hours: 27, submitted: true },
];
const weeks = ["2026-09-21", "2026-09-28"];

describe("utilisation", () => {
  it("computes total and billable utilisation against capacity", () => {
    const [neha] = utilisation(rows, team, weeks);
    expect(neha).toMatchObject({ name: "Neha", capacity: 90, total: 85, billable: 63, totalPct: 94, billablePct: 70, target: 75, gap: -5 });
  });
  it("skips people with no capacity and reports zero-hour people", () => {
    const r = utilisation(rows, team, weeks);
    expect(r.find((x) => x.name === "Meera")).toBeUndefined();
    expect(r.find((x) => x.name === "Aarav")).toMatchObject({ total: 0, billablePct: 0 });
  });
});

describe("timesheetCompliance", () => {
  it("is submitted person-weeks over expected person-weeks", () => {
    expect(timesheetCompliance(rows, team, weeks)).toBe(0.5);   // Neha 2/2, Aarav 0/2
    expect(timesheetCompliance([], [], weeks)).toBeNull();
  });
});
```

Run: `npm test` → Expected: FAIL.

- [ ] **Step 3: Implement**

`src/lib/time/weeks.ts`:

```ts
// Dates are YYYY-MM-DD strings; arithmetic in UTC so DST never shifts a day.
export const addDays = (date: string, n: number) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

export function weekStart(date: string): string {
  const dow = new Date(`${date}T00:00:00Z`).getUTCDay(); // 0 = Sunday
  return addDays(date, dow === 0 ? -6 : 1 - dow);
}

export const weekDays = (monday: string) => Array.from({ length: 7 }, (_, i) => addDays(monday, i));
```

`src/lib/time/utilisation.ts`:

```ts
import type { StaffWeekHours, TeamMember } from "@/types";

export interface UtilisationRow {
  profile_id: string; name: string; capacity: number; total: number; billable: number;
  totalPct: number | null; billablePct: number | null; target: number; gap: number | null;
}

const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : null);

export function utilisation(rows: StaffWeekHours[], team: TeamMember[], weeks: string[]): UtilisationRow[] {
  const inRange = rows.filter((r) => weeks.includes(r.week_start));
  return team
    .filter((m) => m.active && m.weekly_capacity_hours > 0)
    .map((m) => {
      const mine = inRange.filter((r) => r.profile_id === m.id);
      const capacity = m.weekly_capacity_hours * weeks.length;
      const total = mine.reduce((s, r) => s + (r.total_hours ?? 0), 0);
      const billable = mine.reduce((s, r) => s + r.billable_hours, 0);
      const billablePct = pct(billable, capacity);
      return {
        profile_id: m.id, name: m.full_name, capacity, total, billable,
        totalPct: pct(total, capacity), billablePct, target: m.billable_target_percent,
        gap: billablePct === null ? null : billablePct - m.billable_target_percent,
      };
    })
    .sort((a, b) => (a.gap ?? 0) - (b.gap ?? 0));
}

export function timesheetCompliance(rows: StaffWeekHours[], team: TeamMember[], weeks: string[]): number | null {
  const people = team.filter((m) => m.active && m.weekly_capacity_hours > 0);
  const expected = people.length * weeks.length;
  if (!expected) return null;
  const done = rows.filter((r) => r.submitted && weeks.includes(r.week_start) && people.some((p) => p.id === r.profile_id)).length;
  return done / expected;
}
```

Run: `npm test` → PASS.

- [ ] **Step 4: Commit**

```bash
git add src/types/index.ts src/lib/time
git commit -m "feat: week and utilisation helpers"
```

---

## Task 6: Profitability engine

**Files:**
- Create: `src/lib/finance/profitability.ts`, `src/lib/finance/profitability.test.ts`

**Interfaces:**
- Consumes: `FeeStage`, `ChangeOrder`, `Invoice`, `Expense`, `ProjectCostRow`, `round2`, `ratio`.
- Produces: `projectProfitability(input: ProfitInput): Profitability`, `portfolioProfitability(projects, snapshotSlices, useActual): (Profitability & { project: Project })[]`.

```ts
interface ProfitInput {
  stages: FeeStage[];            // this project's stages
  changeOrders: ChangeOrder[];   // this project's
  invoices: Invoice[];           // this project's
  costs: ProjectCostRow[];       // this project's rollup rows
  expenses: Expense[];           // this project's
  useActual: boolean;            // actual cost when available, else blended
}
interface StageBurn { id: string; name: string; amount: number; percentComplete: number; labourCost: number; burnPct: number | null; overBurn: boolean }
interface Profitability {
  contractValue: number; earned: number; labourCost: number; directCost: number;
  marginToDate: number; marginPct: number | null; percentComplete: number | null;
  eacMargin: number | null; eacMarginPct: number | null;
  hours: number; unratedHours: number; costBasis: "actual" | "blended";
  stages: StageBurn[];
}
```

- [ ] **Step 1: Failing tests (worked example)**

`src/lib/finance/profitability.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { projectProfitability } from "./profitability";
import type { ChangeOrder, Expense, FeeStage, Invoice, ProjectCostRow } from "@/types";

// Lump-sum design fee 3,00,000: stage A 20% (done), stage B 80% (25% done).
const stages = [
  { id: "A", project_id: "p", kind: "design_fee", name: "A", percent: 20, sort_order: 1, status: "complete", percent_complete: 100, checklist: [], amount: 60000, earned: 60000, invoiced: 60000 },
  { id: "B", project_id: "p", kind: "design_fee", name: "B", percent: 80, sort_order: 2, status: "in_progress", percent_complete: 25, checklist: [], amount: 240000, earned: 60000, invoiced: 0 },
] as FeeStage[];
const changeOrders = [{ id: "co", status: "approved", fee_impact: 45000 }] as ChangeOrder[];
const invoices = [{ change_order_id: "co", status: "sent", subtotal: 45000, discount: 0 }] as Invoice[];
const costs: ProjectCostRow[] = [
  { project_id: "p", fee_stage_id: "A", hours: 30, billable_hours: 30, unrated_hours: 0, blended_cost: 30000, actual_cost: 40000 },
  { project_id: "p", fee_stage_id: "B", hours: 100, billable_hours: 100, unrated_hours: 5, blended_cost: 120000, actual_cost: 130000 },
];
const expenses = [{ amount: 10000 }] as Expense[];

describe("projectProfitability", () => {
  const p = projectProfitability({ stages, changeOrders, invoices, costs, expenses, useActual: false });

  it("computes contract value, earned and margin to date", () => {
    expect(p.contractValue).toBe(345000);
    expect(p.earned).toBe(165000);
    expect(p.labourCost).toBe(150000);
    expect(p.directCost).toBe(10000);
    expect(p.marginToDate).toBe(5000);
    expect(p.marginPct).toBeCloseTo(0.0303, 3);
  });

  it("projects margin at completion", () => {
    expect(p.percentComplete).toBe(0.4);
    expect(p.eacMargin).toBe(-55000);              // 345000 - 160000 / 0.4
  });

  it("flags stages burning faster than progress", () => {
    expect(p.stages.find((s) => s.id === "A")).toMatchObject({ burnPct: 50, overBurn: false });
    expect(p.stages.find((s) => s.id === "B")).toMatchObject({ burnPct: 50, overBurn: true });
  });

  it("uses actual cost when asked and available", () => {
    const a = projectProfitability({ stages, changeOrders, invoices, costs, expenses, useActual: true });
    expect(a.labourCost).toBe(170000);
    expect(a.costBasis).toBe("actual");
  });

  it("falls back to blended when actual is hidden", () => {
    const hidden = costs.map(({ actual_cost: _, ...c }) => c);
    expect(projectProfitability({ stages, changeOrders, invoices, costs: hidden, expenses, useActual: true }).costBasis).toBe("blended");
  });

  it("unrated_hours_reported", () => {
    expect(p.unratedHours).toBe(5);
  });

  it("eac_zero_progress: no EAC at 0% complete", () => {
    const fresh = stages.map((s) => ({ ...s, percent_complete: 0, earned: 0 }));
    const z = projectProfitability({ stages: fresh, changeOrders: [], invoices: [], costs, expenses, useActual: false });
    expect(z.percentComplete).toBe(0);
    expect(z.eacMargin).toBeNull();
    expect(z.marginPct).toBeNull();
  });
});
```

Run: `npm test` → Expected: FAIL.

- [ ] **Step 2: Implement**

`src/lib/finance/profitability.ts`:

```ts
import { ratio } from "@/lib/metrics/kpis";
import { round2 } from "./money";
import type { ChangeOrder, Expense, FeeStage, Invoice, ProjectCostRow } from "@/types";

export interface ProfitInput {
  stages: FeeStage[];
  changeOrders: ChangeOrder[];
  invoices: Invoice[];
  costs: ProjectCostRow[];
  expenses: Expense[];
  useActual: boolean;
}

export interface StageBurn {
  id: string; name: string; amount: number; percentComplete: number; labourCost: number; burnPct: number | null; overBurn: boolean;
}

export interface Profitability {
  contractValue: number; earned: number; labourCost: number; directCost: number;
  marginToDate: number; marginPct: number | null; percentComplete: number | null;
  eacMargin: number | null; eacMarginPct: number | null;
  hours: number; unratedHours: number; costBasis: "actual" | "blended";
  stages: StageBurn[];
}

const BURN_TOLERANCE = 15; // percentage points (spec 5.1 M2)
const sum = (xs: number[]) => round2(xs.reduce((a, b) => a + b, 0));

// Formulas: spec section 4.5. Each line below is shown to users as the metric's formula.
export function projectProfitability(i: ProfitInput): Profitability {
  const actual = i.useActual && i.costs.length > 0 && i.costs.every((c) => c.actual_cost != null);
  const costOf = (c: ProjectCostRow) => (actual ? c.actual_cost! : c.blended_cost);

  const stageAmount = sum(i.stages.map((s) => s.amount));
  const stageEarned = sum(i.stages.map((s) => s.earned));
  const coFees = sum(i.changeOrders.filter((c) => c.status === "approved").map((c) => c.fee_impact));
  const coEarned = sum(i.invoices
    .filter((v) => v.change_order_id && v.status !== "draft" && v.status !== "cancelled")
    .map((v) => v.subtotal - v.discount));

  const contractValue = round2(stageAmount + coFees);
  const earned = round2(stageEarned + coEarned);
  const labourCost = sum(i.costs.map(costOf));
  const directCost = sum(i.expenses.map((e) => e.amount));
  const marginToDate = round2(earned - labourCost - directCost);
  const percentComplete = stageAmount > 0 ? stageEarned / stageAmount : null;

  const eacMargin = percentComplete ? round2(contractValue - (labourCost + directCost) / percentComplete) : null;

  return {
    contractValue, earned, labourCost, directCost, marginToDate,
    marginPct: ratio(marginToDate, earned),
    percentComplete,
    eacMargin,
    eacMarginPct: eacMargin === null ? null : ratio(eacMargin, contractValue),
    hours: sum(i.costs.map((c) => c.hours)),
    unratedHours: sum(i.costs.map((c) => c.unrated_hours)),
    costBasis: actual ? "actual" : "blended",
    stages: i.stages.map((s) => {
      const labour = sum(i.costs.filter((c) => c.fee_stage_id === s.id).map(costOf));
      const burnPct = s.amount > 0 ? Math.round((labour / s.amount) * 100) : null;
      return {
        id: s.id, name: s.name, amount: s.amount, percentComplete: s.percent_complete, labourCost: labour, burnPct,
        overBurn: burnPct !== null && burnPct - s.percent_complete > BURN_TOLERANCE,
      };
    }),
  };
}
```

Run: `npm test` → Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/finance/profitability.ts src/lib/finance/profitability.test.ts
git commit -m "feat: project profitability engine (margin, EAC, fee burn)"
```

---

## Task 7: Project risk score

**Files:**
- Create: `src/lib/metrics/risk.ts`, `src/lib/metrics/risk.test.ts`
- Modify: `src/types/index.ts` (`StudioSettings` gains `risk_weights: RiskWeights; monthly_billing_target?: number`), `src/lib/data/mappers.ts` (`mapSettings` fills both)

**Interfaces:**
- Produces: `RiskWeights { fee_burn; overdue; schedule; cost_variance; approvals; critical_snags; pending_changes }` (numbers), `RiskFactor { key: keyof RiskWeights; label: string; value: number; weight: number; points: number; detail: string }`, `projectRisk(input: RiskInput): { score: number; factors: RiskFactor[] }` with

```ts
interface RiskInput {
  project: Project;
  profit: Profitability;
  stages: FeeStage[];
  invoices: Invoice[];       // project's
  snags: Snag[];             // project's
  changeOrders: ChangeOrder[];
  today: string;
  weights: RiskWeights;
  costVariance?: number | null;      // Phase 3: committed over budget, as a fraction
  stalledApprovals?: number | null;  // Phase 4: count past expected date
}
```

Normalisation (each factor value is 0–1, then × weight; score = Σ points ÷ Σ active weights × 100, rounded):
- fee_burn: largest (burnPct − percentComplete) across stages ÷ 50, clamped.
- overdue: amount due on invoices ≥ 30 days past due ÷ (20% of contract value), clamped; 0 if contract value is 0.
- schedule: 1 if `estimated_end_date` < today and status ≠ closed; else largest (days past `planned_end` ÷ stage duration) over in-progress stages, clamped.
- cost_variance: `costVariance` ÷ 0.2, clamped; inactive when null/undefined.
- approvals: `stalledApprovals` ÷ 2, clamped; inactive when null/undefined.
- critical_snags: open critical snags ÷ 3 (× 2 when status is `snag` or `handover`), clamped.
- pending_changes: fee value of change orders submitted > 14 days ago ÷ (10% of contract value), clamped.

- [ ] **Step 1: Failing tests**

`src/lib/metrics/risk.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { DEFAULT_RISK_WEIGHTS, projectRisk } from "./risk";
import type { ChangeOrder, FeeStage, Invoice, Project, Snag } from "@/types";
import type { Profitability } from "@/lib/finance/profitability";

const project = { id: "p", status: "design", estimated_end_date: "2027-01-01" } as Project;
const profit = (o: Partial<Profitability> = {}) => ({ contractValue: 1_000_000, stages: [], ...o }) as Profitability;
const base = { project, stages: [] as FeeStage[], invoices: [] as Invoice[], snags: [] as Snag[], changeOrders: [] as ChangeOrder[], today: "2026-10-09", weights: DEFAULT_RISK_WEIGHTS };

describe("projectRisk", () => {
  it("is 0 for a healthy project", () => {
    expect(projectRisk({ ...base, profit: profit() }).score).toBe(0);
  });

  it("excludes factors without data from the denominator", () => {
    // Only fee burn maxed: 25 / (100 - 15 cost_variance - 10 approvals) = 25/75
    const r = projectRisk({ ...base, profit: profit({ stages: [{ id: "s", name: "B", amount: 1, percentComplete: 0, labourCost: 1, burnPct: 60, overBurn: true }] }) });
    expect(r.score).toBe(33);
    expect(r.factors.find((f) => f.key === "fee_burn")).toMatchObject({ value: 1, points: 25 });
    expect(r.factors.find((f) => f.key === "cost_variance")).toBeUndefined();
  });

  it("scores overdue receivables against 20% of contract value", () => {
    const r = projectRisk({ ...base, profit: profit(), invoices: [{ status: "overdue", due_date: "2026-08-01", amount_due: 100_000 }] as Invoice[] });
    expect(r.factors.find((f) => f.key === "overdue")?.value).toBe(0.5);
  });

  it("treats a passed end date as full schedule risk", () => {
    const late = { ...project, estimated_end_date: "2026-09-01" } as Project;
    expect(projectRisk({ ...base, project: late, profit: profit() }).factors.find((f) => f.key === "schedule")?.value).toBe(1);
  });

  it("doubles critical snag weight near handover", () => {
    const snags = [{ status: "raised", priority: "critical" }] as Snag[];
    const near = { ...project, status: "handover" } as Project;
    expect(projectRisk({ ...base, profit: profit(), snags }).factors.find((f) => f.key === "critical_snags")?.value).toBeCloseTo(1 / 3);
    expect(projectRisk({ ...base, project: near, profit: profit(), snags }).factors.find((f) => f.key === "critical_snags")?.value).toBeCloseTo(2 / 3);
  });

  it("includes cost variance once Phase 3 supplies it", () => {
    const r = projectRisk({ ...base, profit: profit(), costVariance: 0.1 });
    expect(r.factors.find((f) => f.key === "cost_variance")?.value).toBe(0.5);
  });
});
```

Run: `npm test` → FAIL.

- [ ] **Step 2: Implement**

`src/lib/metrics/risk.ts`:

```ts
import type { Profitability } from "@/lib/finance/profitability";
import type { ChangeOrder, FeeStage, Invoice, Project, RiskWeights, Snag } from "@/types";

export type { RiskWeights };
export const DEFAULT_RISK_WEIGHTS: RiskWeights = {
  fee_burn: 25, overdue: 20, schedule: 15, cost_variance: 15, approvals: 10, critical_snags: 10, pending_changes: 5,
};

export interface RiskFactor { key: keyof RiskWeights; label: string; value: number; weight: number; points: number; detail: string }

export interface RiskInput {
  project: Project; profit: Profitability; stages: FeeStage[]; invoices: Invoice[]; snags: Snag[];
  changeOrders: ChangeOrder[]; today: string; weights: RiskWeights;
  costVariance?: number | null; stalledApprovals?: number | null;
}

const DAY = 86_400_000;
const clamp = (x: number) => Math.max(0, Math.min(1, x));
const daysBetween = (a: string, b: string) => (Date.parse(b) - Date.parse(a)) / DAY;

export function projectRisk(i: RiskInput): { score: number; factors: RiskFactor[] } {
  const cv = i.profit.contractValue;
  const raw: { key: keyof RiskWeights; label: string; value: number | null; detail: string }[] = [];

  const burnGap = Math.max(0, ...i.profit.stages.map((s) => (s.burnPct ?? 0) - s.percentComplete));
  raw.push({ key: "fee_burn", label: "Fee burn ahead of progress", value: clamp(burnGap / 50), detail: `${Math.round(burnGap)} points ahead at worst stage` });

  const overdue30 = i.invoices.filter((v) => v.due_date && v.amount_due > 0 && v.status !== "draft" && v.status !== "cancelled"
    && daysBetween(v.due_date, i.today) >= 30).reduce((s, v) => s + v.amount_due, 0);
  raw.push({ key: "overdue", label: "Overdue receivables (30+ days)", value: cv > 0 ? clamp(overdue30 / (0.2 * cv)) : 0, detail: `₹${Math.round(overdue30).toLocaleString("en-IN")}` });

  const pastEnd = !!i.project.estimated_end_date && i.project.estimated_end_date < i.today && i.project.status !== "closed";
  const stageSlip = Math.max(0, ...i.stages.filter((s) => s.status === "in_progress" && s.planned_end && s.planned_end < i.today)
    .map((s) => daysBetween(s.planned_end!, i.today) / Math.max(1, s.planned_start ? daysBetween(s.planned_start, s.planned_end!) : 30)));
  raw.push({ key: "schedule", label: "Schedule slip", value: pastEnd ? 1 : clamp(stageSlip), detail: pastEnd ? "Past target end date" : "Stage(s) past planned end" });

  raw.push({ key: "cost_variance", label: "Cost over budget", value: i.costVariance == null ? null : clamp(i.costVariance / 0.2), detail: "Committed vs BOQ budget" });
  raw.push({ key: "approvals", label: "Stalled approvals", value: i.stalledApprovals == null ? null : clamp(i.stalledApprovals / 2), detail: "Statutory approvals past expected date" });

  const critical = i.snags.filter((s) => s.status !== "closed" && s.priority === "critical").length;
  const nearHandover = i.project.status === "snag" || i.project.status === "handover";
  raw.push({ key: "critical_snags", label: "Open critical snags", value: clamp((critical * (nearHandover ? 2 : 1)) / 3), detail: `${critical} open` });

  const pending = i.changeOrders.filter((c) => c.status === "submitted" && c.submitted_at && daysBetween(c.submitted_at, i.today) > 14)
    .reduce((s, c) => s + c.fee_impact, 0);
  raw.push({ key: "pending_changes", label: "Change orders awaiting client > 14 days", value: cv > 0 ? clamp(pending / (0.1 * cv)) : 0, detail: `₹${Math.round(pending).toLocaleString("en-IN")}` });

  const factors = raw
    .filter((f): f is typeof f & { value: number } => f.value !== null)
    .map((f) => ({ ...f, weight: i.weights[f.key], points: Math.round(f.value * i.weights[f.key] * 100) / 100 }));
  const totalWeight = factors.reduce((s, f) => s + f.weight, 0);
  const score = totalWeight ? Math.round((factors.reduce((s, f) => s + f.points, 0) / totalWeight) * 100) : 0;
  return { score, factors };
}
```

Add to `src/types/index.ts`:

```ts
export interface RiskWeights {
  fee_burn: number; overdue: number; schedule: number; cost_variance: number;
  approvals: number; critical_snags: number; pending_changes: number;
}
```

and add `risk_weights: RiskWeights; monthly_billing_target?: number;` to `StudioSettings`.

In `mapSettings`: `risk_weights: { ...DEFAULT_RISK_WEIGHTS, ...(r.risk_weights as object) }, monthly_billing_target: opt(r.monthly_billing_target),` (import `DEFAULT_RISK_WEIGHTS`). Run `npm run db:types` first.

Run: `npm test && npm run typecheck` → PASS.

- [ ] **Step 3: Commit**

```bash
git add src
git commit -m "feat: explainable project risk score with configurable weights"
```

---

## Task 8: Load time and cost data into the workspace

**Files:**
- Modify: `src/lib/data/snapshot.ts`, `src/lib/data/mappers.ts` (+ test), `src/lib/data/load-workspace.ts`

**Interfaces:**
- Produces: `WorkspaceSnapshot` gains `timesheetEntries: TimesheetEntry[]` (RLS-visible, last 12 weeks), `projectCosts: ProjectCostRow[]`, `staffWeekHours: StaffWeekHours[]` (last 12 weeks), `rateBands: RateBand[]`, `costRates: CostRate[]` (empty unless owner/finance); `mapTeamMember` fills capacity, target, rate band; mappers `mapTimesheetEntry`, `mapCostRow`, `mapWeekHours`.

- [ ] **Step 1: Failing mapper test**

Append to `mappers.test.ts`:

```ts
import { mapCostRow } from "./mappers";

describe("mapCostRow", () => {
  it("keeps actual cost absent (not 0) when hidden", () => {
    const r = mapCostRow({ project_id: "p", fee_stage_id: null, hours: 10, billable_hours: 8, unrated_hours: 0, blended_cost: 11000, actual_cost: null });
    expect(r.actual_cost).toBeUndefined();
    expect(r.fee_stage_id).toBeUndefined();
  });
});
```

Run: `npm test` → FAIL.

- [ ] **Step 2: Implement**

`npm run db:types`, then in `mappers.ts`:

```ts
export function mapCostRow(r: {
  project_id: string; fee_stage_id: string | null; hours: number; billable_hours: number; unrated_hours: number;
  blended_cost: number; actual_cost: number | null;
}): ProjectCostRow {
  return {
    project_id: r.project_id, fee_stage_id: opt(r.fee_stage_id), hours: r.hours, billable_hours: r.billable_hours,
    unrated_hours: r.unrated_hours, blended_cost: r.blended_cost, actual_cost: opt(r.actual_cost),
  };
}

export function mapWeekHours(r: { profile_id: string; week_start: string; total_hours: number | null; billable_hours: number; submitted: boolean }): StaffWeekHours {
  return { profile_id: r.profile_id, week_start: r.week_start, total_hours: r.total_hours ?? 0, billable_hours: r.billable_hours, submitted: r.submitted };
}

export function mapTimesheetEntry(r: Tables<"timesheet_entries"> & { author: { full_name: string } | null; project: { name: string } | null }): TimesheetEntry {
  return {
    id: r.id, profile_id: r.profile_id, profile_name: r.author?.full_name, work_date: r.work_date,
    project_id: opt(r.project_id), project_name: r.project?.name, fee_stage_id: opt(r.fee_stage_id),
    activity: r.activity, hours: r.hours, billable: r.billable, notes: opt(r.notes), status: r.status,
    decision_note: opt(r.decision_note),
  };
}
```

Extend `mapTeamMember`'s input with `weekly_capacity_hours: number; billable_target_percent: number; rate_band_id: string | null` and output `weekly_capacity_hours, billable_target_percent, rate_band_id: opt(r.rate_band_id)`.

In `loadWorkspace` (compute `const from = addDays(weekStart(new Date().toISOString().slice(0, 10)), -77);` at the top; `new Date()` is fine here because the loader runs at request time inside Suspense):
- team query select adds `weekly_capacity_hours, billable_target_percent, rate_band_id`
- add to `Promise.all` (and the `failed` list):

```ts
    db.from("timesheet_entries").select("*, author:profiles!timesheet_entries_profile_id_fkey(full_name), project:projects(name)").gte("work_date", from).order("work_date"),
    db.rpc("project_cost_rollup"),
    db.rpc("staff_week_hours", { p_from: from, p_to: addDays(from, 7 * 12 - 1) }),
    db.from("rate_bands").select("*").order("blended_rate", { ascending: false }),
    db.from("staff_cost_rates").select("*").order("effective_from", { ascending: false }),
```

- return the five new collections via their mappers (`rateBands` and `costRates` map rows directly: `{ id, name, blended_rate }` and `{ id, profile_id, effective_from, cost_rate }`).

Add the five fields to `WorkspaceSnapshot`.

- [ ] **Step 3: Verify and commit**

Run: `npm test && npm run typecheck` → PASS. Manual: signed in as Ananya, React DevTools on `AppStoreProvider` shows `costRates: []` and every `projectCosts[].actual_cost` undefined (privacy check in the payload).

```bash
git add src/lib/data src/lib/supabase/database.types.ts
git commit -m "feat: load timesheets, cost rollups and weekly hours into the workspace"
```

---

## Task 9: My Week timesheet grid

**Files:**
- Create: `src/app/actions/timesheets.ts`, `src/components/timesheets/WeekGrid.tsx`, `src/app/(app)/timesheets/page.tsx`
- Modify: `src/lib/actions/schemas.ts` (+ test), `src/lib/store.ts`, `src/components/layout/AppSidebar.tsx`

**Interfaces:**
- Produces: schema `timesheetWeekInput { week_start: date (Monday), rows: { project_id?: uuid|null; fee_stage_id?: uuid|null; activity; billable; notes?; hours: number[7] }[] }`; store actions `saveTimesheetWeek(weekStart, rows)`, `submitTimesheetWeek(weekStart)`; component `<WeekGrid weekStart />`; route `/timesheets?week=YYYY-MM-DD`.

- [ ] **Step 1: Schema test and schema**

Append to `schemas.test.ts`:

```ts
import { timesheetWeekInput } from "./schemas";

describe("timesheetWeekInput", () => {
  const row = { project_id: P, activity: "design", billable: true, hours: [8, 8, 8, 8, 8, 0, 0] };
  it("requires a Monday and seven day values", () => {
    expect(timesheetWeekInput.safeParse({ week_start: "2026-10-05", rows: [row] }).success).toBe(true);
    expect(timesheetWeekInput.safeParse({ week_start: "2026-10-06", rows: [row] }).success).toBe(false);
    expect(timesheetWeekInput.safeParse({ week_start: "2026-10-05", rows: [{ ...row, hours: [8] }] }).success).toBe(false);
  });
  it("rejects negative or >24 hour cells", () => {
    expect(timesheetWeekInput.safeParse({ week_start: "2026-10-05", rows: [{ ...row, hours: [25, 0, 0, 0, 0, 0, 0] }] }).success).toBe(false);
  });
});
```

Append to `schemas.ts`:

```ts
const isMonday = (d: string) => new Date(`${d}T00:00:00Z`).getUTCDay() === 1;
export const timesheetWeekInput = z.object({
  week_start: date.refine(isMonday, "Week must start on a Monday"),
  rows: z.array(z.object({
    project_id: optId,
    fee_stage_id: optId,
    activity: z.enum(["design", "drafting", "visualisation", "site_visit", "client_meeting", "coordination", "approvals", "admin", "business_development", "training", "leave"]),
    billable: z.boolean(),
    notes: optText(300),
    hours: z.array(z.coerce.number().min(0).max(24)).length(7),
  })).max(40),
});
export const weekInput = z.object({ week_start: date.refine(isMonday, "Week must start on a Monday") });
export const timesheetDecisionInput = z.object({ ids: z.array(id).min(1).max(500), approve: z.boolean(), note: optText(500) })
  .refine((d) => d.approve || !!d.note, { message: "Say why the time is being sent back", path: ["note"] });
```

Run: `npm test` → PASS.

- [ ] **Step 2: Server actions and store**

`src/app/actions/timesheets.ts`:

```ts
"use server";
import { mutate } from "@/lib/actions/mutate";
import { timesheetDecisionInput, timesheetWeekInput, weekInput } from "@/lib/actions/schemas";

export async function saveTimesheetWeek(input: unknown) {
  return mutate(timesheetWeekInput, input, (d, db) => db.rpc("save_timesheet_week", { p_week: d.week_start, p_rows: d.rows }));
}

export async function submitTimesheetWeek(input: unknown) {
  return mutate(weekInput, input, (d, db) => db.rpc("submit_timesheet_week", { p_week: d.week_start }));
}

export async function decideTimesheetEntries(input: unknown) {
  return mutate(timesheetDecisionInput, input, (d, db) =>
    db.rpc("decide_timesheet_entries", { p_ids: d.ids, p_approve: d.approve, p_note: d.note ?? "" }));
}
```

Store (import `* as tsActions from "@/app/actions/timesheets"`):

```ts
  saveTimesheetWeek: (weekStart: string, rows: WeekRow[]) => Promise<ActionResult>;
  submitTimesheetWeek: (weekStart: string) => Promise<ActionResult>;
  decideTimesheetEntries: (ids: string[], approve: boolean, note?: string) => Promise<ActionResult>;
```

```ts
    saveTimesheetWeek: (weekStart, rows) => run(tsActions.saveTimesheetWeek({ week_start: weekStart, rows })),
    submitTimesheetWeek: (weekStart) => run(tsActions.submitTimesheetWeek({ week_start: weekStart })),
    decideTimesheetEntries: (ids, approve, note) => run(tsActions.decideTimesheetEntries({ ids, approve, note })),
```

and export from `store.ts`:

```ts
export interface WeekRow {
  project_id: string | null; fee_stage_id: string | null; activity: TimesheetActivity; billable: boolean; notes?: string; hours: number[];
}
```

- [ ] **Step 3: The grid**

`src/components/timesheets/WeekGrid.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { addDays, weekDays } from "@/lib/time/weeks";
import { useAppStore, type WeekRow } from "@/lib/store";
import { ACTIVITY_LABELS, NON_PROJECT_ACTIVITIES, type TimesheetActivity, type TimesheetEntry } from "@/types";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const cell = "w-14 h-8 rounded border border-input bg-background text-right px-1 text-sm";

const keyOf = (e: Pick<TimesheetEntry, "project_id" | "fee_stage_id" | "activity">) => `${e.project_id ?? ""}|${e.fee_stage_id ?? ""}|${e.activity}`;

// Rows for a week: editable drafts/rejected; prefilled from last week's rows when empty.
function rowsFor(entries: TimesheetEntry[], days: string[]): WeekRow[] {
  const map = new Map<string, WeekRow>();
  for (const e of entries) {
    const i = days.indexOf(e.work_date);
    if (i < 0) continue;
    const k = keyOf(e);
    const row = map.get(k) ?? { project_id: e.project_id ?? null, fee_stage_id: e.fee_stage_id ?? null, activity: e.activity, billable: e.billable, hours: [0, 0, 0, 0, 0, 0, 0] };
    row.hours[i] += e.hours;
    map.set(k, row);
  }
  return [...map.values()];
}

export function WeekGrid({ weekStart }: { weekStart: string }) {
  const { me, timesheetEntries, projects, feeStages, saveTimesheetWeek, submitTimesheetWeek } = useAppStore();
  const days = weekDays(weekStart);
  const mine = timesheetEntries.filter((e) => e.profile_id === me.id);
  const thisWeek = mine.filter((e) => days.includes(e.work_date));
  const locked = thisWeek.filter((e) => e.status === "submitted" || e.status === "approved");
  const rejected = thisWeek.filter((e) => e.status === "rejected");
  const editable = thisWeek.filter((e) => e.status === "draft" || e.status === "rejected");

  // Computed once per week (the page keys this component by week).
  const [rows, setRows] = useState<WeekRow[]>(() => {
    if (editable.length) return rowsFor(editable, days);
    if (locked.length) return [];
    const prev = weekDays(addDays(weekStart, -7));
    return rowsFor(mine.filter((e) => prev.includes(e.work_date)), prev).map((r) => ({ ...r, hours: [0, 0, 0, 0, 0, 0, 0] }));
  });
  const [busy, setBusy] = useState(false);

  const myProjects = projects.filter((p) => p.status !== "closed");
  const setRow = (i: number, patch: Partial<WeekRow>) => setRows(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const dayTotal = (d: number) => rows.reduce((s, r) => s + (Number(r.hours[d]) || 0), 0) + locked.filter((e) => e.work_date === days[d]).reduce((s, e) => s + e.hours, 0);
  const weekTotal = DAY_LABELS.reduce((s, _, d) => s + dayTotal(d), 0);

  async function save(andSubmit: boolean) {
    setBusy(true);
    const clean = rows.filter((r) => r.hours.some((h) => Number(h) > 0));
    const r = await saveTimesheetWeek(weekStart, clean);
    if (r.ok && andSubmit) await submitTimesheetWeek(weekStart);
    setBusy(false);
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-3 overflow-x-auto">
        {rejected[0]?.decision_note && (
          <p className="text-sm text-red-600">Sent back: “{rejected[0].decision_note}”. Fix and resubmit.</p>
        )}
        {locked.length > 0 && <p className="text-xs text-muted-foreground">{locked.length} entries already submitted or approved for this week (read-only).</p>}
        <table className="text-sm">
          <thead>
            <tr className="text-xs text-muted-foreground">
              <th className="text-left pr-2">Project / stage</th><th className="text-left pr-2">Activity</th><th className="pr-2">Billable</th>
              {DAY_LABELS.map((d, i) => <th key={d} className="px-1">{d}<br />{days[i].slice(8)}</th>)}<th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const stages = feeStages.filter((s) => s.project_id === r.project_id && s.status !== "complete");
              return (
                <tr key={i}>
                  <td className="pr-2 py-1">
                    <select aria-label="Project" className="h-8 rounded border border-input bg-background text-sm max-w-48" value={r.project_id ?? ""}
                      onChange={(e) => setRow(i, { project_id: e.target.value || null, fee_stage_id: null, billable: !!e.target.value })}>
                      <option value="">Non-project</option>
                      {myProjects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    {r.project_id && (
                      <select aria-label="Stage" className="h-8 ml-1 rounded border border-input bg-background text-sm max-w-40" value={r.fee_stage_id ?? ""}
                        onChange={(e) => setRow(i, { fee_stage_id: e.target.value || null })}>
                        <option value="">No stage</option>
                        {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    )}
                  </td>
                  <td className="pr-2">
                    <select aria-label="Activity" className="h-8 rounded border border-input bg-background text-sm" value={r.activity}
                      onChange={(e) => {
                        const activity = e.target.value as TimesheetActivity;
                        setRow(i, { activity, billable: r.project_id ? !NON_PROJECT_ACTIVITIES.includes(activity) : false });
                      }}>
                      {Object.entries(ACTIVITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </td>
                  <td className="text-center"><input aria-label="Billable" type="checkbox" disabled={!r.project_id} checked={r.billable} onChange={(e) => setRow(i, { billable: e.target.checked })} /></td>
                  {DAY_LABELS.map((d, di) => (
                    <td key={d} className="px-1">
                      <input aria-label={`${d} hours`} className={cell} type="number" min="0" max="24" step="0.5" value={r.hours[di] || ""}
                        onChange={(e) => setRow(i, { hours: r.hours.map((h, k) => (k === di ? Number(e.target.value) : h)) })} />
                    </td>
                  ))}
                  <td><button aria-label="Remove row" onClick={() => setRows(rows.filter((_, j) => j !== i))} className="p-1 text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button></td>
                </tr>
              );
            })}
            <tr className="font-semibold">
              <td colSpan={3} className="text-right pr-2">Total</td>
              {DAY_LABELS.map((d, di) => <td key={d} className={`px-1 text-right ${dayTotal(di) > 24 ? "text-red-600" : ""}`}>{dayTotal(di) || ""}</td>)}
              <td className="pl-2">{weekTotal}h</td>
            </tr>
          </tbody>
        </table>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setRows([...rows, { project_id: null, fee_stage_id: null, activity: "design", billable: false, hours: [0, 0, 0, 0, 0, 0, 0] }])}>
            <Plus className="w-4 h-4" /> Add row
          </Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => save(false)}>Save draft</Button>
          <Button size="sm" disabled={busy || rows.length === 0} onClick={() => save(true)}>Submit week</Button>
          <Badge variant="secondary">{weekTotal}h logged this week</Badge>
        </div>
      </CardContent>
    </Card>
  );
}
```

`src/app/(app)/timesheets/page.tsx`:

```tsx
"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { TopBar } from "@/components/layout/AppSidebar";
import { Button } from "@/components/ui/button";
import { WeekGrid } from "@/components/timesheets/WeekGrid";
import { addDays, weekStart } from "@/lib/time/weeks";
import { localToday } from "@/lib/utils";

export default function TimesheetsPage() {
  return <Suspense><Content /></Suspense>;
}

function Content() {
  const params = useSearchParams();
  const week = weekStart(params.get("week") ?? localToday());
  return (
    <div>
      <TopBar title="My timesheet" subtitle={`Week of ${week}`} />
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Link href={`/timesheets?week=${addDays(week, -7)}`}><Button size="sm" variant="outline" aria-label="Previous week"><ChevronLeft className="w-4 h-4" /></Button></Link>
          <Link href={`/timesheets?week=${addDays(week, 7)}`}><Button size="sm" variant="outline" aria-label="Next week"><ChevronRight className="w-4 h-4" /></Button></Link>
          <Link href="/timesheets/approvals" className="ml-auto text-sm text-primary hover:underline">Approvals</Link>
        </div>
        <WeekGrid key={week} weekStart={week} />
      </div>
    </div>
  );
}
```

Sidebar: add `{ href: "/timesheets", label: "Timesheet", icon: Clock }` (all staff) after "My Tasks".

- [ ] **Step 4: Verify**

Run: `npm run typecheck && npm test && npm run lint` → PASS.

Manual as Neha: `/timesheets` for the current week opens with last week's rows prefilled and zero hours; enter 8h Mon–Fri on Sharma Residence → "Submit week" → grid shows read-only notice. Time a colleague doing a full week from scratch: under 3 minutes (spec R1 target). Typing 25 in a cell is clamped by the input and the server rejects totals over 24 per day.

- [ ] **Step 5: Commit**

```bash
git add src
git commit -m "feat: weekly timesheet grid with prefill, save and submit"
```

---

## Task 10: Approvals queue

**Files:**
- Create: `src/components/timesheets/ApprovalList.tsx`, `src/app/(app)/timesheets/approvals/page.tsx`

**Interfaces:**
- Consumes: `decideTimesheetEntries` (Task 9), `timesheetEntries`, `projects`, `me`.
- Produces: `/timesheets/approvals` listing submitted entries the user can approve, grouped by person and week, with Approve all / Send back.

- [ ] **Step 1: Components**

`src/components/timesheets/ApprovalList.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { weekStart } from "@/lib/time/weeks";
import { useAppStore } from "@/lib/store";
import { ACTIVITY_LABELS } from "@/types";

export function ApprovalList() {
  const { me, timesheetEntries, projects, decideTimesheetEntries } = useAppStore();
  const [notes, setNotes] = useState<Record<string, string>>({});

  // Mirror of can_approve_entry(): the database re-checks every id.
  const canApprove = (projectId?: string, authorId?: string) => {
    if (!projectId || authorId === me.id) return false;
    if (me.roles.includes("owner")) return true;
    const p = projects.find((x) => x.id === projectId);
    return !!p && (p.manager_id === me.id || (p.director_id === me.id && (!p.manager_id || p.manager_id === authorId)));
  };

  const pending = timesheetEntries.filter((e) => e.status === "submitted" && canApprove(e.project_id, e.profile_id));
  const groups = new Map<string, typeof pending>();
  for (const e of pending) {
    const k = `${e.profile_id}|${weekStart(e.work_date)}`;
    groups.set(k, [...(groups.get(k) ?? []), e]);
  }

  if (groups.size === 0) return <p className="text-sm text-muted-foreground">Nothing waiting for your approval.</p>;

  return (
    <div className="space-y-3">
      {[...groups.entries()].map(([k, entries]) => {
        const [, week] = k.split("|");
        const total = entries.reduce((s, e) => s + e.hours, 0);
        const ids = entries.map((e) => e.id);
        return (
          <Card key={k}>
            <CardContent className="p-4 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-sm">{entries[0].profile_name} · week of {week} · {total}h</p>
                <div className="flex items-center gap-2">
                  <Input aria-label="Reason for sending back" placeholder="Reason (to send back)" className="h-8 w-56" value={notes[k] ?? ""} onChange={(e) => setNotes({ ...notes, [k]: e.target.value })} />
                  <Button size="sm" variant="outline" disabled={!notes[k]?.trim()} onClick={() => decideTimesheetEntries(ids, false, notes[k])}>Send back</Button>
                  <Button size="sm" onClick={() => decideTimesheetEntries(ids, true)}>Approve</Button>
                </div>
              </div>
              <table className="w-full text-xs">
                <tbody>
                  {entries.map((e) => (
                    <tr key={e.id} className="border-t">
                      <td className="py-1">{e.work_date}</td><td>{e.project_name}</td><td>{ACTIVITY_LABELS[e.activity]}</td>
                      <td className="text-right">{e.hours}h{e.billable ? "" : " (non-billable)"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
```

`src/app/(app)/timesheets/approvals/page.tsx`:

```tsx
"use client";

import { TopBar } from "@/components/layout/AppSidebar";
import { ApprovalList } from "@/components/timesheets/ApprovalList";

export default function ApprovalsPage() {
  return (
    <div>
      <TopBar title="Timesheet approvals" subtitle="Time logged on projects you manage" />
      <div className="p-6"><ApprovalList /></div>
    </div>
  );
}
```

- [ ] **Step 2: Verify and commit**

Run: `npm run typecheck && npm run lint` → PASS. Manual: Neha submits a week; Ananya sees it grouped, sends it back with a reason; Neha sees the reason on her grid, fixes, resubmits; Ananya approves; Ananya's own Sharma time appears only in Vikram's queue.

```bash
git add src
git commit -m "feat: timesheet approvals queue with send-back reasons"
```

---

## Task 11: Staff terms, rate bands, cost rates and risk weights in Settings

**Files:**
- Create: `src/app/actions/staff.ts`
- Modify: `src/lib/actions/schemas.ts` (+ test), `src/app/(app)/settings/page.tsx`

**Interfaces:**
- Produces: schemas `staffTermsInput { id, weekly_capacity_hours, billable_target_percent, rate_band_id? }`, `rateBandInput { id?, name, blended_rate }`, `costRateInput { profile_id, effective_from, cost_rate }`, `riskSettingsInput { risk_weights: RiskWeights (each 0–100), monthly_billing_target? }`; server actions `setStaffTerms`, `upsertRateBand`, `addCostRate`, `updateRiskSettings` (each via `mutate`; called directly from the settings page).

- [ ] **Step 1: Schemas (test first)**

Append to `schemas.test.ts`:

```ts
import { costRateInput, riskSettingsInput, staffTermsInput } from "./schemas";

describe("staff and risk settings", () => {
  it("bounds capacity and targets", () => {
    expect(staffTermsInput.safeParse({ id: P, weekly_capacity_hours: 90, billable_target_percent: 75 }).success).toBe(false);
    expect(staffTermsInput.safeParse({ id: P, weekly_capacity_hours: 45, billable_target_percent: 101 }).success).toBe(false);
  });
  it("requires a non-negative cost rate with an effective date", () => {
    expect(costRateInput.safeParse({ profile_id: P, effective_from: "2026-04-01", cost_rate: -1 }).success).toBe(false);
  });
  it("requires all seven risk weights", () => {
    expect(riskSettingsInput.safeParse({ risk_weights: { fee_burn: 25 } }).success).toBe(false);
  });
});
```

Append to `schemas.ts`:

```ts
export const staffTermsInput = z.object({
  id,
  weekly_capacity_hours: z.coerce.number().min(0).max(80),
  billable_target_percent: z.coerce.number().int().min(0).max(100),
  rate_band_id: optId,
});
export const rateBandInput = z.object({ id: id.optional(), name: text(60), blended_rate: money });
export const costRateInput = z.object({ profile_id: id, effective_from: date, cost_rate: money });
const weight = z.coerce.number().min(0).max(100);
export const riskSettingsInput = z.object({
  risk_weights: z.object({
    fee_burn: weight, overdue: weight, schedule: weight, cost_variance: weight,
    approvals: weight, critical_snags: weight, pending_changes: weight,
  }),
  monthly_billing_target: money.optional().nullable(),
});
```

Run: `npm test` → PASS.

- [ ] **Step 2: Server actions**

`src/app/actions/staff.ts`:

```ts
"use server";
import { mutate } from "@/lib/actions/mutate";
import { costRateInput, rateBandInput, riskSettingsInput, staffTermsInput } from "@/lib/actions/schemas";

export async function setStaffTerms(input: unknown) {
  return mutate(staffTermsInput, input, ({ id, ...d }, db) => db.from("profiles").update(d).eq("id", id).select("id").single());
}

export async function upsertRateBand(input: unknown) {
  return mutate(rateBandInput, input, (d, db) => db.from("rate_bands").upsert(d).select("id").single());
}

export async function addCostRate(input: unknown) {
  return mutate(costRateInput, input, (d, db) =>
    db.from("staff_cost_rates").upsert(d, { onConflict: "profile_id,effective_from" }).select("id").single());
}

export async function updateRiskSettings(input: unknown) {
  return mutate(riskSettingsInput, input, (d, db) => db.from("firm_settings").update(d).eq("id", true).select("id").single());
}
```

- [ ] **Step 3: Settings UI**

In `src/app/(app)/settings/page.tsx`:
- Team tab, per member (owner only): number inputs "Capacity (h/week)" and "Billable target %", and a select of `rateBands` → on blur/change call `setStaffTerms({ id: m.id, weekly_capacity_hours, billable_target_percent, rate_band_id })` and toast errors.
- New tab "Rates" (owner sees edit controls; finance sees cost rates; others hidden):
  - Rate bands table with editable `blended_rate` → `upsertRateBand({ id, name, blended_rate })`, and an "Add band" row.
  - Cost rates (render only when `costRates.length > 0 || hasAnyRole(me, ["owner","finance"])`): per person, current rate (latest `effective_from` ≤ today) and history; form "New rate from <date>" → `addCostRate`. Caption: "Visible only to the owner and finance. Others see blended band rates."
- New tab "Risk & targets" (owner): seven number inputs bound to `studioSettings.risk_weights` and "Monthly billing target (₹)"; Save → `updateRiskSettings`. Show the sum of weights; caption "Factors without data yet are left out automatically".

- [ ] **Step 4: Verify and commit**

Run: `npm run typecheck && npm test && npm run lint` → PASS. Manual: as Priya change Neha's band to Senior Architect → Sharma's blended labour cost increases on reload. As Meera: Rates tab shows cost rates; as Ananya: no cost rates anywhere.

```bash
git add src
git commit -m "feat: settings for capacity, rate bands, private cost rates, risk weights and billing target"
```

---

## Task 12: Profitability on projects and in reports

**Files:**
- Create: `src/components/projects/ProfitabilityCard.tsx`, `src/components/dashboard/RiskTable.tsx`, `src/lib/metrics/portfolio.ts`, `src/lib/metrics/portfolio.test.ts`
- Modify: `src/components/projects/FeesTab.tsx`, `src/app/(app)/reports/page.tsx`

**Interfaces:**
- Produces: `portfolioRows(s: WorkspaceSnapshot, today: string, useActual: boolean): PortfolioRow[]` where `PortfolioRow = { project: Project; profit: Profitability; risk: { score: number; factors: RiskFactor[] } }`, sorted by risk score descending, live projects only (status not `lead`/`closed`); `<ProfitabilityCard profit />`; `<RiskTable rows />`.

- [ ] **Step 1: Failing test**

`src/lib/metrics/portfolio.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { portfolioRows } from "./portfolio";
import type { WorkspaceSnapshot } from "@/lib/data/snapshot";
import { DEFAULT_RISK_WEIGHTS } from "./risk";

const snap = {
  projects: [
    { id: "a", name: "A", status: "design", estimated_end_date: "2026-01-01" },
    { id: "b", name: "B", status: "design", estimated_end_date: "2027-01-01" },
    { id: "c", name: "C", status: "lead" },
  ],
  feeStages: [], changeOrders: [], invoices: [], projectCosts: [], expenses: [], snags: [],
  studioSettings: { risk_weights: DEFAULT_RISK_WEIGHTS },
} as unknown as WorkspaceSnapshot;

describe("portfolioRows", () => {
  it("ranks live projects by risk and drops leads", () => {
    const rows = portfolioRows(snap, "2026-10-09", false);
    expect(rows.map((r) => r.project.id)).toEqual(["a", "b"]);
    expect(rows[0].risk.score).toBeGreaterThan(rows[1].risk.score);
  });
});
```

Run: `npm test` → FAIL.

- [ ] **Step 2: Implement**

`src/lib/metrics/portfolio.ts`:

```ts
import type { WorkspaceSnapshot } from "@/lib/data/snapshot";
import { projectProfitability, type Profitability } from "@/lib/finance/profitability";
import { projectRisk, type RiskFactor } from "./risk";
import type { Project } from "@/types";

export interface PortfolioRow { project: Project; profit: Profitability; risk: { score: number; factors: RiskFactor[] } }

export function portfolioRows(s: WorkspaceSnapshot, today: string, useActual: boolean): PortfolioRow[] {
  return s.projects
    .filter((p) => p.status !== "lead" && p.status !== "closed")
    .map((project) => {
      const of = <T extends { project_id: string }>(xs: T[]) => xs.filter((x) => x.project_id === project.id);
      const stages = of(s.feeStages);
      const changeOrders = of(s.changeOrders);
      const invoices = of(s.invoices);
      const profit = projectProfitability({ stages, changeOrders, invoices, costs: of(s.projectCosts), expenses: of(s.expenses), useActual });
      const risk = projectRisk({ project, profit, stages, invoices, snags: of(s.snags), changeOrders, today, weights: s.studioSettings.risk_weights });
      return { project, profit, risk };
    })
    .sort((a, b) => b.risk.score - a.risk.score);
}
```

Run: `npm test` → PASS.

- [ ] **Step 3: Components**

`src/components/projects/ProfitabilityCard.tsx`:

```tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricInfo } from "@/components/metrics/MetricInfo";
import { NotEnoughData } from "@/components/metrics/NotEnoughData";
import type { Profitability } from "@/lib/finance/profitability";
import { cn, formatCurrency } from "@/lib/utils";

const pct = (x: number | null) => (x === null ? null : `${Math.round(x * 100)}%`);

export function ProfitabilityCard({ profit }: { profit: Profitability }) {
  const tiles = [
    { label: "Contract value", value: formatCurrency(profit.contractValue), formula: "Sum of stage amounts plus approved change-order fees" },
    { label: "Earned", value: formatCurrency(profit.earned), formula: "Stage fee × % complete, plus change-order fees invoiced" },
    { label: `Labour (${profit.costBasis})`, value: formatCurrency(profit.labourCost), formula: "Submitted/approved hours × rate (blended band rate, or actual for owner/finance)" },
    { label: "Direct costs", value: formatCurrency(profit.directCost), formula: "Recorded project expenses" },
    { label: "Margin to date", value: `${formatCurrency(profit.marginToDate)}${profit.marginPct === null ? "" : ` (${pct(profit.marginPct)})`}`, formula: "Earned − labour − direct costs", bad: profit.marginToDate < 0 },
    { label: "Projected margin at completion", value: profit.eacMargin === null ? null : `${formatCurrency(profit.eacMargin)} (${pct(profit.eacMarginPct)})`,
      formula: "Contract value − (labour + direct) ÷ % complete", bad: (profit.eacMargin ?? 0) < 0 },
  ];
  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">Profitability</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {profit.unratedHours > 0 && <p className="text-xs text-amber-700">{profit.unratedHours} hours belong to people with no rate band and are costed at ₹0. Set their band in Settings → Team.</p>}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {tiles.map((t) => (
            <div key={t.label} className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground flex items-center gap-1">{t.label} <MetricInfo formula={t.formula} /></p>
              {t.value === null ? <NotEnoughData hint="Needs stage progress above 0%" /> : <p className={cn("font-bold", t.bad && "text-red-600")}>{t.value}</p>}
            </div>
          ))}
        </div>
        <table className="w-full text-xs">
          <thead><tr className="text-muted-foreground text-left"><th>Stage</th><th className="text-right">Fee</th><th className="text-right">Labour</th><th className="text-right">Burn</th><th className="text-right">Complete</th></tr></thead>
          <tbody>{profit.stages.map((s) => (
            <tr key={s.id} className={cn("border-t", s.overBurn && "text-red-600 font-semibold")}>
              <td className="py-1">{s.name}</td><td className="text-right">{formatCurrency(s.amount)}</td><td className="text-right">{formatCurrency(s.labourCost)}</td>
              <td className="text-right">{s.burnPct === null ? "—" : `${s.burnPct}%`}</td><td className="text-right">{s.percentComplete}%</td>
            </tr>
          ))}</tbody>
        </table>
      </CardContent>
    </Card>
  );
}
```

`src/components/dashboard/RiskTable.tsx`:

```tsx
"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PortfolioRow } from "@/lib/metrics/portfolio";
import { cn, formatCurrency } from "@/lib/utils";

const tone = (s: number) => (s >= 50 ? "bg-red-100 text-red-700" : s >= 25 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700");

export function RiskTable({ rows, title = "Projects by risk" }: { rows: PortfolioRow[]; title?: string }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b text-xs text-muted-foreground text-left">
            <th className="py-2 px-4">Project</th><th className="px-4">Risk</th><th className="px-4">Top factor</th>
            <th className="px-4 text-right">Margin to date</th><th className="px-4 text-right">Projected margin</th>
          </tr></thead>
          <tbody className="divide-y">
            {rows.map(({ project, profit, risk }) => {
              const top = [...risk.factors].sort((a, b) => b.points - a.points)[0];
              return (
                <tr key={project.id}>
                  <td className="py-2 px-4"><Link href={`/projects/${project.id}`} className="font-medium hover:underline">{project.name}</Link>
                    <p className="text-xs text-muted-foreground">{project.client_name}</p></td>
                  <td className="px-4"><Badge className={cn("border-0", tone(risk.score))} title={risk.factors.map((f) => `${f.label}: ${f.points}/${f.weight}`).join("\n")}>{risk.score}</Badge></td>
                  <td className="px-4 text-xs">{top && top.points > 0 ? `${top.label} (${top.detail})` : "—"}</td>
                  <td className={cn("px-4 text-right", profit.marginToDate < 0 && "text-red-600")}>{formatCurrency(profit.marginToDate)}</td>
                  <td className={cn("px-4 text-right", (profit.eacMargin ?? 0) < 0 && "text-red-600")}>{profit.eacMargin === null ? "—" : formatCurrency(profit.eacMargin)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
```

- `FeesTab.tsx`: when `canSeeFinance = hasAnyRole(me, ["owner", "director", "project_manager", "finance"])`, render `<ProfitabilityCard profit={projectProfitability({...this project's slices, useActual: hasAnyRole(me, ["owner","finance"])})} />` above the stages.
- `reports/page.tsx`: replace the "Project cash position" table with `<RiskTable rows={portfolioRows(store, today, useActual)} title="Project profitability and risk" />` where `useActual` is a toggle shown only to owner/finance ("Show actual cost"). Keep the cash-position figures in the KPI row.

- [ ] **Step 4: Verify and commit**

Run: `npm run typecheck && npm test && npm run lint` → PASS. Manual: Sharma Residence Fees tab shows labour ≈ ₹1,63,000 blended for the seeded weeks (70×1,100 + 40×800 + 30×1,800 = ₹1,63,000) and BOQ & Specifications flagged red if burn exceeds progress by 15 points. Priya toggles "Show actual cost" in Reports and the numbers change; Ananya has no toggle.

```bash
git add src
git commit -m "feat: project profitability card and risk-ranked portfolio report"
```

---

## Task 13: Role dashboards

**Files:**
- Create: `src/components/dashboard/OwnerDashboard.tsx`, `DirectorDashboard.tsx`, `PmDashboard.tsx`, `MyWeekDashboard.tsx`, `UtilisationTable.tsx`
- Modify: `src/app/(app)/dashboard/page.tsx`

**Interfaces:**
- Consumes: `portfolioRows`, `utilisation`, `timesheetCompliance`, `dashboardKpis`, `unbilledWip`, `weekStart`, `weekDays`, `addDays`.
- Produces: `dashboard/page.tsx` renders `OwnerDashboard` (owner), `DirectorDashboard` (director), `PmDashboard` (project_manager), `MyWeekDashboard` (everyone else; also shown below the role dashboard for directors/PMs who log time). The Phase 0 KPI cards remain as the "Operations" row on every dashboard.

- [ ] **Step 1: Components**

`src/components/dashboard/UtilisationTable.tsx`:

```tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricInfo } from "@/components/metrics/MetricInfo";
import { NotEnoughData } from "@/components/metrics/NotEnoughData";
import type { UtilisationRow } from "@/lib/time/utilisation";
import { cn } from "@/lib/utils";

export function UtilisationTable({ rows, weeks }: { rows: UtilisationRow[]; weeks: number }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base flex items-center gap-1">Utilisation, last {weeks} weeks
        <MetricInfo formula="Billable hours ÷ capacity (weekly capacity × weeks); total includes non-billable time" /></CardTitle></CardHeader>
      <CardContent className="p-0">
        {rows.length === 0 ? <div className="p-4"><NotEnoughData /></div> : (
          <table className="w-full text-sm">
            <thead><tr className="border-b text-xs text-muted-foreground text-left"><th className="py-2 px-4">Person</th>
              <th className="px-4 text-right">Total</th><th className="px-4 text-right">Billable</th><th className="px-4 text-right">Target</th></tr></thead>
            <tbody className="divide-y">{rows.map((r) => (
              <tr key={r.profile_id}>
                <td className="py-2 px-4">{r.name}</td>
                <td className={cn("px-4 text-right", (r.totalPct ?? 0) > 110 && "text-red-600 font-semibold")}>{r.totalPct ?? "—"}%</td>
                <td className={cn("px-4 text-right", (r.gap ?? 0) < -10 && "text-amber-600 font-semibold")}>{r.billablePct ?? "—"}%</td>
                <td className="px-4 text-right">{r.target}%</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
```

`src/components/dashboard/OwnerDashboard.tsx`:

```tsx
"use client";

import { Card, CardContent } from "@/components/ui/card";
import { MetricInfo } from "@/components/metrics/MetricInfo";
import { NotEnoughData } from "@/components/metrics/NotEnoughData";
import { useAppStore } from "@/lib/store";
import { portfolioRows } from "@/lib/metrics/portfolio";
import { unbilledWip } from "@/lib/metrics/receivables";
import { addDays, weekStart } from "@/lib/time/weeks";
import { timesheetCompliance, utilisation } from "@/lib/time/utilisation";
import { formatCurrency, localToday } from "@/lib/utils";
import { RiskTable } from "./RiskTable";
import { UtilisationTable } from "./UtilisationTable";

const WEEKS = 4;

export function OwnerDashboard() {
  const s = useAppStore();
  const today = localToday();
  const weeks = Array.from({ length: WEEKS }, (_, i) => addDays(weekStart(today), -7 * (i + 1)));
  const rows = portfolioRows(s, today, true);
  const util = utilisation(s.staffWeekHours, s.team, weeks);
  const billable = util.reduce((a, r) => a + r.billable, 0);
  const capacity = util.reduce((a, r) => a + r.capacity, 0);
  const compliance = timesheetCompliance(s.staffWeekHours, s.team, weeks);
  const month = today.slice(0, 7);
  const invoicedMtd = s.invoices.filter((i) => i.status !== "draft" && i.status !== "cancelled" && i.issue_date?.startsWith(month))
    .reduce((a, i) => a + i.subtotal - i.discount, 0);
  const target = s.studioSettings.monthly_billing_target;
  const eac = rows.reduce((a, r) => a + (r.profit.eacMargin ?? 0), 0);

  const tiles = [
    { label: "Invoiced this month", value: formatCurrency(invoicedMtd) + (target ? ` of ${formatCurrency(target)}` : ""), formula: "Sent invoices this month, before GST, vs monthly billing target" },
    { label: "Unbilled work", value: formatCurrency(unbilledWip(s.feeStages)), formula: "Fee earned on stages minus amount invoiced" },
    { label: "Projected margin, live projects", value: rows.length ? formatCurrency(eac) : null, formula: "Sum of projected margin at completion across live projects (actual cost)" },
    { label: `Billable utilisation (${WEEKS} wks)`, value: capacity ? `${Math.round((billable / capacity) * 100)}%` : null, formula: "Billable hours ÷ capacity, all staff with capacity" },
    { label: "Timesheet compliance", value: compliance === null ? null : `${Math.round(compliance * 100)}%`, formula: "Submitted person-weeks ÷ expected person-weeks" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {tiles.map((t) => (
          <Card key={t.label}><CardContent className="p-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1">{t.label} <MetricInfo formula={t.formula} /></p>
            {t.value === null ? <NotEnoughData /> : <p className="text-xl font-bold mt-1">{t.value}</p>}
          </CardContent></Card>
        ))}
      </div>
      <RiskTable rows={rows} />
      <UtilisationTable rows={util} weeks={WEEKS} />
    </div>
  );
}
```

`src/components/dashboard/DirectorDashboard.tsx`:

```tsx
"use client";

import { useAppStore } from "@/lib/store";
import { portfolioRows } from "@/lib/metrics/portfolio";
import { addDays, weekStart } from "@/lib/time/weeks";
import { utilisation } from "@/lib/time/utilisation";
import { localToday } from "@/lib/utils";
import { RiskTable } from "./RiskTable";
import { UtilisationTable } from "./UtilisationTable";

export function DirectorDashboard() {
  const s = useAppStore();
  const today = localToday();
  const mine = s.projects.filter((p) => p.director_id === s.me.id);
  const rows = portfolioRows({ ...s, projects: mine }, today, false);
  const teamIds = new Set(mine.flatMap((p) => [p.manager_id, ...(p.team ?? []).map((t) => t.profile_id)]).filter(Boolean));
  const weeks = Array.from({ length: 4 }, (_, i) => addDays(weekStart(today), -7 * (i + 1)));
  return (
    <div className="space-y-6">
      <RiskTable rows={rows} title="My portfolio by risk" />
      <UtilisationTable rows={utilisation(s.staffWeekHours, s.team.filter((m) => teamIds.has(m.id)), weeks)} weeks={4} />
    </div>
  );
}
```

`src/components/dashboard/PmDashboard.tsx`:

```tsx
"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { checklistDone } from "@/lib/finance/fees";
import { portfolioRows } from "@/lib/metrics/portfolio";
import { useAppStore } from "@/lib/store";
import { formatDate, localToday } from "@/lib/utils";
import { RiskTable } from "./RiskTable";

export function PmDashboard() {
  const s = useAppStore();
  const today = localToday();
  const mine = s.projects.filter((p) => p.manager_id === s.me.id);
  const ids = new Set(mine.map((p) => p.id));
  const readyToBill = s.feeStages.filter((st) => ids.has(st.project_id) && st.status !== "complete" && st.checklist.length > 0 && checklistDone(st.checklist));
  const toApprove = s.timesheetEntries.filter((e) => e.status === "submitted" && e.project_id && ids.has(e.project_id) && e.profile_id !== s.me.id).length;
  const deadlines = mine.flatMap((p) => (p.milestones ?? []).filter((m) => !m.completed_at && m.due_date).map((m) => ({ ...m, project: p.name })))
    .sort((a, b) => a.due_date!.localeCompare(b.due_date!)).slice(0, 6);
  const burning = portfolioRows({ ...s, projects: mine }, today, false).flatMap((r) => r.profit.stages.filter((x) => x.overBurn).map((x) => ({ ...x, project: r.project })));

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-3 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Stages ready to complete</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">{readyToBill.length === 0 ? <p className="text-muted-foreground">None</p> :
            readyToBill.map((st) => <p key={st.id}><Link className="hover:underline" href={`/projects/${st.project_id}`}>{st.name}</Link></p>)}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Timesheets to approve</CardTitle></CardHeader>
          <CardContent><Link href="/timesheets/approvals" className="text-2xl font-bold hover:underline">{toApprove}</Link></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Stages burning ahead of progress</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">{burning.length === 0 ? <p className="text-muted-foreground">None</p> :
            burning.map((b) => <p key={b.id} className="text-red-600">{b.project.name} · {b.name}: {b.burnPct}% burn at {b.percentComplete}%</p>)}</CardContent></Card>
      </div>
      <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Upcoming deadlines</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-1">{deadlines.map((d) => (
          <p key={d.id} className={d.due_date! < today ? "text-red-600" : ""}>{formatDate(d.due_date!)} · {d.project} · {d.title}</p>
        ))}</CardContent></Card>
      <RiskTable rows={portfolioRows({ ...s, projects: mine }, today, false)} title="My projects by risk" />
    </div>
  );
}
```

`src/components/dashboard/MyWeekDashboard.tsx`:

```tsx
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAppStore } from "@/lib/store";
import { weekDays, weekStart } from "@/lib/time/weeks";
import { formatShortDate, localToday } from "@/lib/utils";

export function MyWeekDashboard() {
  const { me, team, timesheetEntries, tasks } = useAppStore();
  const today = localToday();
  const days = weekDays(weekStart(today));
  const capacity = team.find((m) => m.id === me.id)?.weekly_capacity_hours ?? 45;
  const logged = timesheetEntries.filter((e) => e.profile_id === me.id && days.includes(e.work_date)).reduce((s, e) => s + e.hours, 0);
  const myTasks = tasks.filter((t) => t.assigned_to === me.id && t.status !== "done").sort((a, b) => (a.due_date ?? "9").localeCompare(b.due_date ?? "9")).slice(0, 8);

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card><CardHeader className="pb-2"><CardTitle className="text-sm">This week</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <p className="text-2xl font-bold">{logged}h <span className="text-sm font-normal text-muted-foreground">of {capacity}h</span></p>
          <Progress value={Math.min(100, (logged / capacity) * 100)} />
          <Link href="/timesheets"><Button size="sm" variant="outline">Open timesheet</Button></Link>
        </CardContent></Card>
      <Card><CardHeader className="pb-2"><CardTitle className="text-sm">My tasks</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm">{myTasks.length === 0 ? <p className="text-muted-foreground">No open tasks.</p> : myTasks.map((t) => (
          <p key={t.id} className={t.due_date && t.due_date < today ? "text-red-600" : ""}>{t.title} · {t.project_name}{t.due_date ? ` · ${formatShortDate(t.due_date)}` : ""}</p>
        ))}</CardContent></Card>
    </div>
  );
}
```

- [ ] **Step 2: Route by role**

In `src/app/(app)/dashboard/page.tsx`, after the greeting `TopBar` and `<ActionItems />`:

```tsx
{me.roles.includes("owner") ? <OwnerDashboard />
  : me.roles.includes("director") ? <DirectorDashboard />
  : me.roles.includes("project_manager") ? <PmDashboard />
  : <MyWeekDashboard />}
{(me.roles.includes("director") || me.roles.includes("project_manager")) && <MyWeekDashboard />}
```

Keep the existing KPI cards and charts below under the heading "Operations".

- [ ] **Step 3: Verify and commit**

Run: `npm run typecheck && npm test && npm run lint && npm run build` → PASS. Manual: Priya sees the five owner tiles, risk table and utilisation; Vikram sees only Sharma and Reddy; Ananya sees ready stages, approvals count and deadlines; Neha sees My Week.

```bash
git add src
git commit -m "feat: owner, director, PM and my-week dashboards"
```

---

## Task 14: Phase 2 exit verification

- [ ] **Step 1: Automated checks**

```bash
npm run db:reset && npm run test:db && npm test && npm run typecheck && npm run lint && npm run build
```

- [ ] **Step 2: Privacy check in the browser**

Signed in as `ananya@studio.test`, open DevTools → Network, reload `/projects/<Sharma id>`, search the RSC payload for `cost_rate` and for `1150` (Neha's actual rate). Expected: no matches.

- [ ] **Step 3: Exit criteria (spec 9.2)**

- Timesheet compliance ≥ 90% for three consecutive weeks (Owner dashboard tile).
- Margin and EAC shown for every live project (Reports risk table has no "—" EAC except projects at 0% complete).
- Parallel run: for one month, reconcile three projects' labour cost against the firm's existing spreadsheet; record differences and their causes in the project log; the Owner signs off.

- [ ] **Step 4: Tag**

```bash
git tag phase-2-complete
```
