"use server";
import { mutate } from "@/lib/actions/mutate";
import { idInput, milestoneInput, projectInput, roomInput, stageInput } from "@/lib/actions/schemas";
import {z} from "zod";

export async function createProject(input: unknown) {
  return mutate(projectInput, input, (d, db) => db.from("projects").insert(d).select("id").single());
}
export async function updateProject(input:unknown){return mutate(projectInput.safeExtend({id:z.uuid()}),input,({id,...data},db)=>db.from("projects").update(data).eq("id",id).select("id").single());}
export async function updateRoom(input:unknown){return mutate(roomInput.omit({project_id:true}).partial().extend({id:z.uuid()}),input,({id,...data},db)=>db.from("project_rooms").update(data).eq("id",id).select("id").single());}
export async function updateMilestone(input:unknown){return mutate(milestoneInput.omit({project_id:true}).partial().extend({id:z.uuid()}),input,({id,...data},db)=>db.from("project_milestones").update(data).eq("id",id).select("id").single());}

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
export async function acceptHandover(input:unknown){return mutate(z.object({project_id:z.uuid(),signer:z.string().trim().min(1).max(120)}),input,(d,db)=>db.rpc("accept_project_handover",{p_project:d.project_id,p_signer:d.signer}));}
