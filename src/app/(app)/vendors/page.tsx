"use client";

import { useState } from "react";
import { TopBar } from "@/components/layout/AppSidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MetricInfo } from "@/components/metrics/MetricInfo";
import { vendorScorecard } from "@/lib/procurement/scorecard";
import { useAppStore } from "@/lib/store";
import { formatCurrency, localToday } from "@/lib/utils";
import type { Vendor, VendorStatus } from "@/types";

const EMPTY: Partial<Vendor> = { name: "", category: "", gstin: "", phone: "", email: "", payment_terms_days: 30, status: "active" };

export default function VendorsPage() {
  const { vendors, purchaseOrders, receipts, vendorBills, snags, costControl, saveVendor } = useAppStore();
  const [edit, setEdit] = useState<Partial<Vendor> | null>(null);
  const score = new Map(vendorScorecard(vendors, purchaseOrders, receipts, vendorBills, snags, costControl, localToday()).map((s) => [s.vendor_id, s]));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!edit) return;
    const r = await saveVendor(edit);
    if (r.ok) setEdit(null);
  }

  return (
    <div>
      <TopBar title="Vendors & contractors" subtitle="Performance from purchase orders, receipts, bills and snags" />
      <div className="p-6 space-y-4">
        <div className="flex justify-end"><Button onClick={() => setEdit(EMPTY)}>Add vendor</Button></div>
        <Card><CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-xs text-muted-foreground text-left">
              <th className="py-2 px-4">Vendor</th><th className="px-4">Status</th><th className="px-4 text-right">Spend</th>
              <th className="px-4 text-right">On time <MetricInfo formula="POs fully received by the expected date ÷ POs that were due" /></th>
              <th className="px-4 text-right">Price vs budget <MetricInfo formula="(PO amount − BOQ cost budget) ÷ budget, on lines linked to the BOQ" /></th>
              <th className="px-4 text-right">Snags / ₹1L <MetricInfo formula="Snags assigned to the vendor ÷ (approved bills ÷ 1,00,000)" /></th>
              <th className="px-4 text-right">Avg fix (h)</th><th />
            </tr></thead>
            <tbody className="divide-y">{vendors.map((v) => {
              const s = score.get(v.id);
              return (
                <tr key={v.id}>
                  <td className="py-2 px-4">{v.name}<span className="block text-xs text-muted-foreground">{v.category}</span></td>
                  <td className="px-4"><Badge variant={v.status === "blacklisted" ? "destructive" : "outline"} className="capitalize">{v.status}</Badge></td>
                  <td className="px-4 text-right">{formatCurrency(s?.spend ?? 0)}</td>
                  <td className="px-4 text-right">{s?.onTimePct == null ? "—" : `${s.onTimePct}%`}</td>
                  <td className={`px-4 text-right ${(s?.priceVariancePct ?? 0) > 0 ? "text-red-600" : ""}`}>{s?.priceVariancePct == null ? "—" : `${s.priceVariancePct}%`}</td>
                  <td className="px-4 text-right">{s?.snagsPerLakh ?? "—"}</td>
                  <td className="px-4 text-right">{s?.avgFixHours ?? "—"}</td>
                  <td className="px-4"><Button size="sm" variant="ghost" onClick={() => setEdit(v)}>Edit</Button></td>
                </tr>
              );
            })}</tbody>
          </table>
        </CardContent></Card>
      </div>
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{edit?.id ? "Edit vendor" : "Add vendor"}</DialogTitle></DialogHeader>
          {edit && (
            <form onSubmit={save} className="space-y-3">
              {(["name", "category", "gstin", "phone", "email"] as const).map((k) => (
                <div key={k} className="space-y-1"><Label htmlFor={`v-${k}`} className="capitalize">{k}</Label>
                  <Input id={`v-${k}`} required={k === "name" || k === "category"} value={edit[k] ?? ""} onChange={(e) => setEdit({ ...edit, [k]: e.target.value })} /></div>
              ))}
              <div className="space-y-1"><Label htmlFor="v-terms">Payment terms (days)</Label>
                <Input id="v-terms" type="number" min="0" value={edit.payment_terms_days ?? 30} onChange={(e) => setEdit({ ...edit, payment_terms_days: Number(e.target.value) })} /></div>
              <div className="space-y-1"><Label htmlFor="v-status">Status</Label>
                <select id="v-status" className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" value={edit.status}
                  onChange={(e) => setEdit({ ...edit, status: e.target.value as VendorStatus })}>
                  <option value="active">Active</option><option value="preferred">Preferred</option><option value="blacklisted">Blacklisted</option>
                </select></div>
              <DialogFooter><Button type="submit">Save</Button></DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
