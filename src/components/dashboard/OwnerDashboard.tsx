"use client";

import { Card, CardContent } from "@/components/ui/card";
import { MetricInfo } from "@/components/metrics/MetricInfo";
import { NotEnoughData } from "@/components/metrics/NotEnoughData";
import { useAppStore } from "@/lib/store";
import { portfolioRows } from "@/lib/metrics/portfolio";
import { unbilledWip } from "@/lib/metrics/receivables";
import { addDays, weekStart } from "@/lib/time/weeks";
import { timesheetCompliance, utilisation } from "@/lib/time/utilisation";
import { formatCurrency, localToday } from "@/lib/utils";
import { RiskTable } from "./RiskTable";
import { UtilisationTable } from "./UtilisationTable";

const WEEKS = 4;

export function OwnerDashboard() {
  const s = useAppStore();
  const today = localToday();
  const weeks = Array.from({ length: WEEKS }, (_, i) => addDays(weekStart(today), -7 * (i + 1)));
  const rows = portfolioRows(s, today, true);
  const util = utilisation(s.staffWeekHours, s.team, weeks);
  const billable = util.reduce((a, r) => a + r.billable, 0);
  const capacity = util.reduce((a, r) => a + r.capacity, 0);
  const compliance = timesheetCompliance(s.staffWeekHours, s.team, weeks);
  const month = today.slice(0, 7);
  const invoicedMtd = s.invoices.filter((i) => i.status !== "draft" && i.status !== "cancelled" && i.issue_date?.startsWith(month))
    .reduce((a, i) => a + i.subtotal - i.discount, 0);
  const target = s.studioSettings.monthly_billing_target;
  const eac = rows.reduce((a, r) => a + (r.profit.eacMargin ?? 0), 0);

  const tiles = [
    { label: "Invoiced this month", value: formatCurrency(invoicedMtd) + (target ? ` of ${formatCurrency(target)}` : ""), formula: "Sent invoices this month, before GST, vs monthly billing target" },
    { label: "Unbilled work", value: formatCurrency(unbilledWip(s.feeStages)), formula: "Fee earned on stages minus amount invoiced" },
    { label: "Projected margin, live projects", value: rows.length ? formatCurrency(eac) : null, formula: "Sum of projected margin at completion across live projects (actual cost)" },
    { label: `Billable utilisation (${WEEKS} wks)`, value: capacity ? `${Math.round((billable / capacity) * 100)}%` : null, formula: "Billable hours ÷ capacity, all staff with capacity" },
    { label: "Timesheet compliance", value: compliance === null ? null : `${Math.round(compliance * 100)}%`, formula: "Submitted person-weeks ÷ expected person-weeks" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {tiles.map((t) => (
          <Card key={t.label}><CardContent className="p-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1">{t.label} <MetricInfo formula={t.formula} /></p>
            {t.value === null ? <NotEnoughData /> : <p className="text-xl font-bold mt-1">{t.value}</p>}
          </CardContent></Card>
        ))}
      </div>
      <RiskTable rows={rows} />
      <UtilisationTable rows={util} weeks={WEEKS} />
    </div>
  );
}
