"use client";

import { use, Suspense } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ApprovalPanel } from "@/components/approvals/ApprovalPanel";
import { useAppStore } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";

export default function PortalChangesPage({ params }: { params: Promise<{ slug: string }> }) {
  return <Suspense><Content params={params} /></Suspense>;
}

function Content({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { projects, changeOrders, me, decideChangeOrder } = useAppStore();
  const project = projects.find((p) => p.portal_slug === slug);
  if (!project) return null;
  const list = changeOrders.filter((c) => c.project_id === project.id);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Change orders</h1>
      {list.length === 0 && <p className="text-sm text-muted-foreground">No change orders on this project.</p>}
      {list.map((c) => (
        <div key={c.id} className="space-y-3">
          <Card><CardContent className="p-4">
            <p className="font-semibold">{c.number} · {c.title}</p>
            {c.description && <p className="text-sm text-muted-foreground mt-1">{c.description}</p>}
            <p className="text-sm mt-2">Additional fee: <strong>{formatCurrency(c.fee_impact)}</strong> + GST
              {c.schedule_impact_days ? ` · Adds ${c.schedule_impact_days} days to the schedule` : ""}</p>
            <p className="text-xs text-muted-foreground mt-1 capitalize">Status: {c.status}</p>
          </CardContent></Card>
          {c.status === "submitted" && me.kind === "client" && (
            <ApprovalPanel title={`Approve ${c.number}`} defaultSigner={me.full_name}
              confirmText="I approve this change in scope, fee and schedule."
              onApprove={(signer, note) => decideChangeOrder(c.id, true, signer, note)}
              onReject={(signer, reason) => decideChangeOrder(c.id, false, signer, reason)} />
          )}
        </div>
      ))}
    </div>
  );
}
