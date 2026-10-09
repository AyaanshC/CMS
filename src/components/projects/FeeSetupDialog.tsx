"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { feeValue } from "@/lib/finance/fees";
import { useAppStore } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";
import { ENGAGEMENT_LABELS, FEE_BASIS_LABELS, type Discipline, type EngagementType, type FeeBasis, type Project } from "@/types";

const sel = "w-full h-9 rounded-md border border-input bg-background px-3 text-sm";

export function FeeSetupDialog({ project, open, onOpenChange }: { project: Project; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { setFeeTerms } = useAppStore();
  const [t, setT] = useState({
    engagement_type: project.engagement_type ?? "design_only",
    discipline: project.discipline ?? "architecture",
    fee_basis: project.fee_basis ?? "percent_of_cost",
    fee_rate: project.fee_rate?.toString() ?? "",
    fee_amount: project.fee_amount?.toString() ?? "",
    estimated_construction_cost: project.estimated_construction_cost?.toString() ?? "",
  });
  const num = (v: string) => (v === "" ? undefined : Number(v));
  const preview = feeValue({ fee_basis: t.fee_basis as FeeBasis, fee_rate: num(t.fee_rate), fee_amount: num(t.fee_amount),
    estimated_construction_cost: num(t.estimated_construction_cost), area_sqft: project.area_sqft });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const r = await setFeeTerms(project.id, {
      engagement_type: t.engagement_type as EngagementType, discipline: t.discipline as Discipline, fee_basis: t.fee_basis as FeeBasis,
      fee_rate: num(t.fee_rate), fee_amount: num(t.fee_amount), estimated_construction_cost: num(t.estimated_construction_cost),
    });
    if (r.ok) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Fee terms</DialogTitle></DialogHeader>
        <form onSubmit={save} className="space-y-3">
          <div className="space-y-1"><Label htmlFor="fs-eng">Engagement</Label>
            <select id="fs-eng" className={sel} value={t.engagement_type} onChange={(e) => setT({ ...t, engagement_type: e.target.value as EngagementType })}>
              {Object.entries(ENGAGEMENT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select></div>
          <div className="space-y-1"><Label htmlFor="fs-disc">Discipline</Label>
            <select id="fs-disc" className={sel} value={t.discipline} onChange={(e) => setT({ ...t, discipline: e.target.value as Discipline })}>
              <option value="architecture">Architecture</option><option value="interiors">Interiors</option><option value="both">Architecture + interiors</option>
            </select></div>
          <div className="space-y-1"><Label htmlFor="fs-basis">Fee basis</Label>
            <select id="fs-basis" className={sel} value={t.fee_basis} onChange={(e) => setT({ ...t, fee_basis: e.target.value as FeeBasis })}>
              {Object.entries(FEE_BASIS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select></div>
          {t.fee_basis !== "lump_sum" && (
            <div className="space-y-1"><Label htmlFor="fs-rate">{t.fee_basis === "percent_of_cost" ? "Fee %" : t.fee_basis === "per_sqft" ? "₹ per sqft" : "₹ per hour"}</Label>
              <Input id="fs-rate" type="number" min="0" step="0.01" value={t.fee_rate} onChange={(e) => setT({ ...t, fee_rate: e.target.value })} /></div>
          )}
          {t.fee_basis === "percent_of_cost" && (
            <div className="space-y-1"><Label htmlFor="fs-cost">Estimated construction cost (₹)</Label>
              <Input id="fs-cost" type="number" min="0" value={t.estimated_construction_cost} onChange={(e) => setT({ ...t, estimated_construction_cost: e.target.value })} /></div>
          )}
          {t.fee_basis === "lump_sum" && (
            <div className="space-y-1"><Label htmlFor="fs-amt">Lump-sum fee (₹)</Label>
              <Input id="fs-amt" type="number" min="0" value={t.fee_amount} onChange={(e) => setT({ ...t, fee_amount: e.target.value })} /></div>
          )}
          <p className="text-sm">Design fee: <strong>{preview == null ? (t.fee_basis === "hourly" ? "billed from timesheets" : "—") : formatCurrency(preview)}</strong></p>
          {t.engagement_type === "design_and_execution" && (
            <p className="text-xs text-muted-foreground">Bill the design fee through fee stages and keep the BOQ designer fee at ₹0, otherwise the fee is charged twice.</p>
          )}
          <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit">Save</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
