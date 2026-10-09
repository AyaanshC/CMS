"use server";
import { mutate } from "@/lib/actions/mutate";
import { idInput } from "@/lib/actions/schemas";

export async function acknowledgeAlert(input: unknown) {
  return mutate(idInput, input, ({ id }, db) => db.rpc("acknowledge_alert", { p_alert: id }));
}
