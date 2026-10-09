"use server";
import { mutate } from "@/lib/actions/mutate";
import { timesheetDecisionInput, timesheetWeekInput, weekInput } from "@/lib/actions/schemas";

export async function saveTimesheetWeek(input: unknown) {
  return mutate(timesheetWeekInput, input, (d, db) => db.rpc("save_timesheet_week", { p_week: d.week_start, p_rows: d.rows }));
}

export async function submitTimesheetWeek(input: unknown) {
  return mutate(weekInput, input, (d, db) => db.rpc("submit_timesheet_week", { p_week: d.week_start }));
}

export async function decideTimesheetEntries(input: unknown) {
  return mutate(timesheetDecisionInput, input, (d, db) =>
    db.rpc("decide_timesheet_entries", { p_ids: d.ids, p_approve: d.approve, p_note: d.note ?? "" }));
}
