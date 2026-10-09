"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { formatShortDate, cn, isOverdue } from "@/lib/utils";
import type { Project, Task, TaskPriority } from "@/types";

export default function TasksTab({ project, tasks }: { project: Project; tasks: Task[] }) {
  const { addTask, updateTaskStatus } = useAppStore();

  const [addTaskModalOpen, setAddTaskModalOpen] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: "",
    priority: "medium" as TaskPriority,
    due_date: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
    assigned_to_name: "Priya Sharma",
  });

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

  return (
    <>
      <div className="flex justify-between items-center">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Project Kanban Board</span>
        <Button size="sm" onClick={() => setAddTaskModalOpen(true)} className="gradient-primary border-0 gap-1.5 text-xs">
          <Plus className="w-3.5 h-3.5" /> Add Task
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(["todo", "in_progress", "done"] as const).map((status) => {
          const colTasks = tasks.filter((t) => t.status === status);
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
    </>
  );
}
