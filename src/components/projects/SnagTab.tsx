"use client";

import React, { useState } from "react";
import { Snag, ProjectRoom, SnagStatus, SnagPriority } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatRelativeTime, formatDate, formatShortDate, getStatusColor, getPriorityColor, getInitials, cn } from "@/lib/utils";
import { AlertCircle, Camera, Check, Clock, Plus, ArrowRight, MessageSquare, ShieldCheck, Printer, CheckCircle2 } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { AssigneeSelect } from "@/components/team/AssigneeSelect";
import { PhotoInput } from "@/components/files/PhotoInput";

export default function SnagTab({ projectId, snags, rooms }: { projectId: string; snags: Snag[]; rooms: ProjectRoom[] }) {
  const { addSnag, updateSnagStatus, addSnagComment, studioSettings, projects } = useAppStore();
  const project = projects.find(p => p.id === projectId);

  const [filter, setFilter] = useState<"all" | "open" | "closed">("all");
  const [raiseModalOpen, setRaiseModalOpen] = useState(false);
  const [selectedSnagId, setSelectedSnagId] = useState<string | null>(null);
  const selectedSnag = snags.find((s) => s.id === selectedSnagId) ?? null;
  const [afterPhotoPath, setAfterPhotoPath] = useState("");
  const [handoverModalOpen, setHandoverModalOpen] = useState(false);

  // Form for raising snag
  const [newSnagForm, setNewSnagForm] = useState({
    title: "",
    description: "",
    room_id: rooms[0]?.id || "",
    location_detail: "",
    priority: "major" as SnagPriority,
    assigned_to: "",
    due_date: "",
    before_photo_url: ""
  });

  // State for adding a comment
  const [commentText, setCommentText] = useState("");

  const filteredSnags = snags.filter((s) => {
    if (filter === "open") return s.status !== "closed";
    if (filter === "closed") return s.status === "closed";
    return true;
  });

  const completionPercent = snags.length ? Math.round((snags.filter(s => s.status === "closed").length / snags.length) * 100) : 0;
  const isHandoverBlocked = completionPercent < 100;

  const handleRaiseSnagSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addSnag({
      project_id: projectId,
      room_id: newSnagForm.room_id || undefined,
      title: newSnagForm.title,
      description: newSnagForm.description,
      location_detail: newSnagForm.location_detail,
      priority: newSnagForm.priority,
      assigned_to: newSnagForm.assigned_to || undefined,
      due_date: newSnagForm.due_date || undefined,
      before_photo_url: newSnagForm.before_photo_url || undefined,
    });
    setRaiseModalOpen(false);
    setNewSnagForm({
      title: "",
      description: "",
      room_id: rooms[0]?.id || "",
      location_detail: "",
      priority: "major",
      assigned_to: "",
      due_date: "",
      before_photo_url: "",
    });
  };

  const handleStatusChange = (snag: Snag, nextStatus: SnagStatus) => {
    updateSnagStatus(snag.id, nextStatus, undefined, nextStatus === "fixed" ? afterPhotoPath || undefined : undefined);
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !selectedSnag) return;
    addSnagComment(selectedSnag.id, {
      author_id: 'user-1',
      author_name: 'Priya Sharma',
      content: commentText
    });
    setCommentText("");
  };

  return (
    <div className="space-y-6">
      {/* Stats & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4 bg-card border border-border rounded-xl px-4 py-2.5">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold">Completion: {completionPercent}%</span>
            <Progress value={completionPercent} className="h-2 w-28" />
          </div>
          <div className="hidden sm:block w-px h-6 bg-border" />
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span><strong className="text-foreground">{snags.length}</strong> Total</span>
            <span><strong className="text-amber-600">{snags.filter(s => s.status !== 'closed').length}</strong> Open</span>
            <span><strong className="text-green-600">{snags.filter(s => s.status === 'closed').length}</strong> Closed</span>
          </div>
          {isHandoverBlocked && snags.length > 0 ? (
            <>
              <div className="hidden sm:block w-px h-6 bg-border" />
              <Badge variant="destructive" className="gap-1 text-[10px]">
                <AlertCircle className="w-3 h-3" /> Handover Blocked
              </Badge>
            </>
          ) : snags.length > 0 ? (
            <>
              <div className="hidden sm:block w-px h-6 bg-border" />
              <Badge className="bg-emerald-100 text-emerald-800 border-0 gap-1 text-[10px]">
                <ShieldCheck className="w-3 h-3" /> Ready for Handover
              </Badge>
            </>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setHandoverModalOpen(true)}
            className="text-xs gap-1.5"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-primary" /> Handover Report
          </Button>

          <div className="flex rounded-lg border border-border overflow-hidden p-0.5 bg-card">
            {(["all", "open", "closed"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn("px-2.5 py-1 text-xs font-medium rounded-md capitalize transition-colors", filter === f ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/50")}
              >
                {f}
              </button>
            ))}
          </div>

          <Button size="sm" onClick={() => setRaiseModalOpen(true)} className="gradient-primary border-0 gap-1.5 text-xs">
            <Plus className="w-3.5 h-3.5" /> Raise Snag
          </Button>
        </div>
      </div>

      {/* Snag Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredSnags.map((snag) => (
          <Card 
            key={snag.id} 
            onClick={() => setSelectedSnagId(snag.id)} 
            className="card-hover cursor-pointer border-border hover:border-primary/50 transition-all"
          >
            <CardContent className="p-4 flex gap-4">
              {/* Photo thumbnail */}
              <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0 bg-muted border border-border relative">
                {snag.before_photo_url ? (
                  <img src={snag.before_photo_url} alt={snag.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                    <Camera className="w-6 h-6 mb-1 opacity-40" />
                    <span className="text-[10px]">No photo</span>
                  </div>
                )}
                {snag.after_photo_url && (
                  <span className="absolute bottom-1 right-1 bg-green-600 text-white text-[9px] px-1 py-0.2 rounded font-bold">
                    FIXED
                  </span>
                )}
              </div>
              
              <div className="flex-1 min-w-0 flex flex-col">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h4 className="font-semibold text-sm text-foreground truncate">{snag.title}</h4>
                  <Badge className={cn("text-[10px] px-1.5 py-0 border-0 uppercase flex-shrink-0", getStatusColor(snag.status))}>
                    {snag.status.replace('_', ' ')}
                  </Badge>
                </div>
                
                <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1.5 truncate">
                  <span className="font-medium text-foreground">{snag.room_name}</span>
                  <span className="text-[10px]">·</span>
                  <span className="truncate">{snag.location_detail}</span>
                </p>

                <div className="mt-auto flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Avatar className="w-6 h-6 border border-border">
                      <AvatarFallback className="text-[10px] bg-slate-100 font-semibold">{getInitials(snag.assigned_to_name || 'Unassigned')}</AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium truncate max-w-[100px]">
                      {snag.assigned_to_name || 'Unassigned'}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium border", getPriorityColor(snag.priority))}>
                      {snag.priority}
                    </span>
                    {snag.due_date && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatShortDate(snag.due_date)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredSnags.length === 0 && (
          <div className="col-span-full py-12 text-center text-muted-foreground border-2 border-dashed border-border rounded-xl">
            <Check className="w-8 h-8 mx-auto mb-2 text-green-500 opacity-50" />
            <p className="font-medium text-sm">No {filter !== 'all' ? filter : ''} snags found</p>
          </div>
        )}
      </div>

      {/* MODAL: Raise Snag */}
      <Dialog open={raiseModalOpen} onOpenChange={setRaiseModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Raise New Snag</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRaiseSnagSubmit} className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Snag Title</Label>
              <Input 
                required 
                value={newSnagForm.title} 
                onChange={(e) => setNewSnagForm({ ...newSnagForm, title: e.target.value })}
                placeholder="e.g. Tile grout crack near shower enclosure"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Room / Area</Label>
                <select
                  value={newSnagForm.room_id}
                  onChange={(e) => setNewSnagForm({ ...newSnagForm, room_id: e.target.value })}
                  className="w-full h-9 px-2 text-xs rounded border border-input bg-card"
                >
                  {rooms.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Priority</Label>
                <select
                  value={newSnagForm.priority}
                  onChange={(e) => setNewSnagForm({ ...newSnagForm, priority: e.target.value as SnagPriority })}
                  className="w-full h-9 px-2 text-xs rounded border border-input bg-card"
                >
                  <option value="critical">Critical 🔴</option>
                  <option value="major">Major 🟡</option>
                  <option value="minor">Minor 🟢</option>
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Specific Location Detail</Label>
              <Input 
                value={newSnagForm.location_detail} 
                onChange={(e) => setNewSnagForm({ ...newSnagForm, location_detail: e.target.value })}
                placeholder="e.g. Master toilet east wall, 2ft above skirting"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Assignee</Label>
                <AssigneeSelect 
                  value={newSnagForm.assigned_to} 
                  onChange={(v) => setNewSnagForm({ ...newSnagForm, assigned_to: v })} 
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Rectification Due Date</Label>
                <Input 
                  type="date"
                  value={newSnagForm.due_date} 
                  onChange={(e) => setNewSnagForm({ ...newSnagForm, due_date: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1">
              <PhotoInput 
                projectId={projectId} 
                label="Before photo" 
                onUploaded={(p) => setNewSnagForm({ ...newSnagForm, before_photo_url: p })} 
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Detailed Description</Label>
              <Textarea 
                value={newSnagForm.description} 
                onChange={(e) => setNewSnagForm({ ...newSnagForm, description: e.target.value })}
                placeholder="Detailed explanation of the issue to be fixed..."
                rows={2}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRaiseModalOpen(false)}>Cancel</Button>
              <Button type="submit" className="gradient-primary border-0">Submit Snag</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: Snag Detail & Status Progression */}
      {selectedSnag && (
        <Dialog open={!!selectedSnag} onOpenChange={() => setSelectedSnagId(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle className="text-base font-bold">{selectedSnag.title}</DialogTitle>
                <Badge className={cn("border-0 uppercase text-[10px]", getStatusColor(selectedSnag.status))}>
                  {selectedSnag.status.replace('_', ' ')}
                </Badge>
              </div>
            </DialogHeader>

            <div className="space-y-4">
              {/* Status Progression Bar */}
              <div className="p-3 bg-muted/40 rounded-xl">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Workflow Progression
                </p>
                <div className="flex items-center justify-between text-xs">
                  {(['raised', 'assigned', 'in_progress', 'fixed', 'verified', 'closed'] as SnagStatus[]).map((st, i, arr) => {
                    const isPassed = arr.indexOf(selectedSnag.status) >= i;
                    const isCurrent = selectedSnag.status === st;
                    return (
                      <div key={st} className="flex items-center gap-1.5">
                        <div className={cn(
                          "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all",
                          isCurrent ? "bg-primary text-white scale-110 shadow" :
                          isPassed ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"
                        )}>
                          {isPassed ? "✓" : i + 1}
                        </div>
                        <span className={cn("capitalize hidden sm:inline text-[11px]", isCurrent ? "font-bold text-foreground" : "text-muted-foreground")}>
                          {st.replace('_', ' ')}
                        </span>
                        {i < arr.length - 1 && <ArrowRight className="w-3 h-3 text-muted-foreground/40 hidden sm:inline" />}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Before & After Photo Comparison */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-foreground">Before Photo (Raised)</span>
                  <div className="h-44 rounded-lg bg-muted overflow-hidden border border-border">
                    {selectedSnag.before_photo_url ? (
                      <img src={selectedSnag.before_photo_url} alt="Before" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">No Before Photo</div>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-foreground">After Photo (Rectified)</span>
                  <div className="h-44 rounded-lg bg-muted overflow-hidden border border-border relative">
                    {selectedSnag.after_photo_url ? (
                      <img src={selectedSnag.after_photo_url} alt="After" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground text-xs p-4 text-center">
                        <Camera className="w-6 h-6 mb-1 opacity-40" />
                        <span>Awaiting rectification photo from contractor</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <PhotoInput projectId={projectId} label="After photo" onUploaded={setAfterPhotoPath} />
              </div>
              {/* Action Buttons for advancing status */}
              <div className="flex flex-wrap items-center justify-between p-3 bg-muted/20 border rounded-lg gap-2">
                <span className="text-xs text-muted-foreground">Quick Action Controls:</span>
                <div className="flex flex-wrap items-center gap-2">
                  {selectedSnag.status === 'raised' && (
                    <Button size="sm" onClick={() => handleStatusChange(selectedSnag, 'assigned')} className="text-xs">
                      Assign to Vendor
                    </Button>
                  )}
                  {selectedSnag.status === 'assigned' && (
                    <Button size="sm" onClick={() => handleStatusChange(selectedSnag, 'in_progress')} className="text-xs">
                      Start Progress
                    </Button>
                  )}
                  {selectedSnag.status === 'in_progress' && (
                    <Button size="sm" onClick={() => handleStatusChange(selectedSnag, 'fixed')} className="text-xs bg-amber-600 hover:bg-amber-700 text-white border-0">
                      Mark as Fixed (Attach After Photo)
                    </Button>
                  )}
                  {selectedSnag.status === 'fixed' && (
                    <Button size="sm" onClick={() => handleStatusChange(selectedSnag, 'verified')} className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white border-0">
                      Verify Fix (Designer Sign-off)
                    </Button>
                  )}
                  {selectedSnag.status === 'verified' && (
                    <Button size="sm" onClick={() => handleStatusChange(selectedSnag, 'closed')} className="text-xs bg-green-600 hover:bg-green-700 text-white border-0">
                      Client Close & Sign-off
                    </Button>
                  )}
                </div>
              </div>

              {/* Comments Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <MessageSquare className="w-3.5 h-3.5" /> Comments & Resolution Log
                </div>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {selectedSnag.comments?.map(c => (
                    <div key={c.id} className="p-2.5 rounded bg-muted/40 text-xs space-y-1">
                      <div className="flex justify-between font-semibold">
                        <span>{c.author_name}</span>
                        <span className="text-muted-foreground font-normal">{formatDate(c.created_at)}</span>
                      </div>
                      <p className="text-muted-foreground">{c.content}</p>
                    </div>
                  ))}
                </div>
                <form onSubmit={handleAddComment} className="flex gap-2">
                  <Input 
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Add a remark or update note..." 
                    className="text-xs h-8"
                  />
                  <Button type="submit" size="sm" className="h-8 text-xs">Post</Button>
                </form>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedSnagId(null)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* MODAL: Handover Report Generator */}
      <Dialog open={handoverModalOpen} onOpenChange={setHandoverModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Project Handover Certificate & Snag Summary</DialogTitle>
          </DialogHeader>
          <div className="p-6 bg-white text-slate-800 rounded-lg border border-slate-200 space-y-5 print:p-0">
            {/* Header */}
            <div className="flex justify-between items-start border-b pb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{studioSettings.name}</h2>
                <p className="text-xs text-slate-500">Official Project Handover & Completion Certificate</p>
                <p className="text-xs text-slate-500">{studioSettings.address}</p>
              </div>
              <div className="text-right">
                <span className="px-2.5 py-1 rounded text-xs font-bold bg-green-100 text-green-800">
                  {completionPercent === 100 ? "HANDOVER APPROVED" : "INSPECTION DRAFT"}
                </span>
                <p className="text-xs text-slate-500 mt-2">Date: {formatDate(new Date())}</p>
                <p className="text-xs text-slate-500">Ref: {project?.reference_number}</p>
              </div>
            </div>

            {/* Project Summary */}
            <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 rounded text-xs">
              <div>
                <span className="text-slate-500 block">Project:</span>
                <strong className="text-slate-900">{project?.name}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Client:</span>
                <strong className="text-slate-900">{project?.client_name}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Property Address:</span>
                <span className="text-slate-700">{project?.property_address || "Bengaluru"}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Lead Designer:</span>
                <span className="text-slate-700">Priya Sharma</span>
              </div>
            </div>

            {/* Snag Resolution Table */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">Snag Rectification Audit</h4>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-slate-100">
                    <th className="p-2 text-left">Item Title</th>
                    <th className="p-2 text-left">Area</th>
                    <th className="p-2 text-center">Priority</th>
                    <th className="p-2 text-center">Status</th>
                    <th className="p-2 text-right">Resolved On</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {snags.map(s => (
                    <tr key={s.id}>
                      <td className="p-2 font-medium">{s.title}</td>
                      <td className="p-2 text-slate-500">{s.room_name}</td>
                      <td className="p-2 text-center capitalize">{s.priority}</td>
                      <td className="p-2 text-center">
                        <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-bold uppercase", s.status === 'closed' ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800")}>
                          {s.status}
                        </span>
                      </td>
                      <td className="p-2 text-right text-slate-500">{s.client_closed_at ? formatDate(s.client_closed_at) : "In Progress"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-2 gap-8 pt-8 border-t text-xs">
              <div className="space-y-8">
                <p className="text-slate-500">Design Studio Sign-off:</p>
                <div className="border-t border-slate-300 pt-1 font-semibold">
                  Priya Sharma, Principal Designer
                </div>
              </div>
              <div className="space-y-8">
                <p className="text-slate-500">Client Acceptance & Handover Signature:</p>
                <div className="border-t border-slate-300 pt-1 font-semibold">
                  {project?.client_name} (Property Owner)
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHandoverModalOpen(false)}>Close</Button>
            <Button onClick={() => window.print()} className="gap-2 gradient-primary border-0">
              <Printer className="w-4 h-4" /> Print / Save Handover Certificate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
