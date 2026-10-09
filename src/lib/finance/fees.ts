import { round2 } from "./money";
import type { ChecklistItem, FeeStage, FeeTerms } from "@/types";

// Mirrors public.project_fee_value(); keep both in sync.
export function feeValue(t: FeeTerms): number | null {
  switch (t.fee_basis) {
    case "percent_of_cost":
      return t.fee_rate != null && t.estimated_construction_cost != null ? round2((t.fee_rate * t.estimated_construction_cost) / 100) : null;
    case "per_sqft":
      return t.fee_rate != null && t.area_sqft != null ? round2(t.fee_rate * t.area_sqft) : null;
    case "lump_sum":
      return t.fee_amount ?? null;
    default:
      return null;
  }
}

export const percentTotal = (stages: Pick<FeeStage, "percent">[]) => round2(stages.reduce((s, x) => s + x.percent, 0));

export const checklistDone = (c: ChecklistItem[]) => c.every((i) => i.done);

// Project progress = design stages' completion weighted by their fee share.
export function weightedProgress(stages: FeeStage[]): number | null {
  const design = stages.filter((s) => s.kind === "design_fee");
  const total = percentTotal(design);
  if (!total) return null;
  return Math.round(design.reduce((s, x) => s + x.percent * x.percent_complete, 0) / total);
}
