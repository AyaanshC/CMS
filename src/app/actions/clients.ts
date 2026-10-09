"use server";
import { mutate } from "@/lib/actions/mutate";
import { clientInput, clientUpdate } from "@/lib/actions/schemas";

export async function createClient(input: unknown) {
  return mutate(clientInput, input, (d, db) => db.from("clients").insert(d).select("id").single());
}

export async function updateClient(input: unknown) {
  return mutate(clientUpdate, input, ({ id, ...d }, db) => db.from("clients").update(d).eq("id", id).select("id").single());
}
