"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { hasAnyRole } from "@/lib/permissions";
import { useAppStore } from "@/lib/store";
import { formatCurrency, formatDate, localToday } from "@/lib/utils";
import { BillDialog } from "./BillDialog";

export function VendorBills({ projectId }: { projectId: string }) {
  const { me, vendorBills, decideVendorBill, recordVendorPayment } = useAppStore();
  const list = vendorBills.filter((b) => b.project_id === projectId);
  const [open, setOpen] = useState(false);
  const isFinance = hasAnyRole(me, ["owner", "finance"]);

  return (
    <div className="space-y-2">
      {hasAnyRole(me, ["owner", "finance", "procurement"]) && <div className="flex justify-end"><Button size="sm" onClick={() => setOpen(true)}>Record bill</Button></div>}
      {list.map((b) => (
        <Card key={b.id}><CardContent className="p-3 space-y-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold">{b.vendor_name} · {b.bill_number} <span className="font-normal text-muted-foreground">({formatDate(b.bill_date)})</span></p>
            <div className="flex items-center gap-2">
              <span className="text-sm">{formatCurrency(b.total)} · due {formatCurrency(b.outstanding)}</span>
              <Badge variant="outline" className="capitalize">{b.status}</Badge>
              {isFinance && b.status === "recorded" && (
                <>
                  <Button size="sm" disabled={b.match_issues.length > 0} onClick={() => decideVendorBill(b.id, true)}>Approve</Button>
                  <Button size="sm" variant="outline" onClick={() => { const n = window.prompt("Dispute reason?"); if (n) decideVendorBill(b.id, false, n); }}>Dispute</Button>
                </>
              )}
              {isFinance && b.status === "approved" && b.outstanding > 0 && (
                <Button size="sm" variant="outline" onClick={() => recordVendorPayment({ vendor_id: b.vendor_id, project_id: projectId, bill_id: b.id, amount: b.outstanding, paid_on: localToday(), mode: "bank_transfer" })}>
                  Mark paid
                </Button>
              )}
              {b.file_url && <a href={b.file_url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">View bill</a>}
            </div>
          </div>
          {b.match_issues.length > 0 && <ul className="text-xs text-red-600 list-disc pl-4">{b.match_issues.map((m) => <li key={m}>{m}</li>)}</ul>}
        </CardContent></Card>
      ))}
      <BillDialog projectId={projectId} open={open} onOpenChange={setOpen} />
    </div>
  );
}
