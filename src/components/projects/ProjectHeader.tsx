"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  MapPin, Calendar, Ruler, ChevronRight, CheckCircle2,
  ExternalLink, AlertTriangle, Clock
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import {
  formatCurrency, formatDate, getStatusColor, cn, isOverdue
} from "@/lib/utils";
import {
  PROJECT_STAGES, PROJECT_STAGE_LABELS, ProjectStatus, type Project
} from "@/types";

const STAGE_DOT_COLORS: Record<ProjectStatus, string> = {
  lead: "bg-slate-400",
  consultation: "bg-blue-400",
  design: "bg-violet-500",
  boq_approval: "bg-amber-400",
  execution: "bg-indigo-500",
  snag: "bg-orange-500",
  handover: "bg-teal-500",
  closed: "bg-green-500",
};

export default function ProjectHeader({
  project,
  openSnags,
  totalInvoiced,
  totalPaid,
}: {
  project: Project;
  openSnags: number;
  totalInvoiced: number;
  totalPaid: number;
}) {
  const { advanceProjectStage } = useAppStore();
  const [stageConfirmModalOpen, setStageConfirmModalOpen] = useState(false);
  const [targetStage, setTargetStage] = useState<ProjectStatus | null>(null);

  const currentStageIndex = PROJECT_STAGES.indexOf(project.status);

  const handleStageClick = (stage: ProjectStatus) => {
    setTargetStage(stage);
    setStageConfirmModalOpen(true);
  };

  const handleConfirmStage = () => {
    if (targetStage) {
      advanceProjectStage(project.id, targetStage);
    }
    setStageConfirmModalOpen(false);
  };

  return (
    <>
      <Card>
        <CardContent className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex-1 min-w-[300px]">
              <div className="flex items-center gap-3 mb-3">
                <Badge className={cn("border-0 text-xs px-2 py-0.5", getStatusColor(project.status))}>
                  {PROJECT_STAGE_LABELS[project.status]}
                </Badge>
                <span className="text-sm text-muted-foreground">{project.reference_number}</span>
                {openSnags > 0 && (
                  <Badge variant="destructive" className="gap-1 text-[11px]">
                    <AlertTriangle className="w-3 h-3" />
                    {openSnags} open snags
                  </Badge>
                )}
              </div>

              {/* Interactive Stage Pipeline */}
              <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-1">
                {PROJECT_STAGES.map((stage, idx) => {
                  const isPast = idx < currentStageIndex;
                  const isCurrent = idx === currentStageIndex;
                  const isFuture = idx > currentStageIndex;
                  return (
                    <div key={stage} className="flex items-center">
                      <button
                        onClick={() => handleStageClick(stage)}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer border border-transparent",
                          isCurrent ? "bg-primary text-white shadow-sm font-bold" : "",
                          isPast ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "",
                          isFuture ? "bg-muted text-muted-foreground hover:bg-muted/80" : ""
                        )}
                        title="Click to advance stage"
                      >
                        {isPast ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : (
                          <div className={cn("w-2 h-2 rounded-full", isCurrent ? "bg-white" : STAGE_DOT_COLORS[stage])} />
                        )}
                        {PROJECT_STAGE_LABELS[stage]}
                      </button>
                      {idx < PROJECT_STAGES.length - 1 && (
                        <ChevronRight className="w-3 h-3 text-muted-foreground/40 mx-0.5" />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Progress bar */}
              <div className="flex items-center gap-3 mb-3">
                <Progress value={project.progress_percent} className="h-2 flex-1" />
                <span className="text-sm font-semibold text-foreground w-10">{project.progress_percent}%</span>
              </div>

              {/* Meta info */}
              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                {project.property_address && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    {project.property_address}
                  </div>
                )}
                {project.area_sqft && (
                  <div className="flex items-center gap-1.5">
                    <Ruler className="w-3.5 h-3.5" />
                    {project.area_sqft} sqft
                  </div>
                )}
                {project.start_date && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    Started {formatDate(project.start_date)}
                  </div>
                )}
                {project.estimated_end_date && (
                  <div className={cn("flex items-center gap-1.5", isOverdue(project.estimated_end_date) ? "text-red-500 font-medium" : "")}>
                    <Clock className="w-3.5 h-3.5" />
                    Target {formatDate(project.estimated_end_date)}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link href={`/portal/${project.portal_slug}`} target="_blank">
                <Button variant="outline" size="sm" className="gap-2 text-xs">
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open Client Portal
                </Button>
              </Link>
            </div>
          </div>

          {/* Financial summary metrics bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-border">
            <div className="text-center">
              <p className="text-lg font-bold text-foreground">{project.total_budget ? formatCurrency(project.total_budget) : "—"}</p>
              <p className="text-[11px] text-muted-foreground">Total Budget</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-indigo-600">{formatCurrency(totalInvoiced)}</p>
              <p className="text-[11px] text-muted-foreground">Total Invoiced</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-emerald-600">{formatCurrency(totalPaid)}</p>
              <p className="text-[11px] text-muted-foreground">Collected</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-amber-600">{formatCurrency(Math.max(0, totalInvoiced - totalPaid))}</p>
              <p className="text-[11px] text-muted-foreground">Outstanding</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* MODAL: Stage Confirmation */}
      <Dialog open={stageConfirmModalOpen} onOpenChange={setStageConfirmModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Advance Project Stage</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-xs text-muted-foreground">
            <p>
              Are you sure you want to transition <strong>{project.name}</strong> from{" "}
              <span className="font-semibold text-foreground">{PROJECT_STAGE_LABELS[project.status]}</span> to{" "}
              <span className="font-semibold text-primary">{targetStage ? PROJECT_STAGE_LABELS[targetStage] : ""}</span>?
            </p>
            <p className="p-3 bg-muted/40 rounded-lg">
              This action will permanently log a timestamped stage transition event in the project audit history and notify the client on their portal.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStageConfirmModalOpen(false)}>Cancel</Button>
            <Button onClick={handleConfirmStage} className="gradient-primary border-0">Confirm Advance</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
