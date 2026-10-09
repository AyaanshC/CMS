import { describe, expect, it } from "vitest";
import { portfolioRows } from "./portfolio";
import type { WorkspaceSnapshot } from "@/lib/data/snapshot";
import { DEFAULT_RISK_WEIGHTS } from "./risk";

const snap = {
  projects: [
    { id: "a", name: "A", status: "design", estimated_end_date: "2026-01-01" },
    { id: "b", name: "B", status: "design", estimated_end_date: "2027-01-01" },
    { id: "c", name: "C", status: "lead" },
  ],
  feeStages: [], changeOrders: [], invoices: [], projectCosts: [], expenses: [], snags: [],
  studioSettings: { risk_weights: DEFAULT_RISK_WEIGHTS },
} as unknown as WorkspaceSnapshot;

describe("portfolioRows", () => {
  it("ranks live projects by risk and drops leads", () => {
    const rows = portfolioRows(snap, "2026-10-09", false);
    expect(rows.map((r) => r.project.id)).toEqual(["a", "b"]);
    expect(rows[0].risk.score).toBeGreaterThan(rows[1].risk.score);
  });
});
