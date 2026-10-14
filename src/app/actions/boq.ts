"use server";
import { mutate } from "@/lib/actions/mutate";
import { boqDecisionInput, boqUpdateInput, boqVersionInput, idInput, lineItemInput, lineItemUpdate, boqSectionInput, applyTemplateInput } from "@/lib/actions/schemas";

export async function createBoqVersion(input: unknown) {
  return mutate(boqVersionInput, input, (d, db) => db.rpc("create_boq_version", { p: d }));
}

export async function updateBoqVersion(input: unknown) {
  return mutate(boqUpdateInput, input, ({ id, status, ...d }, db) =>
    db.from("boq_versions")
      .update(status ? { ...d, status, submitted_at: new Date().toISOString() } : d)
      .eq("id", id).select("id").single(),
  );
}

export async function addLineItem(input: unknown) {
  return mutate(lineItemInput, input, (d, db) => db.from("boq_line_items").insert(d).select("id").single());
}

export async function deleteLineItem(input: unknown) {
  return mutate(idInput, input, ({ id }, db) => db.from("boq_line_items").delete().eq("id", id).select("id").single());
}
export async function updateLineItem(input: unknown) {
  return mutate(lineItemUpdate,input,({id,...data},db)=>db.from("boq_line_items").update(data).eq("id",id).select("id").single());
}
export async function addBoqSection(input: unknown) {
  return mutate(boqSectionInput,input,(data,db)=>db.from("boq_sections").insert(data).select("id").single());
}
export async function applyBoqTemplate(input: unknown) {
  return mutate(applyTemplateInput,input,(data,db)=>db.rpc("apply_boq_template",{p_project:data.project_id,p_template:data.template_id}));
}

export async function decideBoq(input: unknown) {
  return mutate(boqDecisionInput, input, (d, db) =>
    db.rpc("client_decide_boq", { p_boq: d.boq_id, p_approve: d.approve, p_signer: d.signer, p_note: d.note ?? "" }),
  );
}
