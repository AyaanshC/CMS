import type { Invoice, Expense, VendorPayment } from "@/types";
import { round2 } from "./money";
export function invoiceSummary(invoices: Invoice[]) {
  const live = invoices.filter(i => i.status !== "draft" && i.status !== "cancelled");
  return { invoiced: round2(live.reduce((s,i) => s + i.total_amount,0)), collected: round2(live.reduce((s,i) => s + i.amount_paid,0)), outstanding: round2(live.reduce((s,i) => s + i.amount_due,0)) };
}
// Expenses represent direct cash spends; approved vendor-bill settlements are a
// separate ledger. TDS is a liability, not a cash payout to the vendor.
export function cashOutflows(expenses: Expense[], vendorPayments: VendorPayment[]) {
  return [...expenses.filter(e => !e.status || e.status === "approved").map(e => ({ date: e.expense_date, amount: e.amount })), ...vendorPayments.map(p => ({ date: p.paid_on, amount: p.amount }))];
}
