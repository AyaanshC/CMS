import { describe, expect, it } from "vitest";
import { projectProfitability } from "./profitability";
import type { ChangeOrder, Expense, FeeStage, Invoice, ProjectCostRow } from "@/types";

// Lump-sum design fee 3,00,000: stage A 20% (done), stage B 80% (25% done).
const stages = [
  { id: "A", project_id: "p", kind: "design_fee", name: "A", percent: 20, sort_order: 1, status: "complete", percent_complete: 100, checklist: [], amount: 60000, earned: 60000, invoiced: 60000 },
  { id: "B", project_id: "p", kind: "design_fee", name: "B", percent: 80, sort_order: 2, status: "in_progress", percent_complete: 25, checklist: [], amount: 240000, earned: 60000, invoiced: 0 },
] as FeeStage[];
const changeOrders = [{ id: "co", status: "approved", fee_impact: 45000 }] as ChangeOrder[];
const invoices = [{ change_order_id: "co", status: "sent", subtotal: 45000, discount: 0 }] as Invoice[];
const costs: ProjectCostRow[] = [
  { project_id: "p", fee_stage_id: "A", hours: 30, billable_hours: 30, unrated_hours: 0, blended_cost: 30000, actual_cost: 40000 },
  { project_id: "p", fee_stage_id: "B", hours: 100, billable_hours: 100, unrated_hours: 5, blended_cost: 120000, actual_cost: 130000 },
];
const expenses = [{ amount: 10000 }] as Expense[];

describe("projectProfitability", () => {
  const p = projectProfitability({ stages, changeOrders, invoices, costs, expenses, useActual: false });

  it("computes contract value, earned and margin to date", () => {
    expect(p.contractValue).toBe(345000);
    expect(p.earned).toBe(165000);
    expect(p.labourCost).toBe(150000);
    expect(p.directCost).toBe(10000);
    expect(p.marginToDate).toBe(5000);
    expect(p.marginPct).toBeCloseTo(0.0303, 3);
  });

  it("projects margin at completion", () => {
    expect(p.percentComplete).toBe(0.4);
    expect(p.eacMargin).toBe(-55000);              // 345000 - 160000 / 0.4
  });

  it("flags stages burning faster than progress", () => {
    expect(p.stages.find((s) => s.id === "A")).toMatchObject({ burnPct: 50, overBurn: false });
    expect(p.stages.find((s) => s.id === "B")).toMatchObject({ burnPct: 50, overBurn: true });
  });

  it("uses actual cost when asked and available", () => {
    const a = projectProfitability({ stages, changeOrders, invoices, costs, expenses, useActual: true });
    expect(a.labourCost).toBe(170000);
    expect(a.costBasis).toBe("actual");
  });

  it("falls back to blended when actual is hidden", () => {
    const hidden = costs.map(({ actual_cost: _, ...c }) => c);
    expect(projectProfitability({ stages, changeOrders, invoices, costs: hidden, expenses, useActual: true }).costBasis).toBe("blended");
  });

  it("unrated_hours_reported", () => {
    expect(p.unratedHours).toBe(5);
  });

  it("eac_zero_progress: no EAC at 0% complete", () => {
    const fresh = stages.map((s) => ({ ...s, percent_complete: 0, earned: 0 }));
    const z = projectProfitability({ stages: fresh, changeOrders: [], invoices: [], costs, expenses, useActual: false });
    expect(z.percentComplete).toBe(0);
    expect(z.eacMargin).toBeNull();
    expect(z.marginPct).toBeNull();
  });
});
