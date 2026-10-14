"use client";

import { BrandLoader } from "@/components/brand/BrandLoader";
import { use, Suspense, useState } from "react";
import { TopBar } from "@/components/layout/AppSidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Phone, Mail, MapPin, Send, Edit2, ExternalLink,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { formatCurrency, formatDate, formatRelativeTime, getInitials, getStatusColor, cn } from "@/lib/utils";
import Link from "next/link";
import { PortalAccessCard } from "@/components/clients/PortalAccessCard";
import { EditClientDialog } from "@/components/clients/EditClientDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { invoiceSummary } from "@/lib/finance/summary";

const TAG_COLORS: Record<string, string> = {
  VIP: "bg-amber-100 text-amber-700",
  Residential: "bg-blue-100 text-blue-700",
  Commercial: "bg-violet-100 text-violet-700",
  Office: "bg-primary/10 text-primary",
  New: "bg-green-100 text-green-700",
};


export default function ClientProfilePage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<BrandLoader label="Loading client" />}>
      <ClientProfileContent params={params} />
    </Suspense>
  );
}

function ClientProfileContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { clients, projects, invoices, updateClient, activityLogs, messages } = useAppStore();
  const [editing, setEditing] = useState(false);
  const [inviting, setInviting] = useState(false);
  
  const client = clients.find((c) => c.id === id);
  const clientProjects = projects.filter((p) => p.client_id === id);
  const clientInvoices = invoices.filter((i) => clientProjects.some((p) => p.id === i.project_id));
  const summary = invoiceSummary(clientInvoices);
  const totalInvoiced = summary.invoiced, totalPaid = summary.collected, totalOutstanding = summary.outstanding;
  const activity = activityLogs.filter(a => a.client_id === id || clientProjects.some(p => p.id === a.project_id));
  const clientMessages = messages.filter(m => clientProjects.some(p => p.id === m.project_id));

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
                <AvatarFallback className="text-xl bg-primary/10 text-primary font-bold">
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
                <Button onClick={() => setEditing(true)} variant="outline" size="sm" className="gap-2">
                  <Edit2 className="w-3.5 h-3.5" />
                  Edit
                </Button>
                <Button onClick={() => setInviting(true)} size="sm" className="gradient-primary border-0 gap-2">
                  <Send className="w-3.5 h-3.5" />
                  Send Portal Invite
                </Button>
              </div>
            </div>
            {/* Stats */}
            <div className="grid grid-cols-4 gap-4 mt-5 pt-5 border-t border-border">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{clientProjects.length}</p>
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
                    <p className="text-xs text-muted-foreground mb-1">Payment terms</p>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        max="180"
                        className="w-24 h-8 text-sm"
                        defaultValue={client.payment_terms_days}
                        onBlur={(e) => updateClient(client.id, { payment_terms_days: Number(e.target.value) || 0 })}
                      />
                      <span className="text-sm text-muted-foreground">days</span>
                    </div>
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
                      {activity.length === 0 && <p className="text-sm text-muted-foreground">No activity recorded yet.</p>}
                      {activity.map((item, i) => (
                        <div key={i} className="flex items-start gap-3 pl-5 relative">
                          <div className="absolute left-0 top-1.5 w-3.5 h-3.5 bg-card border-2 border-indigo-400 rounded-full z-10" />
                          <div>
                            <p className="text-sm text-foreground">{item.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{formatRelativeTime(item.created_at)}</p>
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
                <div className="space-y-4">{clientMessages.length === 0 && <p className="text-sm text-muted-foreground">No messages recorded yet.</p>}{clientMessages.map(m => <div key={m.id} className="border-b pb-3"><p className="text-xs text-muted-foreground">{m.sender_name} · {formatRelativeTime(m.created_at)}</p><p className="mt-1 text-sm">{m.content || m.file_name}</p><Link href={`/projects/${m.project_id}?tab=messages`} className="text-xs text-primary hover:underline">Open conversation →</Link></div>)}{clientProjects.map(p => <Link key={p.id} href={`/projects/${p.id}?tab=messages`} className="block text-sm text-primary hover:underline">Go to {p.name} messages →</Link>)}</div>
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
        {editing && <EditClientDialog key={client.id} client={client} open={editing} onOpenChange={setEditing} />}
        <Dialog open={inviting} onOpenChange={setInviting}><DialogContent><DialogHeader><DialogTitle>Client portal invitation</DialogTitle></DialogHeader><PortalAccessCard client={client} /></DialogContent></Dialog>
      </div>
    </div>
  );
}
