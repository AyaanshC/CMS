"use server";
import { mutate } from "@/lib/actions/mutate";
import { changeOrderDecision, changeOrderInput, changeOrderUpdate, idInput } from "@/lib/actions/schemas";

export async function createChangeOrder(input: unknown) {
  // `number` is assigned by a trigger; the empty string satisfies the generated Insert type.
  return mutate(changeOrderInput, input, (d, db) => db.from("change_orders").insert({ ...d, number: "" }).select("id").single());
}

export async function updateChangeOrder(input: unknown) {
  return mutate(changeOrderUpdate, input, ({ id, ...d }, db) => db.from("change_orders").update(d).eq("id", id).select("id").single());
}

export async function submitChangeOrder(input: unknown) {
  return mutate(idInput, input, ({ id }, db) =>
    db.from("change_orders").update({ status: "submitted", submitted_at: new Date().toISOString() }).eq("id", id).select("id").single(),
  );
}

export async function decideChangeOrder(input: unknown) {
  return mutate(changeOrderDecision, input, (d, db) =>
    db.rpc("client_decide_change_order", { p_co: d.id, p_approve: d.approve, p_signer: d.signer, p_note: d.note ?? "" }),
  );
}
