"use client";

import { use, Suspense, useState } from "react";
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
import MaterialsTab from "@/components/projects/MaterialsTab";
import MessagesTab from "@/components/projects/MessagesTab";
import ProcurementTab from "@/components/projects/ProcurementTab";

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="p-6">Loading project...</div>}>
      <ProjectDetailContent params={params} />
    </Suspense>
  );
}

function ProjectDetailContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [tab, setTab] = useState("overview");
  const { projects, boqs, snags, tasks, messages, invoices, expenses, files, projectUpdates, materialOptions } = useAppStore();

  const project = projects.find((p) => p.id === id);
  if (!project) return <div className="p-6 text-muted-foreground">Project not found.</div>;

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
  const totalInvoiced = projectInvoices.reduce((sum, inv) => sum + inv.total_amount, 0);
  const totalPaid = projectInvoices.reduce((sum, inv) => sum + (inv.amount_paid || 0), 0);

  return (
    <div>
      <TopBar title={project.name} subtitle={`${project.reference_number} · ${project.client_name}`} />
      <div className="p-6 space-y-5">
        <ProjectHeader project={project} openSnags={openSnags} totalInvoiced={totalInvoiced} totalPaid={totalPaid} onSelectTab={setTab} />
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="inline-flex w-full justify-start overflow-x-auto h-auto gap-1 p-1 bg-card border rounded-lg hide-scrollbar">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="fees">Fees & Stages</TabsTrigger>
            <TabsTrigger value="changes">Change Orders</TabsTrigger>
            <TabsTrigger value="boq">BOQ ({boq.length} Versions)</TabsTrigger>
            {project.engagement_type === "design_and_execution" && (
              <TabsTrigger value="procurement">Procurement</TabsTrigger>
            )}
            <TabsTrigger value="snags">
              Snags {openSnags > 0 && <span className="ml-1 w-4 h-4 bg-red-100 text-red-600 rounded-full text-[10px] flex items-center justify-center font-bold">{openSnags}</span>}
            </TabsTrigger>
            <TabsTrigger value="tasks">Tasks ({projectTasks.length})</TabsTrigger>
            <TabsTrigger value="files">Files ({projectFiles.length})</TabsTrigger>
            <TabsTrigger value="finance">Finance & Expenses</TabsTrigger>
            <TabsTrigger value="updates">Feed & Stories ({updates.length})</TabsTrigger>
            <TabsTrigger value="materials">Materials & Moodboard</TabsTrigger>
            <TabsTrigger value="messages">Chat</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="mt-4 space-y-4"><OverviewTab project={project} /></TabsContent>
          <TabsContent value="fees" className="mt-4"><FeesTab project={project} /></TabsContent>
          <TabsContent value="changes" className="mt-4"><ChangeOrdersTab project={project} /></TabsContent>
          <TabsContent value="boq" className="mt-4"><BOQTab projectId={id} boqVersions={boq} /></TabsContent>
          {project.engagement_type === "design_and_execution" && (
            <TabsContent value="procurement" className="mt-4"><ProcurementTab project={project} /></TabsContent>
          )}
          <TabsContent value="snags" className="mt-4"><SnagTab projectId={id} snags={projectSnags} rooms={project.rooms || []} /></TabsContent>
          <TabsContent value="tasks" className="mt-4 space-y-4"><TasksTab project={project} tasks={projectTasks} /></TabsContent>
          <TabsContent value="files" className="mt-4 space-y-4"><FilesTab project={project} files={projectFiles} /></TabsContent>
          <TabsContent value="finance" className="mt-4 space-y-6"><FinanceTab project={project} invoices={projectInvoices} expenses={projectExpenses} /></TabsContent>
          <TabsContent value="updates" className="mt-4 space-y-4"><UpdatesTab project={project} updates={updates} /></TabsContent>
          <TabsContent value="materials" className="mt-4 space-y-4"><MaterialsTab materials={materials} /></TabsContent>
          <TabsContent value="messages" className="mt-4"><MessagesTab projectId={id} messages={projectMessages} /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
