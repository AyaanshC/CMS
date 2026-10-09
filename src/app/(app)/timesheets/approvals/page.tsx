"use client";

import { TopBar } from "@/components/layout/AppSidebar";
import { ApprovalList } from "@/components/timesheets/ApprovalList";

export default function ApprovalsPage() {
  return (
    <div>
      <TopBar title="Timesheet approvals" subtitle="Time logged on projects you manage" />
      <div className="p-6"><ApprovalList /></div>
    </div>
  );
}
