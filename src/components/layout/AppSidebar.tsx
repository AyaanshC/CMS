"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  Receipt,
  CheckSquare,
  BarChart3,
  Settings,
  Bell,
  ChevronsUpDown,
  LogOut,
  Search,
  Landmark,
  Clock,
  Truck,
  Menu,
  ArrowUpRight,
  Layers3,
} from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuGroup,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { useAppStore } from "@/lib/store";
import { hasAnyRole } from "@/lib/permissions";
import { signOut } from "@/app/actions/auth";
import type { AppRole } from "@/types";

const NAV_ITEMS: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  group: string;
  roles?: AppRole[];
}[] = [
  {
    href: "/dashboard",
    label: "Overview",
    icon: LayoutDashboard,
    group: "Workspace",
  },
  {
    href: "/projects",
    label: "Projects",
    icon: FolderKanban,
    group: "Workspace",
  },
  {
    href: "/clients",
    label: "Clients",
    icon: Users,
    group: "Workspace",
    roles: ["owner", "director", "project_manager", "admin"],
  },
  { href: "/tasks", label: "My tasks", icon: CheckSquare, group: "Workspace" },
  { href: "/timesheets", label: "Timesheets", icon: Clock, group: "Workspace" },
  {
    href: "/approvals",
    label: "Approval inbox",
    icon: CheckSquare,
    group: "Workspace",
  },
  {
    href: "/invoices",
    label: "Invoices",
    icon: Receipt,
    group: "Business",
    roles: ["owner", "director", "project_manager", "finance"],
  },
  {
    href: "/finance",
    label: "Finance",
    icon: Landmark,
    group: "Business",
    roles: ["owner", "director", "finance"],
  },
  {
    href: "/vendors",
    label: "Vendors",
    icon: Truck,
    group: "Business",
    roles: ["owner", "director", "project_manager", "finance", "procurement"],
  },
  {
    href: "/reports",
    label: "Reports",
    icon: BarChart3,
    group: "Business",
    roles: ["owner", "director", "finance"],
  },
  {
    href: "/settings",
    label: "Settings",
    icon: Settings,
    group: "Studio",
    roles: ["owner", "director", "project_manager", "procurement"],
  },
];

function SidebarContent({
  onNavigate,
  onSearch,
}: {
  onNavigate?: () => void;
  onSearch?: () => void;
}) {
  const pathname = usePathname();
  const { me, studioSettings, projects } = useAppStore();
  const visible = NAV_ITEMS.filter((i) => !i.roles || hasAnyRole(me, i.roles));
  const activeCount = projects.filter(
    (p) => p.status !== "lead" && p.status !== "closed",
  ).length;
  return (
    <div className="flex h-full min-h-0 flex-col bg-sidebar text-sidebar-foreground">
      <Link
        href="/dashboard"
        onClick={onNavigate}
        className="flex items-center gap-3 px-6 py-7"
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Layers3 className="size-5" strokeWidth={1.5} />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[13px] font-semibold text-foreground">
            {studioSettings.name}
          </span>
          <span className="mt-0.5 block text-[9px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Studio workspace
          </span>
        </span>
      </Link>
      {onSearch && (
        <div className="px-4 pb-5">
          <button
            onClick={onSearch}
            className="flex h-10 w-full items-center gap-2.5 rounded-lg border border-border bg-card px-3 text-xs text-muted-foreground transition-colors hover:border-primary/40"
          >
            <Search className="size-3.5" />
            <span>Search workspace</span>
            <kbd className="ml-auto rounded border border-border px-1.5 py-0.5 text-[9px]">
              Ctrl K
            </kbd>
          </button>
        </div>
      )}
      <nav
        aria-label="Main navigation"
        className="min-h-0 flex-1 overflow-y-auto px-4"
      >
        {["Workspace", "Business", "Studio"].map((group) => {
          const items = visible.filter((i) => i.group === group);
          return (
            items.length > 0 && (
              <div key={group} className="mb-6">
                <p className="eyebrow mb-2 px-3">{group}</p>
                <div className="space-y-1">
                  {items.map(({ href, label, icon: Icon }) => {
                    const active =
                      pathname === href || pathname.startsWith(href + "/");
                    return (
                      <Link
                        key={href}
                        href={href}
                        onClick={onNavigate}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-[13px] transition-colors",
                          active
                            ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
                            : "hover:bg-muted hover:text-foreground",
                        )}
                      >
                        <Icon
                          className="size-[17px] shrink-0"
                          strokeWidth={active ? 2 : 1.65}
                        />
                        <span>{label}</span>
                        {href === "/projects" && (
                          <span
                            className={cn(
                              "ml-auto rounded px-1.5 py-0.5 text-[10px] tabular-nums",
                              active ? "bg-primary/10" : "bg-muted",
                            )}
                          >
                            {activeCount}
                          </span>
                        )}
                        {active && href !== "/projects" && (
                          <span className="ml-auto size-1.5 rounded-full bg-primary" />
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )
          );
        })}
      </nav>
      <div className="mx-4 mb-4 rounded-xl border border-border bg-card p-3.5">
        <p className="text-xs font-medium text-foreground">
          Your studio, connected.
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
          From the first sketch to the final detail.
        </p>
        <Link
          href="/"
          className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-semibold text-primary"
        >
          View studio website <ArrowUpRight className="size-3" />
        </Link>
      </div>
      <div className="border-t border-border p-3">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex w-full cursor-pointer items-center gap-3 rounded-lg p-2 text-left outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring">
            <Avatar className="size-9">
              <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                {getInitials(me.full_name)}
              </AvatarFallback>
            </Avatar>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-semibold text-foreground">
                {me.full_name}
              </span>
              <span className="block truncate text-[10px] text-muted-foreground">
                {me.title ?? me.roles.join(", ")}
              </span>
            </span>
            <ChevronsUpDown className="size-3.5 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-56">
            <DropdownMenuGroup>
              <DropdownMenuLabel>
                <p className="text-sm">{me.full_name}</p>
                <p className="text-xs font-normal text-muted-foreground">
                  {me.email}
                </p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer text-destructive"
                onClick={() => signOut()}
              >
                <LogOut className="mr-2 size-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export function AppSidebar() {
  const [searchOpen, setSearchOpen] = useState(false);
  const router = useRouter();
  const { me, projects, clients } = useAppStore();
  const visible = NAV_ITEMS.filter((i) => !i.roles || hasAnyRole(me, i.roles));
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);
  const navigate = (href: string) => {
    setSearchOpen(false);
    router.push(href);
  };
  return (
    <>
      <a
        href="#main-content"
        className="sr-only z-[100] rounded bg-primary p-3 text-primary-foreground focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        Skip to main content
      </a>
      <aside className="studio-sidebar hidden h-full w-[244px] shrink-0 border-r border-border lg:block">
        <SidebarContent onSearch={() => setSearchOpen(true)} />
      </aside>
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="p-2 sm:max-w-xl" showCloseButton={false}>
          <DialogHeader className="sr-only">
            <DialogTitle>Search workspace</DialogTitle>
            <DialogDescription>
              Find a page, project, or client.
            </DialogDescription>
          </DialogHeader>
          <Command>
            <CommandInput placeholder="Search pages, projects, and clients…" />
            <CommandList className="max-h-96">
              <CommandEmpty>
                No results found. Try a project or client name.
              </CommandEmpty>
              <CommandGroup heading="Pages">
                {visible.map(({ href, label, icon: Icon }) => (
                  <CommandItem key={href} onSelect={() => navigate(href)}>
                    <Icon className="size-4 text-muted-foreground" />
                    {label}
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandGroup heading="Projects">
                {projects.map((p) => (
                  <CommandItem
                    key={p.id}
                    value={`${p.name} ${p.reference_number}`}
                    onSelect={() => navigate(`/projects/${p.id}`)}
                  >
                    <FolderKanban className="size-4 text-muted-foreground" />
                    <span>{p.name}</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {p.reference_number}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
              {visible.some((i) => i.href === "/clients") && (
                <CommandGroup heading="Clients">
                  {clients.map((c) => (
                    <CommandItem
                      key={c.id}
                      value={`${c.full_name} ${c.email}`}
                      onSelect={() => navigate(`/clients/${c.id}`)}
                    >
                      <Users className="size-4 text-muted-foreground" />
                      {c.full_name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function TopBar({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { notifications, me } = useAppStore();
  const unreadCount = notifications.filter((n) => !n.is_read).length;
  return (
    <header className="studio-topbar sticky top-0 z-20 flex min-h-[88px] items-center justify-between gap-4 border-b border-border bg-background/95 px-4 py-4 backdrop-blur-md sm:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger
            aria-label="Open navigation"
            className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-card lg:hidden"
          >
            <Menu className="size-5" />
          </SheetTrigger>
          <SheetContent
            side="left"
            className="w-[280px] gap-0 p-0"
            showCloseButton
          >
            <SheetTitle className="sr-only">Studio navigation</SheetTitle>
            <SidebarContent onNavigate={() => setMenuOpen(false)} />
          </SheetContent>
        </Sheet>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <Link
          href="/notifications"
          aria-label={
            unreadCount
              ? `Notifications, ${unreadCount} unread`
              : "Notifications"
          }
          className="relative flex size-10 items-center justify-center rounded-full border border-border bg-card transition-colors hover:bg-muted"
        >
          <Bell className="size-[17px]" strokeWidth={1.7} />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 size-2 rounded-full border-2 border-card bg-destructive" />
          )}
        </Link>
        <span className="hidden h-6 w-px bg-border sm:block" />
        <Avatar className="hidden size-9 sm:flex">
          <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
            {getInitials(me.full_name)}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
