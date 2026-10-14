"use client";
import Link from "next/link";
import { ArrowUpRight, Layers3, FolderKanban } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { DemoBanner } from "@/components/workspace/DemoBanner";
import { Progress } from "@/components/ui/progress";
import { PROJECT_STAGE_LABELS } from "@/types";
import { signOut } from "@/app/actions/auth";

export function PortalProjectList() {
  const { me, studioSettings, projects } = useAppStore();
  return (
    <div className="min-h-screen bg-background">
      <DemoBanner />
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-6">
          <Link
            href="/"
            className="flex items-center gap-3 text-sm font-semibold"
          >
            <Layers3 className="size-7 text-primary" />
            {studioSettings.name}
          </Link>
          <button
            type="button"
            onClick={() => signOut()}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Sign out
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-12">
        <p className="eyebrow">Your client portal</p>
        <h1 className="mt-3 text-3xl font-semibold">
          Welcome, {me.full_name.split(" ")[0]}.
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Open a project to follow progress, review decisions, and speak with
          your studio.
        </p>
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/portal/${p.portal_slug}`}
              className="group rounded-xl border bg-card p-6 hover:border-primary/40"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">
                    {p.reference_number}
                  </p>
                  <h2 className="mt-2 text-xl font-semibold">{p.name}</h2>
                </div>
                <ArrowUpRight className="size-5 text-primary" />
              </div>
              <p className="mt-5 text-sm text-primary">
                {PROJECT_STAGE_LABELS[p.status]}
              </p>
              <Progress value={p.progress_percent} className="mt-3 h-1.5" />
              <p className="mt-2 text-xs text-muted-foreground">
                {p.progress_percent}% complete
              </p>
            </Link>
          ))}
        </div>
        {!projects.length && (
          <div className="mt-8 rounded-xl border bg-card p-10 text-center">
            <FolderKanban className="mx-auto mb-4 size-8 text-primary" />
            <h2 className="text-lg font-semibold">
              Your project will appear here
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Ask your studio to link your account to the project.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
