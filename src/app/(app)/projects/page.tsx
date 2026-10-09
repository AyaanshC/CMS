"use client";

import { useState } from "react";
import { TopBar } from "@/components/layout/AppSidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Search, Plus, LayoutGrid, List, Calendar, Filter,
  FolderKanban, Clock, AlertCircle, IndianRupee,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { formatCurrency, getStatusColor, formatShortDate, isOverdue, cn } from "@/lib/utils";
import Link from "next/link";
import { PROJECT_STAGES, PROJECT_STAGE_LABELS, ProjectStatus, type Project } from "@/types";
import { NewProjectDialog } from "@/components/projects/NewProjectDialog";

type View = "kanban" | "list";

const STAGE_COLORS: Record<ProjectStatus, string> = {
  lead: "border-slate-300",
  consultation: "border-blue-300",
  design: "border-violet-300",
  boq_approval: "border-amber-300",
  execution: "border-indigo-400",
  snag: "border-orange-400",
  handover: "border-teal-400",
  closed: "border-green-400",
};

const STAGE_HEADER_COLORS: Record<ProjectStatus, string> = {
  lead: "bg-slate-50 text-slate-600",
  consultation: "bg-blue-50 text-blue-700",
  design: "bg-violet-50 text-violet-700",
  boq_approval: "bg-amber-50 text-amber-700",
  execution: "bg-indigo-50 text-indigo-700",
  snag: "bg-orange-50 text-orange-700",
  handover: "bg-teal-50 text-teal-700",
  closed: "bg-green-50 text-green-700",
};

function ProjectCard({ project }: { project: Project }) {
  const overdue = project.estimated_end_date && isOverdue(project.estimated_end_date);
  return (
    <Link href={`/projects/${project.id}`}>
      <div className={cn("bg-card border-l-4 rounded-xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer mb-3 card-hover", STAGE_COLORS[(project.status as ProjectStatus) || "lead"])}>
        <div className="flex items-start justify-between mb-2">
          <p className="font-semibold text-sm text-foreground leading-tight">{project.name}</p>
        </div>
        <p className="text-xs text-muted-foreground mb-3">{project.client_name}</p>
        <Progress value={project.progress_percent} className="h-1.5 mb-1" />
        <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
          <span>{project.progress_percent}% complete</span>
          {project.estimated_end_date && (
            <span className={cn("flex items-center gap-1", overdue ? "text-red-500" : "")}>
              {overdue && <AlertCircle className="w-3 h-3" />}
              {formatShortDate(project.estimated_end_date)}
            </span>
          )}
        </div>
        {project.outstanding_payment && project.outstanding_payment > 0 ? (
          <div className="mt-2 pt-2 border-t border-border flex items-center gap-1 text-amber-600 text-xs font-medium">
            <IndianRupee className="w-3 h-3" />
            {formatCurrency(project.outstanding_payment)} outstanding
          </div>
        ) : null}
      </div>
    </Link>
  );
}

export default function ProjectsPage() {
  const [view, setView] = useState<View>("kanban");
  const [search, setSearch] = useState("");
  const projects = useAppStore(state => state.projects);

  const filtered = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.client_name.toLowerCase().includes(search.toLowerCase()) ||
      p.reference_number.toLowerCase().includes(search.toLowerCase())
  );

  const projectsByStage = PROJECT_STAGES.reduce((acc, stage) => {
    acc[stage] = filtered.filter((p) => p.status === stage);
    return acc;
  }, {} as Record<ProjectStatus, Project[]>);

  const activeStages = PROJECT_STAGES.filter((s) => s !== "closed" && projectsByStage[s].length > 0 || s !== "closed");

  return (
    <div>
      <TopBar title="Projects" subtitle={`${projects.length} total projects`} />
      <div className="p-6">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-6 gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search projects or clients…"
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="w-3.5 h-3.5" />
              Filter
            </Button>
            <div className="flex rounded-lg border border-border overflow-hidden">
              {[
                { val: "kanban", icon: LayoutGrid },
                { val: "list", icon: List },
              ].map(({ val, icon: Icon }) => (
                <button
                  key={val}
                  onClick={() => setView(val as View)}
                  className={cn("px-3 py-2", view === val ? "bg-primary text-white" : "bg-card text-muted-foreground hover:bg-muted")}
                >
                  <Icon className="w-4 h-4" />
                </button>
              ))}
            </div>
            <NewProjectDialog />
          </div>
        </div>

        {/* Kanban View */}
        {view === "kanban" && (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {PROJECT_STAGES.filter((s) => s !== "closed").map((stage) => (
              <div key={stage} className="flex-shrink-0 w-72">
                <div className={cn("flex items-center justify-between px-3 py-2 rounded-lg mb-3", STAGE_HEADER_COLORS[stage])}>
                  <span className="text-xs font-semibold">{PROJECT_STAGE_LABELS[stage]}</span>
                  <span className="text-xs font-bold bg-white/60 rounded-full w-5 h-5 flex items-center justify-center">
                    {projectsByStage[stage].length}
                  </span>
                </div>
                <div>
                  {projectsByStage[stage].map((project) => (
                    <ProjectCard key={project.id} project={project} />
                  ))}
                  {projectsByStage[stage].length === 0 && (
                    <div className="text-xs text-muted-foreground text-center py-6 border-2 border-dashed border-border rounded-xl">
                      No projects here
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* List View */}
        {view === "list" && (
          <div className="space-y-3">
            {filtered.map((project) => (
              <Link key={project.id} href={`/projects/${project.id}`}>
                <Card className="card-hover cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0">
                        <FolderKanban className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-foreground">{project.name}</p>
                          <Badge className={cn("text-xs border-0", getStatusColor(project.status))}>
                            {PROJECT_STAGE_LABELS[project.status]}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{project.reference_number}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Progress value={project.progress_percent} className="h-1.5 w-32" />
                          <span className="text-xs text-muted-foreground">{project.progress_percent}%</span>
                          <span className="text-xs text-muted-foreground">· {project.client_name}</span>
                          <span className="text-xs text-muted-foreground">· {project.area_sqft} sqft</span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 space-y-0.5">
                        <p className="font-bold text-foreground">
                          {project.total_budget ? formatCurrency(project.total_budget) : "—"}
                        </p>
                        {project.outstanding_payment && project.outstanding_payment > 0 ? (
                          <p className="text-xs text-amber-600">{formatCurrency(project.outstanding_payment)} due</p>
                        ) : null}
                        {project.estimated_end_date && (
                          <p className={cn("text-xs", isOverdue(project.estimated_end_date) ? "text-red-500" : "text-muted-foreground")}>
                            Due: {formatShortDate(project.estimated_end_date)}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
