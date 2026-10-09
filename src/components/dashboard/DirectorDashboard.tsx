"use client";

import { useAppStore } from "@/lib/store";
import { portfolioRows } from "@/lib/metrics/portfolio";
import { addDays, weekStart } from "@/lib/time/weeks";
import { utilisation } from "@/lib/time/utilisation";
import { localToday } from "@/lib/utils";
import { RiskTable } from "./RiskTable";
import { UtilisationTable } from "./UtilisationTable";

export function DirectorDashboard() {
  const s = useAppStore();
  const today = localToday();
  const mine = s.projects.filter((p) => p.director_id === s.me.id);
  const rows = portfolioRows({ ...s, projects: mine }, today, false);
  const teamIds = new Set(mine.flatMap((p) => [p.manager_id, ...(p.team ?? []).map((t) => t.profile_id)]).filter(Boolean));
  const weeks = Array.from({ length: 4 }, (_, i) => addDays(weekStart(today), -7 * (i + 1)));
  return (
    <div className="space-y-6">
      <RiskTable rows={rows} title="My portfolio by risk" />
      <UtilisationTable rows={utilisation(s.staffWeekHours, s.team.filter((m) => teamIds.has(m.id)), weeks)} weeks={4} />
    </div>
  );
}
