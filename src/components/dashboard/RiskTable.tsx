"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PortfolioRow } from "@/lib/metrics/portfolio";
import { cn, formatCurrency } from "@/lib/utils";

const tone = (s: number) => (s >= 50 ? "bg-red-100 text-red-700" : s >= 25 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700");

export function RiskTable({ rows, title = "Projects by risk" }: { rows: PortfolioRow[]; title?: string }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b text-xs text-muted-foreground text-left">
            <th className="py-2 px-4">Project</th><th className="px-4">Risk</th><th className="px-4">Top factor</th>
            <th className="px-4 text-right">Margin to date</th><th className="px-4 text-right">Projected margin</th>
          </tr></thead>
          <tbody className="divide-y">
            {rows.map(({ project, profit, risk }) => {
              const top = [...risk.factors].sort((a, b) => b.points - a.points)[0];
              return (
                <tr key={project.id}>
                  <td className="py-2 px-4"><Link href={`/projects/${project.id}`} className="font-medium hover:underline">{project.name}</Link>
                    <p className="text-xs text-muted-foreground">{project.client_name}</p></td>
                  <td className="px-4"><Badge className={cn("border-0", tone(risk.score))} title={risk.factors.map((f) => `${f.label}: ${f.points}/${f.weight}`).join("\n")}>{risk.score}</Badge></td>
                  <td className="px-4 text-xs">{top && top.points > 0 ? `${top.label} (${top.detail})` : "—"}</td>
                  <td className={cn("px-4 text-right", profit.marginToDate < 0 && "text-red-600")}>{formatCurrency(profit.marginToDate)}</td>
                  <td className={cn("px-4 text-right", (profit.eacMargin ?? 0) < 0 && "text-red-600")}>{profit.eacMargin === null ? "—" : formatCurrency(profit.eacMargin)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
