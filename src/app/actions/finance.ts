"use server";
import { mutate } from "@/lib/actions/mutate";
import { expenseInput, idInput, invoiceInput, paymentInput } from "@/lib/actions/schemas";

export async function createInvoice(input: unknown) {
  return mutate(invoiceInput, input, ({ send, ...d }, db) =>
    db.from("invoices").insert({ ...d, status: send ? "sent" : "draft" }).select("id").single(),
  );
}

export async function cancelInvoice(input: unknown) {
  return mutate(idInput, input, ({ id }, db) => db.from("invoices").update({ status: "cancelled" }).eq("id", id).select("id").single());
}

export async function recordPayment(input: unknown) {
  return mutate(paymentInput, input, (d, db) => db.from("payments").insert(d).select("id").single());
}

export async function addExpense(input: unknown) {
  return mutate(expenseInput, input, (d, db) => db.from("expenses").insert(d).select("id").single());
}
