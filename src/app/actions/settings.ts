"use server";
import { mutate } from "@/lib/actions/mutate";
import { idInput, libraryItemInput, libraryItemUpdate, settingsInput } from "@/lib/actions/schemas";

export async function updateSettings(input: unknown) {
  return mutate(settingsInput, input, (d, db) => db.from("firm_settings").update(d).eq("id", true).select("id").single());
}

export async function addLibraryItem(input: unknown) {
  return mutate(libraryItemInput, input, (d, db) => db.from("item_library").insert(d).select("id").single());
}

export async function updateLibraryItem(input: unknown) {
  return mutate(libraryItemUpdate, input, ({ id, ...d }, db) => db.from("item_library").update(d).eq("id", id).select("id").single());
}

export async function deleteLibraryItem(input: unknown) {
  return mutate(idInput, input, ({ id }, db) => db.from("item_library").delete().eq("id", id).select("id").single());
}
