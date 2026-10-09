"use server";
import { mutate } from "@/lib/actions/mutate";
import { billDecisionInput, billInput, expenseDecisionInput, vendorPaymentInput } from "@/lib/actions/schemas";

export async function recordVendorBill(input: unknown) {
  return mutate(billInput, input, async ({ lines, ...head }, db) => {
    const bill = await db.from("vendor_bills").insert(head).select("id").single();
    if (bill.error || !bill.data) return bill;
    const ins = await db.from("vendor_bill_lines").insert(lines.map((l) => ({ ...l, bill_id: bill.data.id })));
    if (ins.error) {
      await db.from("vendor_bills").delete().eq("id", bill.data.id);
      return { data: null, error: ins.error };
    }
    return bill;
  });
}

export async function decideVendorBill(input: unknown) {
  return mutate(billDecisionInput, input, (d, db) =>
    d.approve ? db.rpc("approve_vendor_bill", { p_bill: d.id }) : db.rpc("dispute_vendor_bill", { p_bill: d.id, p_note: d.note ?? "" }));
}

export async function recordVendorPayment(input: unknown) {
  return mutate(vendorPaymentInput, input, (d, db) => db.from("vendor_payments").insert(d).select("id").single());
}

export async function decideExpense(input: unknown) {
  return mutate(expenseDecisionInput, input, (d, db) => db.rpc("decide_expense", { p_expense: d.id, p_approve: d.approve, p_note: d.note ?? "" }));
}
