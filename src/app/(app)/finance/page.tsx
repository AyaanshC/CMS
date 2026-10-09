"use client";

import { TopBar } from "@/components/layout/AppSidebar";
import { Card, CardContent } from "@/components/ui/card";
import { AgeingTable } from "@/components/finance/AgeingTable";
import { InvoiceQueue } from "@/components/finance/InvoiceQueue";
import { MetricInfo } from "@/components/metrics/MetricInfo";
import { NotEnoughData } from "@/components/metrics/NotEnoughData";
import { ageing, billingLagDays, clientPaymentBehaviour, dso, unbilledWip } from "@/lib/metrics/receivables";
import { useAppStore } from "@/lib/store";
import { formatCurrency, localToday } from "@/lib/utils";

export default function FinancePage() {
  const { invoices, feeStages } = useAppStore();
  const today = localToday();
  const rows = ageing(invoices, today);
  const d = dso(invoices, today);
  const lag = billingLagDays(feeStages, invoices);
  const wip = unbilledWip(feeStages);
  const behaviour = clientPaymentBehaviour(invoices);
  const overdue = invoices.filter((i) => i.status === "overdue").reduce((s, i) => s + i.amount_due, 0);

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
