"use client";

import { use, Suspense } from "react";
import Link from "next/link";
import { useAppStore } from "@/lib/store";
import { formatRelativeTime, getStatusColor, cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, ThumbsUp, MapPin, Ruler, CheckCircle2, Circle, ArrowRight } from "lucide-react";
import { PROJECT_STAGES, PROJECT_STAGE_LABELS } from "@/types";

export default function PortalOverviewPage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading overview...</div>}>
      <PortalOverviewContent params={params} />
    </Suspense>
  );
}

function PortalOverviewContent({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { projects, projectUpdates, toggleUpdateReaction, boqs, snags } = useAppStore();

  const project = projects.find((p) => p.portal_slug === slug);
  if (!project) return null;

  const updates = projectUpdates.filter((u) => u.project_id === project.id);
  const currentStageIndex = PROJECT_STAGES.indexOf(project.status);

  // Check pending actions
  const pendingBOQ = boqs.find((b) => b.project_id === project.id && b.status === "submitted");
  const pendingSnags = snags.filter((s) => s.project_id === project.id && ["fixed", "verified"].includes(s.status));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Project Overview</h1>

      {/* Main Status Card */}
      <Card className="border-0 shadow-md bg-white">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Current Status</p>
              <div className="flex items-center gap-3">
                <Badge className={cn("text-sm px-3 py-1 border-0", getStatusColor(project.status))}>
                  {PROJECT_STAGE_LABELS[project.status]}
                </Badge>
                <span className="text-sm font-medium">{project.progress_percent}% Complete</span>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-slate-600" />
                </div>
                <div className="hidden sm:block">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Location</p>
                  <p className="text-sm font-medium max-w-[150px] truncate">{project.property_address}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                  <Ruler className="w-4 h-4 text-slate-600" />
                </div>
                <div className="hidden sm:block">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Area</p>
                  <p className="text-sm font-medium">{project.area_sqft} sqft</p>
                </div>
              </div>
            </div>
          </div>

          <Progress value={project.progress_percent} className="h-3 mb-6" />

          {/* Simple Pipeline */}
          <div className="hidden md:flex justify-between relative mt-8">
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-100 -z-10 -translate-y-1/2" />

            {PROJECT_STAGES.map((stage, idx) => {
              const isPast = idx < currentStageIndex;
              const isCurrent = idx === currentStageIndex;

              // Only show key stages for client simplicity
              if (["lead", "consultation"].includes(stage)) return null;

              return (
                <div key={stage} className="flex flex-col items-center gap-2 bg-white px-2">
                  <div
                    className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center border-2 text-[10px]",
                      isPast
                        ? "bg-indigo-500 border-indigo-500 text-white"
                        : isCurrent
                        ? "bg-white border-indigo-500 text-indigo-500 shadow-[0_0_0_4px_rgba(99,102,241,0.1)]"
                        : "bg-white border-slate-200 text-transparent"
                    )}
                  >
                    {isPast && <CheckCircle2 className="w-4 h-4" />}
                  </div>
                  <span
                    className={cn(
                      "text-xs font-medium",
                      isCurrent ? "text-indigo-600 font-semibold" : isPast ? "text-slate-700" : "text-slate-400"
                    )}
                  >
                    {PROJECT_STAGE_LABELS[stage]}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Project Feed */}
        <div className="md:col-span-2 space-y-4">
          <h2 className="text-lg font-bold text-foreground mb-4">Project Updates & Site Stories</h2>

          {updates.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-xl border border-border">
              <p className="text-muted-foreground text-sm">No updates posted yet.</p>
            </div>
          ) : (
            updates.map((update) => (
              <Card key={update.id} className="border-0 shadow-sm overflow-hidden bg-white">
                <CardContent className="p-0">
                  {/* Photo Display */}
                  {update.photos && update.photos.length > 0 ? (
                    <div className="w-full h-56 bg-slate-900 overflow-hidden">
                      <img
                        src={update.photos[0]}
                        alt={update.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-full h-40 bg-gradient-to-r from-slate-100 to-indigo-50/50 flex items-center justify-center border-b border-border">
                      <p className="text-slate-400 text-sm">📸 Site Progress Attachment</p>
                    </div>
                  )}

                  <div className="p-5">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-lg text-foreground">{update.title}</h3>
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeTime(update.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                      {update.content}
                    </p>

                    <div className="flex items-center gap-4 pt-3 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => toggleUpdateReaction(update.id, "like")}
                        className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-indigo-600 transition-colors"
                      >
                        <ThumbsUp className="w-4 h-4 text-indigo-500" /> {update.likes} Likes
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleUpdateReaction(update.id, "love")}
                        className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-pink-600 transition-colors"
                      >
                        <Heart className="w-4 h-4 text-pink-500 fill-pink-500" /> {update.loved} Loved
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Milestones Sidebar */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-foreground mb-4">Key Milestones</h2>
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-5">
              <div className="space-y-4">
                {project.milestones?.map((ms, i) => (
                  <div key={ms.id} className="flex gap-3 relative">
                    {i !== project.milestones!.length - 1 && (
                      <div className="absolute left-2.5 top-6 bottom-[-16px] w-px bg-slate-100" />
                    )}
                    <div className="mt-0.5">
                      {ms.completed_at ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 bg-white" />
                      ) : (
                        <Circle className="w-5 h-5 text-slate-200 bg-white" />
                      )}
                    </div>
                    <div>
                      <p
                        className={cn(
                          "text-sm font-medium",
                          ms.completed_at ? "text-slate-900" : "text-slate-500"
                        )}
                      >
                        {ms.title}
                      </p>
                      {ms.completed_at && (
                        <p className="text-xs text-emerald-600 mt-0.5 font-medium">Completed</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Pending Actions Alert */}
          {(pendingBOQ || pendingSnags.length > 0) && (
            <Card className="border-orange-200 bg-orange-50 shadow-sm">
              <CardContent className="p-5">
                <h3 className="font-bold text-orange-800 mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                  Action Required
                </h3>
                <ul className="text-sm text-orange-700 space-y-2 list-disc list-inside">
                  {pendingBOQ && (
                    <li>
                      <Link
                        href={`/portal/${slug}/boq`}
                        className="underline hover:text-orange-900 font-medium"
                      >
                        Approve updated BOQ v{pendingBOQ.version_number}
                      </Link>
                    </li>
                  )}
                  {pendingSnags.length > 0 && (
                    <li>
                      <Link
                        href={`/portal/${slug}/snags`}
                        className="underline hover:text-orange-900 font-medium"
                      >
                        Review {pendingSnags.length} resolved snag{pendingSnags.length > 1 ? "s" : ""}
                      </Link>
                    </li>
                  )}
                </ul>
                <div className="mt-4 pt-2 border-t border-orange-200/60">
                  {pendingBOQ ? (
                    <Link href={`/portal/${slug}/boq`}>
                      <Button
                        size="sm"
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white border-0 shadow-none gap-1"
                      >
                        Review Pending BOQ <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                  ) : (
                    <Link href={`/portal/${slug}/snags`}>
                      <Button
                        size="sm"
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white border-0 shadow-none gap-1"
                      >
                        Review Snag Fixes <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
