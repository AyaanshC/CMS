# Studio CMS

Next.js studio management and client portal backed by Supabase Auth, PostgreSQL, private Storage, Realtime and scheduled Edge Functions.

## Local development

Use Node 22.13 or newer in the Node 22 line and Docker Desktop. Run `npm ci`, copy `.env.example` to `.env.local`, start the local backend with `npm run db:start`, apply local migrations, then run `npm run dev` and open http://localhost:3000.

The seed and `.test` identities are development-only. Never reset or seed production. Demo-cookie access is disabled in production builds.

Normal development now also uses real database sessions. Preview identities require the explicit `NEXT_PUBLIC_ENABLE_DEMO=true` setting. Automatic database seeding is disabled; use the separate disposable audit backend for seeded regression fixtures.

## Verification

- `npm test`: unit and workflow regressions.
- `npm run lint`: source linting.
- `npm run typecheck`: TypeScript validation.
- `npm run test:db`: local database permission and workflow tests.
- `npm run build`: optimized production compilation.
- `npm audit --omit=dev`: deployed dependency advisories.
- `npm run release:check`: production environment validation; intentionally fails with local or missing settings.

The guarded scripts in `docs/audit` use disposable local fixtures. Do not point mutation-based tests at production.

## Production

Follow [the release procedure](docs/production-release.md). The application requires a server runtime, a dedicated production Supabase project and configured email delivery. Public environment settings must be available during build; privileged secrets belong only in server/worker secret settings.

See [audit fixes](docs/audit-fixes.md) for completed work and verification limits. A successful build alone does not verify live email, scheduled workers, backup restoration or every browser workflow.
