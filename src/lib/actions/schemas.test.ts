import { describe, expect, it } from "vitest";
import {
  changeOrderInput, clientInput, creditNoteInput, feeStageUpdate, feeTermsInput, invoiceInput, issueInvoiceInput,
  lineItemInput, messageInput, paymentInput, projectInput, taskInput,
} from "./schemas";

const P = "a1000000-0000-4000-8000-000000000001";

describe("schemas", () => {
  it("strips client-side ids and display fields", () => {
    const t = taskInput.parse({ id: "task-123", project_id: P, title: "Do it", priority: "high", project_name: "X" });
    expect(t).not.toHaveProperty("id");
    expect(t).not.toHaveProperty("project_name");
  });

  it("rejects non-uuid ids", () => {
    expect(taskInput.safeParse({ project_id: "project-1", title: "x", priority: "low" }).success).toBe(false);
  });

  it("requires a positive payment and coerces strings", () => {
    expect(paymentInput.safeParse({ invoice_id: P, amount: 0, payment_date: "2026-10-09", mode: "upi" }).success).toBe(false);
    expect(paymentInput.safeParse({ invoice_id: P, amount: "1500", payment_date: "2026-10-09", mode: "upi" }).success).toBe(true);
  });

  it("rejects unknown payment modes", () => {
    expect(paymentInput.safeParse({ invoice_id: P, amount: 10, payment_date: "2026-10-09", mode: "UPI" }).success).toBe(false);
  });

  it("caps invoice discount at subtotal", () => {
    expect(invoiceInput.safeParse({ project_id: P, subtotal: 100, discount: 101, gst_rate: 18, due_date: "2026-11-01" }).success).toBe(false);
  });

  it("requires positive BOQ quantities", () => {
    expect(lineItemInput.safeParse({ section_id: P, description: "x", unit: "nos", quantity: 0, unit_rate: 10 }).success).toBe(false);
  });

  it("requires message content or a file", () => {
    expect(messageInput.safeParse({ project_id: P }).success).toBe(false);
    expect(messageInput.safeParse({ project_id: P, content: "Hi" }).success).toBe(true);
  });

  it("checks client budget range and normalises empty email", () => {
    expect(clientInput.safeParse({ full_name: "A", phone: "98000 00000", budget_min: 10, budget_max: 5 }).success).toBe(false);
    expect(clientInput.parse({ full_name: "A", phone: "98000 00000", email: "" }).email).toBeNull();
  });

  it("checks project dates are ordered", () => {
    expect(projectInput.safeParse({ client_id: P, name: "X", start_date: "2026-10-10", estimated_end_date: "2026-10-01" }).success).toBe(false);
  });
});

describe("phase 1 schemas", () => {
  it("requires rate and cost for percent-of-cost fees", () => {
    expect(feeTermsInput.safeParse({ id: P, fee_basis: "percent_of_cost", fee_rate: 8 }).success).toBe(false);
    expect(feeTermsInput.safeParse({ id: P, fee_basis: "percent_of_cost", fee_rate: 8, estimated_construction_cost: 1e7 }).success).toBe(true);
  });
  it("requires an amount for lump-sum fees", () => {
    expect(feeTermsInput.safeParse({ id: P, fee_basis: "lump_sum" }).success).toBe(false);
  });
  it("bounds stage percentages", () => {
    expect(feeStageUpdate.safeParse({ id: P, percent: 0 }).success).toBe(false);
    expect(feeStageUpdate.safeParse({ id: P, percent: 101 }).success).toBe(false);
  });
  it("rejects a fee on a design-error change order", () => {
    expect(changeOrderInput.safeParse({ project_id: P, title: "x", reason: "design_error", fee_impact: 10 }).success).toBe(false);
  });
});

describe("receivables schemas", () => {
  it("accepts TDS on payments and defaults it to 0", () => {
    expect(paymentInput.parse({ invoice_id: P, amount: 100, payment_date: "2026-10-09", mode: "upi" }).tds_amount).toBe(0);
    expect(paymentInput.safeParse({ invoice_id: P, amount: 100, tds_amount: -1, payment_date: "2026-10-09", mode: "upi" }).success).toBe(false);
  });
  it("requires a credit note reason", () => {
    expect(creditNoteInput.safeParse({ invoice_id: P, amount: 100, reason: " " }).success).toBe(false);
  });
  it("allows issuing without a due date (client terms apply)", () => {
    expect(issueInvoiceInput.safeParse({ id: P }).success).toBe(true);
  });
});

