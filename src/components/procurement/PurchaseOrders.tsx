"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { hasAnyRole } from "@/lib/permissions";
import { useAppStore } from "@/lib/store";
import { formatCurrency, formatDate, localToday } from "@/lib/utils";
import type { CostControlRow, PurchaseOrder } from "@/types";
import { PoDialog } from "./PoDialog";
import { ReceiveDialog } from "./ReceiveDialog";

export function PurchaseOrders({ projectId, lines }: { projectId: string; lines: CostControlRow[] }) {
  const { me, purchaseOrders, approvePurchaseOrder, issuePurchaseOrder, submitPurchaseOrder, cancelPurchaseOrder } = useAppStore();
  const list = purchaseOrders.filter((o) => o.project_id === projectId);
  const [open, setOpen] = useState(false);
  const [receiving, setReceiving] = useState<PurchaseOrder | null>(null);
  const today = localToday();
  const canBuy = hasAnyRole(me, ["owner", "director", "project_manager", "finance", "procurement"]);
  const canApprove = (o: PurchaseOrder) => o.status === "pending_approval" && o.created_by !== me.id &&
    (me.roles.includes("owner") || (o.approval_required_role === "director" && me.roles.includes("director")));

  return (
    <div className="space-y-2">
      {canBuy && <div className="flex justify-end"><Button size="sm" onClick={() => setOpen(true)}>New purchase order</Button></div>}
      {list.map((o) => {
        const late = o.status === "issued" && o.expected_delivery && o.expected_delivery < today && o.lines.some((l) => l.received_qty < l.quantity);
        return (
          <Card key={o.id}><CardContent className="p-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold">{o.number ?? "Draft PO"} · {o.vendor_name}</p>
              <p className="text-xs text-muted-foreground">{formatCurrency(o.total)} + GST{o.expected_delivery ? ` · due ${formatDate(o.expected_delivery)}` : ""}
                {o.approval_required_role && o.status === "pending_approval" ? ` · needs ${o.approval_required_role}` : ""}</p>
            </div>
            <div className="flex items-center gap-2">
              {late && <Badge variant="destructive">Late</Badge>}
              <Badge variant="outline" className="capitalize">{o.status.replace("_", " ")}</Badge>
              {o.status === "draft" && canBuy && <Button size="sm" variant="outline" onClick={() => submitPurchaseOrder(o.id)}>Submit</Button>}
              {canApprove(o) && <Button size="sm" onClick={() => approvePurchaseOrder(o.id)}>Approve</Button>}
              {o.status === "approved" && canBuy && <Button size="sm" onClick={() => issuePurchaseOrder(o.id)}>Issue</Button>}
              {o.status === "issued" && <Button size="sm" variant="outline" onClick={() => setReceiving(o)}>Receive</Button>}
              {o.number && <Link href={`/purchase-orders/${o.id}/print`} target="_blank"><Button size="sm" variant="ghost">Print</Button></Link>}
              {["draft", "pending_approval", "approved", "issued"].includes(o.status) && canBuy && (
                <Button size="sm" variant="ghost" onClick={() => { const reason = window.prompt("Reason for cancelling?"); if (reason) cancelPurchaseOrder(o.id, reason); }}>Cancel</Button>
              )}
            </div>
          </CardContent></Card>
        );
      })}
      <PoDialog projectId={projectId} lines={lines} open={open} onOpenChange={setOpen} />
      {receiving && <ReceiveDialog po={receiving} open onOpenChange={(o) => !o && setReceiving(null)} />}
    </div>
  );
}
