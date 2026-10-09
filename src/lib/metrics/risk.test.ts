import { describe, expect, it } from "vitest";
import { DEFAULT_RISK_WEIGHTS, projectRisk } from "./risk";
import type { ChangeOrder, FeeStage, Invoice, Project, Snag } from "@/types";
import type { Profitability } from "@/lib/finance/profitability";

const project = { id: "p", status: "design", estimated_end_date: "2027-01-01" } as Project;
const profit = (o: Partial<Profitability> = {}) => ({ contractValue: 1_000_000, stages: [], ...o }) as Profitability;
const base = { project, stages: [] as FeeStage[], invoices: [] as Invoice[], snags: [] as Snag[], changeOrders: [] as ChangeOrder[], today: "2026-10-09", weights: DEFAULT_RISK_WEIGHTS };

describe("projectRisk", () => {
  it("is 0 for a healthy project", () => {
    expect(projectRisk({ ...base, profit: profit() }).score).toBe(0);
  });

  it("excludes factors without data from the denominator", () => {
    // Only fee burn maxed: 25 / (100 - 15 cost_variance - 10 approvals) = 25/75
    const r = projectRisk({ ...base, profit: profit({ stages: [{ id: "s", name: "B", amount: 1, percentComplete: 0, labourCost: 1, burnPct: 60, overBurn: true }] }) });
    expect(r.score).toBe(33);
    expect(r.factors.find((f) => f.key === "fee_burn")).toMatchObject({ value: 1, points: 25 });
    expect(r.factors.find((f) => f.key === "cost_variance")).toBeUndefined();
  });

  it("scores overdue receivables against 20% of contract value", () => {
    const r = projectRisk({ ...base, profit: profit(), invoices: [{ status: "overdue", due_date: "2026-08-01", amount_due: 100_000 }] as Invoice[] });
    expect(r.factors.find((f) => f.key === "overdue")?.value).toBe(0.5);
  });

  it("treats a passed end date as full schedule risk", () => {
    const late = { ...project, estimated_end_date: "2026-09-01" } as Project;
    expect(projectRisk({ ...base, project: late, profit: profit() }).factors.find((f) => f.key === "schedule")?.value).toBe(1);
  });

  it("doubles critical snag weight near handover", () => {
    const snags = [{ status: "raised", priority: "critical" }] as Snag[];
    const near = { ...project, status: "handover" } as Project;
    expect(projectRisk({ ...base, profit: profit(), snags }).factors.find((f) => f.key === "critical_snags")?.value).toBeCloseTo(1 / 3);
    expect(projectRisk({ ...base, project: near, profit: profit(), snags }).factors.find((f) => f.key === "critical_snags")?.value).toBeCloseTo(2 / 3);
  });

  it("includes cost variance once Phase 3 supplies it", () => {
    const r = projectRisk({ ...base, profit: profit(), costVariance: 0.1 });
    expect(r.factors.find((f) => f.key === "cost_variance")?.value).toBe(0.5);
  });
});
