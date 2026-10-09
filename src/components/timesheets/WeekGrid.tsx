"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { addDays, weekDays } from "@/lib/time/weeks";
import { useAppStore, type WeekRow } from "@/lib/store";
import { ACTIVITY_LABELS, NON_PROJECT_ACTIVITIES, type TimesheetActivity, type TimesheetEntry } from "@/types";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const cell = "w-14 h-8 rounded border border-input bg-background text-right px-1 text-sm";

const keyOf = (e: Pick<TimesheetEntry, "project_id" | "fee_stage_id" | "activity">) => `${e.project_id ?? ""}|${e.fee_stage_id ?? ""}|${e.activity}`;

// Rows for a week: editable drafts/rejected; prefilled from last week's rows when empty.
function rowsFor(entries: TimesheetEntry[], days: string[]): WeekRow[] {
  const map = new Map<string, WeekRow>();
  for (const e of entries) {
    const i = days.indexOf(e.work_date);
    if (i < 0) continue;
    const k = keyOf(e);
    const row = map.get(k) ?? { project_id: e.project_id ?? null, fee_stage_id: e.fee_stage_id ?? null, activity: e.activity, billable: e.billable, hours: [0, 0, 0, 0, 0, 0, 0] };
    row.hours[i] += e.hours;
    map.set(k, row);
  }
  return [...map.values()];
}

export function WeekGrid({ weekStart }: { weekStart: string }) {
  const { me, timesheetEntries, projects, feeStages, saveTimesheetWeek, submitTimesheetWeek } = useAppStore();
  const days = weekDays(weekStart);
  const mine = timesheetEntries.filter((e) => e.profile_id === me.id);
  const thisWeek = mine.filter((e) => days.includes(e.work_date));
  const locked = thisWeek.filter((e) => e.status === "submitted" || e.status === "approved");
  const rejected = thisWeek.filter((e) => e.status === "rejected");
  const editable = thisWeek.filter((e) => e.status === "draft" || e.status === "rejected");

  // Computed once per week (the page keys this component by week).
  const [rows, setRows] = useState<WeekRow[]>(() => {
    if (editable.length) return rowsFor(editable, days);
    if (locked.length) return [];
    const prev = weekDays(addDays(weekStart, -7));
    return rowsFor(mine.filter((e) => prev.includes(e.work_date)), prev).map((r) => ({ ...r, hours: [0, 0, 0, 0, 0, 0, 0] }));
  });
  const [busy, setBusy] = useState(false);

  const myProjects = projects.filter((p) => p.status !== "closed");
  const setRow = (i: number, patch: Partial<WeekRow>) => setRows(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const dayTotal = (d: number) => rows.reduce((s, r) => s + (Number(r.hours[d]) || 0), 0) + locked.filter((e) => e.work_date === days[d]).reduce((s, e) => s + e.hours, 0);
  const weekTotal = DAY_LABELS.reduce((s, _, d) => s + dayTotal(d), 0);

  async function save(andSubmit: boolean) {
    setBusy(true);
    const clean = rows.filter((r) => r.hours.some((h) => Number(h) > 0));
    const r = await saveTimesheetWeek(weekStart, clean);
    if (r.ok && andSubmit) await submitTimesheetWeek(weekStart);
    setBusy(false);
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-3 overflow-x-auto">
        {rejected[0]?.decision_note && (
          <p className="text-sm text-red-600">Sent back: “{rejected[0].decision_note}”. Fix and resubmit.</p>
        )}
        {locked.length > 0 && <p className="text-xs text-muted-foreground">{locked.length} entries already submitted or approved for this week (read-only).</p>}
        <table className="text-sm">
          <thead>
            <tr className="text-xs text-muted-foreground">
              <th className="text-left pr-2">Project / stage</th><th className="text-left pr-2">Activity</th><th className="pr-2">Billable</th>
              {DAY_LABELS.map((d, i) => <th key={d} className="px-1">{d}<br />{days[i].slice(8)}</th>)}<th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const stages = feeStages.filter((s) => s.project_id === r.project_id && s.status !== "complete");
              return (
                <tr key={i}>
                  <td className="pr-2 py-1">
                    <select aria-label="Project" className="h-8 rounded border border-input bg-background text-sm max-w-48" value={r.project_id ?? ""}
                      onChange={(e) => setRow(i, { project_id: e.target.value || null, fee_stage_id: null, billable: !!e.target.value })}>
                      <option value="">Non-project</option>
                      {myProjects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    {r.project_id && (
                      <select aria-label="Stage" className="h-8 ml-1 rounded border border-input bg-background text-sm max-w-40" value={r.fee_stage_id ?? ""}
                        onChange={(e) => setRow(i, { fee_stage_id: e.target.value || null })}>
                        <option value="">No stage</option>
                        {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    )}
                  </td>
                  <td className="pr-2">
                    <select aria-label="Activity" className="h-8 rounded border border-input bg-background text-sm" value={r.activity}
                      onChange={(e) => {
                        const activity = e.target.value as TimesheetActivity;
                        setRow(i, { activity, billable: r.project_id ? !NON_PROJECT_ACTIVITIES.includes(activity) : false });
                      }}>
                      {Object.entries(ACTIVITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </td>
                  <td className="text-center"><input aria-label="Billable" type="checkbox" disabled={!r.project_id} checked={r.billable} onChange={(e) => setRow(i, { billable: e.target.checked })} /></td>
                  {DAY_LABELS.map((d, di) => (
                    <td key={d} className="px-1">
                      <input aria-label={`${d} hours`} className={cell} type="number" min="0" max="24" step="0.5" value={r.hours[di] || ""}
                        onChange={(e) => setRow(i, { hours: r.hours.map((h, k) => (k === di ? Number(e.target.value) : h)) })} />
                    </td>
                  ))}
                  <td><button aria-label="Remove row" onClick={() => setRows(rows.filter((_, j) => j !== i))} className="p-1 text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button></td>
                </tr>
              );
            })}
            <tr className="font-semibold">
              <td colSpan={3} className="text-right pr-2">Total</td>
              {DAY_LABELS.map((d, di) => <td key={d} className={`px-1 text-right ${dayTotal(di) > 24 ? "text-red-600" : ""}`}>{dayTotal(di) || ""}</td>)}
              <td className="pl-2">{weekTotal}h</td>
            </tr>
          </tbody>
        </table>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setRows([...rows, { project_id: null, fee_stage_id: null, activity: "design", billable: false, hours: [0, 0, 0, 0, 0, 0, 0] }])}>
            <Plus className="w-4 h-4" /> Add row
          </Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => save(false)}>Save draft</Button>
          <Button size="sm" disabled={busy || rows.length === 0} onClick={() => save(true)}>Submit week</Button>
          <Badge variant="secondary">{weekTotal}h logged this week</Badge>
        </div>
      </CardContent>
    </Card>
  );
}
