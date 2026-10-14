"use client";

import Link from "next/link";
import { TopBar } from "@/components/layout/AppSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  FolderKanban,
  IndianRupee,
  ArrowUpRight,
  ArrowRight,
  CheckSquare,
  Clock3,
  CircleCheck,
  CalendarDays,
  CircleAlert,
} from "lucide-react";
import {
  formatCurrency,
  formatRelativeTime,
  getStatusColor,
  formatShortDate,
  localToday,
  cn,
} from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import {
  dashboardKpis,
  monthlySeries,
  stageDistribution,
} from "@/lib/metrics/kpis";
import { NotEnoughData } from "@/components/metrics/NotEnoughData";
import { MetricInfo } from "@/components/metrics/MetricInfo";
import { ActionItems } from "@/components/dashboard/ActionItems";
import { OwnerDashboard } from "@/components/dashboard/OwnerDashboard";
import { DirectorDashboard } from "@/components/dashboard/DirectorDashboard";
import { PmDashboard } from "@/components/dashboard/PmDashboard";
import { MyWeekDashboard } from "@/components/dashboard/MyWeekDashboard";
import { SiteDashboard } from "@/components/dashboard/SiteDashboard";
import { PROJECT_STAGE_LABELS, type ProjectStatus } from "@/types";

const STAGE_COLORS: Record<ProjectStatus, string> = {
  lead: "#b5bab5",
  consultation: "#8da4b1",
  design: "#819888",
  boq_approval: "#c4a16c",
  execution: "#496958",
  snag: "#b58269",
  handover: "#729d91",
  closed: "#a9b8a1",
};

export default function DashboardPage() {
  const {
    me,
    notifications,
    projects,
    tasks,
    invoices,
    payments,
    snags,
    boqs,
    expenses,
    vendorPayments,
  } = useAppStore();
  const today = localToday();
  const k = dashboardKpis(
    { projects, invoices, payments, snags, tasks, boqs },
    today,
  );
  const series = monthlySeries(invoices, payments, expenses, today, 6, vendorPayments);
  const stages = stageDistribution(projects);
  const liveProjects = projects.filter(
    (p) => p.status !== "lead" && p.status !== "closed",
  );
  const upcoming = tasks
    .filter((t) => t.status !== "done")
    .sort((a, b) => (a.due_date || "9999").localeCompare(b.due_date || "9999"))
    .slice(0, 5);
  const cards = [
    {
      label: "Active projects",
      value: String(k.activeProjects).padStart(2, "0"),
      note: `${projects.filter((p) => p.status === "lead").length} enquiries in the pipeline`,
      icon: FolderKanban,
      href: "/projects",
      formula: "Projects outside Lead and Closed stages",
    },
    {
      label: "Collected this month",
      value: formatCurrency(k.collectedThisMonth),
      note: "Payments received this calendar month",
      icon: IndianRupee,
      href: "/invoices",
      formula: "Sum of recorded payments dated this month",
    },
    {
      label: "Outstanding balance",
      value: formatCurrency(k.outstanding),
      note: `${k.overdueInvoices} overdue invoice${k.overdueInvoices === 1 ? "" : "s"}`,
      icon: Clock3,
      href: "/invoices",
      formula: "Total amount due on issued invoices",
    },
    {
      label: "Open snags",
      value: String(k.openSnags).padStart(2, "0"),
      note: `${k.criticalSnags} critical items to resolve`,
      icon: CircleAlert,
      href: "/projects",
      formula: "Snags that have not been closed",
    },
  ];
  return (
    <div>
      <TopBar
        title="Studio overview"
        subtitle="A clear view of your projects, people, and progress."
      />
      <div className="p-6 space-y-7">
        <section className="flex flex-col justify-between gap-5 rounded-xl border border-primary/10 bg-accent/60 px-6 py-7 sm:flex-row sm:items-center">
          <div>
            <p className="eyebrow mb-2">Your workspace, at a glance</p>
            <h2 className="text-2xl font-medium tracking-tight sm:text-[28px]">
              Welcome back, {me.full_name.split(" ")[0]}.
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {k.tasksDueToday
                ? `${k.tasksDueToday} task${k.tasksDueToday === 1 ? "" : "s"} due today`
                : "No tasks due today"}
              {k.pendingApprovals
                ? ` · ${k.pendingApprovals} BOQ${k.pendingApprovals === 1 ? "" : "s"} awaiting client approval`
                : ". Here’s how your studio is progressing."}
            </p>
          </div>
          <Link
            href="/projects"
            className="inline-flex h-10 shrink-0 items-center justify-center gap-3 self-start rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 sm:self-center"
          >
            View projects <ArrowUpRight className="size-4" />
          </Link>
        </section>
        {projects.length === 0 && !me.is_demo && (
          <section className="rounded-xl border border-dashed border-primary/25 bg-card p-6" aria-label="Get started">
            <h2 className="text-base font-semibold">Your workspace is ready for its first project</h2>
            <p className="mt-2 text-sm text-muted-foreground">Add your clients and projects to see their progress here. Financial totals stay at zero until you record invoices and payments.</p>
            <div className="mt-4 flex flex-wrap gap-4 text-sm font-medium text-primary">
              <Link href="/clients" className="underline underline-offset-4">Add your first client</Link>
              <Link href="/settings" className="underline underline-offset-4">Set up studio details</Link>
            </div>
          </section>
        )}
        <ActionItems />
        <section
          aria-label="Key studio metrics"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          {cards.map(({ label, value, note, icon: Icon, href, formula }) => (
            <div key={label} className="group relative rounded-xl">
              <Card className="h-full transition-colors group-hover:border-primary/40">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <Link
                      href={href}
                      className="text-xs font-medium text-muted-foreground after:absolute after:inset-0 after:rounded-xl focus-visible:outline-offset-4"
                    >
                      {label}
                    </Link>
                    <Icon
                      className="size-4 text-primary/75"
                      strokeWidth={1.6}
                    />
                  </div>
                  <p className="my-4 text-[28px] font-semibold leading-none tracking-tight tabular-nums">
                    {value}
                  </p>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] text-muted-foreground">{note}</p>
                    <span className="relative z-10">
                      <MetricInfo formula={formula} />
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </section>

        <div className="grid items-start gap-5 xl:grid-cols-[1.8fr_1fr]">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between border-b border-border">
              <div>
                <CardTitle>Project portfolio</CardTitle>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Your active work, from concept to completion
                </p>
              </div>
              <Link
                href="/projects"
                className="flex shrink-0 items-center gap-1.5 text-[11px] font-semibold text-primary"
              >
                View all <ArrowRight className="size-3.5" />
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {liveProjects.length ? (
                <div className="divide-y divide-border">
                  {liveProjects.slice(0, 5).map((p, i) => (
                    <Link
                      key={p.id}
                      href={`/projects/${p.id}`}
                      className="group flex items-center gap-4 px-5 py-5 transition-colors hover:bg-muted/40"
                    >
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-medium text-muted-foreground tabular-nums">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-[13px] font-semibold group-hover:text-primary">
                            {p.name}
                          </p>
                          <Badge
                            className={cn(
                              "border-0 px-2 py-0.5 text-[9px] font-medium",
                              getStatusColor(p.status),
                            )}
                          >
                            {PROJECT_STAGE_LABELS[p.status]}
                          </Badge>
                        </div>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {p.client_name}
                        </p>
                        <div className="mt-3 flex items-center gap-3">
                          <Progress
                            value={p.progress_percent}
                            className="h-1 flex-1"
                          />
                          <span className="text-[10px] text-muted-foreground tabular-nums">
                            {p.progress_percent}%
                          </span>
                        </div>
                      </div>
                      <ArrowUpRight className="size-4 shrink-0 text-muted-foreground/60 group-hover:text-primary" />
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="p-10 text-center">
                  <FolderKanban className="mx-auto mb-3 size-6 text-muted-foreground" />
                  <p className="text-sm font-medium">
                    Your next project starts here
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Active projects will appear as they move beyond enquiry.
                  </p>
                  <Link
                    href="/projects"
                    className="mt-4 inline-block text-xs font-semibold text-primary"
                  >
                    Go to projects →
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between border-b border-border">
              <div>
                <CardTitle>Coming up next</CardTitle>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Keep the important things moving
                </p>
              </div>
              <CalendarDays className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-0">
              {upcoming.length ? (
                <div className="divide-y divide-border">
                  {upcoming.map((task) => (
                    <Link
                      key={task.id}
                      href="/tasks"
                      className="flex items-start gap-3 px-5 py-4 transition-colors hover:bg-muted/40"
                    >
                      <span
                        className={cn(
                          "mt-1 size-2 shrink-0 rounded-full",
                          task.priority === "urgent" || task.priority === "high"
                            ? "bg-amber-500"
                            : "bg-primary/40",
                        )}
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-medium leading-relaxed">
                          {task.title}
                        </p>
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          {task.project_name}
                        </p>
                        <span
                          className={cn(
                            "mt-2 inline-block text-[10px]",
                            task.due_date && task.due_date < today
                              ? "text-destructive"
                              : "text-muted-foreground",
                          )}
                        >
                          {task.due_date
                            ? `${task.due_date < today ? "Overdue · " : "Due "}${formatShortDate(task.due_date)}`
                            : "No due date"}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="px-5 py-10 text-center">
                  <CircleCheck className="mx-auto mb-3 size-6 text-primary" />
                  <p className="text-sm font-medium">All caught up</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    No open tasks in your workspace.
                  </p>
                </div>
              )}
              <Link
                href="/tasks"
                className="flex items-center justify-center gap-2 border-t border-border px-5 py-3.5 text-[11px] font-semibold text-primary"
              >
                Open task list <ArrowRight className="size-3.5" />
              </Link>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.8fr_1fr]">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-3">
              <div>
                <CardTitle>Financial activity</CardTitle>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Invoiced, collected, and expenses
                </p>
              </div>
              <span className="rounded-md border border-border px-2.5 py-1 text-[10px] text-muted-foreground">
                Last 6 months
              </span>
            </CardHeader>
            <CardContent>
              {series.some((s) => s.invoiced || s.collected || s.expenses) ? (
                <>
                  <div className="mb-5 flex flex-wrap gap-4 text-[10px] text-muted-foreground">
                    {[
                      ["Invoiced", "#496958"],
                      ["Collected", "#93ac9c"],
                      ["Expenses", "#c2a77f"],
                    ].map(([name, color]) => (
                      <span key={name} className="flex items-center gap-1.5">
                        <span
                          className="size-2 rounded-sm"
                          style={{ background: color }}
                        />
                        {name}
                      </span>
                    ))}
                  </div>
                  <ResponsiveContainer width="100%" height={230}>
                    <BarChart data={series} barSize={12} barGap={3}>
                      <CartesianGrid
                        strokeDasharray="3 5"
                        stroke="hsl(var(--border))"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="month"
                        tick={{
                          fontSize: 10,
                          fill: "hsl(var(--muted-foreground))",
                        }}
                        axisLine={false}
                        tickLine={false}
                        dy={8}
                      />
                      <YAxis
                        width={46}
                        tick={{
                          fontSize: 10,
                          fill: "hsl(var(--muted-foreground))",
                        }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) => `₹${v / 100000}L`}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: 10,
                          border: "1px solid hsl(var(--border))",
                          fontSize: 11,
                        }}
                        formatter={(v) => formatCurrency(Number(v))}
                        cursor={{ fill: "hsl(var(--muted))" }}
                      />
                      <Bar
                        dataKey="invoiced"
                        name="Invoiced"
                        fill="#496958"
                        radius={[3, 3, 0, 0]}
                      />
                      <Bar
                        dataKey="collected"
                        name="Collected"
                        fill="#93ac9c"
                        radius={[3, 3, 0, 0]}
                      />
                      <Bar
                        dataKey="expenses"
                        name="Expenses"
                        fill="#c2a77f"
                        radius={[3, 3, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </>
              ) : (
                <div className="flex h-[250px] items-center justify-center">
                  <NotEnoughData hint="Record an invoice or payment to see your financial activity." />
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Projects by stage</CardTitle>
              <p className="mt-1 text-[11px] text-muted-foreground">
                How your work is taking shape
              </p>
            </CardHeader>
            <CardContent>
              {stages.length ? (
                <>
                  <div className="relative">
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie
                          data={stages}
                          innerRadius={57}
                          outerRadius={76}
                          paddingAngle={4}
                          stroke="none"
                          dataKey="count"
                          nameKey="label"
                        >
                          {stages.map((s) => (
                            <Cell key={s.stage} fill={STAGE_COLORS[s.stage]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ borderRadius: 10, fontSize: 11 }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-3xl font-semibold tabular-nums">
                        {projects.length}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        total projects
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2.5">
                    {stages.map((s) => (
                      <div
                        key={s.stage}
                        className="flex items-center gap-2 text-[10px]"
                      >
                        <span
                          className="size-2 rounded-full"
                          style={{ background: STAGE_COLORS[s.stage] }}
                        />
                        <span className="text-muted-foreground">{s.label}</span>
                        <span className="ml-auto font-semibold">{s.count}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <NotEnoughData hint="Your project stages will appear here." />
              )}
            </CardContent>
          </Card>
        </div>

        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold">Studio performance</h2>
            <span className="h-px flex-1 bg-border" />
            <span className="text-[10px] text-muted-foreground">
              Your management view
            </span>
          </div>
          {me.roles.includes("owner") ? (
            <OwnerDashboard />
          ) : me.roles.includes("director") ? (
            <DirectorDashboard />
          ) : me.roles.includes("project_manager") ? (
            <PmDashboard />
          ) : me.roles.includes("site_supervisor") ? (
            <>
              <SiteDashboard />
              <MyWeekDashboard />
            </>
          ) : (
            <MyWeekDashboard />
          )}
          {(me.roles.includes("director") ||
            me.roles.includes("project_manager")) &&
            !me.roles.includes("owner") && <MyWeekDashboard />}
        </section>
        {notifications.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recent activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {notifications.slice(0, 4).map((n) => (
                <div key={n.id} className="flex items-start gap-3">
                  <CheckSquare className="mt-0.5 size-4 text-primary" />
                  <div>
                    <p className="text-xs font-medium">{n.title}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {formatRelativeTime(n.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
