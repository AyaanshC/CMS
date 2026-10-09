import type { StaffWeekHours, TeamMember } from "@/types";

export interface UtilisationRow {
  profile_id: string; name: string; capacity: number; total: number; billable: number;
  totalPct: number | null; billablePct: number | null; target: number; gap: number | null;
}

const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : null);

export function utilisation(rows: StaffWeekHours[], team: TeamMember[], weeks: string[]): UtilisationRow[] {
  const inRange = rows.filter((r) => weeks.includes(r.week_start));
  return team
    .filter((m) => m.active && m.weekly_capacity_hours > 0)
    .map((m) => {
      const mine = inRange.filter((r) => r.profile_id === m.id);
      const capacity = m.weekly_capacity_hours * weeks.length;
      const total = mine.reduce((s, r) => s + (r.total_hours ?? 0), 0);
      const billable = mine.reduce((s, r) => s + r.billable_hours, 0);
      const billablePct = pct(billable, capacity);
      return {
        profile_id: m.id, name: m.full_name, capacity, total, billable,
        totalPct: pct(total, capacity), billablePct, target: m.billable_target_percent,
        gap: billablePct === null ? null : billablePct - m.billable_target_percent,
      };
    })
    .sort((a, b) => (a.gap ?? 0) - (b.gap ?? 0));
}

export function timesheetCompliance(rows: StaffWeekHours[], team: TeamMember[], weeks: string[]): number | null {
  const people = team.filter((m) => m.active && m.weekly_capacity_hours > 0);
  const expected = people.length * weeks.length;
  if (!expected) return null;
  const done = rows.filter((r) => r.submitted && weeks.includes(r.week_start) && people.some((p) => p.id === r.profile_id)).length;
  return done / expected;
}
