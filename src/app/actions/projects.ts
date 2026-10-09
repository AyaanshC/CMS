"use server";
import { mutate } from "@/lib/actions/mutate";
import { idInput, milestoneInput, projectInput, roomInput, stageInput } from "@/lib/actions/schemas";

export async function createProject(input: unknown) {
  return mutate(projectInput, input, (d, db) => db.from("projects").insert(d).select("id").single());
}

export async function setProjectStage(input: unknown) {
  return mutate(stageInput, input, ({ id, status }, db) => db.from("projects").update({ status }).eq("id", id).select("id").single());
}

export async function addRoom(input: unknown) {
  return mutate(roomInput, input, (d, db) => db.from("project_rooms").insert(d).select("id").single());
}

export async function addMilestone(input: unknown) {
  return mutate(milestoneInput, input, (d, db) => db.from("project_milestones").insert(d).select("id").single());
}

export async function toggleMilestone(input: unknown) {
  return mutate(idInput, input, ({ id }, db) => db.rpc("toggle_milestone", { p_id: id }));
}
