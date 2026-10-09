"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppStore } from "@/lib/store";
import type { Invoice } from "@/types";

export function CreditNoteDialog({ invoice, open, onOpenChange }: { invoice: Invoice; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { addCreditNote } = useAppStore();
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const r = await addCreditNote(invoice.id, Number(amount), reason);
    if (r.ok) { setAmount(""); setReason(""); onOpenChange(false); }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Credit note for {invoice.invoice_number}</DialogTitle></DialogHeader>
        <form onSubmit={save} className="space-y-3">
          <div className="space-y-1"><Label htmlFor="cn-amt">Amount (₹, incl. GST)</Label><Input id="cn-amt" type="number" min="1" max={invoice.amount_due + invoice.retention_held} required value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
          <div className="space-y-1"><Label htmlFor="cn-reason">Reason</Label><Input id="cn-reason" required value={reason} onChange={(e) => setReason(e.target.value)} /></div>
          <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit">Issue credit note</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
