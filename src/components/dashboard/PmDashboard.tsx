"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { checklistDone } from "@/lib/finance/fees";
import { portfolioRows } from "@/lib/metrics/portfolio";
import { useAppStore } from "@/lib/store";
import { formatDate, localToday } from "@/lib/utils";
import { RiskTable } from "./RiskTable";

export function PmDashboard() {
  const s = useAppStore();
  const today = localToday();
  const mine = s.projects.filter((p) => p.manager_id === s.me.id);
  const ids = new Set(mine.map((p) => p.id));
  const readyToBill = s.feeStages.filter((st) => ids.has(st.project_id) && st.status !== "complete" && st.checklist.length > 0 && checklistDone(st.checklist));
  const toApprove = s.timesheetEntries.filter((e) => e.status === "submitted" && e.project_id && ids.has(e.project_id) && e.profile_id !== s.me.id).length;
  const deadlines = mine.flatMap((p) => (p.milestones ?? []).filter((m) => !m.completed_at && m.due_date).map((m) => ({ ...m, project: p.name })))
    .sort((a, b) => a.due_date!.localeCompare(b.due_date!)).slice(0, 6);
  const burning = portfolioRows({ ...s, projects: mine }, today, false).flatMap((r) => r.profit.stages.filter((x) => x.overBurn).map((x) => ({ ...x, project: r.project })));

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-3 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Stages ready to complete</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">{readyToBill.length === 0 ? <p className="text-muted-foreground">None</p> :
            readyToBill.map((st) => <p key={st.id}><Link className="hover:underline" href={`/projects/${st.project_id}`}>{st.name}</Link></p>)}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Timesheets to approve</CardTitle></CardHeader>
          <CardContent><Link href="/timesheets/approvals" className="text-2xl font-bold hover:underline">{toApprove}</Link></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Stages burning ahead of progress</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">{burning.length === 0 ? <p className="text-muted-foreground">None</p> :
            burning.map((b) => <p key={b.id} className="text-red-600">{b.project.name} · {b.name}: {b.burnPct}% burn at {b.percentComplete}%</p>)}</CardContent></Card>
      </div>
      <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Upcoming deadlines</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-1">{deadlines.map((d) => (
          <p key={d.id} className={d.due_date! < today ? "text-red-600" : ""}>{formatDate(d.due_date!)} · {d.project} · {d.title}</p>
        ))}</CardContent></Card>
      <RiskTable rows={portfolioRows({ ...s, projects: mine }, today, false)} title="My projects by risk" />
    </div>
  );
}
