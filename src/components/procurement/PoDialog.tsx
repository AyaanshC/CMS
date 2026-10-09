"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppStore } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";
import type { CostControlRow } from "@/types";

type Line = { boq_line_item_id: string; description: string; unit: string; quantity: string; rate: string; gst_rate: string };
const sel = "w-full h-9 rounded-md border border-input bg-background px-3 text-sm";

export function PoDialog({ projectId, lines, open, onOpenChange, preset }: {
  projectId: string; lines: CostControlRow[]; open: boolean; onOpenChange: (o: boolean) => void;
  preset?: { vendor_id: string; line?: Line };
}) {
  const { vendors, createPurchaseOrder, submitPurchaseOrder } = useAppStore();
  const [vendorId, setVendorId] = useState(preset?.vendor_id ?? "");
  const [expected, setExpected] = useState("");
  const [rows, setRows] = useState<Line[]>(preset?.line ? [preset.line] : []);
  const total = rows.reduce((s, r) => s + Number(r.quantity || 0) * Number(r.rate || 0), 0);

  const addFromBoq = (id: string) => {
    const l = lines.find((x) => x.line_item_id === id);
    if (l) setRows([...rows, { boq_line_item_id: l.line_item_id, description: l.description, unit: l.unit,
      quantity: String(l.quantity), rate: String(l.cost_rate ?? ""), gst_rate: "18" }]);
  };

  async function save(submit: boolean) {
    const r = await createPurchaseOrder({
      project_id: projectId, vendor_id: vendorId, expected_delivery: expected || undefined,
      lines: rows.map((x) => ({ boq_line_item_id: x.boq_line_item_id || undefined, description: x.description, unit: x.unit,
        quantity: Number(x.quantity), rate: Number(x.rate), gst_rate: Number(x.gst_rate) })),
    });
    if (r.ok && r.id && submit) await submitPurchaseOrder(r.id);
    if (r.ok) { setRows([]); onOpenChange(false); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader><DialogTitle>New purchase order</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1"><Label htmlFor="po-vendor">Vendor</Label>
            <select id="po-vendor" className={sel} value={vendorId} onChange={(e) => setVendorId(e.target.value)}>
              <option value="">Select vendor</option>
              {vendors.filter((v) => v.status !== "blacklisted").map((v) => <option key={v.id} value={v.id}>{v.name} · {v.category}</option>)}
            </select></div>
          <div className="space-y-1"><Label htmlFor="po-exp">Expected delivery</Label><Input id="po-exp" type="date" value={expected} onChange={(e) => setExpected(e.target.value)} /></div>
        </div>
        <select aria-label="Add BOQ line" className={sel} value="" onChange={(e) => addFromBoq(e.target.value)}>
          <option value="">+ Add a BOQ line</option>
          {lines.map((l) => <option key={l.line_item_id} value={l.line_item_id}>{l.category} · {l.description}</option>)}
        </select>
        <table className="w-full text-xs">
          <thead><tr className="text-muted-foreground text-left"><th>Description</th><th>Unit</th><th>Qty</th><th>Rate</th><th>GST %</th><th className="text-right">Amount</th></tr></thead>
          <tbody>{rows.map((r, i) => (
            <tr key={i}>
              {(["description", "unit", "quantity", "rate", "gst_rate"] as const).map((k) => (
                <td key={k} className="pr-1"><Input aria-label={k} className="h-8" value={r[k]} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, [k]: e.target.value } : x)))} /></td>
              ))}
              <td className="text-right">{formatCurrency(Number(r.quantity || 0) * Number(r.rate || 0))}</td>
            </tr>
          ))}</tbody>
        </table>
        <Button size="sm" variant="outline" onClick={() => setRows([...rows, { boq_line_item_id: "", description: "", unit: "nos", quantity: "1", rate: "0", gst_rate: "18" }])}>+ Unbudgeted line</Button>
        <p className="text-sm">Total before GST: <strong>{formatCurrency(total)}</strong></p>
        <DialogFooter>
          <Button variant="outline" onClick={() => save(false)} disabled={!vendorId || rows.length === 0}>Save draft</Button>
          <Button onClick={() => save(true)} disabled={!vendorId || rows.length === 0}>Submit</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
