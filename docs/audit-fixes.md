# Audit fixes

Scope: fix F01–F21 in the 14 October audit and complete the current workflows. The user selected this scope before later resource planning, cash forecasts, accounting integrations and AI modules. Existing architectural UI changes are preserved.

## Work queue

- [x] Runtime, BOQ totals/comparison and consistent financial summaries (F01, F02, F13, F14).
- [x] Account, invitation, Storage and lifecycle rules (F03, F04, F05, F07).
- [x] Atomic procurement, relationship/payment validation and provisioning (F06, F09).
- [x] Pagination, historical timesheets and submission reconciliation (F08).
- [x] Client editing/invitations, real history, notes and correct navigation (F10, F11).
- [x] Durable messaging, search, pagination, realtime, draft preservation (F12, F16).
- [x] Procurement empty states and vendor-payment forms (F15).
- [x] Delivery preferences, retries, queue claims and operational status (F17, F18).
- [x] Expiring file URLs, upload/delete recovery and cleanup (F19).
- [x] Honest intake, deduplication, limits and error recovery (F20).
- [x] Keyboard/field labels and accessibility verification (F21).
- [x] BOQ sections/line/terms editing, template saving/application, library CSV import/export/editing, Excel export.
- [x] Visual material boards with images, editing, client selection and studio finalization.
- [x] Hourly invoices from approved unbilled time; frozen handover acceptance records with printable certificates.
- [x] Project/room/milestone/task editing and configurable public enquiry options.
- [x] Account recovery views, server-confirmed invitation links and configured email sending actions.
- [x] Automated verification results and remaining visual verification limitation recorded below.

All database changes are additive migrations. The application's local `CMS` backend is running on port 54321 and has the fixes applied. Its database was not reset. Only the separate `cms-audit-fixes` instance on ports 55320–55329 was rebuilt for migration verification. `.env.local` is unchanged.

## Evidence and important behavior

- Snags require assignment, progress, an after photo, designer verification and authenticated client closure. Staff cannot forge transition actors/times. Open snags block handover; current client acceptance is required for closure.
- A handover certificate reads a frozen scope/snags/studio snapshot, so later edits do not rewrite an earlier acceptance. PDF export uses the browser's Print / Save PDF flow; automatic binary PDF storage and emailed PDF acknowledgements are not implemented.
- Procurement aggregates commit through transactional RPCs. Purchase orders, receipts, bills and payment retries use request identifiers. Project/vendor/PO relationships, receipt limits and payment balances are checked in the database.
- Issued invoices and their lines are immutable. An invoice with recorded payments cannot be cancelled; credit notes remain the supported adjustment workflow. Exact financial document views preserve paise.
- Invitations verify the actual authentication identity and its protected client association, including existing and concurrently created accounts. Generated links confirm token hashes on the server; consumed links fail safely. New staff remain inactive until role setup commits.
- Project editing cannot promote an ordinary member into billing access or transfer client ownership. Unmapped new authentication identities default to inactive accounts.
- Private file reads use positive visibility checks. Clients cannot expose an internal object by attaching its path to a message. Seven-day upload leases and a bounded cleanup worker protect referenced files and reject races with expired-upload cleanup.
- Realtime subscriptions set the session token before joining. Signed file URLs refresh periodically and when a long-idle tab becomes visible. Pagination loads complete visible collections; editable timesheets reject stale id/status revisions and save/submit atomically.
- Client notes are edited on the profile; history comes from stored activity. Chat supports durable image/PDF attachments, draft preservation, search and older messages. Disabled preference controls clearly identify unavailable WhatsApp/PDF acknowledgement features.

## Release configuration still required

1. Configure the public website origin and Auth callback allowlist. Configure Auth SMTP for magic-link/password-recovery email, and `RESEND_API_KEY` plus a verified `ALERTS_FROM_EMAIL` for invitation/alert delivery.
2. Deploy `deliver-alerts` and `cleanup-uploads` and provide their required secrets. Configure the scheduler Vault entries `project_url` and `service_role_key`. Unconfigured schedules keep mail queued without invalid network requests. No external emails were sent during verification.
3. Review development dependency advisories before production release. The release follow-up moved the UI generator to development dependencies and pinned ExcelJS's UUID dependency to the compatible patched 11.1.1 release. The production-only audit now reports zero known vulnerabilities; nine high advisories remain in development-tool chains. The registry's current `braces` release is still 3.0.3, which the advisory covers; no framework downgrade or forced dependency rewrite was performed. Excel import is CSV-only; the export code writes literal workbook cells and protects CSV formula-like text.

Recovery screens were inspected without changing a real password. Provider delivery and deployed cleanup workers remain operational checks after configuration. Automatic emailed BOQ PDFs, WhatsApp digests, a free-form moodboard canvas, and the later strategic modules remain outside the completed implementation.

## Verification

Verified locally on 14 October 2026:

| Check | Result |
| --- | --- |
| Unit regressions | 135 passed across 25 files |
| Database regressions | 230 passed across 22 files, including migrations through 20270102001700 |
| Live API checks | 14 passed: private Storage, attachment visibility, realtime messaging, disabled sessions and pagination beyond 1,000 rows |
| Invitation callback | 3 passed against the local production build: server session cookies, client project isolation, consumed-link rejection |
| Production build | Passed compilation, TypeScript and route generation |
| Lint | Zero errors; 14 image-optimization warnings |
| Browser | Earlier live owner login, dashboard, snags, invoices and invoice composer inspected; final visual repeat remains incomplete |

The realtime check timed out once, then passed on a fresh run without a code change. This is retained as an intermittent verification observation, not evidence that all delivery conditions are covered. The development server was restarted after becoming unresponsive; its invoice route subsequently returned HTTP 200, with a warm request taking about 1.5 seconds. Authentication checks passed against the production runtime on port 3001 while development compilation was slow.

The in-app browser subsequently stopped responding, and automatic approval review blocked the attempted production-runtime browser check because its usage limit was reached. No workaround was used. `audit/verified-invoice-composer.png` is the earlier captured view; it predates the final two-decimal currency formatting change. This is not a complete end-to-end visual sign-off.

The original audit remains a historical baseline; its fault reproductions have been replaced by correctness regressions in `src/lib/actions/workflows.test.ts` and SQL tests 16–22. Local test credentials and raw runtime logs remain in ignored files.
