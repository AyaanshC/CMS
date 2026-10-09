"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";
import type { CostControlRow } from "@/types";
import { PoDialog } from "./PoDialog";

// Compare quotes per BOQ line; turn the chosen quote into a draft PO.
export function QuotesPanel({ projectId, lines }: { projectId: string; lines: CostControlRow[] }) {
  const { quotes, vendors, addQuote } = useAppStore();
  const mine = quotes.filter((q) => q.project_id === projectId);
  const [form, setForm] = useState({ boq_line_item_id: "", vendor_id: "", quantity: "", rate: "" });
  const [preset, setPreset] = useState<Parameters<typeof PoDialog>[0]["preset"]>();

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">Quotes</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <select aria-label="BOQ line" className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={form.boq_line_item_id} onChange={(e) => setForm({ ...form, boq_line_item_id: e.target.value })}>
            <option value="">BOQ line</option>{lines.map((l) => <option key={l.line_item_id} value={l.line_item_id}>{l.description}</option>)}
          </select>
          <select aria-label="Vendor" className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={form.vendor_id} onChange={(e) => setForm({ ...form, vendor_id: e.target.value })}>
            <option value="">Vendor</option>{vendors.filter((v) => v.status !== "blacklisted").map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
          <Input aria-label="Quantity" className="w-24 h-9" placeholder="Qty" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
          <Input aria-label="Rate" className="w-28 h-9" placeholder="Rate" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} />
          <Button size="sm" disabled={!form.boq_line_item_id || !form.vendor_id} onClick={async () => {
            const r = await addQuote({ project_id: projectId, ...form, quantity: Number(form.quantity), rate: Number(form.rate) });
            if (r.ok) setForm({ boq_line_item_id: "", vendor_id: "", quantity: "", rate: "" });
          }}>Add quote</Button>
        </div>
        {lines.filter((l) => mine.some((q) => q.boq_line_item_id === l.line_item_id)).map((l) => {
          const qs = mine.filter((q) => q.boq_line_item_id === l.line_item_id).sort((a, b) => a.rate - b.rate);
          return (
            <div key={l.line_item_id} className="border rounded-lg p-2">
              <p className="text-xs font-semibold">{l.description} · budget rate {l.cost_rate == null ? "—" : formatCurrency(l.cost_rate)}</p>
              {qs.map((q, i) => (
                <div key={q.id} className="flex items-center justify-between text-xs py-1">
                  <span className={i === 0 ? "text-emerald-700 font-semibold" : ""}>{q.vendor_name}: {formatCurrency(q.rate)} × {q.quantity}</span>
                  <Button size="sm" variant="ghost" onClick={() => setPreset({ vendor_id: q.vendor_id, line: { boq_line_item_id: l.line_item_id, description: l.description, unit: l.unit, quantity: String(q.quantity), rate: String(q.rate), gst_rate: "18" } })}>Create PO</Button>
                </div>
              ))}
            </div>
          );
        })}
        {preset && <PoDialog key={JSON.stringify(preset)} projectId={projectId} lines={lines} open preset={preset} onOpenChange={(o) => !o && setPreset(undefined)} />}
      </CardContent>
    </Card>
  );
}
