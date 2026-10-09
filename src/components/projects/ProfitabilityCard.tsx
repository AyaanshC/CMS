"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricInfo } from "@/components/metrics/MetricInfo";
import { NotEnoughData } from "@/components/metrics/NotEnoughData";
import type { Profitability } from "@/lib/finance/profitability";
import { cn, formatCurrency } from "@/lib/utils";

const pct = (x: number | null) => (x === null ? null : `${Math.round(x * 100)}%`);

export function ProfitabilityCard({ profit }: { profit: Profitability }) {
  const tiles = [
    { label: "Contract value", value: formatCurrency(profit.contractValue), formula: "Sum of stage amounts plus approved change-order fees" },
    { label: "Earned", value: formatCurrency(profit.earned), formula: "Stage fee × % complete, plus change-order fees invoiced" },
    { label: `Labour (${profit.costBasis})`, value: formatCurrency(profit.labourCost), formula: "Submitted/approved hours × rate (blended band rate, or actual for owner/finance)" },
    { label: "Direct costs", value: formatCurrency(profit.directCost), formula: "Recorded project expenses" },
    { label: "Margin to date", value: `${formatCurrency(profit.marginToDate)}${profit.marginPct === null ? "" : ` (${pct(profit.marginPct)})`}`, formula: "Earned − labour − direct costs", bad: profit.marginToDate < 0 },
    { label: "Projected margin at completion", value: profit.eacMargin === null ? null : `${formatCurrency(profit.eacMargin)} (${pct(profit.eacMarginPct)})`,
      formula: "Contract value − (labour + direct) ÷ % complete", bad: (profit.eacMargin ?? 0) < 0 },
  ];
  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">Profitability</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {profit.unratedHours > 0 && <p className="text-xs text-amber-700">{profit.unratedHours} hours belong to people with no rate band and are costed at ₹0. Set their band in Settings → Team.</p>}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {tiles.map((t) => (
            <div key={t.label} className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground flex items-center gap-1">{t.label} <MetricInfo formula={t.formula} /></p>
              {t.value === null ? <NotEnoughData hint="Needs stage progress above 0%" /> : <p className={cn("font-bold", t.bad && "text-red-600")}>{t.value}</p>}
            </div>
          ))}
        </div>
        <table className="w-full text-xs">
          <thead><tr className="text-muted-foreground text-left"><th>Stage</th><th className="text-right">Fee</th><th className="text-right">Labour</th><th className="text-right">Burn</th><th className="text-right">Complete</th></tr></thead>
          <tbody>{profit.stages.map((s) => (
            <tr key={s.id} className={cn("border-t", s.overBurn && "text-red-600 font-semibold")}>
              <td className="py-1">{s.name}</td><td className="text-right">{formatCurrency(s.amount)}</td><td className="text-right">{formatCurrency(s.labourCost)}</td>
              <td className="text-right">{s.burnPct === null ? "—" : `${s.burnPct}%`}</td><td className="text-right">{s.percentComplete}%</td>
            </tr>
          ))}</tbody>
        </table>
      </CardContent>
    </Card>
  );
}
