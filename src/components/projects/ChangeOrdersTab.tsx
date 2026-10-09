"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAppStore } from "@/lib/store";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CHANGE_ORDER_REASON_LABELS, type ChangeOrderReason, type Project } from "@/types";

const EMPTY = { title: "", description: "", reason: "client_request" as ChangeOrderReason, fee_impact: "0", schedule_impact_days: "0" };

export default function ChangeOrdersTab({ project }: { project: Project }) {
  const { changeOrders, createChangeOrder, submitChangeOrder } = useAppStore();
  const list = changeOrders.filter((c) => c.project_id === project.id);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(EMPTY);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const r = await createChangeOrder({
      project_id: project.id, title: f.title, description: f.description, reason: f.reason,
      fee_impact: f.reason === "design_error" ? 0 : Number(f.fee_impact), schedule_impact_days: Number(f.schedule_impact_days),
    });
    if (r.ok) { setF(EMPTY); setOpen(false); }
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end"><Button size="sm" onClick={() => setOpen(true)}>New change order</Button></div>
      {list.length === 0 && <p className="text-sm text-muted-foreground">No change orders. Record every scope change here so it can be approved and billed.</p>}
      {list.map((c) => (
        <Card key={c.id}>
          <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-sm">{c.number} · {c.title}</p>
              <p className="text-xs text-muted-foreground">{CHANGE_ORDER_REASON_LABELS[c.reason]} · {formatDate(c.created_at)}
                {c.schedule_impact_days ? ` · ${c.schedule_impact_days} days` : ""}</p>
              {c.decision_note && <p className="text-xs mt-1">“{c.decision_note}” {c.decided_by ? `— ${c.decided_by}` : ""}</p>}
            </div>
            <div className="flex items-center gap-3">
              <span className="font-semibold text-sm">{formatCurrency(c.fee_impact)}</span>
              <Badge variant="outline" className="capitalize">{c.status}</Badge>
              {c.status === "draft" && <Button size="sm" variant="outline" onClick={() => submitChangeOrder(c.id)}>Send to client</Button>}
            </div>
          </CardContent>
        </Card>
      ))}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New change order</DialogTitle></DialogHeader>
          <form onSubmit={save} className="space-y-3">
            <div className="space-y-1"><Label htmlFor="co-title">Title *</Label><Input id="co-title" required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
            <div className="space-y-1"><Label htmlFor="co-desc">Description</Label><Textarea id="co-desc" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
            <div className="space-y-1"><Label htmlFor="co-reason">Reason</Label>
              <select id="co-reason" className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" value={f.reason}
                onChange={(e) => setF({ ...f, reason: e.target.value as ChangeOrderReason })}>
                {Object.entries(CHANGE_ORDER_REASON_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select></div>
            {f.reason !== "design_error" && (
              <div className="space-y-1"><Label htmlFor="co-fee">Additional fee (₹, before GST)</Label><Input id="co-fee" type="number" min="0" value={f.fee_impact} onChange={(e) => setF({ ...f, fee_impact: e.target.value })} /></div>
            )}
            <div className="space-y-1"><Label htmlFor="co-days">Schedule impact (days)</Label><Input id="co-days" type="number" value={f.schedule_impact_days} onChange={(e) => setF({ ...f, schedule_impact_days: e.target.value })} /></div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit">Save draft</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
