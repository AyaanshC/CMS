"use client";

import { use, Suspense } from "react";
import { TopBar } from "@/components/layout/AppSidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Phone, Mail, MapPin, Send, Edit2, ExternalLink,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { formatCurrency, formatDate, formatRelativeTime, getInitials, getStatusColor, cn } from "@/lib/utils";
import Link from "next/link";
import { PortalAccessCard } from "@/components/clients/PortalAccessCard";

const TAG_COLORS: Record<string, string> = {
  VIP: "bg-amber-100 text-amber-700",
  Residential: "bg-blue-100 text-blue-700",
  Commercial: "bg-violet-100 text-violet-700",
  Office: "bg-indigo-100 text-indigo-700",
  New: "bg-green-100 text-green-700",
};

const ACTIVITY_FEED = [
  { date: "2024-12-10T14:30:00Z", text: "Client sent a message: 'When will the marble work start?'" },
  { date: "2024-11-22T14:00:00Z", text: "Client approved BOQ v3 — ₹12,49,500" },
  { date: "2024-11-08T10:00:00Z", text: "Design concept approved" },
  { date: "2024-10-22T09:00:00Z", text: "Project created — Sharma Residence Full Home" },
  { date: "2024-10-15T09:00:00Z", text: "Client profile created" },
];

export default function ClientProfilePage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="p-6">Loading client...</div>}>
      <ClientProfileContent params={params} />
    </Suspense>
  );
}

function ClientProfileContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { clients, projects, invoices } = useAppStore();
  
  const client = clients.find((c) => c.id === id);
  const clientProjects = projects.filter((p) => p.client_id === id);
  const clientInvoices = invoices.filter((i) => clientProjects.some((p) => p.id === i.project_id));
  const totalInvoiced = clientInvoices.reduce((s, i) => s + i.total_amount, 0);
  const totalPaid = clientInvoices.reduce((s, i) => s + i.amount_paid, 0);
  const totalOutstanding = clientInvoices.reduce((s, i) => s + i.amount_due, 0);

  if (!client) {
    return <div className="p-6 text-muted-foreground">Client not found.</div>;
  }

  return (
    <div>
      <TopBar title="Client Profile" subtitle={client.full_name} />
      <div className="p-6 space-y-6">
        {/* Header Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-5">
              <Avatar className="w-16 h-16">
                <AvatarFallback className="text-xl bg-indigo-100 text-indigo-700 font-bold">
                  {getInitials(client.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-xl font-bold text-foreground">{client.full_name}</h2>
                  {client.tags.map((tag) => (
                    <span key={tag} className={cn("text-xs px-2 py-0.5 rounded-full font-medium", TAG_COLORS[tag] || "bg-slate-100 text-slate-700")}>
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" />
                    {client.phone}
                  </div>
                  {client.email && (
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5" />
                      {client.email}
                    </div>
                  )}
                  {client.address && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" />
                      <span className="truncate max-w-xs">{client.address}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-2">
                  <Edit2 className="w-3.5 h-3.5" />
                  Edit
                </Button>
                <Button size="sm" className="gradient-primary border-0 gap-2">
                  <Send className="w-3.5 h-3.5" />
                  Send Portal Invite
                </Button>
              </div>
            </div>
            {/* Stats */}
            <div className="grid grid-cols-4 gap-4 mt-5 pt-5 border-t border-border">
              <div className="text-center">
                <p className="text-2xl font-bold text-indigo-600">{clientProjects.length}</p>
                <p className="text-xs text-muted-foreground">Total Projects</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">{formatCurrency(totalInvoiced)}</p>
                <p className="text-xs text-muted-foreground">Total Invoiced</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalPaid)}</p>
                <p className="text-xs text-muted-foreground">Total Paid</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-amber-600">{formatCurrency(totalOutstanding)}</p>
                <p className="text-xs text-muted-foreground">Outstanding</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="projects">Projects ({clientProjects.length})</TabsTrigger>
            <TabsTrigger value="communication">Communication</TabsTrigger>
            <TabsTrigger value="finance">Finance</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-4 space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">Style Preferences</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Budget Range</p>
                    <p className="font-medium">
                      {client.budget_min && client.budget_max
                        ? `${formatCurrency(client.budget_min)} – ${formatCurrency(client.budget_max)}`
                        : "Not specified"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">How they found us</p>
                    <Badge variant="secondary" className="capitalize">{client.source}</Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Notes</p>
                    <p className="text-foreground leading-relaxed">{client.notes || "No notes added."}</p>
                  </div>
                </CardContent>
              </Card>
              <div className="space-y-4">
                <PortalAccessCard client={client} />
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold">Activity Timeline</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="timeline-line space-y-4">
                      {ACTIVITY_FEED.map((item, i) => (
                        <div key={i} className="flex items-start gap-3 pl-5 relative">
                          <div className="absolute left-0 top-1.5 w-3.5 h-3.5 bg-card border-2 border-indigo-400 rounded-full z-10" />
                          <div>
                            <p className="text-sm text-foreground">{item.text}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{formatRelativeTime(item.date)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Projects Tab */}
          <TabsContent value="projects" className="mt-4">
            <div className="space-y-3">
              {clientProjects.map((project) => (
                <Link key={project.id} href={`/projects/${project.id}`}>
                  <Card className="card-hover cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <p className="font-semibold text-foreground">{project.name}</p>
                            <Badge className={cn("text-xs border-0", getStatusColor(project.status))}>
                              {project.status.replace("_", " ")}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3">
                            <Progress value={project.progress_percent} className="h-1.5 flex-1" />
                            <span className="text-xs text-muted-foreground">{project.progress_percent}%</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {project.reference_number} · {project.area_sqft} sqft
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-foreground">{project.total_budget ? formatCurrency(project.total_budget) : "—"}</p>
                          <p className="text-xs text-muted-foreground">project value</p>
                        </div>
                        <ExternalLink className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </TabsContent>

          {/* Communication Tab */}
          <TabsContent value="communication" className="mt-4">
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground text-center py-8">
                  Communication history across all projects will appear here.
                  <br />
                  <Link href={`/projects/${clientProjects[0]?.id}/messages`} className="text-primary hover:underline mt-2 inline-block">
                    Go to project messages →
                  </Link>
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Finance Tab */}
          <TabsContent value="finance" className="mt-4">
            <div className="space-y-3">
              {clientInvoices.map((invoice) => (
                <Card key={invoice.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-foreground">{invoice.invoice_number}</p>
                        <p className="text-xs text-muted-foreground">{invoice.project_name} · Due {invoice.due_date ? formatDate(invoice.due_date) : "—"}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-foreground">{formatCurrency(invoice.total_amount)}</p>
                        <Badge className={cn("text-xs border-0 mt-1", getStatusColor(invoice.status))}>
                          {invoice.status}
                        </Badge>
                      </div>
                    </div>
                    {invoice.amount_due > 0 && (
                      <div className="mt-2 pt-2 border-t border-border">
                        <Progress value={(invoice.amount_paid / invoice.total_amount) * 100} className="h-1.5" />
                        <p className="text-xs text-amber-600 mt-1">
                          {formatCurrency(invoice.amount_due)} outstanding
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
