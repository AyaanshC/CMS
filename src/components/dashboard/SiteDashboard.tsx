"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReceiveDialog } from "@/components/procurement/ReceiveDialog";
import { useAppStore } from "@/lib/store";
import { formatDate, localToday } from "@/lib/utils";
import type { PurchaseOrder } from "@/types";

export function SiteDashboard() {
  const { purchaseOrders, snags, projects } = useAppStore();
  const today = localToday();
  const [receiving, setReceiving] = useState<PurchaseOrder | null>(null);
  const due = purchaseOrders.filter((o) => o.status === "issued" && o.expected_delivery && o.expected_delivery <= today && o.lines.some((l) => l.received_qty < l.quantity));
  const open = snags.filter((s) => s.status !== "closed" && s.status !== "verified");
  const name = (id: string) => projects.find((p) => p.id === id)?.name ?? "";

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Deliveries due or late</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">{due.length === 0 ? <p className="text-muted-foreground">Nothing due.</p> : due.map((o) => (
          <div key={o.id} className="flex items-center justify-between gap-2">
            <span className={o.expected_delivery! < today ? "text-red-600" : ""}>{o.vendor_name} · {name(o.project_id)} · {formatDate(o.expected_delivery!)}</span>
            <Button size="sm" variant="outline" onClick={() => setReceiving(o)}>Receive</Button>
          </div>
        ))}</CardContent></Card>
      <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Open snags ({open.length})</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm">{open.slice(0, 10).map((s) => (
          <p key={s.id} className={s.priority === "critical" ? "text-red-600" : ""}>
            <Link href={`/projects/${s.project_id}`} className="hover:underline">{s.title}</Link> · {name(s.project_id)}{s.vendor_name ? ` · ${s.vendor_name}` : ""}
          </p>
        ))}</CardContent></Card>
      {receiving && <ReceiveDialog po={receiving} open onOpenChange={(o) => !o && setReceiving(null)} />}
    </div>
  );
}
