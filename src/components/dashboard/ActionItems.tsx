"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppStore } from "@/lib/store";
import { formatRelativeTime } from "@/lib/utils";

// Alerts addressed to me that need an action; they leave the list only when acknowledged.
export function ActionItems() {
  const { alerts, acknowledgeAlert } = useAppStore();
  if (alerts.length === 0) return null;
  return (
    <Card className="border-amber-200">
      <CardHeader className="pb-2"><CardTitle className="text-base">Action items ({alerts.length})</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {alerts.map((a) => (
          <div key={a.id} className="flex items-start justify-between gap-3 border-b last:border-0 pb-2">
            <div>
              <p className="text-sm font-medium">{a.link ? <Link href={a.link} className="hover:underline">{a.title}</Link> : a.title}</p>
              <p className="text-xs text-muted-foreground">{a.body} · {formatRelativeTime(a.created_at)}</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => acknowledgeAlert(a.id)}>Done</Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
