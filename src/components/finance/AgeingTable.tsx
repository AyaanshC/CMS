"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NotEnoughData } from "@/components/metrics/NotEnoughData";
import type { AgeingRow } from "@/lib/metrics/receivables";
import { formatCurrency } from "@/lib/utils";

const COLS: [keyof AgeingRow, string][] = [["notDue", "Not due"], ["d0_30", "1–30"], ["d31_60", "31–60"], ["d61_90", "61–90"], ["d90plus", "90+"], ["total", "Total"]];

export function AgeingTable({ rows }: { rows: AgeingRow[] }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Receivables ageing (days past due)</CardTitle></CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        {rows.length === 0 ? <div className="p-4"><NotEnoughData /></div> : (
          <table className="w-full text-sm">
            <thead><tr className="border-b text-xs text-muted-foreground text-left">
              <th className="py-2 px-4">Client</th>{COLS.map(([, l]) => <th key={l} className="py-2 px-4 text-right">{l}</th>)}
            </tr></thead>
            <tbody className="divide-y">
              {rows.map((r) => (
                <tr key={r.client_name} className={r.client_name === "Total" ? "font-semibold bg-muted/40" : ""}>
                  <td className="py-2 px-4">{r.client_name}</td>
                  {COLS.map(([k]) => (
                    <td key={k} className={`py-2 px-4 text-right ${k === "d90plus" && (r[k] as number) > 0 ? "text-red-600" : ""}`}>
                      {(r[k] as number) ? formatCurrency(r[k] as number) : "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
