# Production release

Status: local implementation and verification in progress. No public production deployment has been made.

## Release hardening completed on 14 October 2026

- ExcelJS now uses the patched UUID 11.1.1 dependency; its workbook round-trip regression passes. The UI generator is a development dependency. `npm audit --omit=dev` reports zero known vulnerabilities; nine development-tool advisories remain because the registry still publishes the affected braces 3.0.3 release.
- The app suppresses its framework header and adds MIME-sniffing, framing, referrer and permission headers. Same-origin camera use remains allowed for project photos.
- Alert delivery fails closed without a service credential, rejects unsupported methods and bounds provider requests to 15 seconds. Cleanup accepts POST only.
- Eight real HTTP checks passed against the isolated Docker Edge runtime: both workers reject unauthenticated requests, missing mail configuration is reported and blocks sending, GET cannot clean files, expired unreferenced files are removed, referenced files survive, and completed leases are deleted.
- All 135 unit tests and the updated production build pass. Lint reports zero errors and 14 image-optimization warnings.
- The release environment gate correctly rejects the current local backend, missing public website origin and missing email API key. No production hosting/Supabase project link is configured in this checkout.

These worker checks used disposable local fixtures and sent no external email. They do not establish successful provider delivery or execution by a production scheduler.

## Deployment inputs

Use a server-capable Next.js host, a dedicated production Supabase project, a public HTTPS domain and a verified email sending domain. A static export cannot run this app's server actions or authentication callbacks.

Inject the six variables listed in `.env.example` through the host's secret settings. Public Supabase URL/anonymous key and website origin must be present at build time. Never expose the service-role key or Resend key through a `NEXT_PUBLIC_` variable. Run `npm run release:check` with the production environment before building; it intentionally rejects the local example configuration.

## Release sequence

1. Create a dedicated production database. Do not run the development seed or `db:reset` against production. Establish backups and perform a restore rehearsal before importing business data.
2. Review and apply the repository's migrations to that project. Create the initial owner through a trusted administrative bootstrap; do not deploy the seeded `.test` accounts.
3. Set Supabase Auth's site URL and exact callback allowlist for `/auth/callback`, `/auth/confirm` and `/auth/reset-password` on the selected domain. Configure custom Auth SMTP and verify recovery and magic-link delivery using an approved test recipient.
4. Configure `RESEND_API_KEY` and `ALERTS_FROM_EMAIL` in both the web host and the alert worker. The sending domain must be verified with the provider.
5. Deploy `deliver-alerts` and `cleanup-uploads` to the production Supabase project. They authenticate their requests using the service-role bearer credential. Store `project_url` and `service_role_key` in Supabase Vault for scheduled invocations. Confirm unauthenticated calls fail, configured mail is delivered once, retries work, and abandoned uploads are removed without deleting referenced files.
6. Run lint, unit tests, database tests on a disposable staging project, the production environment check, dependency audit and production build. Deploy the built app with `npm start` or the host's Next.js runtime.
7. Verify owner and client login, invitation and recovery email, project permissions, BOQ approval/export, invoice/payment handling, procurement, attachments, realtime messages, timesheets, snags and handover on staging, then smoke-test production with approved test accounts.
8. Configure uptime/error monitoring, HTTPS, backup retention and an operator for failed mail/cleanup jobs. Record the deployed revision, database migration version, rollback procedure and restore rehearsal results.

## Remaining acceptance

- Production domain, hosting project, Supabase project and email provider configuration have not been supplied.
- Provider delivery, scheduler execution and production backup restoration require those environments.
- Final browser verification was previously blocked by the browser approval service's usage limit.
- Automatic emailed BOQ PDFs, WhatsApp digests and a free-form moodboard canvas are not implemented. The current material board supports image options, client selection and finalization; certificates use Print / Save PDF.

Do not describe the release as production-ready until these gates have evidence. See `audit-fixes.md` for the completed audit fixes and their local test results.
