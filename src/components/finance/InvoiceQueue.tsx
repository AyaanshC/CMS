"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";

// Drafts created by stage completion or approved change orders, waiting to be sent.
export function InvoiceQueue() {
  const { invoices, issueInvoice, deleteDraftInvoice } = useAppStore();
  const drafts = invoices.filter((i) => i.status === "draft");
  const [due, setDue] = useState<Record<string, string>>({});

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Ready to invoice ({drafts.length})</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {drafts.length === 0 && <p className="text-sm text-muted-foreground">Nothing waiting. Completed stages and approved change orders appear here.</p>}
        {drafts.map((i) => (
          <div key={i.id} className="flex flex-wrap items-center justify-between gap-3 border rounded-lg p-3">
            <div>
              <p className="text-sm font-semibold">{i.project_name} · {i.client_name}</p>
              <p className="text-xs text-muted-foreground">{i.notes} · {formatCurrency(i.total_amount)} incl. GST</p>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs" htmlFor={`due-${i.id}`}>Due</label>
              <Input id={`due-${i.id}`} type="date" className="h-8 w-40" value={due[i.id] ?? ""} onChange={(e) => setDue({ ...due, [i.id]: e.target.value })} />
              <Button size="sm" onClick={() => issueInvoice(i.id, due[i.id] || undefined)}>Send</Button>
              <Button size="sm" variant="ghost" onClick={() => window.confirm("Delete this draft?") && deleteDraftInvoice(i.id)}>Delete</Button>
            </div>
          </div>
        ))}
        {drafts.length > 0 && <p className="text-xs text-muted-foreground">Leave the due date empty to use the client&apos;s payment terms.</p>}
      </CardContent>
    </Card>
  );
}
