"use client";

import { use } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Layers3,
  Home,
  FileText,
  CheckSquare,
  Folder,
  MessageSquare,
  Receipt,
  ArrowUpRight,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { DemoBanner } from "@/components/workspace/DemoBanner";

export function PortalShell({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const pathname = usePathname();
  const { projects, studioSettings } = useAppStore();
  const project = projects.find((p) => p.portal_slug === slug);
  if (!project)
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-8 text-center">
        <Layers3 className="mb-5 size-10 text-primary" />
        <h1 className="text-xl font-semibold">Project unavailable</h1>
        <p className="mb-6 mt-2 text-sm text-muted-foreground">
          This project could not be found or you don’t have access.
        </p>
        <Link
          href="/portal"
          className="rounded-lg bg-primary px-5 py-3 text-xs font-medium text-primary-foreground"
        >
          Back to your projects
        </Link>
      </div>
    );
  const items = [
    { href: `/portal/${slug}`, label: "Overview", icon: Home },
    { href: `/portal/${slug}/boq`, label: "Estimates & BOQ", icon: FileText },
    { href: `/portal/${slug}/changes`, label: "Change orders", icon: FileText },
    { href: `/portal/${slug}/snags`, label: "Snag list", icon: CheckSquare },
    { href: `/portal/${slug}/files`, label: "Files & designs", icon: Folder },
    { href: `/portal/${slug}/materials`, label: "Materials", icon: Folder },
    {
      href: `/portal/${slug}/messages`,
      label: "Messages",
      icon: MessageSquare,
    },
    { href: `/portal/${slug}/invoices`, label: "Invoices", icon: Receipt },
  ];
  return (
    <div className="min-h-screen bg-background">
      <DemoBanner />
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex min-h-20 max-w-[1440px] items-center justify-between gap-5 px-5 py-4 sm:px-8">
          <Link href="/" className="flex items-center gap-3">
            <Layers3 className="size-8 text-primary" strokeWidth={1.3} />
            <span>
              <span className="block text-sm font-semibold">
                {studioSettings.name}
              </span>
              <span className="mt-1 block text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
                Your client portal
              </span>
            </span>
          </Link>
          <Link
            href="/portal"
            className="flex items-center gap-2 text-[11px] font-medium text-primary"
          >
            My projects <ArrowUpRight className="size-3.5" />
          </Link>
        </div>
      </header>
      <div className="mx-auto flex max-w-[1440px] flex-col lg:flex-row">
        <aside className="shrink-0 border-b border-border lg:min-h-[calc(100dvh-80px)] lg:w-64 lg:border-b-0 lg:border-r">
          <div className="px-5 pb-4 pt-6 lg:px-7 lg:pb-7 lg:pt-8">
            <p className="eyebrow mb-2">Your project</p>
            <h1 className="text-base font-semibold">{project.name}</h1>
            <p className="mt-1 text-[10px] text-muted-foreground">
              {project.reference_number}
            </p>
          </div>
          <nav
            aria-label="Project navigation"
            className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:px-4"
          >
            {items.map(({ href, label, icon: Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-3 text-xs transition-colors",
                    active
                      ? "bg-accent font-semibold text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon className="size-4" strokeWidth={1.6} />
                  {label}
                </Link>
              );
            })}
          </nav>
          <div className="m-5 hidden rounded-lg border border-border bg-card p-4 lg:block">
            <p className="text-xs font-medium">A direct line to your studio</p>
            <p className="mb-4 mt-2 text-[11px] leading-relaxed text-muted-foreground">
              Questions, ideas, or a detail to discuss? We’re here to help.
            </p>
            <Link
              href={`/portal/${slug}/messages`}
              className="inline-flex items-center gap-2 text-[11px] font-semibold text-primary"
            >
              Message your team <ArrowUpRight className="size-3" />
            </Link>
          </div>
        </aside>
        <main className="min-w-0 flex-1 p-4 sm:p-7 lg:p-8">
          <div className="mx-auto max-w-5xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
