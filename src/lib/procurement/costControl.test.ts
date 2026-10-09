import { describe, expect, it } from "vitest";
import { categoryRollup, costVariance, executionForecast, lineVariance } from "./costControl";
import type { CostControlRow } from "@/types";

const row = (o: Partial<CostControlRow>): CostControlRow => ({
  project_id: "p", line_item_id: "l", category: "Civil", description: "", unit: "sqft", quantity: 1, sell_rate: 0,
  sell_amount: 0, committed: 0, actual: 0, ...o,
});

describe("lineVariance", () => {
  it("no_budget_line: reports missing budget explicitly", () => {
    expect(lineVariance(row({ committed: 500 }))).toEqual({ status: "no_budget", overBy: 0 });
  });
  it("flags over budget using the larger of committed and actual", () => {
    expect(lineVariance(row({ budget: 1000, committed: 900, actual: 1100 }))).toEqual({ status: "over", overBy: 100 });
    expect(lineVariance(row({ budget: 1000, committed: 900 }))).toEqual({ status: "ok", overBy: 0 });
  });
});

describe("categoryRollup", () => {
  it("sums by category and marks partial budgets", () => {
    const r = categoryRollup([
      row({ category: "Civil", sell_amount: 22800, budget: 16800, committed: 18000 }),
      row({ category: "Civil", sell_amount: 11250, committed: 0 }),
      row({ category: "Carpentry", sell_amount: 50000, budget: 35000, committed: 30000, actual: 30000 }),
    ]);
    expect(r.find((x) => x.category === "Civil")).toMatchObject({ sell: 34050, budget: null, committed: 18000, plannedMargin: null });
    expect(r.find((x) => x.category === "Carpentry")).toMatchObject({ budget: 35000, plannedMargin: 15000, variance: -5000 });
    expect(r.at(-1)?.category).toBe("Total");
  });
});

describe("costVariance", () => {
  it("is overspend over budget, ignoring unbudgeted lines", () => {
    expect(costVariance([row({ budget: 16800, committed: 18000 }), row({ budget: 8100, committed: 8000 }), row({ committed: 999 })]))
      .toBeCloseTo(1200 / 24900, 6);
    expect(costVariance([row({ committed: 5 })])).toBeNull();
  });
});

describe("executionForecast", () => {
  it("takes the largest of budget, committed and actual per line", () => {
    expect(executionForecast([row({ budget: 100, committed: 120, actual: 50 }), row({ committed: 30 })])).toBe(150);
  });
});
