"use client";

import { BrandLoader } from "@/components/brand/BrandLoader";
import { use, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { TopBar } from "@/components/layout/AppSidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppStore } from "@/lib/store";
import ProjectHeader from "@/components/projects/ProjectHeader";
import OverviewTab from "@/components/projects/OverviewTab";
import FeesTab from "@/components/projects/FeesTab";
import ChangeOrdersTab from "@/components/projects/ChangeOrdersTab";
import BOQTab from "@/components/projects/BOQTab";
import SnagTab from "@/components/projects/SnagTab";
import TasksTab from "@/components/projects/TasksTab";
import FilesTab from "@/components/projects/FilesTab";
import FinanceTab from "@/components/projects/FinanceTab";
import UpdatesTab from "@/components/projects/UpdatesTab";
import { MaterialBoard } from "@/components/projects/MaterialBoard";
import MessagesTab from "@/components/projects/MessagesTab";
import ProcurementTab from "@/components/projects/ProcurementTab";
import { PROJECT_GROUPS, resolveProjectTab } from "@/lib/projects/navigation";
import { ProjectNextSteps } from "@/components/projects/ProjectNextSteps";
import { cn } from "@/lib/utils";
import { invoiceSummary } from "@/lib/finance/summary";

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<BrandLoader label="Loading project" />}>
      <ProjectDetailContent params={params} />
    </Suspense>
  );
}

function ProjectDetailContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    projects,
    boqs,
    snags,
    tasks,
    messages,
    invoices,
    expenses,
    files,
    projectUpdates,
    materialOptions,
  } = useAppStore();

  const project = projects.find((p) => p.id === id);
  if (!project)
    return (
      <div className="p-10 text-center">
        <h1 className="text-xl font-semibold">Project unavailable</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This project was not found or you don’t have access.
        </p>
        <Link
          href="/projects"
          className="mt-5 inline-block text-sm text-primary"
        >
          Back to projects
        </Link>
      </div>
    );
  const execution = project.engagement_type === "design_and_execution";
  const tab = resolveProjectTab(searchParams.get("tab"), execution);
  const group = PROJECT_GROUPS.find((g) => g.tabs.some((t) => t.id === tab))!;
  const setTab = (value: string) => {
    const query = new URLSearchParams(searchParams.toString());
    query.set("tab", value);
    router.replace(`/projects/${id}?${query}`, { scroll: false });
  };

  const boq = boqs.filter((b) => b.project_id === id);
  const projectSnags = snags.filter((s) => s.project_id === id);
  const projectTasks = tasks.filter((t) => t.project_id === id);
  const projectMessages = messages.filter((m) => m.project_id === id);
  const projectInvoices = invoices.filter((i) => i.project_id === id);
  const projectExpenses = expenses.filter((e) => e.project_id === id);
  const projectFiles = files.filter((f) => f.project_id === id);
  const updates = projectUpdates.filter((u) => u.project_id === id);
  const materials = materialOptions.filter((m) => m.project_id === id);
  const openSnags = projectSnags.filter((s) => s.status !== "closed").length;
  const totals = invoiceSummary(projectInvoices);

  return (
    <div>
      <TopBar
        title={project.name}
        subtitle={`${project.reference_number} · ${project.client_name}`}
      />
      <div className="p-6 space-y-5">
        <ProjectHeader
          project={project}
          openSnags={openSnags}
          totalInvoiced={totals.invoiced}
          totalPaid={totals.collected}
          outstanding={totals.outstanding}
          onSelectTab={setTab}
        />
        <ProjectNextSteps project={project} onSelectTab={setTab} />
        <nav
          aria-label="Project areas"
          className="flex gap-1 overflow-x-auto rounded-xl border bg-card p-1.5"
        >
          {PROJECT_GROUPS.map((g) => (
            <button
              key={g.id}
              type="button"
              aria-pressed={group.id === g.id}
              onClick={() => setTab(g.tabs[0].id)}
              className={cn(
                "min-h-10 flex-1 whitespace-nowrap rounded-lg px-4 text-sm font-medium transition-colors",
                group.id === g.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {g.label}
            </button>
          ))}
        </nav>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList
            aria-label={`${group.label} sections`}
            className="inline-flex max-w-full justify-start overflow-x-auto h-auto gap-1 p-1 bg-transparent hide-scrollbar"
          >
            {group.tabs
              .filter((t) => t.id !== "procurement" || execution)
              .map((t) => (
                <TabsTrigger key={t.id} value={t.id}>
                  {t.label}
                  {t.id === "snags" && openSnags > 0 && (
                    <span className="ml-1 rounded-full bg-destructive/10 px-1.5 text-xs text-destructive">
                      {openSnags}
                    </span>
                  )}
                </TabsTrigger>
              ))}
          </TabsList>
          <TabsContent value="overview" className="mt-4 space-y-4">
            <OverviewTab project={project} />
          </TabsContent>
          <TabsContent value="fees" className="mt-4">
            <FeesTab project={project} />
          </TabsContent>
          <TabsContent value="changes" className="mt-4">
            <ChangeOrdersTab project={project} />
          </TabsContent>
          <TabsContent value="boq" className="mt-4">
            <BOQTab projectId={id} boqVersions={boq} />
          </TabsContent>
          {project.engagement_type === "design_and_execution" && (
            <TabsContent value="procurement" className="mt-4">
              <ProcurementTab project={project} />
            </TabsContent>
          )}
          <TabsContent value="snags" className="mt-4">
            <SnagTab
              projectId={id}
              snags={projectSnags}
              rooms={project.rooms || []}
            />
          </TabsContent>
          <TabsContent value="tasks" className="mt-4 space-y-4">
            <TasksTab project={project} tasks={projectTasks} />
          </TabsContent>
          <TabsContent value="files" className="mt-4 space-y-4">
            <FilesTab project={project} files={projectFiles} />
          </TabsContent>
          <TabsContent value="finance" className="mt-4 space-y-6">
            <FinanceTab
              project={project}
              invoices={projectInvoices}
              expenses={projectExpenses}
            />
          </TabsContent>
          <TabsContent value="updates" className="mt-4 space-y-4">
            <UpdatesTab project={project} updates={updates} />
          </TabsContent>
          <TabsContent value="materials" className="mt-4 space-y-4">
            <MaterialBoard projectId={id} materials={materials} />
          </TabsContent>
          <TabsContent value="messages" className="mt-4">
            <MessagesTab projectId={id} messages={projectMessages} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
