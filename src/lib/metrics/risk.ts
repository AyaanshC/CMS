import type { Profitability } from "@/lib/finance/profitability";
import type { ChangeOrder, FeeStage, Invoice, Project, RiskWeights, Snag } from "@/types";

export type { RiskWeights };
export const DEFAULT_RISK_WEIGHTS: RiskWeights = {
  fee_burn: 25, overdue: 20, schedule: 15, cost_variance: 15, approvals: 10, critical_snags: 10, pending_changes: 5,
};

export interface RiskFactor { key: keyof RiskWeights; label: string; value: number; weight: number; points: number; detail: string }

export interface RiskInput {
  project: Project; profit: Profitability; stages: FeeStage[]; invoices: Invoice[]; snags: Snag[];
  changeOrders: ChangeOrder[]; today: string; weights: RiskWeights;
  costVariance?: number | null; stalledApprovals?: number | null;
}

const DAY = 86_400_000;
const clamp = (x: number) => Math.max(0, Math.min(1, x));
const daysBetween = (a: string, b: string) => (Date.parse(b) - Date.parse(a)) / DAY;

export function projectRisk(i: RiskInput): { score: number; factors: RiskFactor[] } {
  const cv = i.profit.contractValue;
  const raw: { key: keyof RiskWeights; label: string; value: number | null; detail: string }[] = [];

  const burnGap = Math.max(0, ...i.profit.stages.map((s) => (s.burnPct ?? 0) - s.percentComplete));
  raw.push({ key: "fee_burn", label: "Fee burn ahead of progress", value: clamp(burnGap / 50), detail: `${Math.round(burnGap)} points ahead at worst stage` });

  const overdue30 = i.invoices.filter((v) => v.due_date && v.amount_due > 0 && v.status !== "draft" && v.status !== "cancelled"
    && daysBetween(v.due_date, i.today) >= 30).reduce((s, v) => s + v.amount_due, 0);
  raw.push({ key: "overdue", label: "Overdue receivables (30+ days)", value: cv > 0 ? clamp(overdue30 / (0.2 * cv)) : 0, detail: `₹${Math.round(overdue30).toLocaleString("en-IN")}` });

  const pastEnd = !!i.project.estimated_end_date && i.project.estimated_end_date < i.today && i.project.status !== "closed";
  const stageSlip = Math.max(0, ...i.stages.filter((s) => s.status === "in_progress" && s.planned_end && s.planned_end < i.today)
    .map((s) => daysBetween(s.planned_end!, i.today) / Math.max(1, s.planned_start ? daysBetween(s.planned_start, s.planned_end!) : 30)));
  raw.push({ key: "schedule", label: "Schedule slip", value: pastEnd ? 1 : clamp(stageSlip), detail: pastEnd ? "Past target end date" : "Stage(s) past planned end" });

  raw.push({ key: "cost_variance", label: "Cost over budget", value: i.costVariance == null ? null : clamp(i.costVariance / 0.2), detail: "Committed vs BOQ budget" });
  raw.push({ key: "approvals", label: "Stalled approvals", value: i.stalledApprovals == null ? null : clamp(i.stalledApprovals / 2), detail: "Statutory approvals past expected date" });

  const critical = i.snags.filter((s) => s.status !== "closed" && s.priority === "critical").length;
  const nearHandover = i.project.status === "snag" || i.project.status === "handover";
  raw.push({ key: "critical_snags", label: "Open critical snags", value: clamp((critical * (nearHandover ? 2 : 1)) / 3), detail: `${critical} open` });

  const pending = i.changeOrders.filter((c) => c.status === "submitted" && c.submitted_at && daysBetween(c.submitted_at, i.today) > 14)
    .reduce((s, c) => s + c.fee_impact, 0);
  raw.push({ key: "pending_changes", label: "Change orders awaiting client > 14 days", value: cv > 0 ? clamp(pending / (0.1 * cv)) : 0, detail: `₹${Math.round(pending).toLocaleString("en-IN")}` });

  const factors = raw
    .filter((f): f is typeof f & { value: number } => f.value !== null)
    .map((f) => ({ ...f, weight: i.weights[f.key], points: Math.round(f.value * i.weights[f.key] * 100) / 100 }));
  const totalWeight = factors.reduce((s, f) => s + f.weight, 0);
  const score = totalWeight ? Math.round((factors.reduce((s, f) => s + f.points, 0) / totalWeight) * 100) : 0;
  return { score, factors };
}
