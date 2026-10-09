"use client";

import { useState } from "react";
import { use, Suspense } from "react";
import { useAppStore } from "@/lib/store";
import { PhotoInput } from "@/components/files/PhotoInput";
import { formatDate, getPriorityColor, getStatusColor, cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  CheckCircle2, Plus, AlertCircle, Camera, Check, Clock, Sparkles
} from "lucide-react";
import { Snag, SnagPriority } from "@/types";

export default function PortalSnagsPage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading snags...</div>}>
      <PortalSnagsContent params={params} />
    </Suspense>
  );
}

function PortalSnagsContent({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { projects, snags, addSnag, updateSnagStatus, addSnagComment } = useAppStore();

  const project = projects.find((p) => p.portal_slug === slug);
  const projectSnags = snags.filter((s) => s.project_id === project?.id);

  const [activeFilter, setActiveFilter] = useState<"all" | "open" | "fixed" | "closed">("all");
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedSnag, setSelectedSnag] = useState<Snag | null>(null);

  // New Snag form state
  const [room, setRoom] = useState(project?.rooms?.[0]?.name || "Living Room");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<SnagPriority>("major");
  const [photoUrl, setPhotoUrl] = useState("");

  if (!project) {
    return <div className="p-8 text-center text-muted-foreground">Project not found.</div>;
  }

  const filteredSnags = projectSnags.filter((s) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "open") return !["fixed", "verified", "closed"].includes(s.status);
    if (activeFilter === "fixed") return ["fixed", "verified"].includes(s.status);
    if (activeFilter === "closed") return s.status === "closed";
    return true;
  });

  const openCount = projectSnags.filter((s) => !["closed", "verified"].includes(s.status)).length;
  const fixedCount = projectSnags.filter((s) => ["fixed", "verified"].includes(s.status)).length;

  const handleCreateSnag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    const roomObj = project.rooms?.find(r => r.name === room);
    addSnag({
      project_id: project.id,
      room_id: roomObj?.id,
      title: description.slice(0, 50),
      description,
      priority,
      before_photo_url: photoUrl || undefined,
    });

    setDescription("");
    setPhotoUrl("");
    setShowReportModal(false);
  };

  const handleCloseSnag = (snagId: string) => {
    updateSnagStatus(snagId, "closed", "Client");
    setSelectedSnag(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Snag List & Quality Checks</h1>
          <p className="text-sm text-muted-foreground">
            Track touch-ups, defect fixes, and final handover verification items.
          </p>
        </div>
        <Button
          onClick={() => setShowReportModal(true)}
          className="gradient-primary border-0 text-white gap-2 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Report an Issue
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Raised</p>
            <p className="text-2xl font-bold text-foreground mt-1">{projectSnags.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Pending Resolution</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{openCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Ready for Sign-off</p>
            <p className="text-2xl font-bold text-indigo-600 mt-1">{fixedCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Closed / Verified</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">
              {projectSnags.filter((s) => s.status === "closed").length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-border pb-2">
        {(
          [
            { key: "all", label: `All (${projectSnags.length})` },
            { key: "open", label: `Open (${openCount})` },
            { key: "fixed", label: `Fixed / Verify (${fixedCount})` },
            { key: "closed", label: `Closed (${projectSnags.filter((s) => s.status === "closed").length})` },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveFilter(tab.key)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
              activeFilter === tab.key
                ? "bg-slate-900 text-white"
                : "text-muted-foreground hover:bg-slate-100 hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Snag List */}
      <div className="space-y-3">
        {filteredSnags.map((snag) => (
          <Card
            key={snag.id}
            onClick={() => setSelectedSnag(snag)}
            className="cursor-pointer hover:border-indigo-200 transition-all shadow-sm"
          >
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  {snag.before_photo_url ? (
                    <img
                      src={snag.before_photo_url}
                      alt={snag.room_name}
                      className="w-16 h-16 rounded-lg object-cover flex-shrink-0 border border-border"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 text-slate-400">
                      <Camera className="w-6 h-6 opacity-40" />
                    </div>
                  )}

                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <Badge variant="outline" className="font-semibold text-xs">
                        {snag.room_name}
                      </Badge>
                      <Badge className={cn("text-[10px] border-0", getPriorityColor(snag.priority))}>
                        {snag.priority}
                      </Badge>
                      <Badge className={cn("text-[10px] border-0", getStatusColor(snag.status))}>
                        {snag.status.replace("_", " ")}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium text-foreground leading-snug">
                      {snag.description}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Reported {formatDate(snag.created_at)}
                    </p>
                  </div>
                </div>

                <div className="flex sm:flex-col items-end justify-between sm:justify-start gap-2">
                  {["fixed", "verified"].includes(snag.status) && (
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCloseSnag(snag.id);
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" /> Confirm Fixed
                    </Button>
                  )}
                  {snag.status === "closed" && (
                    <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Verified & Closed
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredSnags.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border border-border">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-60" />
            <p className="text-sm font-semibold text-foreground">No snags found</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Everything in this category is smooth and verified.
            </p>
          </div>
        )}
      </div>

      {/* Report Snag Dialog */}
      <Dialog open={showReportModal} onOpenChange={setShowReportModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Report an Issue or Snag</DialogTitle>
            <DialogDescription>
              Notice a scratch, loose fit, or touch-up needed? Tell the design team and we will fix it.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSnag} className="space-y-4 py-2">
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">Select Room *</label>
              <select
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                className="w-full text-sm border border-input rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {project.rooms && project.rooms.length > 0 ? (
                  project.rooms.map((r) => (
                    <option key={r.id} value={r.name}>
                      {r.name}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="Living Room">Living Room</option>
                    <option value="Master Bedroom">Master Bedroom</option>
                    <option value="Kitchen">Kitchen</option>
                    <option value="Balcony">Balcony</option>
                    <option value="Bathroom">Bathroom</option>
                  </>
                )}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">Priority</label>
              <div className="grid grid-cols-3 gap-2">
                {(["minor", "major", "critical"] as const).map((p) => (
                  <button
                    type="button"
                    key={p}
                    onClick={() => setPriority(p)}
                    className={cn(
                      "text-xs py-1.5 rounded-md border text-center capitalize transition-colors font-medium",
                      priority === p
                        ? "border-primary bg-primary text-white"
                        : "border-border hover:bg-slate-50 text-foreground"
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">Issue Description *</label>
              <Textarea
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., Soft-close hinge on the left wardrobe shutter is sticking slightly."
                rows={3}
              />
            </div>

            <div>
              <PhotoInput projectId={project.id} label="Photo of the issue" onUploaded={setPhotoUrl} />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowReportModal(false)}>
                Cancel
              </Button>
              <Button type="submit" className="gradient-primary border-0 text-white">
                Submit Snag
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Snag Detail Dialog */}
      {selectedSnag && (
        <Dialog open={!!selectedSnag} onOpenChange={(open) => !open && setSelectedSnag(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline">{selectedSnag.room_name}</Badge>
                <Badge className={cn("text-xs border-0", getStatusColor(selectedSnag.status))}>
                  {selectedSnag.status.replace("_", " ")}
                </Badge>
              </div>
              <DialogTitle className="text-lg">{selectedSnag.description}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Photo Comparison */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1.5">Original Issue Photo</p>
                  {selectedSnag.before_photo_url ? (
                    <img
                      src={selectedSnag.before_photo_url}
                      alt="Before"
                      className="w-full h-36 rounded-lg object-cover border border-border"
                    />
                  ) : (
                    <div className="w-full h-36 rounded-lg bg-slate-100 flex items-center justify-center text-xs text-muted-foreground">
                      No photo provided
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1.5">Resolution / Fixed Photo</p>
                  {selectedSnag.after_photo_url ? (
                    <img
                      src={selectedSnag.after_photo_url}
                      alt="After"
                      className="w-full h-36 rounded-lg object-cover border border-emerald-300"
                    />
                  ) : (
                    <div className="w-full h-36 rounded-lg bg-slate-100 flex items-center justify-center text-xs text-muted-foreground">
                      Fix in progress
                    </div>
                  )}
                </div>
              </div>

              {/* Status Action */}
              {["fixed", "verified"].includes(selectedSnag.status) && (
                <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                  <p className="text-xs font-semibold text-emerald-900 mb-1">The designer marked this as fixed!</p>
                  <p className="text-xs text-emerald-700 mb-3">
                    Please inspect this on site or check the photo. If satisfactory, click below to mark verified.
                  </p>
                  <Button
                    size="sm"
                    onClick={() => handleCloseSnag(selectedSnag.id)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white w-full gap-2"
                  >
                    <Check className="w-4 h-4" /> I Confirm This Is Resolved (Close Snag)
                  </Button>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedSnag(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
