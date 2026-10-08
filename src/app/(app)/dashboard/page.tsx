"use client";

import { TopBar } from "@/components/layout/AppSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  FolderKanban, IndianRupee, AlertCircle, CheckSquare,
  Clock, TrendingUp, ArrowRight, Bell, CalendarDays,
} from "lucide-react";
import {
  formatCurrency, formatRelativeTime, getStatusColor,
  getPriorityColor, getInitials, formatShortDate, isOverdue,
} from "@/lib/utils";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import { MOCK_REVENUE_DATA, MOCK_PROJECT_STATUS_DATA } from "@/lib/mock-data";

const KPI_CARDS = [
  {
    title: "Active Projects",
    value: 6, // Mock static for now since original was static
    icon: FolderKanban,
    color: "gradient-primary",
    textColor: "text-indigo-600",
    bgColor: "bg-indigo-50",
    change: "+2 this month",
    href: "/projects",
  },
  {
    title: "Revenue This Month",
    value: formatCurrency(1250000),
    icon: IndianRupee,
    color: "gradient-success",
    textColor: "text-emerald-600",
    bgColor: "bg-emerald-50",
    change: "+18% vs last month",
    href: "/reports",
  },
  {
    title: "Outstanding Payments",
    value: formatCurrency(450000),
    icon: AlertCircle,
    color: "gradient-warning",
    textColor: "text-amber-600",
    bgColor: "bg-amber-50",
    change: "3 invoices pending",
    href: "/invoices",
  },
  {
    title: "Open Snags",
    value: 12,
    icon: AlertCircle,
    color: "gradient-danger",
    textColor: "text-red-600",
    bgColor: "bg-red-50",
    change: "2 critical priority",
    href: "/projects",
  },
  {
    title: "Tasks Due Today",
    value: 5,
    icon: CheckSquare,
    color: "gradient-primary",
    textColor: "text-violet-600",
    bgColor: "bg-violet-50",
    change: "Across 3 projects",
    href: "/tasks",
  },
  {
    title: "Pending Approvals",
    value: 2,
    icon: Clock,
    color: "gradient-warning",
    textColor: "text-orange-600",
    bgColor: "bg-orange-50",
    change: "BOQ + Design",
    href: "/projects",
  },
];

const CUSTOM_TOOLTIP = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-xl p-3 shadow-lg text-sm">
        <p className="font-semibold text-foreground mb-1">{label}</p>
        {payload.map((entry: any, i: number) => (
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
  const { notifications, projects, tasks } = useAppStore();
  const recentActivity = notifications.slice(0, 5);
  const upcomingTasks = tasks
    .filter((t) => t.status !== "done")
    .sort((a, b) => (a.due_date || "").localeCompare(b.due_date || ""))
    .slice(0, 5);

  return (
    <div>
      <TopBar
        title="Dashboard"
        subtitle={`Good morning, Priya 👋`}
      />
      <div className="p-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {KPI_CARDS.map((kpi) => (
            <Link key={kpi.title} href={kpi.href}>
              <Card className="card-hover border-border cursor-pointer">
                <CardContent className="p-4">
                  <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center mb-3", kpi.bgColor)}>
                    <kpi.icon className={cn("w-4 h-4", kpi.textColor)} />
                  </div>
                  <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
                  <p className="text-xs font-medium text-muted-foreground mt-0.5">{kpi.title}</p>
                  <p className="text-[11px] text-muted-foreground mt-1 opacity-70">{kpi.change}</p>
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
                <CardTitle className="text-base font-semibold">Revenue vs Expenses</CardTitle>
                <Badge variant="secondary" className="text-xs">Last 6 months</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={MOCK_REVENUE_DATA} barSize={20} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`} />
                  <Tooltip content={<CUSTOM_TOOLTIP />} />
                  <Bar dataKey="revenue" name="Revenue" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" name="Expenses" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Project Status Donut */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Projects by Stage</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={MOCK_PROJECT_STATUS_DATA}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {MOCK_PROJECT_STATUS_DATA.map((entry: any, index: number) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, n) => [v, n]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {MOCK_PROJECT_STATUS_DATA.map((item: any) => (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                      <span className="text-muted-foreground">{item.name}</span>
                    </div>
                    <span className="font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
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
  );
}
