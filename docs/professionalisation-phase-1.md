# Professionalisation — first phase

Implemented on 14 October 2026 after the architectural UI refresh.

## Shipped

- Project workspace grouped into Overview, Design, Delivery, Finance, and Communication. URL-based section links support approval routing, bookmarks, and refreshes. Next milestone, project lead, and next action are visible above the sections.
- Approval inbox combines submitted BOQs, scope changes, expense requests, timesheets, purchase orders, and recorded vendor bills. It distinguishes decisions the current staff member can review from decisions waiting on clients. Search, type/project filters, empty states, and links to existing review screens are included. Database approval rules remain authoritative.
- Client portal lists the signed-in user's accessible projects. The overview prioritises the next milestone, client decisions, outstanding payment, studio updates, and recorded approval history. Submitted BOQ revisions take precedence over old active versions; historical versions have direct links.
- Development demos require an explicitly selected recognised profile and are disabled in production. Entering a preview clears local live auth cookies, standard mutation actions reject demo writes, and sign-out clears the demo identity. Sample client records are scoped to that client.
- Live authentication and workspace failures no longer substitute sample data. Page failures have a retry/sign-in screen, and standard write failures return a recoverable error.
- Missing dates no longer crash screens. Overdue checks use the viewer's current calendar day rather than the old fixed date.
- Readability and mobile containment improved in business modules, project finance, timesheet reviews, and the approval inbox. Removed the nonfunctional materials empty-state action. Corrected stage colours and the account menu's required Base UI group context.
- Build and development commands use webpack with Tailwind's official PostCSS integration. The unsupported CSS-loader subprocess path is no longer used by the normal commands.

## Validation

- Production build, including TypeScript checks and all route generation, passed.
- 119 unit tests passed across 20 files, including demo/auth boundaries, write failures, client isolation, queue permissions/routing, portal decisions, and date handling.
- Targeted lint checks and whitespace checks passed.
- Browser checks covered project-area switching, approval filters and review links, retry recovery, sign-out, anonymous portal redirection, client project isolation, historical BOQ links, and desktop/mobile layouts.
- Production HTTP checks confirmed a 404 for demo login, a sign-in redirect for a forged demo cookie, and no development controls in the production login page.

Live Supabase write workflows and SQL tests have not been exercised in this phase. Browser validation used explicitly labelled, read-only sample data. No site was deployed.

## Branded loading experience

The public website, staff workspace, and portal now share an animated studio loading screen. It uses the company name, a drawn layered mark, and an indeterminate progress line. The initial document-load introduction clears after readiness with a brief fade, with timed safeguards against blocking the site. Route loading boundaries and explicit Suspense fallbacks use the same design. Reduced-motion preferences show a static mark; JavaScript-disabled visitors bypass the introduction. Printing omits loading visuals.

Desktop and phone layouts, SVG motion, and automatic initial dismissal were checked in the browser. A temporary isolated preview used for visual checks was removed from the application.

## Later phases

Drawing revision/transmittal management, server-generated document packs, capacity planning, cash forecasting, realtime messaging, and reminder configuration remain separate work. The existing snag closure/handover database rules also need a dedicated workflow review before tightening them.
