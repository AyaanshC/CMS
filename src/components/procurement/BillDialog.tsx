"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import { useAppStore } from "@/lib/store";
import { uploadToProject } from "@/lib/supabase/upload";
import { localToday } from "@/lib/utils";

// Bill lines are prefilled from the PO's accepted-but-unbilled quantities.
export function BillDialog({ projectId, open, onOpenChange }: { projectId: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { purchaseOrders, recordVendorBill } = useAppStore();
  const pos = purchaseOrders.filter((o) => o.project_id === projectId && (o.status === "issued" || o.status === "closed"));
  const [poId, setPoId] = useState("");
  const [billNo, setBillNo] = useState("");
  const [billDate, setBillDate] = useState(localToday());
  const [file, setFile] = useState<File | null>(null);
  const po = pos.find((o) => o.id === poId);
  const [lines, setLines] = useState<{ po_line_id: string; description: string; quantity: string; rate: string; gst_rate: string }[]>([]);

  const pick = (id: string) => {
    setPoId(id);
    const o = pos.find((x) => x.id === id);
    setLines((o?.lines ?? []).filter((l) => l.received_qty > l.billed_qty).map((l) => ({
      po_line_id: l.id, description: l.description, quantity: String(l.received_qty - l.billed_qty), rate: String(l.rate), gst_rate: String(l.gst_rate),
    })));
  };

  async function save() {
    if (!po) return;
    let file_path: string | undefined;
    try { if (file) file_path = await uploadToProject(projectId, file); }
    catch (e) { return toast.add({ title: "Upload failed", description: (e as Error).message, type: "error" }); }
    const r = await recordVendorBill({
      vendor_id: po.vendor_id, project_id: projectId, po_id: po.id, bill_number: billNo, bill_date: billDate, file_path,
      lines: lines.map((l) => ({ po_line_id: l.po_line_id, description: l.description, quantity: Number(l.quantity), rate: Number(l.rate), gst_rate: Number(l.gst_rate) })),
    });
    if (r.ok) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Record vendor bill</DialogTitle></DialogHeader>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1"><Label htmlFor="bill-po">Purchase order</Label>
            <select id="bill-po" className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" value={poId} onChange={(e) => pick(e.target.value)}>
              <option value="">Select PO</option>{pos.map((o) => <option key={o.id} value={o.id}>{o.number} · {o.vendor_name}</option>)}
            </select></div>
          <div className="space-y-1"><Label htmlFor="bill-no">Vendor bill no.</Label><Input id="bill-no" value={billNo} onChange={(e) => setBillNo(e.target.value)} /></div>
          <div className="space-y-1"><Label htmlFor="bill-date">Bill date</Label><Input id="bill-date" type="date" value={billDate} onChange={(e) => setBillDate(e.target.value)} /></div>
        </div>
        <table className="w-full text-xs"><tbody>{lines.map((l, i) => (
          <tr key={l.po_line_id}><td className="pr-2">{l.description}</td>
            {(["quantity", "rate", "gst_rate"] as const).map((k) => (
              <td key={k} className="pr-1"><Input aria-label={`${k} ${l.description}`} className="h-8" type="number" value={l[k]} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, [k]: e.target.value } : x)))} /></td>
            ))}</tr>
        ))}</tbody></table>
        <label className="text-xs">Bill scan (PDF/image) <input type="file" accept="application/pdf,image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></label>
        <DialogFooter><Button onClick={save} disabled={!po || !billNo || lines.length === 0}>Record bill</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
