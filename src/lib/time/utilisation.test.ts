import { describe, expect, it } from "vitest";
import { timesheetCompliance, utilisation } from "./utilisation";
import type { StaffWeekHours, TeamMember } from "@/types";

const team = [
  { id: "a", full_name: "Neha", email: "", roles: ["architect"], active: true, weekly_capacity_hours: 45, billable_target_percent: 75 },
  { id: "b", full_name: "Meera", email: "", roles: ["finance"], active: true, weekly_capacity_hours: 0, billable_target_percent: 0 },
  { id: "c", full_name: "Aarav", email: "", roles: ["site_supervisor"], active: true, weekly_capacity_hours: 40, billable_target_percent: 75 },
] as TeamMember[];
const rows: StaffWeekHours[] = [
  { profile_id: "a", week_start: "2026-09-21", total_hours: 45, billable_hours: 36, submitted: true },
  { profile_id: "a", week_start: "2026-09-28", total_hours: 40, billable_hours: 27, submitted: true },
];
const weeks = ["2026-09-21", "2026-09-28"];

describe("utilisation", () => {
  it("computes total and billable utilisation against capacity", () => {
    const neha = utilisation(rows, team, weeks).find((x) => x.name === "Neha");
    expect(neha).toMatchObject({ name: "Neha", capacity: 90, total: 85, billable: 63, totalPct: 94, billablePct: 70, target: 75, gap: -5 });
  });
  it("skips people with no capacity and reports zero-hour people", () => {
    const r = utilisation(rows, team, weeks);
    expect(r.find((x) => x.name === "Meera")).toBeUndefined();
    expect(r.find((x) => x.name === "Aarav")).toMatchObject({ total: 0, billablePct: 0 });
  });
});

describe("timesheetCompliance", () => {
  it("is submitted person-weeks over expected person-weeks", () => {
    expect(timesheetCompliance(rows, team, weeks)).toBe(0.5);   // Neha 2/2, Aarav 0/2
    expect(timesheetCompliance([], [], weeks)).toBeNull();
  });
});
