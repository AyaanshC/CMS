"use server";
import { mutate } from "@/lib/actions/mutate";
import { applyTemplateInput, feeStageCreate, feeStageUpdate, feeTermsInput, idInput } from "@/lib/actions/schemas";

export async function setFeeTerms(input: unknown) {
  return mutate(feeTermsInput, input, ({ id, ...d }, db) => db.from("projects").update(d).eq("id", id).select("id").single());
}

export async function applyFeeTemplate(input: unknown) {
  return mutate(applyTemplateInput, input, (d, db) => db.rpc("apply_fee_template", { p_project: d.project_id, p_template: d.template_id }));
}

export async function addFeeStage(input: unknown) {
  return mutate(feeStageCreate, input, (d, db) => db.from("project_fee_stages").insert(d).select("id").single());
}

export async function updateFeeStage(input: unknown) {
  return mutate(feeStageUpdate, input, ({ id, ...d }, db) => db.from("project_fee_stages").update(d).eq("id", id).select("id").single());
}

export async function deleteFeeStage(input: unknown) {
  return mutate(idInput, input, ({ id }, db) => db.from("project_fee_stages").delete().eq("id", id).select("id").single());
}

export async function completeFeeStage(input: unknown) {
  return mutate(idInput, input, ({ id }, db) => db.rpc("complete_fee_stage", { p_stage: id }));
}

export async function reopenFeeStage(input: unknown) {
  return mutate(idInput, input, ({ id }, db) => db.rpc("reopen_fee_stage", { p_stage: id }));
}
