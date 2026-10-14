import type { WorkspaceSnapshot } from "./snapshot";

// Keep the development client preview isolated to that client's sample records.
export function scopeDemoWorkspace(
  snapshot: WorkspaceSnapshot,
): WorkspaceSnapshot {
  if (snapshot.me.kind !== "client") return snapshot;
  const projects = snapshot.projects.filter(
    (p) => p.client_id === snapshot.me.client_id,
  );
  const ids = new Set(projects.map((p) => p.id));
  const invoices = snapshot.invoices.filter(
    (i) => ids.has(i.project_id) && i.status !== "draft",
  );
  const invoiceIds = new Set(invoices.map((i) => i.id));
  return {
    ...snapshot,
    handoverAcceptances: snapshot.handoverAcceptances?.filter(h=>ids.has(h.project_id)),
    projects,
    invoices,
    clients: snapshot.clients.filter((c) => c.id === snapshot.me.client_id),
    boqs: snapshot.boqs.filter(
      (b) => ids.has(b.project_id) && b.status !== "draft",
    ),
    changeOrders: snapshot.changeOrders.filter(
      (c) => ids.has(c.project_id) && c.status !== "draft",
    ),
    snags: snapshot.snags.filter((s) => ids.has(s.project_id)),
    tasks: snapshot.tasks.filter(
      (t) => ids.has(t.project_id) && !t.is_internal,
    ),
    messages: snapshot.messages.filter((m) => ids.has(m.project_id)),
    projectUpdates: snapshot.projectUpdates.filter((u) =>
      ids.has(u.project_id),
    ),
    files: snapshot.files.filter(
      (f) => ids.has(f.project_id) && f.is_client_visible,
    ),
    materialOptions: snapshot.materialOptions.filter((m) =>
      ids.has(m.project_id),
    ),
    payments: snapshot.payments.filter((p) => invoiceIds.has(p.invoice_id)),
    creditNotes: snapshot.creditNotes.filter((c) =>
      invoiceIds.has(c.invoice_id),
    ),
    team: [],
    feeStages: [],
    feeTemplates: [],
    expenses: [],
    itemLibrary: [],
    boqTemplates: [],
    activityLogs: [],
    notifications: [],
    alerts: [],
    timesheetEntries: [],
    projectCosts: [],
    staffWeekHours: [],
    rateBands: [],
    costRates: [],
    vendors: [],
    quotes: [],
    purchaseOrders: [],
    receipts: [],
    vendorBills: [],
    vendorPayments: [],
    costControl: [],
  };
}
