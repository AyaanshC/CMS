import { round2 } from "@/lib/finance/money";
import type { FeeStage, Invoice } from "@/types";

const DAY = 86_400_000;
const days = (from: string, to: string) => Math.round((Date.parse(to.slice(0, 10)) - Date.parse(from.slice(0, 10))) / DAY);
const isOpen = (i: Invoice) => (i.status === "sent" || i.status === "partial" || i.status === "overdue") && i.amount_due > 0;

export interface AgeingRow { client_name: string; notDue: number; d0_30: number; d31_60: number; d61_90: number; d90plus: number; total: number }

export function ageing(invoices: Invoice[], today: string): AgeingRow[] {
  const by = new Map<string, AgeingRow>();
  for (const i of invoices.filter(isOpen)) {
    const row = by.get(i.client_name) ?? { client_name: i.client_name, notDue: 0, d0_30: 0, d31_60: 0, d61_90: 0, d90plus: 0, total: 0 };
    const late = i.due_date ? days(i.due_date, today) : 0;
    const key = late <= 0 ? "notDue" : late <= 30 ? "d0_30" : late <= 60 ? "d31_60" : late <= 90 ? "d61_90" : "d90plus";
    row[key] = round2(row[key] + i.amount_due);
    row.total = round2(row.total + i.amount_due);
    by.set(i.client_name, row);
  }
  const rows = [...by.values()].sort((a, b) => b.total - a.total);
  const total = rows.reduce<AgeingRow>((t, r) => ({
    client_name: "Total", notDue: round2(t.notDue + r.notDue), d0_30: round2(t.d0_30 + r.d0_30), d31_60: round2(t.d31_60 + r.d31_60),
    d61_90: round2(t.d61_90 + r.d61_90), d90plus: round2(t.d90plus + r.d90plus), total: round2(t.total + r.total),
  }), { client_name: "Total", notDue: 0, d0_30: 0, d31_60: 0, d61_90: 0, d90plus: 0, total: 0 });
  return rows.length ? [...rows, total] : [];
}

// DSO = outstanding ÷ invoiced in the window × window days.
export function dso(invoices: Invoice[], today: string, windowDays = 90): number | null {
  const sent = invoices.filter((i) => i.status !== "draft" && i.status !== "cancelled");
  const sales = sent.filter((i) => i.issue_date && days(i.issue_date, today) <= windowDays).reduce((s, i) => s + i.total_amount, 0);
  if (sales <= 0) return null;
  const outstanding = sent.reduce((s, i) => s + i.amount_due, 0);
  return Math.round((outstanding / sales) * windowDays);
}

export function clientPaymentBehaviour(invoices: Invoice[]) {
  const by = new Map<string, { toPay: number[]; late: number[] }>();
  for (const i of invoices) {
    if (i.status !== "paid" || !i.issue_date || !i.due_date || !i.last_payment_date) continue;
    const b = by.get(i.client_name) ?? { toPay: [], late: [] };
    b.toPay.push(days(i.issue_date, i.last_payment_date));
    b.late.push(days(i.due_date, i.last_payment_date));
    by.set(i.client_name, b);
  }
  const mean = (xs: number[]) => Math.round(xs.reduce((a, b) => a + b, 0) / xs.length);
  return [...by.entries()].map(([client_name, b]) => ({
    client_name, paidInvoices: b.toPay.length, avgDaysToPay: mean(b.toPay), avgDaysLate: mean(b.late),
  })).sort((a, b) => b.avgDaysLate - a.avgDaysLate);
}

export function billingLagDays(stages: FeeStage[], invoices: Invoice[]): number | null {
  const lags = stages.flatMap((s) => {
    const issued = invoices.find((i) => i.fee_stage_id === s.id && i.issue_date);
    return s.completed_at && issued?.issue_date ? [days(s.completed_at, issued.issue_date)] : [];
  });
  return lags.length ? Math.round((lags.reduce((a, b) => a + b, 0) / lags.length) * 10) / 10 : null;
}

export const unbilledWip = (stages: FeeStage[]) => round2(stages.reduce((s, x) => s + Math.max(0, x.earned - x.invoiced), 0));
