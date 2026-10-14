"use server";
import { z } from "zod";
import { createServerSupabase } from "@/lib/supabase/server";
import {intakeOptions} from "@/lib/onboarding/options";
import {DEFAULT_INTAKE_OPTIONS} from "@/lib/onboarding/default-options";
import {mutate} from "@/lib/actions/mutate";

const onboardingInput = z.object({
  website: z.string().max(200).optional(),
  full_name: z.string().trim().min(1).max(120),
  phone: z.string().trim().min(6).max(30).refine(s=>/^\+?[0-9\s()\-]+$/.test(s)&&s.replace(/\D/g,"").length>=7,"Enter a valid phone number"),
  email: z.union([z.string().email(), z.literal("")]).optional(),
  address: z.string().trim().max(300).optional(),
  property_type: z.string().max(60).optional(),
  area_sqft: z.coerce.number().positive().max(1_000_000).optional(),
  budget_label: z.string().max(60).optional(),
  budget_estimate: z.coerce.number().nonnegative().max(1e10).optional(),
  style: z.string().max(60).optional(),
  rooms: z.array(z.string().trim().min(1).max(60)).max(20).default([]),
});

export async function submitOnboarding(input: unknown): Promise<{ ok: true; reference: string } | { ok: false; error: string }> {
  const parsed = onboardingInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Please check your name, phone and email." };
  if (parsed.data.website) return { ok: false, error: "Unable to submit this enquiry." };
  try {
  const db = await createServerSupabase(); // signed-out visitors use the anon key
  const { data, error } = await db.rpc("submit_onboarding", { p: parsed.data });
  if (error) return { ok: false, error: error.message };
  return { ok: true, reference: data };
  } catch { return { ok: false, error: "Your enquiry could not be saved. Please retry; your details are still here." }; }
}
export async function getPublicIntakeOptions(){
 try{const db=await createServerSupabase();const {data,error}=await db.rpc("get_intake_options");if(!error&&data){const value=data as {name:string;options:unknown};const parsed=intakeOptions.safeParse(value.options);if(parsed.success)return {name:value.name,options:parsed.data};}}catch{}
 return {name:"Priya Designs Studio",options:DEFAULT_INTAKE_OPTIONS};
}
export async function saveIntakeOptions(input:unknown){return mutate(intakeOptions,input,(options,db)=>db.from("firm_settings").update({intake_options:options}).eq("id",true).select("id").single());}
