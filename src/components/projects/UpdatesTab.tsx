"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, ThumbsUp, Heart } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { formatDate } from "@/lib/utils";
import { PhotoInput } from "@/components/files/PhotoInput";
import type { Project, ProjectUpdate } from "@/types";

export default function UpdatesTab({
  project,
  updates,
}: {
  project: Project;
  updates: ProjectUpdate[];
}) {
  const { addProjectUpdate, toggleUpdateReaction } = useAppStore();

  const [postUpdateModalOpen, setPostUpdateModalOpen] = useState(false);
  const [updateForm, setUpdateForm] = useState({
    title: "",
    content: "",
    photoUrl: "",
  });

  const handlePostUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await addProjectUpdate({
      project_id: project.id,
      title: updateForm.title,
      content: updateForm.content,
      photos: updateForm.photoUrl ? [updateForm.photoUrl] : [],
    });
    if (r.ok) {
      setUpdateForm({ title: "", content: "", photoUrl: "" });
      setPostUpdateModalOpen(false);
    }
  };

  return (
    <>
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
              <PhotoInput
                projectId={project.id}
                label="Site photo"
                onUploaded={(p) => setUpdateForm({ ...updateForm, photoUrl: p })}
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
    </>
  );
}
