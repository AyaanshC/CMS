"use server";
import { z } from "zod";
import { mutate } from "@/lib/actions/mutate";
import { idInput, materialSelectInput, materialInput, messageInput, reactionInput, updateInput } from "@/lib/actions/schemas";

export async function sendMessage(input: unknown) {
  return mutate(messageInput, input, (d, db) => db.from("messages").insert(d).select("id").single());
}

export async function postUpdate(input: unknown) {
  return mutate(updateInput, input, (d, db) => db.from("project_updates").insert(d).select("id").single());
}

export async function reactToUpdate(input: unknown) {
  return mutate(reactionInput, input, ({ id, kind }, db) => db.rpc("react_to_update", { p_update: id, p_kind: kind }));
}

export async function setMaterialSelected(input: unknown) {
  return mutate(materialSelectInput,input,({id,is_selected},db)=>db.rpc("select_material",{p_material:id,p_selected:is_selected}));
}
export async function saveMaterial(input: unknown) {
  return mutate(materialInput,input,({id,...data},db)=>id?db.from("material_options").update(data).eq("id",id).select("id").single():db.from("material_options").insert(data).select("id").single());
}
export async function deleteMaterial(input: unknown) { return mutate(idInput,input,({id},db)=>db.from("material_options").delete().eq("id",id).select("id").single()); }
export async function finalizeMaterial(input:unknown){return mutate(idInput,input,({id},db)=>db.rpc("finalize_material",{p_material:id}));}

export async function markNotificationRead(input: unknown) {
  return mutate(idInput, input, ({ id }, db) => db.from("notifications").update({ is_read: true }).eq("id", id).select("id").single());
}

export async function markAllNotificationsRead() {
  // RLS limits the update to the caller's own notifications.
  return mutate(z.object({}), {}, (_d, db) => db.from("notifications").update({ is_read: true }).eq("is_read", false).select("id"));
}
