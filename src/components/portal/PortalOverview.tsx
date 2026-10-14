"use client";
import { use } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowUpRight,
  CheckCircle2,
  Heart,
  ThumbsUp,
  Circle,
  Receipt,
  MessageSquare,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { getClientOverview } from "@/lib/portal/overview";
import {
  formatCurrency,
  formatDate,
  formatShortDate,
  localToday,
} from "@/lib/utils";
import { PROJECT_STAGE_LABELS } from "@/types";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {HandoverAcceptance} from "./HandoverAcceptance";

export function PortalOverview({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const state = useAppStore();
  const project = state.projects.find((p) => p.portal_slug === slug);
  const overview = project ? getClientOverview(state, project.id) : null;
  if (!project || !overview) return null;
  const { pending, history, nextInvoice, milestone, updates } = overview;
  const today = localToday();
  return (
    <div className="space-y-7">
      {(project.status==="handover"||project.status==="closed"&&state.handoverAcceptances?.some(h=>h.project_id===project.id))&&state.me.kind==="client"&&<HandoverAcceptance projectId={project.id}/>}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Your project, in focus</p>
          <h1 className="mt-2 text-2xl font-semibold">
            Everything you need to know
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Progress, upcoming steps, and decisions for {project.name}.
          </p>
        </div>
        <Link
          href={`/portal/${slug}/messages`}
          className="inline-flex h-10 items-center gap-2 rounded-lg border bg-card px-4 text-sm font-medium text-primary"
        >
          <MessageSquare className="size-4" />
          Message your team
        </Link>
      </div>
      <section className="rounded-xl border border-primary/15 bg-accent/50 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="eyebrow">What happens next</p>
            <h2 className="mt-2 text-xl font-semibold">
              {milestone?.title ??
                (project.status === "closed"
                  ? "Your project is complete"
                  : "Your studio is coordinating the next step")}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {milestone?.due_date
                ? `Target date: ${formatDate(milestone.due_date)}`
                : "Your studio will share the next milestone here."}
            </p>
          </div>
          <Badge
            variant="outline"
            className="border-primary/20 bg-card px-3 py-1 text-primary"
          >
            {PROJECT_STAGE_LABELS[project.status]}
          </Badge>
        </div>
        <div className="mt-6 flex items-center gap-4">
          <Progress value={project.progress_percent} className="h-1.5 flex-1" />
          <span className="shrink-0 text-xs font-medium text-primary">
            {project.progress_percent}% complete
          </span>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          {[
            project.property_address,
            project.area_sqft
              ? `${project.area_sqft.toLocaleString("en-IN")} sq ft`
              : "",
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </section>
      <section
        aria-label="Your project actions"
        className="grid gap-4 sm:grid-cols-2"
      >
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Decisions for you</h2>
            <span className="rounded-md bg-accent px-2 py-1 text-xs font-semibold text-primary">
              {pending.length}
            </span>
          </div>
          {pending.length ? (
            <div className="mt-4 space-y-4">
              {pending.map((p) => (
                <Link
                  key={p.id}
                  href={p.href}
                  className="group flex items-start justify-between gap-3"
                >
                  <div>
                    <p className="text-sm font-medium text-primary group-hover:underline">
                      {p.title}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {p.detail}
                    </p>
                  </div>
                  <ArrowUpRight className="mt-1 size-4 shrink-0 text-primary" />
                </Link>
              ))}
            </div>
          ) : (
            <div className="mt-4 flex items-start gap-3">
              <CheckCircle2 className="size-5 shrink-0 text-primary" />
              <p className="text-sm text-muted-foreground">
                You’re up to date. There are no decisions waiting for you.
              </p>
            </div>
          )}
        </div>
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Next payment</h2>
            <Receipt className="size-4 text-primary" />
          </div>
          {nextInvoice ? (
            <>
              <p className="mt-4 text-2xl font-semibold tabular-nums">
                {formatCurrency(nextInvoice.amount_due)}
              </p>
              <p
                className={`mt-2 text-xs ${nextInvoice.due_date && nextInvoice.due_date < today ? "text-destructive" : "text-muted-foreground"}`}
              >
                {nextInvoice.invoice_number}
                {nextInvoice.due_date
                  ? ` · ${nextInvoice.due_date < today ? "Overdue since" : "Due"} ${formatShortDate(nextInvoice.due_date)}`
                  : " · No due date set"}
              </p>
              <Link
                href={`/portal/${slug}/invoices`}
                className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary"
              >
                View invoice <ArrowUpRight className="size-4" />
              </Link>
            </>
          ) : (
            <>
              <p className="mt-4 text-sm text-muted-foreground">
                No outstanding payment is listed.
              </p>
              <Link
                href={`/portal/${slug}/invoices`}
                className="mt-4 inline-block text-sm font-medium text-primary"
              >
                View your invoices →
              </Link>
            </>
          )}
        </div>
      </section>
      <div className="grid items-start gap-6 lg:grid-cols-[1.6fr_1fr]">
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Latest from your studio</h2>
          {updates.length ? (
            updates.map((u) => (
              <article
                key={u.id}
                className="overflow-hidden rounded-xl border bg-card"
              >
                {u.photos?.[0] && (
                  <div className="relative h-56 sm:h-64">
                    <Image
                      src={u.photos[0]}
                      alt={u.title ?? "Project progress photo"}
                      fill
                      unoptimized
                      className="object-cover"
                      sizes="(max-width: 1024px) 100vw, 60vw"
                    />
                  </div>
                )}
                <div className="p-5">
                  <p className="text-xs text-muted-foreground">
                    {formatDate(u.created_at)}
                  </p>
                  <h3 className="mt-2 text-base font-semibold">{u.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {u.content}
                  </p>
                  <div className="mt-5 flex gap-5 border-t pt-4">
                    <button
                      type="button"
                      onClick={() => state.toggleUpdateReaction(u.id, "like")}
                      className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary"
                    >
                      <ThumbsUp className="size-4" />
                      {u.likes ?? 0} likes
                    </button>
                    <button
                      type="button"
                      onClick={() => state.toggleUpdateReaction(u.id, "love")}
                      className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary"
                    >
                      <Heart className="size-4" />
                      {u.loved ?? 0} loved
                    </button>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-xl border bg-card p-8 text-sm text-muted-foreground">
              Your studio’s updates and site photographs will appear here.
            </div>
          )}
        </section>
        <div className="space-y-6">
          <section>
            <h2 className="mb-4 text-lg font-semibold">Project milestones</h2>
            <div className="space-y-5 rounded-xl border bg-card p-5">
              {project.milestones?.length ? (
                project.milestones.map((m) => (
                  <div key={m.id} className="flex items-start gap-3">
                    {m.completed_at ? (
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                    ) : (
                      <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground/50" />
                    )}
                    <div>
                      <p className="text-sm font-medium">{m.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {m.completed_at
                          ? `Completed ${formatShortDate(m.completed_at)}`
                          : m.due_date
                            ? `Target ${formatShortDate(m.due_date)}`
                            : "Date to be confirmed"}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  Milestones will appear once your studio sets the project plan.
                </p>
              )}
            </div>
          </section>
          <section>
            <h2 className="mb-4 text-lg font-semibold">
              Your decision history
            </h2>
            <div className="space-y-5 rounded-xl border bg-card p-5">
              {history.length ? (
                history.map((d) => (
                  <div key={d.id}>
                    <Link
                      href={d.href}
                      className="text-sm font-semibold text-primary hover:underline"
                    >
                      {d.title}
                    </Link>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {d.status === "approved"
                        ? "Approved"
                        : "Changes requested"}
                      {d.signer ? ` by ${d.signer}` : ""}
                      {d.recordedAt
                        ? ` · ${formatShortDate(d.recordedAt)}`
                        : ""}
                    </p>
                    {d.note && (
                      <p className="mt-2 text-sm text-muted-foreground">
                        {d.note}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  Recorded estimate and scope decisions will appear here.
                </p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
