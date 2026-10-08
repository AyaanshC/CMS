"use client";

import { useState } from "react";
import { TopBar } from "@/components/layout/AppSidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3, TrendingUp, IndianRupee, PieChart, ShieldCheck, Download,
  ArrowUpRight, ArrowDownRight, CheckCircle2, Clock, Calendar, Printer
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, CartesianGrid,
  XAxis, YAxis, Tooltip, Legend, PieChart as RechartsPieChart, Pie, Cell, AreaChart, Area
} from "recharts";
import { useAppStore } from "@/lib/store";
import { formatCurrency, formatPercent, getStatusColor, cn } from "@/lib/utils";

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6", "#06b6d4"];

export default function ReportsPage() {
  const { projects, invoices, expenses, snags, studioSettings } = useAppStore();

  const totalBilled = invoices.reduce((s, i) => s + i.total_amount, 0);
  const totalCollected = invoices.reduce((s, i) => s + i.amount_paid, 0);
  const totalOutstanding = invoices.reduce((s, i) => s + i.amount_due, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const netProfit = totalCollected - totalExpenses;
  const marginPercent = totalCollected > 0 ? (netProfit / totalCollected) * 100 : 0;

  // Monthly Revenue & Expense Data
  const monthlyData = [
    { month: "Jun", billed: 450000, collected: 400000, expenses: 280000 },
    { month: "Jul", billed: 620000, collected: 550000, expenses: 390000 },
    { month: "Aug", billed: 850000, collected: 780000, expenses: 510000 },
    { month: "Sep", billed: 920000, collected: 890000, expenses: 580000 },
    { month: "Oct", billed: 1240000, collected: 1100000, expenses: 720000 },
    { month: "Nov", billed: 1450000, collected: 1350000, expenses: 840000 },
  ];

  // Snags by Room
  const snagsByRoomMap = snags.reduce((acc, s) => {
    const room = s.room_name || s.room || "General";
    acc[room] = (acc[room] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const snagsByRoomData = Object.entries(snagsByRoomMap).map(([room, count]) => ({
    name: room,
    value: count,
  }));

  // Project Stage Distribution
  const stageDistribution = projects.reduce((acc, p) => {
    const stage = p.status.replace("_", " ");
    acc[stage] = (acc[stage] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const stageData = Object.entries(stageDistribution).map(([stage, count]) => ({
    name: stage,
    count,
  }));

  // GST Breakdown
  const gstCollected = Math.round((totalBilled * studioSettings.gst_rate) / (100 + studioSettings.gst_rate));
  const estimatedInputTaxCredit = Math.round(gstCollected * 0.45);
  const netGstPayable = gstCollected - estimatedInputTaxCredit;

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
                <p className="text-xs font-medium text-muted-foreground">Total Invoiced</p>
                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <BarChart3 className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-foreground mt-2">{formatCurrency(totalBilled)}</p>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <span className="text-emerald-600 font-semibold flex items-center">
                  <ArrowUpRight className="w-3.5 h-3.5" /> +18.4%
                </span> vs last quarter
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">Cash Inflow (Collected)</p>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-emerald-600 mt-2">{formatCurrency(totalCollected)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {((totalCollected / totalBilled) * 100).toFixed(0)}% collection efficiency
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">Expenses & Overheads</p>
                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                  <ArrowDownRight className="w-4 h-4" />
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
                <p className="text-xs font-medium text-indigo-200">Net Studio Margin</p>
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-emerald-400">
                  <IndianRupee className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-white mt-2">{formatCurrency(netProfit)}</p>
              <p className="text-xs text-emerald-400 font-semibold mt-1">
                {marginPercent.toFixed(1)}% Net Margin
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
                <CardTitle className="text-base font-bold">Monthly Billing, Collections & Expenses</CardTitle>
                <CardDescription className="text-xs">
                  Inflows vs Outflows in INR across recent execution months
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData} margin={{ top: 20, right: 20, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
                      <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `₹${v / 1000}k`} />
                      <Tooltip formatter={(value: any) => [formatCurrency(Number(value)), ""]} />
                      <Legend />
                      <Bar dataKey="billed" name="Invoiced" fill="#6366f1" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="collected" name="Collected" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="expenses" name="Expenses" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Per-Project Profitability Table */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold">Project Margin Analysis</CardTitle>
                <CardDescription className="text-xs">
                  Realized margins based on current milestone billings and site logs
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
                        <th className="py-2.5 px-4 text-right">Gross Margin</th>
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
                        const pct = collected > 0 ? (margin / collected) * 100 : 25;

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
                              {formatCurrency(margin)} ({pct.toFixed(0)}%)
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
                  <CardTitle className="text-base font-bold">Active Projects by Stage</CardTitle>
                  <CardDescription className="text-xs">Current pipeline throughput</CardDescription>
                </CardHeader>
                <CardContent>
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
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base font-bold">Milestone Delivery Scorecard</CardTitle>
                  <CardDescription className="text-xs">On-time delivery against agreed client schedules</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-2">
                  <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-emerald-900">On-Time Milestones</span>
                      <span className="text-xl font-bold text-emerald-700">92.4%</span>
                    </div>
                    <p className="text-xs text-emerald-700 mt-1">24 out of 26 target handover dates met</p>
                  </div>
                  <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-200">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-indigo-900">Average Turnaround / Stage</span>
                      <span className="text-xl font-bold text-indigo-700">14.2 Days</span>
                    </div>
                    <p className="text-xs text-indigo-700 mt-1">From Concept Signoff to Execution Handover</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-900">Client Approval Velocity</span>
                      <span className="text-xl font-bold text-slate-700">1.8 Days</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">Average time for client BOQ digital signoff</p>
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
                  <CardTitle className="text-base font-bold">Snags Reported by Room</CardTitle>
                  <CardDescription className="text-xs">Defect distribution across living spaces</CardDescription>
                </CardHeader>
                <CardContent>
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
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base font-bold">Quality Benchmarks</CardTitle>
                  <CardDescription className="text-xs">Resolution speeds and post-handover ratings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-2">
                  <div className="flex items-center justify-between p-3.5 border border-border rounded-xl">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Average Fix Time</p>
                      <p className="text-xs text-muted-foreground mt-0.5">From snag raised to contractor fix</p>
                    </div>
                    <span className="text-xl font-bold text-indigo-600">48 Hours</span>
                  </div>

                  <div className="flex items-center justify-between p-3.5 border border-border rounded-xl">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Zero-Snag Handover Rate</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Projects closed with 0 open defects</p>
                    </div>
                    <span className="text-xl font-bold text-emerald-600">100%</span>
                  </div>

                  <div className="flex items-center justify-between p-3.5 border border-border rounded-xl">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Client Satisfaction Index</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Post-handover survey feedback</p>
                    </div>
                    <span className="text-xl font-bold text-amber-500">4.9 / 5.0 ★</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* TAB 4: GST & Taxes */}
          <TabsContent value="gst" className="space-y-6">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-bold">GST Summary & Tax Liability</CardTitle>
                <CardDescription className="text-xs">
                  Applicable GST ({studioSettings.gst_rate}%) on interior architectural deliverables
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 bg-slate-50 rounded-xl border border-border">
                    <p className="text-xs text-muted-foreground">Output GST Collected</p>
                    <p className="text-2xl font-bold text-foreground mt-1">{formatCurrency(gstCollected)}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">On billings issued to clients</p>
                  </div>
                  <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                    <p className="text-xs text-emerald-800">Input Tax Credit (ITC)</p>
                    <p className="text-2xl font-bold text-emerald-700 mt-1">{formatCurrency(estimatedInputTaxCredit)}</p>
                    <p className="text-[11px] text-emerald-600 mt-0.5">Paid on materials & contractor invoices</p>
                  </div>
                  <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                    <p className="text-xs text-amber-800">Net GST Payable</p>
                    <p className="text-2xl font-bold text-amber-700 mt-1">{formatCurrency(netGstPayable)}</p>
                    <p className="text-[11px] text-amber-600 mt-0.5">Estimated quarterly remittance</p>
                  </div>
                </div>

                <div className="p-4 bg-slate-100/70 rounded-xl text-xs space-y-1.5 text-slate-700">
                  <div className="flex justify-between">
                    <span>Studio GSTIN:</span>
                    <span className="font-mono font-bold">{studioSettings.gstin}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>PAN Number:</span>
                    <span className="font-mono font-bold">{studioSettings.pan}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Filing Jurisdiction:</span>
                    <span className="font-semibold">Bangalore Central, Karnataka (29)</span>
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
