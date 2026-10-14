# System understanding

Reviewed on 14 October 2026 from the checked-out source, PRD, design plan, migrations, and tests. This is a source-level map, not confirmation that the database or external services have been deployed.

The subsequent UI and reliability work is recorded in [Professionalisation — first phase](professionalisation-phase-1.md). The original review and test results below describe the system before that phase except where explicitly updated.

## Purpose and product scope

The product is a studio management system and management information system for an Indian architecture/interiors practice. It supports design-only engagements and design-and-execution projects. Its purpose is to connect delivery activity to billing, staff effort, procurement, and management decisions.

The original PRD focuses on replacing fragmented client communication, Excel BOQs, and snag notebooks. The later strategic design extends this toward fee leakage, billing delays, project profitability, utilisation, vendor accountability, and risk. It targets a practice with roughly 15–50 staff and 20–60 active projects. Accounting integration is planned; the MIS is intended to complement statutory accounting.

The strategic document's description of a frontend-only prototype is historical. The current checkout contains backend integration, authentication, migrations, server actions, and tests. Having a module in source does not prove its complete deployment or end-to-end correctness.

## Architecture and data flow

- Next.js 16.4 App Router, React 19.3, TypeScript.
- Tailwind CSS 4, shadcn/Base UI components, Lucide icons, Recharts.
- Supabase Auth, PostgreSQL, Row-Level Security (RLS), private Storage, and an Edge Function for alert delivery.
- Zustand holds a server-loaded workspace snapshot and exposes action wrappers.
- Zod validates mutation inputs. SQL functions, constraints, views, and triggers implement much of the business logic.

Normal read flow:

```text
Request → proxy refreshes Supabase cookies
        → WorkspaceProvider resolves profile and workspace scope
        → loadWorkspace queries RLS-visible data
        → mappers convert database rows into UI types
        → AppStoreProvider hydrates Zustand
        → screens select and filter records
```

Normal write flow:

```text
Screen → Zustand action → Next.js server action
       → Zod validation → authenticated Supabase write/RPC
       → RLS + SQL business rules + audit/notification triggers
       → refresh() → new workspace snapshot → updated screens
```

The action store is a facade over backend operations, rather than the source of persistence. Standard writes use the authenticated user's Supabase client. A separate service-role client is used for auth-user administration, with caller checks in those actions.

`loadWorkspace` currently starts 38 parallel queries/RPC calls and loads most of the visible workspace in one request. It includes a roughly twelve-week timesheet window, the latest 100 personal notifications, and 200 activity rows. Storage paths are converted to signed URLs valid for one hour. The local Supabase API configuration caps results at 1,000 rows; unpaginated workspace queries can therefore become incomplete as the dataset grows.

## User roles and access

Profiles distinguish staff, client, and vendor kinds. Staff can have multiple roles: owner, director, project manager, architect, site supervisor, finance, admin, procurement.

The database is the main permission boundary. UI visibility is only a convenience layer.

| Access concept | Current rule in source |
| --- | --- |
| General project visibility | Owner/finance/admin; assigned director or manager; project members; linked client |
| Project management | Staff with visibility of the project |
| Billing access | Owner/finance or the project's director/manager |
| Client finance visibility | Linked project client can read permitted invoice/payment data |
| Procurement access | Billing access, plus procurement role on design-and-execution projects |
| Individual salary-derived rates | Owner/finance; other managers use blended cost bands |
| Staff creation | Owner action using auth administration |
| Portal access | Staff action creates a client login and returns a magic link |

This is a single-firm schema today. There is no implemented multi-office or tenant boundary to infer from the original PRD's illustrative schema.

## Core entities and workflows

Clients own projects. Projects connect rooms, milestones, assigned staff, BOQs, fee stages, change orders, snags, tasks, files, updates, messages, invoices, expenses, timesheets, and procurement records.

### Intake, clients, and projects

The public onboarding wizard validates an enquiry and calls `submit_onboarding`. That SQL function creates a client, a Lead-stage project, requested rooms, a generated reference, and staff notifications. It does not automatically grant portal access.

The delivery pipeline is:

```text
Lead → Consultation → Design → BOQ Approval → Execution → Snag → Handover → Closed
```

Project detail is assembled from separate tabs: Overview, Fees & Stages, Change Orders, BOQ, Procurement, Snags, Tasks, Files, Finance & Expenses, Feed & Stories, Materials & Moodboard, and Chat. Procurement appears for design-and-execution projects.

### BOQ and approvals

A BOQ version contains sections and line items. Items capture quantity, sell rate, units, specifications, and remarks. The database creates a whole version with its sections/items in one RPC transaction; UI mappers compute totals using shared money helpers.

Drafts are editable. Staff submit a draft; the linked client approves or requests changes through a dedicated RPC. Approval requires a signer, timestamps the decision, activates the approved version, and deactivates other versions. Clients normally cannot read drafts. Approved/submitted versions cannot be edited through the ordinary draft policies; revisions use a new version.

Procurement cost rates live separately from client-facing sell rates. Rate master and BOQ templates provide reusable pricing inputs. Version comparison and branded print previews are present.

### Fees, stages, and scope changes

Design fee bases include lump sum, percentage of construction cost, per square foot, and hourly. Fixed-value calculations exist for the first three; hourly returns no fixed contract fee in the current helpers.

Fee stages have a share of the fee, checklist, completion percentage, planned dates, and status. Completing a stage requires shares for that stage kind to total 100% and every checklist item to be done. A positive stage value generates a draft invoice and alerts Finance. Reopening is allowed before the associated invoice has been sent and deletes its draft.

Project progress is derived from design-stage completion weighted by fee share. Execution stages have a separate value basis tied to the approved BOQ. Client-approved change orders record scope, reason, fee and schedule impact, and can queue billing. Schema validation prevents charging a fee for a design-error change order.

### Client receivables

Invoices have stored draft/sent/cancelled status. The `invoice_summary` view derives paid, partial, and overdue states and balances using payments, TDS, credit notes, and held retention.

Invoice numbering is generated through database counters on issue. Payments are separate durable records, and the database rejects settlement above the remaining invoice total. Credit notes require a reason and have their own sequence. Sending an invoice can derive its due date from client terms.

Finance screens include a draft invoice queue, receivables ageing, payment behaviour, billing lag, unbilled work, and retention handling. Cash collected and earned revenue are different concepts in the metrics.

### Staff time and profitability

Staff save a Monday-start weekly timesheet with seven daily hour values per row, project/stage/activity, billable flag, and notes. Draft/rejected entries can be edited. Project time moves to submitted and then approved/rejected; rejection requires a reason. Non-project time is approved on submission. Approvers cannot approve their own entries.

Submitted and approved project hours both contribute to cost rollups. Actual labour cost uses effective-dated staff cost rates and is returned only to owner/finance. Blended rates provide manager-visible costs. Utilisation compares recorded hours and billable hours with staff weekly capacity; compliance measures submitted staff-weeks.

Profitability combines stage-earned value, billed change-order earnings, labour cost, direct expenses, and approved vendor bills. It reports margin to date, design/execution splits, stage burn, and estimated margin at completion. These are management estimates dependent on capture quality, rather than a full accounting ledger. The current expense formula includes pending expenses and excludes rejected ones; BOQ actual cost uses approved expenses.

### Procurement and execution costs

The chain is:

```text
Approved BOQ + cost budget → quotes → purchase order
                         → approval/issue → goods receipt
                         → vendor bill matching → bill approval → vendor payment
```

Vendors include trade/contact details, payment terms, and active/preferred/blacklisted status. PO lines may link to BOQ items. Thresholds, missing budgets, and budget overruns determine whether approval is required. Same-day orders for the same vendor/project are aggregated to discourage splitting. Explicit approvers cannot approve their own PO. Orders below the escalation thresholds can be approved automatically on submission.

Receipt records track received and rejected quantities. Vendor bill approval checks quantity against accepted, unbilled receipts and rate against the PO. Bills can instead be disputed with a reason. PO closure is triggered when its lines are fully accepted and billed.

Cost control compares each active approved BOQ line's sell amount, budget, commitments, and actual cost. Commitments include approved/issued/closed POs. Actuals include approved linked bills and approved line-linked expenses. Forecast cost uses the maximum of budget, committed, and actual per line. Vendor scorecards derive delivery timeliness, price variance, snag frequency, and fix time.

### Delivery, communication, and files

Snags have the states raised, assigned, in progress, fixed, verified, closed, with before/after photos, comments, staff/vendor assignments, and status timestamps. Tasks support assignees, priorities, due dates, internal visibility, and completion status. Updates and messages are stored project records; database triggers create notifications.

Private project-file uploads use a project folder and random filename, with a 50 MB client-side limit. File metadata controls client visibility. Storage RLS also checks project/file access. Materials support option display and selection, but the tab is not a complete editable moodboard builder; its empty-state Add from Library button has no action handler.

There are no Supabase Realtime channel subscriptions in the inspected source. Communication updates currently depend on mutations, refreshes, or page navigation rather than a live subscription stream.

## Management views and background work

Dashboards specialise for owner, director, project manager, site supervisor, and individual staff. Operations cards report active projects, collections, outstanding balances, open snags, tasks, and pending BOQ approvals. Reports use captured records for charts and delivery/quality/GST summaries.

Portfolio risk combines fee burn, overdue receivables, schedule slip, cost variance, stalled statutory approvals, critical snags, and pending changes. Weights are configurable. Missing factors are omitted and remaining weights normalised. The current portfolio code supplies procurement variance but not statutory approval data.

SQL cron jobs generate collections, delivery, and procurement alerts. An Edge Function processes queued emails through Resend every fifteen minutes, subject to deployment, secrets, and sender configuration. Alerts include unissued stage invoices, payment reminders/escalations, and delivery/procurement issues. Notification triggers and alert emails are distinct mechanisms; presence of an in-app notification does not imply every event sends email.

## Implemented source versus future scope

The checkout contains substantial code for the foundation, fees/billing, time/profitability, and procurement/cost-control phases. The following remain roadmap items or partial features: thirteen-week cash forecasting, future capacity allocation, structured lead pipeline analytics, drawing registers/transmittals, statutory approvals, accounting sync, vendor portal, multi-office reporting, and full moodboard editing.

Most PDF-labelled operations use browser `window.print()` and preview markup. Dedicated server-generated PDF documents and the full PRD export/report system are not established by these implementations. WhatsApp delivery is not implemented in the inspected code.

## Important current differences and constraints

1. Updated in the professionalisation phase: live workspace failures throw a recoverable error instead of substituting sample data. Only explicitly selected development identities receive sample snapshots, and client samples are scoped to that client.
2. Updated in the professionalisation phase: demo identities are development-only and read-only for standard mutation actions. Entering a demo clears local live auth cookies; sign-out clears the demo cookie. Production ignores demo cookies and rejects the demo-login endpoint.
3. Updated in the professionalisation phase: the portal requires a resolved session and lists accessible projects instead of substituting a demo client or redirecting to a hardcoded project.
4. The PRD requires designer verification before client snag closure. The SQL closure RPC currently accepts either fixed or verified. Project stage updates also have no implemented open-snag handover guard in the inspected migrations/actions.
5. PO, bill, and receipt creation use separate header/line writes. PO/bill actions attempt cleanup on line failure; receipt creation does not. These operations have different transaction guarantees from the atomic BOQ RPC.
6. Whole-workspace loading, unpaginated queries, and expiring signed URLs constrain scale and long-open sessions.
7. Some policies are broader than the original role descriptions: any staff member with project visibility satisfies `can_manage_project`; an explicit Viewer role does not exist in the current role enum.

These observations are recorded for future work. Application behavior was not modified during this review.

## Verification and navigation

- `npm run typecheck` passed.
- Two unit-test attempts encountered missing Vite SSR temporary files (`ENOENT`) before some suites could execute. The first run completed 70 passing tests across eight suites, while six suites failed during import. This is not a clean suite pass or evidence that their assertions failed.
- Fifteen SQL test files cover schema, RLS, derived data, RPCs, fees, changes, receivables, alerts, time, costing, vendors, POs, bills, and cost control. They were inspected but not executed against a live local Supabase database.
- No browser workflow or deployment validation was performed.

Key code locations:

| Concern | Location |
| --- | --- |
| UI/domain types | `src/types/index.ts` |
| Generated database types | `src/lib/supabase/database.types.ts` |
| Workspace loading and mapping | `src/lib/data/` |
| UI action facade | `src/lib/store.ts` |
| Server writes | `src/app/actions/` |
| Input validation | `src/lib/actions/schemas.ts` |
| Session and routing | `src/lib/auth.ts`, `src/proxy.ts`, `src/components/workspace/` |
| Finance and decision metrics | `src/lib/finance/`, `src/lib/metrics/`, `src/lib/time/`, `src/lib/procurement/` |
| Project workflows | `src/components/projects/`, `src/components/procurement/` |
| Portal routes | `src/app/portal/` |
| Database behavior/security | `supabase/migrations/` |
| Database tests | `supabase/tests/` |
| Email alerts | `supabase/functions/deliver-alerts/index.ts` |
| Product intent and roadmap | Original PRD and `docs/superpowers/` |
