import type { WorkspaceSnapshot } from "@/lib/data/snapshot";
export interface ClientDecision {
  id: string;
  title: string;
  href: string;
  recordedAt?: string;
  signer?: string;
  note?: string;
  status: "approved" | "rejected";
}

export function getClientOverview(s: WorkspaceSnapshot, projectId: string) {
  const project = s.projects.find((p) => p.id === projectId);
  if (!project) return null;
  const base = `/portal/${project.portal_slug}`;
  const pending = [
    ...s.boqs
      .filter((b) => b.project_id === projectId && b.status === "submitted")
      .map((b) => ({
        id: b.id,
        title: `Review estimate v${b.version_number}`,
        href: `${base}/boq?version=${b.id}`,
        detail: "Approve the estimate or request changes",
      })),
    ...s.changeOrders
      .filter((c) => c.project_id === projectId && c.status === "submitted")
      .map((c) => ({
        id: c.id,
        title: `Review ${c.title}`,
        href: `${base}/changes`,
        detail: "Check the scope, fee, and schedule impact",
      })),
    ...s.snags
      .filter((n) => n.project_id === projectId && n.status === "verified")
      .map((n) => ({
        id: n.id,
        title: `Confirm snag fix: ${n.title}`,
        href: `${base}/snags`,
        detail: "The studio has verified this fix",
      })),
  ];
  const history: ClientDecision[] = [
    ...s.boqs
      .filter((b) => b.project_id === projectId && b.status === "approved")
      .map((b) => ({
        id: b.id,
        title: `Estimate v${b.version_number}`,
        href: `${base}/boq?version=${b.id}`,
        recordedAt: b.approved_at,
        signer: b.approved_by,
        note: b.approval_note,
        status: "approved" as const,
      })),
    ...s.changeOrders
      .filter(
        (c) =>
          c.project_id === projectId &&
          (c.status === "approved" || c.status === "rejected"),
      )
      .map((c) => ({
        id: c.id,
        title: `${c.number} · ${c.title}`,
        href: `${base}/changes`,
        recordedAt: c.decided_at,
        signer: c.decided_by,
        note: c.decision_note,
        status: c.status as "approved" | "rejected",
      })),
  ].sort((a, b) => (b.recordedAt ?? "").localeCompare(a.recordedAt ?? ""));
  const nextInvoice = s.invoices
    .filter(
      (i) =>
        i.project_id === projectId &&
        !["draft", "cancelled", "paid"].includes(i.status) &&
        i.amount_due > 0,
    )
    .sort((a, b) =>
      (a.due_date || "9999").localeCompare(b.due_date || "9999"),
    )[0];
  const milestone = project.milestones
    ?.filter((m) => !m.completed_at)
    .sort((a, b) =>
      (a.due_date || "9999").localeCompare(b.due_date || "9999"),
    )[0];
  const updates = s.projectUpdates
    .filter((u) => u.project_id === projectId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  return { pending, history, nextInvoice, milestone, updates };
}
