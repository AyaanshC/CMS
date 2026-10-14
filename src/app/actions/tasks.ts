"use server";
import { mutate } from "@/lib/actions/mutate";
import {z} from "zod";
import { idInput, taskInput, taskStatusInput } from "@/lib/actions/schemas";

export async function createTask(input: unknown) {
  return mutate(taskInput, input, (d, db) => db.from("tasks").insert(d).select("id").single());
}
export async function updateTask(input:unknown){return mutate(taskInput.omit({project_id:true}).partial().extend({id:z.uuid()}),input,({id,...data},db)=>db.from("tasks").update(data).eq("id",id).select("id").single());}

export async function setTaskStatus(input: unknown) {
  return mutate(taskStatusInput, input, ({ id, status }, db) => db.from("tasks").update({ status }).eq("id", id).select("id").single());
}

export async function deleteTask(input: unknown) {
  return mutate(idInput, input, ({ id }, db) => db.from("tasks").delete().eq("id", id).select("id").single());
}
