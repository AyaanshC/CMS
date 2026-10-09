// Single home for money arithmetic. The database computes the same values for
// invoices (generated columns); keep the formulas identical.

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export const lineTotal = (quantity: number, unitRate: number) => round2(quantity * unitRate);

export interface BoqTotalsInput {
  gst_percent: number;
  designer_fee: number;
  discount_amount: number;
  sections: { items: { quantity: number; unit_rate: number }[] }[];
}

export interface BoqTotals {
  sectionSubtotals: number[];
  itemsSubtotal: number;
  taxable: number;
  gst: number;
  grandTotal: number;
}

export function boqTotals(v: BoqTotalsInput): BoqTotals {
  const sectionSubtotals = v.sections.map((s) =>
    round2(s.items.reduce((sum, i) => sum + lineTotal(i.quantity, i.unit_rate), 0)),
  );
  const itemsSubtotal = round2(sectionSubtotals.reduce((a, b) => a + b, 0));
  const taxable = round2(itemsSubtotal + v.designer_fee - v.discount_amount);
  const gst = round2((taxable * v.gst_percent) / 100);
  return { sectionSubtotals, itemsSubtotal, taxable, gst, grandTotal: round2(taxable + gst) };
}

export function invoiceAmounts(i: { subtotal: number; discount: number; gstRate: number }) {
  const taxable = round2(i.subtotal - i.discount);
  const gst = round2((taxable * i.gstRate) / 100);
  return { taxable, gst, total: round2(taxable + gst) };
}
