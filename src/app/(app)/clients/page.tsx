"use client";

import { useState } from "react";
import { TopBar } from "@/components/layout/AppSidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search, Plus, LayoutGrid, List, MoreHorizontal,
  Phone, Mail, Tag, Send, Filter,
} from "lucide-react";
import { formatCurrency, formatRelativeTime, getInitials, cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import Link from "next/link";
import AddClientModal from "@/components/clients/AddClientModal";

const TAG_COLORS: Record<string, string> = {
  VIP: "bg-amber-100 text-amber-700",
  Residential: "bg-blue-100 text-blue-700",
  Commercial: "bg-violet-100 text-violet-700",
  Office: "bg-indigo-100 text-indigo-700",
  New: "bg-green-100 text-green-700",
};

export default function ClientsPage() {
  const [view, setView] = useState<"table" | "card">("table");
  const [search, setSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const clients = useAppStore((state) => state.clients);

  const filtered = clients.filter((c) =>
    c.full_name.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  );

  return (
    <div>
      <TopBar title="Clients" subtitle={`${clients.length} total clients`} />
      <div className="p-6">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-6 gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email or phone…"
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="w-3.5 h-3.5" />
              Filter
            </Button>
            <div className="flex rounded-lg border border-border overflow-hidden">
              <button
                onClick={() => setView("table")}
                className={cn("px-3 py-2 text-sm", view === "table" ? "bg-primary text-white" : "bg-card text-muted-foreground hover:bg-muted")}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setView("card")}
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
                          <AvatarFallback className="text-xs bg-indigo-100 text-indigo-700 font-semibold">
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
                        <div className="w-5 h-5 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-[11px] font-bold">
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
                          <AvatarFallback className="text-sm bg-indigo-100 text-indigo-700 font-bold">
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
                        <p className="text-lg font-bold text-indigo-600">{client.active_projects}</p>
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
            <h3 className="font-semibold text-foreground mb-1">No clients found</h3>
            <p className="text-sm text-muted-foreground mb-4">Try adjusting your search or add a new client.</p>
            <Button onClick={() => setDrawerOpen(true)} className="gap-2 gradient-primary border-0">
              <Plus className="w-4 h-4" />
              Add First Client
            </Button>
          </div>
        )}
      </div>

      <AddClientModal open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
