"use server";
import { mutate } from "@/lib/actions/mutate";
import { billDecisionInput, billInput, expenseDecisionInput, vendorPaymentInput } from "@/lib/actions/schemas";

export async function recordVendorBill(input: unknown) {
  return mutate(billInput, input, (d, db) => db.rpc("record_vendor_bill", { p: d }));
}

export async function decideVendorBill(input: unknown) {
  return mutate(billDecisionInput, input, (d, db) =>
    d.approve ? db.rpc("approve_vendor_bill", { p_bill: d.id }) : db.rpc("dispute_vendor_bill", { p_bill: d.id, p_note: d.note ?? "" }));
}

export async function recordVendorPayment(input: unknown) {
  return mutate(vendorPaymentInput, input, (d, db) => db.rpc("record_cash_payment",{p:d,p_vendor:true}));
}

export async function decideExpense(input: unknown) {
  return mutate(expenseDecisionInput, input, (d, db) => db.rpc("decide_expense", { p_expense: d.id, p_approve: d.approve, p_note: d.note ?? "" }));
}
