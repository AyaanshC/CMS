"use server";
import { mutate } from "@/lib/actions/mutate";
import { cancelPoInput, idInput, poInput, quoteInput, receiptInput } from "@/lib/actions/schemas";

export async function addQuote(input: unknown) {
  return mutate(quoteInput, input, (d, db) => db.from("vendor_quotes").insert(d).select("id").single());
}

// Header then lines; if lines fail the draft header is deleted so no empty PO remains.
export async function createPurchaseOrder(input: unknown) {
  return mutate(poInput, input, async ({ lines, order_date, ...head }, db) => {
    const po = await db.from("purchase_orders").insert({ ...head, ...(order_date ? { order_date } : {}) }).select("id").single();
    if (po.error || !po.data) return po;
    const ins = await db.from("po_lines").insert(lines.map((l) => ({ ...l, po_id: po.data.id })));
    if (ins.error) {
      await db.from("purchase_orders").delete().eq("id", po.data.id);
      return { data: null, error: ins.error };
    }
    return po;
  });
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
  return mutate(receiptInput, input, async ({ lines, ...head }, db) => {
    const grn = await db.from("goods_receipts").insert(head).select("id").single();
    if (grn.error || !grn.data) return grn;
    const ins = await db.from("grn_lines").insert(lines.map((l) => ({ ...l, grn_id: grn.data.id })));
    return ins.error ? { data: null, error: ins.error } : grn;
  });
}
