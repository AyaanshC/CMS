"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAppStore } from "@/lib/store";
import { weekDays, weekStart } from "@/lib/time/weeks";
import { formatShortDate, localToday } from "@/lib/utils";

export function MyWeekDashboard() {
  const { me, team, timesheetEntries, tasks } = useAppStore();
  const today = localToday();
  const days = weekDays(weekStart(today));
  const capacity = team.find((m) => m.id === me.id)?.weekly_capacity_hours ?? 45;
  const logged = timesheetEntries.filter((e) => e.profile_id === me.id && days.includes(e.work_date)).reduce((s, e) => s + e.hours, 0);
  const myTasks = tasks.filter((t) => t.assigned_to === me.id && t.status !== "done").sort((a, b) => (a.due_date ?? "9").localeCompare(b.due_date ?? "9")).slice(0, 8);

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card><CardHeader className="pb-2"><CardTitle className="text-sm">This week</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <p className="text-2xl font-bold">{logged}h <span className="text-sm font-normal text-muted-foreground">of {capacity}h</span></p>
          <Progress value={Math.min(100, (logged / capacity) * 100)} />
          <Link href="/timesheets"><Button size="sm" variant="outline">Open timesheet</Button></Link>
        </CardContent></Card>
      <Card><CardHeader className="pb-2"><CardTitle className="text-sm">My tasks</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm">{myTasks.length === 0 ? <p className="text-muted-foreground">No open tasks.</p> : myTasks.map((t) => (
          <p key={t.id} className={t.due_date && t.due_date < today ? "text-red-600" : ""}>{t.title} · {t.project_name}{t.due_date ? ` · ${formatShortDate(t.due_date)}` : ""}</p>
        ))}</CardContent></Card>
    </div>
  );
}
