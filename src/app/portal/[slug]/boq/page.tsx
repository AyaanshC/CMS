"use client";

import { useState } from "react";
import { use, Suspense } from "react";
import { useAppStore } from "@/lib/store";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ApprovalPanel } from "@/components/approvals/ApprovalPanel";
import {
  XCircle, FileText, Download, ChevronDown, ChevronRight,
  ShieldCheck, AlertCircle,
} from "lucide-react";

export default function PortalBOQPage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading BOQ...</div>}>
      <PortalBOQContent params={params} />
    </Suspense>
  );
}

function PortalBOQContent({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { projects, boqs, clients, studioSettings, approveBOQVersion, rejectBOQVersion } = useAppStore();

  const project = projects.find((p) => p.portal_slug === slug);
  const client = clients.find((c) => c.id === project?.client_id);
  const projectBOQs = boqs.filter((b) => b.project_id === project?.id);
  // Pick active or latest submitted BOQ
  const activeBOQ = projectBOQs.find((b) => b.is_active) || projectBOQs[0];

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    sec_1: true,
    sec_2: true,
    sec_3: true,
  });

  if (!project) {
    return <div className="p-8 text-center text-muted-foreground">Project not found.</div>;
  }

  if (!activeBOQ) {
    return (
      <div className="text-center py-16 bg-white rounded-2xl border border-border p-8 shadow-sm">
        <FileText className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-foreground">No BOQ Published Yet</h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
          Your interior designer is currently finalizing the Bill of Quantities. It will appear here once submitted for your review.
        </p>
      </div>
    );
  }

  const toggleSection = (secId: string) => {
    setExpandedSections((prev) => ({ ...prev, [secId]: !prev[secId] }));
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-foreground">Bill of Quantities (BOQ)</h1>
            <Badge variant="outline" className="text-xs font-semibold">
              v{activeBOQ.version_number}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Detailed room-wise breakdown of materials, carpentry, and finishes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5">
            <Download className="w-4 h-4" />
            Print / Save PDF
          </Button>
        </div>
      </div>

      {/* Status Alert Banner */}
      {activeBOQ.status === "approved" ? (
        <Card className="border-emerald-200 bg-emerald-50/70 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-emerald-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-emerald-900">
                BOQ Approved by {activeBOQ.approved_by || client?.full_name || "Client"}
              </p>
              <p className="text-xs text-emerald-700">
                Approved on {activeBOQ.approved_at ? formatDate(activeBOQ.approved_at) : "recently"}. Procurement is underway.
              </p>
            </div>
            <Badge className="bg-emerald-600 text-white border-0 text-xs">Approved</Badge>
          </CardContent>
        </Card>
      ) : activeBOQ.status === "submitted" ? (
        <ApprovalPanel
          title="Approve this estimate"
          confirmText="I confirm that I have reviewed the items, quantities and rates in this estimate and approve them for site execution."
          defaultSigner={client?.full_name ?? ""}
          onApprove={(signer, note) => approveBOQVersion(activeBOQ.id, signer, note)}
          onReject={(signer, reason) => rejectBOQVersion(activeBOQ.id, signer, reason)}
        />
      ) : activeBOQ.status === "rejected" ? (
        <Card className="border-red-200 bg-red-50/70 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <XCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-900">Revision Requested</p>
              <p className="text-xs text-red-700">
                Your feedback has been sent to the design team. An updated version will be uploaded soon.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground">Items & Fee Subtotal</p>
            <p className="text-2xl font-bold text-foreground mt-1">
              {formatCurrency(Math.round(activeBOQ.grand_total / (1 + (activeBOQ.gst_percent || 18) / 100)))}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Excluding GST ({activeBOQ.gst_percent || studioSettings.gst_rate}%)</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground">GST Amount ({activeBOQ.gst_percent || studioSettings.gst_rate}%)</p>
            <p className="text-2xl font-bold text-slate-700 mt-1">
              {formatCurrency(activeBOQ.grand_total - Math.round(activeBOQ.grand_total / (1 + (activeBOQ.gst_percent || 18) / 100)))}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Applicable tax</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm bg-slate-900 text-white">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-slate-400">Total Payable Value</p>
            <p className="text-2xl font-bold text-white mt-1">
              {formatCurrency(activeBOQ.grand_total)}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Inclusive of GST</p>
          </CardContent>
        </Card>
      </div>

      {/* Room-wise Sections Accordion */}
      <div className="space-y-4">
        {activeBOQ.sections.map((section) => {
          const isExpanded = expandedSections[section.id] ?? true;
          return (
            <Card key={section.id} className="shadow-sm overflow-hidden border border-border">
              <button
                type="button"
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center justify-between p-4 bg-slate-50/70 hover:bg-slate-100/80 transition-colors text-left"
              >
                <div className="flex items-center gap-2">
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  )}
                  <h3 className="font-semibold text-foreground text-base">{section.name}</h3>
                  <Badge variant="secondary" className="text-xs font-normal ml-2">
                    {section.items.length} items
                  </Badge>
                </div>
                <div className="text-right">
                  <span className="font-bold text-foreground">
                    {formatCurrency(section.subtotal)}
                  </span>
                </div>
              </button>

              {isExpanded && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-white text-muted-foreground text-xs uppercase tracking-wider">
                        <th className="py-2.5 px-4 text-left font-medium">Item & Description</th>
                        <th className="py-2.5 px-4 text-center font-medium">Qty</th>
                        <th className="py-2.5 px-4 text-center font-medium">Unit</th>
                        <th className="py-2.5 px-4 text-right font-medium">Rate</th>
                        <th className="py-2.5 px-4 text-right font-medium">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-white">
                      {section.items.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/50">
                          <td className="py-3 px-4">
                            <p className="font-medium text-foreground">{item.description}</p>
                            {item.specifications && (
                              <p className="text-xs text-muted-foreground mt-0.5 max-w-lg leading-relaxed">
                                {item.specifications}
                              </p>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center font-medium">{item.quantity}</td>
                          <td className="py-3 px-4 text-center text-muted-foreground text-xs">{item.unit}</td>
                          <td className="py-3 px-4 text-right text-muted-foreground">
                            {formatCurrency(item.unit_rate || 0)}
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-foreground">
                            {formatCurrency(item.total || 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
