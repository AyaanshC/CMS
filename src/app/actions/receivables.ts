"use server";
import { mutate } from "@/lib/actions/mutate";
import { creditNoteInput, idInput, issueInvoiceInput, retentionInput } from "@/lib/actions/schemas";

export async function issueInvoice(input: unknown) {
  return mutate(issueInvoiceInput, input, ({ id, due_date }, db) =>
    db.from("invoices").update(due_date ? { status: "sent", due_date } : { status: "sent" }).eq("id", id).eq("status", "draft").select("id").single(),
  );
}

export async function deleteDraftInvoice(input: unknown) {
  return mutate(idInput, input, ({ id }, db) => db.from("invoices").delete().eq("id", id).eq("status", "draft").select("id").single());
}

export async function addCreditNote(input: unknown) {
  return mutate(creditNoteInput, input, (d, db) => db.from("credit_notes").insert(d).select("id").single());
}

export async function setRetention(input: unknown) {
  return mutate(retentionInput, input, ({ id, retention_amount }, db) =>
    db.from("invoices").update({ retention_amount }).eq("id", id).select("id").single(),
  );
}

export async function releaseRetention(input: unknown) {
  return mutate(idInput, input, ({ id }, db) =>
    db.from("invoices").update({ retention_released_at: new Date().toISOString() }).eq("id", id).select("id").single(),
  );
}
