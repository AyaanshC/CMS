"use server";
import { mutate } from "@/lib/actions/mutate";
import { costRateInput, rateBandInput, riskSettingsInput, staffTermsInput } from "@/lib/actions/schemas";

export async function setStaffTerms(input: unknown) {
  return mutate(staffTermsInput, input, ({ id, ...d }, db) => db.from("profiles").update(d).eq("id", id).select("id").single());
}

export async function upsertRateBand(input: unknown) {
  return mutate(rateBandInput, input, (d, db) => db.from("rate_bands").upsert(d).select("id").single());
}

export async function addCostRate(input: unknown) {
  return mutate(costRateInput, input, (d, db) =>
    db.from("staff_cost_rates").upsert(d, { onConflict: "profile_id,effective_from" }).select("id").single());
}

export async function updateRiskSettings(input: unknown) {
  return mutate(riskSettingsInput, input, (d, db) => db.from("firm_settings").update(d).eq("id", true).select("id").single());
}
