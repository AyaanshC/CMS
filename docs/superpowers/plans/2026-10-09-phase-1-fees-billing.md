# Phase 1: Fees and Billing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every project has a defined fee (design) and billing schedule (execution); finishing a stage automatically queues a draft invoice for Finance; scope changes are approved by the client and billed; receivables are aged, chased and alerted automatically.

**Architecture:** Builds on Phase 0 unchanged: Postgres holds rules and derived values (stage amounts, invoice balances, alert generation), RLS decides access, server actions validate with zod and call `mutate()`, the per-request store exposes data and actions to pages. New scheduled work runs with `pg_cron` inside Postgres; outbound email goes through one Supabase Edge Function that reads a queue table.

**Tech Stack:** As Phase 0, plus `pg_cron`, `pg_net`, Supabase Vault, Supabase Edge Functions (Deno), Resend HTTP API for email.

**Spec:** `docs/superpowers/specs/2026-10-09-mis-strategic-plan-design.md` (sections 3.1, 3.2, 4.2, 4.4, 4.6, 5.1 M3–M6, 5.4, 9.2 Phase 1)

**Prerequisite:** Phase 0 complete (`git tag phase-0-complete`). This plan references Phase 0 names: `mutate`, `run`, `ActionResult`, `WorkspaceSnapshot`, `loadWorkspace`, mappers, `invoice_summary`, `can_manage_project`, `can_bill_project`, `is_project_client`, `notify_project_staff`, `notify_project_clients`, `has_role`, `audit_row`, `PhotoInput`, `AssigneeSelect`, `MetricInfo`, `NotEnoughData`, `localToday`, `hasAnyRole`. If Phase 0 changed any of these during execution, update the references here before starting.

## Global Constraints

- All Phase 0 global constraints apply (Next.js 16 `proxy.ts` + Suspense rules; money `numeric(14,2)` and `round2`; Indian FY April–March; RLS is the enforcement point; no fabricated metrics).
- Engagement types: `design_only`, `design_and_execution`. Fee basis: `percent_of_cost`, `lump_sum`, `per_sqft`, `hourly`. Discipline: `architecture`, `interiors`, `both`.
- Default architecture fee stages: Concept 10%, Schematic Design 15%, Design Development 20%, Working Drawings & Tender 25%, Statutory Approvals 10%, Site Supervision 20%.
- Default interiors fee stages: Concept & Moodboard 15%, Design & 3D 25%, BOQ & Specifications 15%, Execution Supervision 35%, Handover 10%.
- Default execution billing schedule: Advance on BOQ approval 40%, Carcass/Structure complete 40%, Handover 20%. Execution stage amounts are a percentage of the active approved BOQ's items subtotal minus discount (GST added on the invoice).
- Stage percentages of one kind on one project must total exactly 100 before any stage of that kind can be completed.
- Only Owner or Director may change a project's fee basis, rate, amount or construction cost.
- A completed stage cannot be reopened once its invoice has been sent.
- Credit note number format: `CN/<FY>/<NNNN>`.
- Default client payment terms: 14 days. TDS is recorded per payment; `amount + tds_amount` counts towards settling an invoice.
- Alert rules (spec 5.4): stage complete and draft invoice unsent after 3 days → Finance, escalate to Owner at 7 days; invoice due in 3 days → client reminder email (if `alert_preferences.payment_reminders`); overdue 7 days → client reminder; overdue 30 days → project Director; overdue 45 days → Owner. Each alert is created at most once (dedupe key).
- Alerts must be acknowledged by their recipient; email delivery never blocks alert creation.

## Review Focus

- Changing a project's fee after some stages are invoiced must not change the amount of invoices already created. (Task 4 test `invoice_amount_frozen`)
- Completing a stage when that kind's percentages total 99% or 101% must fail with a clear message. (Task 3 test `percent_total_guard`)
- An execution stage completed before any BOQ is approved must not create a ₹0 invoice. (Task 4 test `no_zero_invoice`)
- Running the alert job twice on the same day must not duplicate alerts or emails. (Task 9 test `alerts_idempotent`)
- A payment with TDS that together exceeds the balance is rejected; TDS alone settling the last rupees marks the invoice paid. (Task 6 test `tds_settlement`)
- A PM changing a project's fee rate is rejected; a Director succeeds. (Task 1 test `fee_edit_guard`)

---

## File Structure

```
supabase/migrations/
  20261101000100_fees.sql                   engagement fields, templates, fee stages, guards, views
  20261101000200_fee_rpcs.sql               apply_fee_template, complete_fee_stage, stage→draft invoice trigger
  20261101000300_change_orders.sql          change orders, numbering, client decision RPC, CO→draft invoice
  20261101000400_receivables.sql            TDS, credit notes, retention, payment terms, invoice_summary v2
  20261101000500_alerts.sql                 alerts table, generate_alerts(), acknowledge RPC, cron schedule
supabase/seed.sql                           + fee templates, fee data on seeded projects
supabase/tests/
  05_fees.test.sql  06_change_orders.test.sql  07_receivables.test.sql  08_alerts.test.sql
supabase/functions/deliver-alerts/index.ts  email delivery worker
src/types/index.ts                          + fee, change order, alert, credit note types
src/lib/finance/fees.ts (+ .test.ts)        feeValue(), percentTotal(), stage helpers
src/lib/metrics/receivables.ts (+ .test.ts) ageing, DSO, client payment behaviour, billing lag, unbilled WIP
src/lib/data/{snapshot,mappers,load-workspace}.ts   + new collections
src/lib/actions/schemas.ts (+ .test.ts)     + fee, change order, credit note, payment-with-TDS schemas
src/app/actions/{fees,change-orders,receivables,alerts}.ts
src/components/projects/{FeesTab,FeeSetupDialog,ChangeOrdersTab}.tsx
src/components/approvals/ApprovalPanel.tsx  shared client approve/reject UI (BOQ + change orders)
src/components/finance/{InvoiceQueue,AgeingTable,CreditNoteDialog}.tsx
src/components/dashboard/ActionItems.tsx
src/app/(app)/finance/page.tsx
src/app/portal/[slug]/changes/page.tsx
```

---

## Task 1: Engagement, fee basis, templates and fee stages schema

**Files:**
- Create: `supabase/migrations/20261101000100_fees.sql`, `supabase/tests/05_fees.test.sql`
- Modify: `supabase/seed.sql`

**Interfaces:**
- Produces: enums `engagement_type, fee_basis, discipline, fee_stage_kind, fee_stage_status`; columns on `projects` (`engagement_type, discipline, fee_basis, fee_rate, fee_amount, estimated_construction_cost`); tables `fee_templates`, `project_fee_stages`; columns `clients.payment_terms_days`; SQL functions `project_fee_value(uuid) → numeric`, `execution_base(uuid) → numeric`, `fee_percent_total(uuid, fee_stage_kind) → numeric`; view `fee_stage_summary(id, project_id, kind, name, percent, sort_order, status, percent_complete, planned_start, planned_end, completed_at, checklist, amount, earned, invoiced)`.

- [ ] **Step 1: Write the failing tests**

`supabase/tests/05_fees.test.sql`:

```sql
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

create function pg_temp.act_as(uid uuid) returns void language plpgsql as $$
begin perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true); end $$;

-- Fee value by basis
update projects set fee_basis = 'percent_of_cost', fee_rate = 8, estimated_construction_cost = 10000000 where id = 'a1000000-0000-4000-8000-000000000002';
select is(project_fee_value('a1000000-0000-4000-8000-000000000002'), 800000.00::numeric, '8% of 1 crore');
update projects set fee_basis = 'per_sqft', fee_rate = 150 where id = 'a1000000-0000-4000-8000-000000000002';
select is(project_fee_value('a1000000-0000-4000-8000-000000000002'), 930000.00::numeric, '150/sqft x 6200');
update projects set fee_basis = 'lump_sum', fee_amount = 500000 where id = 'a1000000-0000-4000-8000-000000000002';
select is(project_fee_value('a1000000-0000-4000-8000-000000000002'), 500000.00::numeric, 'lump sum');
update projects set fee_basis = 'hourly' where id = 'a1000000-0000-4000-8000-000000000002';
select is(project_fee_value('a1000000-0000-4000-8000-000000000002'), 0::numeric, 'hourly has no fixed fee');

-- Seeded P1 fee stages (lump sum 300000, interiors template) and summary view
select is((select amount from fee_stage_summary where project_id = 'a1000000-0000-4000-8000-000000000001' and name = 'Design & 3D'), 75000.00::numeric, 'stage amount = fee x percent');
select is(fee_percent_total('a1000000-0000-4000-8000-000000000001', 'design_fee'), 100::numeric, 'seeded design stages total 100');

-- fee_edit_guard
select pg_temp.act_as('00000000-0000-4000-8000-000000000003');   -- PM Ananya
set local role authenticated;
select throws_like($$ update projects set fee_rate = 9 where id = 'a1000000-0000-4000-8000-000000000001' $$,
  '%Only an owner or director%', 'PM cannot change fee terms');
select lives_ok($$ update projects set name = 'Sharma Residence' where id = 'a1000000-0000-4000-8000-000000000001' $$, 'PM can edit other fields');
reset role;
select pg_temp.act_as('00000000-0000-4000-8000-000000000002');   -- Director Vikram
set local role authenticated;
select lives_ok($$ update projects set fee_amount = 320000 where id = 'a1000000-0000-4000-8000-000000000001' $$, 'director can change fee');
reset role;

select * from finish();
rollback;
```

Run: `npm run test:db` → Expected: FAIL (`column "fee_basis" does not exist`).

- [ ] **Step 2: Write the migration**

`supabase/migrations/20261101000100_fees.sql`:

```sql
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
create function public.guard_fee_terms() returns trigger language plpgsql as $$
begin
  if (new.fee_basis, new.fee_rate, new.fee_amount, new.estimated_construction_cost, new.engagement_type)
     is distinct from (old.fee_basis, old.fee_rate, old.fee_amount, old.estimated_construction_cost, old.engagement_type)
     and auth.uid() is not null
     and not (has_role('owner') or has_role('director')) then
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
```

- [ ] **Step 3: Seed templates and fee data**

Append to `supabase/seed.sql`:

```sql
insert into public.fee_templates (name, discipline, kind, stages) values
('Architecture (standard)', 'architecture', 'design_fee', '[
  {"name":"Concept","percent":10,"checklist":["Concept presentation shared","Client sign-off on concept"]},
  {"name":"Schematic Design","percent":15,"checklist":["Schematic drawings issued","Client sign-off"]},
  {"name":"Design Development","percent":20,"checklist":["DD drawing set issued","Consultant coordination done"]},
  {"name":"Working Drawings & Tender","percent":25,"checklist":["GFC drawings issued","Tender documents issued"]},
  {"name":"Statutory Approvals","percent":10,"checklist":["Applications submitted","Approvals received"]},
  {"name":"Site Supervision","percent":20,"checklist":["Final site inspection done","Completion certificate issued"]}]'),
('Interiors (standard)', 'interiors', 'design_fee', '[
  {"name":"Concept & Moodboard","percent":15,"checklist":["Moodboard presented","Client sign-off"]},
  {"name":"Design & 3D","percent":25,"checklist":["3D views shared","Client sign-off on design"]},
  {"name":"BOQ & Specifications","percent":15,"checklist":["BOQ submitted","Specifications issued"]},
  {"name":"Execution Supervision","percent":35,"checklist":["Site work complete","Snag list closed"]},
  {"name":"Handover","percent":10,"checklist":["Handover walkthrough done","Handover document signed"]}]'),
('Execution (standard)', 'both', 'execution', '[
  {"name":"Advance on BOQ approval","percent":40,"checklist":["BOQ approved by client"]},
  {"name":"Carcass / structure complete","percent":40,"checklist":["Carcass work inspected"]},
  {"name":"Handover","percent":20,"checklist":["Handover signed"]}]');

update public.projects set engagement_type = 'design_and_execution', discipline = 'interiors', fee_basis = 'lump_sum', fee_amount = 300000
  where id = 'a1000000-0000-4000-8000-000000000001';
update public.projects set engagement_type = 'design_only', discipline = 'architecture', fee_basis = 'percent_of_cost', fee_rate = 6, estimated_construction_cost = 15000000
  where id = 'a1000000-0000-4000-8000-000000000002';

insert into public.project_fee_stages (project_id, kind, name, percent, sort_order, status, percent_complete, completed_at, checklist)
select 'a1000000-0000-4000-8000-000000000001', 'design_fee', s->>'name', (s->>'percent')::numeric, ord::int,
       case when ord <= 2 then 'complete'::fee_stage_status when ord = 3 then 'in_progress' else 'not_started' end,
       case when ord <= 2 then 100 when ord = 3 then 50 else 0 end,
       case when ord <= 2 then now() - interval '30 days' end,
       (select coalesce(jsonb_agg(jsonb_build_object('label', c, 'done', ord <= 2)), '[]') from jsonb_array_elements_text(s->'checklist') c)
from public.fee_templates t, jsonb_array_elements(t.stages) with ordinality as x(s, ord)
where t.name = 'Interiors (standard)';
```

(The seeded "complete" stages have no auto-created invoices because the stage→invoice trigger arrives in Task 3 and seed rows are inserted, not updated.)

- [ ] **Step 4: Run tests**

Run: `npm run db:reset && npm run test:db` → Expected: all files `ok`.

- [ ] **Step 5: Commit**

```bash
git add supabase
git commit -m "feat(db): engagement types, fee basis, fee templates and fee stages"
```

---

## Task 2: Fee arithmetic in TypeScript

**Files:**
- Create: `src/lib/finance/fees.ts`, `src/lib/finance/fees.test.ts`
- Modify: `src/types/index.ts`

**Interfaces:**
- Produces types: `EngagementType, FeeBasis, Discipline, FeeStageKind, FeeStageStatus, ChecklistItem, FeeStage, FeeTemplate` and new `Project` fields (below).
- Produces functions: `feeValue(p: FeeTerms): number | null` (null for hourly or incomplete terms), `percentTotal(stages: Pick<FeeStage,'percent'>[]): number`, `checklistDone(c: ChecklistItem[]): boolean`, `weightedProgress(stages: FeeStage[]): number | null`.

- [ ] **Step 1: Types**

Add to `src/types/index.ts`:

```ts
export type EngagementType = 'design_only' | 'design_and_execution';
export type FeeBasis = 'percent_of_cost' | 'lump_sum' | 'per_sqft' | 'hourly';
export type Discipline = 'architecture' | 'interiors' | 'both';
export type FeeStageKind = 'design_fee' | 'execution';
export type FeeStageStatus = 'not_started' | 'in_progress' | 'complete';

export const ENGAGEMENT_LABELS: Record<EngagementType, string> = {
  design_only: 'Design only (fee)',
  design_and_execution: 'Design + execution (turnkey)',
};
export const FEE_BASIS_LABELS: Record<FeeBasis, string> = {
  percent_of_cost: '% of construction cost',
  lump_sum: 'Lump sum',
  per_sqft: 'Rate per sqft',
  hourly: 'Hourly (billed from timesheets)',
};

export interface ChecklistItem { label: string; done: boolean }

export interface FeeStage {
  id: string;
  project_id: string;
  kind: FeeStageKind;
  name: string;
  percent: number;
  sort_order: number;
  status: FeeStageStatus;
  percent_complete: number;
  planned_start?: string;
  planned_end?: string;
  completed_at?: string;
  checklist: ChecklistItem[];
  amount: number;     // from fee_stage_summary
  earned: number;
  invoiced: number;
}

export interface FeeTemplate {
  id: string;
  name: string;
  discipline: Discipline;
  kind: FeeStageKind;
  stages: { name: string; percent: number; checklist: string[] }[];
}

export interface FeeTerms {
  fee_basis?: FeeBasis;
  fee_rate?: number;
  fee_amount?: number;
  estimated_construction_cost?: number;
  area_sqft?: number;
}
```

Add to `Project`:

```ts
  engagement_type?: EngagementType;
  discipline?: Discipline;
  fee_basis?: FeeBasis;
  fee_rate?: number;
  fee_amount?: number;
  estimated_construction_cost?: number;
```

Add to `Client`: `payment_terms_days?: number;`

- [ ] **Step 2: Write the failing tests**

`src/lib/finance/fees.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { checklistDone, feeValue, percentTotal, weightedProgress } from "./fees";
import type { FeeStage } from "@/types";

const stage = (o: Partial<FeeStage>): FeeStage => ({
  id: "s", project_id: "p", kind: "design_fee", name: "", percent: 0, sort_order: 0, status: "not_started",
  percent_complete: 0, checklist: [], amount: 0, earned: 0, invoiced: 0, ...o,
});

describe("feeValue (mirrors project_fee_value in SQL)", () => {
  it("computes each basis", () => {
    expect(feeValue({ fee_basis: "percent_of_cost", fee_rate: 8, estimated_construction_cost: 10_000_000 })).toBe(800000);
    expect(feeValue({ fee_basis: "per_sqft", fee_rate: 150, area_sqft: 6200 })).toBe(930000);
    expect(feeValue({ fee_basis: "lump_sum", fee_amount: 500000 })).toBe(500000);
  });
  it("is null for hourly or incomplete terms", () => {
    expect(feeValue({ fee_basis: "hourly", fee_rate: 2000 })).toBeNull();
    expect(feeValue({ fee_basis: "percent_of_cost", fee_rate: 8 })).toBeNull();
    expect(feeValue({})).toBeNull();
  });
});

describe("percentTotal", () => {
  it("sums with rounding", () => {
    expect(percentTotal([stage({ percent: 33.33 }), stage({ percent: 33.33 }), stage({ percent: 33.34 })])).toBe(100);
  });
});

describe("checklistDone", () => {
  it("requires every item done; empty counts as done", () => {
    expect(checklistDone([{ label: "a", done: true }, { label: "b", done: false }])).toBe(false);
    expect(checklistDone([])).toBe(true);
  });
});

describe("weightedProgress", () => {
  it("weights percent complete by stage share", () => {
    expect(weightedProgress([stage({ percent: 20, percent_complete: 100 }), stage({ percent: 80, percent_complete: 50 })])).toBe(60);
  });
  it("ignores execution stages and returns null with no design stages", () => {
    expect(weightedProgress([stage({ kind: "execution", percent: 100, percent_complete: 100 })])).toBeNull();
  });
});
```

Run: `npm test` → Expected: FAIL (cannot resolve `./fees`).

- [ ] **Step 3: Implement**

`src/lib/finance/fees.ts`:

```ts
import { round2 } from "./money";
import type { ChecklistItem, FeeStage, FeeTerms } from "@/types";

// Mirrors public.project_fee_value(); keep both in sync.
export function feeValue(t: FeeTerms): number | null {
  switch (t.fee_basis) {
    case "percent_of_cost":
      return t.fee_rate != null && t.estimated_construction_cost != null ? round2((t.fee_rate * t.estimated_construction_cost) / 100) : null;
    case "per_sqft":
      return t.fee_rate != null && t.area_sqft != null ? round2(t.fee_rate * t.area_sqft) : null;
    case "lump_sum":
      return t.fee_amount ?? null;
    default:
      return null;
  }
}

export const percentTotal = (stages: Pick<FeeStage, "percent">[]) => round2(stages.reduce((s, x) => s + x.percent, 0));

export const checklistDone = (c: ChecklistItem[]) => c.every((i) => i.done);

// Project progress = design stages' completion weighted by their fee share.
export function weightedProgress(stages: FeeStage[]): number | null {
  const design = stages.filter((s) => s.kind === "design_fee");
  const total = percentTotal(design);
  if (!total) return null;
  return Math.round(design.reduce((s, x) => s + x.percent * x.percent_complete, 0) / total);
}
```

Run: `npm test` → Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/types/index.ts src/lib/finance/fees.ts src/lib/finance/fees.test.ts
git commit -m "feat: fee types and fee arithmetic"
```

---

## Task 3: Applying templates and completing stages

**Files:**
- Create: `supabase/migrations/20261101000200_fee_rpcs.sql`
- Modify: `supabase/tests/05_fees.test.sql` (extend)

**Interfaces:**
- Produces RPCs: `apply_fee_template(p_project uuid, p_template uuid) → int` (stages created), `complete_fee_stage(p_stage uuid) → uuid` (draft invoice id, or null when the amount is zero), `reopen_fee_stage(p_stage uuid) → void`; trigger keeping `projects.progress_percent` equal to the weighted design-stage progress.

- [ ] **Step 1: Extend the failing tests**

Change `select plan(9);` to `select plan(17);` in `05_fees.test.sql` and add before `select * from finish();`:

```sql
-- Restore P2's fee terms changed by the assertions above: 6% of 1.5 crore = 9,00,000.
update projects set fee_basis = 'percent_of_cost', fee_rate = 6, estimated_construction_cost = 15000000
  where id = 'a1000000-0000-4000-8000-000000000002';

-- apply_fee_template
select pg_temp.act_as('00000000-0000-4000-8000-000000000001');   -- owner
set local role authenticated;
select is(apply_fee_template('a1000000-0000-4000-8000-000000000002', (select id from fee_templates where name = 'Architecture (standard)')),
  6, 'six architecture stages created');
select throws_like($$ select apply_fee_template('a1000000-0000-4000-8000-000000000002', (select id from fee_templates where name = 'Architecture (standard)')) $$,
  '%already has%', 'template cannot be applied twice');
reset role;

-- percent_total_guard
update project_fee_stages set percent = 11 where project_id = 'a1000000-0000-4000-8000-000000000002' and name = 'Concept';
update project_fee_stages set checklist = '[]' where project_id = 'a1000000-0000-4000-8000-000000000002';
select pg_temp.act_as('00000000-0000-4000-8000-000000000001');
set local role authenticated;
select throws_like($$ select complete_fee_stage((select id from project_fee_stages where project_id = 'a1000000-0000-4000-8000-000000000002' and name = 'Concept')) $$,
  '%total 101%', 'stages must total 100');
reset role;
update project_fee_stages set percent = 10 where project_id = 'a1000000-0000-4000-8000-000000000002' and name = 'Concept';

-- checklist guard + draft invoice
update project_fee_stages set checklist = '[{"label":"Sign-off","done":false}]' where project_id = 'a1000000-0000-4000-8000-000000000002' and name = 'Concept';
select pg_temp.act_as('00000000-0000-4000-8000-000000000001');
set local role authenticated;
select throws_like($$ select complete_fee_stage((select id from project_fee_stages where project_id = 'a1000000-0000-4000-8000-000000000002' and name = 'Concept')) $$,
  '%checklist%', 'checklist must be complete');
reset role;
update project_fee_stages set checklist = '[{"label":"Sign-off","done":true}]' where project_id = 'a1000000-0000-4000-8000-000000000002' and name = 'Concept';
select pg_temp.act_as('00000000-0000-4000-8000-000000000001');
set local role authenticated;
select isnt(complete_fee_stage((select id from project_fee_stages where project_id = 'a1000000-0000-4000-8000-000000000002' and name = 'Concept')),
  null, 'completing returns draft invoice id');
reset role;
select is((select subtotal from invoices where fee_stage_id = (select id from project_fee_stages where project_id = 'a1000000-0000-4000-8000-000000000002' and name = 'Concept')),
  90000.00::numeric, 'draft = 10% of 6% of 1.5 crore');
select is((select progress_percent from projects where id = 'a1000000-0000-4000-8000-000000000002'), 10, 'progress follows stages');

-- no_zero_invoice: execution stage with no approved BOQ on P3
insert into project_fee_stages (project_id, kind, name, percent, sort_order) values ('a1000000-0000-4000-8000-000000000003', 'execution', 'Advance', 100, 1);
select pg_temp.act_as('00000000-0000-4000-8000-000000000003');
set local role authenticated;
select is(complete_fee_stage((select id from project_fee_stages where project_id = 'a1000000-0000-4000-8000-000000000003' and name = 'Advance')),
  null, 'no invoice when amount is zero');
reset role;
```

Run: `npm run test:db` → Expected: FAIL (`function apply_fee_template does not exist`).

- [ ] **Step 2: Write the migration**

`supabase/migrations/20261101000200_fee_rpcs.sql`:

```sql
create function public.apply_fee_template(p_project uuid, p_template uuid) returns int
language plpgsql security definer set search_path = public as $$
declare v_kind fee_stage_kind; v_stages jsonb; v_count int;
begin
  if not can_manage_project(p_project) then raise exception 'Not allowed'; end if;
  select kind, stages into v_kind, v_stages from fee_templates where id = p_template;
  if v_kind is null then raise exception 'Unknown template'; end if;
  if exists (select 1 from project_fee_stages where project_id = p_project and kind = v_kind) then
    raise exception 'This project already has % stages; edit them instead', v_kind;
  end if;
  insert into project_fee_stages (project_id, kind, name, percent, sort_order, checklist)
  select p_project, v_kind, s->>'name', (s->>'percent')::numeric, ord::int,
         (select coalesce(jsonb_agg(jsonb_build_object('label', c, 'done', false)), '[]'::jsonb)
            from jsonb_array_elements_text(coalesce(s->'checklist', '[]'::jsonb)) c)
  from jsonb_array_elements(v_stages) with ordinality as x(s, ord);
  get diagnostics v_count = row_count;
  return v_count;
end $$;

create function public.complete_fee_stage(p_stage uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare v record; v_total numeric; v_amount numeric; v_invoice uuid;
begin
  select * into v from project_fee_stages where id = p_stage for update;
  if v.id is null or not can_manage_project(v.project_id) then raise exception 'Not allowed'; end if;
  if v.status = 'complete' then raise exception 'Stage is already complete'; end if;
  v_total := fee_percent_total(v.project_id, v.kind);
  if v_total <> 100 then raise exception 'Stage percentages must total 100 (currently total %)', v_total; end if;
  if exists (select 1 from jsonb_array_elements(v.checklist) c where not coalesce((c->>'done')::boolean, false)) then
    raise exception 'Finish the stage checklist first';
  end if;

  update project_fee_stages set status = 'complete', percent_complete = 100, completed_at = now() where id = p_stage;

  select amount into v_amount from fee_stage_summary where id = p_stage;
  if coalesce(v_amount, 0) <= 0 then return null; end if;   -- e.g. hourly fee, or no approved BOQ yet

  insert into invoices (project_id, status, subtotal, gst_rate, fee_stage_id, notes)
  values (v.project_id, 'draft', v_amount, (select gst_rate from firm_settings), p_stage, 'Stage: ' || v.name)
  returning id into v_invoice;

  perform log_activity(v.project_id, null, 'Stage complete: ' || v.name, 'Draft invoice queued for Finance', 'stage_change');
  insert into notifications (user_id, type, title, body, link)
  select r.user_id, 'invoice_draft', 'Ready to invoice: ' || v.name, 'A draft invoice is waiting in the Finance queue.', '/finance'
  from user_roles r where r.role = 'finance';
  return v_invoice;
end $$;

-- Reopening is allowed only while the stage's invoice is still a draft (the draft is deleted).
create function public.reopen_fee_stage(p_stage uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v record;
begin
  select * into v from project_fee_stages where id = p_stage for update;
  if v.id is null or not can_manage_project(v.project_id) then raise exception 'Not allowed'; end if;
  if exists (select 1 from invoices where fee_stage_id = p_stage and status = 'sent') then
    raise exception 'This stage has been invoiced and cannot be reopened; raise a credit note instead';
  end if;
  delete from invoices where fee_stage_id = p_stage and status = 'draft';
  update project_fee_stages set status = 'in_progress', completed_at = null where id = p_stage;
end $$;

-- Keep projects.progress_percent equal to weighted design-stage progress.
create function public.sync_project_progress() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_project uuid := coalesce(new.project_id, old.project_id); v_total numeric;
begin
  select sum(percent) into v_total from project_fee_stages where project_id = v_project and kind = 'design_fee';
  if coalesce(v_total, 0) > 0 then
    update projects set progress_percent = round((
      select sum(percent * percent_complete) from project_fee_stages where project_id = v_project and kind = 'design_fee') / v_total)
    where id = v_project;
  end if;
  return null;
end $$;
create trigger fee_stages_progress after insert or update or delete on public.project_fee_stages
  for each row execute function public.sync_project_progress();
```

- [ ] **Step 3: Run tests**

Run: `npm run db:reset && npm run test:db` → Expected: all `ok`.

- [ ] **Step 4: Commit**

```bash
git add supabase
git commit -m "feat(db): apply fee templates, complete stages into draft invoices, derived progress"
```

---

## Task 4: Invoices keep their amounts when fees change

**Files:**
- Modify: `supabase/tests/05_fees.test.sql`

**Interfaces:** none new (verifies Task 3's design: invoice subtotal is copied at completion).

- [ ] **Step 1: Add the test**

Change `select plan(17);` to `select plan(18);` and add before `finish()`:

```sql
-- invoice_amount_frozen: changing the fee later does not touch the existing draft
update projects set estimated_construction_cost = 30000000 where id = 'a1000000-0000-4000-8000-000000000002';
select is((select subtotal from invoices where fee_stage_id = (select id from project_fee_stages where project_id = 'a1000000-0000-4000-8000-000000000002' and name = 'Concept')),
  90000.00::numeric, 'existing invoice unchanged after fee change');
```

- [ ] **Step 2: Run**

Run: `npm run test:db` → Expected: PASS (no code change needed; if it fails, the invoice must not be computed from a view).

- [ ] **Step 3: Commit**

```bash
git add supabase/tests/05_fees.test.sql
git commit -m "test(db): invoice amounts are frozen at stage completion"
```

---

## Task 5: Change orders

**Files:**
- Create: `supabase/migrations/20261101000300_change_orders.sql`, `supabase/tests/06_change_orders.test.sql`
- Modify: `src/types/index.ts`

**Interfaces:**
- Produces: enum `change_order_reason ('client_request','site_condition','regulatory','design_error')`, enum `change_order_status ('draft','submitted','approved','rejected')`; table `change_orders(id, project_id, number, title, description, reason, fee_impact, cost_impact, schedule_impact_days, status, submitted_at, decided_at, decided_by text, decision_note, created_by, created_at)`; column `invoices.change_order_id`; RPC `client_decide_change_order(p_co uuid, p_approve boolean, p_signer text, p_note text) → void`; approval with `fee_impact > 0` creates a draft invoice; `design_error` change orders cannot carry a fee to the client.
- Produces TS: `ChangeOrderReason`, `ChangeOrderStatus`, `ChangeOrder`, `CHANGE_ORDER_REASON_LABELS`.

- [ ] **Step 1: Write the failing tests**

`supabase/tests/06_change_orders.test.sql`:

```sql
begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

create function pg_temp.act_as(uid uuid) returns void language plpgsql as $$
begin perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true); end $$;

select pg_temp.act_as('00000000-0000-4000-8000-000000000003');   -- PM on P1
set local role authenticated;
insert into change_orders (project_id, title, reason, fee_impact, schedule_impact_days) values
  ('a1000000-0000-4000-8000-000000000001', 'Add study room design', 'client_request', 45000, 7);
select is((select number from change_orders where title = 'Add study room design'), 'CO-01', 'numbered per project');
select throws_like($$ insert into change_orders (project_id, title, reason, fee_impact) values ('a1000000-0000-4000-8000-000000000001', 'Fix our error', 'design_error', 1000) $$,
  '%design error%', 'internal errors cannot be charged');
update change_orders set status = 'submitted', submitted_at = now() where title = 'Add study room design';
reset role;

-- Client sees submitted, decides
select pg_temp.act_as('00000000-0000-4000-8000-000000000011');
set local role authenticated;
select is((select count(*)::int from change_orders), 1, 'client sees submitted change order');
select lives_ok($$ select client_decide_change_order((select id from change_orders where title = 'Add study room design'), true, 'Arun Sharma', null) $$, 'client approves');
select throws_like($$ select client_decide_change_order((select id from change_orders where title = 'Add study room design'), true, 'Arun Sharma', null) $$,
  '%Only submitted%', 'cannot decide twice');
reset role;

select is((select status::text from change_orders where title = 'Add study room design'), 'approved', 'approved');
select is((select subtotal from invoices where change_order_id = (select id from change_orders where title = 'Add study room design') and status = 'draft'),
  45000.00::numeric, 'approved fee impact queued as draft invoice');

-- Other client cannot see it
select pg_temp.act_as('00000000-0000-4000-8000-000000000012');
set local role authenticated;
select is((select count(*)::int from change_orders), 0, 'other client sees nothing');
reset role;

select * from finish();
rollback;
```

Run: `npm run test:db` → Expected: FAIL (`relation "change_orders" does not exist`).

- [ ] **Step 2: Migration**

`supabase/migrations/20261101000300_change_orders.sql`:

```sql
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
```

- [ ] **Step 3: Types**

Add to `src/types/index.ts`:

```ts
export type ChangeOrderReason = 'client_request' | 'site_condition' | 'regulatory' | 'design_error';
export type ChangeOrderStatus = 'draft' | 'submitted' | 'approved' | 'rejected';
export const CHANGE_ORDER_REASON_LABELS: Record<ChangeOrderReason, string> = {
  client_request: 'Client request',
  site_condition: 'Site condition',
  regulatory: 'Regulatory requirement',
  design_error: 'Internal design error (no charge)',
};

export interface ChangeOrder {
  id: string;
  project_id: string;
  number: string;
  title: string;
  description?: string;
  reason: ChangeOrderReason;
  fee_impact: number;
  cost_impact: number;
  schedule_impact_days: number;
  status: ChangeOrderStatus;
  submitted_at?: string;
  decided_at?: string;
  decided_by?: string;
  decision_note?: string;
  created_at: string;
}
```

Add to `Invoice`: `fee_stage_id?: string; change_order_id?: string;`

- [ ] **Step 4: Run tests and commit**

Run: `npm run db:reset && npm run test:db && npm run typecheck` → Expected: PASS.

```bash
git add supabase src/types/index.ts
git commit -m "feat(db): change orders with client approval and billing"
```

---

## Task 6: Payment terms, TDS, retention and credit notes

**Files:**
- Create: `supabase/migrations/20261101000400_receivables.sql`, `supabase/tests/07_receivables.test.sql`
- Modify: `src/types/index.ts`

**Interfaces:**
- Produces: columns `payments.tds_amount`, `invoices.retention_amount`, `invoices.retention_released_at`; table `credit_notes(id, invoice_id, number, amount, reason, issued_at, created_by)`; `invoice_summary` v2 columns `(id, project_id, amount_paid, tds_amount, credited, retention_held, amount_due, effective_status, last_payment_date)`; trigger: sending an invoice without a due date sets `issue_date + clients.payment_terms_days`; RPC-free credit notes guarded by a trigger (≤ remaining balance; numbered `CN/<FY>/<NNNN>`).
- Produces TS: `CreditNote`; `Invoice` gains `tds_amount, credited, retention_amount, retention_held, retention_released_at?, last_payment_date?`; `Payment` gains `tds_amount`.

- [ ] **Step 1: Write the failing tests**

`supabase/tests/07_receivables.test.sql`:

```sql
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

-- payment terms default the due date on send
update clients set payment_terms_days = 30 where id = 'c1000000-0000-4000-8000-000000000001';
insert into invoices (id, project_id, status, subtotal, gst_rate) values ('e1000000-0000-4000-8000-000000000009', 'a1000000-0000-4000-8000-000000000001', 'draft', 100000, 18);
update invoices set status = 'sent' where id = 'e1000000-0000-4000-8000-000000000009';
select is((select due_date - issue_date from invoices where id = 'e1000000-0000-4000-8000-000000000009'), 30, 'due date from client terms');

-- tds_settlement: total 118000
insert into payments (invoice_id, amount, tds_amount, payment_date, mode) values ('e1000000-0000-4000-8000-000000000009', 100000, 10000, current_date, 'bank_transfer');
select is((select amount_due from invoice_summary where id = 'e1000000-0000-4000-8000-000000000009'), 8000.00::numeric, 'TDS counts towards settlement');
select throws_like($$ insert into payments (invoice_id, amount, tds_amount, payment_date, mode) values ('e1000000-0000-4000-8000-000000000009', 7000, 1001, current_date, 'upi') $$,
  '%exceeds amount due%', 'amount + TDS over balance rejected');
insert into payments (invoice_id, amount, tds_amount, payment_date, mode) values ('e1000000-0000-4000-8000-000000000009', 7200, 800, current_date, 'upi');
select is((select effective_status from invoice_summary where id = 'e1000000-0000-4000-8000-000000000009'), 'paid', 'paid when amount + TDS covers total');

-- credit notes
select throws_like($$ insert into credit_notes (invoice_id, amount, reason) values ('e1000000-0000-4000-8000-000000000001', 200000, 'too much') $$,
  '%exceeds%', 'credit cannot exceed balance');
insert into credit_notes (invoice_id, amount, reason) values ('e1000000-0000-4000-8000-000000000001', 5000, 'Rate correction');
select matches((select number from credit_notes where reason = 'Rate correction'), '^CN/\d{2}-\d{2}/\d{4}$', 'credit note numbered');
select is((select amount_due from invoice_summary where id = 'e1000000-0000-4000-8000-000000000001'), 190000.00::numeric, 'credit reduces due');

-- retention is held out of amount due until released
update invoices set retention_amount = 10000 where id = 'e1000000-0000-4000-8000-000000000001';
select is((select amount_due from invoice_summary where id = 'e1000000-0000-4000-8000-000000000001'), 180000.00::numeric, 'retention held');
update invoices set retention_released_at = now() where id = 'e1000000-0000-4000-8000-000000000001';
select is((select amount_due from invoice_summary where id = 'e1000000-0000-4000-8000-000000000001'), 190000.00::numeric, 'retention released');

select * from finish();
rollback;
```

Run: `npm run test:db` → Expected: FAIL (`column "tds_amount" does not exist`).

- [ ] **Step 2: Migration**

`supabase/migrations/20261101000400_receivables.sql`:

```sql
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
```

Note: `guard_credit_note` reads `invoice_summary` as the definer (bypasses RLS), so the balance is exact regardless of the caller.

- [ ] **Step 3: Types**

In `src/types/index.ts` add `tds_amount: number;` to `Payment`, and to `Invoice`:

```ts
  tds_amount: number;
  credited: number;
  retention_amount: number;
  retention_held: number;
  retention_released_at?: string;
  last_payment_date?: string;
```

and:

```ts
export interface CreditNote {
  id: string;
  invoice_id: string;
  number?: string;
  amount: number;
  reason: string;
  issued_at: string;
}
```

- [ ] **Step 4: Run tests and commit**

Run: `npm run db:reset && npm run test:db` → Expected: PASS. (`npm run typecheck` fails until Task 7 updates the mappers; that is expected.)

```bash
git add supabase src/types/index.ts
git commit -m "feat(db): payment terms, TDS, retention and credit notes"
```

---

## Task 7: Load fees, change orders and receivables into the workspace

**Files:**
- Modify: `src/lib/data/snapshot.ts`, `src/lib/data/mappers.ts`, `src/lib/data/mappers.test.ts`, `src/lib/data/load-workspace.ts`

**Interfaces:**
- Consumes: Phase 0 loader and mapper patterns.
- Produces: `WorkspaceSnapshot` gains `feeStages: FeeStage[]`, `feeTemplates: FeeTemplate[]`, `changeOrders: ChangeOrder[]`, `creditNotes: CreditNote[]`; mappers `mapFeeStage`, `mapFeeTemplate`, `mapChangeOrder`, `mapCreditNote`; `mapInvoice` and `mapPayment` fill the new fields; `mapProject` fills fee terms; `mapClient` fills `payment_terms_days`.

- [ ] **Step 1: Regenerate DB types**

Run: `npm run db:types`

- [ ] **Step 2: Extend the mapper tests (failing)**

Append to `src/lib/data/mappers.test.ts`:

```ts
import { mapFeeStage } from "./mappers";

describe("mapFeeStage", () => {
  it("maps the summary view row", () => {
    const s = mapFeeStage({
      id: "s1", project_id: "p1", kind: "design_fee", name: "Concept", percent: 10, sort_order: 1, status: "complete",
      percent_complete: 100, planned_start: null, planned_end: null, completed_at: "2026-10-01T00:00:00Z",
      checklist: [{ label: "Sign-off", done: true }], amount: 90000, earned: 90000, invoiced: 90000,
    });
    expect(s).toMatchObject({ name: "Concept", amount: 90000, checklist: [{ label: "Sign-off", done: true }], planned_start: undefined });
  });
});
```

Update the existing `mapInvoice` test's summary argument to the v2 shape:

```ts
    const inv = mapInvoice(row, { id: "e1", amount_paid: 100000, tds_amount: 0, credited: 0, retention_held: 0, amount_due: 195000, effective_status: "partial", last_payment_date: "2026-10-05" });
```

and add `retention_amount: 0, retention_released_at: null, fee_stage_id: null, change_order_id: null` to the `InvoiceRow` literal.

Run: `npm test` → Expected: FAIL.

- [ ] **Step 3: Implement mappers**

In `src/lib/data/mappers.ts`:

```ts
export type FeeStageRow = {
  id: string | null; project_id: string | null; kind: FeeStageKind | null; name: string | null; percent: number | null;
  sort_order: number | null; status: FeeStageStatus | null; percent_complete: number | null; planned_start: string | null;
  planned_end: string | null; completed_at: string | null; checklist: unknown; amount: number | null; earned: number | null; invoiced: number | null;
};

export function mapFeeStage(r: FeeStageRow): FeeStage {
  return {
    id: r.id!, project_id: r.project_id!, kind: r.kind!, name: r.name ?? "", percent: r.percent ?? 0,
    sort_order: r.sort_order ?? 0, status: r.status ?? "not_started", percent_complete: r.percent_complete ?? 0,
    planned_start: opt(r.planned_start), planned_end: opt(r.planned_end), completed_at: opt(r.completed_at),
    checklist: (r.checklist as ChecklistItem[] | null) ?? [], amount: r.amount ?? 0, earned: r.earned ?? 0, invoiced: r.invoiced ?? 0,
  };
}

export function mapFeeTemplate(r: Tables<"fee_templates">): FeeTemplate {
  return { id: r.id, name: r.name, discipline: r.discipline, kind: r.kind, stages: r.stages as FeeTemplate["stages"] };
}

export function mapChangeOrder(r: Tables<"change_orders">): ChangeOrder {
  return {
    id: r.id, project_id: r.project_id, number: r.number, title: r.title, description: opt(r.description), reason: r.reason,
    fee_impact: r.fee_impact, cost_impact: r.cost_impact, schedule_impact_days: r.schedule_impact_days, status: r.status,
    submitted_at: opt(r.submitted_at), decided_at: opt(r.decided_at), decided_by: opt(r.decided_by),
    decision_note: opt(r.decision_note), created_at: r.created_at,
  };
}

export function mapCreditNote(r: Tables<"credit_notes">): CreditNote {
  return { id: r.id, invoice_id: r.invoice_id, number: opt(r.number), amount: r.amount, reason: r.reason, issued_at: r.issued_at };
}
```

Add the new types to the import list. Change `InvoiceSummary` to:

```ts
export interface InvoiceSummary {
  id: string | null; amount_paid: number | null; tds_amount: number | null; credited: number | null;
  retention_held: number | null; amount_due: number | null; effective_status: string | null; last_payment_date: string | null;
}
```

In `mapInvoice` add:

```ts
    fee_stage_id: opt(r.fee_stage_id), change_order_id: opt(r.change_order_id),
    tds_amount: s?.tds_amount ?? 0, credited: s?.credited ?? 0, retention_amount: r.retention_amount,
    retention_held: s?.retention_held ?? r.retention_amount, retention_released_at: opt(r.retention_released_at),
    last_payment_date: opt(s?.last_payment_date ?? null),
```

In `mapPayment` add `tds_amount: r.tds_amount,`. In `mapProject` add `engagement_type: opt(r.engagement_type), discipline: opt(r.discipline), fee_basis: opt(r.fee_basis), fee_rate: opt(r.fee_rate), fee_amount: opt(r.fee_amount), estimated_construction_cost: opt(r.estimated_construction_cost),` and in `mapClient` add `payment_terms_days: r.payment_terms_days,`.

- [ ] **Step 4: Loader and snapshot**

Add to `WorkspaceSnapshot`: `feeStages: FeeStage[]; feeTemplates: FeeTemplate[]; changeOrders: ChangeOrder[]; creditNotes: CreditNote[];`.

In `loadWorkspace`, add four queries to the `Promise.all` list (and to the `failed` check array):

```ts
    db.from("fee_stage_summary").select("*").order("sort_order"),
    db.from("fee_templates").select("*").order("name"),
    db.from("change_orders").select("*").order("created_at", { ascending: false }),
    db.from("credit_notes").select("*").order("issued_at", { ascending: false }),
```

Change the summary query to `db.from("invoice_summary").select("id, amount_paid, tds_amount, credited, retention_held, amount_due, effective_status, last_payment_date")`, and return:

```ts
    feeStages: (feeStages.data ?? []).map(mapFeeStage),
    feeTemplates: (feeTemplates.data ?? []).map(mapFeeTemplate),
    changeOrders: (changeOrders.data ?? []).map(mapChangeOrder),
    creditNotes: (creditNotes.data ?? []).map(mapCreditNote),
```

- [ ] **Step 5: Verify and commit**

Run: `npm test && npm run typecheck` → Expected: PASS.

```bash
git add src/lib/data src/lib/supabase/database.types.ts
git commit -m "feat: load fee stages, change orders and receivables into the workspace"
```

---

## Task 8: Fee setup, stages and change orders in the UI

**Files:**
- Create: `src/app/actions/fees.ts`, `src/app/actions/change-orders.ts`, `src/components/projects/FeeSetupDialog.tsx`, `src/components/projects/FeesTab.tsx`, `src/components/projects/ChangeOrdersTab.tsx`, `src/components/approvals/ApprovalPanel.tsx`, `src/app/portal/[slug]/changes/page.tsx`
- Modify: `src/lib/actions/schemas.ts` (+ test), `src/lib/store.ts`, `src/app/(app)/projects/[id]/page.tsx`, `src/app/portal/[slug]/boq/page.tsx`, `src/components/portal/PortalShell.tsx`

**Interfaces:**
- Consumes: RPCs `apply_fee_template`, `complete_fee_stage`, `reopen_fee_stage`, `client_decide_change_order`.
- Produces:
  - schemas `feeTermsInput`, `feeStageUpdate`, `feeStageCreate`, `changeOrderInput`, `changeOrderUpdate`, `changeOrderDecision`
  - store actions: `setFeeTerms(projectId, terms)`, `applyFeeTemplate(projectId, templateId)`, `updateFeeStage(stageId, updates)`, `addFeeStage(stage)`, `deleteFeeStage(stageId)`, `completeFeeStage(stageId)`, `reopenFeeStage(stageId)`, `createChangeOrder(co)`, `updateChangeOrder(id, updates)`, `submitChangeOrder(id)`, `decideChangeOrder(id, approve, signer, note?)`, all `Promise<ActionResult>`
  - `<ApprovalPanel title amount? onApprove={(signer, note) => Promise<ActionResult>} onReject={(signer, reason) => Promise<ActionResult>} defaultSigner />`

- [ ] **Step 1: Schemas (test first)**

Append to `src/lib/actions/schemas.test.ts`:

```ts
import { changeOrderInput, feeStageUpdate, feeTermsInput } from "./schemas";

describe("phase 1 schemas", () => {
  it("requires rate and cost for percent-of-cost fees", () => {
    expect(feeTermsInput.safeParse({ id: P, fee_basis: "percent_of_cost", fee_rate: 8 }).success).toBe(false);
    expect(feeTermsInput.safeParse({ id: P, fee_basis: "percent_of_cost", fee_rate: 8, estimated_construction_cost: 1e7 }).success).toBe(true);
  });
  it("requires an amount for lump-sum fees", () => {
    expect(feeTermsInput.safeParse({ id: P, fee_basis: "lump_sum" }).success).toBe(false);
  });
  it("bounds stage percentages", () => {
    expect(feeStageUpdate.safeParse({ id: P, percent: 0 }).success).toBe(false);
    expect(feeStageUpdate.safeParse({ id: P, percent: 101 }).success).toBe(false);
  });
  it("rejects a fee on a design-error change order", () => {
    expect(changeOrderInput.safeParse({ project_id: P, title: "x", reason: "design_error", fee_impact: 10 }).success).toBe(false);
  });
});
```

Append to `src/lib/actions/schemas.ts`:

```ts
// Phase 1 ---------------------------------------------------------------------------
export const feeTermsInput = z
  .object({
    id,
    engagement_type: z.enum(["design_only", "design_and_execution"]).optional(),
    discipline: z.enum(["architecture", "interiors", "both"]).optional(),
    fee_basis: z.enum(["percent_of_cost", "lump_sum", "per_sqft", "hourly"]),
    fee_rate: money.optional().nullable(),
    fee_amount: money.optional().nullable(),
    estimated_construction_cost: money.optional().nullable(),
  })
  .refine((t) => t.fee_basis !== "percent_of_cost" || (t.fee_rate != null && t.estimated_construction_cost != null), {
    message: "Enter the fee % and estimated construction cost", path: ["fee_rate"],
  })
  .refine((t) => t.fee_basis !== "per_sqft" || t.fee_rate != null, { message: "Enter the rate per sqft", path: ["fee_rate"] })
  .refine((t) => t.fee_basis !== "lump_sum" || t.fee_amount != null, { message: "Enter the lump-sum fee", path: ["fee_amount"] })
  .refine((t) => t.fee_basis !== "hourly" || t.fee_rate != null, { message: "Enter the hourly rate", path: ["fee_rate"] });

const checklist = z.array(z.object({ label: text(200), done: z.boolean() })).max(20);
export const feeStageUpdate = z.object({
  id,
  name: text(120).optional(),
  percent: z.coerce.number().gt(0).max(100).optional(),
  percent_complete: z.coerce.number().int().min(0).max(100).optional(),
  status: z.enum(["not_started", "in_progress"]).optional(),
  planned_start: optDate,
  planned_end: optDate,
  checklist: checklist.optional(),
});
export const feeStageCreate = z.object({
  project_id: id,
  kind: z.enum(["design_fee", "execution"]),
  name: text(120),
  percent: z.coerce.number().gt(0).max(100),
  sort_order: z.coerce.number().int().default(99),
  checklist: checklist.default([]),
});
export const applyTemplateInput = z.object({ project_id: id, template_id: id });

export const changeOrderInput = z
  .object({
    project_id: id,
    title: text(150),
    description: optText(2000),
    reason: z.enum(["client_request", "site_condition", "regulatory", "design_error"]),
    fee_impact: money.default(0),
    cost_impact: z.coerce.number().finite().default(0),
    schedule_impact_days: z.coerce.number().int().min(-365).max(365).default(0),
  })
  .refine((c) => c.reason !== "design_error" || c.fee_impact === 0, { message: "A design error cannot be charged to the client", path: ["fee_impact"] });
export const changeOrderUpdate = z.object({
  id, title: text(150).optional(), description: optText(2000), fee_impact: money.optional(),
  cost_impact: z.coerce.number().finite().optional(), schedule_impact_days: z.coerce.number().int().optional(),
});
export const changeOrderDecision = z.object({
  id, approve: z.boolean(), signer: z.string().trim().max(120).default(""), note: z.string().trim().max(1000).optional().nullable(),
});
```

Run: `npm test` → PASS.

- [ ] **Step 2: Server actions**

`src/app/actions/fees.ts`:

```ts
"use server";
import { mutate } from "@/lib/actions/mutate";
import { applyTemplateInput, feeStageCreate, feeStageUpdate, feeTermsInput, idInput } from "@/lib/actions/schemas";

export async function setFeeTerms(input: unknown) {
  return mutate(feeTermsInput, input, ({ id, ...d }, db) => db.from("projects").update(d).eq("id", id).select("id").single());
}

export async function applyFeeTemplate(input: unknown) {
  return mutate(applyTemplateInput, input, (d, db) => db.rpc("apply_fee_template", { p_project: d.project_id, p_template: d.template_id }));
}

export async function addFeeStage(input: unknown) {
  return mutate(feeStageCreate, input, (d, db) => db.from("project_fee_stages").insert(d).select("id").single());
}

export async function updateFeeStage(input: unknown) {
  return mutate(feeStageUpdate, input, ({ id, ...d }, db) => db.from("project_fee_stages").update(d).eq("id", id).select("id").single());
}

export async function deleteFeeStage(input: unknown) {
  return mutate(idInput, input, ({ id }, db) => db.from("project_fee_stages").delete().eq("id", id).select("id").single());
}

export async function completeFeeStage(input: unknown) {
  return mutate(idInput, input, ({ id }, db) => db.rpc("complete_fee_stage", { p_stage: id }));
}

export async function reopenFeeStage(input: unknown) {
  return mutate(idInput, input, ({ id }, db) => db.rpc("reopen_fee_stage", { p_stage: id }));
}
```

`src/app/actions/change-orders.ts`:

```ts
"use server";
import { mutate } from "@/lib/actions/mutate";
import { changeOrderDecision, changeOrderInput, changeOrderUpdate, idInput } from "@/lib/actions/schemas";

export async function createChangeOrder(input: unknown) {
  // `number` is assigned by a trigger; the empty string satisfies the generated Insert type.
  return mutate(changeOrderInput, input, (d, db) => db.from("change_orders").insert({ ...d, number: "" }).select("id").single());
}

export async function updateChangeOrder(input: unknown) {
  return mutate(changeOrderUpdate, input, ({ id, ...d }, db) => db.from("change_orders").update(d).eq("id", id).select("id").single());
}

export async function submitChangeOrder(input: unknown) {
  return mutate(idInput, input, ({ id }, db) =>
    db.from("change_orders").update({ status: "submitted", submitted_at: new Date().toISOString() }).eq("id", id).select("id").single(),
  );
}

export async function decideChangeOrder(input: unknown) {
  return mutate(changeOrderDecision, input, (d, db) =>
    db.rpc("client_decide_change_order", { p_co: d.id, p_approve: d.approve, p_signer: d.signer, p_note: d.note ?? "" }),
  );
}
```

- [ ] **Step 3: Store**

Import `* as feeActions from "@/app/actions/fees"` and `* as coActions from "@/app/actions/change-orders"`, add to `AppActions`:

```ts
  setFeeTerms: (projectId: string, terms: Partial<Project>) => Promise<ActionResult>;
  applyFeeTemplate: (projectId: string, templateId: string) => Promise<ActionResult>;
  addFeeStage: (stage: Partial<FeeStage>) => Promise<ActionResult>;
  updateFeeStage: (stageId: string, updates: Partial<FeeStage>) => Promise<ActionResult>;
  deleteFeeStage: (stageId: string) => Promise<ActionResult>;
  completeFeeStage: (stageId: string) => Promise<ActionResult>;
  reopenFeeStage: (stageId: string) => Promise<ActionResult>;
  createChangeOrder: (co: Partial<ChangeOrder>) => Promise<ActionResult>;
  updateChangeOrder: (id: string, updates: Partial<ChangeOrder>) => Promise<ActionResult>;
  submitChangeOrder: (id: string) => Promise<ActionResult>;
  decideChangeOrder: (id: string, approve: boolean, signer: string, note?: string) => Promise<ActionResult>;
```

and implementations:

```ts
    setFeeTerms: (projectId, terms) => run(feeActions.setFeeTerms({ ...terms, id: projectId })),
    applyFeeTemplate: (projectId, templateId) => run(feeActions.applyFeeTemplate({ project_id: projectId, template_id: templateId })),
    addFeeStage: (stage) => run(feeActions.addFeeStage(stage)),
    updateFeeStage: (stageId, updates) => run(feeActions.updateFeeStage({ ...updates, id: stageId })),
    deleteFeeStage: (stageId) => run(feeActions.deleteFeeStage({ id: stageId })),
    completeFeeStage: (stageId) => run(feeActions.completeFeeStage({ id: stageId })),
    reopenFeeStage: (stageId) => run(feeActions.reopenFeeStage({ id: stageId })),
    createChangeOrder: (co) => run(coActions.createChangeOrder(co)),
    updateChangeOrder: (id, updates) => run(coActions.updateChangeOrder({ ...updates, id })),
    submitChangeOrder: (id) => run(coActions.submitChangeOrder({ id })),
    decideChangeOrder: (id, approve, signer, note) => run(coActions.decideChangeOrder({ id, approve, signer, note })),
```

- [ ] **Step 4: Shared approval panel**

`src/components/approvals/ApprovalPanel.tsx` (extract of the approve/reject UI currently inline in `src/app/portal/[slug]/boq/page.tsx`):

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/lib/actions/result";

export function ApprovalPanel({
  title, confirmText, defaultSigner, onApprove, onReject,
}: {
  title: string;
  confirmText: string;
  defaultSigner: string;
  onApprove: (signer: string, note: string) => Promise<ActionResult>;
  onReject: (signer: string, reason: string) => Promise<ActionResult>;
}) {
  const [signer, setSigner] = useState(defaultSigner);
  const [note, setNote] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const act = async (fn: () => Promise<ActionResult>) => { setBusy(true); await fn(); setBusy(false); };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1"><Label htmlFor="ap-signer">Your full name</Label><Input id="ap-signer" value={signer} onChange={(e) => setSigner(e.target.value)} /></div>
          <div className="space-y-1"><Label htmlFor="ap-note">Note (optional)</Label><Textarea id="ap-note" value={note} onChange={(e) => setNote(e.target.value)} /></div>
          <label className="flex items-start gap-2 text-xs">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5" />
            <span>{confirmText}</span>
          </label>
          <Button className="w-full" disabled={busy || !agreed || !signer.trim()} onClick={() => act(() => onApprove(signer, note))}>Approve</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Request changes</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1"><Label htmlFor="ap-reason">What should change?</Label><Textarea id="ap-reason" value={reason} onChange={(e) => setReason(e.target.value)} /></div>
          <Button variant="outline" className="w-full" disabled={busy || !reason.trim()} onClick={() => act(() => onReject(signer, reason))}>Send feedback</Button>
        </CardContent>
      </Card>
    </div>
  );
}
```

In `src/app/portal/[slug]/boq/page.tsx`, replace the inline approve/reject cards with:

```tsx
<ApprovalPanel
  title="Approve this estimate"
  confirmText="I confirm that I have reviewed the items, quantities and rates in this estimate and approve them for site execution."
  defaultSigner={client?.full_name ?? ""}
  onApprove={(signer, note) => approveBOQVersion(activeBOQ.id, signer, note)}
  onReject={(signer, reason) => rejectBOQVersion(activeBOQ.id, signer, reason)}
/>
```

and delete the now-unused `signerName`, `approvalNote`, `agreedTerms`, `rejectionReason` state and handlers.

- [ ] **Step 5: Fee setup dialog and Fees tab**

`src/components/projects/FeeSetupDialog.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { feeValue } from "@/lib/finance/fees";
import { useAppStore } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";
import { ENGAGEMENT_LABELS, FEE_BASIS_LABELS, type Discipline, type EngagementType, type FeeBasis, type Project } from "@/types";

const sel = "w-full h-9 rounded-md border border-input bg-background px-3 text-sm";

export function FeeSetupDialog({ project, open, onOpenChange }: { project: Project; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { setFeeTerms } = useAppStore();
  const [t, setT] = useState({
    engagement_type: project.engagement_type ?? "design_only",
    discipline: project.discipline ?? "architecture",
    fee_basis: project.fee_basis ?? "percent_of_cost",
    fee_rate: project.fee_rate?.toString() ?? "",
    fee_amount: project.fee_amount?.toString() ?? "",
    estimated_construction_cost: project.estimated_construction_cost?.toString() ?? "",
  });
  const num = (v: string) => (v === "" ? undefined : Number(v));
  const preview = feeValue({ fee_basis: t.fee_basis as FeeBasis, fee_rate: num(t.fee_rate), fee_amount: num(t.fee_amount),
    estimated_construction_cost: num(t.estimated_construction_cost), area_sqft: project.area_sqft });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const r = await setFeeTerms(project.id, {
      engagement_type: t.engagement_type as EngagementType, discipline: t.discipline as Discipline, fee_basis: t.fee_basis as FeeBasis,
      fee_rate: num(t.fee_rate), fee_amount: num(t.fee_amount), estimated_construction_cost: num(t.estimated_construction_cost),
    });
    if (r.ok) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Fee terms</DialogTitle></DialogHeader>
        <form onSubmit={save} className="space-y-3">
          <div className="space-y-1"><Label htmlFor="fs-eng">Engagement</Label>
            <select id="fs-eng" className={sel} value={t.engagement_type} onChange={(e) => setT({ ...t, engagement_type: e.target.value as EngagementType })}>
              {Object.entries(ENGAGEMENT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select></div>
          <div className="space-y-1"><Label htmlFor="fs-disc">Discipline</Label>
            <select id="fs-disc" className={sel} value={t.discipline} onChange={(e) => setT({ ...t, discipline: e.target.value as Discipline })}>
              <option value="architecture">Architecture</option><option value="interiors">Interiors</option><option value="both">Architecture + interiors</option>
            </select></div>
          <div className="space-y-1"><Label htmlFor="fs-basis">Fee basis</Label>
            <select id="fs-basis" className={sel} value={t.fee_basis} onChange={(e) => setT({ ...t, fee_basis: e.target.value as FeeBasis })}>
              {Object.entries(FEE_BASIS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select></div>
          {t.fee_basis !== "lump_sum" && (
            <div className="space-y-1"><Label htmlFor="fs-rate">{t.fee_basis === "percent_of_cost" ? "Fee %" : t.fee_basis === "per_sqft" ? "₹ per sqft" : "₹ per hour"}</Label>
              <Input id="fs-rate" type="number" min="0" step="0.01" value={t.fee_rate} onChange={(e) => setT({ ...t, fee_rate: e.target.value })} /></div>
          )}
          {t.fee_basis === "percent_of_cost" && (
            <div className="space-y-1"><Label htmlFor="fs-cost">Estimated construction cost (₹)</Label>
              <Input id="fs-cost" type="number" min="0" value={t.estimated_construction_cost} onChange={(e) => setT({ ...t, estimated_construction_cost: e.target.value })} /></div>
          )}
          {t.fee_basis === "lump_sum" && (
            <div className="space-y-1"><Label htmlFor="fs-amt">Lump-sum fee (₹)</Label>
              <Input id="fs-amt" type="number" min="0" value={t.fee_amount} onChange={(e) => setT({ ...t, fee_amount: e.target.value })} /></div>
          )}
          <p className="text-sm">Design fee: <strong>{preview == null ? (t.fee_basis === "hourly" ? "billed from timesheets" : "—") : formatCurrency(preview)}</strong></p>
          {t.engagement_type === "design_and_execution" && (
            <p className="text-xs text-muted-foreground">Bill the design fee through fee stages and keep the BOQ designer fee at ₹0, otherwise the fee is charged twice.</p>
          )}
          <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit">Save</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

`src/components/projects/FeesTab.tsx`:

```tsx
"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NotEnoughData } from "@/components/metrics/NotEnoughData";
import { checklistDone, feeValue, percentTotal } from "@/lib/finance/fees";
import { hasAnyRole } from "@/lib/permissions";
import { useAppStore } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";
import { ENGAGEMENT_LABELS, FEE_BASIS_LABELS, type FeeStage, type FeeStageKind, type Project } from "@/types";
import { FeeSetupDialog } from "./FeeSetupDialog";

export default function FeesTab({ project }: { project: Project }) {
  const { me, feeStages, feeTemplates, applyFeeTemplate, updateFeeStage, completeFeeStage, reopenFeeStage } = useAppStore();
  const [setupOpen, setSetupOpen] = useState(false);
  const stages = feeStages.filter((s) => s.project_id === project.id);
  const canEditTerms = hasAnyRole(me, ["owner", "director"]);
  const kinds: FeeStageKind[] = project.engagement_type === "design_and_execution" ? ["design_fee", "execution"] : ["design_fee"];
  const fee = feeValue(project);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-sm">Fee terms</CardTitle>
          {canEditTerms && <Button size="sm" variant="outline" onClick={() => setSetupOpen(true)}>Edit</Button>}
        </CardHeader>
        <CardContent className="text-sm space-y-1">
          {project.fee_basis ? (
            <>
              <p>{project.engagement_type ? ENGAGEMENT_LABELS[project.engagement_type] : "Engagement not set"} · {FEE_BASIS_LABELS[project.fee_basis]}</p>
              <p>Design fee: <strong>{fee == null ? "—" : formatCurrency(fee)}</strong></p>
            </>
          ) : (
            <NotEnoughData hint={canEditTerms ? "Set the fee terms to start stage billing." : "Ask a director to set the fee terms."} />
          )}
        </CardContent>
      </Card>

      {kinds.map((kind) => {
        const list = stages.filter((s) => s.kind === kind).sort((a, b) => a.sort_order - b.sort_order);
        const total = percentTotal(list);
        const templates = feeTemplates.filter((t) => t.kind === kind);
        return (
          <Card key={kind}>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-sm">{kind === "design_fee" ? "Design fee stages" : "Execution billing schedule"}</CardTitle>
              {list.length > 0 && <Badge variant={total === 100 ? "secondary" : "destructive"}>{total}% of 100%</Badge>}
            </CardHeader>
            <CardContent className="space-y-3">
              {list.length === 0 && (
                <div className="flex flex-wrap gap-2">
                  {templates.map((t) => (
                    <Button key={t.id} size="sm" variant="outline" onClick={() => applyFeeTemplate(project.id, t.id)}>Use “{t.name}”</Button>
                  ))}
                </div>
              )}
              {list.map((s) => (
                <StageRow key={s.id} stage={s}
                  onUpdate={(u) => updateFeeStage(s.id, u)} onComplete={() => completeFeeStage(s.id)} onReopen={() => reopenFeeStage(s.id)} />
              ))}
            </CardContent>
          </Card>
        );
      })}
      <FeeSetupDialog project={project} open={setupOpen} onOpenChange={setSetupOpen} />
    </div>
  );
}

function StageRow({ stage, onUpdate, onComplete, onReopen }: {
  stage: FeeStage; onUpdate: (u: Partial<FeeStage>) => void; onComplete: () => void; onReopen: () => void;
}) {
  const done = stage.status === "complete";
  return (
    <div className="rounded-lg border p-3 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {done && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
          <span className="font-medium text-sm">{stage.name}</span>
          <span className="text-xs text-muted-foreground">{stage.percent}% · {formatCurrency(stage.amount)}</span>
        </div>
        <span className="text-xs text-muted-foreground">Earned {formatCurrency(stage.earned)} · Invoiced {formatCurrency(stage.invoiced)}</span>
      </div>
      {!done && (
        <>
          <div className="flex items-center gap-2 text-xs">
            <label htmlFor={`pc-${stage.id}`}>Complete</label>
            <Input id={`pc-${stage.id}`} type="number" min="0" max="100" className="w-20 h-8" defaultValue={stage.percent_complete}
              onBlur={(e) => onUpdate({ percent_complete: Number(e.target.value), status: Number(e.target.value) > 0 ? "in_progress" : "not_started" })} />
            <span>%</span>
          </div>
          <ul className="space-y-1">
            {stage.checklist.map((c, i) => (
              <li key={i}>
                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" checked={c.done}
                    onChange={(e) => onUpdate({ checklist: stage.checklist.map((x, j) => (j === i ? { ...x, done: e.target.checked } : x)) })} />
                  {c.label}
                </label>
              </li>
            ))}
          </ul>
          <Button size="sm" disabled={!checklistDone(stage.checklist)} onClick={onComplete}>Mark stage complete</Button>
        </>
      )}
      {done && stage.invoiced === 0 && <Button size="sm" variant="ghost" onClick={onReopen}>Reopen</Button>}
    </div>
  );
}
```

`src/components/projects/ChangeOrdersTab.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAppStore } from "@/lib/store";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CHANGE_ORDER_REASON_LABELS, type ChangeOrderReason, type Project } from "@/types";

const EMPTY = { title: "", description: "", reason: "client_request" as ChangeOrderReason, fee_impact: "0", schedule_impact_days: "0" };

export default function ChangeOrdersTab({ project }: { project: Project }) {
  const { changeOrders, createChangeOrder, submitChangeOrder } = useAppStore();
  const list = changeOrders.filter((c) => c.project_id === project.id);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(EMPTY);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const r = await createChangeOrder({
      project_id: project.id, title: f.title, description: f.description, reason: f.reason,
      fee_impact: f.reason === "design_error" ? 0 : Number(f.fee_impact), schedule_impact_days: Number(f.schedule_impact_days),
    });
    if (r.ok) { setF(EMPTY); setOpen(false); }
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end"><Button size="sm" onClick={() => setOpen(true)}>New change order</Button></div>
      {list.length === 0 && <p className="text-sm text-muted-foreground">No change orders. Record every scope change here so it can be approved and billed.</p>}
      {list.map((c) => (
        <Card key={c.id}>
          <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-sm">{c.number} · {c.title}</p>
              <p className="text-xs text-muted-foreground">{CHANGE_ORDER_REASON_LABELS[c.reason]} · {formatDate(c.created_at)}
                {c.schedule_impact_days ? ` · ${c.schedule_impact_days} days` : ""}</p>
              {c.decision_note && <p className="text-xs mt-1">“{c.decision_note}” {c.decided_by ? `— ${c.decided_by}` : ""}</p>}
            </div>
            <div className="flex items-center gap-3">
              <span className="font-semibold text-sm">{formatCurrency(c.fee_impact)}</span>
              <Badge variant="outline" className="capitalize">{c.status}</Badge>
              {c.status === "draft" && <Button size="sm" variant="outline" onClick={() => submitChangeOrder(c.id)}>Send to client</Button>}
            </div>
          </CardContent>
        </Card>
      ))}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New change order</DialogTitle></DialogHeader>
          <form onSubmit={save} className="space-y-3">
            <div className="space-y-1"><Label htmlFor="co-title">Title *</Label><Input id="co-title" required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
            <div className="space-y-1"><Label htmlFor="co-desc">Description</Label><Textarea id="co-desc" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
            <div className="space-y-1"><Label htmlFor="co-reason">Reason</Label>
              <select id="co-reason" className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" value={f.reason}
                onChange={(e) => setF({ ...f, reason: e.target.value as ChangeOrderReason })}>
                {Object.entries(CHANGE_ORDER_REASON_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select></div>
            {f.reason !== "design_error" && (
              <div className="space-y-1"><Label htmlFor="co-fee">Additional fee (₹, before GST)</Label><Input id="co-fee" type="number" min="0" value={f.fee_impact} onChange={(e) => setF({ ...f, fee_impact: e.target.value })} /></div>
            )}
            <div className="space-y-1"><Label htmlFor="co-days">Schedule impact (days)</Label><Input id="co-days" type="number" value={f.schedule_impact_days} onChange={(e) => setF({ ...f, schedule_impact_days: e.target.value })} /></div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit">Save draft</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

In `src/app/(app)/projects/[id]/page.tsx`, add two tabs after "Overview": `<TabsTrigger value="fees">Fees & Stages</TabsTrigger>` / `<TabsContent value="fees" className="mt-4"><FeesTab project={project} /></TabsContent>` and `<TabsTrigger value="changes">Change Orders</TabsTrigger>` / `<TabsContent value="changes" className="mt-4"><ChangeOrdersTab project={project} /></TabsContent>`. In `ProjectHeader`, show "Set up fees" as an amber badge linking to the Fees tab when `!project.fee_basis`.

`src/app/portal/[slug]/changes/page.tsx`:

```tsx
"use client";

import { use, Suspense } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ApprovalPanel } from "@/components/approvals/ApprovalPanel";
import { useAppStore } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";

export default function PortalChangesPage({ params }: { params: Promise<{ slug: string }> }) {
  return <Suspense><Content params={params} /></Suspense>;
}

function Content({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { projects, changeOrders, me, decideChangeOrder } = useAppStore();
  const project = projects.find((p) => p.portal_slug === slug);
  if (!project) return null;
  const list = changeOrders.filter((c) => c.project_id === project.id);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Change orders</h1>
      {list.length === 0 && <p className="text-sm text-muted-foreground">No change orders on this project.</p>}
      {list.map((c) => (
        <div key={c.id} className="space-y-3">
          <Card><CardContent className="p-4">
            <p className="font-semibold">{c.number} · {c.title}</p>
            {c.description && <p className="text-sm text-muted-foreground mt-1">{c.description}</p>}
            <p className="text-sm mt-2">Additional fee: <strong>{formatCurrency(c.fee_impact)}</strong> + GST
              {c.schedule_impact_days ? ` · Adds ${c.schedule_impact_days} days to the schedule` : ""}</p>
            <p className="text-xs text-muted-foreground mt-1 capitalize">Status: {c.status}</p>
          </CardContent></Card>
          {c.status === "submitted" && me.kind === "client" && (
            <ApprovalPanel title={`Approve ${c.number}`} defaultSigner={me.full_name}
              confirmText="I approve this change in scope, fee and schedule."
              onApprove={(signer, note) => decideChangeOrder(c.id, true, signer, note)}
              onReject={(signer, reason) => decideChangeOrder(c.id, false, signer, reason)} />
          )}
        </div>
      ))}
    </div>
  );
}
```

In `PortalShell.tsx`, add a nav item `{ href: \`/portal/${slug}/changes\`, label: "Change Orders", icon: FileText }` after "BOQ & Estimates".

- [ ] **Step 6: Verify**

Run: `npm run typecheck && npm test && npm run lint` → PASS.

Manual: as Vikram (director) open TechCorp HQ → Fees: terms show 6% of ₹1.5 Cr = ₹9,00,000; apply "Architecture (standard)"; tick Concept's checklist; "Mark stage complete" → a draft invoice of ₹90,000 appears in project Finance as "Draft", and Meera gets a notification. As Ananya on Sharma Residence create CO "Add study room design" ₹45,000, send to client; as Arun approve it in the portal → Ananya sees "CO-01 approved"; a ₹45,000 draft invoice exists. As Ananya, the Fee terms "Edit" button is absent.

- [ ] **Step 7: Commit**

```bash
git add src
git commit -m "feat: fee setup, stage tracking and client-approved change orders"
```

---

## Task 9: Alerts engine

**Files:**
- Create: `supabase/migrations/20261101000500_alerts.sql`, `supabase/tests/08_alerts.test.sql`

**Interfaces:**
- Produces: table `alerts(id, kind, dedupe_key unique, recipient_id, recipient_email, project_id, invoice_id, title, body, link, created_at, acknowledged_at, acknowledged_by, email_status ('none'|'pending'|'sent'|'skipped'|'failed'), email_error)`; function `generate_alerts(p_today date default current_date) → int` (alerts created); RPC `acknowledge_alert(p_alert uuid) → void`; cron job `generate-alerts` at 02:30 UTC (08:00 IST) daily.

- [ ] **Step 1: Write the failing tests**

`supabase/tests/08_alerts.test.sql`:

```sql
begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

create function pg_temp.act_as(uid uuid) returns void language plpgsql as $$
begin perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true); end $$;

-- I2 (TechCorp) is 20 days overdue in the seed -> 7-day client reminder (no email on file for C2? seeded: rohit@client.test)
select ok(generate_alerts(current_date) > 0, 'alerts generated');
select is((select count(*)::int from alerts where kind = 'invoice_overdue_7' and invoice_id = 'e1000000-0000-4000-8000-000000000002'), 1, '7-day reminder for I2');
select is((select email_status from alerts where kind = 'invoice_overdue_7' and invoice_id = 'e1000000-0000-4000-8000-000000000002'), 'pending', 'client reminder queued for email');
select is((select recipient_email from alerts where kind = 'invoice_overdue_7' and invoice_id = 'e1000000-0000-4000-8000-000000000002'), 'rohit@client.test', 'sent to client email');

-- alerts_idempotent
select is(generate_alerts(current_date), 0, 'second run creates nothing');

-- 30-day escalation to the project director (Priya directs P2)
select ok(generate_alerts(current_date + 11) > 0, 'later run escalates');
select is((select recipient_id from alerts where kind = 'invoice_overdue_30' and invoice_id = 'e1000000-0000-4000-8000-000000000002'),
  '00000000-0000-4000-8000-000000000001'::uuid, '30-day overdue goes to director');

-- unbilled stage: a draft stage invoice older than 3 days -> finance
insert into invoices (project_id, status, subtotal, gst_rate, fee_stage_id, created_at)
select 'a1000000-0000-4000-8000-000000000001', 'draft', 1000, 18, id, now() - interval '4 days'
from project_fee_stages where project_id = 'a1000000-0000-4000-8000-000000000001' and name = 'Concept & Moodboard';
select ok(generate_alerts(current_date) > 0, 'unbilled draft produces an alert');
select is((select recipient_id from alerts where kind = 'unbilled_stage' limit 1), '00000000-0000-4000-8000-000000000006'::uuid, 'unbilled stage alerts finance');

-- acknowledge: only the recipient
select pg_temp.act_as('00000000-0000-4000-8000-000000000006');
set local role authenticated;
select lives_ok($$ select acknowledge_alert((select id from alerts where kind = 'unbilled_stage' limit 1)) $$, 'recipient acknowledges');
reset role;

select * from finish();
rollback;
```

Run: `npm run test:db` → Expected: FAIL (`function generate_alerts does not exist`).

- [ ] **Step 2: Migration**

`supabase/migrations/20261101000500_alerts.sql`:

```sql
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  dedupe_key text not null unique,
  recipient_id uuid references public.profiles(id) on delete cascade,
  recipient_email text,
  project_id uuid references public.projects(id) on delete cascade,
  invoice_id uuid references public.invoices(id) on delete cascade,
  title text not null,
  body text not null,
  link text,
  created_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  acknowledged_by uuid references public.profiles(id),
  email_status text not null default 'none' check (email_status in ('none', 'pending', 'sent', 'skipped', 'failed')),
  email_error text,
  check (recipient_id is not null or recipient_email is not null)
);
create index on public.alerts (recipient_id) where acknowledged_at is null;
create index on public.alerts (email_status) where email_status = 'pending';
alter table public.alerts enable row level security;
create policy alerts_read on alerts for select to authenticated using (recipient_id = auth.uid() or has_role('owner'));

create function public.acknowledge_alert(p_alert uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update alerts set acknowledged_at = now(), acknowledged_by = auth.uid()
   where id = p_alert and recipient_id = auth.uid() and acknowledged_at is null;
  if not found then raise exception 'Not allowed'; end if;
end $$;

-- Rules from spec 5.4. Idempotent: each alert has a dedupe key; re-running inserts nothing new.
create function public.generate_alerts(p_today date default current_date) returns int
language plpgsql security definer set search_path = public as $$
declare v_count int := 0; v_n int; v_reminders boolean;
begin
  select coalesce((alert_preferences->>'payment_reminders')::boolean, true) into v_reminders from firm_settings;

  -- 1. Draft stage/CO invoice unsent for 3+ days -> finance; 7+ days -> owner
  insert into alerts (kind, dedupe_key, recipient_id, project_id, invoice_id, title, body, link)
  select 'unbilled_stage', 'unbilled_stage:' || i.id || ':' || r.user_id, r.user_id, i.project_id, i.id,
         'Invoice not sent: ' || p.name, coalesce(i.notes, 'Draft invoice') || ' has waited ' || (p_today - i.created_at::date) || ' days.', '/finance'
  from invoices i join projects p on p.id = i.project_id
  join user_roles r on r.role = 'finance'
  where i.status = 'draft' and (i.fee_stage_id is not null or i.change_order_id is not null) and i.created_at::date <= p_today - 3
  on conflict (dedupe_key) do nothing;
  get diagnostics v_n = row_count; v_count := v_count + v_n;

  insert into alerts (kind, dedupe_key, recipient_id, project_id, invoice_id, title, body, link)
  select 'unbilled_stage_escalation', 'unbilled_stage_escalation:' || i.id || ':' || r.user_id, r.user_id, i.project_id, i.id,
         'Escalation: invoice unsent 7+ days on ' || p.name, coalesce(i.notes, 'Draft invoice'), '/finance'
  from invoices i join projects p on p.id = i.project_id
  join user_roles r on r.role = 'owner'
  where i.status = 'draft' and (i.fee_stage_id is not null or i.change_order_id is not null) and i.created_at::date <= p_today - 7
  on conflict (dedupe_key) do nothing;
  get diagnostics v_n = row_count; v_count := v_count + v_n;

  -- 2. Client reminders: due in 3 days, overdue 7 days (email to client)
  if v_reminders then
    insert into alerts (kind, dedupe_key, recipient_email, project_id, invoice_id, title, body, email_status)
    select k.kind, k.kind || ':' || i.id, c.email, i.project_id, i.id,
           case k.kind when 'invoice_due_soon' then 'Payment reminder: ' || i.invoice_number || ' due on ' || to_char(i.due_date, 'DD Mon YYYY')
                       else 'Overdue: ' || i.invoice_number || ' was due on ' || to_char(i.due_date, 'DD Mon YYYY') end,
           'Amount due: ₹' || to_char(s.amount_due, 'FM99,99,99,990.00') || '. Payment details are on your project portal.',
           'pending'
    from invoices i
    join invoice_summary s on s.id = i.id
    join projects p on p.id = i.project_id
    join clients c on c.id = p.client_id
    cross join lateral (values
      ('invoice_due_soon', i.due_date - 3),
      ('invoice_overdue_7', i.due_date + 7)) as k(kind, fire_on)
    where i.status = 'sent' and s.amount_due > 0 and c.email is not null and k.fire_on <= p_today
      and (k.kind <> 'invoice_due_soon' or i.due_date >= p_today)
    on conflict (dedupe_key) do nothing;
    get diagnostics v_n = row_count; v_count := v_count + v_n;
  end if;

  -- 3. Escalations: 30 days -> project director (owner if none); 45 days -> owners
  insert into alerts (kind, dedupe_key, recipient_id, project_id, invoice_id, title, body, link)
  select 'invoice_overdue_30', 'invoice_overdue_30:' || i.id, coalesce(p.director_id, (select user_id from user_roles where role = 'owner' limit 1)),
         i.project_id, i.id, i.invoice_number || ' is 30+ days overdue (' || p.name || ')',
         '₹' || to_char(s.amount_due, 'FM99,99,99,990.00') || ' outstanding. Call the client.', '/finance'
  from invoices i join invoice_summary s on s.id = i.id join projects p on p.id = i.project_id
  where i.status = 'sent' and s.amount_due > 0 and i.due_date + 30 <= p_today
  on conflict (dedupe_key) do nothing;
  get diagnostics v_n = row_count; v_count := v_count + v_n;

  insert into alerts (kind, dedupe_key, recipient_id, project_id, invoice_id, title, body, link)
  select 'invoice_overdue_45', 'invoice_overdue_45:' || i.id || ':' || r.user_id, r.user_id, i.project_id, i.id,
         i.invoice_number || ' is 45+ days overdue (' || p.name || ')',
         '₹' || to_char(s.amount_due, 'FM99,99,99,990.00') || ' outstanding.', '/finance'
  from invoices i join invoice_summary s on s.id = i.id join projects p on p.id = i.project_id
  join user_roles r on r.role = 'owner'
  where i.status = 'sent' and s.amount_due > 0 and i.due_date + 45 <= p_today
  on conflict (dedupe_key) do nothing;
  get diagnostics v_n = row_count; v_count := v_count + v_n;

  -- Staff alerts also appear in the notification bell.
  insert into notifications (user_id, type, title, body, link)
  select a.recipient_id, 'alert', a.title, a.body, a.link from alerts a
  where a.recipient_id is not null and a.created_at > now() - interval '1 minute'
    and not exists (select 1 from notifications n where n.user_id = a.recipient_id and n.type = 'alert' and n.title = a.title);

  return v_count;
end $$;

select cron.schedule('generate-alerts', '30 2 * * *', $$select public.generate_alerts()$$);
```

- [ ] **Step 3: Run and commit**

Run: `npm run db:reset && npm run test:db` → Expected: all `ok`.

```bash
git add supabase
git commit -m "feat(db): idempotent alerts engine with daily schedule"
```

---

## Task 10: Email delivery worker

**Files:**
- Create: `supabase/functions/deliver-alerts/index.ts`, `supabase/migrations/20261101000600_alerts_delivery_cron.sql`
- Modify: `.env.example`

**Interfaces:**
- Consumes: `alerts` rows with `email_status = 'pending'`.
- Produces: Edge Function `deliver-alerts` (POST, service-role bearer required) that sends up to 50 pending emails per call via Resend and marks each `sent`, `failed` (with `email_error`) or `skipped` (no API key configured); cron job `deliver-alerts` every 15 minutes.

- [ ] **Step 1: Function**

`supabase/functions/deliver-alerts/index.ts`:

```ts
// Sends queued alert emails. Invoked by pg_cron every 15 minutes.
import { createClient } from "jsr:@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM = Deno.env.get("ALERTS_FROM_EMAIL") ?? "Studio <alerts@example.com>";

Deno.serve(async (req) => {
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  if (req.headers.get("Authorization") !== `Bearer ${serviceKey}`) return new Response("Unauthorized", { status: 401 });

  const db = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey);
  const { data: queue, error } = await db.from("alerts")
    .select("id, recipient_email, title, body").eq("email_status", "pending").order("created_at").limit(50);
  if (error) return new Response(error.message, { status: 500 });

  let sent = 0;
  for (const a of queue ?? []) {
    if (!RESEND_API_KEY) {
      await db.from("alerts").update({ email_status: "skipped", email_error: "RESEND_API_KEY not set" }).eq("id", a.id);
      continue;
    }
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: [a.recipient_email], subject: a.title, text: a.body }),
    });
    if (res.ok) {
      sent++;
      await db.from("alerts").update({ email_status: "sent" }).eq("id", a.id);
    } else {
      await db.from("alerts").update({ email_status: "failed", email_error: (await res.text()).slice(0, 500) }).eq("id", a.id);
    }
  }
  return Response.json({ processed: queue?.length ?? 0, sent });
});
```

- [ ] **Step 2: Schedule**

`supabase/migrations/20261101000600_alerts_delivery_cron.sql`:

```sql
-- Needs two Vault secrets per environment (run once in the SQL editor, not in a migration):
--   select vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
--   select vault.create_secret('<service-role-key>', 'service_role_key');
select cron.schedule('deliver-alerts', '*/15 * * * *', $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/deliver-alerts',
    headers := jsonb_build_object('Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key'),
                                  'Content-Type', 'application/json'),
    body := '{}'::jsonb)
$$);
```

Add to `.env.example`:

```
# Edge function secrets (set with: npx supabase secrets set KEY=value)
RESEND_API_KEY=
ALERTS_FROM_EMAIL="Priya Designs Studio <accounts@yourdomain.in>"
```

- [ ] **Step 3: Verify locally**

Run: `npm run db:reset`, then `npx supabase functions serve deliver-alerts` in one terminal and in another:
`psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -c "select generate_alerts()"`
`curl -X POST http://127.0.0.1:54321/functions/v1/deliver-alerts -H "Authorization: Bearer <service_role key>"`
Expected: JSON `{"processed":N,"sent":0}` and those alerts now `skipped` (no key locally). With a Resend test key set via `npx supabase secrets set RESEND_API_KEY=...` (or `--env-file`), status becomes `sent`.

- [ ] **Step 4: Commit**

```bash
git add supabase .env.example
git commit -m "feat: email delivery worker for client reminders and alerts"
```

---

## Task 11: Receivables metrics

**Files:**
- Create: `src/lib/metrics/receivables.ts`, `src/lib/metrics/receivables.test.ts`

**Interfaces:**
- Produces (pure):
  - `ageing(invoices: Invoice[], today: string): AgeingRow[]` with `AgeingRow = { client_name: string; notDue: number; d0_30: number; d31_60: number; d61_90: number; d90plus: number; total: number }` (sorted by `total` desc; a final row `client_name: "Total"`)
  - `dso(invoices: Invoice[], today: string, windowDays = 90): number | null`
  - `clientPaymentBehaviour(invoices: Invoice[]): { client_name: string; paidInvoices: number; avgDaysToPay: number; avgDaysLate: number }[]`
  - `billingLagDays(stages: FeeStage[], invoices: Invoice[]): number | null`
  - `unbilledWip(stages: FeeStage[]): number`

- [ ] **Step 1: Write the failing tests**

`src/lib/metrics/receivables.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { ageing, billingLagDays, clientPaymentBehaviour, dso, unbilledWip } from "./receivables";
import type { FeeStage, Invoice } from "@/types";

const TODAY = "2026-10-09";
const inv = (o: Partial<Invoice>): Invoice => ({
  id: "i", project_id: "p", project_name: "", client_name: "A", status: "sent", subtotal: 0, discount: 0, gst_rate: 18,
  gst_amount: 0, total_amount: 0, amount_paid: 0, amount_due: 0, tds_amount: 0, credited: 0, retention_amount: 0, retention_held: 0, ...o,
});
const st = (o: Partial<FeeStage>): FeeStage => ({
  id: "s", project_id: "p", kind: "design_fee", name: "", percent: 10, sort_order: 0, status: "complete", percent_complete: 100,
  checklist: [], amount: 0, earned: 0, invoiced: 0, ...o,
});

describe("ageing", () => {
  it("buckets by days past due and totals per client", () => {
    const rows = ageing([
      inv({ client_name: "A", due_date: "2026-10-20", amount_due: 100 }),           // not due
      inv({ client_name: "A", due_date: "2026-10-01", amount_due: 200, status: "overdue" }),  // 8 days
      inv({ client_name: "B", due_date: "2026-07-01", amount_due: 300, status: "overdue" }),  // 100 days
      inv({ client_name: "B", due_date: "2026-08-25", amount_due: 50, status: "overdue" }),   // 45 days
      inv({ client_name: "C", status: "paid", due_date: "2026-01-01", amount_due: 0 }),
      inv({ client_name: "D", status: "draft", amount_due: 999 }),
    ], TODAY);
    expect(rows[0]).toMatchObject({ client_name: "B", d31_60: 50, d90plus: 300, total: 350 });
    expect(rows[1]).toMatchObject({ client_name: "A", notDue: 100, d0_30: 200, total: 300 });
    expect(rows.at(-1)).toMatchObject({ client_name: "Total", total: 650 });
    expect(rows.find((r) => r.client_name === "C")).toBeUndefined();
  });
});

describe("dso", () => {
  it("is outstanding over recent sales times days", () => {
    expect(dso([inv({ issue_date: "2026-09-01", total_amount: 900, amount_due: 300 })], TODAY)).toBe(30);
  });
  it("is null without recent sales", () => {
    expect(dso([inv({ issue_date: "2025-01-01", total_amount: 900, amount_due: 300 })], TODAY)).toBeNull();
  });
});

describe("clientPaymentBehaviour", () => {
  it("averages days to pay and days late for fully paid invoices", () => {
    const [b] = clientPaymentBehaviour([
      inv({ client_name: "A", status: "paid", issue_date: "2026-09-01", due_date: "2026-09-15", last_payment_date: "2026-09-21" }),
      inv({ client_name: "A", status: "paid", issue_date: "2026-08-01", due_date: "2026-08-15", last_payment_date: "2026-08-11" }),
      inv({ client_name: "A", status: "partial", issue_date: "2026-08-01", due_date: "2026-08-15", last_payment_date: "2026-08-30" }),
    ]);
    expect(b).toEqual({ client_name: "A", paidInvoices: 2, avgDaysToPay: 15, avgDaysLate: 1 });
  });
});

describe("billing lag and unbilled WIP", () => {
  it("measures stage completion to invoice issue", () => {
    expect(billingLagDays([st({ id: "s1", completed_at: "2026-10-01T10:00:00Z" })],
      [inv({ fee_stage_id: "s1", issue_date: "2026-10-04" })])).toBe(3);
    expect(billingLagDays([], [])).toBeNull();
  });
  it("sums earned but not invoiced", () => {
    expect(unbilledWip([st({ earned: 1000, invoiced: 400 }), st({ earned: 200, invoiced: 300 })])).toBe(600);
  });
});
```

Run: `npm test` → Expected: FAIL.

- [ ] **Step 2: Implement**

`src/lib/metrics/receivables.ts`:

```ts
import { round2 } from "@/lib/finance/money";
import type { FeeStage, Invoice } from "@/types";

const DAY = 86_400_000;
const days = (from: string, to: string) => Math.round((Date.parse(to.slice(0, 10)) - Date.parse(from.slice(0, 10))) / DAY);
const isOpen = (i: Invoice) => (i.status === "sent" || i.status === "partial" || i.status === "overdue") && i.amount_due > 0;

export interface AgeingRow { client_name: string; notDue: number; d0_30: number; d31_60: number; d61_90: number; d90plus: number; total: number }

export function ageing(invoices: Invoice[], today: string): AgeingRow[] {
  const by = new Map<string, AgeingRow>();
  for (const i of invoices.filter(isOpen)) {
    const row = by.get(i.client_name) ?? { client_name: i.client_name, notDue: 0, d0_30: 0, d31_60: 0, d61_90: 0, d90plus: 0, total: 0 };
    const late = i.due_date ? days(i.due_date, today) : 0;
    const key = late <= 0 ? "notDue" : late <= 30 ? "d0_30" : late <= 60 ? "d31_60" : late <= 90 ? "d61_90" : "d90plus";
    row[key] = round2(row[key] + i.amount_due);
    row.total = round2(row.total + i.amount_due);
    by.set(i.client_name, row);
  }
  const rows = [...by.values()].sort((a, b) => b.total - a.total);
  const total = rows.reduce<AgeingRow>((t, r) => ({
    client_name: "Total", notDue: round2(t.notDue + r.notDue), d0_30: round2(t.d0_30 + r.d0_30), d31_60: round2(t.d31_60 + r.d31_60),
    d61_90: round2(t.d61_90 + r.d61_90), d90plus: round2(t.d90plus + r.d90plus), total: round2(t.total + r.total),
  }), { client_name: "Total", notDue: 0, d0_30: 0, d31_60: 0, d61_90: 0, d90plus: 0, total: 0 });
  return rows.length ? [...rows, total] : [];
}

// DSO = outstanding ÷ invoiced in the window × window days.
export function dso(invoices: Invoice[], today: string, windowDays = 90): number | null {
  const sent = invoices.filter((i) => i.status !== "draft" && i.status !== "cancelled");
  const sales = sent.filter((i) => i.issue_date && days(i.issue_date, today) <= windowDays).reduce((s, i) => s + i.total_amount, 0);
  if (sales <= 0) return null;
  const outstanding = sent.reduce((s, i) => s + i.amount_due, 0);
  return Math.round((outstanding / sales) * windowDays);
}

export function clientPaymentBehaviour(invoices: Invoice[]) {
  const by = new Map<string, { toPay: number[]; late: number[] }>();
  for (const i of invoices) {
    if (i.status !== "paid" || !i.issue_date || !i.due_date || !i.last_payment_date) continue;
    const b = by.get(i.client_name) ?? { toPay: [], late: [] };
    b.toPay.push(days(i.issue_date, i.last_payment_date));
    b.late.push(Math.max(0, days(i.due_date, i.last_payment_date)));
    by.set(i.client_name, b);
  }
  const mean = (xs: number[]) => Math.round(xs.reduce((a, b) => a + b, 0) / xs.length);
  return [...by.entries()].map(([client_name, b]) => ({
    client_name, paidInvoices: b.toPay.length, avgDaysToPay: mean(b.toPay), avgDaysLate: mean(b.late),
  })).sort((a, b) => b.avgDaysLate - a.avgDaysLate);
}

export function billingLagDays(stages: FeeStage[], invoices: Invoice[]): number | null {
  const lags = stages.flatMap((s) => {
    const issued = invoices.find((i) => i.fee_stage_id === s.id && i.issue_date);
    return s.completed_at && issued?.issue_date ? [days(s.completed_at, issued.issue_date)] : [];
  });
  return lags.length ? Math.round((lags.reduce((a, b) => a + b, 0) / lags.length) * 10) / 10 : null;
}

export const unbilledWip = (stages: FeeStage[]) => round2(stages.reduce((s, x) => s + Math.max(0, x.earned - x.invoiced), 0));
```

Run: `npm test` → Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/metrics/receivables.ts src/lib/metrics/receivables.test.ts
git commit -m "feat: receivables metrics (ageing, DSO, payment behaviour, billing lag, unbilled WIP)"
```

---

## Task 12: Finance workspace, credit notes, TDS payments and action items

**Files:**
- Create: `supabase/migrations/20261101000700_invoice_delete.sql`, `src/app/actions/receivables.ts`, `src/app/actions/alerts.ts`, `src/app/(app)/finance/page.tsx`, `src/components/finance/InvoiceQueue.tsx`, `src/components/finance/AgeingTable.tsx`, `src/components/finance/CreditNoteDialog.tsx`, `src/components/dashboard/ActionItems.tsx`
- Modify: `src/lib/actions/schemas.ts` (+ test), `src/lib/store.ts`, `src/lib/data/{snapshot,mappers,load-workspace}.ts`, `src/types/index.ts`, `src/components/layout/AppSidebar.tsx`, `src/components/projects/FinanceTab.tsx`, `src/app/(app)/dashboard/page.tsx`, `src/app/(app)/clients/[id]/page.tsx`

**Interfaces:**
- Produces:
  - schemas `issueInvoiceInput { id, due_date? }`, `creditNoteInput { invoice_id, amount, reason }`, `retentionInput { id, retention_amount }`, `releaseRetentionInput { id }`; `paymentInput` gains `tds_amount` (default 0); `clientInput` gains `payment_terms_days` (0–180, default 14)
  - store actions `issueInvoice(id, dueDate?)`, `deleteDraftInvoice(id)`, `addCreditNote(invoiceId, amount, reason)`, `setRetention(invoiceId, amount)`, `releaseRetention(invoiceId)`, `acknowledgeAlert(id)`; `recordPayment` gains a 6th parameter `tdsAmount = 0`
  - type `Alert { id; kind; title; body; link?; project_id?; invoice_id?; created_at; acknowledged_at? }`; `WorkspaceSnapshot.alerts: Alert[]` (only unacknowledged alerts addressed to `me`)
  - route `/finance` (roles: owner, finance, director)

- [ ] **Step 1: Schemas (test first)**

Append to `schemas.test.ts`:

```ts
import { creditNoteInput, issueInvoiceInput } from "./schemas";

describe("receivables schemas", () => {
  it("accepts TDS on payments and defaults it to 0", () => {
    expect(paymentInput.parse({ invoice_id: P, amount: 100, payment_date: "2026-10-09", mode: "upi" }).tds_amount).toBe(0);
    expect(paymentInput.safeParse({ invoice_id: P, amount: 100, tds_amount: -1, payment_date: "2026-10-09", mode: "upi" }).success).toBe(false);
  });
  it("requires a credit note reason", () => {
    expect(creditNoteInput.safeParse({ invoice_id: P, amount: 100, reason: " " }).success).toBe(false);
  });
  it("allows issuing without a due date (client terms apply)", () => {
    expect(issueInvoiceInput.safeParse({ id: P }).success).toBe(true);
  });
});
```

In `schemas.ts`: add `tds_amount: money.default(0),` to `paymentInput`; add `payment_terms_days: z.coerce.number().int().min(0).max(180).default(14),` to `clientFields`; and append:

```ts
export const issueInvoiceInput = z.object({ id, due_date: optDate });
export const creditNoteInput = z.object({ invoice_id: id, amount: z.coerce.number().finite().positive().max(1e11), reason: text(300) });
export const retentionInput = z.object({ id, retention_amount: money });
```

Run: `npm test` → PASS.

- [ ] **Step 2: Server actions**

`src/app/actions/receivables.ts`:

```ts
"use server";
import { mutate } from "@/lib/actions/mutate";
import { creditNoteInput, idInput, issueInvoiceInput, retentionInput } from "@/lib/actions/schemas";

export async function issueInvoice(input: unknown) {
  return mutate(issueInvoiceInput, input, ({ id, due_date }, db) =>
    db.from("invoices").update(due_date ? { status: "sent", due_date } : { status: "sent" }).eq("id", id).eq("status", "draft").select("id").single(),
  );
}

export async function deleteDraftInvoice(input: unknown) {
  return mutate(idInput, input, ({ id }, db) => db.from("invoices").delete().eq("id", id).eq("status", "draft").select("id").single());
}

export async function addCreditNote(input: unknown) {
  return mutate(creditNoteInput, input, (d, db) => db.from("credit_notes").insert(d).select("id").single());
}

export async function setRetention(input: unknown) {
  return mutate(retentionInput, input, ({ id, retention_amount }, db) =>
    db.from("invoices").update({ retention_amount }).eq("id", id).select("id").single(),
  );
}

export async function releaseRetention(input: unknown) {
  return mutate(idInput, input, ({ id }, db) =>
    db.from("invoices").update({ retention_released_at: new Date().toISOString() }).eq("id", id).select("id").single(),
  );
}
```

Also add an RLS policy so drafts can be deleted by billers (new migration `supabase/migrations/20261101000700_invoice_delete.sql`):

```sql
create policy invoices_delete_draft on invoices for delete to authenticated using (can_bill_project(project_id) and status = 'draft');
```

`src/app/actions/alerts.ts`:

```ts
"use server";
import { mutate } from "@/lib/actions/mutate";
import { idInput } from "@/lib/actions/schemas";

export async function acknowledgeAlert(input: unknown) {
  return mutate(idInput, input, ({ id }, db) => db.rpc("acknowledge_alert", { p_alert: id }));
}
```

- [ ] **Step 3: Alerts in the snapshot**

Add to `src/types/index.ts`:

```ts
export interface Alert {
  id: string;
  kind: string;
  title: string;
  body: string;
  link?: string;
  project_id?: string;
  invoice_id?: string;
  created_at: string;
  acknowledged_at?: string;
}
```

Add `alerts: Alert[]` to `WorkspaceSnapshot`; in `mappers.ts`:

```ts
export function mapAlert(r: Tables<"alerts">): Alert {
  return { id: r.id, kind: r.kind, title: r.title, body: r.body, link: opt(r.link), project_id: opt(r.project_id),
    invoice_id: opt(r.invoice_id), created_at: r.created_at, acknowledged_at: opt(r.acknowledged_at) };
}
```

In `loadWorkspace` add `db.from("alerts").select("*").eq("recipient_id", me.id).is("acknowledged_at", null).order("created_at", { ascending: false })` and map with `mapAlert` (run `npm run db:types` first).

- [ ] **Step 4: Store**

Import `* as recvActions from "@/app/actions/receivables"` and `* as alertActions from "@/app/actions/alerts"`. Add to `AppActions` and implement:

```ts
  issueInvoice: (id: string, dueDate?: string) => Promise<ActionResult>;
  deleteDraftInvoice: (id: string) => Promise<ActionResult>;
  addCreditNote: (invoiceId: string, amount: number, reason: string) => Promise<ActionResult>;
  setRetention: (invoiceId: string, amount: number) => Promise<ActionResult>;
  releaseRetention: (invoiceId: string) => Promise<ActionResult>;
  acknowledgeAlert: (id: string) => Promise<ActionResult>;
```

```ts
    issueInvoice: (id, dueDate) => run(recvActions.issueInvoice({ id, due_date: dueDate })),
    deleteDraftInvoice: (id) => run(recvActions.deleteDraftInvoice({ id })),
    addCreditNote: (invoiceId, amount, reason) => run(recvActions.addCreditNote({ invoice_id: invoiceId, amount, reason })),
    setRetention: (invoiceId, amount) => run(recvActions.setRetention({ id: invoiceId, retention_amount: amount })),
    releaseRetention: (invoiceId) => run(recvActions.releaseRetention({ id: invoiceId })),
    acknowledgeAlert: (id) => run(alertActions.acknowledgeAlert({ id })),
```

Change `recordPayment` to accept `tdsAmount = 0` as the sixth argument and pass `tds_amount: tdsAmount`.

- [ ] **Step 5: Components**

`src/components/finance/InvoiceQueue.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";

// Drafts created by stage completion or approved change orders, waiting to be sent.
export function InvoiceQueue() {
  const { invoices, issueInvoice, deleteDraftInvoice } = useAppStore();
  const drafts = invoices.filter((i) => i.status === "draft");
  const [due, setDue] = useState<Record<string, string>>({});

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Ready to invoice ({drafts.length})</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {drafts.length === 0 && <p className="text-sm text-muted-foreground">Nothing waiting. Completed stages and approved change orders appear here.</p>}
        {drafts.map((i) => (
          <div key={i.id} className="flex flex-wrap items-center justify-between gap-3 border rounded-lg p-3">
            <div>
              <p className="text-sm font-semibold">{i.project_name} · {i.client_name}</p>
              <p className="text-xs text-muted-foreground">{i.notes} · {formatCurrency(i.total_amount)} incl. GST</p>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs" htmlFor={`due-${i.id}`}>Due</label>
              <Input id={`due-${i.id}`} type="date" className="h-8 w-40" value={due[i.id] ?? ""} onChange={(e) => setDue({ ...due, [i.id]: e.target.value })} />
              <Button size="sm" onClick={() => issueInvoice(i.id, due[i.id] || undefined)}>Send</Button>
              <Button size="sm" variant="ghost" onClick={() => window.confirm("Delete this draft?") && deleteDraftInvoice(i.id)}>Delete</Button>
            </div>
          </div>
        ))}
        {drafts.length > 0 && <p className="text-xs text-muted-foreground">Leave the due date empty to use the client&apos;s payment terms.</p>}
      </CardContent>
    </Card>
  );
}
```

`src/components/finance/AgeingTable.tsx`:

```tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NotEnoughData } from "@/components/metrics/NotEnoughData";
import type { AgeingRow } from "@/lib/metrics/receivables";
import { formatCurrency } from "@/lib/utils";

const COLS: [keyof AgeingRow, string][] = [["notDue", "Not due"], ["d0_30", "1–30"], ["d31_60", "31–60"], ["d61_90", "61–90"], ["d90plus", "90+"], ["total", "Total"]];

export function AgeingTable({ rows }: { rows: AgeingRow[] }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Receivables ageing (days past due)</CardTitle></CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        {rows.length === 0 ? <div className="p-4"><NotEnoughData /></div> : (
          <table className="w-full text-sm">
            <thead><tr className="border-b text-xs text-muted-foreground text-left">
              <th className="py-2 px-4">Client</th>{COLS.map(([, l]) => <th key={l} className="py-2 px-4 text-right">{l}</th>)}
            </tr></thead>
            <tbody className="divide-y">
              {rows.map((r) => (
                <tr key={r.client_name} className={r.client_name === "Total" ? "font-semibold bg-muted/40" : ""}>
                  <td className="py-2 px-4">{r.client_name}</td>
                  {COLS.map(([k]) => (
                    <td key={k} className={`py-2 px-4 text-right ${k === "d90plus" && (r[k] as number) > 0 ? "text-red-600" : ""}`}>
                      {(r[k] as number) ? formatCurrency(r[k] as number) : "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
```

`src/components/finance/CreditNoteDialog.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppStore } from "@/lib/store";
import type { Invoice } from "@/types";

export function CreditNoteDialog({ invoice, open, onOpenChange }: { invoice: Invoice; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { addCreditNote } = useAppStore();
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const r = await addCreditNote(invoice.id, Number(amount), reason);
    if (r.ok) { setAmount(""); setReason(""); onOpenChange(false); }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Credit note for {invoice.invoice_number}</DialogTitle></DialogHeader>
        <form onSubmit={save} className="space-y-3">
          <div className="space-y-1"><Label htmlFor="cn-amt">Amount (₹, incl. GST)</Label><Input id="cn-amt" type="number" min="1" max={invoice.amount_due + invoice.retention_held} required value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
          <div className="space-y-1"><Label htmlFor="cn-reason">Reason</Label><Input id="cn-reason" required value={reason} onChange={(e) => setReason(e.target.value)} /></div>
          <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit">Issue credit note</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

`src/components/dashboard/ActionItems.tsx`:

```tsx
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppStore } from "@/lib/store";
import { formatRelativeTime } from "@/lib/utils";

// Alerts addressed to me that need an action; they leave the list only when acknowledged.
export function ActionItems() {
  const { alerts, acknowledgeAlert } = useAppStore();
  if (alerts.length === 0) return null;
  return (
    <Card className="border-amber-200">
      <CardHeader className="pb-2"><CardTitle className="text-base">Action items ({alerts.length})</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {alerts.map((a) => (
          <div key={a.id} className="flex items-start justify-between gap-3 border-b last:border-0 pb-2">
            <div>
              <p className="text-sm font-medium">{a.link ? <Link href={a.link} className="hover:underline">{a.title}</Link> : a.title}</p>
              <p className="text-xs text-muted-foreground">{a.body} · {formatRelativeTime(a.created_at)}</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => acknowledgeAlert(a.id)}>Done</Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
```

`src/app/(app)/finance/page.tsx`:

```tsx
"use client";

import { TopBar } from "@/components/layout/AppSidebar";
import { Card, CardContent } from "@/components/ui/card";
import { AgeingTable } from "@/components/finance/AgeingTable";
import { InvoiceQueue } from "@/components/finance/InvoiceQueue";
import { MetricInfo } from "@/components/metrics/MetricInfo";
import { NotEnoughData } from "@/components/metrics/NotEnoughData";
import { ageing, billingLagDays, clientPaymentBehaviour, dso, unbilledWip } from "@/lib/metrics/receivables";
import { useAppStore } from "@/lib/store";
import { formatCurrency, localToday } from "@/lib/utils";

export default function FinancePage() {
  const { invoices, feeStages } = useAppStore();
  const today = localToday();
  const rows = ageing(invoices, today);
  const d = dso(invoices, today);
  const lag = billingLagDays(feeStages, invoices);
  const wip = unbilledWip(feeStages);
  const behaviour = clientPaymentBehaviour(invoices);
  const overdue = invoices.filter((i) => i.status === "overdue").reduce((s, i) => s + i.amount_due, 0);

  const tiles = [
    { label: "Unbilled work", value: formatCurrency(wip), formula: "Fee earned on stages (fee × % complete) minus amount invoiced for those stages" },
    { label: "Overdue", value: formatCurrency(overdue), formula: "Amount due on invoices past their due date" },
    { label: "Days sales outstanding", value: d === null ? null : `${d} days`, formula: "Outstanding ÷ invoiced in last 90 days × 90" },
    { label: "Billing lag", value: lag === null ? null : `${lag} days`, formula: "Average days from stage completion to invoice issue" },
  ];

  return (
    <div>
      <TopBar title="Finance" subtitle="Invoicing queue, receivables and collections" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {tiles.map((t) => (
            <Card key={t.label}><CardContent className="p-4">
              <p className="text-xs text-muted-foreground flex items-center gap-1">{t.label} <MetricInfo formula={t.formula} /></p>
              {t.value === null ? <NotEnoughData /> : <p className="text-2xl font-bold mt-1">{t.value}</p>}
            </CardContent></Card>
          ))}
        </div>
        <InvoiceQueue />
        <AgeingTable rows={rows} />
        <Card><CardContent className="p-4">
          <p className="font-semibold mb-2">Client payment behaviour</p>
          {behaviour.length === 0 ? <NotEnoughData hint="Appears after invoices are fully paid" /> : (
            <table className="w-full text-sm">
              <thead><tr className="text-xs text-muted-foreground text-left"><th>Client</th><th className="text-right">Paid invoices</th><th className="text-right">Avg days to pay</th><th className="text-right">Avg days late</th></tr></thead>
              <tbody>{behaviour.map((b) => (
                <tr key={b.client_name}><td>{b.client_name}</td><td className="text-right">{b.paidInvoices}</td><td className="text-right">{b.avgDaysToPay}</td>
                  <td className={`text-right ${b.avgDaysLate > 15 ? "text-red-600 font-semibold" : ""}`}>{b.avgDaysLate}</td></tr>
              ))}</tbody>
            </table>
          )}
        </CardContent></Card>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Wire into existing screens**

- `AppSidebar.tsx`: add `{ href: "/finance", label: "Finance", icon: Landmark, roles: ["owner", "director", "finance"] }` after Invoices (import `Landmark` from lucide-react).
- `dashboard/page.tsx`: render `<ActionItems />` above the KPI grid.
- `FinanceTab.tsx`: payment dialog gets a "TDS deducted (₹)" number input passed as the sixth `recordPayment` argument; for owner/finance on a `sent` invoice add "Credit note" (opens `CreditNoteDialog`), and on execution invoices a "Retention (₹)" inline field calling `setRetention` plus "Release retention" calling `releaseRetention`. Show TDS, credits and retention held under the invoice amounts.
- `clients/[id]/page.tsx`: show and edit "Payment terms (days)" through `updateClient(client.id, { payment_terms_days })`.

- [ ] **Step 7: Verify**

Run: `npm run db:reset && npm run test:db && npm run typecheck && npm test && npm run lint` → PASS.

Manual as Meera: `/finance` lists the TechCorp Concept draft (from Task 8) and the CO-01 draft; send one without a due date → number assigned, due date = client terms. Record a payment of ₹1,00,000 + ₹10,000 TDS on a ₹1,18,000 invoice, then ₹7,200 + ₹800 → status Paid. Issue a ₹5,000 credit note on Sharma's I1 → `CN/26-27/0001`. Ageing shows TechCorp's I2 in the 1–30 column. Run `select generate_alerts()` in psql; Meera and Priya see Action items; "Done" removes them.

- [ ] **Step 8: Commit**

```bash
git add supabase src
git commit -m "feat: finance workspace with invoice queue, ageing, DSO, credit notes, TDS and action items"
```

---

## Task 13: Phase 1 exit verification

- [ ] **Step 1: Automated checks**

```bash
npm run db:reset && npm run test:db && npm test && npm run typecheck && npm run lint && npm run build
```

Expected: all succeed.

- [ ] **Step 2: Exit criteria (spec 9.2)**

- Every live project has engagement type and fee stages. Check with:
  `select name from projects where status not in ('lead','closed') and archived_at is null and (engagement_type is null or not exists (select 1 from project_fee_stages s where s.project_id = projects.id));`
  Expected after data entry by the firm: no rows. The Projects list shows an amber "Set up fees" badge for any project returned.
- Completing a stage produces a draft invoice (Task 8 manual check).
- Overdue is automatic (Phase 0 `invoice_summary`); ageing matches Finance's records: export the ageing table and reconcile with Finance's spreadsheet for one week.
- Billing-lag baseline recorded: note the `/finance` Billing lag value on go-live day in the project log.

- [ ] **Step 3: Tag**

```bash
git tag phase-1-complete
```
