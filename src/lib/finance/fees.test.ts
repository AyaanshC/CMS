import { describe, expect, it } from "vitest";
import { checklistDone, feeValue, percentTotal, weightedProgress } from "./fees";
import type { FeeStage } from "@/types";

const stage = (o: Partial<FeeStage>): FeeStage => ({
  id: "s", project_id: "p", kind: "design_fee", name: "", percent: 0, sort_order: 0, status: "not_started",
  percent_complete: 0, checklist: [], amount: 0, earned: 0, invoiced: 0, ...o,
});

describe("feeValue (mirrors project_fee_value in SQL)", () => {
  it("computes each basis", () => {
    expect(feeValue({ fee_basis: "percent_of_cost", fee_rate: 8, estimated_construction_cost: 10_000_000 })).toBe(800000);
    expect(feeValue({ fee_basis: "per_sqft", fee_rate: 150, area_sqft: 6200 })).toBe(930000);
    expect(feeValue({ fee_basis: "lump_sum", fee_amount: 500000 })).toBe(500000);
  });
  it("is null for hourly or incomplete terms", () => {
    expect(feeValue({ fee_basis: "hourly", fee_rate: 2000 })).toBeNull();
    expect(feeValue({ fee_basis: "percent_of_cost", fee_rate: 8 })).toBeNull();
    expect(feeValue({})).toBeNull();
  });
});

describe("percentTotal", () => {
  it("sums with rounding", () => {
    expect(percentTotal([stage({ percent: 33.33 }), stage({ percent: 33.33 }), stage({ percent: 33.34 })])).toBe(100);
  });
});

describe("checklistDone", () => {
  it("requires every item done; empty counts as done", () => {
    expect(checklistDone([{ label: "a", done: true }, { label: "b", done: false }])).toBe(false);
    expect(checklistDone([])).toBe(true);
  });
});

describe("weightedProgress", () => {
  it("weights percent complete by stage share", () => {
    expect(weightedProgress([stage({ percent: 20, percent_complete: 100 }), stage({ percent: 80, percent_complete: 50 })])).toBe(60);
  });
  it("ignores execution stages and returns null with no design stages", () => {
    expect(weightedProgress([stage({ kind: "execution", percent: 100, percent_complete: 100 })])).toBeNull();
  });
});
