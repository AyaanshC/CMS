import { describe, expect, it } from "vitest";
import { vendorScorecard } from "./scorecard";
import type { CostControlRow, GoodsReceipt, PurchaseOrder, Snag, Vendor, VendorBill } from "@/types";

const vendors = [{ id: "v", name: "Bright", status: "active", category: "Electrical", payment_terms_days: 30 }] as Vendor[];
const pos = [
  { id: "o1", vendor_id: "v", status: "closed", expected_delivery: "2026-09-10", lines: [{ id: "l1", boq_line_item_id: "b1", quantity: 10, rate: 110, amount: 1100, received_qty: 10 }] },
  { id: "o2", vendor_id: "v", status: "issued", expected_delivery: "2026-09-20", lines: [{ id: "l2", quantity: 5, rate: 10, amount: 50, received_qty: 2 }] },
] as PurchaseOrder[];
const receipts = [{ po_id: "o1", received_on: "2026-09-09", lines: [] }] as unknown as GoodsReceipt[];
const bills = [{ vendor_id: "v", status: "approved", subtotal: 200000 }] as VendorBill[];
const snags = [
  { vendor_id: "v", created_at: "2026-10-01T00:00:00Z", fixed_at: "2026-10-02T00:00:00Z" },
  { vendor_id: "v", created_at: "2026-10-01T00:00:00Z" },
] as Snag[];
const costRows = [{ line_item_id: "b1", cost_rate: 100 }] as CostControlRow[];

describe("vendorScorecard", () => {
  const [s] = vendorScorecard(vendors, pos, receipts, bills, snags, costRows, "2026-10-09");
  it("counts on-time deliveries among POs that were due", () => {
    expect(s.onTimePct).toBe(50);   // o1 on time, o2 late and incomplete
  });
  it("measures price variance against BOQ cost on linked lines", () => {
    expect(s.priceVariancePct).toBe(10);
  });
  it("normalises snags per ₹1 lakh billed and averages fix time", () => {
    expect(s.spend).toBe(200000);
    expect(s.snagsPerLakh).toBe(1);
    expect(s.avgFixHours).toBe(24);
  });
});
