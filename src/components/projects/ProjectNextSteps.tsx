"use client";
import { useAppStore } from "@/lib/store";
import { formatShortDate } from "@/lib/utils";
import type { Project } from "@/types";

export function ProjectNextSteps({
  project,
  onSelectTab,
}: {
  project: Project;
  onSelectTab: (tab: string) => void;
}) {
  const { team, boqs, changeOrders, tasks, invoices } = useAppStore();
  const milestone = project.milestones
    ?.filter((m) => !m.completed_at)
    .sort((a, b) =>
      (a.due_date || "9999").localeCompare(b.due_date || "9999"),
    )[0];
  const manager =
    team.find((m) => m.id === project.manager_id) ??
    project.team?.find((m) => m.role === "project_manager");
  const pendingBoqs = boqs.filter(
    (b) => b.project_id === project.id && b.status === "submitted",
  ).length;
  const pendingClient =
    pendingBoqs +
    changeOrders.filter(
      (c) => c.project_id === project.id && c.status === "submitted",
    ).length;
  const draftInvoices = invoices.filter(
    (i) => i.project_id === project.id && i.status === "draft",
  ).length;
  const openTasks = tasks.filter(
    (t) => t.project_id === project.id && t.status !== "done",
  ).length;
  const action = pendingClient
    ? {
        text: `${pendingClient} decision${pendingClient === 1 ? "" : "s"} awaiting client`,
        tab: pendingBoqs ? "boq" : "changes",
      }
    : draftInvoices
      ? {
          text: `${draftInvoices} invoice draft${draftInvoices === 1 ? "" : "s"} to review`,
          tab: "finance",
        }
      : openTasks
        ? {
            text: `${openTasks} open task${openTasks === 1 ? "" : "s"}`,
            tab: "tasks",
          }
        : { text: "Review the project plan", tab: "overview" };
  return (
    <section
      aria-label="Project next steps"
      className="grid gap-5 rounded-xl border border-primary/15 bg-accent/40 p-5 sm:grid-cols-3"
    >
      <div>
        <p className="eyebrow mb-2">Next milestone</p>
        <p className="text-sm font-semibold">
          {milestone?.title ?? "No upcoming milestone"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {milestone?.due_date
            ? `Target ${formatShortDate(milestone.due_date)}`
            : "Set dates in the project summary"}
        </p>
      </div>
      <div>
        <p className="eyebrow mb-2">Project lead</p>
        <p className="text-sm font-semibold">
          {manager?.full_name ?? "Not assigned"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {manager
            ? "Your point of coordination"
            : "Your studio has not assigned a project lead"}
        </p>
      </div>
      <div>
        <p className="eyebrow mb-2">Next action</p>
        <button
          type="button"
          onClick={() => onSelectTab(action.tab)}
          className="text-left text-sm font-semibold text-primary hover:underline"
        >
          {action.text} →
        </button>
        <p className="mt-1 text-xs text-muted-foreground">
          Open the relevant workspace section
        </p>
      </div>
    </section>
  );
}
