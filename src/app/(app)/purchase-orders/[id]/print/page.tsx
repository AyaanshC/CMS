"use client";

import { use, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function PoPrint({ params }: { params: Promise<{ id: string }> }) {
  return <Suspense><Content params={params} /></Suspense>;
}

function Content({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { purchaseOrders, vendors, projects, studioSettings } = useAppStore();
  const po = purchaseOrders.find((o) => o.id === id);
  if (!po) return <p className="p-6">Purchase order not found.</p>;
  const vendor = vendors.find((v) => v.id === po.vendor_id);
  const project = projects.find((p) => p.id === po.project_id);
  const gst = po.lines.reduce((s, l) => s + (l.amount * l.gst_rate) / 100, 0);
  return (
    <div className="max-w-3xl mx-auto p-8 space-y-6 bg-white text-black">
      <div className="flex justify-between">
        <div><h1 className="text-xl font-bold">{studioSettings.name}</h1><p className="text-sm">{studioSettings.address}</p><p className="text-sm">GSTIN {studioSettings.gstin}</p></div>
        <div className="text-right"><h2 className="text-lg font-bold">PURCHASE ORDER</h2><p>{po.number}</p><p className="text-sm">{formatDate(po.order_date)}</p></div>
      </div>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div><p className="font-semibold">Vendor</p><p>{vendor?.name}</p><p>{vendor?.address}</p><p>GSTIN {vendor?.gstin ?? "—"}</p></div>
        <div><p className="font-semibold">Deliver to</p><p>{project?.name}</p><p>{project?.property_address}</p>
          {po.expected_delivery && <p>By {formatDate(po.expected_delivery)}</p>}</div>
      </div>
      <table className="w-full text-sm border-collapse">
        <thead><tr className="border-b text-left"><th>#</th><th>Description</th><th className="text-right">Qty</th><th className="text-right">Rate</th><th className="text-right">GST</th><th className="text-right">Amount</th></tr></thead>
        <tbody>{po.lines.map((l, i) => (
          <tr key={l.id} className="border-b"><td>{i + 1}</td><td>{l.description}</td><td className="text-right">{l.quantity} {l.unit}</td>
            <td className="text-right">{formatCurrency(l.rate)}</td><td className="text-right">{l.gst_rate}%</td><td className="text-right">{formatCurrency(l.amount)}</td></tr>
        ))}</tbody>
      </table>
      <div className="text-right text-sm"><p>Subtotal {formatCurrency(po.total)}</p><p>GST {formatCurrency(gst)}</p><p className="font-bold">Total {formatCurrency(po.total + gst)}</p></div>
      {po.approved_by_name && <p className="text-xs">Approved by {po.approved_by_name}</p>}
      <Button className="print:hidden" onClick={() => window.print()}>Print</Button>
    </div>
  );
}
