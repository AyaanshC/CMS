import type { WorkspaceSnapshot } from "@/lib/data/snapshot";
import type { Project, SessionProfile } from "@/types";
import { weekStart } from "@/lib/time/weeks";

export const APPROVAL_LABELS = {
  boq: "BOQ",
  change: "Scope change",
  expense: "Expense",
  timesheet: "Timesheet",
  purchase_order: "Purchase order",
  vendor_bill: "Vendor bill",
} as const;
export type ApprovalKind = keyof typeof APPROVAL_LABELS;
export interface ApprovalItem {
  id: string;
  kind: ApprovalKind;
  title: string;
  projectId: string;
  projectName: string;
  amount?: number;
  hours?: number;
  submittedAt: string;
  dueDate?: string;
  reviewer: string;
  canReview: boolean;
  href: string;
  note?: string;
}

export function canApproveTime(
  me: SessionProfile,
  project: Project | undefined,
  authorId: string,
) {
  return (
    me.kind === "staff" &&
    !!project &&
    authorId !== me.id &&
    (me.roles.includes("owner") ||
      project.manager_id === me.id ||
      (project.director_id === me.id &&
        (!project.manager_id || project.manager_id === authorId)))
  );
}

type QueueSource = Pick<
  WorkspaceSnapshot,
  | "me"
  | "projects"
  | "boqs"
  | "changeOrders"
  | "expenses"
  | "timesheetEntries"
  | "purchaseOrders"
  | "vendorBills"
>;
export function getApprovalQueue(s: QueueSource): ApprovalItem[] {
  if (s.me.kind !== "staff") return [];
  const result: ApprovalItem[] = [];
  const finance = s.me.roles.some((r) => r === "owner" || r === "finance");
  const add = (item: Omit<ApprovalItem, "projectName">) => {
    const p = s.projects.find((p) => p.id === item.projectId);
    if (p) result.push({ ...item, projectName: p.name });
  };
  for (const b of s.boqs.filter((b) => b.status === "submitted"))
    add({
      id: b.id,
      kind: "boq",
      title: `BOQ version ${b.version_number}`,
      projectId: b.project_id,
      amount: b.grand_total,
      submittedAt: b.submitted_at ?? b.created_at,
      reviewer: "Client",
      canReview: false,
      href: `/projects/${b.project_id}?tab=boq`,
    });
  for (const c of s.changeOrders.filter((c) => c.status === "submitted"))
    add({
      id: c.id,
      kind: "change",
      title: `${c.number} · ${c.title}`,
      projectId: c.project_id,
      amount: c.fee_impact,
      submittedAt: c.submitted_at ?? c.created_at,
      reviewer: "Client",
      canReview: false,
      href: `/projects/${c.project_id}?tab=changes`,
    });
  for (const e of s.expenses.filter((e) => e.status === "pending"))
    add({
      id: e.id,
      kind: "expense",
      title: e.description,
      projectId: e.project_id,
      amount: e.amount,
      submittedAt: e.expense_date,
      reviewer: "Finance / owner",
      canReview: finance,
      href: `/projects/${e.project_id}?tab=finance`,
    });
  const timeGroups = new Map<string, typeof s.timesheetEntries>();
  for (const e of s.timesheetEntries.filter(
    (e) => e.status === "submitted" && e.project_id,
  )) {
    const key = `${e.profile_id}|${e.project_id}|${weekStart(e.work_date)}`;
    timeGroups.set(key, [...(timeGroups.get(key) ?? []), e]);
  }
  for (const [key, entries] of timeGroups) {
    const e = entries[0];
    const p = s.projects.find((p) => p.id === e.project_id);
    add({
      id: key,
      kind: "timesheet",
      title: `${e.profile_name ?? "Staff member"} · week of ${weekStart(e.work_date)}`,
      projectId: e.project_id!,
      hours: entries.reduce((sum, e) => sum + e.hours, 0),
      submittedAt: weekStart(e.work_date),
      reviewer: "Project lead / owner",
      canReview: canApproveTime(s.me, p, e.profile_id),
      href: "/timesheets/approvals",
      note: "Age is measured from the work week; submission time is not recorded.",
    });
  }
  for (const o of s.purchaseOrders.filter(
    (o) => o.status === "pending_approval",
  ))
    add({
      id: o.id,
      kind: "purchase_order",
      title: `${o.number ?? "Purchase order"} · ${o.vendor_name}`,
      projectId: o.project_id,
      amount: o.total,
      submittedAt: o.created_at,
      dueDate: o.expected_delivery,
      reviewer:
        o.approval_required_role === "director" ? "Director / owner" : "Owner",
      canReview:
        o.created_by !== s.me.id &&
        (s.me.roles.includes("owner") ||
          (o.approval_required_role === "director" &&
            s.me.roles.includes("director"))),
      href: `/projects/${o.project_id}?tab=procurement`,
      note: "Amount before GST",
    });
  for (const b of s.vendorBills.filter((b) => b.status === "recorded"))
    add({
      id: b.id,
      kind: "vendor_bill",
      title: `${b.bill_number} · ${b.vendor_name}`,
      projectId: b.project_id,
      amount: b.total,
      submittedAt: b.bill_date,
      dueDate: b.due_date,
      reviewer: "Finance / owner",
      canReview: finance,
      href: `/projects/${b.project_id}?tab=procurement`,
      note: b.match_issues.length
        ? `${b.match_issues.length} matching issue${b.match_issues.length === 1 ? "" : "s"} to resolve`
        : undefined,
    });
  return result.sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));
}
