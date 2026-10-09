"use server";
import { z } from "zod";
import { createServerSupabase } from "@/lib/supabase/server";

const onboardingInput = z.object({
  full_name: z.string().trim().min(1).max(120),
  phone: z.string().trim().min(6).max(30),
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
  const db = await createServerSupabase(); // signed-out visitors use the anon key
  const { data, error } = await db.rpc("submit_onboarding", { p: parsed.data });
  if (error) return { ok: false, error: error.message };
  return { ok: true, reference: data };
}
