"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { weekStart } from "@/lib/time/weeks";
import { useAppStore } from "@/lib/store";
import { ACTIVITY_LABELS } from "@/types";

export function ApprovalList() {
  const { me, timesheetEntries, projects, decideTimesheetEntries } = useAppStore();
  const [notes, setNotes] = useState<Record<string, string>>({});

  // Mirror of can_approve_entry(): the database re-checks every id.
  const canApprove = (projectId?: string, authorId?: string) => {
    if (!projectId || authorId === me.id) return false;
    if (me.roles.includes("owner")) return true;
    const p = projects.find((x) => x.id === projectId);
    return !!p && (p.manager_id === me.id || (p.director_id === me.id && (!p.manager_id || p.manager_id === authorId)));
  };

  const pending = timesheetEntries.filter((e) => e.status === "submitted" && canApprove(e.project_id, e.profile_id));
  const groups = new Map<string, typeof pending>();
  for (const e of pending) {
    const k = `${e.profile_id}|${weekStart(e.work_date)}`;
    groups.set(k, [...(groups.get(k) ?? []), e]);
  }

  if (groups.size === 0) return <p className="text-sm text-muted-foreground">Nothing waiting for your approval.</p>;

  return (
    <div className="space-y-3">
      {[...groups.entries()].map(([k, entries]) => {
        const [, week] = k.split("|");
        const total = entries.reduce((s, e) => s + e.hours, 0);
        const ids = entries.map((e) => e.id);
        return (
          <Card key={k}>
            <CardContent className="p-4 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-sm">{entries[0].profile_name} · week of {week} · {total}h</p>
                <div className="flex items-center gap-2">
                  <Input aria-label="Reason for sending back" placeholder="Reason (to send back)" className="h-8 w-56" value={notes[k] ?? ""} onChange={(e) => setNotes({ ...notes, [k]: e.target.value })} />
                  <Button size="sm" variant="outline" disabled={!notes[k]?.trim()} onClick={() => decideTimesheetEntries(ids, false, notes[k])}>Send back</Button>
                  <Button size="sm" onClick={() => decideTimesheetEntries(ids, true)}>Approve</Button>
                </div>
              </div>
              <table className="w-full text-xs">
                <tbody>
                  {entries.map((e) => (
                    <tr key={e.id} className="border-t">
                      <td className="py-1">{e.work_date}</td><td>{e.project_name}</td><td>{ACTIVITY_LABELS[e.activity]}</td>
                      <td className="text-right">{e.hours}h{e.billable ? "" : " (non-billable)"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
