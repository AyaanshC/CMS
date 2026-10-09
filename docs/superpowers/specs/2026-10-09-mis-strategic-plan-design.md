# Strategic Plan: Evolving the Studio CMS into a Decision-Support MIS

**Date:** 2026-10-09
**Branch:** `Krish`
**Status:** Approved design, pending written-spec review
**Audience:** Firm owners and directors (sections 1–4, 9–11), engineering team (sections 3, 5–8, 10)

---

## 0. Executive Summary

The current codebase is a well-designed **front-end prototype** of a studio management system: clients, an 8-stage project pipeline, versioned BOQs with client approval, snags, tasks, files, invoices, expenses, a client portal and a public onboarding wizard. It looks like a working product, but it has **no backend, no authentication, no persistence**, and nearly every management number on the Dashboard and Reports pages is **hardcoded**.

More importantly, even with a backend added, the system **does not capture the data that management decisions depend on**: staff hours, staff cost, fee stages, purchase costs, vendor commitments, lead outcomes, and approval status. Without that data, no dashboard can answer the questions owners actually ask:

- *Which projects are making money, and which are quietly losing it?*
- *Will we have cash to pay salaries in eight weeks?*
- *Who is overloaded, who is idle, and can we take the next project?*
- *Where is the execution margin leaking?*
- *Which clients and lead sources are worth pursuing?*

This plan transforms the system in six phases (about six months to the end of Phase 4 with a 2–4 developer team using AI assistance):

| Phase | Theme | What management gets |
|---|---|---|
| 0 | Foundation | Data that persists, secure role-based access, honest numbers |
| 1 | Fees & Billing | Stage-driven invoicing, visibility of unbilled work, automated collections |
| 2 | Time & Profitability | Real project margin, fee burn, utilisation, project risk score |
| 3 | Execution Cost Control | Budget vs committed vs actual on every BOQ line, vendor accountability |
| 4 | Planning & Growth | 13-week cash forecast, capacity planning, pipeline analytics, compliance tracking |
| 5 | Scale | Accounting sync, vendor portal, multi-office, benchmarks, AI assistance |

Guiding principles:

1. **Data before dashboards.** Every metric is backed by data captured as a by-product of normal work.
2. **Every metric drives a decision.** If no one would act on a number, it is not built.
3. **The MIS is not the accounting system.** Tally / Zoho Books remain the statutory books; the MIS owns management numbers.
4. **Vertical slices.** Each phase is usable by the firm on its own, so value arrives every 4–6 weeks.

---

## 1. Context and Agreed Understanding

### 1.1 What was requested

A prioritised, business-grounded plan to evolve the first-draft system into a comprehensive MIS and decision-support tool for an architecture firm, covering business challenges, gap analysis, roles and permissions, modules, dashboards, analytics, alerts, and a roadmap with dependencies, impact, complexity, risks and success metrics.

### 1.2 Decisions confirmed during brainstorming

| Question | Decision |
|---|---|
| Firm type | **Hybrid practice**: architecture + interiors, with some projects fee-only (design services) and some design + execution (turnkey). The current code models only the interiors/turnkey case. |
| Firm size | **Mid-size**: 15–50 staff, 20–60 live projects, with directors/associates, dedicated PMs, site team, 1–2 finance/admin staff. Design must scale to multi-office later. |
| Build team | **2–4 developers with AI assistance**. Two parallel tracks are possible. |
| Strategy | **Approach 1**: foundation first, then insight-led vertical slices ordered by money impact. |
| Backend | **Supabase** (Postgres, Auth, Row-Level Security, Storage). |
| Accounting | **Tally / Zoho Books stay the system of record** for the ledger and GST filing. The MIS integrates later; it does not replace them. |
| Procurement role | An **assignable role**, not necessarily a dedicated person. A PM or finance staff member may hold it. |

### 1.3 Assumptions

- The firm operates in India (INR, GST, GSTIN/PAN, Indian statutory approvals). This matches the existing code (`StudioSettings.gstin`, ₹ formatting, Bangalore address).
- Clients reach the firm through referrals, website, Instagram and walk-ins (`ClientSource` in `src/types/index.ts`).
- WhatsApp is the dominant client communication channel.

---

## 2. Current State of the System

### 2.1 Technology

| Layer | Current | Notes |
|---|---|---|
| Framework | Next.js 16.4 (App Router), React 19.3, TypeScript | `cacheComponents` and `partialPrefetching` enabled in `next.config.ts`. Per `AGENTS.md`, this Next.js version has breaking changes; implementers must read `node_modules/next/dist/docs/` before writing server code. |
| UI | shadcn (`base-nova` style) on `@base-ui/react`, Tailwind 4, lucide icons, Recharts | Clean, consistent component library in `src/components/ui/`. |
| State | Zustand store, `src/lib/store.ts` (497 lines) | Initialised from mock arrays. In-memory only; a page refresh resets everything. |
| Data | `src/lib/mock-data.ts` (657 lines) | Single studio ("Priya Designs Studio"), single user ("Priya Sharma"). |
| Backend / DB | **None** | |
| Auth | **None** | `MOCK_USER` hardcoded in `AppSidebar.tsx`. |
| Tests | **None** | |
| Installed but unused | `@dnd-kit/*`, `react-dropzone`, `cmdk` | Available for Kanban boards, real uploads and a command palette. |

### 2.2 Module inventory

| Module | Location | What works | What is missing or simulated |
|---|---|---|---|
| Dashboard | `src/app/(app)/dashboard/page.tsx` | Active projects list and upcoming tasks read from the store | All six KPI cards hardcoded (`KPI_CARDS`, lines 26–87). Revenue chart and stage donut use static `MOCK_REVENUE_DATA` / `MOCK_PROJECT_STATUS_DATA`. Greeting hardcoded to "Priya". |
| Clients | `clients/page.tsx`, `clients/[id]/page.tsx`, `AddClientModal.tsx` | List, search, profile with projects, finance, style preferences | `active_projects`, `total_value`, `last_activity` are stored fields, not computed. No contacts (a corporate client has several people). No lead tracking. |
| Projects | `projects/page.tsx`, `projects/[id]/page.tsx` (1,219 lines) | 8-stage pipeline, rooms, milestones, tabs for BOQ, snags, tasks, files, finance, feed, materials, chat | Any stage can be jumped to with no gating. `progress_percent` is a manually set number. No engagement type, fee structure or team allocation. The page holds roughly 20 pieces of state and 9 dialogs in one component. |
| BOQ | `components/projects/BOQTab.tsx`, `portal/[slug]/boq` | Versions, sections by room, line items, templates, client approve/reject with signer name | Sell rates only, with no cost rate, so no margin per line. No link to procurement. GST defaults to 18% in store logic. |
| Snags | `components/projects/SnagTab.tsx`, `portal/[slug]/snags` | Full lifecycle (raised → closed), before/after photos, comments, client raising | Not linked to vendor or contractor, so no vendor quality data. Three priority vocabularies mixed in one type. |
| Tasks | `tasks/page.tsx` | List, filter, status, overdue counts | Assignee is a free-text name. No estimate, no time logged, no link to project stage. |
| Files | Project Files tab, `portal/[slug]/files` | Folders, client-visibility toggle | No real upload (URL field pre-filled with an Unsplash image). No revisions, drawing numbers or transmittals. |
| Invoices & Payments | `invoices/page.tsx`, project Finance tab, `portal/[slug]/invoices` | Create invoice, record payment, partial/paid status, print | `overdue` is never set automatically. `recordPayment` mutates the invoice but **does not store a `Payment` record** (the `Payment` type exists but the store has no `payments` array), so payment history is lost. Invoice numbers are generated as `STU-INV-2024-00${n}` and GST is hardcoded to 18% in `projects/[id]/page.tsx`. |
| Expenses | Project Finance tab | Add expense with category and amount | No vendor, no approval, no receipt upload, no GST input credit. |
| Reports | `reports/page.tsx` | Totals billed, collected and outstanding computed from the store | Monthly chart is a static array (lines 33–40). "92.4% on-time", "14.2 days turnaround", "1.8 days approval", "48 hours fix time", "100% zero-snag", "4.9★ satisfaction" are literal strings. Input tax credit is `gstCollected * 0.45`. Project margin falls back to a **fabricated 25%** when nothing is collected (line 215). Margin is cash collected minus expenses, so it ignores staff cost entirely. |
| Notifications | `notifications/page.tsx` | List, mark read | Sidebar unread badge reads `MOCK_NOTIFICATIONS`, not the store, so it never changes. Recipients are hardcoded (`user-1`, `client-1`). No email/WhatsApp delivery. |
| Settings | `settings/page.tsx` | Studio branding and tax info, rate master, BOQ templates | Team list is a hardcoded local array (lines 53–56). Alert toggles are unbound checkboxes (`defaultChecked`) that save nothing. |
| Onboarding | `src/app/onboarding/page.tsx` | 4-step intake wizard creating client + project | Portal slug derived from client name (collisions likely). Budget mapped crudely (`includes("25L") ? 2200000 : 1400000`). |
| Client Portal | `src/app/portal/[slug]/*` | Overview, BOQ approval, snags, files, messages, invoices with bank/UPI details | **No authentication**; anyone with the slug can view and approve. Portal layout reads `MOCK_PROJECTS` directly, so projects created at runtime (e.g. via onboarding) do not open in the portal. |

### 2.3 Strengths to preserve

1. **BOQ versioning with digital client approval** is a genuinely valuable workflow and becomes the template for change-order approval.
2. **Snag lifecycle with photo evidence** maps directly to real handover practice.
3. **The client portal** reduces WhatsApp chasing and is a differentiator.
4. **Rate master and BOQ templates** encode the firm's pricing knowledge.
5. **Onboarding wizard** captures structured scope data at the first touchpoint.
6. **Consistent UI system**, so new modules can be built quickly and look native.
7. **Domain types are already Supabase-shaped** (`studio_id`, `profile_id`, `portal_user_id`), which eases the backend migration.

### 2.4 Technical weaknesses

| Weakness | Consequence | Fix in phase |
|---|---|---|
| No persistence | Unusable for real work | 0 |
| No auth or roles | Every user sees salaries, margins and all clients; portal is public | 0 |
| Hardcoded and fabricated metrics | Management would make decisions on fiction | 0 (remove), 1–4 (replace with real) |
| Duplicate/ambiguous fields: `rate`/`unit_rate`, `total`/`amount`, `gst_amount`/`tax_amount`, `line_items`/`items`, `gst_number`/`gstin`, `terms_conditions`/`terms_and_conditions`, `file_size`/`file_size_bytes`, `name`/`file_name` | Bugs where one screen reads one field and another writes the other | 0 |
| Mixed enums: snag priority (`critical/major/minor` and `high/medium/low`), payment mode (`upi`/`UPI`, `cash`/`Cash`), invoice status (`partial`/`partially_paid`, `issued`/`sent`) | Inconsistent filters and reports | 0 |
| Denormalised names stored on records (`client_name`, `project_name`, `assigned_to_name`) | Renames don't propagate | 0 |
| IDs from `Date.now()` and array length | Collisions | 0 (database UUIDs) |
| Activity log has no actor | No accountability | 0 |
| 1,219-line project detail page | Slow to change, risky to extend | 0 (split into tab components, as already done for BOQ, Snag, Messages) |
| No tests | Money logic can silently break | 0 onward |

### 2.5 Module dependency map (current and target)

```
                        ┌──────────────┐
                        │ Auth / Roles │  (Phase 0, everything depends on it)
                        └──────┬───────┘
                               │
   ┌───────────┐       ┌───────▼──────┐        ┌──────────────┐
   │ CRM /     │──────▶│   Clients    │◀───────│  Onboarding  │
   │ Pipeline  │       └───────┬──────┘        └──────────────┘
   └───────────┘               │
                       ┌───────▼──────┐
                       │   Projects   │── engagement type, fee basis
                       └───┬───┬───┬──┘
          ┌────────────────┘   │   └─────────────────┐
  ┌───────▼───────┐    ┌───────▼───────┐     ┌───────▼────────┐
  │ Fee Stages    │    │  BOQ (sell +  │     │ Resource Alloc │
  │ & Change Ords │    │  cost rates)  │     │ & Timesheets   │
  └───────┬───────┘    └───────┬───────┘     └───────┬────────┘
          │                    │                     │
  ┌───────▼───────┐    ┌───────▼───────┐             │
  │  Invoices &   │    │ Procurement:  │             │
  │  Payments     │    │ Vendors, POs, │             │
  └───────┬───────┘    │ GRN, Bills    │             │
          │            └───────┬───────┘             │
          └──────────┬─────────┴─────────────────────┘
                     │
            ┌────────▼─────────┐        ┌──────────────────┐
            │ Profitability,   │───────▶│ Dashboards, Risk │
            │ Cash Forecast,   │        │ Score, Alerts,   │
            │ Utilisation      │        │ Management Pack  │
            └──────────────────┘        └──────────────────┘
```

**Key dependency insight:** profitability needs fee stages (revenue side) *and* timesheets plus procurement (cost side). Cash forecast needs fee stages, client payment history, payroll cost and PO due dates. This is why the roadmap orders Fees → Time → Cost → Forecast.

---

## 3. Business Challenges of a 25-Year Hybrid Practice

These are the recurring problems such a firm faces, written from the owner's chair. Each is mapped to the module that addresses it.

### 3.1 Fee leakage and invisible losses
Architectural fees are fixed (a percentage or lump sum), but effort is not. Clients ask for "one more option", redesigns follow, municipal comments force revisions, and senior staff spend unplanned hours on site. In most firms partners discover a loss only after handover, if at all. **Root cause: hours are not tracked against fee by stage.**
*Addressed by:* Fee Stages (4.2), Timesheets (4.3), Profitability (4.5), Change Orders (4.6).

### 3.2 Billing lag
Stage work completes but the invoice goes out weeks later because no one told Finance, or the PM is busy. Every week of lag is a week of interest-free credit to the client. **Root cause: invoicing is disconnected from project progress.**
*Addressed by:* Stage-driven draft invoices (4.4), Unbilled WIP metric (5.1).

### 3.3 Cash-flow crunch
Payroll and rent are fixed and monthly. Receipts are lumpy, often delayed, and execution projects need vendor advances before client payments arrive. Owners frequently learn about a cash gap a week before salaries. **Root cause: no forward view.**
*Addressed by:* 13-week Cash Forecast (4.9), Receivables Ageing (4.4).

### 3.4 Execution margin erosion
On turnkey projects, the BOQ quoted to the client carries an expected margin. Material price rises, wastage, vendor substitutions and unrecorded site purchases erode it silently. **Root cause: BOQ holds sell rates only; there is no budget vs committed vs actual comparison.**
*Addressed by:* Procurement & Cost Control (4.7).

### 3.5 Uneven resource loading
Senior architects are on every project and become bottlenecks; juniors are under-used; new projects are accepted without checking capacity. Burnout and missed deadlines follow. **Root cause: no allocation or capacity data.**
*Addressed by:* Resource Planning (4.8), Utilisation (5.1).

### 3.6 Statutory approvals and compliance
Building plan sanction, fire NOC, environmental clearance, structural stability certificates, occupancy certificate: each has its own authority, documents and timeline, and a stalled approval stalls the project and the fee stage tied to it. **Root cause: tracked in someone's head or a spreadsheet.**
*Addressed by:* Approvals Tracker (4.12).

### 3.7 Drawing and document control
A site works from a superseded drawing; a consultant never received the latest revision; a client disputes what was approved. Rework and liability follow. **Root cause: no revision register or transmittal record.**
*Addressed by:* Drawing Register & Transmittals (4.11).

### 3.8 Lead leakage and unknown win rate
Enquiries arrive through many channels, proposals go out, and many go quiet. The firm doesn't know its win rate, why it loses, or which source brings profitable work. **Root cause: no structured pipeline.**
*Addressed by:* CRM / Pipeline (4.10).

### 3.9 Client relationship and retention
Repeat clients and referrals are the cheapest source of work for an established firm, yet there is no view of client lifetime value, satisfaction or dormant relationships. **Root cause: client data is transactional, not relational.**
*Addressed by:* Client analytics (5.1), portal satisfaction capture (4.4 / 4.13).

### 3.10 Vendor and contractor accountability
Late deliveries, poor workmanship and price creep repeat with the same vendors because performance isn't recorded. **Root cause: vendors are not entities in the system.**
*Addressed by:* Vendor master and scorecard (4.7).

### 3.11 Accountability and auditability
"Who approved this rate?", "Who told the client this was included?", "When was this drawing issued?" Disputes are lost for lack of a record. **Root cause: no actor on activity, no audit trail.**
*Addressed by:* Audit log (4.1), approval workflows throughout.

### 3.12 Owner dependence
In a 25-year firm, the founder often holds the real numbers in their head. This limits growth and succession. **Root cause: no single trusted view of the firm.**
*Addressed by:* Owner dashboard and Monthly Management Pack (5.4).

---

## 4. Module Specifications

Each module lists: **Problem** it solves, **Data** it captures, **Features**, **Insight** generated, and **How management uses it**. Modules are grouped by priority tier.

### Tier 1: Essential, implement immediately (Phases 0–2)

#### 4.1 Foundation (Phase 0)

**Problem:** The system cannot be used for real work: nothing persists, anyone can see anything, and numbers are fabricated.

**Features:**
- **Supabase backend.** Postgres schema mirroring the cleaned-up domain types; migrations in the repo; Supabase Storage for files and photos.
- **Store migration with minimal UI churn.** Keep the Zustand-based `useAppStore` interface as the page-facing API in the first step, backed by server data (Server Components for reads where natural, Server Actions for mutations). Pages continue working while the data source changes underneath. Replace incrementally rather than rewriting pages.
- **Authentication.** Email + password or magic link for staff; magic link for clients (portal); vendor access in Phase 5.
- **Roles and Row-Level Security** as defined in section 6. RLS policies are the enforcement point, not UI hiding.
- **Audit log.** Every insert/update/delete on financial, approval and status fields records actor, timestamp, before and after values. Replaces the actor-less `ActivityLogItem`.
- **Type cleanup.** One field per concept (see 2.4 table); single enums for priority, payment mode, invoice status; names resolved by join, not stored copies; UUID primary keys.
- **Payments table.** `recordPayment` writes a `payments` row; invoice paid/due amounts are derived from payments.
- **Honest metrics.** Remove all hardcoded KPI values and fabricated fallbacks (`reports/page.tsx` fixed strings, 25% margin fallback, ITC estimate). Compute what can be computed today from real data (active projects, outstanding receivables, open snags, tasks due); show "Not enough data yet" for the rest.
- **Refactor `projects/[id]/page.tsx`** into tab components (`OverviewTab`, `TasksTab`, `FilesTab`, `FinanceTab`, `UpdatesTab`, `MaterialsTab`), following the existing `BOQTab`/`SnagTab`/`MessagesTab` pattern.
- **Fix portal data source.** Portal layout reads from the same data layer as the app, not `MOCK_PROJECTS`. Portal slugs become unguessable tokens.
- **Settings persistence.** Team list and alert preferences stored, not local arrays and unbound checkboxes.
- **Tests.** Unit tests for all money computations (BOQ totals, GST, invoice balances, margin), RLS policy tests per role.

**Insight / value:** None analytical yet; this phase establishes **trust**. Management can begin entering real projects and knows that what they see is true.

#### 4.2 Engagement Types and Fee Structure (Phase 1)

**Problem:** The system cannot bill or measure what it has not defined. A hybrid firm earns money in two fundamentally different ways and today models only one.

**Data:**
- `projects.engagement_type`: `design_only` | `design_and_execution`.
- `projects.fee_basis`: `percent_of_cost` | `lump_sum` | `per_sqft` | `hourly`, with `fee_rate` and `estimated_construction_cost` where applicable.
- `projects.discipline`: `architecture` | `interiors` | `both`.
- `fee_stage_templates` (firm-configurable), e.g. architecture: Concept 10%, Schematic Design 15%, Design Development 20%, Working Drawings & Tender 25%, Statutory Approvals 10%, Site Supervision 20%. Interiors: Concept & Moodboard, Design & 3D, BOQ & Specification, Execution Supervision, Handover.
- `project_fee_stages`: per project, copied from template and editable: stage name, % of fee, fee amount, planned start/end, status (`not_started` | `in_progress` | `complete` | `invoiced`), `percent_complete`, `budget_hours`.
- Mapping from the existing 8-stage `ProjectStatus` (which stays as the high-level lifecycle) to fee stages.

**Features:**
- Project creation wizard asks engagement type and fee basis; fee stages auto-populated from template.
- Fee stage panel on project overview with progress per stage.
- Stage completion requires a checklist (e.g. "drawings issued", "client sign-off uploaded") before it can be marked complete, replacing the current free stage-jump.
- `progress_percent` derived from fee-stage completion weighted by fee, not set manually.

**Insight:** Total contracted fee, fee per stage, and what has been earned so far.

**How management uses it:** Standardises fee structures across directors; makes proposals comparable; provides the revenue baseline for every downstream metric.

#### 4.3 Timesheets and Cost Rates (Phase 2)

**Problem:** Staff time is the firm's largest cost (typically 55–70% of a design practice's expenses) and is invisible. Without it, project margin is unknowable and fee leakage cannot be detected.

**Data:**
- `staff_profiles`: role, department, employment type, `weekly_capacity_hours` (default 45), `billable_target_percent` (e.g. 75% for architects, 40% for directors), `cost_rate_per_hour` (Owner/Finance-only), `role_blended_rate` (visible to PMs).
- `timesheet_entries`: person, date, project, fee stage, activity (`design` | `drafting` | `3d` | `site_visit` | `client_meeting` | `coordination` | `approvals` | `internal` | `leave`), hours, notes, billable flag.
- `timesheet_weeks`: submission and approval status.

**Features:**
- Weekly grid entry, designed to take under 3 minutes: rows pre-filled from the person's current project allocations and open tasks; copy last week.
- Submit by Monday noon; PM approves entries for their projects; Director approves PMs.
- Non-project categories (business development, training, leave, admin) so total hours are captured, not just billable ones.
- Mobile-friendly entry for site staff.

**Insight:** Hours by project, stage, person and activity; cost per project; utilisation.

**How management uses it:** The foundation for profitability (4.5), resource planning (4.8) and fee benchmarks (4.17). Owners see who is carrying the firm and who is under-loaded.

**Adoption note:** This is the highest-risk module (see 8). Staff must see the benefit: their own "My Week" dashboard and fewer status meetings.

#### 4.4 Billing, Receivables and Collections (Phase 1)

**Problem:** Billing lag and slow collections. Overdue invoices are not flagged, payment history is not kept, and nothing prompts follow-up.

**Data:**
- `invoices` linked to `project_fee_stages` (for fee invoices), `boq_versions` (for execution billing), or `change_orders`.
- `payments` (one row per receipt: amount, date, mode, reference, TDS deducted).
- `credit_notes`.
- `retention_amount` and release date on execution invoices.
- Client payment terms (default days) on `clients`.
- Firm-configurable invoice number series per financial year (replaces `STU-INV-2024-00${n}`).
- GST rate per invoice line (services at 18% today, but configurable rather than hardcoded); CGST/SGST vs IGST based on place of supply.

**Features:**
- **Stage-driven draft invoices:** when a fee stage is marked complete, a draft invoice for that stage's fee is created in Finance's queue automatically.
- **Execution billing** against BOQ milestones (e.g. 40% advance on approval, 40% on carcass, 20% on handover), configured per project.
- **Automatic overdue status** via a scheduled job (Supabase cron) comparing `due_date` with today.
- **Ageing buckets:** 0–30, 31–60, 61–90, 90+ days, per client and per project.
- **Reminder sequence:** courteous reminder 3 days before due (already conceptually present in Settings toggles), firm reminder at +7, director escalation at +30.
- **TDS tracking** on receipts (clients commonly deduct 10% TDS on professional fees).
- **Client payment behaviour:** average days-to-pay per client, computed from payment history.
- Portal invoices page shows payment status and history.

**Insight:** Unbilled work in progress, days sales outstanding (DSO), ageing, client payment reliability.

**How management uses it:** Finance clears the unbilled queue daily; directors call clients in the 60+ bucket; payment behaviour informs advance terms on the next contract with the same client.

#### 4.5 Project Profitability (Phase 2)

**Problem:** Today's "margin" (`reports/page.tsx`) is cash collected minus recorded expenses. It ignores staff cost, ignores what has been earned but not billed, and fabricates 25% when nothing is collected.

**Definitions** (all visible as formulas on hover in the UI):
- **Fee value** = sum of project fee stage amounts + approved change orders.
- **Fee earned** = Σ (stage fee × stage percent complete).
- **Labour cost** = Σ (timesheet hours × person's cost rate).
- **Direct cost** = project expenses + (for execution projects) vendor bills.
- **Execution revenue** = BOQ sell value billed (execution projects).
- **Margin to date** = (fee earned + execution revenue earned) − labour cost − direct cost.
- **Fee burn** = labour cost ÷ fee value (shown per stage against stage percent complete).
- **Estimate at completion (EAC) margin** = fee value − (labour cost to date ÷ percent complete) − forecast direct costs. A simple, explainable projection; no black box.

**Features:**
- Project Finance tab rebuilt around these numbers, per fee stage.
- Portfolio table (replaces "Project Margin Analysis"): margin to date, EAC margin, fee burn vs progress, coloured by threshold.
- Separate views for design fee margin and execution margin on hybrid projects. Mixing them hides problems.

**Insight:** Which projects, project types, clients and directors make money.

**How management uses it:** Reprice remaining stages, raise change orders, stop over-servicing a client, decide which project types to pursue, and inform the next proposal.

#### 4.6 Change Orders and Variations (Phase 1)

**Problem:** Scope creep is the main cause of fee leakage. Additional work is done on goodwill because there is no easy way to record and approve it.

**Data:** `change_orders`: project, description, reason (`client_request` | `site_condition` | `regulatory` | `design_error`), fee impact, cost impact, schedule impact (days), status, client approval (signer, timestamp, note).

**Features:**
- Raise from project; send to client portal for approval using the **same approve/reject UI as BOQ** (`portal/[slug]/boq`), generalised into a reusable approval component.
- Approved change orders add to fee value and can be invoiced.
- `design_error` reason records internal rework, with no client charge, for quality analysis.

**Insight:** Volume and value of variations per project and per client; rework attributable to internal error.

**How management uses it:** Recovers fees for genuine additional scope; identifies clients who habitually expand scope (price accordingly next time); identifies internal quality issues.

### Tier 2: Medium-term improvements (Phases 3–4)

#### 4.7 Procurement and Execution Cost Control (Phase 3)

**Problem:** On design + execution projects, execution margin erodes invisibly between BOQ approval and handover.

**Data:**
- `vendors`: name, category (carpentry, electrical, civil, furniture supplier, etc.), GSTIN, PAN, bank details, payment terms, contact, status (`active` | `preferred` | `blacklisted`).
- `boq_line_items.cost_rate` alongside the existing sell rate (`unit_rate`), giving **planned margin per line**. Rate master (`item_library`) gains `standard_cost_rate`.
- `vendor_quotes`: per BOQ line or package, multiple vendors.
- `purchase_orders` and `po_lines` linked to BOQ lines; approval thresholds by role.
- `goods_receipts` (GRN): site supervisor confirms quantity received and condition.
- `vendor_bills`: matched against PO and GRN (three-way match); input GST captured for reconciliation.
- `vendor_payments` (advances and settlements).
- `snags.vendor_id` to trace defects to responsible vendor.

**Features:**
- Quote comparison view per BOQ package.
- PO generation from approved BOQ lines; PO PDF.
- Budget vs committed (POs) vs actual (bills) per BOQ line and category, with variance highlighting.
- Over-budget PO requires Director approval.
- Unbudgeted site purchases recorded as expenses tagged to a BOQ category.
- **Vendor scorecard:** on-time delivery %, average price variance vs BOQ cost, snags per ₹1L of work, average snag fix time.

**Insight:** Planned vs real execution margin, by project, category and vendor.

**How management uses it:** Catch overruns while they're still recoverable (renegotiate, substitute, or raise a variation); build a preferred-vendor list on evidence; improve future BOQ cost rates from actuals.

#### 4.8 Resource Planning and Capacity (Phase 4)

**Problem:** Projects are accepted and staffed without seeing load. Seniors become bottlenecks; juniors sit idle.

**Data:** `resource_allocations`: person, project, fee stage, hours per week, start/end week.

**Features:**
- Allocation planner (drag across a week grid; `@dnd-kit` is already installed).
- Capacity heatmap: people × next 12 weeks, coloured by allocation vs capacity.
- Role-level demand vs supply (e.g. "we need 120 senior architect hours/week in December, we have 90").
- "What if" view: add a prospective project from the pipeline (4.10) with its estimated stage hours and see the impact.
- Planned vs actual: allocations compared with timesheets.

**Insight:** Forward load by person and role; hiring or freelancing needs; feasibility of new work.

**How management uses it:** Accept, decline or reschedule projects; plan hires a quarter ahead; rebalance work before deadlines slip.

#### 4.9 Cash-Flow Forecast (Phase 4)

**Problem:** No forward view of cash; gaps discovered too late.

**Data (all already captured by earlier phases plus):**
- Inflows: open invoices × client's historical days-to-pay; future fee stages × planned completion date × client payment delay; execution billing milestones.
- Outflows: monthly payroll total (single figure entered by Finance; no individual salaries needed here), fixed overheads (`overheads` table: rent, utilities, software, loan EMIs), vendor POs and bills by due date, statutory payments (GST, TDS) on their dates.
- Opening bank balance entered weekly by Finance (or synced in Phase 5).

**Features:**
- 13-week rolling forecast, weekly buckets, with best/expected/worst cases (worst = all clients pay at their slowest observed delay).
- Highlight first week of projected negative balance.
- Forecast vs actual tracking to improve accuracy over time.

**Insight:** When cash gets tight, and why (which receivables, which outflows).

**How management uses it:** Push specific collections, delay discretionary spend or hires, negotiate vendor timing, arrange credit in advance rather than in crisis.

#### 4.10 Pipeline / CRM (Phase 4)

**Problem:** Leads leak; win rate and source quality are unknown.

**Data:**
- `leads` (or projects in `lead`/`consultation` status extended): source, enquiry date, project type, estimated area and value, proposal sent date, proposal fee, probability %, next follow-up date, owner, status (`open` | `won` | `lost` | `on_hold`), lost reason (`fee` | `timeline` | `chose_competitor` | `project_cancelled` | `no_response` | `other`).
- `client_contacts`: multiple contacts per client (corporate clients, couples).
- Referral link: `referred_by_client_id`.

**Features:**
- Kanban pipeline board (`@dnd-kit`).
- Follow-up reminders.
- Onboarding wizard (`src/app/onboarding`) creates a lead, not a live project.
- Proposal generator using fee stage templates.

**Insight:** Weighted pipeline value, win rate by source / type / director, average proposal-to-decision time, lost reasons, referral network value, repeat-client rate, client lifetime value.

**How management uses it:** Direct marketing effort to sources that produce profitable work; adjust fee positioning if losing on price; nurture top referrers and repeat clients.

#### 4.11 Drawing Register and Transmittals (Phase 4)

**Problem:** Superseded drawings on site, disputes over what was issued, rework.

**Data:**
- `drawings`: number (firm convention, e.g. `A-101`), title, discipline, fee stage, current revision.
- `drawing_revisions`: revision code, file, date, description of change, status (`for_review` | `for_approval` | `good_for_construction` | `superseded`).
- `transmittals`: issued to (client / consultant / contractor), list of drawing revisions, date, method, acknowledgement timestamp.

**Features:**
- Register per project; only latest GFC revision visible to site and vendor roles.
- Transmittal sends a link; recipient acknowledges.
- Real file upload using Supabase Storage (`react-dropzone` already installed), replacing the URL field.

**Insight:** Revision counts per drawing and stage (a rework indicator), outstanding acknowledgements.

**How management uses it:** Protects the firm in disputes; high revision counts feed back into fee estimates and change orders.

#### 4.12 Statutory Approvals and Compliance Tracker (Phase 4)

**Problem:** Approvals stall projects and the linked fee stage; deadlines tracked informally.

**Data:**
- `approvals`: project, type (building plan sanction, fire NOC, environment clearance, structural stability, occupancy certificate, society NOC, etc.), authority, documents checklist, submitted date, expected date, status, queries raised, responsible person.
- Firm-level compliance calendar: GST returns, TDS returns, professional registrations (e.g. Council of Architecture registration renewal), insurance renewals, office licences.

**Features:**
- Per-project approvals panel; overdue expected dates raise alerts and feed the risk score.
- Firm compliance calendar visible to Admin and Finance.

**Insight:** Approval cycle times by authority and type; projects blocked by approvals.

**How management uses it:** Set realistic client timelines; escalate early; avoid penalties on firm compliance.

#### 4.13 Site Diary (Phase 4)

**Problem:** No daily record from site; delays and disputes lack evidence.

**Data:** `site_diary_entries`: date, project, labour count by trade, work done, materials received (links GRN), weather, blockers, photos, author.

**Features:** Mobile-first daily form for site supervisors; blockers raise tasks or alerts; weekly client update auto-drafted from diary entries and photos (feeds the existing Project Updates feed).

**Insight:** Labour productivity, delay causes, evidence trail.

**How management uses it:** Delay analysis and claims; client communication without extra effort.

### Tier 3: Advanced capabilities as the firm scales (Phase 5+)

#### 4.14 Accounting Sync (Tally / Zoho Books)
Push invoices, payments, vendor bills and expenses to the accounting system; pull bank balance. Removes double entry; GST filing stays in the accounting system. **Value:** Finance stops re-keying; numbers reconcile.

#### 4.15 Vendor Portal
Vendors view POs, acknowledge, upload invoices, mark snags fixed with photos. **Value:** less coordination overhead; faster snag closure; better data for the vendor scorecard.

#### 4.16 Multi-Office and Department P&L
`office_id` and `department_id` dimensions on projects, staff and overheads; P&L by office and department; overhead allocation rules. **Value:** Run the firm as a portfolio of units as it grows.

#### 4.17 Benchmarks and Estimation Intelligence
From closed projects: hours per stage by typology and size, fee per sqft, execution cost per sqft by category, revision counts. Used to suggest budget hours and fees on new proposals. **Value:** Each project makes the next proposal more accurate, which is the firm's accumulated experience made usable.

#### 4.18 AI Assistance (targeted)
- Draft payment reminders and client updates (reviewed before sending).
- Weekly project-health digest per director, written from the risk score inputs.
- Extract line items from uploaded vendor bills into draft `vendor_bills`.

Each must save measurable time; no conversational "ask the dashboard" feature until the underlying data is trusted.

#### 4.19 WhatsApp Business Notifications
Implement the alert toggles that already appear in Settings (daily site photo digest, payment reminders, snag fix alerts, BOQ approval acknowledgements) via the WhatsApp Business API. **Value:** Meets clients where they already are.

### 4.20 Explicitly out of scope

| Excluded | Reason |
|---|---|
| General ledger, balance sheet, GST return filing | Tally / Zoho Books do this; duplicating it adds risk and no insight |
| Payroll processing | Only cost rates and a monthly payroll total are needed |
| BIM / CAD integration | High cost, unclear payoff at this scale; drawing register covers document control |
| Replacing WhatsApp with in-app chat | Clients won't switch; integrate with WhatsApp instead. Existing project chat stays for record-keeping. |
| Native mobile apps | Responsive web plus PWA covers site use |

---

## 5. Analytics, Dashboards, Alerts and Reports

### 5.1 Metric catalogue

Every metric is tied to a decision. Formulas are shown in the UI.

| # | Metric | Definition | Source | Decision it drives | Primary audience |
|---|---|---|---|---|---|
| M1 | Margin to date / EAC margin | See 4.5 | Fees, timesheets, expenses, bills | Reprice, change order, stop over-servicing | Owner, Director, PM |
| M2 | Fee burn vs progress | Labour cost % of stage fee vs stage % complete | Timesheets, fee stages | PM must explain burn > progress + 15 pts | PM, Director |
| M3 | Unbilled WIP | Fee earned − fee invoiced | Fee stages, invoices | Invoice now | Finance |
| M4 | Billing lag | Days from stage complete to invoice issued | Fee stages, invoices | Process discipline | Finance, Owner |
| M5 | DSO and ageing | Average days to collect; buckets | Invoices, payments | Chase priority, credit terms | Finance, Director |
| M6 | Client payment reliability | Avg days late per client | Payments | Advance terms, credit hold | Director, Finance |
| M7 | 13-week cash forecast | See 4.9 | Multiple | Collections, spending, credit | Owner, Finance |
| M8 | Utilisation (billable, total) | Hours ÷ capacity by person/team/role | Timesheets | Hiring, rebalancing, performance | Owner, Director |
| M9 | Capacity heatmap | Allocations ÷ capacity, 12 weeks | Allocations | Accept or decline work | Owner, Director |
| M10 | Revenue per employee | Fee earned ÷ FTE | Fees, staff | Strategic efficiency | Owner |
| M11 | BOQ cost variance | (Committed or actual − budget) ÷ budget per line | BOQ, POs, bills | Renegotiate, variation | PM, Procurement |
| M12 | Vendor scorecard | On-time %, price variance, snags per ₹1L, fix time | POs, GRN, snags | Preferred list, blacklist | Procurement, Director |
| M13 | Weighted pipeline | Σ proposal fee × probability | CRM | Capacity and hiring plans | Owner |
| M14 | Win rate and lost reasons | Won ÷ decided, by source/type/director | CRM | Marketing spend, pricing | Owner, Director |
| M15 | Client lifetime value, repeat rate | Fee + execution margin per client over time | Projects, invoices | Key-account focus | Owner, Director |
| M16 | Schedule slippage | Planned vs actual stage and milestone dates | Fee stages, milestones | Escalation, client comms | PM, Director |
| M17 | Approval cycle time | Submitted → granted by type/authority | Approvals | Realistic timelines | PM |
| M18 | Snag density and fix time | Snags per 1,000 sqft; raised → closed days | Snags | Quality and vendor focus | PM, Director |
| M19 | Rework ratio | Hours on `design_error` change orders and high-revision drawings ÷ total | Timesheets, change orders, drawings | Quality improvement, training | Director |
| M20 | Timesheet compliance | Submitted on time ÷ expected | Timesheets | Data quality enforcement | Owner, PM |

### 5.2 Project risk score

A single 0–100 score per live project, recalculated nightly, ranking where attention is needed. Initial weights (firm-configurable in Settings):

| Factor | Signal | Weight |
|---|---|---|
| Fee burn ahead of progress | (burn % − progress %) scaled | 25 |
| Overdue receivables | Amount 30+ days overdue ÷ fee value | 20 |
| Schedule slip | Days late on current stage ÷ stage duration | 15 |
| Cost variance (execution) | Committed over budget % | 15 |
| Stalled approvals | Approvals past expected date | 10 |
| Open critical snags | Count, near handover weighted higher | 10 |
| Unapproved change orders | Value pending > 14 days | 5 |

The score is **explainable**: clicking it shows which factors contributed. It replaces the "which project should I worry about?" discussion in weekly meetings with a ranked list.

### 5.3 Role dashboards

| Dashboard | Top row | Main panels | Replaces |
|---|---|---|---|
| **Owner: Firm Health** | Cash in 13 weeks (lowest point), fee earned MTD vs target, firm EAC margin, billable utilisation, weighted pipeline | Projects ranked by risk; director P&L; receivables ageing; capacity heatmap summary; win rate trend | Current `dashboard/page.tsx` for Owner role |
| **Director: Portfolio** | Their projects' EAC margin, overdue receivables, team utilisation | Risk-ranked projects; change orders pending; team load next 8 weeks | |
| **PM: Project Control** | Stages ready to bill, fee burn alerts, approvals pending | Per-project burn vs progress; upcoming deadlines; open snags; timesheets awaiting approval | |
| **Architect / Designer: My Week** | Hours logged vs target, tasks due | Tasks by project; drawings due; review comments; leave | Current `tasks/page.tsx` augmented |
| **Site Supervisor: Site Today** | Deliveries due, open snags, labour on site | Diary entry; GRN; snag list; GFC drawings | |
| **Finance: Money** | Unbilled WIP, DSO, cash forecast low point, payables due this week | Draft invoice queue; ageing; vendor bills to match; reminders sent | Current `invoices/page.tsx` augmented |
| **Admin: Office** | Compliance items due, approvals in progress | Compliance calendar; client onboarding queue; leave calendar | |
| **Client Portal** | Project progress, next payment, items awaiting approval | Existing portal pages + change order approvals + drawing transmittals | Existing `portal/[slug]` |

### 5.4 Alerts

Design rules: each alert has a **named recipient role**, a **required action**, and is **acknowledged** (not just read). Alerts that are routinely ignored are reviewed monthly and tuned or removed. Delivery: in-app and email from Phase 1; WhatsApp in Phase 5.

| Trigger | Recipient | Escalation |
|---|---|---|
| Fee stage complete, no invoice after 3 days | Finance | Owner at 7 days |
| Invoice due in 3 days | Client (reminder) | none |
| Invoice overdue 7 / 30 / 45 days | Client / Director / Owner | Stepwise |
| Fee burn > 80% of stage fee while stage < 70% complete | PM, Director | Owner if > 100% |
| Cash forecast negative within 6 weeks | Owner, Finance | none |
| Timesheet not submitted by Monday 12:00 | Person | PM Tuesday, Owner weekly summary |
| PO exceeds BOQ line budget | Director (approval) | none |
| Delivery late vs PO date | Procurement, PM | none |
| Approval past expected date | PM | Director at +14 days |
| Critical snag open > 48 hours | PM, assigned vendor | Director |
| Change order pending client approval > 14 days | PM | Director |
| Person allocated > 110% for 2+ weeks | Director | none |
| Lead follow-up date passed | Lead owner | Director weekly digest |

### 5.5 Reports

| Report | Frequency | Audience | Contents |
|---|---|---|---|
| Monthly Management Pack (PDF) | Auto-generated 3rd working day | Owner, Directors | Firm P&L (management view), project margin table, director P&L, utilisation, receivables ageing, cash forecast, pipeline, top risks, month-on-month trends |
| Weekly Project Health | Monday | Directors, PMs | Risk-ranked projects with factor breakdown |
| Project Closure Report | On close | Owner, Director, PM | Final margin vs estimate, hours by stage vs budget, change orders, snags, client feedback, lessons learned; feeds benchmarks (4.17) |
| Receivables Report | On demand / weekly | Finance, Directors | Ageing by client, promised dates, reminder history |
| GST Reconciliation Support | Monthly | Finance | Output GST from invoices, input GST from vendor bills, as an **export for the accountant**, not a filing |
| Vendor Performance | Quarterly | Procurement, Directors | Scorecards, spend by vendor |
| Utilisation Report | Monthly | Owner, Directors | By person, role, team; trend |

### 5.6 Client satisfaction

The current "4.9★" is fabricated. Replace with a short structured survey at two points: end of design and after handover (portal-based, 3–5 questions plus Net Promoter Score). Results feed client analytics and the closure report.

---

## 6. Roles, Permissions and Responsibilities

### 6.1 Role definitions

| Role | Responsibilities | Data visibility | Key permissions |
|---|---|---|---|
| **Owner / Principal** | Strategy, final approvals, firm finances | Everything including individual cost rates and firm P&L | Configure system, fee templates, thresholds, risk weights; approve fee discounts above threshold and write-offs; manage users |
| **Director / Associate** | Portfolio of projects and teams; client relationships | Their projects and teams incl. margins; blended rates only | Approve proposals, change orders, fee stage completion, POs above PM limit; reassign staff; approve PM timesheets |
| **Project Manager** | Delivery of assigned projects on time and budget | Their projects: hours, burn, blended costs; not individual salaries | Plan fee stages and allocations; mark stages complete (with checklist); request invoices; approve team timesheets for their projects; raise POs within limit; raise change orders |
| **Architect / Designer** | Design, drafting, 3D, coordination | Projects they are assigned to; their own hours | Log time; update tasks; upload drawings and issue revisions (transmittals require PM); raise snags |
| **Site Supervisor** | Execution quality and progress on site | Assigned execution sites | Site diary; GRN; snags; site photos; view GFC drawings |
| **Finance** | Billing, collections, payables, cash | All financial data incl. cost rates; read-only on design content | Issue invoices from drafts; record payments; enter and match vendor bills; approve expenses; maintain overheads and payroll total; accounting sync |
| **Admin / Office** | Client onboarding, compliance calendar, office operations | Clients, contacts, documents, compliance, leave; no margins | Create clients and leads; manage approvals tracker and compliance calendar; manage leave |
| **Procurement** (assignable role) | Quotes, POs, vendor management | Execution projects' BOQ cost lines and vendors | Manage vendors; request and compare quotes; raise POs within limit |
| **Client** (external) | Approvals and payments | Their project(s) only, client-visible content | Approve/reject BOQs and change orders; raise snags; message; view invoices and drawings issued to them |
| **Vendor / Contractor** (external, Phase 5) | Supply and workmanship | Their POs, work orders and assigned snags only | Acknowledge POs; upload invoices; mark snags fixed with photo |

A user may hold several roles (e.g. Director + PM, Finance + Procurement). Permissions are the union.

### 6.2 Policy rules

1. **Salary privacy:** `staff_profiles.cost_rate_per_hour` is readable only by Owner and Finance. Other roles see costs computed with `role_blended_rate`. Project margins shown to PMs and Directors use blended rates; the Owner can toggle to actual rates.
2. **Configurable approval thresholds** (Settings): PO value requiring Director (default ₹1,00,000), PO value requiring Owner (default ₹5,00,000), fee discount % requiring Owner (default 10%), expense value requiring approval (default ₹10,000).
3. **Enforcement in the database** via Supabase Row-Level Security policies, with automated tests per role. UI hiding is a convenience, not security.
4. **Audit everything financial or approval-related** (see 4.1).
5. **Portal access** by magic link bound to a client contact; links expire; every approval records signer identity, timestamp and IP.

---

## 7. Target Architecture and Data Model

### 7.1 Architecture

```
Browser (Next.js 16 App Router, React 19, shadcn UI)
   │  Server Components for reads, Server Actions for mutations
   ▼
Next.js server  ──────────────▶  Supabase
   │                               ├─ Postgres (schema + RLS policies + views for metrics)
   │                               ├─ Auth (staff: email/magic link; clients: magic link)
   │                               ├─ Storage (drawings, photos, receipts, PDFs)
   │                               └─ Cron / Edge Functions (overdue status, alerts,
   │                                   risk score, forecasts, management pack)
   ▼
Integrations (Phase 5): Tally/Zoho Books, WhatsApp Business API, email provider
```

Design choices:
- **Metrics computed in Postgres views / materialised views** refreshed nightly (risk score, forecasts) or on read (simple aggregates). One definition of each metric, used by every dashboard and report.
- **Zustand stays only for UI state** (filters, open dialogs) once server data fetching is in place.
- **Each module is a folder** (`src/modules/<name>/` or the existing `src/components/<area>/` pattern) with its server actions, queries and components, so modules can be built in parallel by different developers.
- Implementers must check `node_modules/next/dist/docs/` for this Next.js version's data-fetching, caching (`cacheComponents` is enabled) and Server Action conventions before writing server code, as required by `AGENTS.md`.

### 7.2 Data model additions (by phase)

| Phase | New tables | Changed tables |
|---|---|---|
| 0 | `profiles`, `user_roles`, `audit_log`, `payments`, `firm_settings` | All existing entities moved to Postgres; field cleanup per 2.4 |
| 1 | `fee_stage_templates`, `project_fee_stages`, `change_orders`, `credit_notes`, `invoice_series`, `alerts` | `projects` (+engagement_type, fee_basis, fee_rate, discipline, estimated_construction_cost), `invoices` (+fee_stage_id, change_order_id, place_of_supply, retention), `clients` (+payment_terms_days) |
| 2 | `staff_profiles`, `timesheet_entries`, `timesheet_weeks` | `tasks` (+fee_stage_id, estimate_hours, assignee profile id) |
| 3 | `vendors`, `vendor_quotes`, `purchase_orders`, `po_lines`, `goods_receipts`, `vendor_bills`, `vendor_payments` | `boq_line_items` (+cost_rate), `item_library` (+standard_cost_rate), `snags` (+vendor_id), `expenses` (+vendor_id, boq_category, receipt, approval) |
| 4 | `resource_allocations`, `overheads`, `cash_snapshots`, `leads` (or lead fields), `client_contacts`, `drawings`, `drawing_revisions`, `transmittals`, `approvals`, `compliance_items`, `site_diary_entries`, `surveys` | `clients` (+referred_by_client_id) |
| 5 | `offices`, `departments`, `sync_log`, `benchmarks` | Office/department dimensions on projects, staff, overheads |

### 7.3 Data quality rules

- Required fields enforced by database constraints (e.g. a fee-stage invoice must reference a stage).
- Enumerations as Postgres enums or check constraints, not free text.
- Money stored as integer paise or `numeric(14,2)`, never floating point.
- Dates as `date` for business dates, `timestamptz` for events.
- Soft delete (`archived_at`) for anything referenced by financial records.

---

## 8. Risks and Mitigations

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | **Timesheet non-adoption** breaks profitability and utilisation | High | Critical | Weekly grid under 3 minutes, pre-filled from allocations; Monday reminders and PM escalation; personal "My Week" view gives staff value; Owner visibly uses the data in reviews; track compliance (M20) |
| R2 | **Partners distrust the numbers** | Medium | High | Every metric shows its formula; run Phase 2 alongside the existing spreadsheet for one month and reconcile; start with blended rates before actuals |
| R3 | **Messy data migration** | Medium | Medium | Fresh start for live projects; import only open invoices and live project masters; no historical migration |
| R4 | **Scope creep into accounting** | Medium | High | Section 4.20 boundary; accounting needs routed to Tally/Zoho |
| R5 | **Permission bug leaks salaries or another client's data** | Low | Critical | RLS policies with automated tests per role; security review before portal go-live; audit log on reads of cost rates |
| R6 | **Over-alerting** leads to alerts being ignored | Medium | Medium | Named recipient and required action per alert; acknowledgement; monthly review of ignored alerts |
| R7 | **Next.js 16 breaking changes** slow development | Medium | Low | Read the bundled docs before server code; keep server logic in Supabase where practical |
| R8 | **Parallel tracks conflict** (Phases 2 and 3) | Medium | Medium | Module folders with clear ownership; schema changes via reviewed migrations; shared types generated from the database |
| R9 | **Fee stage templates don't fit every project** | Medium | Medium | Templates are copied and editable per project; review templates after the first 10 projects |
| R10 | **Change resistance from senior staff** | Medium | High | Involve one director as product owner per phase; show early wins (unbilled WIP recovered in Phase 1) |

---

## 9. Implementation Roadmap

### 9.1 Phase plan

Assumes three developers with AI assistance running up to two parallel tracks. Durations are elapsed calendar time.

| Phase | Scope | Depends on | Duration | Expected business impact | Complexity |
|---|---|---|---|---|---|
| **0: Foundation** | 4.1 in full | none | 5–6 weeks | System usable for real work; secure portal; honest metrics | High |
| **1: Fees & Billing** | 4.2, 4.4, 4.6; alerts infrastructure; Finance dashboard | 0 | 4 weeks | Billing lag eliminated; unbilled work recovered; collections automated | Medium |
| **2: Time & Profitability** | 4.3, 4.5; risk score v1; Owner, Director, PM, My Week dashboards | 0, 1 | 5 weeks | First real view of which projects make money | Medium-High |
| **3: Execution Cost Control** | 4.7 | 0, 1 (runs in parallel with 2) | 6 weeks | Execution margin protected; vendor accountability | High |
| **4: Planning & Growth** | 4.8–4.13; monthly management pack; surveys; risk score v2 | 2, 3 | 6–8 weeks | Forward-looking decisions: cash, capacity, pipeline, compliance | Medium-High |
| **5: Scale** | 4.14–4.19 | 4 | Ongoing, prioritised by need | Efficiency at scale; growth readiness | Varies |

**Indicative timeline:**

```
Month:        1        2        3        4        5        6        7+
Track A:  [==Phase 0==][=Ph 1=][===Phase 2===][====Phase 4 (part)====][Ph 5…
Track B:  [==Phase 0==]        [=====Phase 3=====][==Phase 4 (part)==]
```

### 9.2 Phase exit criteria

| Phase | Done when |
|---|---|
| 0 | All existing screens run on Supabase; refresh preserves data; each role sees only permitted data (tests pass); portal requires login; no hardcoded or fabricated metric remains; project detail page split into tab components; money computations covered by tests |
| 1 | Every live project has engagement type and fee stages; completing a stage produces a draft invoice; overdue is automatic; ageing report matches Finance's own records |
| 2 | ≥ 90% timesheet compliance for 3 consecutive weeks; margin and EAC shown for every live project; Owner signs off that margins are credible after the parallel-run month |
| 3 | All new execution projects have cost rates on BOQ lines; POs raised in system; budget vs committed vs actual visible per line; vendor scorecard populated |
| 4 | 13-week forecast published weekly; capacity heatmap used in the weekly resourcing meeting; all open leads in pipeline; approvals tracked for all live projects; first monthly management pack generated |

### 9.3 Quick wins inside Phase 0

Small changes that build confidence while the foundation lands:
1. Remove fabricated numbers from `reports/page.tsx` and `dashboard/page.tsx`; compute real counts from the store.
2. Fix sidebar unread count to read the store instead of `MOCK_NOTIFICATIONS`.
3. Make portal layout read the store, so onboarding-created projects open in the portal.
4. Store payments as records in `recordPayment`.
5. Set `overdue` status by comparing `due_date` with today.

---

## 10. Success Metrics

Baselines are measured at Phase 0 go-live (or estimated from Finance's records where the system has no history).

| Area | Metric | Target | By when |
|---|---|---|---|
| Billing | Days from stage complete to invoice | < 3 days | 3 months after Phase 1 |
| Collections | Days sales outstanding | −20% vs baseline | 6 months after Phase 1 |
| Collections | Receivables > 90 days | −50% vs baseline | 6 months after Phase 1 |
| Data | Weekly timesheet compliance | ≥ 90% | Week 6 of Phase 2 |
| Profitability | Live projects with known margin and EAC | 100% | End of Phase 2 |
| Profitability | Projects finishing below planned margin by > 10 pts | −30% vs first-quarter rate | 12 months |
| Utilisation | Billable utilisation (firm) | Measured, then +5 pts | 2 quarters after Phase 2 |
| Execution | Cost overrun vs BOQ budget | < 5% average | 2 quarters after Phase 3 |
| Cash | 4-week forecast accuracy | Within ±10% | 3 months after Phase 4 |
| Growth | Lost leads with recorded reason | 100% | Phase 4 |
| Growth | Win rate | Measured, trend reviewed quarterly | Phase 4 onward |
| Quality | Critical snag median fix time | < 48 hours (measured, not asserted) | Phase 3 onward |
| Management | Monthly management pack produced without manual compilation | Yes | End of Phase 4 |
| Adoption | Owner and directors use dashboards weekly (login analytics) | ≥ 1 session/week each | Phase 2 onward |

---

## 11. Open Decisions for the Firm

These do not block Phase 0, but need answers before the indicated phase:

| Decision | Needed before | Default if undecided |
|---|---|---|
| Standard fee stage templates and percentages for architecture and interiors | Phase 1 | The examples in 4.2 |
| Invoice numbering format and financial-year reset | Phase 1 | `<PREFIX>/<FY>/<NNNN>` e.g. `PDS/26-27/0001` |
| Billable utilisation targets by role | Phase 2 | Architect 75%, Senior Architect 70%, PM 60%, Director 40% |
| Whether PMs see actual or blended costs | Phase 2 | Blended |
| Approval thresholds for POs, discounts, expenses | Phase 3 | Values in 6.2 |
| Accounting system in use (Tally vs Zoho Books) | Phase 5 | n/a |

---

## 12. Next Step

On approval of this written spec, the next step is a detailed implementation plan for **Phase 0: Foundation**, broken into tasks with acceptance tests. Later phases get their own plans when Phase 0 is complete, so each plan reflects what was learned in the previous phase.
