import { round2 } from "@/lib/finance/money";
import type { CostControlRow, GoodsReceipt, PurchaseOrder, Snag, Vendor, VendorBill } from "@/types";

export interface ScoreRow {
  vendor_id: string; name: string; status: Vendor["status"]; spend: number;
  onTimePct: number | null; priceVariancePct: number | null; snagsPerLakh: number | null; avgFixHours: number | null;
}

const HOUR = 3_600_000;

export function vendorScorecard(
  vendors: Vendor[], pos: PurchaseOrder[], receipts: GoodsReceipt[], bills: VendorBill[], snags: Snag[],
  costRows: CostControlRow[], today: string,
): ScoreRow[] {
  const costRate = new Map(costRows.filter((r) => r.cost_rate != null).map((r) => [r.line_item_id, r.cost_rate!]));
  return vendors.map((v) => {
    const mine = pos.filter((o) => o.vendor_id === v.id && o.status !== "draft" && o.status !== "cancelled");
    // On time: fully received on or before expected date. Due: expected date has passed, or fully received.
    const due = mine.filter((o) => o.expected_delivery && (o.expected_delivery < today || o.lines.every((l) => l.received_qty >= l.quantity)));
    const onTime = due.filter((o) => {
      if (!o.lines.every((l) => l.received_qty >= l.quantity)) return false;
      const last = receipts.filter((g) => g.po_id === o.id).map((g) => g.received_on).sort().at(-1);
      return !!last && last <= o.expected_delivery!;
    });
    const linked = mine.flatMap((o) => o.lines).filter((l) => l.boq_line_item_id && costRate.has(l.boq_line_item_id));
    const budget = linked.reduce((s, l) => s + l.quantity * costRate.get(l.boq_line_item_id!)!, 0);
    const paid = linked.reduce((s, l) => s + l.amount, 0);
    const spend = round2(bills.filter((b) => b.vendor_id === v.id && b.status === "approved").reduce((s, b) => s + b.subtotal, 0));
    const vs = snags.filter((s) => s.vendor_id === v.id);
    const fixed = vs.filter((s) => s.fixed_at);
    return {
      vendor_id: v.id, name: v.name, status: v.status, spend,
      onTimePct: due.length ? Math.round((onTime.length / due.length) * 100) : null,
      priceVariancePct: budget > 0 ? Math.round(((paid - budget) / budget) * 100) : null,
      snagsPerLakh: spend > 0 ? round2(vs.length / (spend / 100000)) : null,
      avgFixHours: fixed.length ? Math.round(fixed.reduce((s, x) => s + (Date.parse(x.fixed_at!) - Date.parse(x.created_at)) / HOUR, 0) / fixed.length) : null,
    };
  }).sort((a, b) => b.spend - a.spend);
}
