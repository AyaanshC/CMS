"use client";
import { Suspense, use } from "react";
import { BrandLoader } from "@/components/brand/BrandLoader";
import { ProjectChat } from "@/components/projects/ProjectChat";
import { useAppStore } from "@/lib/store";
export default function PortalMessagesPage({ params }: { params: Promise<{ slug: string }> }) {
  return <Suspense fallback={<BrandLoader label="Loading conversation" />}><Content params={params} /></Suspense>;
}
function Content({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { projects, messages } = useAppStore();
  const project = projects.find(p => p.portal_slug === slug);
  if (!project) return <p className="p-8 text-muted-foreground">This project is unavailable.</p>;
  return <div className="space-y-4"><h1 className="text-2xl font-bold">Project Chat</h1><p className="text-sm text-muted-foreground">Your conversation with the studio.</p><ProjectChat projectId={project.id} messages={messages.filter(m => m.project_id === project.id)} /></div>;
}
