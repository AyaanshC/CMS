"use server";
import { mutate } from "@/lib/actions/mutate";
import { expenseInput, idInput, invoiceInput, paymentInput } from "@/lib/actions/schemas";
import { z } from "zod";

export async function createInvoice(input: unknown) {
  return mutate(invoiceInput, input, ({ send,items, ...d }, db) => items ? db.rpc("create_itemized_invoice",{p:{...d,send,items}}) :
    db.from("invoices").insert({ ...d, status: send ? "sent" : "draft" }).select("id").single(),
  );
}
export async function billHourlyTime(input:unknown){return mutate(z.object({project_id:z.uuid(),from:z.iso.date(),to:z.iso.date()}),input,(d,db)=>db.rpc("bill_hourly_time",{p_project:d.project_id,p_from:d.from,p_to:d.to}));}

export async function cancelInvoice(input: unknown) {
  return mutate(idInput, input, ({ id }, db) => db.from("invoices").update({ status: "cancelled" }).eq("id", id).select("id").single());
}

export async function recordPayment(input: unknown) {
  return mutate(paymentInput, input, (d, db) => db.rpc("record_cash_payment",{p:d,p_vendor:false}));
}

export async function addExpense(input: unknown) {
  return mutate(expenseInput, input, (d, db) => db.from("expenses").insert(d).select("id").single());
}
