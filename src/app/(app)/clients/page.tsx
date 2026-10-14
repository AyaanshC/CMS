"use client";

import { useState } from "react";
import { TopBar } from "@/components/layout/AppSidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, Plus, LayoutGrid, List, MoreHorizontal, Phone, Mail, Tag, Send } from "lucide-react";
import { formatCurrency, formatRelativeTime, getInitials, cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import Link from "next/link";
import AddClientModal from "@/components/clients/AddClientModal";

const TAG_COLORS: Record<string, string> = {
  VIP: "bg-amber-100 text-amber-700",
  Residential: "bg-blue-100 text-blue-700",
  Commercial: "bg-violet-100 text-violet-700",
  Office: "bg-primary/10 text-primary",
  New: "bg-green-100 text-green-700",
};

export default function ClientsPage() {
  const [view, setView] = useState<"table" | "card">("table");
  const [search, setSearch] = useState("");
  const [source, setSource] = useState("all");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const clients = useAppStore((state) => state.clients);

  const filtered = clients.filter((c) => (source === "all" || c.source === source) && (
    c.full_name.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search))
  );

  return (
    <div>
      <TopBar title="Clients" subtitle={`${clients.length} total clients`} />
      <div className="p-6">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between mb-6 gap-3 rounded-xl border border-border bg-card p-3">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email or phone…"
              aria-label="Search clients"
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select aria-label="Filter clients by source" value={source} onChange={(e) => setSource(e.target.value)} className="h-10 rounded-lg border border-border bg-card px-3 text-xs">
              <option value="all">All sources</option>
              {[...new Set(clients.map((c) => c.source).filter(Boolean))].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <div className="flex rounded-lg border border-border overflow-hidden">
              <button
                onClick={() => setView("table")}
                aria-label="Client table view"
                aria-pressed={view === "table"}
                className={cn("px-3 py-2 text-sm", view === "table" ? "bg-primary text-white" : "bg-card text-muted-foreground hover:bg-muted")}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setView("card")}
                aria-label="Client card view"
                aria-pressed={view === "card"}
                className={cn("px-3 py-2 text-sm", view === "card" ? "bg-primary text-white" : "bg-card text-muted-foreground hover:bg-muted")}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
            <Button onClick={() => setDrawerOpen(true)} className="gap-2 gradient-primary border-0">
              <Plus className="w-4 h-4" />
              Add Client
            </Button>
          </div>
        </div>

        {/* Table View */}
        {view === "table" && (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Active Projects</TableHead>
                  <TableHead>Total Value</TableHead>
                  <TableHead>Last Activity</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((client) => (
                  <TableRow key={client.id} className="cursor-pointer hover:bg-muted/30">
                    <TableCell>
                      <Link href={`/clients/${client.id}`} className="flex items-center gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                            {getInitials(client.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-sm text-foreground">{client.full_name}</p>
                          <p className="text-xs text-muted-foreground">{client.email}</p>
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{client.phone}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize text-xs">{client.source}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {client.tags.map((tag) => (
                          <span key={tag} className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", TAG_COLORS[tag] || "bg-slate-100 text-slate-700")}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 bg-primary/10 text-primary rounded-full flex items-center justify-center text-[11px] font-bold">
                          {client.active_projects}
                        </div>
                        <span className="text-sm text-muted-foreground">projects</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold text-sm">
                      {client.total_value ? formatCurrency(client.total_value) : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {client.last_activity ? formatRelativeTime(client.last_activity) : "—"}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger className="w-7 h-7 inline-flex items-center justify-center rounded-md hover:bg-muted cursor-pointer border-0 bg-transparent">
                          <MoreHorizontal className="w-4 h-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Link href={`/clients/${client.id}`} className="w-full">View Profile</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Send className="w-3.5 h-3.5 mr-2" /> Send Portal Invite
                          </DropdownMenuItem>
                          <DropdownMenuItem>Edit Client</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}

        {/* Card View */}
        {view === "card" && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((client) => (
              <Link key={client.id} href={`/clients/${client.id}`}>
                <Card className="card-hover cursor-pointer">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-11 h-11">
                          <AvatarFallback className="text-sm bg-primary/10 text-primary font-bold">
                            {getInitials(client.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-foreground">{client.full_name}</p>
                          <p className="text-xs text-muted-foreground capitalize">{client.source}</p>
                        </div>
                      </div>
                      <div className="flex gap-1 flex-wrap justify-end">
                        {client.tags.slice(0, 2).map((tag) => (
                          <span key={tag} className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", TAG_COLORS[tag] || "bg-slate-100 text-slate-700")}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1.5 mb-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="w-3.5 h-3.5" />
                        {client.phone}
                      </div>
                      {client.email && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="w-3.5 h-3.5" />
                          <span className="truncate">{client.email}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-border">
                      <div className="text-center">
                        <p className="text-lg font-bold text-primary">{client.active_projects}</p>
                        <p className="text-[10px] text-muted-foreground">Projects</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-foreground">
                          {client.total_value ? formatCurrency(client.total_value) : "—"}
                        </p>
                        <p className="text-[10px] text-muted-foreground">Total Value</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-medium text-muted-foreground">
                          {client.last_activity ? formatRelativeTime(client.last_activity) : "—"}
                        </p>
                        <p className="text-[10px] text-muted-foreground">Last active</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {/* Empty state */}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 bg-muted rounded-2xl flex items-center justify-center mb-4">
              <Tag className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-foreground mb-1">{clients.length ? "No matching clients" : "No clients yet"}</h3>
            <p className="text-sm text-muted-foreground mb-4">{clients.length ? "Try adjusting your search or filters." : "Add your first client to start managing their projects and enquiries."}</p>
            <Button onClick={() => setDrawerOpen(true)} className="gap-2 gradient-primary border-0">
              <Plus className="w-4 h-4" />
              {clients.length ? "Add client" : "Add first client"}
            </Button>
          </div>
        )}
      </div>

      <AddClientModal open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
