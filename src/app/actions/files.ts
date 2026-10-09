"use server";
import { mutate } from "@/lib/actions/mutate";
import { fileRecordInput, idInput, visibilityInput } from "@/lib/actions/schemas";

export async function createFileRecord(input: unknown) {
  return mutate(fileRecordInput, input, (d, db) => db.from("project_files").insert(d).select("id").single());
}

export async function setFileVisibility(input: unknown) {
  return mutate(visibilityInput, input, ({ id, is_client_visible }, db) =>
    db.from("project_files").update({ is_client_visible }).eq("id", id).select("id").single(),
  );
}

export async function deleteFile(input: unknown) {
  return mutate(idInput, input, async ({ id }, db) => {
    const res = await db.from("project_files").delete().eq("id", id).select("id, storage_path").single();
    // ponytail: if the object removal fails the file is orphaned in storage; add a cleanup job if that happens.
    if (!res.error && res.data) await db.storage.from("project-files").remove([res.data.storage_path]);
    return res;
  });
}
