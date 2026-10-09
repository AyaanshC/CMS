import { describe, expect, it } from "vitest";
import {
  clientInput, invoiceInput, lineItemInput, messageInput, paymentInput, projectInput, taskInput,
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
