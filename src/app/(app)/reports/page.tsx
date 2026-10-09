"use client";

import { TopBar } from "@/components/layout/AppSidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3, TrendingUp, IndianRupee, Printer
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, CartesianGrid,
  XAxis, YAxis, Tooltip, Legend, PieChart as RechartsPieChart, Pie, Cell,
} from "recharts";
import { useAppStore } from "@/lib/store";
import { formatCurrency, getStatusColor, localToday, cn } from "@/lib/utils";
import {
  avgApprovalDays, avgSnagFixHours, cleanHandoverRate, fyStart, monthlySeries,
  onTimeMilestones, outputGst, ratio,
} from "@/lib/metrics/kpis";
import { NotEnoughData } from "@/components/metrics/NotEnoughData";
import { MetricInfo } from "@/components/metrics/MetricInfo";

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6", "#06b6d4"];

export default function ReportsPage() {
  const { projects, invoices, payments, expenses, snags, boqs, studioSettings } = useAppStore();
  const today = localToday();

  const liveInvoices = invoices.filter((i) => i.status !== "draft" && i.status !== "cancelled");
  const totalBilled = liveInvoices.reduce((s, i) => s + i.total_amount, 0);
  const totalCollected = payments.reduce((s, p) => s + p.amount, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const cashPosition = totalCollected - totalExpenses;
  const collectionEff = ratio(totalCollected, totalBilled);

  const series = monthlySeries(invoices, payments, expenses, today);
  const hasSeriesData = series.some((s) => s.invoiced > 0 || s.collected > 0 || s.expenses > 0);

  // Snags by Room
  const snagsByRoomMap = snags.reduce((acc, s) => {
    const room = s.room_name || "General";
    acc[room] = (acc[room] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const snagsByRoomData = Object.entries(snagsByRoomMap).map(([room, count]) => ({
    name: room,
    value: count,
  }));

  // Project Stage Distribution
  const stageDistributionMap = projects.reduce((acc, p) => {
    const stage = p.status.replace("_", " ");
    acc[stage] = (acc[stage] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const stageData = Object.entries(stageDistributionMap).map(([stage, count]) => ({
    name: stage,
    count,
  }));

  // Delivery & Quality Metrics
  const ot = onTimeMilestones(projects);
  const approvalDays = avgApprovalDays(boqs);
  const fixHours = avgSnagFixHours(snags);
  const cleanRate = cleanHandoverRate(projects, snags);

  // GST
  const fiscalYearStart = fyStart(today);
  const gst = outputGst(invoices, fiscalYearStart, today);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div>
      <TopBar title="Reports & Analytics" subtitle="Financial health, project velocity, and quality intelligence" />
      <div className="p-6 space-y-6">
        {/* Top KPI Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-medium text-muted-foreground">Total Invoiced</p>
                  <MetricInfo formula="Sum of all sent invoices, all time" />
                </div>
                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <BarChart3 className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-foreground mt-2">{formatCurrency(totalBilled)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Sent invoices, all time
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-medium text-muted-foreground">Cash Inflow (Collected)</p>
                  <MetricInfo formula="Total payments collected divided by total invoiced" />
                </div>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-emerald-600 mt-2">{formatCurrency(totalCollected)}</p>
              <div className="mt-1">
                {collectionEff === null ? (
                  <NotEnoughData />
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {Math.round(collectionEff * 100)}% collected of invoiced
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-medium text-muted-foreground">Expenses & Overheads</p>
                  <MetricInfo formula="Sum of recorded project and studio expenses" />
                </div>
                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                  <IndianRupee className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-800 mt-2">{formatCurrency(totalExpenses)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Materials, site labor & contractor payouts
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm bg-gradient-to-br from-indigo-900 to-slate-900 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-medium text-indigo-200">Cash position</p>
                  <MetricInfo formula="Total collections minus total recorded expenses" />
                </div>
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-emerald-400">
                  <IndianRupee className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-white mt-2">{formatCurrency(cashPosition)}</p>
              <p className="text-xs text-indigo-200 mt-1 opacity-90">
                Collected minus recorded expenses. True margin (incl. staff time) arrives in Phase 2.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabbed Analytics */}
        <Tabs defaultValue="financials" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <TabsList>
              <TabsTrigger value="financials">Financials & Margins</TabsTrigger>
              <TabsTrigger value="delivery">Project Velocity</TabsTrigger>
              <TabsTrigger value="quality">Quality & Snags</TabsTrigger>
              <TabsTrigger value="gst">GST & Taxes</TabsTrigger>
            </TabsList>

            <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5 self-start sm:self-auto">
              <Printer className="w-4 h-4" /> Print Analytics
            </Button>
          </div>

          {/* TAB 1: Financials */}
          <TabsContent value="financials" className="space-y-6">
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <CardTitle className="text-base font-bold">Monthly Billing, Collections & Expenses</CardTitle>
                    <MetricInfo formula="Invoiced amounts, payment receipts, and expenses grouped by calendar month" />
                  </div>
                </div>
                <CardDescription className="text-xs">
                  Inflows vs Outflows in INR across recent execution months
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!hasSeriesData ? (
                  <div className="h-80 w-full flex items-center justify-center">
                    <NotEnoughData hint="Appears once invoices or payments are recorded" />
                  </div>
                ) : (
                  <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={series} margin={{ top: 20, right: 20, left: 10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
                        <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `₹${v / 1000}k`} />
                        <Tooltip formatter={(value: unknown) => [formatCurrency(Number(value) || 0), ""]} />
                        <Legend />
                        <Bar dataKey="invoiced" name="Invoiced" fill="#6366f1" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="collected" name="Collected" fill="#10b981" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="expenses" name="Expenses" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Per-Project Cash Position Table */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-1.5">
                  <CardTitle className="text-base font-bold">Project cash position</CardTitle>
                  <MetricInfo formula="Payments collected minus project expenses recorded for each project" />
                </div>
                <CardDescription className="text-xs">
                  Realized cash position based on current milestone billings and site logs
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-slate-50/70 text-xs text-muted-foreground text-left">
                        <th className="py-2.5 px-4">Project</th>
                        <th className="py-2.5 px-4 text-right">Value (₹)</th>
                        <th className="py-2.5 px-4 text-right">Collected (₹)</th>
                        <th className="py-2.5 px-4 text-right">Expenses (₹)</th>
                        <th className="py-2.5 px-4 text-right">Cash position</th>
                        <th className="py-2.5 px-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {projects.map((proj) => {
                        const projInvoices = invoices.filter((i) => i.project_id === proj.id);
                        const collected = projInvoices.reduce((s, i) => s + i.amount_paid, 0);
                        const projExpenses = expenses
                          .filter((e) => e.project_id === proj.id)
                          .reduce((s, e) => s + e.amount, 0);
                        const margin = collected - projExpenses;

                        return (
                          <tr key={proj.id} className="hover:bg-slate-50/50">
                            <td className="py-3 px-4 font-semibold text-foreground">
                              {proj.name}
                              <p className="text-xs font-normal text-muted-foreground">{proj.client_name}</p>
                            </td>
                            <td className="py-3 px-4 text-right">{formatCurrency(proj.total_budget || 0)}</td>
                            <td className="py-3 px-4 text-right font-medium text-emerald-600">
                              {formatCurrency(collected)}
                            </td>
                            <td className="py-3 px-4 text-right text-slate-700">
                              {formatCurrency(projExpenses)}
                            </td>
                            <td className="py-3 px-4 text-right font-bold text-indigo-600">
                              {formatCurrency(margin)}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <Badge className={cn("text-[10px] border-0", getStatusColor(proj.status))}>
                                {proj.status.replace("_", " ")}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: Project Delivery */}
          <TabsContent value="delivery" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="shadow-sm">
                <CardHeader>
                  <div className="flex items-center gap-1.5">
                    <CardTitle className="text-base font-bold">Active Projects by Stage</CardTitle>
                    <MetricInfo formula="Count of projects currently in each lifecycle stage" />
                  </div>
                  <CardDescription className="text-xs">Current pipeline throughput</CardDescription>
                </CardHeader>
                <CardContent>
                  {stageData.length === 0 ? (
                    <div className="h-64 w-full flex items-center justify-center">
                      <NotEnoughData />
                    </div>
                  ) : (
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stageData} layout="vertical" margin={{ left: 30, right: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                          <XAxis type="number" />
                          <YAxis type="category" dataKey="name" fontSize={11} width={80} />
                          <Tooltip />
                          <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardHeader>
                  <div className="flex items-center gap-1.5">
                    <CardTitle className="text-base font-bold">Milestone Delivery Scorecard</CardTitle>
                    <MetricInfo formula="Evaluation of milestone timeliness and client approval turnaround" />
                  </div>
                  <CardDescription className="text-xs">On-time delivery against agreed client schedules</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-2">
                  <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-emerald-900">On-Time Milestones</span>
                        <MetricInfo formula="Milestones completed on or before due date over all completed milestones" />
                      </div>
                      {ot ? (
                        <span className="text-xl font-bold text-emerald-700">
                          {Math.round((ot.met / ot.total) * 100)}%
                        </span>
                      ) : null}
                    </div>
                    {ot ? (
                      <p className="text-xs text-emerald-700 mt-1">{ot.met} of {ot.total} completed milestones on or before due date</p>
                    ) : (
                      <div className="mt-1">
                        <NotEnoughData />
                      </div>
                    )}
                  </div>

                  <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-indigo-900">Average Turnaround / Stage</span>
                        <MetricInfo formula="Stage duration tracking starts in Phase 1" />
                      </div>
                    </div>
                    <div className="mt-1">
                      <NotEnoughData hint="Needs stage-completion dates (Phase 1 fee stages)" />
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-slate-900">Client Approval Velocity</span>
                        <MetricInfo formula="Average days from BOQ submission to client approval" />
                      </div>
                      {approvalDays !== null ? (
                        <span className="text-xl font-bold text-slate-700">{approvalDays} days</span>
                      ) : null}
                    </div>
                    {approvalDays !== null ? (
                      <p className="text-xs text-slate-600 mt-1">Average from BOQ submitted to client approval</p>
                    ) : (
                      <div className="mt-1">
                        <NotEnoughData />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* TAB 3: Quality & Snags */}
          <TabsContent value="quality" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="shadow-sm">
                <CardHeader>
                  <div className="flex items-center gap-1.5">
                    <CardTitle className="text-base font-bold">Snags Reported by Room</CardTitle>
                    <MetricInfo formula="Defect count breakdown by project room" />
                  </div>
                  <CardDescription className="text-xs">Defect distribution across living spaces</CardDescription>
                </CardHeader>
                <CardContent>
                  {snags.length === 0 ? (
                    <div className="h-64 w-full flex items-center justify-center">
                      <NotEnoughData />
                    </div>
                  ) : (
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPieChart>
                          <Pie
                            data={snagsByRoomData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            label={(e) => `${e.name}: ${e.value}`}
                          >
                            {snagsByRoomData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardHeader>
                  <div className="flex items-center gap-1.5">
                    <CardTitle className="text-base font-bold">Quality Benchmarks</CardTitle>
                    <MetricInfo formula="Resolution speeds and defect-free handover rate" />
                  </div>
                  <CardDescription className="text-xs">Resolution speeds and post-handover ratings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-2">
                  <div className="flex items-center justify-between p-3.5 border border-border rounded-xl">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-semibold text-foreground">Average Fix Time</p>
                        <MetricInfo formula="Average hours from snag raised to marked fixed" />
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">From snag raised to marked fixed</p>
                    </div>
                    {fixHours !== null ? (
                      <span className="text-xl font-bold text-indigo-600">{fixHours} hours</span>
                    ) : (
                      <NotEnoughData />
                    )}
                  </div>

                  <div className="flex items-center justify-between p-3.5 border border-border rounded-xl">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-semibold text-foreground">Zero-Snag Handover Rate</p>
                        <MetricInfo formula="Projects in handover or closed status with zero open defects" />
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">Projects in handover or closed with 0 open snags</p>
                    </div>
                    {cleanRate !== null ? (
                      <span className="text-xl font-bold text-emerald-600">
                        {Math.round((cleanRate.clean / cleanRate.total) * 100)}% ({cleanRate.clean} of {cleanRate.total})
                      </span>
                    ) : (
                      <NotEnoughData />
                    )}
                  </div>

                  <div className="flex items-center justify-between p-3.5 border border-border rounded-xl">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-semibold text-foreground">Client Satisfaction Index</p>
                        <MetricInfo formula="Client satisfaction survey ratings arrive in Phase 4" />
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">Post-handover survey feedback</p>
                    </div>
                    <NotEnoughData hint="Client surveys arrive in Phase 4" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* TAB 4: GST & Taxes */}
          <TabsContent value="gst" className="space-y-6">
            <Card className="shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-1.5">
                  <CardTitle className="text-base font-bold">GST Summary & Tax Liability</CardTitle>
                  <MetricInfo formula="Applicable GST liability on issued client deliverables" />
                </div>
                <CardDescription className="text-xs">
                  Applicable GST ({studioSettings.gst_rate}%) on interior architectural deliverables
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-xl border border-border">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs text-muted-foreground">Output GST Collected</p>
                      <MetricInfo formula="GST on sent invoices in the current financial year (from April 1)" />
                    </div>
                    <p className="text-2xl font-bold text-foreground mt-1">{formatCurrency(gst)}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Sent invoices this financial year</p>
                  </div>
                  <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs text-emerald-800">Input Tax Credit (ITC)</p>
                      <MetricInfo formula="Input tax credit tracking arrives with vendor bills in Phase 3" />
                    </div>
                    <div className="mt-2">
                      <NotEnoughData hint="Needs vendor bills (Phase 3)" />
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-100/70 rounded-xl text-xs space-y-1.5 text-slate-700">
                  <div className="flex justify-between">
                    <span>Studio GSTIN:</span>
                    <span className="font-mono font-bold">{studioSettings.gstin || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>PAN Number:</span>
                    <span className="font-mono font-bold">{studioSettings.pan || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Filing Jurisdiction:</span>
                    <span className="font-semibold">State code: {studioSettings.gstin?.slice(0, 2) ?? "—"}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
