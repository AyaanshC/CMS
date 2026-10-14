"use client";
import { useState } from "react";
import Link from "next/link";
import { CheckSquare, ArrowUpRight, Search, CircleCheck } from "lucide-react";
import { TopBar } from "@/components/layout/AppSidebar";
import { useAppStore } from "@/lib/store";
import { APPROVAL_LABELS, getApprovalQueue } from "@/lib/approvals/queue";
import { formatCurrency, formatShortDate, localToday } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function ApprovalsPage() {
  const state = useAppStore();
  const queue = getApprovalQueue(state);
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState("all");
  const [scope, setScope] = useState("mine");
  const [project, setProject] = useState("all");
  const today = localToday();
  const mine = queue.filter((i) => i.canReview).length;
  const waitingClient = queue.filter((i) => i.reviewer === "Client").length;
  const shown = queue.filter(
    (i) =>
      (kind === "all" || i.kind === kind) &&
      (scope === "all" ||
        (scope === "mine" ? i.canReview : i.reviewer === "Client")) &&
      (project === "all" || i.projectId === project) &&
      `${i.title} ${i.projectName} ${i.reviewer}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const clear = () => {
    setSearch("");
    setKind("all");
    setScope("all");
    setProject("all");
  };
  return (
    <div>
      <TopBar
        title="Approval inbox"
        subtitle="A single place to see decisions, reviewers, and what needs attention."
      />
      <div className="p-6 space-y-6">
        <section
          className="grid grid-cols-3 gap-2 sm:gap-4"
          aria-label="Approval summary"
        >
          {[
            { label: "Ready for your review", count: mine, value: "mine" },
            {
              label: "Waiting on clients",
              count: waitingClient,
              value: "client",
            },
            {
              label: "All pending decisions",
              count: queue.length,
              value: "all",
            },
          ].map((c) => (
            <button
              key={c.value}
              type="button"
              aria-pressed={scope === c.value}
              onClick={() => setScope(c.value)}
              className={`rounded-xl border p-3 text-left transition-colors sm:p-5 ${scope === c.value ? "border-primary/30 bg-accent" : "bg-card hover:border-primary/30"}`}
            >
              <p className="text-xs text-muted-foreground sm:text-sm">{c.label}</p>
              <p className="mt-3 text-2xl font-semibold tabular-nums sm:text-3xl">
                {c.count}
              </p>
            </button>
          ))}
        </section>
        <div className="flex flex-wrap gap-3 rounded-xl border bg-card p-4">
          <div className="relative min-w-48 flex-1">
            <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
            <Input
              aria-label="Search approvals"
              placeholder="Search decisions, projects, or reviewers…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <select
            aria-label="Approval type"
            className="h-10 rounded-lg border bg-card px-3 text-sm"
            value={kind}
            onChange={(e) => setKind(e.target.value)}
          >
            <option value="all">All types</option>
            {Object.entries(APPROVAL_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select
            aria-label="Approval project"
            className="h-10 max-w-full rounded-lg border bg-card px-3 text-sm"
            value={project}
            onChange={(e) => setProject(e.target.value)}
          >
            <option value="all">All projects</option>
            {state.projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            {shown.length} decision{shown.length === 1 ? "" : "s"} · oldest
            first
          </p>
          <button
            type="button"
            onClick={clear}
            className="text-sm font-medium text-primary hover:underline"
          >
            Reset filters
          </button>
        </div>
        {shown.length ? (
          <div className="space-y-3">
            {shown.map((i) => (
              <article
                key={`${i.kind}-${i.id}`}
                className="flex flex-col justify-between gap-5 rounded-xl border bg-card p-5 sm:flex-row sm:items-center"
              >
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{APPROVAL_LABELS[i.kind]}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {i.projectName}
                    </span>
                    {i.dueDate && i.dueDate < today && (
                      <Badge variant="destructive">Past due</Badge>
                    )}
                  </div>
                  <h2 className="text-sm font-semibold">{i.title}</h2>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Reviewer: {i.reviewer} ·{" "}
                    {i.kind === "timesheet" ? "Week of" : "Recorded"}{" "}
                    {formatShortDate(i.submittedAt)}
                    {i.dueDate ? ` · Due ${formatShortDate(i.dueDate)}` : ""}
                  </p>
                  {i.note && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {i.note}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center justify-between gap-6 sm:justify-end">
                  {i.amount !== undefined ? (
                    <span className="text-lg font-semibold tabular-nums">
                      {formatCurrency(i.amount)}
                    </span>
                  ) : (
                    <span className="font-semibold tabular-nums">
                      {i.hours}h
                    </span>
                  )}
                  <Link
                    href={i.href}
                    className="inline-flex h-10 items-center gap-2 rounded-lg border px-4 text-sm font-medium text-primary hover:bg-accent"
                  >
                    {i.canReview ? "Review" : "View details"}
                    <ArrowUpRight className="size-4" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border bg-card px-6 py-14 text-center">
            {queue.length ? (
              <CheckSquare className="mx-auto mb-4 size-8 text-primary" />
            ) : (
              <CircleCheck className="mx-auto mb-4 size-8 text-primary" />
            )}
            <h2 className="text-lg font-semibold">
              {queue.length
                ? "No decisions match this view"
                : "No approvals waiting"}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {queue.length
                ? "Change the filters to see other pending decisions."
                : "Submitted work will appear here when a decision is required."}
            </p>
            {queue.length > 0 && (
              <button
                type="button"
                onClick={clear}
                className="mt-5 text-sm font-medium text-primary hover:underline"
              >
                Show all pending decisions
              </button>
            )}
          </div>
        )}
        <p className="text-xs leading-relaxed text-muted-foreground">
          Decisions are made in the detailed review screen. Client approvals
          remain with the client; the inbox does not change approval
          permissions.
        </p>
      </div>
    </div>
  );
}
