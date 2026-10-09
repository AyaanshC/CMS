"use server";
import { mutate } from "@/lib/actions/mutate";
import { idInput, snagCommentInput, snagInput, snagStatusInput, snagVendorInput } from "@/lib/actions/schemas";

export async function createSnag(input: unknown) {
  return mutate(snagInput, input, (d, db) => db.from("snags").insert(d).select("id").single());
}

export async function setSnagStatus(input: unknown) {
  return mutate(snagStatusInput, input, ({ id, status, after_photo_url }, db) =>
    db.from("snags")
      .update(after_photo_url ? { status, after_photo_url } : { status })
      .eq("id", id).select("id").single(),
  );
}

export async function assignSnagVendor(input: unknown) {
  return mutate(snagVendorInput, input, ({ id, vendor_id }, db) =>
    db.from("snags").update({ vendor_id: vendor_id ?? null }).eq("id", id).select("id").single(),
  );
}

export async function closeSnagAsClient(input: unknown) {
  return mutate(idInput, input, ({ id }, db) => db.rpc("client_close_snag", { p_snag: id }));
}

export async function addSnagComment(input: unknown) {
  return mutate(snagCommentInput, input, (d, db) => db.from("snag_comments").insert(d).select("id").single());
}
