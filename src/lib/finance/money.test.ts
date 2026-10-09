import { describe, expect, it } from "vitest";
import { boqTotals, invoiceAmounts, lineTotal, round2 } from "./money";

describe("round2", () => {
  it("removes floating point noise", () => {
    expect(round2(0.1 * 3)).toBe(0.3);
    expect(round2(1.005)).toBe(1.01);
  });
});

describe("lineTotal", () => {
  it("multiplies quantity by rate", () => {
    expect(lineTotal(240, 95)).toBe(22800);
    expect(lineTotal(3, 33.33)).toBe(99.99);
  });
});

describe("boqTotals", () => {
  const version = {
    gst_percent: 18,
    designer_fee: 35000,
    discount_amount: 5000,
    sections: [
      { items: [{ quantity: 240, unit_rate: 95 }, { quantity: 450, unit_rate: 25 }] },
      { items: [] },
    ],
  };

  it("computes section subtotals", () => {
    expect(boqTotals(version).sectionSubtotals).toEqual([34050, 0]);
  });

  it("taxes items plus designer fee minus discount", () => {
    const t = boqTotals(version);
    expect(t.itemsSubtotal).toBe(34050);
    expect(t.taxable).toBe(64050);
    expect(t.gst).toBe(11529);
    expect(t.grandTotal).toBe(75579);
  });

  it("handles an empty BOQ", () => {
    expect(boqTotals({ ...version, sections: [], designer_fee: 0, discount_amount: 0 }).grandTotal).toBe(0);
  });
});

describe("invoiceAmounts", () => {
  it("applies GST after discount", () => {
    expect(invoiceAmounts({ subtotal: 250000, discount: 0, gstRate: 18 })).toEqual({ taxable: 250000, gst: 45000, total: 295000 });
    expect(invoiceAmounts({ subtotal: 100000, discount: 10000, gstRate: 18 })).toEqual({ taxable: 90000, gst: 16200, total: 106200 });
  });
});
