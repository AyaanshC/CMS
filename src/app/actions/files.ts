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
    const file = await db.from("project_files").select("id, storage_path").eq("id",id).single();
    if (file.error || !file.data) return file;
    const removal = await db.storage.from("project-files").remove([file.data.storage_path]);
    if (removal.error) return { data: null, error: removal.error };
    // Keep the metadata until removal succeeds, so failed deletions remain retryable.
    return db.from("project_files").delete().eq("id",id).select("id").single();
  });
}
