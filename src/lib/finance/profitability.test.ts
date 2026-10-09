import { describe, expect, it } from "vitest";
import { projectProfitability } from "./profitability";
import type { ChangeOrder, CostControlRow, Expense, FeeStage, Invoice, ProjectCostRow, VendorBill } from "@/types";

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
const expenses = [{ amount: 10000, cost_type: "design", status: "approved" }] as Expense[];

describe("projectProfitability", () => {
  const p = projectProfitability({ stages, changeOrders, invoices, costs, expenses, vendorBills: [], costRows: [], useActual: false });

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
    const a = projectProfitability({ stages, changeOrders, invoices, costs, expenses, vendorBills: [], costRows: [], useActual: true });
    expect(a.labourCost).toBe(170000);
    expect(a.costBasis).toBe("actual");
  });

  it("falls back to blended when actual is hidden", () => {
    const hidden = costs.map((c) => ({ ...c, actual_cost: undefined }));
    expect(projectProfitability({ stages, changeOrders, invoices, costs: hidden, expenses, vendorBills: [], costRows: [], useActual: true }).costBasis).toBe("blended");
  });

  it("unrated_hours_reported", () => {
    expect(p.unratedHours).toBe(5);
  });

  it("eac_zero_progress: no EAC at 0% complete", () => {
    const fresh = stages.map((s) => ({ ...s, percent_complete: 0, earned: 0 }));
    const z = projectProfitability({ stages: fresh, changeOrders: [], invoices: [], costs, expenses, vendorBills: [], costRows: [], useActual: false });
    expect(z.percentComplete).toBe(0);
    expect(z.eacMargin).toBeNull();
    expect(z.marginPct).toBeNull();
  });
});

describe("execution projects", () => {
  const exStages = [
    ...stages,
    { id: "X", project_id: "p", kind: "execution", name: "Advance", percent: 100, sort_order: 1, status: "in_progress", percent_complete: 50, checklist: [], amount: 500000, earned: 250000, invoiced: 0 },
  ] as FeeStage[];
  const vendorBills = [{ status: "approved", subtotal: 150000 }, { status: "disputed", subtotal: 99999 }] as VendorBill[];
  const execExpenses = [{ amount: 10000, cost_type: "design", status: "approved" }, { amount: 20000, cost_type: "execution", status: "approved" }, { amount: 5000, cost_type: "execution", status: "rejected" }] as Expense[];
  const costRows = [{ budget: 350000, committed: 360000, actual: 150000, sell_amount: 500000 }] as CostControlRow[];

  const p = projectProfitability({ stages: exStages, changeOrders, invoices, costs, expenses: execExpenses, vendorBills, costRows, useActual: false });

  it("splits execution margin from design margin", () => {
    expect(p.executionEarned).toBe(250000);
    expect(p.executionCost).toBe(170000);          // 150000 bills + 20000 execution expenses
    expect(p.executionMargin).toBe(80000);
    expect(p.plannedExecutionMargin).toBe(150000); // 500000 sell - 350000 budget
    expect(p.designMargin).toBe(p.marginToDate - 80000);
  });

  it("ignores disputed bills and rejected expenses", () => {
    expect(p.directCost).toBe(180000);              // 10000 + 20000 + 150000
  });

  it("uses the execution forecast in EAC", () => {
    // percentComplete = (120000 + 250000) / (300000 + 500000) = 0.4625
    // EAC = 845000 - (150000 labour + 10000 design direct) / 0.4625 - 360000 forecast
    expect(p.eacMargin).toBeCloseTo(845000 - 160000 / 0.4625 - 360000, 0);
  });
});
