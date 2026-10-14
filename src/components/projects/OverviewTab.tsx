"use client";

import { updateRoom,updateMilestone } from "@/app/actions/projects";
import { toast } from "@/components/ui/toast";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CheckCircle2, Circle, Plus } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { formatDate, cn } from "@/lib/utils";
import type { Project } from "@/types";

export default function OverviewTab({ project }: { project: Project }) {
  const { addRoomToProject, addMilestoneToProject, toggleMilestone, team } = useAppStore();
  const assignedTeam = team.filter((m) => m.id === project.director_id || m.id === project.manager_id || project.team?.some((pt) => pt.profile_id === m.id));

  const [editingRoom,setEditingRoom]=useState<string|null>(null),[editingMilestone,setEditingMilestone]=useState<string|null>(null),[busy,setBusy]=useState(false);
  const [addRoomModalOpen, setAddRoomModalOpen] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [roomSqft, setRoomSqft] = useState(250);

  const [addMilestoneModalOpen, setAddMilestoneModalOpen] = useState(false);
  const [milestoneTitle, setMilestoneTitle] = useState("");
  const [milestoneDate, setMilestoneDate] = useState("");

  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomName.trim()||busy) return;
    setBusy(true);
    const result = editingRoom ? await updateRoom({id:editingRoom,name:roomName,area_sqft:roomSqft>0?Number(roomSqft):null}) : await addRoomToProject(project.id, { name: roomName, area_sqft: Number(roomSqft), sort_order: (project.rooms?.length || 0) + 1 });
    setBusy(false);
    if (!result.ok){toast.add({title:"Could not save",description:result.error,type:"error"});return;}
    setRoomName("");
    setAddRoomModalOpen(false);
  };

  const handleAddMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!milestoneTitle.trim()||busy) return;
    setBusy(true);
    const result = editingMilestone ? await updateMilestone({id:editingMilestone,title:milestoneTitle,due_date:milestoneDate}) : await addMilestoneToProject(project.id, { title: milestoneTitle, due_date: milestoneDate });
    setBusy(false);
    if (!result.ok){toast.add({title:"Could not save",description:result.error,type:"error"});return;}
    setMilestoneTitle("");
    setMilestoneDate("");
    setAddMilestoneModalOpen(false);
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Rooms Manager */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Rooms & Scope ({project.rooms?.length || 0})</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => {setEditingRoom(null);setRoomName("");setRoomSqft(250);setAddRoomModalOpen(true);}} className="gap-1 text-xs text-primary">
                <Plus className="w-3.5 h-3.5" /> Add Room
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {project.rooms?.map((room) => (
              <div key={room.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <button type="button" className="text-sm font-medium hover:underline text-left" aria-label={`Edit room ${room.name}`} onClick={()=>{setEditingRoom(room.id);setRoomName(room.name);setRoomSqft(room.area_sqft??0);setAddRoomModalOpen(true);}}>{room.name}</button>
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
              <Button variant="ghost" size="sm" onClick={() => {setEditingMilestone(null);setMilestoneTitle("");setMilestoneDate("");setAddMilestoneModalOpen(true);}} className="gap-1 text-xs text-primary">
                <Plus className="w-3.5 h-3.5" /> Add
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {project.milestones?.map((ms) => (
              <div
                key={ms.id}

                className="flex items-start gap-2.5 py-2 border-b border-border last:border-0 cursor-pointer hover:bg-muted/30 rounded p-1 transition-colors"
              >
                <button type="button" aria-label={`${ms.completed_at?"Reopen":"Complete"} milestone ${ms.title}`} onClick={()=>toggleMilestone(project.id,ms.id)}>{ms.completed_at ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                ) : (
                  <Circle className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                )}</button>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-xs font-medium truncate", ms.completed_at ? "line-through text-muted-foreground" : "text-foreground")}>
                    {ms.title}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {ms.completed_at ? `Done ${formatDate(ms.completed_at)}` : ms.due_date ? `Due ${formatDate(ms.due_date)}` : "No target date"}
                  </p>
                  <Button size="sm" variant="ghost" onClick={()=>{setEditingMilestone(ms.id);setMilestoneTitle(ms.title);setMilestoneDate(ms.due_date??"");setAddMilestoneModalOpen(true);}}>Edit milestone</Button>
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
            {assignedTeam.length > 0 ? (
              assignedTeam.map((m) => (
                <div key={m.id} className="flex items-center gap-3 py-1">
                  <Avatar className="w-9 h-9">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                      {m.full_name.split(" ").map((n) => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-xs font-semibold text-foreground">{m.full_name}</p>
                    <p className="text-[10px] text-muted-foreground">{m.title || m.roles.join(", ")}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground py-2">No team members assigned yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* MODAL: Add Room */}
      <Dialog open={addRoomModalOpen} onOpenChange={setAddRoomModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Room / Area</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddRoom} className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Room Name</Label>
              <Input aria-label="Room Name"
                required
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="e.g. Master Bedroom, Balcony, Pooja Room"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Approximate Area (sqft)</Label>
              <Input aria-label="Approximate Area (sqft)"
                type="number"
                value={roomSqft}
                onChange={(e) => setRoomSqft(parseFloat(e.target.value) || 0)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddRoomModalOpen(false)}>Cancel</Button>
              <Button disabled={busy} type="submit" className="gradient-primary border-0">{editingRoom?"Save room":"Add room"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: Add Milestone */}
      <Dialog open={addMilestoneModalOpen} onOpenChange={setAddMilestoneModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingMilestone?"Edit milestone":"Add milestone"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddMilestone} className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Milestone Title</Label>
              <Input aria-label="Milestone Title"
                required
                value={milestoneTitle}
                onChange={(e) => setMilestoneTitle(e.target.value)}
                placeholder="e.g. Electrical Conduit Inspection"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Target Date</Label>
              <Input aria-label="Target Date"
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
    </>
  );
}
