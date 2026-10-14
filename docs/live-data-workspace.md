# Live owner workspace

On 14 October 2026 the user approved backing up and removing the local seeded examples, while retaining the owner login and any added records.

The full local CMS database was backed up before cleanup to `.audit-db/backups/cms-before-sample-cleanup.dump`. This is an ignored file containing private database/authentication data; keep it private. Row snapshots and the exact one-time SQL cleanup are also in that ignored backup directory.

Business rows were compared against the isolated seeded baseline before deletion. The only project differences were generated timestamps and portal tokens; all operational records matched the examples. No extra business records were found. The transaction checked for concurrent additions/edits and validated the remaining foreign keys before commit. An initial constraint error rolled back completely; the corrected transaction committed successfully.

Removed: sample clients, projects, BOQs, invoices/payments, tasks/snags, messages, expenses, timesheets, suppliers, templates/library items, rates and their related records. Nine sample staff/client accounts were removed. The existing active owner and owner/director roles were retained. Sample bank, GST/PAN and studio contact/address values were cleared; the studio name and login were preserved. Invoice counters and administrative audit history were retained.

Demo-cookie access now requires explicit opt-in in development and remains disabled in production. Automatic seeding is disabled in the normal backend configuration. The owner sees actual database collections; a load failure still produces an error rather than substituting samples.

The empty dashboard provides links to add the first client and configure studio details. Client search distinguishes an empty collection from an unmatched filter. Creating a project with no clients explains the prerequisite and links to the client page. Existing project, task, financial and report empty states remain in place.

Verification: 136 unit tests passed. A real owner login succeeded after cleanup; seven authenticated database collection checks returned zero records, and the authenticated projects page returned HTTP 200 with its first-project empty state and no sample project names.

Start using the workspace by adding a client, then creating their project. Enter real studio contact, tax and bank details in Settings before issuing documents. The retained local owner account should be replaced with the actual owner's identity during production setup.
