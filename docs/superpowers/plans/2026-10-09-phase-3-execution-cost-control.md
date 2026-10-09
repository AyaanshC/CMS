# Phase 3: Execution Cost Control Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On design-and-execution projects, every BOQ line has a cost budget; quotes, purchase orders, goods receipts and vendor bills are recorded against it; over-budget or large orders need approval; the firm sees budget vs committed vs actual per line and category, vendor performance, and a true split of design margin vs execution margin.

**Architecture:** Same as Phases 0–2. Cost rates live in a separate staff-only table so clients, who can read BOQ lines, never see margins. Postgres enforces approval thresholds, PO numbering and three-way matching; a security-definer function returns line-level cost control to authorised roles. Vendor scorecards and margin splits are pure, tested TypeScript functions over the snapshot.

**Tech Stack:** As Phases 0–2.

**Spec:** `docs/superpowers/specs/2026-10-09-mis-strategic-plan-design.md` (sections 3.4, 3.10, 4.7, 4.5 margin split, 5.1 M11/M12, 5.2 cost variance, 5.4 PO/delivery alerts, 6.1 Procurement & Site Supervisor, 6.2 rule 2, 9.2 Phase 3)

**Prerequisite:** Phase 2 complete (`git tag phase-2-complete`). Uses names from earlier phases: `mutate`, `run`, `ActionResult`, `WorkspaceSnapshot`, `loadWorkspace`, `projectProfitability`, `portfolioRows`, `projectRisk`, `can_bill_project`, `can_manage_project`, `can_see_project`, `is_staff`, `has_role`, `financial_year`, `invoice_counters`, `audit_row`, `alerts`, `PhotoInput`, `uploadToProject`, `NotEnoughData`, `MetricInfo`, `hasAnyRole`, `fyStart`, `outputGst`.

## Global Constraints

- All Phase 0–2 global constraints apply.
- Cost rates are never readable by clients or vendors. They live in `boq_line_costs`, readable by roles that can bill the project and by Procurement on execution projects.
- Approval thresholds (spec 6.2), stored in `firm_settings.approval_thresholds`: PO above ₹1,00,000 needs a Director; PO above ₹5,00,000 needs the Owner; any PO line that pushes committed cost above its BOQ line budget needs at least a Director; expenses above ₹10,000 need Owner or Finance approval. The approver may not be the PO's creator.
- PO number format: `PO/<FY>/<NNNN>`, assigned on approval.
- Budget per BOQ line = quantity × cost rate. Committed = Σ approved/issued/closed PO lines linked to it. Actual = Σ approved vendor-bill lines linked (through PO lines) plus approved execution expenses tagged to the line.
- Three-way match: a bill line may not exceed (received − rejected − already billed) quantity on its PO line, nor the PO line's rate. A bill with match issues cannot be approved; it can be marked `disputed`.
- Cost variance for the risk score = Σ max(0, committed − budget) over lines ÷ Σ budget.
- Margin split: execution margin = execution stages earned − (approved vendor bills + approved execution expenses); design margin = total margin to date − execution margin.
- Alerts: PO awaiting approval → the required approver(s) immediately; issued PO past expected delivery with quantity outstanding → Procurement and the project's PM, once per PO.

## Review Focus

- A client reading their approved BOQ must not receive cost rates or vendor names in any response. (Task 1 test `client_no_cost`)
- Splitting one ₹6,00,000 order into two ₹3,00,000 POs on the same day to the same vendor for the same project must still need the Owner. (Task 3 test `split_order_guard`)
- A bill for more quantity than received, or at a higher rate than the PO, cannot be approved. (Task 5 test `three_way_match`)
- The person who created a PO cannot approve it, even if they hold the Director role. (Task 3 test `no_self_approval_po`)
- Recording the same vendor bill number twice for one vendor is rejected. (Task 5 test `duplicate_bill`)
- Cost control must show a line with no cost rate as "No budget", not as 100% variance or ₹0 budget silently. (Task 7 test `no_budget_line`)

---

## File Structure

```
supabase/migrations/
  20270101000100_vendors_costs.sql      vendors, boq_line_costs, standard cost rates, can_procure(), procurement read policies
  20270101000200_purchase_orders.sql    quotes, POs, PO lines, thresholds, submit/approve/issue RPCs, numbering
  20270101000300_receipts_bills.sql     GRN, vendor bills + lines, payments, match function, bill approval
  20270101000400_cost_control.sql       boq_cost_control(), expenses v2 (vendor, line, cost type, approval), snags.vendor_id
  20270101000500_procurement_alerts.sql late deliveries, schedule
supabase/tests/12_vendors_costs.test.sql 13_purchase_orders.test.sql 14_bills.test.sql 15_cost_control.test.sql
src/types/index.ts                         + vendor, quote, PO, GRN, bill, cost-control types
src/lib/procurement/costControl.ts (+ test) category rollups, cost variance
src/lib/procurement/scorecard.ts (+ test)   vendor scorecard
src/lib/finance/profitability.ts (+ test)   vendor bills, execution forecast, margin split
src/lib/data/{snapshot,mappers,load-workspace}.ts
src/lib/actions/schemas.ts (+ test)
src/app/actions/{vendors,procurement,bills}.ts
src/app/(app)/vendors/page.tsx
src/components/procurement/{CostControlTable,QuotesPanel,PurchaseOrders,PoDialog,ReceiveDialog,VendorBills,BillDialog}.tsx
src/components/projects/ProcurementTab.tsx
src/app/(app)/purchase-orders/[id]/print/page.tsx
src/components/dashboard/SiteDashboard.tsx
```

---

## Task 1: Vendors, private BOQ cost rates and procurement access

**Files:**
- Create: `supabase/migrations/20270101000100_vendors_costs.sql`, `supabase/tests/12_vendors_costs.test.sql`
- Modify: `supabase/seed.sql`

**Interfaces:**
- Produces: enum `vendor_status ('active','preferred','blacklisted')`; tables `vendors(id, name, category, gstin, pan, phone, email, address, bank_details, payment_terms_days, status, notes, created_at)`, `boq_line_costs(line_item_id pk, cost_rate, updated_at)`; column `item_library.standard_cost_rate`; `firm_settings.approval_thresholds jsonb` default `{"po_director":100000,"po_owner":500000,"expense":10000}`; function `can_procure(p uuid) → boolean` (= `can_bill_project(p)` or procurement on a `design_and_execution` project); extra read policies giving Procurement read access to those projects and their BOQs.

- [ ] **Step 1: Failing tests**

`supabase/tests/12_vendors_costs.test.sql`:

```sql
begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

create function pg_temp.act_as(uid uuid) returns void language plpgsql as $$
begin perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true); end $$;

update boq_versions set status = 'approved', is_active = true, approved_at = now() where id = 'b0000000-0000-4000-8000-000000000001';
insert into boq_line_costs (line_item_id, cost_rate) select id, round(unit_rate * 0.7, 2) from boq_line_items where section_id = 'b1000000-0000-4000-8000-000000000001';

-- client_no_cost
select pg_temp.act_as('00000000-0000-4000-8000-000000000011');
set local role authenticated;
select ok((select count(*) from boq_line_items) > 0, 'client still reads BOQ lines');
select is((select count(*)::int from boq_line_costs), 0, 'client cannot read cost rates');
select is((select count(*)::int from vendors), 0, 'client cannot read vendors');
reset role;

-- procurement sees execution project BOQ and costs, not design-only projects
select pg_temp.act_as('00000000-0000-4000-8000-000000000008');
set local role authenticated;
select is((select count(*)::int from projects where id = 'a1000000-0000-4000-8000-000000000001'), 1, 'procurement sees execution project');
select is((select count(*)::int from projects where id = 'a1000000-0000-4000-8000-000000000002'), 0, 'procurement does not see design-only project');
select ok((select count(*) from boq_line_costs) > 0, 'procurement reads cost rates');
reset role;

-- architect: member of P1 but no billing rights
select pg_temp.act_as('00000000-0000-4000-8000-000000000004');
set local role authenticated;
select is((select count(*)::int from boq_line_costs), 0, 'architect cannot read cost rates');
reset role;

select * from finish();
rollback;
```

Run: `npm run test:db` → FAIL.

- [ ] **Step 2: Migration**

`supabase/migrations/20270101000100_vendors_costs.sql`:

```sql
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
create policy vendors_read on vendors for select to authenticated using (is_staff());
create policy vendors_write on vendors for all to authenticated
  using (has_role('owner') or has_role('director') or has_role('procurement') or has_role('finance'))
  with check (has_role('owner') or has_role('director') or has_role('procurement') or has_role('finance'));
create trigger vendors_audit after insert or update or delete on public.vendors for each row execute function public.audit_row();

alter table public.firm_settings add column approval_thresholds jsonb not null
  default '{"po_director":100000,"po_owner":500000,"expense":10000}'::jsonb;
alter table public.item_library add column standard_cost_rate numeric(14,2);

create function public.can_procure(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select can_bill_project(p)
      or (has_role('procurement') and exists (select 1 from projects where id = p and engagement_type = 'design_and_execution'))
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
```

Note: `audit_row` uses `->> 'id'`; for `boq_line_costs` the key is `line_item_id`, so `row_id` is null in the audit log and `new_data` still holds the full row. That is acceptable.

- [ ] **Step 3: Seed vendors**

Append to `supabase/seed.sql`:

```sql
insert into public.vendors (name, category, gstin, phone, email, payment_terms_days, status) values
  ('Sri Lakshmi Gypsum Works', 'Civil & Ceiling', '29ABCDE1234F1Z5', '+91 90000 11111', 'lakshmi@vendor.test', 15, 'preferred'),
  ('Modern Modular Interiors', 'Carpentry', '29BCDEF2345G1Z6', '+91 90000 22222', 'mmi@vendor.test', 30, 'active'),
  ('Bright Electricals', 'Electrical', '29CDEFG3456H1Z7', '+91 90000 33333', 'bright@vendor.test', 30, 'active');
```

- [ ] **Step 4: Run and commit**

Run: `npm run db:reset && npm run test:db` → all `ok`.

```bash
git add supabase
git commit -m "feat(db): vendors, private BOQ cost rates and procurement access"
```

---

## Task 2: Types for procurement

**Files:**
- Modify: `src/types/index.ts`

**Interfaces:**
- Produces:

```ts
export type VendorStatus = 'active' | 'preferred' | 'blacklisted';
export interface Vendor {
  id: string; name: string; category: string; gstin?: string; pan?: string; phone?: string; email?: string;
  address?: string; payment_terms_days: number; status: VendorStatus; notes?: string;
}
export interface VendorQuote {
  id: string; project_id: string; vendor_id: string; vendor_name: string; boq_line_item_id?: string; package_name?: string;
  description?: string; quantity: number; rate: number; valid_until?: string; received_at: string;
}
export type PoStatus = 'draft' | 'pending_approval' | 'approved' | 'issued' | 'closed' | 'cancelled';
export interface PoLine {
  id: string; po_id: string; boq_line_item_id?: string; description: string; unit: string; quantity: number; rate: number;
  gst_rate: number; amount: number; received_qty: number; billed_qty: number;
}
export interface PurchaseOrder {
  id: string; project_id: string; vendor_id: string; vendor_name: string; number?: string; status: PoStatus;
  order_date: string; expected_delivery?: string; notes?: string; approval_required_role?: AppRole;
  approved_by_name?: string; approved_at?: string; created_by?: string; created_at: string; lines: PoLine[]; total: number;
}
export interface GoodsReceipt { id: string; po_id: string; received_on: string; received_by_name?: string; notes?: string; photo_url?: string;
  lines: { po_line_id: string; quantity_received: number; quantity_rejected: number; condition_note?: string }[] }
export type VendorBillStatus = 'recorded' | 'approved' | 'disputed';
export interface VendorBill {
  id: string; vendor_id: string; vendor_name: string; project_id: string; po_id?: string; bill_number: string; bill_date: string;
  due_date?: string; status: VendorBillStatus; notes?: string; file_url?: string; subtotal: number; gst_amount: number; total: number;
  paid: number; outstanding: number; match_issues: string[];
  lines: { id: string; po_line_id?: string; description: string; quantity: number; rate: number; gst_rate: number; amount: number }[];
}
export interface VendorPayment { id: string; vendor_id: string; bill_id?: string; project_id: string; amount: number; tds_amount: number;
  paid_on: string; mode: PaymentMode; reference?: string; is_advance: boolean }
export interface CostControlRow {
  project_id: string; line_item_id: string; category: string; description: string; unit: string; quantity: number;
  sell_rate: number; cost_rate?: number; sell_amount: number; budget?: number; committed: number; actual: number;
}
export type ExpenseStatus = 'pending' | 'approved' | 'rejected';
export type CostType = 'design' | 'execution';
```

Also extend `Expense` with `vendor_id?: string; boq_line_item_id?: string; cost_type: CostType; status: ExpenseStatus;`, `Snag` with `vendor_id?: string; vendor_name?: string;`, `ItemLibraryItem` with `standard_cost_rate?: number;`, `StudioSettings` with `approval_thresholds: { po_director: number; po_owner: number; expense: number };`.

- [ ] **Step 1: Add the types above**, run `npm run typecheck` (expect errors only in mappers for the new required `Expense` and `StudioSettings` fields; fix in Task 8), and commit:

```bash
git add src/types/index.ts
git commit -m "feat: procurement domain types"
```

---

## Task 3: Quotes and purchase orders with approval thresholds

**Files:**
- Create: `supabase/migrations/20270101000200_purchase_orders.sql`, `supabase/tests/13_purchase_orders.test.sql`

**Interfaces:**
- Produces: tables `vendor_quotes`, `purchase_orders`, `po_lines` (generated `amount`); enum `po_status`; RPCs `submit_po(p_po uuid) → text` (returns required role or `'none'` when auto-approved), `approve_po(p_po uuid) → void`, `issue_po(p_po uuid) → void`, `cancel_po(p_po uuid, p_reason text) → void`; function `po_required_role(p_po uuid) → app_role` (null when no approval needed).

Rules inside `po_required_role`:
1. `total` = this PO's line amounts **plus** other non-cancelled, non-draft POs to the same vendor on the same project with the same `order_date` (stops order splitting).
2. Owner if `total > po_owner`; else Director if `total > po_director` or any linked line's committed + this line > budget (`quantity × cost_rate`), or the line has no cost rate; else none.

- [ ] **Step 1: Failing tests**

`supabase/tests/13_purchase_orders.test.sql`:

```sql
begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

create function pg_temp.act_as(uid uuid) returns void language plpgsql as $$
begin perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true); end $$;

update boq_versions set status = 'approved', is_active = true, approved_at = now() where id = 'b0000000-0000-4000-8000-000000000001';
-- Ceiling line: 240 sqft @ 95 sell; cost 70 -> budget 16,800. Putty line: 450 @ 25 sell; cost 18 -> budget 8,100.
insert into boq_line_costs (line_item_id, cost_rate)
select id, case when description like 'Gypsum%' then 70 else 18 end from boq_line_items where section_id = 'b1000000-0000-4000-8000-000000000001';

select pg_temp.act_as('00000000-0000-4000-8000-000000000008');   -- procurement Kunal
set local role authenticated;

-- Small, within budget -> auto approved
insert into purchase_orders (id, project_id, vendor_id, order_date) values
  ('f1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', (select id from vendors where name like 'Sri Lakshmi%'), current_date);
insert into po_lines (po_id, boq_line_item_id, description, unit, quantity, rate, gst_rate)
select 'f1000000-0000-4000-8000-000000000001', id, description, unit, 240, 68, 18 from boq_line_items where description like 'Gypsum%';
select is(submit_po('f1000000-0000-4000-8000-000000000001'), 'none', 'within budget and threshold: no approval');
select matches((select number from purchase_orders where id = 'f1000000-0000-4000-8000-000000000001'), '^PO/\d{2}-\d{2}/\d{4}$', 'numbered on approval');

-- Over line budget -> director
insert into purchase_orders (id, project_id, vendor_id, order_date) values
  ('f1000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000001', (select id from vendors where name like 'Sri Lakshmi%'), current_date - 1);
insert into po_lines (po_id, boq_line_item_id, description, unit, quantity, rate, gst_rate)
select 'f1000000-0000-4000-8000-000000000002', id, description, unit, 450, 20, 18 from boq_line_items where description like 'Wall putty%';
select is(submit_po('f1000000-0000-4000-8000-000000000002'), 'director', 'over line budget needs a director');

-- split_order_guard: two 3 lakh POs same vendor/project/day -> second needs owner
insert into purchase_orders (id, project_id, vendor_id, order_date) values
  ('f1000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000001', (select id from vendors where name like 'Modern%'), current_date),
  ('f1000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000001', (select id from vendors where name like 'Modern%'), current_date);
insert into po_lines (po_id, description, unit, quantity, rate, gst_rate) values
  ('f1000000-0000-4000-8000-000000000003', 'Wardrobe carcass', 'lot', 1, 300000, 18),
  ('f1000000-0000-4000-8000-000000000004', 'Kitchen carcass', 'lot', 1, 300000, 18);
select is(submit_po('f1000000-0000-4000-8000-000000000003'), 'director', 'unbudgeted 3L needs director');
select is(submit_po('f1000000-0000-4000-8000-000000000004'), 'owner', 'same-day split adds up to owner level');

-- no_self_approval_po: Kunal created PO2 and is not a director anyway; Vikram (director) approves PO2
select throws_like($$ select approve_po('f1000000-0000-4000-8000-000000000002') $$, '%not allowed%', 'creator cannot approve');
reset role;

select pg_temp.act_as('00000000-0000-4000-8000-000000000002');   -- director Vikram
set local role authenticated;
select lives_ok($$ select approve_po('f1000000-0000-4000-8000-000000000002') $$, 'director approves director-level PO');
select throws_like($$ select approve_po('f1000000-0000-4000-8000-000000000004') $$, '%owner%', 'director cannot approve owner-level PO');
reset role;

select pg_temp.act_as('00000000-0000-4000-8000-000000000001');   -- owner
set local role authenticated;
select lives_ok($$ select approve_po('f1000000-0000-4000-8000-000000000004') $$, 'owner approves');
reset role;

select pg_temp.act_as('00000000-0000-4000-8000-000000000008');
set local role authenticated;
select lives_ok($$ select issue_po('f1000000-0000-4000-8000-000000000001') $$, 'procurement issues approved PO');
reset role;

select * from finish();
rollback;
```

Run: `npm run test:db` → FAIL.

- [ ] **Step 2: Migration**

`supabase/migrations/20270101000200_purchase_orders.sql`:

```sql
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
create policy quotes_all on vendor_quotes for all to authenticated using (can_procure(project_id)) with check (can_procure(project_id));

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
create policy po_read on purchase_orders for select to authenticated using (can_procure(project_id) or can_manage_project(project_id));
create policy po_insert on purchase_orders for insert to authenticated with check (can_procure(project_id) and status = 'draft');
create policy po_update on purchase_orders for update to authenticated
  using (can_procure(project_id) and status = 'draft') with check (can_procure(project_id) and status = 'draft');
create policy po_delete on purchase_orders for delete to authenticated using (can_procure(project_id) and status = 'draft');
create policy po_lines_read on po_lines for select to authenticated using (exists (select 1 from purchase_orders p where p.id = po_id));
create policy po_lines_write on po_lines for all to authenticated
  using (can_procure(po_project(po_id)) and po_status_of(po_id) = 'draft')
  with check (can_procure(po_project(po_id)) and po_status_of(po_id) = 'draft');

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
  if v_po.approval_required_role = 'owner' and not has_role('owner') then
    raise exception 'This purchase order needs the owner''s approval';
  end if;
  if v_po.approval_required_role = 'director' and not (has_role('owner') or has_role('director')) then
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
declare v_po record;
begin
  select * into v_po from purchase_orders where id = p_po for update;
  if v_po.id is null or not can_procure(v_po.project_id) then raise exception 'Not allowed'; end if;
  if coalesce(trim(p_reason), '') = '' then raise exception 'Give a reason'; end if;
  if exists (select 1 from vendor_bill_lines bl join po_lines l on l.id = bl.po_line_id where l.po_id = p_po) then
    raise exception 'This purchase order has bills against it and cannot be cancelled';
  end if;
  update purchase_orders set status = 'cancelled', cancel_reason = trim(p_reason) where id = p_po;
end $$;
```

`cancel_po` references `vendor_bill_lines` (Task 4). Postgres resolves names in plpgsql bodies at call time, so the migration applies; the function works once Task 4 runs.

- [ ] **Step 3: Run and commit**

Run: `npm run db:reset && npm run test:db` → all `ok`.

```bash
git add supabase
git commit -m "feat(db): quotes and purchase orders with approval thresholds and split-order guard"
```

---

## Task 4: Goods receipts, vendor bills, three-way match and payments

**Files:**
- Create: `supabase/migrations/20270101000300_receipts_bills.sql`, `supabase/tests/14_bills.test.sql`

**Interfaces:**
- Produces: tables `goods_receipts`, `grn_lines`, `vendor_bills`, `vendor_bill_lines` (generated `amount`, `gst_amount`), `vendor_payments`; enum `vendor_bill_status ('recorded','approved','disputed')`; views `po_line_progress(po_line_id, received_qty, rejected_qty, billed_qty)` and `vendor_bill_summary(id, subtotal, gst_amount, total, paid, outstanding, match_issues text[])` (both `security_invoker`); function `bill_match_issues(p_bill uuid) → text[]`; RPCs `approve_vendor_bill(p_bill uuid) → void`, `dispute_vendor_bill(p_bill uuid, p_note text) → void`; trigger closing a PO when every line is fully received and billed.

- [ ] **Step 1: Failing tests**

`supabase/tests/14_bills.test.sql`:

```sql
begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

create function pg_temp.act_as(uid uuid) returns void language plpgsql as $$
begin perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true); end $$;

-- Setup as postgres: an issued PO for 100 units @ 50
insert into purchase_orders (id, project_id, vendor_id, status, number, order_date) values
  ('f1000000-0000-4000-8000-000000000010', 'a1000000-0000-4000-8000-000000000001', (select id from vendors where name like 'Bright%'), 'issued', 'PO/TEST/0001', current_date);
insert into po_lines (id, po_id, description, unit, quantity, rate, gst_rate) values
  ('f2000000-0000-4000-8000-000000000010', 'f1000000-0000-4000-8000-000000000010', 'Cable 2.5 sqmm', 'm', 100, 50, 18);

-- Site supervisor receives 60 (5 rejected)
select pg_temp.act_as('00000000-0000-4000-8000-000000000005');
set local role authenticated;
insert into goods_receipts (id, po_id, received_on) values ('f3000000-0000-4000-8000-000000000010', 'f1000000-0000-4000-8000-000000000010', current_date);
insert into grn_lines (grn_id, po_line_id, quantity_received, quantity_rejected) values ('f3000000-0000-4000-8000-000000000010', 'f2000000-0000-4000-8000-000000000010', 60, 5);
select is((select received_qty - rejected_qty from po_line_progress where po_line_id = 'f2000000-0000-4000-8000-000000000010'), 55.000::numeric, 'accepted quantity');
reset role;

-- three_way_match
select pg_temp.act_as('00000000-0000-4000-8000-000000000006');   -- finance
set local role authenticated;
insert into vendor_bills (id, vendor_id, project_id, po_id, bill_number, bill_date) values
  ('f4000000-0000-4000-8000-000000000010', (select id from vendors where name like 'Bright%'), 'a1000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-000000000010', 'BE/778', current_date);
insert into vendor_bill_lines (bill_id, po_line_id, description, quantity, rate, gst_rate) values
  ('f4000000-0000-4000-8000-000000000010', 'f2000000-0000-4000-8000-000000000010', 'Cable', 60, 52, 18);
select is(array_length(bill_match_issues('f4000000-0000-4000-8000-000000000010'), 1), 2, 'quantity and rate issues');
select throws_like($$ select approve_vendor_bill('f4000000-0000-4000-8000-000000000010') $$, '%does not match%', 'mismatched bill cannot be approved');
update vendor_bill_lines set quantity = 55, rate = 50 where bill_id = 'f4000000-0000-4000-8000-000000000010';
select is(bill_match_issues('f4000000-0000-4000-8000-000000000010'), '{}'::text[], 'matched after correction');
select lives_ok($$ select approve_vendor_bill('f4000000-0000-4000-8000-000000000010') $$, 'approve matched bill');
select is((select total from vendor_bill_summary where id = 'f4000000-0000-4000-8000-000000000010'), 3245.00::numeric, '55 x 50 + 18% GST');

-- duplicate_bill
select throws_ok($$ insert into vendor_bills (vendor_id, project_id, bill_number, bill_date) values ((select id from vendors where name like 'Bright%'), 'a1000000-0000-4000-8000-000000000001', 'BE/778', current_date) $$,
  '23505', null, 'same bill number twice rejected');

insert into vendor_payments (vendor_id, bill_id, project_id, amount, paid_on, mode) values
  ((select id from vendors where name like 'Bright%'), 'f4000000-0000-4000-8000-000000000010', 'a1000000-0000-4000-8000-000000000001', 3245, current_date, 'bank_transfer');
select is((select outstanding from vendor_bill_summary where id = 'f4000000-0000-4000-8000-000000000010'), 0.00::numeric, 'paid off');
reset role;

select * from finish();
rollback;
```

Run: `npm run test:db` → FAIL.

- [ ] **Step 2: Migration**

`supabase/migrations/20270101000300_receipts_bills.sql`:

```sql
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
create policy grn_read on goods_receipts for select to authenticated using (can_procure(po_project(po_id)) or can_manage_project(po_project(po_id)));
create policy grn_insert on goods_receipts for insert to authenticated with check (
  can_manage_project(po_project(po_id)) and po_status_of(po_id) = 'issued' and received_by = auth.uid());
create policy grn_lines_read on grn_lines for select to authenticated using (exists (select 1 from goods_receipts g where g.id = grn_id));
create policy grn_lines_insert on grn_lines for insert to authenticated with check (
  exists (select 1 from goods_receipts g where g.id = grn_id and g.received_by = auth.uid()));

create view public.po_line_progress with (security_invoker = true) as
select l.id as po_line_id,
       coalesce((select sum(quantity_received) from grn_lines where po_line_id = l.id), 0)::numeric(12,3) as received_qty,
       coalesce((select sum(quantity_rejected) from grn_lines where po_line_id = l.id), 0)::numeric(12,3) as rejected_qty,
       coalesce((select sum(bl.quantity) from vendor_bill_lines bl join vendor_bills b on b.id = bl.bill_id
                 where bl.po_line_id = l.id and b.status <> 'disputed'), 0)::numeric(12,3) as billed_qty
from public.po_lines l;

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

create policy bills_read on vendor_bills for select to authenticated using (can_procure(project_id));
create policy bills_insert on vendor_bills for insert to authenticated with check (
  (has_role('finance') or has_role('procurement') or has_role('owner')) and can_procure(project_id) and status = 'recorded');
create policy bills_update on vendor_bills for update to authenticated
  using ((has_role('finance') or has_role('owner')) and status = 'recorded')
  with check ((has_role('finance') or has_role('owner')) and status = 'recorded');
create policy bill_lines_read on vendor_bill_lines for select to authenticated using (exists (select 1 from vendor_bills b where b.id = bill_id));
create policy bill_lines_write on vendor_bill_lines for all to authenticated
  using (can_procure(bill_project(bill_id)) and bill_status_of(bill_id) = 'recorded')
  with check (can_procure(bill_project(bill_id)) and bill_status_of(bill_id) = 'recorded');
create policy vpay_read on vendor_payments for select to authenticated using (can_procure(project_id));
create policy vpay_insert on vendor_payments for insert to authenticated with check (has_role('finance') or has_role('owner'));

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
  if v.id is null or not (has_role('finance') or has_role('owner')) then raise exception 'Not allowed'; end if;
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
  if not (has_role('finance') or has_role('owner')) then raise exception 'Not allowed'; end if;
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
```

- [ ] **Step 3: Run and commit**

Run: `npm run db:reset && npm run test:db` → all `ok`.

```bash
git add supabase
git commit -m "feat(db): goods receipts, vendor bills with three-way match, vendor payments"
```

---

## Task 5: Cost control function, expenses v2 and snag vendors

**Files:**
- Create: `supabase/migrations/20270101000400_cost_control.sql`, `supabase/tests/15_cost_control.test.sql`

**Interfaces:**
- Produces: `boq_cost_control() → table(project_id, line_item_id, category, description, unit, quantity, sell_rate, cost_rate, sell_amount, budget, committed, actual)` (rows only where `can_procure(project_id)`; `cost_rate` and `budget` null when the line has no cost rate); expenses columns `vendor_id, boq_line_item_id, cost_type ('design'|'execution'), status ('pending'|'approved'|'rejected')` with a trigger setting `pending` above the expense threshold for non-owner/finance creators; RPC `decide_expense(p_expense uuid, p_approve boolean, p_note text) → void`; `snags.vendor_id`.

- [ ] **Step 1: Failing tests**

`supabase/tests/15_cost_control.test.sql`:

```sql
begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

create function pg_temp.act_as(uid uuid) returns void language plpgsql as $$
begin perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true); end $$;

update boq_versions set status = 'approved', is_active = true, approved_at = now() where id = 'b0000000-0000-4000-8000-000000000001';
insert into boq_line_costs (line_item_id, cost_rate) select id, 70 from boq_line_items where description like 'Gypsum%';
insert into purchase_orders (id, project_id, vendor_id, status, number) values
  ('f1000000-0000-4000-8000-000000000020', 'a1000000-0000-4000-8000-000000000001', (select id from vendors limit 1), 'issued', 'PO/T/2');
insert into po_lines (po_id, boq_line_item_id, description, unit, quantity, rate) select 'f1000000-0000-4000-8000-000000000020', id, 'Gypsum', 'sqft', 240, 75 from boq_line_items where description like 'Gypsum%';

select pg_temp.act_as('00000000-0000-4000-8000-000000000003');   -- PM
set local role authenticated;
select is((select budget from boq_cost_control() where description like 'Gypsum%'), 16800.00::numeric, 'budget = qty x cost');
select is((select committed from boq_cost_control() where description like 'Gypsum%'), 18000.00::numeric, 'committed from issued PO');
-- no_budget_line
select is((select budget from boq_cost_control() where description like 'Wall putty%'), null, 'line without cost rate has no budget');
reset role;

select pg_temp.act_as('00000000-0000-4000-8000-000000000011');   -- client
set local role authenticated;
select is((select count(*)::int from boq_cost_control()), 0, 'client gets nothing');
reset role;

-- expense approval threshold
select pg_temp.act_as('00000000-0000-4000-8000-000000000005');   -- site supervisor
set local role authenticated;
insert into expenses (project_id, category, description, amount, expense_date, cost_type) values ('a1000000-0000-4000-8000-000000000001', 'Materials', 'Local purchase', 15000, current_date, 'execution');
insert into expenses (project_id, category, description, amount, expense_date) values ('a1000000-0000-4000-8000-000000000001', 'Travel', 'Auto fare', 400, current_date);
reset role;   -- site supervisors cannot read expenses; check as postgres
select is((select status::text from expenses where description = 'Local purchase'), 'pending', 'large expense waits for approval');
select is((select status::text from expenses where description = 'Auto fare'), 'approved', 'small expense auto-approved');

select pg_temp.act_as('00000000-0000-4000-8000-000000000006');   -- finance
set local role authenticated;
select lives_ok($$ select decide_expense((select id from expenses where description = 'Local purchase'), true, null) $$, 'finance approves');
reset role;

select * from finish();
rollback;
```

Run: `npm run test:db` → FAIL.

- [ ] **Step 2: Migration**

`supabase/migrations/20270101000400_cost_control.sql`:

```sql
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
     and not (has_role('owner') or has_role('finance')) then
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
  if not (has_role('owner') or has_role('finance')) then raise exception 'Not allowed'; end if;
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
  where v.status = 'approved' and v.is_active and can_procure(v.project_id)
$$;
```

Also update the Phase 0 `expenses_read` policy so procurement can read execution expenses: add `create policy expenses_read_procurement on expenses for select to authenticated using (can_procure(project_id));`.

- [ ] **Step 3: Run and commit**

Run: `npm run db:reset && npm run test:db` → all `ok`. (Earlier Phase 0 tests still pass: seeded expenses default to `approved`.)

```bash
git add supabase
git commit -m "feat(db): BOQ cost control rollup, expense approvals and snag vendors"
```

---

## Task 6: Procurement alerts

**Files:**
- Create: `supabase/migrations/20270101000500_procurement_alerts.sql`
- Modify: `supabase/tests/15_cost_control.test.sql`

**Interfaces:**
- Produces: `generate_procurement_alerts(p_today date default current_date) → int` (late deliveries: issued POs with `expected_delivery < p_today` and any line with accepted quantity below ordered → procurement users and the project's manager; dedupe per PO and recipient); cron job `procurement-alerts` daily 03:00 UTC.

- [ ] **Step 1: Test**

Change `plan(7)` to `plan(8)` in `15_cost_control.test.sql` and add before `finish()`:

```sql
update purchase_orders set expected_delivery = current_date - 2 where id = 'f1000000-0000-4000-8000-000000000020';
select ok(generate_procurement_alerts(current_date) >= 2, 'late delivery alerts procurement and PM');
```

- [ ] **Step 2: Migration**

```sql
create function public.generate_procurement_alerts(p_today date default current_date) returns int
language plpgsql security definer set search_path = public as $$
declare v_count int;
begin
  insert into alerts (kind, dedupe_key, recipient_id, project_id, title, body, link)
  select 'po_late_delivery', 'po_late_delivery:' || o.id || ':' || r.uid, r.uid, o.project_id,
         'Late delivery: ' || coalesce(o.number, 'PO') || ' (' || v.name || ')',
         'Expected ' || to_char(o.expected_delivery, 'DD Mon') || '; items still outstanding on ' || p.name, '/projects/' || o.project_id
  from purchase_orders o
  join vendors v on v.id = o.vendor_id
  join projects p on p.id = o.project_id
  cross join lateral (
    select user_id as uid from user_roles where role = 'procurement'
    union select p.manager_id where p.manager_id is not null
  ) r
  where o.status = 'issued' and o.expected_delivery < p_today
    and exists (select 1 from po_lines l join po_line_progress g on g.po_line_id = l.id
                where l.po_id = o.id and g.received_qty - g.rejected_qty < l.quantity)
  on conflict (dedupe_key) do nothing;
  get diagnostics v_count = row_count;
  return v_count;
end $$;

select cron.schedule('procurement-alerts', '0 3 * * *', $$select public.generate_procurement_alerts()$$);
```

- [ ] **Step 3: Run and commit**

Run: `npm run db:reset && npm run test:db` → all `ok`.

```bash
git add supabase
git commit -m "feat(db): late delivery alerts"
```

---

## Task 7: Cost control and vendor scorecard functions

**Files:**
- Create: `src/lib/procurement/costControl.ts`, `src/lib/procurement/costControl.test.ts`, `src/lib/procurement/scorecard.ts`, `src/lib/procurement/scorecard.test.ts`

**Interfaces:**
- Produces:
  - `categoryRollup(rows: CostControlRow[]): { category: string; sell: number; budget: number | null; committed: number; actual: number; plannedMargin: number | null; variance: number | null }[]` (budget null when any line in the category lacks a cost rate; final row `category: "Total"`)
  - `lineVariance(r: CostControlRow): { status: "no_budget" | "ok" | "over"; overBy: number }` (over = max(committed, actual) > budget)
  - `costVariance(rows: CostControlRow[]): number | null` (Σ max(0, committed − budget) ÷ Σ budget over budgeted lines; null when no budgeted lines)
  - `executionForecast(rows: CostControlRow[]): number` (Σ per line max(budget ?? 0, committed, actual))
  - `vendorScorecard(vendors, pos, receipts, bills, snags, costRows): ScoreRow[]` with `ScoreRow = { vendor_id; name; status; spend: number; onTimePct: number | null; priceVariancePct: number | null; snagsPerLakh: number | null; avgFixHours: number | null }`

- [ ] **Step 1: Failing tests**

`src/lib/procurement/costControl.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { categoryRollup, costVariance, executionForecast, lineVariance } from "./costControl";
import type { CostControlRow } from "@/types";

const row = (o: Partial<CostControlRow>): CostControlRow => ({
  project_id: "p", line_item_id: "l", category: "Civil", description: "", unit: "sqft", quantity: 1, sell_rate: 0,
  sell_amount: 0, committed: 0, actual: 0, ...o,
});

describe("lineVariance", () => {
  it("no_budget_line: reports missing budget explicitly", () => {
    expect(lineVariance(row({ committed: 500 }))).toEqual({ status: "no_budget", overBy: 0 });
  });
  it("flags over budget using the larger of committed and actual", () => {
    expect(lineVariance(row({ budget: 1000, committed: 900, actual: 1100 }))).toEqual({ status: "over", overBy: 100 });
    expect(lineVariance(row({ budget: 1000, committed: 900 }))).toEqual({ status: "ok", overBy: 0 });
  });
});

describe("categoryRollup", () => {
  it("sums by category and marks partial budgets", () => {
    const r = categoryRollup([
      row({ category: "Civil", sell_amount: 22800, budget: 16800, committed: 18000 }),
      row({ category: "Civil", sell_amount: 11250, committed: 0 }),
      row({ category: "Carpentry", sell_amount: 50000, budget: 35000, committed: 30000, actual: 30000 }),
    ]);
    expect(r.find((x) => x.category === "Civil")).toMatchObject({ sell: 34050, budget: null, committed: 18000, plannedMargin: null });
    expect(r.find((x) => x.category === "Carpentry")).toMatchObject({ budget: 35000, plannedMargin: 15000, variance: -5000 });
    expect(r.at(-1)?.category).toBe("Total");
  });
});

describe("costVariance", () => {
  it("is overspend over budget, ignoring unbudgeted lines", () => {
    expect(costVariance([row({ budget: 16800, committed: 18000 }), row({ budget: 8100, committed: 8000 }), row({ committed: 999 })]))
      .toBeCloseTo(1200 / 24900, 6);
    expect(costVariance([row({ committed: 5 })])).toBeNull();
  });
});

describe("executionForecast", () => {
  it("takes the largest of budget, committed and actual per line", () => {
    expect(executionForecast([row({ budget: 100, committed: 120, actual: 50 }), row({ committed: 30 })])).toBe(150);
  });
});
```

`src/lib/procurement/scorecard.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { vendorScorecard } from "./scorecard";
import type { CostControlRow, GoodsReceipt, PurchaseOrder, Snag, Vendor, VendorBill } from "@/types";

const vendors = [{ id: "v", name: "Bright", status: "active", category: "Electrical", payment_terms_days: 30 }] as Vendor[];
const pos = [
  { id: "o1", vendor_id: "v", status: "closed", expected_delivery: "2026-09-10", lines: [{ id: "l1", boq_line_item_id: "b1", quantity: 10, rate: 110, amount: 1100, received_qty: 10 }] },
  { id: "o2", vendor_id: "v", status: "issued", expected_delivery: "2026-09-20", lines: [{ id: "l2", quantity: 5, rate: 10, amount: 50, received_qty: 2 }] },
] as PurchaseOrder[];
const receipts = [{ po_id: "o1", received_on: "2026-09-09", lines: [] }] as unknown as GoodsReceipt[];
const bills = [{ vendor_id: "v", status: "approved", subtotal: 200000 }] as VendorBill[];
const snags = [
  { vendor_id: "v", created_at: "2026-10-01T00:00:00Z", fixed_at: "2026-10-02T00:00:00Z" },
  { vendor_id: "v", created_at: "2026-10-01T00:00:00Z" },
] as Snag[];
const costRows = [{ line_item_id: "b1", cost_rate: 100 }] as CostControlRow[];

describe("vendorScorecard", () => {
  const [s] = vendorScorecard(vendors, pos, receipts, bills, snags, costRows, "2026-10-09");
  it("counts on-time deliveries among POs that were due", () => {
    expect(s.onTimePct).toBe(50);   // o1 on time, o2 late and incomplete
  });
  it("measures price variance against BOQ cost on linked lines", () => {
    expect(s.priceVariancePct).toBe(10);
  });
  it("normalises snags per ₹1 lakh billed and averages fix time", () => {
    expect(s.spend).toBe(200000);
    expect(s.snagsPerLakh).toBe(1);
    expect(s.avgFixHours).toBe(24);
  });
});
```

Run: `npm test` → FAIL.

- [ ] **Step 2: Implement**

`src/lib/procurement/costControl.ts`:

```ts
import { round2 } from "@/lib/finance/money";
import type { CostControlRow } from "@/types";

export function lineVariance(r: CostControlRow): { status: "no_budget" | "ok" | "over"; overBy: number } {
  if (r.budget == null) return { status: "no_budget", overBy: 0 };
  const spend = Math.max(r.committed, r.actual);
  return spend > r.budget ? { status: "over", overBy: round2(spend - r.budget) } : { status: "ok", overBy: 0 };
}

export function categoryRollup(rows: CostControlRow[]) {
  const by = new Map<string, CostControlRow[]>();
  for (const r of rows) by.set(r.category, [...(by.get(r.category) ?? []), r]);
  const roll = (category: string, xs: CostControlRow[]) => {
    const sell = round2(xs.reduce((s, x) => s + x.sell_amount, 0));
    const budget = xs.every((x) => x.budget != null) ? round2(xs.reduce((s, x) => s + (x.budget ?? 0), 0)) : null;
    const committed = round2(xs.reduce((s, x) => s + x.committed, 0));
    const actual = round2(xs.reduce((s, x) => s + x.actual, 0));
    return {
      category, sell, budget, committed, actual,
      plannedMargin: budget === null ? null : round2(sell - budget),
      variance: budget === null ? null : round2(Math.max(committed, actual) - budget),
    };
  };
  const cats = [...by.entries()].map(([c, xs]) => roll(c, xs)).sort((a, b) => b.sell - a.sell);
  return rows.length ? [...cats, roll("Total", rows)] : [];
}

export function costVariance(rows: CostControlRow[]): number | null {
  const budgeted = rows.filter((r) => r.budget != null);
  const budget = budgeted.reduce((s, r) => s + r.budget!, 0);
  if (budget <= 0) return null;
  return budgeted.reduce((s, r) => s + Math.max(0, r.committed - r.budget!), 0) / budget;
}

export const executionForecast = (rows: CostControlRow[]) =>
  round2(rows.reduce((s, r) => s + Math.max(r.budget ?? 0, r.committed, r.actual), 0));
```

`src/lib/procurement/scorecard.ts`:

```ts
import { round2 } from "@/lib/finance/money";
import type { CostControlRow, GoodsReceipt, PurchaseOrder, Snag, Vendor, VendorBill } from "@/types";

export interface ScoreRow {
  vendor_id: string; name: string; status: Vendor["status"]; spend: number;
  onTimePct: number | null; priceVariancePct: number | null; snagsPerLakh: number | null; avgFixHours: number | null;
}

const HOUR = 3_600_000;

export function vendorScorecard(
  vendors: Vendor[], pos: PurchaseOrder[], receipts: GoodsReceipt[], bills: VendorBill[], snags: Snag[],
  costRows: CostControlRow[], today: string,
): ScoreRow[] {
  const costRate = new Map(costRows.filter((r) => r.cost_rate != null).map((r) => [r.line_item_id, r.cost_rate!]));
  return vendors.map((v) => {
    const mine = pos.filter((o) => o.vendor_id === v.id && o.status !== "draft" && o.status !== "cancelled");
    // On time: fully received on or before expected date. Due: expected date has passed, or fully received.
    const due = mine.filter((o) => o.expected_delivery && (o.expected_delivery < today || o.lines.every((l) => l.received_qty >= l.quantity)));
    const onTime = due.filter((o) => {
      if (!o.lines.every((l) => l.received_qty >= l.quantity)) return false;
      const last = receipts.filter((g) => g.po_id === o.id).map((g) => g.received_on).sort().at(-1);
      return !!last && last <= o.expected_delivery!;
    });
    const linked = mine.flatMap((o) => o.lines).filter((l) => l.boq_line_item_id && costRate.has(l.boq_line_item_id));
    const budget = linked.reduce((s, l) => s + l.quantity * costRate.get(l.boq_line_item_id!)!, 0);
    const paid = linked.reduce((s, l) => s + l.amount, 0);
    const spend = round2(bills.filter((b) => b.vendor_id === v.id && b.status === "approved").reduce((s, b) => s + b.subtotal, 0));
    const vs = snags.filter((s) => s.vendor_id === v.id);
    const fixed = vs.filter((s) => s.fixed_at);
    return {
      vendor_id: v.id, name: v.name, status: v.status, spend,
      onTimePct: due.length ? Math.round((onTime.length / due.length) * 100) : null,
      priceVariancePct: budget > 0 ? Math.round(((paid - budget) / budget) * 100) : null,
      snagsPerLakh: spend > 0 ? round2(vs.length / (spend / 100000)) : null,
      avgFixHours: fixed.length ? Math.round(fixed.reduce((s, x) => s + (Date.parse(x.fixed_at!) - Date.parse(x.created_at)) / HOUR, 0) / fixed.length) : null,
    };
  }).sort((a, b) => b.spend - a.spend);
}
```

Run: `npm test` → PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/procurement
git commit -m "feat: cost control rollups, cost variance and vendor scorecard"
```

---

## Task 8: Profitability with vendor costs and the design/execution split

**Files:**
- Modify: `src/lib/finance/profitability.ts`, `src/lib/finance/profitability.test.ts`, `src/lib/metrics/portfolio.ts`

**Interfaces:**
- `ProfitInput` gains `vendorBills: VendorBill[]` and `costRows: CostControlRow[]` (both this project's; pass `[]` for design-only projects).
- `Profitability` gains `executionEarned: number`, `executionCost: number`, `executionMargin: number`, `plannedExecutionMargin: number | null`, `designMargin: number`.
- `directCost` now = approved/non-rejected expenses + approved vendor bills (subtotal, excluding GST because input GST is recoverable).
- EAC now = contract value − (labour + design direct) ÷ percent complete − execution forecast (`executionForecast(costRows)`; falls back to execution cost to date ÷ percent complete when there are no cost rows).
- `portfolioRows` passes `costVariance(costRows)` into `projectRisk`.

- [ ] **Step 1: Extend the tests (failing)**

Append to `profitability.test.ts`:

```ts
import type { CostControlRow, VendorBill } from "@/types";

describe("execution projects", () => {
  const exStages = [
    ...stages,
    { id: "X", project_id: "p", kind: "execution", name: "Advance", percent: 100, sort_order: 1, status: "in_progress", percent_complete: 50, checklist: [], amount: 500000, earned: 250000, invoiced: 0 },
  ] as FeeStage[];
  const vendorBills = [{ status: "approved", subtotal: 150000 }, { status: "disputed", subtotal: 99999 }] as VendorBill[];
  const execExpenses = [{ amount: 10000, cost_type: "design", status: "approved" }, { amount: 20000, cost_type: "execution", status: "approved" }, { amount: 5000, cost_type: "execution", status: "rejected" }] as Expense[];
  const costRows = [{ budget: 350000, committed: 360000, actual: 150000, sell_amount: 500000 }] as CostControlRow[];

  const p = projectProfitability({ stages: exStages, changeOrders, invoices, costs, expenses: execExpenses, vendorBills, costRows, useActual: false });

  it("splits execution margin from design margin", () => {
    expect(p.executionEarned).toBe(250000);
    expect(p.executionCost).toBe(170000);          // 150000 bills + 20000 execution expenses
    expect(p.executionMargin).toBe(80000);
    expect(p.plannedExecutionMargin).toBe(150000); // 500000 sell - 350000 budget
    expect(p.designMargin).toBe(p.marginToDate - 80000);
  });

  it("ignores disputed bills and rejected expenses", () => {
    expect(p.directCost).toBe(180000);              // 10000 + 20000 + 150000
  });

  it("uses the execution forecast in EAC", () => {
    // percentComplete = (120000 + 250000) / (300000 + 500000) = 0.4625
    // EAC = 845000 - (150000 labour + 10000 design direct) / 0.4625 - 360000 forecast
    expect(p.eacMargin).toBeCloseTo(845000 - 160000 / 0.4625 - 360000, 0);
  });
});
```

Update the earlier test calls to pass `vendorBills: [], costRows: []`, and give the existing `expenses` fixture `cost_type: "design", status: "approved"`.

Run: `npm test` → FAIL.

- [ ] **Step 2: Implement**

In `profitability.ts`:
- Add `vendorBills: VendorBill[]; costRows: CostControlRow[];` to `ProfitInput` and the five new fields to `Profitability`.
- Replace the direct-cost and EAC lines with:

```ts
  const liveExpenses = i.expenses.filter((e) => e.status !== "rejected");
  const designDirect = sum(liveExpenses.filter((e) => e.cost_type !== "execution").map((e) => e.amount));
  const execExpenses = sum(liveExpenses.filter((e) => e.cost_type === "execution").map((e) => e.amount));
  const bills = sum(i.vendorBills.filter((b) => b.status === "approved").map((b) => b.subtotal));
  const directCost = round2(designDirect + execExpenses + bills);

  const executionEarned = sum(i.stages.filter((s) => s.kind === "execution").map((s) => s.earned));
  const executionCost = round2(bills + execExpenses);
  const executionMargin = round2(executionEarned - executionCost);
  const plannedBudget = i.costRows.length && i.costRows.every((r) => r.budget != null) ? sum(i.costRows.map((r) => r.budget!)) : null;
  const plannedExecutionMargin = plannedBudget === null ? null : round2(sum(i.costRows.map((r) => r.sell_amount)) - plannedBudget);

  const marginToDate = round2(earned - labourCost - directCost);
  const percentComplete = stageAmount > 0 ? stageEarned / stageAmount : null;
  const execForecast = i.costRows.length ? executionForecast(i.costRows) : null;
  const eacMargin = percentComplete
    ? round2(contractValue - (labourCost + designDirect) / percentComplete - (execForecast ?? executionCost / percentComplete))
    : null;
```

and return `executionEarned, executionCost, executionMargin, plannedExecutionMargin, designMargin: round2(marginToDate - executionMargin)` alongside the existing fields. Import `executionForecast` from `@/lib/procurement/costControl`.

In `portfolio.ts`, pass `vendorBills: of(s.vendorBills), costRows: of(s.costControl)` to `projectProfitability` and `costVariance: s.costControl.some((r) => r.project_id === project.id) ? costVariance(of(s.costControl)) : null` to `projectRisk` (these snapshot fields arrive in Task 9; add them to the snapshot type first so this compiles).

- [ ] **Step 3: Verify and commit**

Run: `npm test` → PASS (after Task 9's snapshot fields exist, `npm run typecheck` passes too; run both at the end of Task 9).

```bash
git add src/lib/finance src/lib/metrics/portfolio.ts
git commit -m "feat: vendor costs, execution forecast and design/execution margin split"
```

---

## Task 9: Load procurement data into the workspace

**Files:**
- Modify: `src/lib/data/snapshot.ts`, `src/lib/data/mappers.ts` (+ test), `src/lib/data/load-workspace.ts`

**Interfaces:**
- Produces: `WorkspaceSnapshot` gains `vendors: Vendor[]`, `quotes: VendorQuote[]`, `purchaseOrders: PurchaseOrder[]`, `receipts: GoodsReceipt[]`, `vendorBills: VendorBill[]`, `vendorPayments: VendorPayment[]`, `costControl: CostControlRow[]`; mappers `mapVendor, mapQuote, mapPurchaseOrder, mapReceipt, mapVendorBill, mapVendorPayment, mapCostRow2` (name it `mapCostControlRow`); `mapExpense` fills `vendor_id, boq_line_item_id, cost_type, status`; `mapSnag` fills `vendor_id, vendor_name`; `mapLibraryItem` fills `standard_cost_rate`; `mapSettings` fills `approval_thresholds` (defaults `{ po_director: 100000, po_owner: 500000, expense: 10000 }`).

- [ ] **Step 1: Failing mapper test**

Append to `mappers.test.ts`:

```ts
import { mapPurchaseOrder } from "./mappers";

describe("mapPurchaseOrder", () => {
  it("attaches line progress and totals", () => {
    const po = mapPurchaseOrder(
      { id: "o", project_id: "p", vendor_id: "v", number: "PO/26-27/0001", status: "issued", order_date: "2026-10-01", expected_delivery: null,
        notes: null, approval_required_role: null, approved_by: null, approved_at: null, cancel_reason: null, created_by: "u", created_at: "2026-10-01T00:00:00Z",
        vendor: { name: "Bright" }, approver: null,
        lines: [{ id: "l", po_id: "o", boq_line_item_id: null, description: "Cable", unit: "m", quantity: 100, rate: 50, gst_rate: 18, amount: 5000 }] },
      new Map([["l", { po_line_id: "l", received_qty: 60, rejected_qty: 5, billed_qty: 55 }]]),
    );
    expect(po).toMatchObject({ vendor_name: "Bright", total: 5000 });
    expect(po.lines[0]).toMatchObject({ received_qty: 55, billed_qty: 55 });
  });
});
```

Run: `npm test` → FAIL.

- [ ] **Step 2: Implement**

`npm run db:types`, then add to `mappers.ts`:

```ts
type Progress = { po_line_id: string | null; received_qty: number | null; rejected_qty: number | null; billed_qty: number | null };

export function mapPurchaseOrder(
  r: Tables<"purchase_orders"> & { vendor: { name: string } | null; approver: { full_name: string } | null; lines: Tables<"po_lines">[] },
  progress: Map<string, Progress>,
): PurchaseOrder {
  const lines = r.lines.map((l) => {
    const p = progress.get(l.id);
    return {
      id: l.id, po_id: l.po_id, boq_line_item_id: opt(l.boq_line_item_id), description: l.description, unit: l.unit,
      quantity: l.quantity, rate: l.rate, gst_rate: l.gst_rate, amount: l.amount ?? 0,
      received_qty: (p?.received_qty ?? 0) - (p?.rejected_qty ?? 0), billed_qty: p?.billed_qty ?? 0,
    };
  });
  return {
    id: r.id, project_id: r.project_id, vendor_id: r.vendor_id, vendor_name: r.vendor?.name ?? "", number: opt(r.number),
    status: r.status, order_date: r.order_date, expected_delivery: opt(r.expected_delivery), notes: opt(r.notes),
    approval_required_role: opt(r.approval_required_role), approved_by_name: r.approver?.full_name, approved_at: opt(r.approved_at),
    created_by: opt(r.created_by), created_at: r.created_at, lines, total: round2(lines.reduce((s, l) => s + l.amount, 0)),
  };
}

export function mapVendor(r: Tables<"vendors">): Vendor {
  return { id: r.id, name: r.name, category: r.category, gstin: opt(r.gstin), pan: opt(r.pan), phone: opt(r.phone), email: opt(r.email),
    address: opt(r.address), payment_terms_days: r.payment_terms_days, status: r.status, notes: opt(r.notes) };
}

export function mapQuote(r: Tables<"vendor_quotes"> & { vendor: { name: string } | null }): VendorQuote {
  return { id: r.id, project_id: r.project_id, vendor_id: r.vendor_id, vendor_name: r.vendor?.name ?? "", boq_line_item_id: opt(r.boq_line_item_id),
    package_name: opt(r.package_name), description: opt(r.description), quantity: r.quantity, rate: r.rate, valid_until: opt(r.valid_until), received_at: r.received_at };
}

export function mapReceipt(r: Tables<"goods_receipts"> & { receiver: { full_name: string } | null; lines: Tables<"grn_lines">[] }, urlFor: UrlFor): GoodsReceipt {
  return { id: r.id, po_id: r.po_id, received_on: r.received_on, received_by_name: r.receiver?.full_name, notes: opt(r.notes), photo_url: urlFor(r.photo_url),
    lines: r.lines.map((l) => ({ po_line_id: l.po_line_id, quantity_received: l.quantity_received, quantity_rejected: l.quantity_rejected, condition_note: opt(l.condition_note) })) };
}

type BillSummary = { id: string | null; subtotal: number | null; gst_amount: number | null; total: number | null; paid: number | null; outstanding: number | null; match_issues: string[] | null };

export function mapVendorBill(r: Tables<"vendor_bills"> & { vendor: { name: string } | null; lines: Tables<"vendor_bill_lines">[] }, s: BillSummary | undefined, urlFor: UrlFor): VendorBill {
  return {
    id: r.id, vendor_id: r.vendor_id, vendor_name: r.vendor?.name ?? "", project_id: r.project_id, po_id: opt(r.po_id), bill_number: r.bill_number,
    bill_date: r.bill_date, due_date: opt(r.due_date), status: r.status, notes: opt(r.notes), file_url: urlFor(r.file_path),
    subtotal: s?.subtotal ?? 0, gst_amount: s?.gst_amount ?? 0, total: s?.total ?? 0, paid: s?.paid ?? 0, outstanding: s?.outstanding ?? 0,
    match_issues: s?.match_issues ?? [],
    lines: r.lines.map((l) => ({ id: l.id, po_line_id: opt(l.po_line_id), description: l.description, quantity: l.quantity, rate: l.rate, gst_rate: l.gst_rate, amount: l.amount ?? 0 })),
  };
}

export function mapVendorPayment(r: Tables<"vendor_payments">): VendorPayment {
  return { id: r.id, vendor_id: r.vendor_id, bill_id: opt(r.bill_id), project_id: r.project_id, amount: r.amount, tds_amount: r.tds_amount,
    paid_on: r.paid_on, mode: r.mode, reference: opt(r.reference), is_advance: r.is_advance };
}

export function mapCostControlRow(r: {
  project_id: string; line_item_id: string; category: string; description: string; unit: string; quantity: number; sell_rate: number;
  cost_rate: number | null; sell_amount: number; budget: number | null; committed: number; actual: number;
}): CostControlRow {
  return { ...r, cost_rate: opt(r.cost_rate), budget: opt(r.budget) };
}
```

Extend `mapExpense`, `mapSnag` (select adds `vendor:vendors(name)` → `vendor_name: r.vendor?.name`), `mapLibraryItem`, `mapSettings` as listed in Interfaces.

In `loadWorkspace` add to `Promise.all` (and `failed`):

```ts
    db.from("vendors").select("*").order("name"),
    db.from("vendor_quotes").select("*, vendor:vendors(name)").order("received_at", { ascending: false }),
    db.from("purchase_orders").select("*, vendor:vendors(name), approver:profiles!purchase_orders_approved_by_fkey(full_name), lines:po_lines(*)").order("created_at", { ascending: false }),
    db.from("po_line_progress").select("*"),
    db.from("goods_receipts").select("*, receiver:profiles!goods_receipts_received_by_fkey(full_name), lines:grn_lines(*)").order("received_on", { ascending: false }),
    db.from("vendor_bills").select("*, vendor:vendors(name), lines:vendor_bill_lines(*)").order("bill_date", { ascending: false }),
    db.from("vendor_bill_summary").select("*"),
    db.from("vendor_payments").select("*").order("paid_on", { ascending: false }),
    db.rpc("boq_cost_control"),
```

Add receipt `photo_url` and bill `file_path` to the signed-path list. Build `const progress = new Map((poProgress.data ?? []).map((p) => [p.po_line_id!, p]))` and `const billSummary = new Map((billSummaries.data ?? []).map((b) => [b.id, b]))`, then map each collection.

- [ ] **Step 3: Verify and commit**

Run: `npm test && npm run typecheck` → PASS.

```bash
git add src/lib/data src/lib/supabase/database.types.ts src/lib/finance src/lib/metrics
git commit -m "feat: load vendors, POs, receipts, bills and cost control into the workspace"
```

---

## Task 10: Procurement server actions and store

**Files:**
- Create: `src/app/actions/vendors.ts`, `src/app/actions/procurement.ts`, `src/app/actions/bills.ts`
- Modify: `src/lib/actions/schemas.ts` (+ test), `src/lib/store.ts`

**Interfaces:**
- Produces schemas: `vendorInput`, `vendorUpdate`, `lineCostInput { line_item_id, cost_rate }`, `quoteInput`, `poInput { project_id, vendor_id, order_date?, expected_delivery?, notes?, lines: poLine[] }` with `poLine { boq_line_item_id?, description, unit, quantity > 0, rate ≥ 0, gst_rate }`, `poDecisionInput { id }`, `cancelPoInput { id, reason }`, `receiptInput { po_id, received_on, notes?, photo_url?, lines: { po_line_id, quantity_received > 0, quantity_rejected ≥ 0 ≤ received, condition_note? }[] (min 1) }`, `billInput { vendor_id, project_id, po_id?, bill_number, bill_date, due_date?, notes?, file_path?, lines: { po_line_id?, description, quantity > 0, rate ≥ 0, gst_rate }[] (min 1) }`, `billDecisionInput { id, approve, note? }` (dispute requires note), `vendorPaymentInput { vendor_id, project_id, bill_id?, amount > 0, tds_amount ≥ 0, paid_on, mode, reference?, is_advance }` (bill required unless advance), `expenseDecisionInput { id, approve, note? }`; `expenseInput` gains `vendor_id?, boq_line_item_id?, cost_type (default design)`; `snagInput` gains `vendor_id?`; `libraryItemInput` gains `standard_cost_rate?`.
- Produces store actions (all `Promise<ActionResult>`): `saveVendor(v)`, `setLineCost(lineItemId, costRate)`, `addQuote(q)`, `createPurchaseOrder(po)` (returns PO id), `submitPurchaseOrder(id)`, `approvePurchaseOrder(id)`, `issuePurchaseOrder(id)`, `cancelPurchaseOrder(id, reason)`, `recordReceipt(r)`, `recordVendorBill(b)`, `decideVendorBill(id, approve, note?)`, `recordVendorPayment(p)`, `decideExpense(id, approve, note?)`.

- [ ] **Step 1: Schema tests (failing)**

Append to `schemas.test.ts`:

```ts
import { billInput, poInput, receiptInput, vendorPaymentInput } from "./schemas";

describe("procurement schemas", () => {
  const line = { description: "Cable", unit: "m", quantity: 10, rate: 50, gst_rate: 18 };
  it("requires PO lines", () => {
    expect(poInput.safeParse({ project_id: P, vendor_id: P, lines: [] }).success).toBe(false);
    expect(poInput.safeParse({ project_id: P, vendor_id: P, lines: [line] }).success).toBe(true);
  });
  it("rejects more rejected than received", () => {
    expect(receiptInput.safeParse({ po_id: P, received_on: "2026-10-09", lines: [{ po_line_id: P, quantity_received: 5, quantity_rejected: 6 }] }).success).toBe(false);
  });
  it("requires a bill number and lines", () => {
    expect(billInput.safeParse({ vendor_id: P, project_id: P, bill_number: "", bill_date: "2026-10-09", lines: [line] }).success).toBe(false);
  });
  it("requires a bill unless the payment is an advance", () => {
    expect(vendorPaymentInput.safeParse({ vendor_id: P, project_id: P, amount: 100, paid_on: "2026-10-09", mode: "upi", is_advance: false }).success).toBe(false);
    expect(vendorPaymentInput.safeParse({ vendor_id: P, project_id: P, amount: 100, paid_on: "2026-10-09", mode: "upi", is_advance: true }).success).toBe(true);
  });
});
```

Append to `schemas.ts`:

```ts
// Phase 3 ---------------------------------------------------------------------------
const gst = z.coerce.number().min(0).max(28).default(18);
export const vendorInput = z.object({
  name: text(150), category: text(60), gstin: optText(15), pan: optText(10), phone: optText(30),
  email: z.union([z.email(), z.literal("")]).optional().nullable().transform((v) => v || null),
  address: optText(300), payment_terms_days: z.coerce.number().int().min(0).max(180).default(30),
  status: z.enum(["active", "preferred", "blacklisted"]).default("active"), notes: optText(1000),
});
export const vendorUpdate = vendorInput.partial().extend({ id });
export const lineCostInput = z.object({ line_item_id: id, cost_rate: money });
export const quoteInput = z.object({
  project_id: id, vendor_id: id, boq_line_item_id: optId, package_name: optText(120), description: optText(500),
  quantity: z.coerce.number().positive(), rate: money, valid_until: optDate,
}).refine((q) => q.boq_line_item_id || q.package_name, { message: "Link a BOQ line or name the package", path: ["package_name"] });
const poLine = z.object({ boq_line_item_id: optId, description: text(300), unit: text(20), quantity: z.coerce.number().positive(), rate: money, gst_rate: gst });
export const poInput = z.object({
  project_id: id, vendor_id: id, order_date: optDate, expected_delivery: optDate, notes: optText(1000), lines: z.array(poLine).min(1).max(200),
});
export const cancelPoInput = z.object({ id, reason: text(300) });
export const receiptInput = z.object({
  po_id: id, received_on: date, notes: optText(500), photo_url: path.optional().nullable(),
  lines: z.array(z.object({
    po_line_id: id, quantity_received: z.coerce.number().positive(), quantity_rejected: z.coerce.number().min(0).default(0), condition_note: optText(300),
  }).refine((l) => l.quantity_rejected <= l.quantity_received, { message: "Rejected cannot exceed received", path: ["quantity_rejected"] })).min(1),
});
export const billInput = z.object({
  vendor_id: id, project_id: id, po_id: optId, bill_number: text(60), bill_date: date, due_date: optDate, notes: optText(500),
  file_path: path.optional().nullable(),
  lines: z.array(z.object({ po_line_id: optId, description: text(300), quantity: z.coerce.number().positive(), rate: money, gst_rate: gst })).min(1).max(200),
});
export const billDecisionInput = z.object({ id, approve: z.boolean(), note: optText(500) })
  .refine((d) => d.approve || !!d.note, { message: "Give a reason for the dispute", path: ["note"] });
export const vendorPaymentInput = z.object({
  vendor_id: id, project_id: id, bill_id: optId, amount: z.coerce.number().positive(), tds_amount: money.default(0), paid_on: date,
  mode: z.enum(["bank_transfer", "upi", "cheque", "cash"]), reference: optText(100), is_advance: z.boolean().default(false),
}).refine((p) => p.is_advance || !!p.bill_id, { message: "Choose the bill, or mark this as an advance", path: ["bill_id"] });
export const expenseDecisionInput = billDecisionInput;
```

Add `vendor_id: optId, boq_line_item_id: optId, cost_type: z.enum(["design", "execution"]).default("design"),` to `expenseInput`; `vendor_id: optId,` to `snagInput`; `standard_cost_rate: money.optional().nullable(),` to `libraryItemInput`.

Run: `npm test` → PASS.

- [ ] **Step 2: Server actions**

`src/app/actions/vendors.ts`:

```ts
"use server";
import { mutate } from "@/lib/actions/mutate";
import { lineCostInput, vendorInput, vendorUpdate } from "@/lib/actions/schemas";

export async function createVendor(input: unknown) {
  return mutate(vendorInput, input, (d, db) => db.from("vendors").insert(d).select("id").single());
}
export async function updateVendor(input: unknown) {
  return mutate(vendorUpdate, input, ({ id, ...d }, db) => db.from("vendors").update(d).eq("id", id).select("id").single());
}
export async function setLineCost(input: unknown) {
  return mutate(lineCostInput, input, (d, db) => db.from("boq_line_costs").upsert(d).select("line_item_id").single());
}
```

`src/app/actions/procurement.ts`:

```ts
"use server";
import { mutate } from "@/lib/actions/mutate";
import { cancelPoInput, idInput, poInput, quoteInput, receiptInput } from "@/lib/actions/schemas";

export async function addQuote(input: unknown) {
  return mutate(quoteInput, input, (d, db) => db.from("vendor_quotes").insert(d).select("id").single());
}

// Header then lines; if lines fail the draft header is deleted so no empty PO remains.
export async function createPurchaseOrder(input: unknown) {
  return mutate(poInput, input, async ({ lines, order_date, ...head }, db) => {
    const po = await db.from("purchase_orders").insert({ ...head, ...(order_date ? { order_date } : {}) }).select("id").single();
    if (po.error || !po.data) return po;
    const ins = await db.from("po_lines").insert(lines.map((l) => ({ ...l, po_id: po.data.id })));
    if (ins.error) {
      await db.from("purchase_orders").delete().eq("id", po.data.id);
      return { data: null, error: ins.error };
    }
    return po;
  });
}

export async function submitPurchaseOrder(input: unknown) {
  return mutate(idInput, input, ({ id }, db) => db.rpc("submit_po", { p_po: id }));
}
export async function approvePurchaseOrder(input: unknown) {
  return mutate(idInput, input, ({ id }, db) => db.rpc("approve_po", { p_po: id }));
}
export async function issuePurchaseOrder(input: unknown) {
  return mutate(idInput, input, ({ id }, db) => db.rpc("issue_po", { p_po: id }));
}
export async function cancelPurchaseOrder(input: unknown) {
  return mutate(cancelPoInput, input, ({ id, reason }, db) => db.rpc("cancel_po", { p_po: id, p_reason: reason }));
}

export async function recordReceipt(input: unknown) {
  return mutate(receiptInput, input, async ({ lines, ...head }, db) => {
    const grn = await db.from("goods_receipts").insert(head).select("id").single();
    if (grn.error || !grn.data) return grn;
    const ins = await db.from("grn_lines").insert(lines.map((l) => ({ ...l, grn_id: grn.data.id })));
    return ins.error ? { data: null, error: ins.error } : grn;
  });
}
```

`src/app/actions/bills.ts`:

```ts
"use server";
import { mutate } from "@/lib/actions/mutate";
import { billDecisionInput, billInput, expenseDecisionInput, vendorPaymentInput } from "@/lib/actions/schemas";

export async function recordVendorBill(input: unknown) {
  return mutate(billInput, input, async ({ lines, ...head }, db) => {
    const bill = await db.from("vendor_bills").insert(head).select("id").single();
    if (bill.error || !bill.data) return bill;
    const ins = await db.from("vendor_bill_lines").insert(lines.map((l) => ({ ...l, bill_id: bill.data.id })));
    if (ins.error) {
      await db.from("vendor_bills").delete().eq("id", bill.data.id);
      return { data: null, error: ins.error };
    }
    return bill;
  });
}

export async function decideVendorBill(input: unknown) {
  return mutate(billDecisionInput, input, (d, db) =>
    d.approve ? db.rpc("approve_vendor_bill", { p_bill: d.id }) : db.rpc("dispute_vendor_bill", { p_bill: d.id, p_note: d.note ?? "" }));
}

export async function recordVendorPayment(input: unknown) {
  return mutate(vendorPaymentInput, input, (d, db) => db.from("vendor_payments").insert(d).select("id").single());
}

export async function decideExpense(input: unknown) {
  return mutate(expenseDecisionInput, input, (d, db) => db.rpc("decide_expense", { p_expense: d.id, p_approve: d.approve, p_note: d.note ?? "" }));
}
```

Add a delete policy for draft bills used by the rollback above (new migration `20270101000600_bill_delete.sql`):

```sql
create policy bills_delete on vendor_bills for delete to authenticated using (can_procure(project_id) and status = 'recorded' and created_by = auth.uid());
```

- [ ] **Step 3: Store**

Import the three action modules and add (signatures from Interfaces):

```ts
    saveVendor: (v) => run(v.id ? vendorActions.updateVendor(v) : vendorActions.createVendor(v)),
    setLineCost: (lineItemId, costRate) => run(vendorActions.setLineCost({ line_item_id: lineItemId, cost_rate: costRate })),
    addQuote: (q) => run(procActions.addQuote(q)),
    createPurchaseOrder: (po) => run(procActions.createPurchaseOrder(po)),
    submitPurchaseOrder: (id) => run(procActions.submitPurchaseOrder({ id })),
    approvePurchaseOrder: (id) => run(procActions.approvePurchaseOrder({ id })),
    issuePurchaseOrder: (id) => run(procActions.issuePurchaseOrder({ id })),
    cancelPurchaseOrder: (id, reason) => run(procActions.cancelPurchaseOrder({ id, reason })),
    recordReceipt: (r) => run(procActions.recordReceipt(r)),
    recordVendorBill: (b) => run(billActions.recordVendorBill(b)),
    decideVendorBill: (id, approve, note) => run(billActions.decideVendorBill({ id, approve, note })),
    recordVendorPayment: (p) => run(billActions.recordVendorPayment(p)),
    decideExpense: (id, approve, note) => run(billActions.decideExpense({ id, approve, note })),
```

with `AppActions` members typed `(v: Partial<Vendor>) => Promise<ActionResult>`, `(po: { project_id: string; vendor_id: string; order_date?: string; expected_delivery?: string; notes?: string; lines: Partial<PoLine>[] }) => Promise<ActionResult>`, `(r: { po_id: string; received_on: string; notes?: string; photo_url?: string; lines: { po_line_id: string; quantity_received: number; quantity_rejected: number; condition_note?: string }[] }) => Promise<ActionResult>`, `(b: NewVendorBill) => Promise<ActionResult>` with `export type NewVendorBill = { vendor_id: string; project_id: string; po_id?: string; bill_number: string; bill_date: string; due_date?: string; notes?: string; file_path?: string; lines: { po_line_id?: string; description: string; quantity: number; rate: number; gst_rate: number }[] }` exported from `store.ts`, `(p: Partial<VendorPayment>) => Promise<ActionResult>`, and the rest as in Interfaces.

- [ ] **Step 4: Verify and commit**

Run: `npm run db:reset && npm test && npm run typecheck && npm run lint` → PASS.

```bash
git add supabase src
git commit -m "feat: procurement server actions and store wiring"
```

---

## Task 11: Procurement UI on the project

**Files:**
- Create: `src/components/procurement/CostControlTable.tsx`, `QuotesPanel.tsx`, `PurchaseOrders.tsx`, `PoDialog.tsx`, `ReceiveDialog.tsx`, `VendorBills.tsx`, `BillDialog.tsx`, `src/components/projects/ProcurementTab.tsx`, `src/app/(app)/purchase-orders/[id]/print/page.tsx`
- Modify: `src/app/(app)/projects/[id]/page.tsx`, `src/components/projects/SnagTab.tsx`, `src/components/projects/FinanceTab.tsx`

**Interfaces:**
- Produces: project tab "Procurement" (visible when `engagement_type === "design_and_execution"` and the user can see cost control or is a site supervisor) with four sections: Cost control, Quotes, Purchase orders (with receive), Vendor bills; printable PO at `/purchase-orders/[id]/print`.

- [ ] **Step 1: Cost control table**

`src/components/procurement/CostControlTable.tsx`:

```tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MetricInfo } from "@/components/metrics/MetricInfo";
import { NotEnoughData } from "@/components/metrics/NotEnoughData";
import { categoryRollup, lineVariance } from "@/lib/procurement/costControl";
import { useAppStore } from "@/lib/store";
import { cn, formatCurrency } from "@/lib/utils";
import type { CostControlRow } from "@/types";

export function CostControlTable({ rows }: { rows: CostControlRow[] }) {
  const { setLineCost } = useAppStore();
  if (rows.length === 0) return <NotEnoughData hint="Appears once the client approves a BOQ" />;
  const cats = categoryRollup(rows);
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-1">By category
          <MetricInfo formula="Budget = qty × cost rate; committed = approved/issued POs; actual = approved vendor bills + approved execution expenses" /></CardTitle></CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-xs text-muted-foreground text-left"><th className="py-2 px-4">Category</th>
              <th className="px-4 text-right">Sell</th><th className="px-4 text-right">Budget</th><th className="px-4 text-right">Planned margin</th>
              <th className="px-4 text-right">Committed</th><th className="px-4 text-right">Actual</th><th className="px-4 text-right">Variance</th></tr></thead>
            <tbody className="divide-y">{cats.map((c) => (
              <tr key={c.category} className={c.category === "Total" ? "font-semibold bg-muted/40" : ""}>
                <td className="py-2 px-4">{c.category}</td><td className="px-4 text-right">{formatCurrency(c.sell)}</td>
                <td className="px-4 text-right">{c.budget === null ? <span className="text-amber-600">Incomplete</span> : formatCurrency(c.budget)}</td>
                <td className="px-4 text-right">{c.plannedMargin === null ? "—" : formatCurrency(c.plannedMargin)}</td>
                <td className="px-4 text-right">{formatCurrency(c.committed)}</td><td className="px-4 text-right">{formatCurrency(c.actual)}</td>
                <td className={cn("px-4 text-right", (c.variance ?? 0) > 0 && "text-red-600")}>{c.variance === null ? "—" : formatCurrency(c.variance)}</td>
              </tr>
            ))}</tbody>
          </table>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-sm">By BOQ line</CardTitle></CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="border-b text-muted-foreground text-left"><th className="py-2 px-3">Item</th><th className="px-3 text-right">Qty</th>
              <th className="px-3 text-right">Sell rate</th><th className="px-3 text-right">Cost rate</th><th className="px-3 text-right">Budget</th>
              <th className="px-3 text-right">Committed</th><th className="px-3 text-right">Actual</th><th className="px-3">Status</th></tr></thead>
            <tbody className="divide-y">{rows.map((r) => {
              const v = lineVariance(r);
              return (
                <tr key={r.line_item_id}>
                  <td className="py-1.5 px-3">{r.description}<span className="block text-muted-foreground">{r.category}</span></td>
                  <td className="px-3 text-right">{r.quantity} {r.unit}</td><td className="px-3 text-right">{formatCurrency(r.sell_rate)}</td>
                  <td className="px-3 text-right">
                    <Input aria-label={`Cost rate for ${r.description}`} type="number" min="0" step="0.01" className="h-7 w-24 text-right ml-auto" defaultValue={r.cost_rate ?? ""}
                      onBlur={(e) => e.target.value !== "" && Number(e.target.value) !== r.cost_rate && setLineCost(r.line_item_id, Number(e.target.value))} />
                  </td>
                  <td className="px-3 text-right">{r.budget == null ? "—" : formatCurrency(r.budget)}</td>
                  <td className="px-3 text-right">{formatCurrency(r.committed)}</td><td className="px-3 text-right">{formatCurrency(r.actual)}</td>
                  <td className="px-3">{v.status === "no_budget" ? <span className="text-amber-600">No budget</span>
                    : v.status === "over" ? <span className="text-red-600 font-semibold">Over by {formatCurrency(v.overBy)}</span> : <span className="text-emerald-600">OK</span>}</td>
                </tr>
              );
            })}</tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Purchase orders, receipts and bills**

`src/components/procurement/PoDialog.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppStore } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";
import type { CostControlRow } from "@/types";

type Line = { boq_line_item_id: string; description: string; unit: string; quantity: string; rate: string; gst_rate: string };
const sel = "w-full h-9 rounded-md border border-input bg-background px-3 text-sm";

export function PoDialog({ projectId, lines, open, onOpenChange, preset }: {
  projectId: string; lines: CostControlRow[]; open: boolean; onOpenChange: (o: boolean) => void;
  preset?: { vendor_id: string; line?: Line };
}) {
  const { vendors, createPurchaseOrder, submitPurchaseOrder } = useAppStore();
  const [vendorId, setVendorId] = useState(preset?.vendor_id ?? "");
  const [expected, setExpected] = useState("");
  const [rows, setRows] = useState<Line[]>(preset?.line ? [preset.line] : []);
  const total = rows.reduce((s, r) => s + Number(r.quantity || 0) * Number(r.rate || 0), 0);

  const addFromBoq = (id: string) => {
    const l = lines.find((x) => x.line_item_id === id);
    if (l) setRows([...rows, { boq_line_item_id: l.line_item_id, description: l.description, unit: l.unit,
      quantity: String(l.quantity), rate: String(l.cost_rate ?? ""), gst_rate: "18" }]);
  };

  async function save(submit: boolean) {
    const r = await createPurchaseOrder({
      project_id: projectId, vendor_id: vendorId, expected_delivery: expected || undefined,
      lines: rows.map((x) => ({ boq_line_item_id: x.boq_line_item_id || undefined, description: x.description, unit: x.unit,
        quantity: Number(x.quantity), rate: Number(x.rate), gst_rate: Number(x.gst_rate) })),
    });
    if (r.ok && r.id && submit) await submitPurchaseOrder(r.id);
    if (r.ok) { setRows([]); onOpenChange(false); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader><DialogTitle>New purchase order</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1"><Label htmlFor="po-vendor">Vendor</Label>
            <select id="po-vendor" className={sel} value={vendorId} onChange={(e) => setVendorId(e.target.value)}>
              <option value="">Select vendor</option>
              {vendors.filter((v) => v.status !== "blacklisted").map((v) => <option key={v.id} value={v.id}>{v.name} · {v.category}</option>)}
            </select></div>
          <div className="space-y-1"><Label htmlFor="po-exp">Expected delivery</Label><Input id="po-exp" type="date" value={expected} onChange={(e) => setExpected(e.target.value)} /></div>
        </div>
        <select aria-label="Add BOQ line" className={sel} value="" onChange={(e) => addFromBoq(e.target.value)}>
          <option value="">+ Add a BOQ line</option>
          {lines.map((l) => <option key={l.line_item_id} value={l.line_item_id}>{l.category} · {l.description}</option>)}
        </select>
        <table className="w-full text-xs">
          <thead><tr className="text-muted-foreground text-left"><th>Description</th><th>Unit</th><th>Qty</th><th>Rate</th><th>GST %</th><th className="text-right">Amount</th></tr></thead>
          <tbody>{rows.map((r, i) => (
            <tr key={i}>
              {(["description", "unit", "quantity", "rate", "gst_rate"] as const).map((k) => (
                <td key={k} className="pr-1"><Input aria-label={k} className="h-8" value={r[k]} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, [k]: e.target.value } : x)))} /></td>
              ))}
              <td className="text-right">{formatCurrency(Number(r.quantity || 0) * Number(r.rate || 0))}</td>
            </tr>
          ))}</tbody>
        </table>
        <Button size="sm" variant="outline" onClick={() => setRows([...rows, { boq_line_item_id: "", description: "", unit: "nos", quantity: "1", rate: "0", gst_rate: "18" }])}>+ Unbudgeted line</Button>
        <p className="text-sm">Total before GST: <strong>{formatCurrency(total)}</strong></p>
        <DialogFooter>
          <Button variant="outline" onClick={() => save(false)} disabled={!vendorId || rows.length === 0}>Save draft</Button>
          <Button onClick={() => save(true)} disabled={!vendorId || rows.length === 0}>Submit</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

`src/components/procurement/ReceiveDialog.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PhotoInput } from "@/components/files/PhotoInput";
import { useAppStore } from "@/lib/store";
import { localToday } from "@/lib/utils";
import type { PurchaseOrder } from "@/types";

export function ReceiveDialog({ po, open, onOpenChange }: { po: PurchaseOrder; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { recordReceipt } = useAppStore();
  const outstanding = po.lines.filter((l) => l.received_qty < l.quantity);
  const [qty, setQty] = useState<Record<string, { rec: string; rej: string; note: string }>>({});
  const [photo, setPhoto] = useState<string | undefined>();

  async function save() {
    const lines = outstanding.filter((l) => Number(qty[l.id]?.rec) > 0).map((l) => ({
      po_line_id: l.id, quantity_received: Number(qty[l.id].rec), quantity_rejected: Number(qty[l.id].rej || 0), condition_note: qty[l.id].note || undefined,
    }));
    const r = await recordReceipt({ po_id: po.id, received_on: localToday(), photo_url: photo, lines });
    if (r.ok) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>Receive goods · {po.number}</DialogTitle></DialogHeader>
        <table className="w-full text-xs">
          <thead><tr className="text-muted-foreground text-left"><th>Item</th><th>Pending</th><th>Received</th><th>Rejected</th><th>Condition</th></tr></thead>
          <tbody>{outstanding.map((l) => (
            <tr key={l.id}>
              <td>{l.description}</td><td>{l.quantity - l.received_qty} {l.unit}</td>
              {(["rec", "rej", "note"] as const).map((k) => (
                <td key={k} className="pr-1"><Input aria-label={`${k} ${l.description}`} className="h-8" type={k === "note" ? "text" : "number"} min="0"
                  value={qty[l.id]?.[k] ?? ""} onChange={(e) => setQty({ ...qty, [l.id]: { rec: "", rej: "", note: "", ...qty[l.id], [k]: e.target.value } })} /></td>
              ))}
            </tr>
          ))}</tbody>
        </table>
        <PhotoInput projectId={po.project_id} label="Delivery photo / challan" onUploaded={setPhoto} />
        <DialogFooter><Button onClick={save}>Record receipt</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

`src/components/procurement/PurchaseOrders.tsx`:

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { hasAnyRole } from "@/lib/permissions";
import { useAppStore } from "@/lib/store";
import { formatCurrency, formatDate, localToday } from "@/lib/utils";
import type { CostControlRow, PurchaseOrder } from "@/types";
import { PoDialog } from "./PoDialog";
import { ReceiveDialog } from "./ReceiveDialog";

export function PurchaseOrders({ projectId, lines }: { projectId: string; lines: CostControlRow[] }) {
  const { me, purchaseOrders, approvePurchaseOrder, issuePurchaseOrder, submitPurchaseOrder, cancelPurchaseOrder } = useAppStore();
  const list = purchaseOrders.filter((o) => o.project_id === projectId);
  const [open, setOpen] = useState(false);
  const [receiving, setReceiving] = useState<PurchaseOrder | null>(null);
  const today = localToday();
  const canBuy = hasAnyRole(me, ["owner", "director", "project_manager", "finance", "procurement"]);
  const canApprove = (o: PurchaseOrder) => o.status === "pending_approval" && o.created_by !== me.id &&
    (me.roles.includes("owner") || (o.approval_required_role === "director" && me.roles.includes("director")));

  return (
    <div className="space-y-2">
      {canBuy && <div className="flex justify-end"><Button size="sm" onClick={() => setOpen(true)}>New purchase order</Button></div>}
      {list.map((o) => {
        const late = o.status === "issued" && o.expected_delivery && o.expected_delivery < today && o.lines.some((l) => l.received_qty < l.quantity);
        return (
          <Card key={o.id}><CardContent className="p-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold">{o.number ?? "Draft PO"} · {o.vendor_name}</p>
              <p className="text-xs text-muted-foreground">{formatCurrency(o.total)} + GST{o.expected_delivery ? ` · due ${formatDate(o.expected_delivery)}` : ""}
                {o.approval_required_role && o.status === "pending_approval" ? ` · needs ${o.approval_required_role}` : ""}</p>
            </div>
            <div className="flex items-center gap-2">
              {late && <Badge variant="destructive">Late</Badge>}
              <Badge variant="outline" className="capitalize">{o.status.replace("_", " ")}</Badge>
              {o.status === "draft" && canBuy && <Button size="sm" variant="outline" onClick={() => submitPurchaseOrder(o.id)}>Submit</Button>}
              {canApprove(o) && <Button size="sm" onClick={() => approvePurchaseOrder(o.id)}>Approve</Button>}
              {o.status === "approved" && canBuy && <Button size="sm" onClick={() => issuePurchaseOrder(o.id)}>Issue</Button>}
              {o.status === "issued" && <Button size="sm" variant="outline" onClick={() => setReceiving(o)}>Receive</Button>}
              {o.number && <Link href={`/purchase-orders/${o.id}/print`} target="_blank"><Button size="sm" variant="ghost">Print</Button></Link>}
              {["draft", "pending_approval", "approved", "issued"].includes(o.status) && canBuy && (
                <Button size="sm" variant="ghost" onClick={() => { const reason = window.prompt("Reason for cancelling?"); if (reason) cancelPurchaseOrder(o.id, reason); }}>Cancel</Button>
              )}
            </div>
          </CardContent></Card>
        );
      })}
      <PoDialog projectId={projectId} lines={lines} open={open} onOpenChange={setOpen} />
      {receiving && <ReceiveDialog po={receiving} open onOpenChange={(o) => !o && setReceiving(null)} />}
    </div>
  );
}
```

`src/components/procurement/BillDialog.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import { useAppStore } from "@/lib/store";
import { uploadToProject } from "@/lib/supabase/upload";
import { localToday } from "@/lib/utils";

// Bill lines are prefilled from the PO's accepted-but-unbilled quantities.
export function BillDialog({ projectId, open, onOpenChange }: { projectId: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { purchaseOrders, recordVendorBill } = useAppStore();
  const pos = purchaseOrders.filter((o) => o.project_id === projectId && (o.status === "issued" || o.status === "closed"));
  const [poId, setPoId] = useState("");
  const [billNo, setBillNo] = useState("");
  const [billDate, setBillDate] = useState(localToday());
  const [file, setFile] = useState<File | null>(null);
  const po = pos.find((o) => o.id === poId);
  const [lines, setLines] = useState<{ po_line_id: string; description: string; quantity: string; rate: string; gst_rate: string }[]>([]);

  const pick = (id: string) => {
    setPoId(id);
    const o = pos.find((x) => x.id === id);
    setLines((o?.lines ?? []).filter((l) => l.received_qty > l.billed_qty).map((l) => ({
      po_line_id: l.id, description: l.description, quantity: String(l.received_qty - l.billed_qty), rate: String(l.rate), gst_rate: String(l.gst_rate),
    })));
  };

  async function save() {
    if (!po) return;
    let file_path: string | undefined;
    try { if (file) file_path = await uploadToProject(projectId, file); }
    catch (e) { return toast.add({ title: "Upload failed", description: (e as Error).message, type: "error" }); }
    const r = await recordVendorBill({
      vendor_id: po.vendor_id, project_id: projectId, po_id: po.id, bill_number: billNo, bill_date: billDate, file_path,
      lines: lines.map((l) => ({ po_line_id: l.po_line_id, description: l.description, quantity: Number(l.quantity), rate: Number(l.rate), gst_rate: Number(l.gst_rate) })),
    });
    if (r.ok) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Record vendor bill</DialogTitle></DialogHeader>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1"><Label htmlFor="bill-po">Purchase order</Label>
            <select id="bill-po" className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" value={poId} onChange={(e) => pick(e.target.value)}>
              <option value="">Select PO</option>{pos.map((o) => <option key={o.id} value={o.id}>{o.number} · {o.vendor_name}</option>)}
            </select></div>
          <div className="space-y-1"><Label htmlFor="bill-no">Vendor bill no.</Label><Input id="bill-no" value={billNo} onChange={(e) => setBillNo(e.target.value)} /></div>
          <div className="space-y-1"><Label htmlFor="bill-date">Bill date</Label><Input id="bill-date" type="date" value={billDate} onChange={(e) => setBillDate(e.target.value)} /></div>
        </div>
        <table className="w-full text-xs"><tbody>{lines.map((l, i) => (
          <tr key={l.po_line_id}><td className="pr-2">{l.description}</td>
            {(["quantity", "rate", "gst_rate"] as const).map((k) => (
              <td key={k} className="pr-1"><Input aria-label={`${k} ${l.description}`} className="h-8" type="number" value={l[k]} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, [k]: e.target.value } : x)))} /></td>
            ))}</tr>
        ))}</tbody></table>
        <label className="text-xs">Bill scan (PDF/image) <input type="file" accept="application/pdf,image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></label>
        <DialogFooter><Button onClick={save} disabled={!po || !billNo || lines.length === 0}>Record bill</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

`src/components/procurement/VendorBills.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { hasAnyRole } from "@/lib/permissions";
import { useAppStore } from "@/lib/store";
import { formatCurrency, formatDate, localToday } from "@/lib/utils";
import { BillDialog } from "./BillDialog";

export function VendorBills({ projectId }: { projectId: string }) {
  const { me, vendorBills, decideVendorBill, recordVendorPayment } = useAppStore();
  const list = vendorBills.filter((b) => b.project_id === projectId);
  const [open, setOpen] = useState(false);
  const isFinance = hasAnyRole(me, ["owner", "finance"]);

  return (
    <div className="space-y-2">
      {hasAnyRole(me, ["owner", "finance", "procurement"]) && <div className="flex justify-end"><Button size="sm" onClick={() => setOpen(true)}>Record bill</Button></div>}
      {list.map((b) => (
        <Card key={b.id}><CardContent className="p-3 space-y-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold">{b.vendor_name} · {b.bill_number} <span className="font-normal text-muted-foreground">({formatDate(b.bill_date)})</span></p>
            <div className="flex items-center gap-2">
              <span className="text-sm">{formatCurrency(b.total)} · due {formatCurrency(b.outstanding)}</span>
              <Badge variant="outline" className="capitalize">{b.status}</Badge>
              {isFinance && b.status === "recorded" && (
                <>
                  <Button size="sm" disabled={b.match_issues.length > 0} onClick={() => decideVendorBill(b.id, true)}>Approve</Button>
                  <Button size="sm" variant="outline" onClick={() => { const n = window.prompt("Dispute reason?"); if (n) decideVendorBill(b.id, false, n); }}>Dispute</Button>
                </>
              )}
              {isFinance && b.status === "approved" && b.outstanding > 0 && (
                <Button size="sm" variant="outline" onClick={() => recordVendorPayment({ vendor_id: b.vendor_id, project_id: projectId, bill_id: b.id, amount: b.outstanding, paid_on: localToday(), mode: "bank_transfer" })}>
                  Mark paid
                </Button>
              )}
              {b.file_url && <a href={b.file_url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">View bill</a>}
            </div>
          </div>
          {b.match_issues.length > 0 && <ul className="text-xs text-red-600 list-disc pl-4">{b.match_issues.map((m) => <li key={m}>{m}</li>)}</ul>}
        </CardContent></Card>
      ))}
      <BillDialog projectId={projectId} open={open} onOpenChange={setOpen} />
    </div>
  );
}
```

`src/components/procurement/QuotesPanel.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";
import type { CostControlRow } from "@/types";
import { PoDialog } from "./PoDialog";

// Compare quotes per BOQ line; turn the chosen quote into a draft PO.
export function QuotesPanel({ projectId, lines }: { projectId: string; lines: CostControlRow[] }) {
  const { quotes, vendors, addQuote } = useAppStore();
  const mine = quotes.filter((q) => q.project_id === projectId);
  const [form, setForm] = useState({ boq_line_item_id: "", vendor_id: "", quantity: "", rate: "" });
  const [preset, setPreset] = useState<Parameters<typeof PoDialog>[0]["preset"]>();

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">Quotes</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <select aria-label="BOQ line" className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={form.boq_line_item_id} onChange={(e) => setForm({ ...form, boq_line_item_id: e.target.value })}>
            <option value="">BOQ line</option>{lines.map((l) => <option key={l.line_item_id} value={l.line_item_id}>{l.description}</option>)}
          </select>
          <select aria-label="Vendor" className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={form.vendor_id} onChange={(e) => setForm({ ...form, vendor_id: e.target.value })}>
            <option value="">Vendor</option>{vendors.filter((v) => v.status !== "blacklisted").map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
          <Input aria-label="Quantity" className="w-24 h-9" placeholder="Qty" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
          <Input aria-label="Rate" className="w-28 h-9" placeholder="Rate" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} />
          <Button size="sm" disabled={!form.boq_line_item_id || !form.vendor_id} onClick={async () => {
            const r = await addQuote({ project_id: projectId, ...form, quantity: Number(form.quantity), rate: Number(form.rate) });
            if (r.ok) setForm({ boq_line_item_id: "", vendor_id: "", quantity: "", rate: "" });
          }}>Add quote</Button>
        </div>
        {lines.filter((l) => mine.some((q) => q.boq_line_item_id === l.line_item_id)).map((l) => {
          const qs = mine.filter((q) => q.boq_line_item_id === l.line_item_id).sort((a, b) => a.rate - b.rate);
          return (
            <div key={l.line_item_id} className="border rounded-lg p-2">
              <p className="text-xs font-semibold">{l.description} · budget rate {l.cost_rate == null ? "—" : formatCurrency(l.cost_rate)}</p>
              {qs.map((q, i) => (
                <div key={q.id} className="flex items-center justify-between text-xs py-1">
                  <span className={i === 0 ? "text-emerald-700 font-semibold" : ""}>{q.vendor_name}: {formatCurrency(q.rate)} × {q.quantity}</span>
                  <Button size="sm" variant="ghost" onClick={() => setPreset({ vendor_id: q.vendor_id, line: { boq_line_item_id: l.line_item_id, description: l.description, unit: l.unit, quantity: String(q.quantity), rate: String(q.rate), gst_rate: "18" } })}>Create PO</Button>
                </div>
              ))}
            </div>
          );
        })}
        {preset && <PoDialog key={JSON.stringify(preset)} projectId={projectId} lines={lines} open preset={preset} onOpenChange={(o) => !o && setPreset(undefined)} />}
      </CardContent>
    </Card>
  );
}
```

`src/components/projects/ProcurementTab.tsx`:

```tsx
"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CostControlTable } from "@/components/procurement/CostControlTable";
import { PurchaseOrders } from "@/components/procurement/PurchaseOrders";
import { QuotesPanel } from "@/components/procurement/QuotesPanel";
import { VendorBills } from "@/components/procurement/VendorBills";
import { useAppStore } from "@/lib/store";
import type { Project } from "@/types";

export default function ProcurementTab({ project }: { project: Project }) {
  const { costControl } = useAppStore();
  const lines = costControl.filter((r) => r.project_id === project.id);
  const canSeeCosts = lines.length > 0;   // RLS returns cost rows only to roles allowed to see them
  return (
    <Tabs defaultValue={canSeeCosts ? "cost" : "pos"}>
      <TabsList>
        {canSeeCosts && <TabsTrigger value="cost">Cost control</TabsTrigger>}
        {canSeeCosts && <TabsTrigger value="quotes">Quotes</TabsTrigger>}
        <TabsTrigger value="pos">Purchase orders</TabsTrigger>
        {canSeeCosts && <TabsTrigger value="bills">Vendor bills</TabsTrigger>}
      </TabsList>
      {canSeeCosts && <TabsContent value="cost" className="mt-4"><CostControlTable rows={lines} /></TabsContent>}
      {canSeeCosts && <TabsContent value="quotes" className="mt-4"><QuotesPanel projectId={project.id} lines={lines} /></TabsContent>}
      <TabsContent value="pos" className="mt-4"><PurchaseOrders projectId={project.id} lines={lines} /></TabsContent>
      {canSeeCosts && <TabsContent value="bills" className="mt-4"><VendorBills projectId={project.id} /></TabsContent>}
    </Tabs>
  );
}
```

`src/app/(app)/purchase-orders/[id]/print/page.tsx`:

```tsx
"use client";

import { use, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function PoPrint({ params }: { params: Promise<{ id: string }> }) {
  return <Suspense><Content params={params} /></Suspense>;
}

function Content({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { purchaseOrders, vendors, projects, studioSettings } = useAppStore();
  const po = purchaseOrders.find((o) => o.id === id);
  if (!po) return <p className="p-6">Purchase order not found.</p>;
  const vendor = vendors.find((v) => v.id === po.vendor_id);
  const project = projects.find((p) => p.id === po.project_id);
  const gst = po.lines.reduce((s, l) => s + (l.amount * l.gst_rate) / 100, 0);
  return (
    <div className="max-w-3xl mx-auto p-8 space-y-6 bg-white text-black">
      <div className="flex justify-between">
        <div><h1 className="text-xl font-bold">{studioSettings.name}</h1><p className="text-sm">{studioSettings.address}</p><p className="text-sm">GSTIN {studioSettings.gstin}</p></div>
        <div className="text-right"><h2 className="text-lg font-bold">PURCHASE ORDER</h2><p>{po.number}</p><p className="text-sm">{formatDate(po.order_date)}</p></div>
      </div>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div><p className="font-semibold">Vendor</p><p>{vendor?.name}</p><p>{vendor?.address}</p><p>GSTIN {vendor?.gstin ?? "—"}</p></div>
        <div><p className="font-semibold">Deliver to</p><p>{project?.name}</p><p>{project?.property_address}</p>
          {po.expected_delivery && <p>By {formatDate(po.expected_delivery)}</p>}</div>
      </div>
      <table className="w-full text-sm border-collapse">
        <thead><tr className="border-b text-left"><th>#</th><th>Description</th><th className="text-right">Qty</th><th className="text-right">Rate</th><th className="text-right">GST</th><th className="text-right">Amount</th></tr></thead>
        <tbody>{po.lines.map((l, i) => (
          <tr key={l.id} className="border-b"><td>{i + 1}</td><td>{l.description}</td><td className="text-right">{l.quantity} {l.unit}</td>
            <td className="text-right">{formatCurrency(l.rate)}</td><td className="text-right">{l.gst_rate}%</td><td className="text-right">{formatCurrency(l.amount)}</td></tr>
        ))}</tbody>
      </table>
      <div className="text-right text-sm"><p>Subtotal {formatCurrency(po.total)}</p><p>GST {formatCurrency(gst)}</p><p className="font-bold">Total {formatCurrency(po.total + gst)}</p></div>
      {po.approved_by_name && <p className="text-xs">Approved by {po.approved_by_name}</p>}
      <Button className="print:hidden" onClick={() => window.print()}>Print</Button>
    </div>
  );
}
```

- [ ] **Step 3: Wire into existing screens**

- `projects/[id]/page.tsx`: add `<TabsTrigger value="procurement">Procurement</TabsTrigger>` and its `TabsContent` rendering `<ProcurementTab project={project} />`, both only when `project.engagement_type === "design_and_execution"`.
- `SnagTab.tsx`: in the raise form and detail panel, add a vendor `<select>` (from `vendors`) bound to `vendor_id`, labelled "Responsible vendor/contractor".
- `FinanceTab.tsx`: expense dialog gains "Vendor" (select), "BOQ line" (select of `costControl` rows for this project; selecting one sets cost type to execution) and receipt upload via `uploadToProject` into `receipt_url`; list shows a "Pending approval" badge, and for owner/finance Approve/Reject buttons calling `decideExpense`.

- [ ] **Step 4: Verify and commit**

Run: `npm run typecheck && npm test && npm run lint` → PASS.

Manual (approve Sharma's BOQ v1 in the portal as Arun first): as Kunal (procurement) open Sharma → Procurement: set cost rates 70 and 18; add two quotes for the ceiling line and "Create PO" from the cheaper one; submit → auto-approved and numbered. Create a ₹1,50,000 unbudgeted PO → "needs director"; Kunal sees no Approve button; Vikram approves; Kunal issues. As Aarav receive 60 of 100 with 5 rejected and a photo. As Meera record a bill for 60 @ a higher rate → issues listed, Approve disabled; correct to 55 @ PO rate → approve → mark paid. Cost control shows committed and actual moving. As Arun, the portal BOQ page network payload contains no `cost_rate`.

```bash
git add src
git commit -m "feat: project procurement: cost control, quotes, POs, receipts and vendor bills"
```

---

## Task 12: Vendors page, site dashboard, payables and GST input credit

**Files:**
- Create: `src/app/(app)/vendors/page.tsx`, `src/components/dashboard/SiteDashboard.tsx`
- Modify: `src/components/layout/AppSidebar.tsx`, `src/app/(app)/dashboard/page.tsx`, `src/app/(app)/finance/page.tsx`, `src/app/(app)/reports/page.tsx`, `src/lib/metrics/kpis.ts` (+ test), `src/app/(app)/settings/page.tsx`

**Interfaces:**
- Produces: `/vendors` (owner, director, PM, finance, procurement) with list, add/edit dialog, status, and scorecard columns; `SiteDashboard` for `site_supervisor` (deliveries due/late today with Receive buttons, open snags on their projects, link to timesheet); Finance page "Payables due in 7 days" card; `inputGst(bills: VendorBill[], from: string, to: string): number` in `kpis.ts`; Reports GST tab shows input tax credit and net GST (with caption "Estimate; reconcile with GSTR-2B in your accounting system"); Settings "Risk & targets" tab also edits `approval_thresholds`.

- [ ] **Step 1: inputGst (test first)**

Append to `kpis.test.ts`:

```ts
import { inputGst } from "./kpis";
import type { VendorBill } from "@/types";

describe("inputGst", () => {
  it("sums GST on approved vendor bills in range", () => {
    expect(inputGst([
      { status: "approved", bill_date: "2026-05-01", gst_amount: 900 },
      { status: "disputed", bill_date: "2026-05-01", gst_amount: 500 },
      { status: "approved", bill_date: "2026-03-01", gst_amount: 100 },
    ] as VendorBill[], "2026-04-01", "2026-10-09")).toBe(900);
  });
});
```

Append to `kpis.ts`:

```ts
export function inputGst(bills: VendorBill[], from: string, to: string): number {
  return sum(bills.filter((b) => b.status === "approved" && b.bill_date >= from && b.bill_date <= to).map((b) => b.gst_amount));
}
```

(import `VendorBill` type). Run `npm test` → PASS.

- [ ] **Step 2: Vendors page**

`src/app/(app)/vendors/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { TopBar } from "@/components/layout/AppSidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MetricInfo } from "@/components/metrics/MetricInfo";
import { vendorScorecard } from "@/lib/procurement/scorecard";
import { useAppStore } from "@/lib/store";
import { formatCurrency, localToday } from "@/lib/utils";
import type { Vendor, VendorStatus } from "@/types";

const EMPTY: Partial<Vendor> = { name: "", category: "", gstin: "", phone: "", email: "", payment_terms_days: 30, status: "active" };

export default function VendorsPage() {
  const { vendors, purchaseOrders, receipts, vendorBills, snags, costControl, saveVendor } = useAppStore();
  const [edit, setEdit] = useState<Partial<Vendor> | null>(null);
  const score = new Map(vendorScorecard(vendors, purchaseOrders, receipts, vendorBills, snags, costControl, localToday()).map((s) => [s.vendor_id, s]));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!edit) return;
    const r = await saveVendor(edit);
    if (r.ok) setEdit(null);
  }

  return (
    <div>
      <TopBar title="Vendors & contractors" subtitle="Performance from purchase orders, receipts, bills and snags" />
      <div className="p-6 space-y-4">
        <div className="flex justify-end"><Button onClick={() => setEdit(EMPTY)}>Add vendor</Button></div>
        <Card><CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-xs text-muted-foreground text-left">
              <th className="py-2 px-4">Vendor</th><th className="px-4">Status</th><th className="px-4 text-right">Spend</th>
              <th className="px-4 text-right">On time <MetricInfo formula="POs fully received by the expected date ÷ POs that were due" /></th>
              <th className="px-4 text-right">Price vs budget <MetricInfo formula="(PO amount − BOQ cost budget) ÷ budget, on lines linked to the BOQ" /></th>
              <th className="px-4 text-right">Snags / ₹1L <MetricInfo formula="Snags assigned to the vendor ÷ (approved bills ÷ 1,00,000)" /></th>
              <th className="px-4 text-right">Avg fix (h)</th><th />
            </tr></thead>
            <tbody className="divide-y">{vendors.map((v) => {
              const s = score.get(v.id);
              return (
                <tr key={v.id}>
                  <td className="py-2 px-4">{v.name}<span className="block text-xs text-muted-foreground">{v.category}</span></td>
                  <td className="px-4"><Badge variant={v.status === "blacklisted" ? "destructive" : "outline"} className="capitalize">{v.status}</Badge></td>
                  <td className="px-4 text-right">{formatCurrency(s?.spend ?? 0)}</td>
                  <td className="px-4 text-right">{s?.onTimePct == null ? "—" : `${s.onTimePct}%`}</td>
                  <td className={`px-4 text-right ${(s?.priceVariancePct ?? 0) > 0 ? "text-red-600" : ""}`}>{s?.priceVariancePct == null ? "—" : `${s.priceVariancePct}%`}</td>
                  <td className="px-4 text-right">{s?.snagsPerLakh ?? "—"}</td>
                  <td className="px-4 text-right">{s?.avgFixHours ?? "—"}</td>
                  <td className="px-4"><Button size="sm" variant="ghost" onClick={() => setEdit(v)}>Edit</Button></td>
                </tr>
              );
            })}</tbody>
          </table>
        </CardContent></Card>
      </div>
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{edit?.id ? "Edit vendor" : "Add vendor"}</DialogTitle></DialogHeader>
          {edit && (
            <form onSubmit={save} className="space-y-3">
              {(["name", "category", "gstin", "phone", "email"] as const).map((k) => (
                <div key={k} className="space-y-1"><Label htmlFor={`v-${k}`} className="capitalize">{k}</Label>
                  <Input id={`v-${k}`} required={k === "name" || k === "category"} value={edit[k] ?? ""} onChange={(e) => setEdit({ ...edit, [k]: e.target.value })} /></div>
              ))}
              <div className="space-y-1"><Label htmlFor="v-terms">Payment terms (days)</Label>
                <Input id="v-terms" type="number" min="0" value={edit.payment_terms_days ?? 30} onChange={(e) => setEdit({ ...edit, payment_terms_days: Number(e.target.value) })} /></div>
              <div className="space-y-1"><Label htmlFor="v-status">Status</Label>
                <select id="v-status" className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" value={edit.status}
                  onChange={(e) => setEdit({ ...edit, status: e.target.value as VendorStatus })}>
                  <option value="active">Active</option><option value="preferred">Preferred</option><option value="blacklisted">Blacklisted</option>
                </select></div>
              <DialogFooter><Button type="submit">Save</Button></DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

- [ ] **Step 3: Site dashboard**

`src/components/dashboard/SiteDashboard.tsx`:

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReceiveDialog } from "@/components/procurement/ReceiveDialog";
import { useAppStore } from "@/lib/store";
import { formatDate, localToday } from "@/lib/utils";
import type { PurchaseOrder } from "@/types";

export function SiteDashboard() {
  const { purchaseOrders, snags, projects } = useAppStore();
  const today = localToday();
  const [receiving, setReceiving] = useState<PurchaseOrder | null>(null);
  const due = purchaseOrders.filter((o) => o.status === "issued" && o.expected_delivery && o.expected_delivery <= today && o.lines.some((l) => l.received_qty < l.quantity));
  const open = snags.filter((s) => s.status !== "closed" && s.status !== "verified");
  const name = (id: string) => projects.find((p) => p.id === id)?.name ?? "";

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Deliveries due or late</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">{due.length === 0 ? <p className="text-muted-foreground">Nothing due.</p> : due.map((o) => (
          <div key={o.id} className="flex items-center justify-between gap-2">
            <span className={o.expected_delivery! < today ? "text-red-600" : ""}>{o.vendor_name} · {name(o.project_id)} · {formatDate(o.expected_delivery!)}</span>
            <Button size="sm" variant="outline" onClick={() => setReceiving(o)}>Receive</Button>
          </div>
        ))}</CardContent></Card>
      <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Open snags ({open.length})</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm">{open.slice(0, 10).map((s) => (
          <p key={s.id} className={s.priority === "critical" ? "text-red-600" : ""}>
            <Link href={`/projects/${s.project_id}`} className="hover:underline">{s.title}</Link> · {name(s.project_id)}{s.vendor_name ? ` · ${s.vendor_name}` : ""}
          </p>
        ))}</CardContent></Card>
      {receiving && <ReceiveDialog po={receiving} open onOpenChange={(o) => !o && setReceiving(null)} />}
    </div>
  );
}
```

In `dashboard/page.tsx` add a branch before `MyWeekDashboard`: `: me.roles.includes("site_supervisor") ? <><SiteDashboard /><MyWeekDashboard /></>`.

- [ ] **Step 4: Navigation, payables, GST, thresholds**

- Sidebar: `{ href: "/vendors", label: "Vendors", icon: Truck, roles: ["owner", "director", "project_manager", "finance", "procurement"] }`; give Procurement the Projects item (already visible to all staff).
- Finance page: card "Payables due in 7 days" listing approved vendor bills with `outstanding > 0` and `due_date ≤ today + 7`, with totals; and "Expenses awaiting approval" listing `expenses.filter(e => e.status === "pending")` with Approve/Reject via `decideExpense`.
- Reports GST tab: replace the ITC `NotEnoughData` with `inputGst(vendorBills, fyStart(today), today)` and show "Net GST (estimate) = output − input" with the caption "Estimate; reconcile with GSTR-2B in your accounting system before filing".
- Settings "Risk & targets": add three number inputs for `approval_thresholds` (`po_director`, `po_owner`, `expense`) saved through `updateSettings({ approval_thresholds })` (add `approval_thresholds: z.object({ po_director: money, po_owner: money, expense: money }).optional()` to `settingsInput`, with a refine that `po_owner > po_director`).

- [ ] **Step 5: Verify and commit**

Run: `npm run typecheck && npm test && npm run lint && npm run build` → PASS.

Manual: Aarav's dashboard lists the issued PO under "Deliveries due" once its expected date passes and receiving from there works; `/vendors` shows Bright Electricals with spend and on-time %; Finance shows the payable; Reports GST tab shows input credit from the approved bill.

```bash
git add src
git commit -m "feat: vendors scorecard, site dashboard, payables, input GST and threshold settings"
```

---

## Task 13: Phase 3 exit verification

- [ ] **Step 1: Automated checks**

```bash
npm run db:reset && npm run test:db && npm test && npm run typecheck && npm run lint && npm run build
```

- [ ] **Step 2: Privacy check**

Signed in as `arun@client.test`, open the portal BOQ page with DevTools → Network, reload, search payloads for `cost_rate`, `boq_line_costs` and a vendor name. Expected: no matches. Repeat as `neha@studio.test` (architect) on the Sharma project page: no `cost_rate`.

- [ ] **Step 3: Exit criteria (spec 9.2)**

- Every new execution project has cost rates on all BOQ lines: Cost control shows no "No budget" lines for projects whose BOQ was approved after go-live.
- POs are raised in the system: no PO numbers issued outside it during the month after go-live (confirm with Procurement).
- Budget vs committed vs actual visible per line (Procurement tab) and the risk score's cost-variance factor appears on execution projects (hover the risk badge).
- Vendor scorecard populated for every vendor with an approved bill.

- [ ] **Step 4: Tag**

```bash
git tag phase-3-complete
```
