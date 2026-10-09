"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NotEnoughData } from "@/components/metrics/NotEnoughData";
import { checklistDone, feeValue, percentTotal } from "@/lib/finance/fees";
import { projectProfitability } from "@/lib/finance/profitability";
import { hasAnyRole } from "@/lib/permissions";
import { useAppStore } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";
import { ENGAGEMENT_LABELS, FEE_BASIS_LABELS, type FeeStage, type FeeStageKind, type Project } from "@/types";
import { FeeSetupDialog } from "./FeeSetupDialog";
import { ProfitabilityCard } from "./ProfitabilityCard";

export default function FeesTab({ project }: { project: Project }) {
  const {
    me,
    feeStages,
    feeTemplates,
    changeOrders,
    invoices,
    projectCosts,
    expenses,
    applyFeeTemplate,
    updateFeeStage,
    completeFeeStage,
    reopenFeeStage,
  } = useAppStore();
  const [setupOpen, setSetupOpen] = useState(false);
  const stages = feeStages.filter((s) => s.project_id === project.id);
  const canEditTerms = hasAnyRole(me, ["owner", "director"]);
  const canSeeFinance = hasAnyRole(me, ["owner", "director", "project_manager", "finance"]);
  const useActual = hasAnyRole(me, ["owner", "finance"]);
  const profit = projectProfitability({
    stages,
    changeOrders: changeOrders.filter((c) => c.project_id === project.id),
    invoices: invoices.filter((i) => i.project_id === project.id),
    costs: projectCosts.filter((c) => c.project_id === project.id),
    expenses: expenses.filter((e) => e.project_id === project.id),
    useActual,
  });
  const kinds: FeeStageKind[] = project.engagement_type === "design_and_execution" ? ["design_fee", "execution"] : ["design_fee"];
  const fee = feeValue(project);

  return (
    <div className="space-y-4">
      {canSeeFinance && <ProfitabilityCard profit={profit} />}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-sm">Fee terms</CardTitle>
          {canEditTerms && <Button size="sm" variant="outline" onClick={() => setSetupOpen(true)}>Edit</Button>}
        </CardHeader>
        <CardContent className="text-sm space-y-1">
          {project.fee_basis ? (
            <>
              <p>{project.engagement_type ? ENGAGEMENT_LABELS[project.engagement_type] : "Engagement not set"} · {FEE_BASIS_LABELS[project.fee_basis]}</p>
              <p>Design fee: <strong>{fee == null ? "—" : formatCurrency(fee)}</strong></p>
            </>
          ) : (
            <NotEnoughData hint={canEditTerms ? "Set the fee terms to start stage billing." : "Ask a director to set the fee terms."} />
          )}
        </CardContent>
      </Card>

      {kinds.map((kind) => {
        const list = stages.filter((s) => s.kind === kind).sort((a, b) => a.sort_order - b.sort_order);
        const total = percentTotal(list);
        const templates = feeTemplates.filter((t) => t.kind === kind);
        return (
          <Card key={kind}>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-sm">{kind === "design_fee" ? "Design fee stages" : "Execution billing schedule"}</CardTitle>
              {list.length > 0 && <Badge variant={total === 100 ? "secondary" : "destructive"}>{total}% of 100%</Badge>}
            </CardHeader>
            <CardContent className="space-y-3">
              {list.length === 0 && (
                <div className="flex flex-wrap gap-2">
                  {templates.map((t) => (
                    <Button key={t.id} size="sm" variant="outline" onClick={() => applyFeeTemplate(project.id, t.id)}>Use “{t.name}”</Button>
                  ))}
                </div>
              )}
              {list.map((s) => (
                <StageRow key={s.id} stage={s}
                  onUpdate={(u) => updateFeeStage(s.id, u)} onComplete={() => completeFeeStage(s.id)} onReopen={() => reopenFeeStage(s.id)} />
              ))}
            </CardContent>
          </Card>
        );
      })}
      <FeeSetupDialog project={project} open={setupOpen} onOpenChange={setSetupOpen} />
    </div>
  );
}

function StageRow({ stage, onUpdate, onComplete, onReopen }: {
  stage: FeeStage; onUpdate: (u: Partial<FeeStage>) => void; onComplete: () => void; onReopen: () => void;
}) {
  const done = stage.status === "complete";
  return (
    <div className="rounded-lg border p-3 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {done && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
          <span className="font-medium text-sm">{stage.name}</span>
          <span className="text-xs text-muted-foreground">{stage.percent}% · {formatCurrency(stage.amount)}</span>
        </div>
        <span className="text-xs text-muted-foreground">Earned {formatCurrency(stage.earned)} · Invoiced {formatCurrency(stage.invoiced)}</span>
      </div>
      {!done && (
        <>
          <div className="flex items-center gap-2 text-xs">
            <label htmlFor={`pc-${stage.id}`}>Complete</label>
            <Input id={`pc-${stage.id}`} type="number" min="0" max="100" className="w-20 h-8" defaultValue={stage.percent_complete}
              onBlur={(e) => onUpdate({ percent_complete: Number(e.target.value), status: Number(e.target.value) > 0 ? "in_progress" : "not_started" })} />
            <span>%</span>
          </div>
          <ul className="space-y-1">
            {stage.checklist.map((c, i) => (
              <li key={i}>
                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" checked={c.done}
                    onChange={(e) => onUpdate({ checklist: stage.checklist.map((x, j) => (j === i ? { ...x, done: e.target.checked } : x)) })} />
                  {c.label}
                </label>
              </li>
            ))}
          </ul>
          <Button size="sm" disabled={!checklistDone(stage.checklist)} onClick={onComplete}>Mark stage complete</Button>
        </>
      )}
      {done && stage.invoiced === 0 && <Button size="sm" variant="ghost" onClick={onReopen}>Reopen</Button>}
    </div>
  );
}
