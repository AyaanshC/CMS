"use client";

import { useState } from "react";
import { use, Suspense } from "react";
import { TopBar } from "@/components/layout/AppSidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  MapPin, Calendar, Ruler, Users, ChevronRight, CheckCircle2,
  Circle, Edit2, ArrowRight, ExternalLink, Plus, AlertTriangle,
  Folder, Upload, FileText, Check, Heart, ThumbsUp, Trash2, Eye, EyeOff, Receipt, Clock, Palette
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import {
  formatCurrency, formatDate, formatShortDate, getStatusColor, getPriorityColor, getInitials, cn, isOverdue, formatFileSize
} from "@/lib/utils";
import Link from "next/link";
import {
  PROJECT_STAGES, PROJECT_STAGE_LABELS, ProjectStatus, TaskStatus, TaskPriority, Invoice, Expense
} from "@/types";
import BOQTab from "@/components/projects/BOQTab";
import SnagTab from "@/components/projects/SnagTab";
import MessagesTab from "@/components/projects/MessagesTab";

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

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="p-6">Loading project...</div>}>
      <ProjectDetailContent params={params} />
    </Suspense>
  );
}

function ProjectDetailContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { 
    projects, boqs, snags, tasks, messages, invoices, expenses, 
    files, projectUpdates, materialOptions,
    advanceProjectStage, addRoomToProject, addMilestoneToProject, toggleMilestone,
    addTask, updateTaskStatus, addFile, toggleFileVisibility, deleteFile,
    addInvoice, recordPayment, addExpense, addProjectUpdate, toggleUpdateReaction,
    toggleMaterialSelection
  } = useAppStore();
  
  const project = projects.find((p) => p.id === id);
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

  // Dialog states
  const [stageConfirmModalOpen, setStageConfirmModalOpen] = useState(false);
  const [targetStage, setTargetStage] = useState<ProjectStatus | null>(null);
  const [addRoomModalOpen, setAddRoomModalOpen] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [roomSqft, setRoomSqft] = useState(250);

  const [addMilestoneModalOpen, setAddMilestoneModalOpen] = useState(false);
  const [milestoneTitle, setMilestoneTitle] = useState("");
  const [milestoneDate, setMilestoneDate] = useState("");

  const [addTaskModalOpen, setAddTaskModalOpen] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: "",
    priority: "medium" as TaskPriority,
    due_date: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
    assigned_to_name: "Priya Sharma",
  });

  const [uploadFileModalOpen, setUploadFileModalOpen] = useState(false);
  const [fileForm, setFileForm] = useState({
    fileName: "",
    folder: "Drawings & Layouts",
    fileUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop&q=80",
    isClientVisible: true
  });
  const [selectedFolderFilter, setSelectedFolderFilter] = useState("all");

  const [createInvoiceModalOpen, setCreateInvoiceModalOpen] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({
    invoiceNumber: `STU-INV-2024-00${projectInvoices.length + 1}`,
    subtotal: 250000,
    dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    notes: "Payment due for Phase 2 carpentry & electrical works."
  });

  const [recordPaymentModalOpen, setRecordPaymentModalOpen] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const [paymentForm, setPaymentForm] = useState({
    amount: 100000,
    mode: "bank_transfer",
    reference: "HDFC-REF-8921"
  });

  const [addExpenseModalOpen, setAddExpenseModalOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    category: "Materials",
    description: "",
    amount: 15000,
  });

  const [postUpdateModalOpen, setPostUpdateModalOpen] = useState(false);
  const [updateForm, setUpdateForm] = useState({
    title: "",
    content: "",
    photoUrl: "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800&auto=format&fit=crop&q=80"
  });

  if (!project) return <div className="p-6 text-muted-foreground">Project not found.</div>;

  const currentStageIndex = PROJECT_STAGES.indexOf(project.status);
  const totalInvoiced = projectInvoices.reduce((sum, inv) => sum + inv.total_amount, 0);
  const totalPaid = projectInvoices.reduce((sum, inv) => sum + (inv.amount_paid || 0), 0);
  const totalExp = projectExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const netProfit = totalPaid - totalExp;

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

  const handleAddRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomName.trim()) return;
    addRoomToProject(project.id, { name: roomName, area_sqft: Number(roomSqft), sort_order: (project.rooms?.length || 0) + 1 });
    setRoomName("");
    setAddRoomModalOpen(false);
  };

  const handleAddMilestone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!milestoneTitle.trim()) return;
    addMilestoneToProject(project.id, { title: milestoneTitle, due_date: milestoneDate });
    setMilestoneTitle("");
    setMilestoneDate("");
    setAddMilestoneModalOpen(false);
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    addTask({
      id: 'task-' + Date.now(),
      project_id: project.id,
      project_name: project.name,
      title: taskForm.title,
      status: 'todo',
      priority: taskForm.priority,
      assigned_to_name: taskForm.assigned_to_name,
      due_date: taskForm.due_date,
      is_internal: true,
      created_by: 'user-1',
      created_at: new Date().toISOString()
    });
    setTaskForm({ title: "", priority: "medium", due_date: "", assigned_to_name: "Priya Sharma" });
    setAddTaskModalOpen(false);
  };

  const handleUploadFile = (e: React.FormEvent) => {
    e.preventDefault();
    addFile({
      id: 'file-' + Date.now(),
      project_id: project.id,
      folder: fileForm.folder,
      file_name: fileForm.fileName,
      file_url: fileForm.fileUrl,
      file_type: fileForm.fileName.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg',
      file_size_bytes: 2100000,
      file_size: 2100000,
      category: 'document',
      uploaded_by: 'user-1',
      uploaded_by_name: 'Priya Sharma',
      uploaded_at: new Date().toISOString(),
      is_client_visible: fileForm.isClientVisible,
      created_at: new Date().toISOString().split('T')[0]
    });
    setFileForm({ fileName: "", folder: "Drawings & Layouts", fileUrl: "", isClientVisible: true });
    setUploadFileModalOpen(false);
  };

  const handleCreateInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    const gst = (invoiceForm.subtotal * 18) / 100;
    const total = invoiceForm.subtotal + gst;
    const newInv: Invoice = {
      id: 'inv-' + Date.now(),
      project_id: project.id,
      project_name: project.name,
      client_name: project.client_name,
      invoice_number: invoiceForm.invoiceNumber,
      status: 'sent',
      issue_date: new Date().toISOString().split('T')[0],
      due_date: invoiceForm.dueDate,
      subtotal: invoiceForm.subtotal,
      gst_amount: gst,
      discount: 0,
      total_amount: total,
      amount_paid: 0,
      amount_due: total,
      notes: invoiceForm.notes
    };
    addInvoice(newInv);
    setCreateInvoiceModalOpen(false);
  };

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceId) return;
    recordPayment(selectedInvoiceId, Number(paymentForm.amount), new Date().toISOString().split('T')[0], paymentForm.mode, paymentForm.reference);
    setRecordPaymentModalOpen(false);
  };

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    addExpense({
      id: 'exp-' + Date.now(),
      project_id: project.id,
      category: expenseForm.category,
      description: expenseForm.description,
      amount: Number(expenseForm.amount),
      expense_date: new Date().toISOString().split('T')[0]
    });
    setExpenseForm({ category: "Materials", description: "", amount: 15000 });
    setAddExpenseModalOpen(false);
  };

  const handlePostUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    addProjectUpdate({
      id: 'upd-' + Date.now(),
      project_id: project.id,
      posted_by: 'user-1',
      posted_by_name: 'Priya Sharma',
      title: updateForm.title,
      content: updateForm.content,
      photos: updateForm.photoUrl ? [updateForm.photoUrl] : [],
      created_at: new Date().toISOString(),
      likes: 1,
      loved: 0
    });
    setUpdateForm({ title: "", content: "", photoUrl: "" });
    setPostUpdateModalOpen(false);
  };

  return (
    <div>
      <TopBar
        title={project.name}
        subtitle={`${project.reference_number} · ${project.client_name}`}
      />
      <div className="p-6 space-y-5">
        {/* Project Header Card */}
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

        {/* Navigation Tabs */}
        <Tabs defaultValue="overview">
          <TabsList className="inline-flex w-full justify-start overflow-x-auto h-auto gap-1 p-1 bg-card border rounded-lg hide-scrollbar">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="boq">BOQ ({boq.length} Versions)</TabsTrigger>
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

          {/* OVERVIEW TAB */}
          <TabsContent value="overview" className="mt-4 space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Rooms Manager */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold">Rooms & Scope ({project.rooms?.length || 0})</CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => setAddRoomModalOpen(true)} className="gap-1 text-xs text-primary">
                      <Plus className="w-3.5 h-3.5" /> Add Room
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {project.rooms?.map((room) => (
                    <div key={room.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <span className="text-sm font-medium">{room.name}</span>
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">{room.area_sqft} sqft</span>
                    </div>
                  ))}
                  {(!project.rooms || project.rooms.length === 0) && (
                    <p className="text-xs text-muted-foreground py-4 text-center">No rooms added yet.</p>
                  )}
                </CardContent>
              </Card>

              {/* Milestones Manager */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold">Key Milestones</CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => setAddMilestoneModalOpen(true)} className="gap-1 text-xs text-primary">
                      <Plus className="w-3.5 h-3.5" /> Add
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {project.milestones?.map((ms) => (
                    <div 
                      key={ms.id} 
                      onClick={() => toggleMilestone(project.id, ms.id)}
                      className="flex items-start gap-2.5 py-2 border-b border-border last:border-0 cursor-pointer hover:bg-muted/30 rounded p-1 transition-colors"
                    >
                      {ms.completed_at ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                      ) : (
                        <Circle className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-xs font-medium truncate", ms.completed_at ? "line-through text-muted-foreground" : "text-foreground")}>
                          {ms.title}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {ms.completed_at ? `Done ${formatDate(ms.completed_at)}` : ms.due_date ? `Due ${formatDate(ms.due_date)}` : "No target date"}
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Team Members */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">Assigned Team</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3 py-1">
                    <Avatar className="w-9 h-9">
                      <AvatarFallback className="bg-indigo-100 text-indigo-700 text-xs font-bold">PS</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-xs font-semibold text-foreground">Priya Sharma</p>
                      <p className="text-[10px] text-muted-foreground">Principal Designer</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 py-1">
                    <Avatar className="w-9 h-9">
                      <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs font-bold">SS</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-xs font-semibold text-foreground">Suresh Site Team</p>
                      <p className="text-[10px] text-muted-foreground">Site Civil Supervisor</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* BOQ TAB */}
          <TabsContent value="boq" className="mt-4">
            <BOQTab projectId={id} boqVersions={boq} />
          </TabsContent>

          {/* SNAGS TAB */}
          <TabsContent value="snags" className="mt-4">
            <SnagTab projectId={id} snags={projectSnags} rooms={project.rooms || []} />
          </TabsContent>

          {/* TASKS TAB */}
          <TabsContent value="tasks" className="mt-4 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Project Kanban Board</span>
              <Button size="sm" onClick={() => setAddTaskModalOpen(true)} className="gradient-primary border-0 gap-1.5 text-xs">
                <Plus className="w-3.5 h-3.5" /> Add Task
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(["todo", "in_progress", "done"] as const).map((status) => {
                const colTasks = projectTasks.filter((t) => t.status === status);
                const labels = { todo: "To Do", in_progress: "In Progress", done: "Done" };
                return (
                  <div key={status} className="bg-muted/30 p-3 rounded-xl border border-border">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-foreground">{labels[status]}</span>
                      <span className="text-xs font-bold bg-muted px-2 py-0.5 rounded-full">{colTasks.length}</span>
                    </div>
                    <div className="space-y-2.5">
                      {colTasks.map((task) => (
                        <Card key={task.id} className="cursor-pointer card-hover">
                          <CardContent className="p-3">
                            <p className="text-xs font-semibold text-foreground mb-1.5">{task.title}</p>
                            <div className="flex items-center justify-between text-[10px]">
                              <span className={cn("px-1.5 py-0.5 rounded font-medium",
                                task.priority === "high" ? "bg-red-100 text-red-600" :
                                task.priority === "medium" ? "bg-amber-100 text-amber-600" :
                                "bg-slate-100 text-slate-600"
                              )}>
                                {task.priority.toUpperCase()}
                              </span>
                              {task.due_date && (
                                <span className={cn("text-muted-foreground", isOverdue(task.due_date) && task.status !== "done" ? "text-red-500 font-bold" : "")}>
                                  {formatShortDate(task.due_date)}
                                </span>
                              )}
                            </div>
                            <div className="mt-2 pt-2 border-t flex justify-end gap-1">
                              {status !== 'todo' && (
                                <button onClick={() => updateTaskStatus(task.id, 'todo')} className="text-[10px] text-muted-foreground hover:underline">← Todo</button>
                              )}
                              {status !== 'in_progress' && (
                                <button onClick={() => updateTaskStatus(task.id, 'in_progress')} className="text-[10px] text-indigo-600 hover:underline">In Progress</button>
                              )}
                              {status !== 'done' && (
                                <button onClick={() => updateTaskStatus(task.id, 'done')} className="text-[10px] text-emerald-600 hover:underline">Done ✓</button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          {/* FILES TAB */}
          <TabsContent value="files" className="mt-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-1.5">
                {["all", "Contracts", "BOQ & Quotations", "Drawings & Layouts", "3D Renders", "Site Photos", "Material Selections"].map((fld) => (
                  <Button
                    key={fld}
                    variant={selectedFolderFilter === fld ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedFolderFilter(fld)}
                    className="text-xs h-7"
                  >
                    {fld}
                  </Button>
                ))}
              </div>
              <Button size="sm" onClick={() => setUploadFileModalOpen(true)} className="gradient-primary border-0 gap-1.5 text-xs">
                <Upload className="w-3.5 h-3.5" /> Upload File
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {projectFiles
                .filter(f => selectedFolderFilter === 'all' || f.folder === selectedFolderFilter)
                .map((file) => (
                  <Card key={file.id} className="card-hover overflow-hidden">
                    {file.file_type.includes('image') ? (
                      <div className="h-32 bg-muted overflow-hidden relative">
                        <img src={file.file_url} alt={file.file_name} className="w-full h-full object-cover" />
                        <span className="absolute top-1 right-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded">
                          {file.folder}
                        </span>
                      </div>
                    ) : (
                      <div className="h-32 bg-indigo-50/60 flex flex-col items-center justify-center p-3 relative">
                        <FileText className="w-10 h-10 text-indigo-500 mb-2" />
                        <span className="text-[10px] font-bold text-indigo-700 uppercase">{file.file_type.split('/')[1] || 'DOC'}</span>
                        <span className="absolute top-1 right-1 bg-muted text-muted-foreground text-[9px] px-1.5 py-0.5 rounded">
                          {file.folder}
                        </span>
                      </div>
                    )}
                    <CardContent className="p-3">
                      <p className="text-xs font-semibold text-foreground truncate mb-1" title={file.file_name}>
                        {file.file_name}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-2">
                        <span>{formatFileSize(file.file_size_bytes || 0)}</span>
                        <span>{formatDate(file.created_at)}</span>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t">
                        <button
                          onClick={() => toggleFileVisibility(file.id)}
                          className={cn("flex items-center gap-1 text-[10px] font-medium transition-colors", file.is_client_visible ? "text-emerald-600" : "text-muted-foreground")}
                        >
                          {file.is_client_visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                          {file.is_client_visible ? "Client Visible" : "Studio Only"}
                        </button>
                        <button 
                          onClick={() => deleteFile(file.id)}
                          className="text-muted-foreground hover:text-destructive p-1"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </TabsContent>

          {/* FINANCE & EXPENSES TAB */}
          <TabsContent value="finance" className="mt-4 space-y-6">
            {/* Action buttons */}
            <div className="flex justify-between items-center">
              <div className="flex gap-4 text-xs font-semibold">
                <span className="text-indigo-600">Total Billed: {formatCurrency(totalInvoiced)}</span>
                <span className="text-emerald-600">Collected: {formatCurrency(totalPaid)}</span>
                <span className="text-rose-600">Expenses: {formatCurrency(totalExp)}</span>
                <span className="text-foreground">Net Margin: {formatCurrency(netProfit)}</span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setAddExpenseModalOpen(true)} className="text-xs">
                  + Add Expense
                </Button>
                <Button size="sm" onClick={() => setCreateInvoiceModalOpen(true)} className="gradient-primary border-0 text-xs">
                  + Create Invoice
                </Button>
              </div>
            </div>

            {/* Invoices List */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Invoices ({projectInvoices.length})</h4>
              {projectInvoices.map((inv) => (
                <Card key={inv.id}>
                  <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-sm text-foreground">{inv.invoice_number}</span>
                        <Badge className={cn("text-[10px] border-0 uppercase", getStatusColor(inv.status))}>{inv.status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">Due: {formatDate(inv.due_date)} · {inv.notes}</p>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="font-bold text-sm">{formatCurrency(inv.total_amount)}</p>
                        <p className="text-[10px] text-muted-foreground">Paid: {formatCurrency(inv.amount_paid || 0)}</p>
                      </div>
                      {inv.amount_due > 0 && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setSelectedInvoiceId(inv.id);
                            setPaymentForm({ ...paymentForm, amount: inv.amount_due });
                            setRecordPaymentModalOpen(true);
                          }}
                          className="text-xs text-emerald-600 border-emerald-300 hover:bg-emerald-50"
                        >
                          Record Payment
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Expenses List */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Project Expenses ({projectExpenses.length})</h4>
              <Card>
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted text-muted-foreground border-b">
                    <tr>
                      <th className="p-2.5">Date</th>
                      <th className="p-2.5">Category</th>
                      <th className="p-2.5">Description</th>
                      <th className="p-2.5 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {projectExpenses.map(exp => (
                      <tr key={exp.id}>
                        <td className="p-2.5">{formatDate(exp.expense_date)}</td>
                        <td className="p-2.5 font-medium">{exp.category}</td>
                        <td className="p-2.5 text-muted-foreground">{exp.description}</td>
                        <td className="p-2.5 text-right font-semibold text-rose-600">{formatCurrency(exp.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </div>
          </TabsContent>

          {/* PROJECT UPDATES FEED TAB */}
          <TabsContent value="updates" className="mt-4 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Client Progress Feed</span>
              <Button size="sm" onClick={() => setPostUpdateModalOpen(true)} className="gradient-primary border-0 text-xs gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Post Site Update
              </Button>
            </div>

            <div className="space-y-4 max-w-2xl">
              {updates.map(upd => (
                <Card key={upd.id} className="overflow-hidden">
                  {upd.photos?.length > 0 && (
                    <div className="h-64 bg-muted overflow-hidden">
                      <img src={upd.photos[0]} alt="Update" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <CardContent className="p-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-sm text-foreground">{upd.title}</h4>
                      <span className="text-[10px] text-muted-foreground">{formatDate(upd.created_at)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{upd.content}</p>
                    <div className="flex items-center gap-3 pt-3 border-t">
                      <button 
                        onClick={() => toggleUpdateReaction(upd.id, 'like')}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                      >
                        <ThumbsUp className="w-3.5 h-3.5 text-indigo-500" /> {upd.likes || 0}
                      </button>
                      <button 
                        onClick={() => toggleUpdateReaction(upd.id, 'love')}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-rose-500 transition-colors"
                      >
                        <Heart className="w-3.5 h-3.5 text-rose-500" /> {upd.loved || 0}
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* MATERIALS & MOODBOARD TAB */}
          <TabsContent value="materials" className="mt-4 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Material Selections & Specifications</span>
            </div>

            {materials.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {materials.map(mat => (
                  <Card key={mat.id} className="overflow-hidden card-hover">
                    <div className="h-44 bg-muted overflow-hidden relative">
                      <img src={mat.image_url} alt={mat.product_name} className="w-full h-full object-cover" />
                      <span className="absolute top-2 right-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded font-bold">
                        {mat.category}
                      </span>
                    </div>
                    <CardContent className="p-4 space-y-2">
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold text-xs text-foreground leading-snug">{mat.product_name}</h4>
                        <span className="text-xs font-bold text-indigo-600">₹{mat.approx_cost}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">{mat.brand} · {mat.room_name}</p>
                      <p className="text-[11px] text-muted-foreground line-clamp-2">{mat.description}</p>
                      <div className="pt-2 border-t flex justify-between items-center">
                        <button
                          onClick={() => toggleMaterialSelection(mat.id)}
                          className={cn(
                            "px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-all",
                            mat.is_selected ? "bg-emerald-100 text-emerald-800" : "bg-muted text-muted-foreground hover:bg-muted/80"
                          )}
                        >
                          <Check className="w-3 h-3" />
                          {mat.is_selected ? "Selected by Client" : "Select Option"}
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-border rounded-xl bg-slate-50/50">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                  <Palette className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-1">No Materials Selected</h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6">
                  You haven't added any material options or moodboard items for this project yet.
                </p>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" /> Add from Library
                </Button>
              </div>
            )}
          </TabsContent>

          {/* MESSAGES TAB */}
          <TabsContent value="messages" className="mt-4">
            <MessagesTab projectId={id} messages={projectMessages} />
          </TabsContent>
        </Tabs>
      </div>

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

      {/* MODAL: Add Room */}
      <Dialog open={addRoomModalOpen} onOpenChange={setAddRoomModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Room / Area</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddRoom} className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Room Name</Label>
              <Input 
                required 
                value={roomName} 
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="e.g. Master Bedroom, Balcony, Pooja Room"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Approximate Area (sqft)</Label>
              <Input 
                type="number"
                value={roomSqft} 
                onChange={(e) => setRoomSqft(parseFloat(e.target.value) || 0)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddRoomModalOpen(false)}>Cancel</Button>
              <Button type="submit" className="gradient-primary border-0">Add Room</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: Add Milestone */}
      <Dialog open={addMilestoneModalOpen} onOpenChange={setAddMilestoneModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Milestone</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddMilestone} className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Milestone Title</Label>
              <Input 
                required 
                value={milestoneTitle} 
                onChange={(e) => setMilestoneTitle(e.target.value)}
                placeholder="e.g. Electrical Conduit Inspection"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Target Date</Label>
              <Input 
                type="date"
                value={milestoneDate} 
                onChange={(e) => setMilestoneDate(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddMilestoneModalOpen(false)}>Cancel</Button>
              <Button type="submit" className="gradient-primary border-0">Save Milestone</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: Add Task */}
      <Dialog open={addTaskModalOpen} onOpenChange={setAddTaskModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Project Task</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddTask} className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Task Title</Label>
              <Input 
                required 
                value={taskForm.title} 
                onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                placeholder="e.g. Purchase brass handles from hardware supplier"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Priority</Label>
                <select
                  value={taskForm.priority}
                  onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value as TaskPriority })}
                  className="w-full h-9 px-2 text-xs rounded border border-input bg-card"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Due Date</Label>
                <Input 
                  type="date"
                  value={taskForm.due_date} 
                  onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Assignee</Label>
              <Input 
                value={taskForm.assigned_to_name} 
                onChange={(e) => setTaskForm({ ...taskForm, assigned_to_name: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddTaskModalOpen(false)}>Cancel</Button>
              <Button type="submit" className="gradient-primary border-0">Create Task</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: Upload File */}
      <Dialog open={uploadFileModalOpen} onOpenChange={setUploadFileModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload File to Project</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUploadFile} className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">File Name</Label>
              <Input 
                required 
                value={fileForm.fileName} 
                onChange={(e) => setFileForm({ ...fileForm, fileName: e.target.value })}
                placeholder="e.g. Living_Room_Lighting_Circuit.dwg"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Folder Category</Label>
              <select
                value={fileForm.folder}
                onChange={(e) => setFileForm({ ...fileForm, folder: e.target.value })}
                className="w-full h-9 px-2 text-xs rounded border border-input bg-card"
              >
                {["Contracts", "BOQ & Quotations", "Drawings & Layouts", "3D Renders", "Site Photos", "Material Selections", "Invoices", "Miscellaneous"].map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">File URL / Mock Path</Label>
              <Input 
                value={fileForm.fileUrl} 
                onChange={(e) => setFileForm({ ...fileForm, fileUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="isClientVis"
                checked={fileForm.isClientVisible}
                onChange={(e) => setFileForm({ ...fileForm, isClientVisible: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="isClientVis" className="text-xs font-normal">Make visible to client on their portal</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setUploadFileModalOpen(false)}>Cancel</Button>
              <Button type="submit" className="gradient-primary border-0">Upload</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: Create Invoice */}
      <Dialog open={createInvoiceModalOpen} onOpenChange={setCreateInvoiceModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Invoice</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateInvoice} className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Invoice Number</Label>
              <Input 
                required 
                value={invoiceForm.invoiceNumber} 
                onChange={(e) => setInvoiceForm({ ...invoiceForm, invoiceNumber: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Subtotal (₹)</Label>
                <Input 
                  type="number"
                  required 
                  value={invoiceForm.subtotal} 
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, subtotal: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Due Date</Label>
                <Input 
                  type="date"
                  value={invoiceForm.dueDate} 
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Notes / Milestones</Label>
              <Textarea 
                value={invoiceForm.notes} 
                onChange={(e) => setInvoiceForm({ ...invoiceForm, notes: e.target.value })}
                rows={2}
              />
            </div>
            <div className="p-2 bg-indigo-50 text-indigo-700 text-xs font-bold rounded text-right">
              Total with 18% GST: {formatCurrency(invoiceForm.subtotal * 1.18)}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateInvoiceModalOpen(false)}>Cancel</Button>
              <Button type="submit" className="gradient-primary border-0">Generate Invoice</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: Record Payment */}
      <Dialog open={recordPaymentModalOpen} onOpenChange={setRecordPaymentModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Record Payment Received</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRecordPayment} className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Amount Received (₹)</Label>
              <Input 
                type="number"
                required 
                value={paymentForm.amount} 
                onChange={(e) => setPaymentForm({ ...paymentForm, amount: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Payment Mode</Label>
              <select
                value={paymentForm.mode}
                onChange={(e) => setPaymentForm({ ...paymentForm, mode: e.target.value })}
                className="w-full h-9 px-2 text-xs rounded border border-input bg-card"
              >
                <option value="bank_transfer">Bank Transfer (NEFT/RTGS)</option>
                <option value="upi">UPI / QR Code</option>
                <option value="cheque">Cheque</option>
                <option value="cash">Cash</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Transaction Reference / UTR</Label>
              <Input 
                value={paymentForm.reference} 
                onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRecordPaymentModalOpen(false)}>Cancel</Button>
              <Button type="submit" className="gradient-primary border-0">Record Payment</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: Add Expense */}
      <Dialog open={addExpenseModalOpen} onOpenChange={setAddExpenseModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Log Project Expense</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddExpense} className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Expense Category</Label>
              <select
                value={expenseForm.category}
                onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                className="w-full h-9 px-2 text-xs rounded border border-input bg-card"
              >
                <option value="Materials">Materials</option>
                <option value="Labor">Labor</option>
                <option value="Transport">Transport</option>
                <option value="Consultant">Consultant</option>
                <option value="Misc">Miscellaneous</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Description</Label>
              <Input 
                required 
                value={expenseForm.description} 
                onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                placeholder="e.g. Plywood transport crane charges"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Amount (₹)</Label>
              <Input 
                type="number"
                required 
                value={expenseForm.amount} 
                onChange={(e) => setExpenseForm({ ...expenseForm, amount: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddExpenseModalOpen(false)}>Cancel</Button>
              <Button type="submit" className="gradient-primary border-0">Log Expense</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: Post Project Update */}
      <Dialog open={postUpdateModalOpen} onOpenChange={setPostUpdateModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Post Project Story / Update</DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePostUpdate} className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Update Title</Label>
              <Input 
                required 
                value={updateForm.title} 
                onChange={(e) => setUpdateForm({ ...updateForm, title: e.target.value })}
                placeholder="e.g. Master Bedroom Woodwork Started!"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Photo URL</Label>
              <Input 
                value={updateForm.photoUrl} 
                onChange={(e) => setUpdateForm({ ...updateForm, photoUrl: e.target.value })}
                placeholder="https://images.unsplash.com/..."
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Description</Label>
              <Textarea 
                required 
                value={updateForm.content} 
                onChange={(e) => setUpdateForm({ ...updateForm, content: e.target.value })}
                placeholder="Describe progress made today for the client..."
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPostUpdateModalOpen(false)}>Cancel</Button>
              <Button type="submit" className="gradient-primary border-0">Publish Update</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
