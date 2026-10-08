"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  FileSpreadsheet,
  AlertTriangle,
  MessageSquare,
  Receipt,
  FolderOpen,
  CheckSquare,
  BarChart3,
  Settings,
  Bell,
  ChevronDown,
  LogOut,
  Building2,
  Search,
} from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import { MOCK_USER, MOCK_STUDIO, MOCK_NOTIFICATIONS } from "@/lib/mock-data";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/invoices", label: "Invoices", icon: Receipt },
  { href: "/tasks", label: "My Tasks", icon: CheckSquare },
  { href: "/reports", label: "Reports", icon: BarChart3 },
];

const BOTTOM_NAV = [
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();
  const unreadCount = MOCK_NOTIFICATIONS.filter((n) => !n.is_read).length;

  return (
    <aside className="flex flex-col w-60 min-h-screen bg-[hsl(var(--sidebar))] border-r border-[hsl(var(--sidebar-border))]">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-[hsl(var(--sidebar-border))]">
        <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center flex-shrink-0">
          <Building2 className="w-4 h-4 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-white text-sm font-semibold truncate">{MOCK_STUDIO.name}</p>
          <p className="text-[hsl(var(--sidebar-foreground))] text-xs truncate opacity-60">Studio CMS</p>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-3">
        <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[hsl(var(--sidebar-foreground))] opacity-60 hover:opacity-100 hover:bg-[hsl(var(--sidebar-accent))] transition-all text-sm">
          <Search className="w-4 h-4" />
          <span>Search...</span>
          <kbd className="ml-auto text-[10px] bg-[hsl(var(--sidebar-accent))] px-1.5 py-0.5 rounded">⌘K</kbd>
        </button>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3">
        <nav className="space-y-0.5">
          <p className="text-[10px] uppercase tracking-widest text-[hsl(var(--sidebar-foreground))] opacity-40 px-3 pt-2 pb-1">
            Main Menu
          </p>
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group",
                  isActive
                    ? "bg-[hsl(var(--sidebar-primary))] text-white shadow-sm"
                    : "text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent))] hover:text-white opacity-70 hover:opacity-100"
                )}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Bottom section */}
      <div className="border-t border-[hsl(var(--sidebar-border))] p-3 space-y-1">
        {BOTTOM_NAV.map(({ href, label, icon: Icon }) => {
          const isActive = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                isActive
                  ? "bg-[hsl(var(--sidebar-primary))] text-white"
                  : "text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent))] hover:text-white opacity-70 hover:opacity-100"
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          );
        })}

        {/* User profile */}
        <DropdownMenu>
          <DropdownMenuTrigger className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[hsl(var(--sidebar-accent))] transition-all group mt-1 text-left cursor-pointer border-0 bg-transparent outline-none">
            <Avatar className="w-7 h-7 flex-shrink-0">
              <AvatarFallback className="text-xs bg-[hsl(var(--sidebar-primary))] text-white">
                {getInitials(MOCK_USER.full_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-white text-sm font-medium truncate">{MOCK_USER.full_name}</p>
              <p className="text-[hsl(var(--sidebar-foreground))] text-xs truncate opacity-60 capitalize">{MOCK_USER.role}</p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[hsl(var(--sidebar-foreground))] opacity-50 flex-shrink-0" />
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-52">
            <DropdownMenuLabel className="font-normal">
              <p className="font-semibold text-sm">{MOCK_USER.full_name}</p>
              <p className="text-xs text-muted-foreground">{MOCK_USER.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Profile Settings</DropdownMenuItem>
            <DropdownMenuItem>Studio Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}

export function TopBar({ title, subtitle }: { title: string; subtitle?: string }) {
  const unreadCount = MOCK_NOTIFICATIONS.filter((n) => !n.is_read).length;

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
      <div>
        <h1 className="text-lg font-semibold text-foreground">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <Link href="/notifications">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive text-white text-[10px] rounded-full flex items-center justify-center font-semibold">
                {unreadCount}
              </span>
            )}
          </Button>
        </Link>
      </div>
    </header>
  );
}
