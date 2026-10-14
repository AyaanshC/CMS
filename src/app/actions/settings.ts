"use server";
import { mutate } from "@/lib/actions/mutate";
import {z} from "zod";
import { idInput, libraryItemInput, libraryItemUpdate, settingsInput, boqTemplateInput } from "@/lib/actions/schemas";

export async function updateSettings(input: unknown) {
  return mutate(settingsInput, input, (d, db) => db.from("firm_settings").update(d).eq("id", true).select("id").single());
}

export async function addLibraryItem(input: unknown) {
  return mutate(libraryItemInput, input, (d, db) => db.from("item_library").insert(d).select("id").single());
}
export async function importLibraryItems(input:unknown){return mutate(z.array(libraryItemInput).min(1).max(200),input,(rows,db)=>db.from("item_library").insert(rows).select("id"));}

export async function updateLibraryItem(input: unknown) {
  return mutate(libraryItemUpdate, input, ({ id, ...d }, db) => db.from("item_library").update(d).eq("id", id).select("id").single());
}

export async function deleteLibraryItem(input: unknown) {
  return mutate(idInput, input, ({ id }, db) => db.from("item_library").delete().eq("id", id).select("id").single());
}
export async function saveBoqTemplate(input: unknown) {
  return mutate(boqTemplateInput,input,(data,db)=>db.from("boq_templates").insert(data).select("id").single());
}
