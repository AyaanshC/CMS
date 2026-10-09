"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PhotoInput } from "@/components/files/PhotoInput";
import { useAppStore } from "@/lib/store";
import { localToday } from "@/lib/utils";
import type { PurchaseOrder } from "@/types";

export function ReceiveDialog({ po, open, onOpenChange }: { po: PurchaseOrder; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { recordReceipt } = useAppStore();
  const outstanding = po.lines.filter((l) => l.received_qty < l.quantity);
  const [qty, setQty] = useState<Record<string, { rec: string; rej: string; note: string }>>({});
  const [photo, setPhoto] = useState<string | undefined>();

  async function save() {
    const lines = outstanding.filter((l) => Number(qty[l.id]?.rec) > 0).map((l) => ({
      po_line_id: l.id, quantity_received: Number(qty[l.id].rec), quantity_rejected: Number(qty[l.id].rej || 0), condition_note: qty[l.id].note || undefined,
    }));
    const r = await recordReceipt({ po_id: po.id, received_on: localToday(), photo_url: photo, lines });
    if (r.ok) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>Receive goods · {po.number}</DialogTitle></DialogHeader>
        <table className="w-full text-xs">
          <thead><tr className="text-muted-foreground text-left"><th>Item</th><th>Pending</th><th>Received</th><th>Rejected</th><th>Condition</th></tr></thead>
          <tbody>{outstanding.map((l) => (
            <tr key={l.id}>
              <td>{l.description}</td><td>{l.quantity - l.received_qty} {l.unit}</td>
              {(["rec", "rej", "note"] as const).map((k) => (
                <td key={k} className="pr-1"><Input aria-label={`${k} ${l.description}`} className="h-8" type={k === "note" ? "text" : "number"} min="0"
                  value={qty[l.id]?.[k] ?? ""} onChange={(e) => {
                    const prev = qty[l.id] ?? { rec: "", rej: "", note: "" };
                    setQty({ ...qty, [l.id]: { ...prev, [k]: e.target.value } });
                  }} /></td>
              ))}
            </tr>
          ))}</tbody>
        </table>
        <PhotoInput projectId={po.project_id} label="Delivery photo / challan" onUploaded={setPhoto} />
        <DialogFooter><Button onClick={save}>Record receipt</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
