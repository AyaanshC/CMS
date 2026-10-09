import { round2 } from "@/lib/finance/money";
import { PROJECT_STAGES, PROJECT_STAGE_LABELS } from "@/types";
import type { BOQVersion, Expense, Invoice, Payment, Project, ProjectStatus, Snag, Task, VendorBill } from "@/types";

// Pure metric functions. A metric that cannot be measured returns null so the UI
// shows "Not enough data yet" instead of NaN, 0% or a made-up value.

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const sum = (xs: number[]) => round2(xs.reduce((a, b) => a + b, 0));
const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null);
const isLive = (i: Invoice) => i.status !== "draft" && i.status !== "cancelled";

export const ratio = (num: number, den: number): number | null => (den > 0 ? num / den : null);

export interface DashboardKpis {
  activeProjects: number;
  collectedThisMonth: number;
  outstanding: number;
  overdueInvoices: number;
  openSnags: number;
  criticalSnags: number;
  tasksDueToday: number;
  overdueTasks: number;
  pendingApprovals: number;
}

export function dashboardKpis(
  s: { projects: Project[]; invoices: Invoice[]; payments: Payment[]; snags: Snag[]; tasks: Task[]; boqs: BOQVersion[] },
  today: string,
): DashboardKpis {
  const month = today.slice(0, 7);
  const openTasks = s.tasks.filter((t) => t.status !== "done");
  const openSnags = s.snags.filter((x) => x.status !== "closed");
  return {
    activeProjects: s.projects.filter((p) => p.status !== "closed" && p.status !== "lead").length,
    collectedThisMonth: sum(s.payments.filter((p) => p.payment_date.startsWith(month)).map((p) => p.amount)),
    outstanding: sum(s.invoices.filter(isLive).map((i) => i.amount_due)),
    overdueInvoices: s.invoices.filter((i) => i.status === "overdue").length,
    openSnags: openSnags.length,
    criticalSnags: openSnags.filter((x) => x.priority === "critical").length,
    tasksDueToday: openTasks.filter((t) => t.due_date === today).length,
    overdueTasks: openTasks.filter((t) => !!t.due_date && t.due_date < today).length,
    pendingApprovals: s.boqs.filter((b) => b.status === "submitted").length,
  };
}

export function monthlySeries(invoices: Invoice[], payments: Payment[], expenses: Expense[], today: string, months = 6) {
  const [y, m] = today.split("-").map(Number);
  const keys = Array.from({ length: months }, (_, i) =>
    new Date(Date.UTC(y, m - 1 - (months - 1 - i), 1)).toISOString().slice(0, 7),
  );
  return keys.map((key) => ({
    key,
    month: new Date(`${key}-01T00:00:00Z`).toLocaleString("en-IN", { month: "short", timeZone: "UTC" }),
    invoiced: sum(invoices.filter((i) => isLive(i) && i.issue_date?.startsWith(key)).map((i) => i.total_amount)),
    collected: sum(payments.filter((p) => p.payment_date.startsWith(key)).map((p) => p.amount)),
    expenses: sum(expenses.filter((e) => e.expense_date.startsWith(key)).map((e) => e.amount)),
  }));
}

export function stageDistribution(projects: Project[]): { stage: ProjectStatus; label: string; count: number }[] {
  return PROJECT_STAGES.map((stage) => ({ stage, label: PROJECT_STAGE_LABELS[stage], count: projects.filter((p) => p.status === stage).length }))
    .filter((x) => x.count > 0);
}

export function onTimeMilestones(projects: Project[]): { met: number; total: number } | null {
  const done = projects.flatMap((p) => p.milestones ?? []).filter((m) => m.completed_at && m.due_date);
  if (!done.length) return null;
  return { met: done.filter((m) => m.completed_at!.slice(0, 10) <= m.due_date!).length, total: done.length };
}

export function avgApprovalDays(boqs: BOQVersion[]): number | null {
  return avg(boqs.filter((b) => b.status === "approved" && b.submitted_at && b.approved_at)
    .map((b) => (Date.parse(b.approved_at!) - Date.parse(b.submitted_at!)) / DAY));
}

export function avgSnagFixHours(snags: Snag[]): number | null {
  return avg(snags.filter((s) => s.fixed_at).map((s) => (Date.parse(s.fixed_at!) - Date.parse(s.created_at)) / HOUR));
}

export function cleanHandoverRate(projects: Project[], snags: Snag[]): { clean: number; total: number } | null {
  const handed = projects.filter((p) => p.status === "handover" || p.status === "closed");
  if (!handed.length) return null;
  const clean = handed.filter((p) => !snags.some((s) => s.project_id === p.id && s.status !== "closed")).length;
  return { clean, total: handed.length };
}

export function fyStart(today: string): string {
  const [y, m] = today.split("-").map(Number);
  return `${m >= 4 ? y : y - 1}-04-01`;
}

export function outputGst(invoices: Invoice[], from: string, to: string): number {
  return sum(invoices.filter((i) => isLive(i) && i.issue_date && i.issue_date >= from && i.issue_date <= to).map((i) => i.gst_amount));
}

export function inputGst(bills: VendorBill[], from: string, to: string): number {
  return sum(bills.filter((b) => b.status === "approved" && b.bill_date >= from && b.bill_date <= to).map((b) => b.gst_amount));
}
