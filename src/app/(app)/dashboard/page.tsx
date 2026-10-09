"use client";

import { TopBar } from "@/components/layout/AppSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import {
  FolderKanban, IndianRupee, AlertCircle, CheckSquare,
  Clock, ArrowRight, Bell,
} from "lucide-react";
import {
  formatCurrency, formatRelativeTime, getStatusColor,
  getPriorityColor, formatShortDate, isOverdue, localToday, cn,
} from "@/lib/utils";
import Link from "next/link";
import { useAppStore } from "@/lib/store";
import { dashboardKpis, monthlySeries, stageDistribution } from "@/lib/metrics/kpis";
import { NotEnoughData } from "@/components/metrics/NotEnoughData";
import { MetricInfo } from "@/components/metrics/MetricInfo";
import { ActionItems } from "@/components/dashboard/ActionItems";
import { OwnerDashboard } from "@/components/dashboard/OwnerDashboard";
import { DirectorDashboard } from "@/components/dashboard/DirectorDashboard";
import { PmDashboard } from "@/components/dashboard/PmDashboard";
import { MyWeekDashboard } from "@/components/dashboard/MyWeekDashboard";
import { SiteDashboard } from "@/components/dashboard/SiteDashboard";
import type { ProjectStatus } from "@/types";

const STAGE_COLORS: Record<ProjectStatus, string> = {
  lead: "#94a3b8",
  consultation: "#60a5fa",
  design: "#8b5cf6",
  boq_approval: "#fbbf24",
  execution: "#6366f1",
  snag: "#f97316",
  handover: "#14b8a6",
  closed: "#22c55e",
};

interface TooltipPayloadEntry {
  color: string;
  name: string;
  value: number;
}

const CUSTOM_TOOLTIP = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-xl p-3 shadow-lg text-sm">
        <p className="font-semibold text-foreground mb-1">{label}</p>
        {payload.map((entry, i) => (
          <p key={i} style={{ color: entry.color }}>
            {entry.name}: {formatCurrency(entry.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function DashboardPage() {
  const { me, notifications, projects, tasks, invoices, payments, snags, boqs, expenses } = useAppStore();
  const today = localToday();
  const k = dashboardKpis({ projects, invoices, payments, snags, tasks, boqs }, today);
  const series = monthlySeries(invoices, payments, expenses, today);
  const stages = stageDistribution(projects);

  const cards = [
    {
      title: "Active Projects",
      value: k.activeProjects,
      icon: FolderKanban,
      textColor: "text-indigo-600",
      bgColor: "bg-indigo-50",
      note: `${projects.filter((p) => p.status === "lead").length} open leads`,
      href: "/projects",
      formula: "Projects not in Lead or Closed stage",
    },
    {
      title: "Collected This Month",
      value: formatCurrency(k.collectedThisMonth),
      icon: IndianRupee,
      textColor: "text-emerald-600",
      bgColor: "bg-emerald-50",
      note: "Payments recorded this month",
      href: "/invoices",
      formula: "Sum of payments dated this calendar month",
    },
    {
      title: "Outstanding",
      value: formatCurrency(k.outstanding),
      icon: AlertCircle,
      textColor: "text-amber-600",
      bgColor: "bg-amber-50",
      note: `${k.overdueInvoices} overdue`,
      href: "/invoices",
      formula: "Sum of amount due on sent invoices",
    },
    {
      title: "Open Snags",
      value: k.openSnags,
      icon: AlertCircle,
      textColor: "text-red-600",
      bgColor: "bg-red-50",
      note: `${k.criticalSnags} critical`,
      href: "/projects",
      formula: "Snags not yet closed",
    },
    {
      title: "Tasks Due Today",
      value: k.tasksDueToday,
      icon: CheckSquare,
      textColor: "text-violet-600",
      bgColor: "bg-violet-50",
      note: `${k.overdueTasks} overdue`,
      href: "/tasks",
      formula: "Open tasks with today's due date",
    },
    {
      title: "Awaiting Client Approval",
      value: k.pendingApprovals,
      icon: Clock,
      textColor: "text-orange-600",
      bgColor: "bg-orange-50",
      note: "Submitted BOQs",
      href: "/projects",
      formula: "BOQ versions in Submitted status",
    },
  ];

  const hasSeriesData = series.some((s) => s.invoiced > 0 || s.collected > 0 || s.expenses > 0);
  const hasStagesData = stages.length > 0;

  const recentActivity = notifications.slice(0, 5);
  const upcomingTasks = tasks
    .filter((t) => t.status !== "done")
    .sort((a, b) => (a.due_date || "").localeCompare(b.due_date || ""))
    .slice(0, 5);

  return (
    <div>
      <TopBar
        title="Dashboard"
        subtitle={`Welcome back, ${me.full_name.split(" ")[0]}`}
      />
      <div className="p-6 space-y-6">
        <ActionItems />
        {me.roles.includes("owner") ? <OwnerDashboard />
          : me.roles.includes("director") ? <DirectorDashboard />
          : me.roles.includes("project_manager") ? <PmDashboard />
          : me.roles.includes("site_supervisor") ? <><SiteDashboard /><MyWeekDashboard /></>
          : <MyWeekDashboard />}
        {(me.roles.includes("director") || me.roles.includes("project_manager")) && <MyWeekDashboard />}

        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Operations</h3>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {cards.map((kpi) => (
            <Link key={kpi.title} href={kpi.href}>
              <Card className="card-hover border-border cursor-pointer h-full">
                <CardContent className="p-4 flex flex-col justify-between h-full">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", kpi.bgColor)}>
                        <kpi.icon className={cn("w-4 h-4", kpi.textColor)} />
                      </div>
                      <MetricInfo formula={kpi.formula} />
                    </div>
                    <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
                    <p className="text-xs font-medium text-muted-foreground mt-0.5">{kpi.title}</p>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-2 opacity-70">{kpi.note}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue Chart */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Invoiced, collected and expenses</CardTitle>
                <Badge variant="secondary" className="text-xs">Last 6 months</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {!hasSeriesData ? (
                <div className="h-[220px] flex items-center justify-center">
                  <NotEnoughData hint="Appears once invoices or payments are recorded" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={series} barSize={16} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`} />
                    <Tooltip content={<CUSTOM_TOOLTIP />} />
                    <Bar dataKey="invoiced" name="Invoiced" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="collected" name="Collected" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expenses" name="Expenses" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Project Status Donut */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Projects by Stage</CardTitle>
            </CardHeader>
            <CardContent>
              {!hasStagesData ? (
                <div className="h-[220px] flex items-center justify-center">
                  <NotEnoughData />
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie
                        data={stages}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="count"
                        nameKey="label"
                      >
                        {stages.map((entry) => (
                          <Cell key={entry.stage} fill={STAGE_COLORS[entry.stage] || "#94a3b8"} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v, n) => [v, n]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1.5 mt-2">
                    {stages.map((item) => (
                      <div key={item.stage} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ background: STAGE_COLORS[item.stage] || "#94a3b8" }}
                          />
                          <span className="text-muted-foreground">{item.label}</span>
                        </div>
                        <span className="font-medium">{item.count}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Projects */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Active Projects</CardTitle>
                <Link href="/projects">
                  <Button variant="ghost" size="sm" className="text-xs gap-1">
                    View all <ArrowRight className="w-3 h-3" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {projects.filter((p) => p.status !== "closed").map((project) => (
                <Link key={project.id} href={`/projects/${project.id}`}>
                  <div className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer border border-transparent hover:border-border">
                    <div className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center flex-shrink-0">
                      <FolderKanban className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-semibold text-foreground truncate">{project.name}</p>
                        <Badge className={cn("text-[10px] px-1.5 py-0 border-0", getStatusColor(project.status))}>
                          {project.status.replace("_", " ")}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3">
                        <Progress value={project.progress_percent} className="h-1.5 flex-1" />
                        <span className="text-xs font-medium text-muted-foreground w-8 text-right">
                          {project.progress_percent}%
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{project.client_name}</p>
                    </div>
                    {project.outstanding_payment && project.outstanding_payment > 0 ? (
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs text-amber-600 font-semibold">{formatCurrency(project.outstanding_payment)}</p>
                        <p className="text-[10px] text-muted-foreground">outstanding</p>
                      </div>
                    ) : null}
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>

          {/* Recent Activity + Tasks */}
          <div className="space-y-4">
            {/* Upcoming Tasks */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold">Upcoming Tasks</CardTitle>
                  <Link href="/tasks">
                    <Button variant="ghost" size="sm" className="text-xs gap-1">
                      View all <ArrowRight className="w-3 h-3" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {upcomingTasks.map((task) => (
                  <div key={task.id} className="flex items-start gap-3 py-2">
                    <div className={cn("w-2 h-2 rounded-full mt-1.5 flex-shrink-0", getPriorityColor(task.priority).includes("red") ? "bg-red-400" : task.priority === "medium" ? "bg-amber-400" : "bg-slate-400")} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground truncate">{task.title}</p>
                      <p className="text-xs text-muted-foreground">{task.project_name}</p>
                    </div>
                    <span className={cn("text-[10px] font-medium flex-shrink-0", task.due_date && isOverdue(task.due_date) ? "text-red-500" : "text-muted-foreground")}>
                      {task.due_date ? formatShortDate(task.due_date) : "No date"}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Recent Notifications */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
                  <Bell className="w-4 h-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentActivity.map((notif) => (
                  <div key={notif.id} className="flex items-start gap-3">
                    <div className={cn("w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0", notif.is_read ? "bg-muted-foreground/30" : "bg-indigo-500")} />
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-xs", notif.is_read ? "text-muted-foreground" : "text-foreground font-medium")}>
                        {notif.title}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {formatRelativeTime(notif.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
