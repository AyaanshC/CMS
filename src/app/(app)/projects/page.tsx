"use client";

import { useState } from "react";
import Link from "next/link";
import { TopBar } from "@/components/layout/AppSidebar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Search,
  LayoutGrid,
  List,
  Columns3,
  CalendarDays,
  ArrowUpRight,
  FolderKanban,
  SlidersHorizontal,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import {
  formatCurrency,
  getStatusColor,
  formatShortDate,
  cn,
} from "@/lib/utils";
import {
  PROJECT_STAGES,
  PROJECT_STAGE_LABELS,
  type ProjectStatus,
  type Project,
} from "@/types";
import { NewProjectDialog } from "@/components/projects/NewProjectDialog";

type View = "grid" | "board" | "list";

function ProjectCard({ project }: { project: Project }) {
  return (
    <Link
      href={`/projects/${project.id}`}
      className="group flex h-full flex-col rounded-xl border border-border bg-card transition-all hover:border-primary/40 hover:shadow-sm"
    >
      <div className="flex items-start justify-between gap-3 p-5 pb-4">
        <span className="flex size-11 items-center justify-center rounded-xl border border-primary/10 bg-accent/70 text-primary">
          <FolderKanban className="size-5" strokeWidth={1.4} />
        </span>
        <Badge
          className={cn(
            "border-0 px-2 py-1 text-[9px] font-medium",
            getStatusColor(project.status),
          )}
        >
          {PROJECT_STAGE_LABELS[project.status]}
        </Badge>
      </div>
      <div className="flex-1 px-5">
        <p className="text-[9px] uppercase tracking-wider text-muted-foreground">
          {project.reference_number}
        </p>
        <div className="mt-1.5 flex items-start justify-between gap-2">
          <h2 className="text-base font-semibold group-hover:text-primary">
            {project.name}
          </h2>
          <ArrowUpRight className="mt-1 size-4 shrink-0 text-muted-foreground/60 group-hover:text-primary" />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {project.client_name}
        </p>
        <div className="mb-2 mt-6 flex items-center justify-between text-[10px]">
          <span className="text-muted-foreground">Project progress</span>
          <span className="font-semibold tabular-nums">
            {project.progress_percent}%
          </span>
        </div>
        <Progress value={project.progress_percent} className="h-1" />
      </div>
      <div className="mx-5 mb-4 mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
        <span className="text-[11px] font-semibold tabular-nums">
          {project.total_budget
            ? formatCurrency(project.total_budget)
            : "Budget not set"}
        </span>
        <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <CalendarDays className="size-3" />
          {project.estimated_end_date
            ? formatShortDate(project.estimated_end_date)
            : "No target date"}
        </span>
      </div>
    </Link>
  );
}

export default function ProjectsPage() {
  const [view, setView] = useState<View>("grid");
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState("all");
  const projects = useAppStore((s) => s.projects);
  const filtered = projects.filter(
    (p) =>
      (stage === "all" || p.status === stage) &&
      `${p.name} ${p.client_name} ${p.reference_number}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const active = projects.filter(
    (p) => p.status !== "lead" && p.status !== "closed",
  ).length;
  const pipeline = projects.filter((p) => p.status === "lead").length;
  const closed = projects.filter((p) => p.status === "closed").length;
  const views: { value: View; label: string; icon: typeof LayoutGrid }[] = [
    { value: "grid", label: "Grid view", icon: LayoutGrid },
    { value: "board", label: "Board view", icon: Columns3 },
    { value: "list", label: "List view", icon: List },
  ];

  return (
    <div>
      <TopBar
        title="Projects"
        subtitle="Every brief, milestone, and detail in one place."
      />
      <div className="p-6 space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div className="flex gap-7 sm:gap-10">
            {[
              ["Active projects", active],
              ["In the pipeline", pipeline],
              ["Completed", closed],
            ].map(([label, count]) => (
              <div key={label}>
                <p className="text-[10px] text-muted-foreground">{label}</p>
                <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">
                  {String(count).padStart(2, "0")}
                </p>
              </div>
            ))}
          </div>
          <NewProjectDialog />
        </div>
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3">
          <div className="relative min-w-[180px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Search projects"
              placeholder="Search projects, clients, or references…"
              className="border-transparent bg-muted/60 pl-9 shadow-none"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="relative flex items-center">
            <SlidersHorizontal className="pointer-events-none absolute left-3 size-3.5 text-muted-foreground" />
            <select
              aria-label="Filter by project stage"
              value={stage}
              onChange={(e) => setStage(e.target.value)}
              className="h-10 max-w-[200px] rounded-lg border border-border bg-card pl-9 pr-7 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="all">All stages</option>
              {PROJECT_STAGES.map((s) => (
                <option key={s} value={s}>
                  {PROJECT_STAGE_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
          <div
            role="group"
            aria-label="Project display"
            className="flex gap-1 rounded-lg bg-muted p-1"
          >
            {views.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                aria-label={label}
                title={label}
                aria-pressed={view === value}
                onClick={() => setView(value)}
                className={cn(
                  "flex size-8 items-center justify-center rounded-md transition-colors",
                  view === value
                    ? "bg-card text-primary shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium">
            {stage === "all"
              ? "All projects"
              : PROJECT_STAGE_LABELS[stage as ProjectStatus]}{" "}
            <span className="ml-2 rounded-md bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
              {filtered.length}
            </span>
          </p>
          <p className="text-[10px] text-muted-foreground">
            {view === "board"
              ? "Organised by project stage"
              : "Your studio portfolio"}
          </p>
        </div>
        {!filtered.length ? (
          <div className="rounded-xl border border-dashed border-border bg-card px-6 py-20 text-center">
            <FolderKanban className="mx-auto mb-4 size-8 text-primary/60" />
            <h2 className="text-base font-semibold">
              {projects.length
                ? "No matching projects"
                : "Make room for your first project"}
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-xs text-muted-foreground">
              {projects.length
                ? "Try a different search or choose another stage."
                : "Create a project to bring your client, team, and design details together."}
            </p>
            {(search || stage !== "all") && (
              <button
                onClick={() => {
                  setSearch("");
                  setStage("all");
                }}
                className="mt-5 text-xs font-semibold text-primary"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <>
            {view === "grid" && (
              <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
                {filtered.map((p) => (
                  <ProjectCard key={p.id} project={p} />
                ))}
              </div>
            )}
            {view === "board" && (
              <div className="flex gap-4 overflow-x-auto pb-4">
                {PROJECT_STAGES.filter(
                  (s) => stage === "all" || stage === s,
                ).map((s) => {
                  const items = filtered.filter((p) => p.status === s);
                  return (
                    <section
                      key={s}
                      className="w-[285px] shrink-0 rounded-xl bg-muted/60 p-3"
                    >
                      <div className="mb-4 flex items-center justify-between px-1">
                        <h2 className="text-xs font-semibold">
                          {PROJECT_STAGE_LABELS[s]}
                        </h2>
                        <span className="text-[10px] text-muted-foreground">
                          {items.length}
                        </span>
                      </div>
                      <div className="space-y-3">
                        {items.map((p) => (
                          <ProjectCard key={p.id} project={p} />
                        ))}
                        {!items.length && (
                          <p className="rounded-lg border border-dashed border-border px-4 py-10 text-center text-[11px] text-muted-foreground">
                            No projects at this stage
                          </p>
                        )}
                      </div>
                    </section>
                  );
                })}
              </div>
            )}
            {view === "list" && (
              <div className="overflow-x-auto rounded-xl border border-border bg-card">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-border bg-muted/50 text-[10px] uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-5 py-4 font-medium">
                        Project / client
                      </th>
                      <th className="px-5 py-4 font-medium">Stage</th>
                      <th className="px-5 py-4 font-medium">Progress</th>
                      <th className="px-5 py-4 font-medium">Budget</th>
                      <th className="px-5 py-4 font-medium">Target date</th>
                      <th className="px-4">
                        <span className="sr-only">Open project</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.map((p) => (
                      <tr
                        key={p.id}
                        className="transition-colors hover:bg-muted/40"
                      >
                        <td className="min-w-52 px-5 py-5">
                          <Link
                            href={`/projects/${p.id}`}
                            className="font-semibold hover:text-primary"
                          >
                            {p.name}
                          </Link>
                          <p className="mt-1 text-[10px] text-muted-foreground">
                            {p.client_name}
                          </p>
                        </td>
                        <td className="px-5">
                          <Badge
                            className={cn(
                              "whitespace-nowrap border-0 text-[9px]",
                              getStatusColor(p.status),
                            )}
                          >
                            {PROJECT_STAGE_LABELS[p.status]}
                          </Badge>
                        </td>
                        <td className="min-w-36 px-5">
                          <div className="flex items-center gap-3">
                            <Progress
                              value={p.progress_percent}
                              className="h-1 w-20"
                            />
                            <span className="text-[10px] tabular-nums">
                              {p.progress_percent}%
                            </span>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-5 font-medium tabular-nums">
                          {p.total_budget
                            ? formatCurrency(p.total_budget)
                            : "—"}
                        </td>
                        <td className="whitespace-nowrap px-5 text-muted-foreground">
                          {p.estimated_end_date
                            ? formatShortDate(p.estimated_end_date)
                            : "—"}
                        </td>
                        <td className="px-4">
                          <Link
                            href={`/projects/${p.id}`}
                            aria-label={`Open ${p.name}`}
                            className="inline-flex size-8 items-center justify-center rounded-md hover:bg-accent"
                          >
                            <ArrowUpRight className="size-4 text-primary" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
