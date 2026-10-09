"use client";

import { TopBar } from "@/components/layout/AppSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AgeingTable } from "@/components/finance/AgeingTable";
import { InvoiceQueue } from "@/components/finance/InvoiceQueue";
import { MetricInfo } from "@/components/metrics/MetricInfo";
import { NotEnoughData } from "@/components/metrics/NotEnoughData";
import { ageing, billingLagDays, clientPaymentBehaviour, dso, unbilledWip } from "@/lib/metrics/receivables";
import { useAppStore } from "@/lib/store";
import { addDays } from "@/lib/time/weeks";
import { formatCurrency, formatDate, localToday } from "@/lib/utils";

export default function FinancePage() {
  const { invoices, feeStages, vendorBills, expenses, decideExpense } = useAppStore();
  const today = localToday();
  const in7Days = addDays(today, 7);
  const rows = ageing(invoices, today);
  const d = dso(invoices, today);
  const lag = billingLagDays(feeStages, invoices);
  const wip = unbilledWip(feeStages);
  const behaviour = clientPaymentBehaviour(invoices);
  const overdue = invoices.filter((i) => i.status === "overdue").reduce((s, i) => s + i.amount_due, 0);

  const payablesDue = vendorBills.filter(
    (b) => b.status === "approved" && b.outstanding > 0 && b.due_date && b.due_date <= in7Days
  );
  const totalPayablesDue = payablesDue.reduce((sum, b) => sum + b.outstanding, 0);
  const pendingExpenses = expenses.filter((e) => e.status === "pending");

  const tiles = [
    { label: "Unbilled work", value: formatCurrency(wip), formula: "Fee earned on stages (fee × % complete) minus amount invoiced for those stages" },
    { label: "Overdue", value: formatCurrency(overdue), formula: "Amount due on invoices past their due date" },
    { label: "Days sales outstanding", value: d === null ? null : `${d} days`, formula: "Outstanding ÷ invoiced in last 90 days × 90" },
    { label: "Billing lag", value: lag === null ? null : `${lag} days`, formula: "Average days from stage completion to invoice issue" },
  ];

  return (
    <div>
      <TopBar title="Finance" subtitle="Invoicing queue, receivables and collections" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {tiles.map((t) => (
            <Card key={t.label}><CardContent className="p-4">
              <p className="text-xs text-muted-foreground flex items-center gap-1">{t.label} <MetricInfo formula={t.formula} /></p>
              {t.value === null ? <NotEnoughData /> : <p className="text-2xl font-bold mt-1">{t.value}</p>}
            </CardContent></Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">Payables due in 7 days</p>
                <p className="text-xs text-muted-foreground">Approved vendor bills due by {formatDate(in7Days)}</p>
              </div>
              <p className="text-lg font-bold text-amber-600">{formatCurrency(totalPayablesDue)}</p>
            </div>
            {payablesDue.length === 0 ? (
              <p className="text-xs text-muted-foreground">No payables due in the next 7 days.</p>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-muted-foreground text-left">
                    <th className="py-1">Vendor</th>
                    <th>Bill #</th>
                    <th>Due date</th>
                    <th className="text-right">Total</th>
                    <th className="text-right">Outstanding</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {payablesDue.map((b) => (
                    <tr key={b.id}>
                      <td className="py-1.5 font-medium">{b.vendor_name}</td>
                      <td>{b.bill_number}</td>
                      <td className={b.due_date! < today ? "text-red-600 font-medium" : ""}>
                        {formatDate(b.due_date!)}
                      </td>
                      <td className="text-right">{formatCurrency(b.total)}</td>
                      <td className="text-right font-semibold">{formatCurrency(b.outstanding)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">Expenses awaiting approval ({pendingExpenses.length})</p>
                <p className="text-xs text-muted-foreground">Requires owner or finance decision</p>
              </div>
            </div>
            {pendingExpenses.length === 0 ? (
              <p className="text-xs text-muted-foreground">No expenses awaiting approval.</p>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-muted-foreground text-left">
                    <th className="py-1">Date</th>
                    <th>Category</th>
                    <th>Description</th>
                    <th className="text-right">Amount</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {pendingExpenses.map((exp) => (
                    <tr key={exp.id}>
                      <td className="py-1.5">{formatDate(exp.expense_date)}</td>
                      <td className="font-medium">{exp.category}</td>
                      <td className="text-muted-foreground">{exp.description}</td>
                      <td className="text-right font-semibold">{formatCurrency(exp.amount)}</td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" className="h-7 text-xs" onClick={() => decideExpense(exp.id, true)}>
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => {
                              const note = window.prompt("Reason for rejecting expense?");
                              if (note !== null) decideExpense(exp.id, false, note || undefined);
                            }}
                          >
                            Reject
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
        <InvoiceQueue />
        <AgeingTable rows={rows} />
        <Card><CardContent className="p-4">
          <p className="font-semibold mb-2">Client payment behaviour</p>
          {behaviour.length === 0 ? <NotEnoughData hint="Appears after invoices are fully paid" /> : (
            <table className="w-full text-sm">
              <thead><tr className="text-xs text-muted-foreground text-left"><th>Client</th><th className="text-right">Paid invoices</th><th className="text-right">Avg days to pay</th><th className="text-right">Avg days late</th></tr></thead>
              <tbody>{behaviour.map((b) => (
                <tr key={b.client_name}><td>{b.client_name}</td><td className="text-right">{b.paidInvoices}</td><td className="text-right">{b.avgDaysToPay}</td>
                  <td className={`text-right ${b.avgDaysLate > 15 ? "text-red-600 font-semibold" : ""}`}>{b.avgDaysLate}</td></tr>
              ))}</tbody>
            </table>
          )}
        </CardContent></Card>
      </div>
    </div>
  );
}
