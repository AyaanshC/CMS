import { describe, expect, it } from "vitest";
import { ageing, billingLagDays, clientPaymentBehaviour, dso, unbilledWip } from "./receivables";
import type { FeeStage, Invoice } from "@/types";

const TODAY = "2026-10-09";
const inv = (o: Partial<Invoice>): Invoice => ({
  id: "i", project_id: "p", project_name: "", client_name: "A", status: "sent", subtotal: 0, discount: 0, gst_rate: 18,
  gst_amount: 0, total_amount: 0, amount_paid: 0, amount_due: 0, tds_amount: 0, credited: 0, retention_amount: 0, retention_held: 0, ...o,
});
const st = (o: Partial<FeeStage>): FeeStage => ({
  id: "s", project_id: "p", kind: "design_fee", name: "", percent: 10, sort_order: 0, status: "complete", percent_complete: 100,
  checklist: [], amount: 0, earned: 0, invoiced: 0, ...o,
});

describe("ageing", () => {
  it("buckets by days past due and totals per client", () => {
    const rows = ageing([
      inv({ client_name: "A", due_date: "2026-10-20", amount_due: 100 }),           // not due
      inv({ client_name: "A", due_date: "2026-10-01", amount_due: 200, status: "overdue" }),  // 8 days
      inv({ client_name: "B", due_date: "2026-07-01", amount_due: 300, status: "overdue" }),  // 100 days
      inv({ client_name: "B", due_date: "2026-08-25", amount_due: 50, status: "overdue" }),   // 45 days
      inv({ client_name: "C", status: "paid", due_date: "2026-01-01", amount_due: 0 }),
      inv({ client_name: "D", status: "draft", amount_due: 999 }),
    ], TODAY);
    expect(rows[0]).toMatchObject({ client_name: "B", d31_60: 50, d90plus: 300, total: 350 });
    expect(rows[1]).toMatchObject({ client_name: "A", notDue: 100, d0_30: 200, total: 300 });
    expect(rows.at(-1)).toMatchObject({ client_name: "Total", total: 650 });
    expect(rows.find((r) => r.client_name === "C")).toBeUndefined();
  });
});

describe("dso", () => {
  it("is outstanding over recent sales times days", () => {
    expect(dso([inv({ issue_date: "2026-09-01", total_amount: 900, amount_due: 300 })], TODAY)).toBe(30);
  });
  it("is null without recent sales", () => {
    expect(dso([inv({ issue_date: "2025-01-01", total_amount: 900, amount_due: 300 })], TODAY)).toBeNull();
  });
});

describe("clientPaymentBehaviour", () => {
  it("averages days to pay and days late for fully paid invoices", () => {
    const [b] = clientPaymentBehaviour([
      inv({ client_name: "A", status: "paid", issue_date: "2026-09-01", due_date: "2026-09-15", last_payment_date: "2026-09-21" }),
      inv({ client_name: "A", status: "paid", issue_date: "2026-08-01", due_date: "2026-08-15", last_payment_date: "2026-08-11" }),
      inv({ client_name: "A", status: "partial", issue_date: "2026-08-01", due_date: "2026-08-15", last_payment_date: "2026-08-30" }),
    ]);
    expect(b).toEqual({ client_name: "A", paidInvoices: 2, avgDaysToPay: 15, avgDaysLate: 1 });
  });
});

describe("billingLagDays and unbilled WIP", () => {
  it("measures stage completion to invoice issue", () => {
    expect(billingLagDays([st({ id: "s1", completed_at: "2026-10-01T10:00:00Z" })],
      [inv({ fee_stage_id: "s1", issue_date: "2026-10-04" })])).toBe(3);
    expect(billingLagDays([], [])).toBeNull();
  });
  it("sums earned but not invoiced", () => {
    expect(unbilledWip([st({ earned: 1000, invoiced: 400 }), st({ earned: 200, invoiced: 300 })])).toBe(600);
  });
});
