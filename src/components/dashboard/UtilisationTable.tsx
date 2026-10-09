"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricInfo } from "@/components/metrics/MetricInfo";
import { NotEnoughData } from "@/components/metrics/NotEnoughData";
import type { UtilisationRow } from "@/lib/time/utilisation";
import { cn } from "@/lib/utils";

export function UtilisationTable({ rows, weeks }: { rows: UtilisationRow[]; weeks: number }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base flex items-center gap-1">Utilisation, last {weeks} weeks
        <MetricInfo formula="Billable hours ÷ capacity (weekly capacity × weeks); total includes non-billable time" /></CardTitle></CardHeader>
      <CardContent className="p-0">
        {rows.length === 0 ? <div className="p-4"><NotEnoughData /></div> : (
          <table className="w-full text-sm">
            <thead><tr className="border-b text-xs text-muted-foreground text-left"><th className="py-2 px-4">Person</th>
              <th className="px-4 text-right">Total</th><th className="px-4 text-right">Billable</th><th className="px-4 text-right">Target</th></tr></thead>
            <tbody className="divide-y">{rows.map((r) => (
              <tr key={r.profile_id}>
                <td className="py-2 px-4">{r.name}</td>
                <td className={cn("px-4 text-right", (r.totalPct ?? 0) > 110 && "text-red-600 font-semibold")}>{r.totalPct ?? "—"}%</td>
                <td className={cn("px-4 text-right", (r.gap ?? 0) < -10 && "text-amber-600 font-semibold")}>{r.billablePct ?? "—"}%</td>
                <td className="px-4 text-right">{r.target}%</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
