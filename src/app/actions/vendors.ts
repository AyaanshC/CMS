"use server";
import { mutate } from "@/lib/actions/mutate";
import { lineCostInput, vendorInput, vendorUpdate } from "@/lib/actions/schemas";

export async function createVendor(input: unknown) {
  return mutate(vendorInput, input, (d, db) => db.from("vendors").insert(d).select("id").single());
}
export async function updateVendor(input: unknown) {
  return mutate(vendorUpdate, input, ({ id, ...d }, db) => db.from("vendors").update(d).eq("id", id).select("id").single());
}
export async function setLineCost(input: unknown) {
  return mutate(lineCostInput, input, (d, db) => db.from("boq_line_costs").upsert(d).select("line_item_id").single());
}
