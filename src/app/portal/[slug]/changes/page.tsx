"use client";

import { BrandLoader } from "@/components/brand/BrandLoader";
import { use, Suspense } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ApprovalPanel } from "@/components/approvals/ApprovalPanel";
import { useAppStore } from "@/lib/store";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function PortalChangesPage({ params }: { params: Promise<{ slug: string }> }) {
  return <Suspense fallback={<BrandLoader label="Preparing your project" />}><Content params={params} /></Suspense>;
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
            {c.decided_at && <div className="mt-4 rounded-lg border border-primary/15 bg-accent/40 p-3"><p className="text-sm font-medium">{c.status === "approved" ? "Approval recorded" : "Feedback recorded"}{c.decided_by ? ` · ${c.decided_by}` : ""}</p><p className="mt-1 text-xs text-muted-foreground">{formatDate(c.decided_at)}</p>{c.decision_note && <p className="mt-2 text-sm text-muted-foreground">{c.decision_note}</p>}</div>}
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
