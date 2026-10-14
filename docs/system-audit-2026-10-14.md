# System audit — 14 October 2026

> Historical baseline before repairs. Docker is now available and the fixes and current verification results are tracked in [audit-fixes.md](audit-fixes.md). The original fault assertions are superseded by correctness regressions; the audit Vitest config now runs those regressions.

## Assessment

The system has a substantial implementation: it is more than a UI prototype. Authentication, project and client data, BOQ versions, fee stages, change orders, timesheets, costing, invoices, procurement, and the client portal have backend code. However, it is not yet ready to treat every screen as a completed, verified production workflow.

The most urgent reproduced defect is a crash in the staff Snags tab. Other reproduced problems include BOQ tax displays, inactive client buttons, a broken messages link, and failure handling in receipts and invitations. Source review also identifies access-control and financial-integrity gaps that require isolated database verification before release.

This audit did not change application behavior or business records. It added this report, audit-only diagnostics, a control scanner, and desired database regression checks. Existing uncommitted UI work was preserved.

## What was tested

| Check | Result | Meaning / limitation |
| --- | --- | --- |
| Existing Vitest suite | 20 files, **119 tests passed** | Tests currently covered by the repository; does not prove every UI workflow works. |
| Production build | **Passed** | Webpack compilation, TypeScript, page generation, and build traces completed. |
| Standalone TypeScript after adding audit diagnostics | **Passed** | Audit TypeScript artifacts introduce no type errors. |
| Full baseline ESLint | 203 files, **0 errors, 89 warnings** | 74 unused-variable warnings, 14 image-element warnings, 1 anonymous-default-export warning. Raw output: `docs/audit-lint-results.json`. |
| Audit fault-injection / actual component rendering | **8 current-gap reproductions passed** | These deliberately assert the present faulty behavior; they are diagnostic evidence, not eight additional features passing acceptance tests. |
| Owner navigation | All **11 main pages loaded** | Dashboard, projects, clients, tasks, timesheets, approvals, invoices, finance, vendors, reports, settings. Read-only development data. |
| Role previews | Owner, director, project manager, finance and client tested | Authentication and different navigation/dashboard content observed. Client preview showed only its own project; visiting the staff dashboard redirected to the portal. Demo previews do not prove live RLS. |
| Mobile client portal | Project list, overview and all 6 detail sections loaded at **390 × 844** | No page-level horizontal overflow in the checked views. BOQ, change orders, snags, files, messages and invoices rendered; empty approval submit buttons were disabled. No agreements, approvals or payments were submitted. |
| Sign-out / protected navigation | **Passed** | Client preview signed out; a subsequent staff-dashboard request redirected to `/login?next=%2Fdashboard`. Browser returned to the public homepage and viewport override was removed. |
| Client / project detail | Search empty state, detail navigation, buttons, activity, communication, BOQ lock, materials empty state, file form, task tabs tested | Snags tab failed. Create/upload/payment success paths require a live disposable backend. |
| Supabase database suite | **Not executed: runtime blocked** | 15 SQL test files exist. Docker Desktop crashed on startup before a usable database was available. No database reset was performed. |

Docker's startup log reports an inference-manager socket/listener error involving `dockerInference`. I did not reset Docker, replace its configuration, or touch an existing database to work around it. Consequently, migrations, live RLS, Storage access, transactions, real sign-in links, and alert delivery remain unverified in this audit.

Browser navigation initially encountered development compilation/hydration delays. Pages were re-observed after loading; a temporary loading snapshot or locator timeout was not classified as an application defect. The Snags failure was confirmed through both the visible error boundary and its actual exception.

The demo fixture itself needs cleanup: its BOQ grand total disagrees with the displayed line/fee breakdown, approval predates creation, some document URLs are `#`, and most fee/procurement/time collections are empty. These are sample-data problems, distinct from the independently reproduced BOQ calculation errors. Richer consistent fixtures are needed to cover populated screens reliably.

## High-priority findings

### F01 — Staff Snags tab crashes

**Evidence: browser reproduced and actual component rendering reproduced.**

`src/components/projects/SnagTab.tsx:22` calls `team.find(...)` using `project?.director_id`, while `project` is declared on the following line. With a nonempty team, the callback executes immediately and throws `ReferenceError: Cannot access 'project' before initialization`.

**Reproduction:** Owner preview → Sharma Villa → Delivery → Snags. The whole project page displays “We couldn’t load this page.” This blocks staff snag management and the handover certificate interface. An optional-chain operator does not protect access to a variable before its initialization.

**Acceptance:** Resolve the project before computing the designer. Render-test the populated staff case, empty team, missing project, and handover dialog.

### F02 — BOQ tax breakdown disagrees with the total

**Evidence: actual component rendering reproduced.**

The shared money helper and mapper use `(items + designer fee − discount) × GST`. The staff summary and print preview use only `items × GST`, ignoring the fee and discount (`BOQTab.tsx:181`, `:549`). They also use `gst_percent || 18`, so a valid zero rate becomes 18%. The portal uses the same zero-rate fallback and derives values from a rounded total.

**Reproduction:** With items ₹100, designer fee ₹100, discount ₹0, GST 18%, the actual staff component displays ₹18 GST while the correct amount is ₹36 and the grand total is ₹236. With 0% GST, it still displays 18% and ₹18 tax.

**Acceptance:** All staff, client and print views must consume one total breakdown and preserve zero. Cover fees, discounts, zero GST, decimals, and an empty BOQ. Show the discount explicitly.

### F03 — Internal file Storage policy is unsafe

**Evidence: source/policy analysis; database reproduction blocked.**

`supabase/migrations/20261009000600_storage.sql:10` permits a project client to read an object when no matching *hidden* `project_files` record exists. However, `files_read` in `20261009000300_rls_policies.sql:116` hides those records from the client. In an RLS-filtered subquery, an internal record can therefore appear not to exist and satisfy the Storage permission. Objects without a file record are also allowed by the negative existence check.

**Impact:** An internal object may be downloadable by a client who knows its path, even though the application hides its card. This is a source-supported access risk, not a demonstrated live data disclosure.

**Acceptance:** Explicitly verify the visibility of file objects without relying on absence of an RLS-hidden record. Model allowed client message/snag attachments separately. Test internal, visible, unregistered and other-project objects with real client JWTs. Desired checks are in `docs/audit/access-regressions.sql` and were **not run**.

### F04 — Deactivation is not enforced throughout database permissions

**Evidence: source/policy analysis; database reproduction blocked.**

`has_role()` checks the role table without requiring an active profile (`20261009000200_access_functions.sql:1`). Many finance/owner policies depend directly on it. The profile grants include `active`, and the self-update policy permits updating one's own row (`20261009000300_rls_policies.sql:21–22`). A disabled account with an existing valid session can therefore retain role-based API permission and has a source-visible path to reactivating itself.

The server-rendered workspace rejects inactive profiles; that UI check does not secure direct API requests.

**Acceptance:** Require active accounts in all access helpers, restrict activation to an authorized administrator, and verify revoked accounts against database and Storage APIs. Preserve safe ownership recovery. Test with pre-existing tokens, not only fresh login attempts.

### F05 — Portal invitation does not verify an existing email's client identity

**Evidence: mocked server-action reproduction.**

`src/app/actions/portal.ts:23` accepts an “already registered” error and proceeds to generate a magic link. The comment says the existing login must belong to this client, but no lookup or association check implements that rule.

**Impact:** Staff can generate a purported invitation for an unrelated client/staff account. Existing RLS still applies; this audit did not prove a cross-client data leak. The onboarding experience can also open the wrong workspace or fail to grant the intended access.

**Acceptance:** Verify account kind, active status and exact client association before issuing a link. Treat an unrelated identity as a conflict. Also check authorization to the *specific client*, rather than only a broad staff role. Test new client, same-client existing email, different-client email and staff email. Never send real invitations as part of these tests.

### F06 — Goods receipts can leave an empty committed header

**Evidence: injected line-write failure reproduced.**

`recordReceipt()` (`src/app/actions/procurement.ts:36`) inserts a header and then lines in two database requests. When the lines fail, it returns an error and leaves the header. There is no rollback or cleanup. A retry can leave duplicate/empty receipts.

PO and vendor-bill creation attempt compensating deletes, but those deletes can themselves fail; they are not atomic transactions. Staff creation and role replacement also span multiple operations without complete rollback.

**Acceptance:** Use transactional database operations for each aggregate and test line failures, duplicate submissions, interrupted requests and cleanup failures. BOQ creation already uses an atomic RPC; retain that pattern.

### F07 — Snag / handover rules are advisory rather than enforced

**Evidence: action diagnostics plus SQL/UI review.**

- `setProjectStage()` directly updates any enum stage, including Handover and Closed, without checking open snags or acceptance (`src/app/actions/projects.ts:9`). The “Handover Blocked” label in the snag screen does not enforce this operation.
- `client_close_snag()` allows both `fixed` and `verified` (`20261009000500_rpcs.sql:34`); the portal offers closure for both. The PRD explicitly requires designer verification before client closure.
- Staff can mark a snag fixed without an after photo. The action diagnostic reproduces acceptance without a photograph; the timestamp trigger only stamps dates and imposes no lifecycle rules.
- Staff also have direct closure controls. A status timestamp alone is not proof of client acceptance.

**Acceptance:** Put prerequisites in the database, including legitimate exceptions and their audit trail. Block handover with open snags, require the intended verification sequence and capture the actual approving actor. These rules are explicit in PRD Appendix B, items 2 and 3.

### F08 — Historical or truncated timesheet snapshots can cause destructive saves

**Evidence: source inference; live database/UI save reproduction blocked.**

The loader only retrieves time from the current week's start minus 77 days (`load-workspace.ts:59`, `:201`). The UI allows navigation to any earlier week. Such weeks can appear empty even when saved data exists. `save_timesheet_week()` deletes that user's draft/rejected rows for the entire selected week before inserting the submitted grid. Saving an empty or partial snapshot can erase rows the user never saw.

Additionally, workspace queries are not paginated while the local API is capped at 1,000 rows. This affects current time records at realistic studio volumes as well as messages, invoices, tasks and other collections. The message query sorts oldest-first, so newer messages can disappear after the cap is reached.

`WeekGrid` initializes editable rows only once. After submission and a snapshot refresh, stale local rows can remain alongside locked entries; re-submission/double counting needs a live regression test.

**Acceptance:** Load the requested week completely, indicate loading/incomplete state, and never replace a week from an incomplete snapshot. Reconcile local state after successful submission. Test older-than-12-weeks entries, >1,000 rows, repeated submission, rejection and reload.

### F09 — Procurement relationships and vendor payment safeguards are incomplete

**Evidence: schema/action review; live SQL verification blocked.**

Receipt lines have independent foreign keys to a receipt and a PO line, without enforcing that they belong to the same PO. Bill/project/vendor/PO references are likewise independent. Vendor payments check role and positive amounts, but there is no equivalent of the client-payment overpayment guard, no enforced approved-bill prerequisite and no enforced vendor/project match. The bill summary clamps outstanding at zero, which can hide overpayments.

The existing bill SQL tests cover three-way quantity/rate matching, duplicate bill numbers, and an ordinary full payment; they do not test these malformed associations or concurrent/duplicate payments.

**Acceptance:** Enforce associations, bill approval, amount ceilings and deliberate advance-payment treatment in a locked transaction. Add direct API tests; dropdown filtering alone is insufficient.

## Other confirmed / source-supported gaps

| Finding | Evidence and impact | Required completion |
| --- | --- | --- |
| F10 — Inactive client controls and broken link | Browser: client-profile **Edit** and **Send Portal Invite** open no dialog and perform no action. Communication link uses `/projects/{id}/messages`, which is a confirmed 404. Settings **Clone into Project** also has no handler. | Implement/edit flows, connect invitation CTA to the existing access card, use `?tab=messages`, handle clients with no project. Wire template cloning. |
| F11 — Fabricated client activity | Browser and `clients/[id]/page.tsx:29,191`: Rohit's profile displays Sharma's 2024 project/BOQ/message events from a fixed `ACTIVITY_FEED`. This is also used for live clients. | Use actual scoped activity/message/approval records; show an honest empty state. Implement editable/manual notes. |
| F12 — Chat attachments are temporary and failed sends erase drafts | Both staff and portal chat use `URL.createObjectURL(file)` and save that blob URL rather than uploading it. The actual schema accepts it. Text sends clear their input without awaiting success. | Upload to private Storage, persist a path, sign at read time; retain drafts on failure, disable duplicate sends, support actual file links. PDFs are not supported by the current image-only input. |
| F13 — Financial summary inconsistencies | Project header uses total invoiced minus cash paid instead of `amount_due`, ignoring TDS, credit notes and retention. Project/client invoice totals include draft/cancelled rows. Reports' cash position and monthly expense series omit vendor payments. | Use consistent issued-invoice summaries. Reconcile cash outflow with vendor payments and avoid double counting the same cost/payment. Display the scope of any financial estimate accurately. |
| F14 — BOQ comparison misses removed items | `BOQTab.tsx:455` iterates only the current version's items and matches old items by description. Removed items are absent and duplicate descriptions can match the wrong room/line. | Compare the union of stable line identities and display added/removed/changed quantities, rates and specifications. |
| F15 — Procurement tabs disappear when data is empty | `ProcurementTab.tsx:14` treats `costControl.length > 0` as permission. Authorized users with no approved cost rows cannot see Quotes or Vendor bills, even though package quotes and unlinked bills are supported by input schemas. | Derive permission from the role/access model; render empty states and creation actions independently of row count. |
| F16 — Several forms close before a save succeeds | Room, milestone, project-task and BOQ-item forms call async actions, immediately clear data, and close. The global wrapper shows an error toast, but the form contents are already gone. Stage confirmation similarly closes immediately. | Await the result, keep entered data on failure, show pending state and close only after success. |
| F17 — Notification settings promise unimplemented services | WhatsApp digest, snag-fix preferences and BOQ PDF acknowledgments are stored in Settings, but no worker implements the WhatsApp/PDF promises. Snag in-app notifications exist but ignore their toggle. Only payment-reminder preference is read by the queue generator. | Make every enabled option drive real delivery, or present it as unavailable. Do not label a saved toggle as a working integration. |
| F18 — Email delivery needs deployment and recovery work | `deliver-alerts` exists, using Resend; cron requires Vault secrets. Missing key marks emails skipped. Failed emails are not retried because only pending records are selected; overlapping runs have no claim/idempotency mechanism. | Verify deployment/secrets/sender, add safe retries and queue claiming, surface failures. Delivery was not attempted here. |
| F19 — Storage lifetime / cleanup | Signed URLs expire in 1 hour with no renewal (`load-workspace.ts:311`). Record creation failure after upload leaves objects; deletion removes the DB row first and ignores Storage removal failure. | Renew URLs, retain/retry pending uploads or remove orphans, record cleanup failures. |
| F20 — Public intake needs operational safeguards | Public RPC creates a lead but the button says **Submit & Create Client Portal**; portal access is granted separately. No rate limit, deduplication or captcha is implemented. Success links to an authenticated CRM page. | Describe the actual enquiry outcome, add idempotency/abuse limits and appropriate public success navigation. Test connection failure and repeated submission. |
| F21 — Accessibility needs another pass | Browser exposes unnamed icon actions and unlabeled form fields; room/milestone/selection interactions include clickable non-button elements. Automated unit/build checks do not verify keyboard operation. | Label icon controls and fields, make interactive elements keyboard-operable, test focus, dialogs and contrast with accessibility tooling. |

## Features yet to be implemented or finished

These are gaps against the original PRD or later strategic roadmap. They are not all defects in the current release. Existing related implementations are listed to avoid mistaking a partial feature for a wholly missing module.

| Area | Implemented foundation | Missing / partial work |
| --- | --- | --- |
| Client CRM | Create/list/search, source filter, table/cards, project and finance views | Profile editing CTA; proper timeline and communication aggregation; manual notes; custom tag editing/bulk tag/export; date/tag filters and sort options. |
| Public onboarding | Multi-step intake; lead/client/project/room creation RPC | Configurable question builder; move-in timeline, reference uploads, special requirements and richer preferences; accurate portal-access messaging. |
| Projects | Creation, grid/list/stage board, rooms, milestone completion, assigned team display | Full project editing/archive controls, membership assignment management, room editing/reordering/deletion; Gantt/dependencies; stage customization and stage prerequisites. |
| BOQ builder | Versions, locked approved/submitted records, add/delete lines, library selection, clone revision, submit/decision, print preview | Inline edit of existing cells, keyboard spreadsheet workflow, drag ordering, flexible section creation, complete difference viewer, consistent tax/discount editor and summary. |
| BOQ templates / library | Library create/delete and update server action; templates can be loaded | Template creation/edit/save-as-template/application; update UI; CSV import/export; Excel export with formulas; expiring non-portal share links. Fee-stage templates are a separate feature and already implemented. |
| Fee stages | Percentage/lump-sum/per-area terms, checklists, progress, completion-generated invoice, reopen protections | **Hourly billing is selectable but has no approved-hours × rate invoice pipeline.** Fee value returns zero/null for hourly work and stage completion skips the invoice. |
| Change orders | Draft/submit/client decide, impacts, approval records, related billing logic | General design/material/other approval requests; richer attachments and locked design revisions. BOQ/change-order approvals do not amount to a universal approval system. |
| Snags / handover | Raise, assign staff/vendor, comments/photos, status controls, client sign-off RPC, print certificate source | Fix the crash and lifecycle guards first; bulk actions; restricted vendor access; reopen flow; durable client acceptance, evidence photographs, generated PDF saved to Files and emailed. Current certificate is a browser-print preview with signature lines. |
| Communication | Persisted text messages, timestamps, site posts, likes/loves, notification records | Realtime subscriptions, read receipts, search/older-message pagination, stable image/PDF attachments, link previews, update comments/gallery/milestone tags, broadcasts. Reactions currently increment counters rather than track/toggle each user's reaction. |
| Invoicing | Manual total invoices, fee-stage billing, tax/discount helpers, issue/cancel, partial client payments, TDS, credits, retention, branded print views | Full editable invoice line-item composer and create-from-BOQ/quotation flow; payment receipt attachment; reliable PDF generation/storage/email. |
| Procurement | Vendors, quotes, cost lines, PO approval/issue/cancel, receipts, bills, three-way match, vendor payment action, cost-control views | Transactional saves/association safeguards, empty-data permissions, receipt corrections/returns, complete partial/TDS/advance vendor-payment UI. The present bill action is essentially full-balance “Mark paid” for today by bank transfer. |
| Materials / moodboards | Material records and staff-selected boolean can be displayed | Create/upload/edit options; client selection workflow (current write policy is staff management); room/category comparisons/comments/final lock, BOQ link, moodboard canvas and PDF, design concept versions. “Selected by Client” currently describes a boolean staff can toggle. |
| File management | Real project Storage upload, folder filters, visibility toggle, deletion, client-visible downloads | Document versions/revision register, room associations in UI, richer preview/search/folder management, complete privacy and orphan handling. |
| Tasks | Project Kanban columns, create/status/delete, studio list/status/project/priority filtering | Calendar, recurrence, subtasks, comments/attachments, task detail editing and milestone links; true personal-assignment filtering. The “My tasks” list is currently the visible workspace's task collection, not restricted to the current assignee. |
| Timesheets / costing | Weekly entry/submission/rejection/approval, effective cost rates, blended/actual rollups, utilisation | Historical loading safety, post-submit reconciliation, duplicate/concurrent-save tests and hourly client billing. |
| Reports / notifications | Portfolio risk, profitability rollups, ageing, collection metrics, GST estimates, in-app inbox, email queue code | Financial-summary reconciliation; true cash balance/forecast; external delivery validation, retry/monitoring, full event preferences. Reports still contain outdated “arrives in Phase 2” copy although staff costing now exists. |
| Account management | Password/magic-link sign-in, staff creation, roles, activation controls, session redirects | Reset/change-password/recovery screen; staff invitation delivery and account provisioning rollback; MFA UI; reliable revocation. “Forgot password” switches to passwordless sign-in rather than resetting a password. |
| Branding / settings | Studio details, tax, bank info, risk/targets, roles, alert preferences | Public site/loader branding remains hardcoded to Priya Designs; custom stages, full logo/color configuration, HSN/tax-inclusive modes, configurable intake builder. |
| Production operations | Supabase migrations, SQL tests, server error boundaries, demo blocked in production | Verified deployment/migrations, backup-and-restore exercise, monitoring/error alerts, automated browser/DB CI, realistic large/populated fixtures, performance checks. No repository CI workflow was found in this checkout. |

The later roadmap additionally plans resource allocation and capacity heatmaps, scenario planning, a 13-week cash forecast, expanded lead pipeline/proposals/conversion analytics, drawing revisions/transmittals, statutory approval tracking, structured daily site diaries, client satisfaction/NPS, accounting integration (Tally/Zoho), vendor portal, multi-office reporting and AI assistance. These should be treated as future scope, not advertised as completed.

## Recommended implementation order

1. **Stabilize current workflows:** Snags crash; internal-file access; deactivation; identity-safe invitations; accurate BOQ and invoice balances; handover rules.
2. **Protect data:** transactional procurement and provisioning; relationship/overpayment checks; complete week-based timesheet loading; pagination; duplicate-save protection; draft preservation and Storage cleanup.
3. **Finish exposed promises:** dead buttons, real client timeline, messaging attachments/realtime, BOQ templates/comparison, actual notification preferences and verified delivery.
4. **Add professional daily-work tools:** materials/design approvals, invoice composer, editable task/project/room details, proper handover document workflow.
5. **Build management extensions:** resource planning, cash forecast, drawing register, approvals/diary and accounting integration according to studio priorities.

## Required follow-up verification

Use an isolated seeded Supabase instance. Run the existing 15 pgTAP files plus the desired access regressions. Then exercise an end-to-end chain with disposable users and records: enquiry → staff provisioning → client invitation → project/fees/BOQ → client approval → PO approval/issue → receipt → vendor bill/payment → client invoice/partial payment/TDS/credit/retention → timesheet submit/approve → snag fix/verify/client close → guarded handover.

Add negative and concurrent cases: different-client access, disabled valid sessions, internal Storage URLs, failed second writes, double click/retry, duplicate payments, wrong-project/vendor/PO associations, >1,000 records, historical weeks, expired links/URLs, and unavailable email/storage services. Verify persistence after refresh and in a second session. These are still required; passing the existing unit suite cannot substitute for them.

Run audit reproductions independently of the normal suite:

```powershell
node node_modules/vitest/vitest.mjs run --config docs/audit/vitest.config.ts --maxWorkers=1 --no-file-parallelism
node docs/audit/control-scan.mjs
```

Do not merge the current-gap assertions into the ordinary acceptance suite unchanged. Once each defect is fixed, replace its diagnostic with a desired-behavior regression test.
