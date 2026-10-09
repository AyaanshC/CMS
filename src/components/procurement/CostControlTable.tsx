"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MetricInfo } from "@/components/metrics/MetricInfo";
import { NotEnoughData } from "@/components/metrics/NotEnoughData";
import { categoryRollup, lineVariance } from "@/lib/procurement/costControl";
import { useAppStore } from "@/lib/store";
import { cn, formatCurrency } from "@/lib/utils";
import type { CostControlRow } from "@/types";

export function CostControlTable({ rows }: { rows: CostControlRow[] }) {
  const { setLineCost } = useAppStore();
  if (rows.length === 0) return <NotEnoughData hint="Appears once the client approves a BOQ" />;
  const cats = categoryRollup(rows);
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-1">By category
          <MetricInfo formula="Budget = qty × cost rate; committed = approved/issued POs; actual = approved vendor bills + approved execution expenses" /></CardTitle></CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-xs text-muted-foreground text-left"><th className="py-2 px-4">Category</th>
              <th className="px-4 text-right">Sell</th><th className="px-4 text-right">Budget</th><th className="px-4 text-right">Planned margin</th>
              <th className="px-4 text-right">Committed</th><th className="px-4 text-right">Actual</th><th className="px-4 text-right">Variance</th></tr></thead>
            <tbody className="divide-y">{cats.map((c) => (
              <tr key={c.category} className={c.category === "Total" ? "font-semibold bg-muted/40" : ""}>
                <td className="py-2 px-4">{c.category}</td><td className="px-4 text-right">{formatCurrency(c.sell)}</td>
                <td className="px-4 text-right">{c.budget === null ? <span className="text-amber-600">Incomplete</span> : formatCurrency(c.budget)}</td>
                <td className="px-4 text-right">{c.plannedMargin === null ? "—" : formatCurrency(c.plannedMargin)}</td>
                <td className="px-4 text-right">{formatCurrency(c.committed)}</td><td className="px-4 text-right">{formatCurrency(c.actual)}</td>
                <td className={cn("px-4 text-right", (c.variance ?? 0) > 0 && "text-red-600")}>{c.variance === null ? "—" : formatCurrency(c.variance)}</td>
              </tr>
            ))}</tbody>
          </table>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-sm">By BOQ line</CardTitle></CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="border-b text-muted-foreground text-left"><th className="py-2 px-3">Item</th><th className="px-3 text-right">Qty</th>
              <th className="px-3 text-right">Sell rate</th><th className="px-3 text-right">Cost rate</th><th className="px-3 text-right">Budget</th>
              <th className="px-3 text-right">Committed</th><th className="px-3 text-right">Actual</th><th className="px-3">Status</th></tr></thead>
            <tbody className="divide-y">{rows.map((r) => {
              const v = lineVariance(r);
              return (
                <tr key={r.line_item_id}>
                  <td className="py-1.5 px-3">{r.description}<span className="block text-muted-foreground">{r.category}</span></td>
                  <td className="px-3 text-right">{r.quantity} {r.unit}</td><td className="px-3 text-right">{formatCurrency(r.sell_rate)}</td>
                  <td className="px-3 text-right">
                    <Input aria-label={`Cost rate for ${r.description}`} type="number" min="0" step="0.01" className="h-7 w-24 text-right ml-auto" defaultValue={r.cost_rate ?? ""}
                      onBlur={(e) => e.target.value !== "" && Number(e.target.value) !== r.cost_rate && setLineCost(r.line_item_id, Number(e.target.value))} />
                  </td>
                  <td className="px-3 text-right">{r.budget == null ? "—" : formatCurrency(r.budget)}</td>
                  <td className="px-3 text-right">{formatCurrency(r.committed)}</td><td className="px-3 text-right">{formatCurrency(r.actual)}</td>
                  <td className="px-3">{v.status === "no_budget" ? <span className="text-amber-600">No budget</span>
                    : v.status === "over" ? <span className="text-red-600 font-semibold">Over by {formatCurrency(v.overBy)}</span> : <span className="text-emerald-600">OK</span>}</td>
                </tr>
              );
            })}</tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
