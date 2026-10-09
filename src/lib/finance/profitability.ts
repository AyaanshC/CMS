import { ratio } from "@/lib/metrics/kpis";
import { round2 } from "./money";
import type { ChangeOrder, Expense, FeeStage, Invoice, ProjectCostRow } from "@/types";

export interface ProfitInput {
  stages: FeeStage[];
  changeOrders: ChangeOrder[];
  invoices: Invoice[];
  costs: ProjectCostRow[];
  expenses: Expense[];
  useActual: boolean;
}

export interface StageBurn {
  id: string; name: string; amount: number; percentComplete: number; labourCost: number; burnPct: number | null; overBurn: boolean;
}

export interface Profitability {
  contractValue: number; earned: number; labourCost: number; directCost: number;
  marginToDate: number; marginPct: number | null; percentComplete: number | null;
  eacMargin: number | null; eacMarginPct: number | null;
  hours: number; unratedHours: number; costBasis: "actual" | "blended";
  stages: StageBurn[];
}

const BURN_TOLERANCE = 15; // percentage points (spec 5.1 M2)
const sum = (xs: number[]) => round2(xs.reduce((a, b) => a + b, 0));

// Formulas: spec section 4.5. Each line below is shown to users as the metric's formula.
export function projectProfitability(i: ProfitInput): Profitability {
  const actual = i.useActual && i.costs.length > 0 && i.costs.every((c) => c.actual_cost != null);
  const costOf = (c: ProjectCostRow) => (actual ? c.actual_cost! : c.blended_cost);

  const stageAmount = sum(i.stages.map((s) => s.amount));
  const stageEarned = sum(i.stages.map((s) => s.earned));
  const coFees = sum(i.changeOrders.filter((c) => c.status === "approved").map((c) => c.fee_impact));
  const coEarned = sum(i.invoices
    .filter((v) => v.change_order_id && v.status !== "draft" && v.status !== "cancelled")
    .map((v) => v.subtotal - v.discount));

  const contractValue = round2(stageAmount + coFees);
  const earned = round2(stageEarned + coEarned);
  const labourCost = sum(i.costs.map(costOf));
  const directCost = sum(i.expenses.map((e) => e.amount));
  const marginToDate = round2(earned - labourCost - directCost);
  const percentComplete = stageAmount > 0 ? stageEarned / stageAmount : null;

  const eacMargin = percentComplete ? round2(contractValue - (labourCost + directCost) / percentComplete) : null;

  return {
    contractValue, earned, labourCost, directCost, marginToDate,
    marginPct: ratio(marginToDate, earned),
    percentComplete,
    eacMargin,
    eacMarginPct: eacMargin === null ? null : ratio(eacMargin, contractValue),
    hours: sum(i.costs.map((c) => c.hours)),
    unratedHours: sum(i.costs.map((c) => c.unrated_hours)),
    costBasis: actual ? "actual" : "blended",
    stages: i.stages.map((s) => {
      const labour = sum(i.costs.filter((c) => c.fee_stage_id === s.id).map(costOf));
      const burnPct = s.amount > 0 ? Math.round((labour / s.amount) * 100) : null;
      return {
        id: s.id, name: s.name, amount: s.amount, percentComplete: s.percent_complete, labourCost: labour, burnPct,
        overBurn: burnPct !== null && burnPct - s.percent_complete > BURN_TOLERANCE,
      };
    }),
  };
}
