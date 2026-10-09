"use client";

import { useState } from "react";
import { TopBar } from "@/components/layout/AppSidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  CheckSquare, Plus, Clock, AlertCircle, Trash2, Calendar, CheckCircle2,
  FolderKanban, User, Filter
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { formatShortDate, getPriorityColor, isOverdue, cn } from "@/lib/utils";
import { Task, TaskPriority, TaskStatus } from "@/types";
import { AssigneeSelect } from "@/components/team/AssigneeSelect";

export default function TasksPage() {
  const { tasks, projects, addTask, updateTaskStatus, deleteTask } = useAppStore();

  const [activeTab, setActiveTab] = useState<"all" | "todo" | "in_progress" | "done" | "overdue">("all");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const [selectedPriority, setSelectedPriority] = useState<string>("all");
  const [search, setSearch] = useState("");

  // Add Task Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskProject, setTaskProject] = useState(projects[0]?.id || "");
  const [taskAssignee, setTaskAssignee] = useState("");
  const [taskPriority, setTaskPriority] = useState<TaskPriority>("medium");
  const [taskDueDate, setTaskDueDate] = useState("");

  const filteredTasks = tasks.filter((t) => {
    // Project filter
    if (selectedProjectId !== "all" && t.project_id !== selectedProjectId) return false;
    // Priority filter
    if (selectedPriority !== "all" && t.priority !== selectedPriority) return false;
    // Search
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    // Tab
    if (activeTab === "all") return true;
    if (activeTab === "todo") return t.status === "todo";
    if (activeTab === "in_progress") return t.status === "in_progress";
    if (activeTab === "done") return t.status === "done";
    if (activeTab === "overdue") return !!t.due_date && isOverdue(t.due_date) && t.status !== "done";
    return true;
  });

  const todoCount = tasks.filter((t) => t.status === "todo").length;
  const inProgressCount = tasks.filter((t) => t.status === "in_progress").length;
  const overdueCount = tasks.filter((t) => !!t.due_date && isOverdue(t.due_date) && t.status !== "done").length;
  const doneCount = tasks.filter((t) => t.status === "done").length;

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    addTask({
      project_id: taskProject,
      title: taskTitle.trim(),
      assigned_to: taskAssignee || undefined,
      priority: taskPriority,
      due_date: taskDueDate || undefined,
      is_internal: true,
    });

    setTaskTitle("");
    setTaskDueDate("");
    setTaskAssignee("");
    setShowAddModal(false);
  };

  const toggleTaskDone = (task: Task) => {
    const newStatus: TaskStatus = task.status === "done" ? "todo" : "done";
    updateTaskStatus(task.id, newStatus);
  };

  return (
    <div>
      <TopBar title="Task Management" subtitle="Daily standup, site checklists, and team assignments" />
      <div className="p-6">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground font-medium">To Do</p>
              <p className="text-2xl font-bold text-foreground mt-1">{todoCount}</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground font-medium">In Progress</p>
              <p className="text-2xl font-bold text-indigo-600 mt-1">{inProgressCount}</p>
            </CardContent>
          </Card>
          <Card className={cn("shadow-sm", overdueCount > 0 ? "border-red-200 bg-red-50/50" : "")}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground font-medium">Overdue</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{overdueCount}</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground font-medium">Completed</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{doneCount}</p>
            </CardContent>
          </Card>
        </div>

        {/* Toolbar & Filters */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 mb-6">
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Tabs */}
            <div className="flex rounded-lg border border-border bg-card p-1">
              {(
                [
                  { key: "all", label: "All" },
                  { key: "todo", label: "To Do" },
                  { key: "in_progress", label: "In Progress" },
                  { key: "overdue", label: `Overdue (${overdueCount})` },
                  { key: "done", label: "Done" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "px-3 py-1.5 text-xs rounded-md capitalize font-medium transition-colors",
                    activeTab === tab.key
                      ? "bg-slate-900 text-white shadow-xs"
                      : "hover:bg-muted text-muted-foreground"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Project Filter */}
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="text-xs border border-input rounded-md px-2.5 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="all">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            {/* Priority Filter */}
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="text-xs border border-input rounded-md px-2.5 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="all">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          <Button
            onClick={() => setShowAddModal(true)}
            className="gap-2 gradient-primary border-0 text-white shadow-sm"
          >
            <Plus className="w-4 h-4" /> Add Task
          </Button>
        </div>

        {/* Task List */}
        <div className="space-y-2.5">
          {filteredTasks.map((task) => {
            const isDone = task.status === "done";
            const taskIsOverdue = !!task.due_date && isOverdue(task.due_date) && !isDone;

            return (
              <Card
                key={task.id}
                className={cn(
                  "shadow-xs hover:border-indigo-200 transition-all",
                  isDone ? "bg-slate-50/60 opacity-80" : "bg-white"
                )}
              >
                <CardContent className="p-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3.5 flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={() => toggleTaskDone(task)}
                      className={cn(
                        "w-5 h-5 rounded-md border flex items-center justify-center transition-colors cursor-pointer",
                        isDone
                          ? "bg-emerald-600 border-emerald-600 text-white"
                          : "border-slate-300 hover:border-indigo-600 text-transparent"
                      )}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </button>

                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "text-sm font-medium truncate",
                          isDone ? "line-through text-muted-foreground" : "text-foreground"
                        )}
                      >
                        {task.title}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        <span className="flex items-center gap-1 truncate max-w-[200px]">
                          <FolderKanban className="w-3 h-3" /> {task.project_name}
                        </span>
                        {task.assigned_to && (
                          <span className="hidden sm:flex items-center gap-1">
                            <User className="w-3 h-3" /> {task.assigned_to}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <Badge className={cn("border-0 text-[10px] capitalize", getPriorityColor(task.priority))}>
                      {task.priority}
                    </Badge>

                    {task.due_date && (
                      <span
                        className={cn(
                          "text-xs flex items-center gap-1 font-medium",
                          taskIsOverdue ? "text-red-500 font-semibold" : "text-muted-foreground"
                        )}
                      >
                        {taskIsOverdue ? (
                          <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                        ) : (
                          <Clock className="w-3.5 h-3.5" />
                        )}
                        {formatShortDate(task.due_date)}
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => deleteTask(task.id)}
                      className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Delete task"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {filteredTasks.length === 0 && (
            <div className="py-16 text-center text-muted-foreground bg-white rounded-xl border border-border">
              <CheckSquare className="w-10 h-10 opacity-30 mx-auto mb-2" />
              <p className="text-sm font-semibold text-foreground">No tasks in this view</p>
              <p className="text-xs mt-0.5">All clear or no tasks match your filters.</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Task Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Task</DialogTitle>
            <DialogDescription>
              Assign deliverables, site inspections, and follow-ups.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateTask} className="space-y-4 py-2">
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">Task Title *</label>
              <Input
                required
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="e.g. Inspect plumbing rough-ins with site contractor"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">Associated Project *</label>
              <select
                value={taskProject}
                onChange={(e) => setTaskProject(e.target.value)}
                className="w-full text-sm border border-input rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">Assignee</label>
                <AssigneeSelect
                  value={taskAssignee}
                  onChange={setTaskAssignee}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">Due Date *</label>
                <Input
                  type="date"
                  required
                  value={taskDueDate}
                  onChange={(e) => setTaskDueDate(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">Priority</label>
              <div className="grid grid-cols-4 gap-2">
                {(["low", "medium", "high", "urgent"] as const).map((p) => (
                  <button
                    type="button"
                    key={p}
                    onClick={() => setTaskPriority(p as TaskPriority)}
                    className={cn(
                      "text-xs py-1.5 rounded-md border text-center capitalize transition-colors font-medium",
                      taskPriority === p
                        ? "border-primary bg-primary text-white"
                        : "border-border hover:bg-slate-50 text-foreground"
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
                Cancel
              </Button>
              <Button type="submit" className="gradient-primary border-0 text-white">
                Create Task
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
