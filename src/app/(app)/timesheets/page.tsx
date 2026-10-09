"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { TopBar } from "@/components/layout/AppSidebar";
import { Button } from "@/components/ui/button";
import { WeekGrid } from "@/components/timesheets/WeekGrid";
import { addDays, weekStart } from "@/lib/time/weeks";
import { localToday } from "@/lib/utils";

export default function TimesheetsPage() {
  return <Suspense><Content /></Suspense>;
}

function Content() {
  const params = useSearchParams();
  const week = weekStart(params.get("week") ?? localToday());
  return (
    <div>
      <TopBar title="My timesheet" subtitle={`Week of ${week}`} />
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Link href={`/timesheets?week=${addDays(week, -7)}`}><Button size="sm" variant="outline" aria-label="Previous week"><ChevronLeft className="w-4 h-4" /></Button></Link>
          <Link href={`/timesheets?week=${addDays(week, 7)}`}><Button size="sm" variant="outline" aria-label="Next week"><ChevronRight className="w-4 h-4" /></Button></Link>
          <Link href="/timesheets/approvals" className="ml-auto text-sm text-primary hover:underline">Approvals</Link>
        </div>
        <WeekGrid key={week} weekStart={week} />
      </div>
    </div>
  );
}
