import { describe, expect, it } from "vitest";
import {
  avgApprovalDays, avgSnagFixHours, cleanHandoverRate, dashboardKpis, fyStart, inputGst, monthlySeries,
  onTimeMilestones, outputGst, ratio, stageDistribution,
} from "./kpis";
import type { BOQVersion, Expense, Invoice, Payment, Project, Snag, Task, VendorBill } from "@/types";

const TODAY = "2026-10-09";
const inv = (o: Partial<Invoice>): Invoice => ({
  id: "i", project_id: "p1", project_name: "", client_name: "", status: "sent", subtotal: 0, discount: 0,
  gst_rate: 18, gst_amount: 0, total_amount: 0, amount_paid: 0, amount_due: 0,
  tds_amount: 0, credited: 0, retention_amount: 0, retention_held: 0, ...o,
});
const proj = (o: Partial<Project>): Project => ({
  id: "p1", client_id: "c", client_name: "", name: "", reference_number: "", status: "design",
  progress_percent: 0, portal_slug: "", created_at: "", ...o,
});

describe("ratio", () => {
  it("returns null instead of NaN or Infinity", () => {
    expect(ratio(0, 0)).toBeNull();
    expect(ratio(5, 0)).toBeNull();
    expect(ratio(1, 4)).toBe(0.25);
  });
});

describe("dashboardKpis", () => {
  it("counts real records", () => {
    const k = dashboardKpis({
      projects: [proj({ status: "execution" }), proj({ id: "p2", status: "closed" }), proj({ id: "p3", status: "lead" })],
      invoices: [inv({ status: "overdue", amount_due: 100 }), inv({ status: "draft", amount_due: 999 }), inv({ status: "partial", amount_due: 50 })],
      payments: [{ id: "a", invoice_id: "i", amount: 70, payment_date: "2026-10-01", mode: "upi" }, { id: "b", invoice_id: "i", amount: 30, payment_date: "2026-09-30", mode: "upi" }] as Payment[],
      snags: [{ status: "raised", priority: "critical" }, { status: "closed", priority: "critical" }] as Snag[],
      tasks: [{ status: "todo", due_date: TODAY }, { status: "done", due_date: TODAY }, { status: "todo", due_date: "2026-10-01" }] as Task[],
      boqs: [{ status: "submitted" }, { status: "approved" }] as BOQVersion[],
    }, TODAY);
    expect(k).toEqual({
      activeProjects: 1, collectedThisMonth: 70, outstanding: 150, overdueInvoices: 1, openSnags: 1,
      criticalSnags: 1, tasksDueToday: 1, overdueTasks: 1, pendingApprovals: 1,
    });
  });

  it("is all zeros with no data", () => {
    const k = dashboardKpis({ projects: [], invoices: [], payments: [], snags: [], tasks: [], boqs: [] }, TODAY);
    expect(Object.values(k).every((v) => v === 0)).toBe(true);
  });
});

describe("monthlySeries", () => {
  it("buckets the last N months ending this month", () => {
    const s = monthlySeries(
      [inv({ issue_date: "2026-10-02", total_amount: 1000 }), inv({ issue_date: "2026-08-15", total_amount: 500 }), inv({ status: "draft", issue_date: "2026-10-03", total_amount: 9 })],
      [{ id: "p", invoice_id: "i", amount: 400, payment_date: "2026-10-05", mode: "upi" }] as Payment[],
      [{ id: "e", project_id: "p1", category: "", description: "", amount: 200, expense_date: "2026-09-10" }] as Expense[],
      TODAY, 3,
    );
    expect(s.map((m) => m.key)).toEqual(["2026-08", "2026-09", "2026-10"]);
    expect(s[2]).toMatchObject({ invoiced: 1000, collected: 400, expenses: 0 });
    expect(s[1].expenses).toBe(200);
    expect(s[0].invoiced).toBe(500);
  });

  it("crosses a year boundary", () => {
    expect(monthlySeries([], [], [], "2026-02-01", 3).map((m) => m.key)).toEqual(["2025-12", "2026-01", "2026-02"]);
  });
});

describe("delivery and quality metrics", () => {
  it("returns null when nothing is measurable", () => {
    expect(onTimeMilestones([proj({ milestones: [] })])).toBeNull();
    expect(avgApprovalDays([])).toBeNull();
    expect(avgSnagFixHours([{ created_at: "2026-10-01T00:00:00Z" } as Snag])).toBeNull();
    expect(cleanHandoverRate([proj({ status: "design" })], [])).toBeNull();
  });

  it("measures on-time milestones by date", () => {
    const p = proj({ milestones: [
      { id: "1", project_id: "p1", title: "", due_date: "2026-10-05", completed_at: "2026-10-05T18:00:00Z" },
      { id: "2", project_id: "p1", title: "", due_date: "2026-10-05", completed_at: "2026-10-06T09:00:00Z" },
      { id: "3", project_id: "p1", title: "", due_date: "2026-10-20" },
    ] });
    expect(onTimeMilestones([p])).toEqual({ met: 1, total: 2 });
  });

  it("averages approval days and fix hours", () => {
    expect(avgApprovalDays([
      { status: "approved", submitted_at: "2026-10-01T00:00:00Z", approved_at: "2026-10-03T00:00:00Z" },
      { status: "approved", submitted_at: "2026-10-01T00:00:00Z", approved_at: "2026-10-02T00:00:00Z" },
    ] as BOQVersion[])).toBe(1.5);
    expect(avgSnagFixHours([{ created_at: "2026-10-01T00:00:00Z", fixed_at: "2026-10-02T12:00:00Z" }] as Snag[])).toBe(36);
  });

  it("counts handovers with zero open snags", () => {
    const r = cleanHandoverRate(
      [proj({ id: "a", status: "handover" }), proj({ id: "b", status: "closed" })],
      [{ project_id: "a", status: "raised" }, { project_id: "b", status: "closed" }] as Snag[],
    );
    expect(r).toEqual({ clean: 1, total: 2 });
  });
});

describe("GST", () => {
  it("starts the financial year in April", () => {
    expect(fyStart("2026-10-09")).toBe("2026-04-01");
    expect(fyStart("2026-02-01")).toBe("2025-04-01");
  });

  it("sums output GST of issued invoices in range", () => {
    expect(outputGst([
      inv({ issue_date: "2026-05-01", gst_amount: 1800 }),
      inv({ issue_date: "2026-03-31", gst_amount: 900 }),
      inv({ status: "cancelled", issue_date: "2026-06-01", gst_amount: 500 }),
      inv({ status: "draft", gst_amount: 100 }),
    ], "2026-04-01", TODAY)).toBe(1800);
  });
});

describe("stageDistribution", () => {
  it("lists non-empty stages in pipeline order", () => {
    expect(stageDistribution([proj({ status: "execution" }), proj({ status: "lead" }), proj({ status: "execution" })]))
      .toEqual([{ stage: "lead", label: "Lead", count: 1 }, { stage: "execution", label: "Execution", count: 2 }]);
  });
});

describe("inputGst", () => {
  it("sums GST on approved vendor bills in range", () => {
    expect(inputGst([
      { status: "approved", bill_date: "2026-05-01", gst_amount: 900 },
      { status: "disputed", bill_date: "2026-05-01", gst_amount: 500 },
      { status: "approved", bill_date: "2026-03-01", gst_amount: 100 },
    ] as VendorBill[], "2026-04-01", "2026-10-09")).toBe(900);
  });
});
