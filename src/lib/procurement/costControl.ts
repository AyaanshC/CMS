import { round2 } from "@/lib/finance/money";
import type { CostControlRow } from "@/types";

export function lineVariance(r: CostControlRow): { status: "no_budget" | "ok" | "over"; overBy: number } {
  if (r.budget == null) return { status: "no_budget", overBy: 0 };
  const spend = Math.max(r.committed, r.actual);
  return spend > r.budget ? { status: "over", overBy: round2(spend - r.budget) } : { status: "ok", overBy: 0 };
}

export function categoryRollup(rows: CostControlRow[]) {
  const by = new Map<string, CostControlRow[]>();
  for (const r of rows) by.set(r.category, [...(by.get(r.category) ?? []), r]);
  const roll = (category: string, xs: CostControlRow[]) => {
    const sell = round2(xs.reduce((s, x) => s + x.sell_amount, 0));
    const budget = xs.every((x) => x.budget != null) ? round2(xs.reduce((s, x) => s + (x.budget ?? 0), 0)) : null;
    const committed = round2(xs.reduce((s, x) => s + x.committed, 0));
    const actual = round2(xs.reduce((s, x) => s + x.actual, 0));
    return {
      category, sell, budget, committed, actual,
      plannedMargin: budget === null ? null : round2(sell - budget),
      variance: budget === null ? null : round2(Math.max(committed, actual) - budget),
    };
  };
  const cats = [...by.entries()].map(([c, xs]) => roll(c, xs)).sort((a, b) => b.sell - a.sell);
  return rows.length ? [...cats, roll("Total", rows)] : [];
}

export function costVariance(rows: CostControlRow[]): number | null {
  const budgeted = rows.filter((r) => r.budget != null);
  const budget = budgeted.reduce((s, r) => s + r.budget!, 0);
  if (budget <= 0) return null;
  return budgeted.reduce((s, r) => s + Math.max(0, r.committed - r.budget!), 0) / budget;
}

export const executionForecast = (rows: CostControlRow[]) =>
  round2(rows.reduce((s, r) => s + Math.max(r.budget ?? 0, r.committed, r.actual), 0));
