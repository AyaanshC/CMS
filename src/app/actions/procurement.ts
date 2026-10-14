"use server";
import { mutate } from "@/lib/actions/mutate";
import { cancelPoInput, idInput, poInput, quoteInput, receiptInput } from "@/lib/actions/schemas";

export async function addQuote(input: unknown) {
  return mutate(quoteInput, input, (d, db) => db.from("vendor_quotes").insert(d).select("id").single());
}

// Header and lines commit together; a failed line leaves no partial order.
export async function createPurchaseOrder(input: unknown) {
  return mutate(poInput, input, (d, db) => db.rpc("create_purchase_order", { p: d }));
}

export async function submitPurchaseOrder(input: unknown) {
  return mutate(idInput, input, ({ id }, db) => db.rpc("submit_po", { p_po: id }));
}
export async function approvePurchaseOrder(input: unknown) {
  return mutate(idInput, input, ({ id }, db) => db.rpc("approve_po", { p_po: id }));
}
export async function issuePurchaseOrder(input: unknown) {
  return mutate(idInput, input, ({ id }, db) => db.rpc("issue_po", { p_po: id }));
}
export async function cancelPurchaseOrder(input: unknown) {
  return mutate(cancelPoInput, input, ({ id, reason }, db) => db.rpc("cancel_po", { p_po: id, p_reason: reason }));
}

export async function recordReceipt(input: unknown) {
  return mutate(receiptInput, input, (d, db) => db.rpc("record_goods_receipt", { p: d }));
}
