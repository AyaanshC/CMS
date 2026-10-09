"use client";

import { use } from "react";
import Link from "next/link";
import { 
  Building2, 
  Home, 
  FileText, 
  CheckSquare, 
  Folder, 
  MessageSquare, 
  Receipt,
  Menu
} from "lucide-react";
import { 
  Sheet, 
  SheetContent, 
  SheetTrigger 
} from "@/components/ui/sheet";
import { useAppStore } from "@/lib/store";

export function PortalShell({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const { projects, studioSettings } = useAppStore();
  const project = projects.find((p) => p.portal_slug === slug);

  if (!project) {
    return <div className="p-8 text-center">Project not found or link has expired.</div>;
  }

  const NAV_ITEMS = [
    { href: `/portal/${slug}`, label: "Overview", icon: Home },
    { href: `/portal/${slug}/boq`, label: "BOQ & Estimates", icon: FileText },
    { href: `/portal/${slug}/changes`, label: "Change Orders", icon: FileText },
    { href: `/portal/${slug}/snags`, label: "Snag List", icon: CheckSquare },
    { href: `/portal/${slug}/files`, label: "Files & Designs", icon: Folder },
    { href: `/portal/${slug}/messages`, label: "Messages", icon: MessageSquare },
    { href: `/portal/${slug}/invoices`, label: "Invoices", icon: Receipt },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* Mobile Header */}
      <header className="sticky top-0 z-20 flex items-center justify-between p-4 bg-white border-b border-border shadow-sm md:hidden">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center flex-shrink-0">
            <Building2 className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold truncate max-w-[200px]">{project.name}</p>
            <p className="text-[10px] text-muted-foreground">{studioSettings.name}</p>
          </div>
        </div>
        
        <Sheet>
          <SheetTrigger className="p-2 rounded-lg hover:bg-slate-100 text-foreground cursor-pointer border-0 bg-transparent inline-flex items-center justify-center">
            <Menu className="w-5 h-5" />
          </SheetTrigger>
          <SheetContent side="right" className="w-[280px] p-0">
            <div className="p-4 border-b border-border bg-slate-50">
              <p className="font-semibold">{project.name}</p>
              <p className="text-xs text-muted-foreground">Client Portal</p>
            </div>
            <nav className="p-2 space-y-1">
              {NAV_ITEMS.map((item) => (
                <Link key={item.href} href={item.href}>
                  <div className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium hover:bg-muted transition-colors text-foreground">
                    <item.icon className="w-4 h-4 text-muted-foreground" />
                    {item.label}
                  </div>
                </Link>
              ))}
            </nav>
          </SheetContent>
        </Sheet>
      </header>

      <div className="flex flex-1 max-w-7xl mx-auto w-full">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex flex-col w-64 border-r border-border bg-white min-h-[calc(100vh-64px)] my-6 rounded-2xl shadow-sm ml-6 overflow-hidden sticky top-6 self-start">
          <div className="p-5 border-b border-border bg-slate-50/50">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center mb-3 shadow-md shadow-indigo-200">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <h2 className="font-bold text-foreground leading-tight">{project.name}</h2>
            <p className="text-xs text-muted-foreground mt-1">Managed by {studioSettings.name}</p>
          </div>
          <nav className="flex-1 p-3 space-y-1">
            {NAV_ITEMS.map((item) => (
              <Link key={item.href} href={item.href}>
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-100 transition-colors text-foreground group">
                  <item.icon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  {item.label}
                </div>
              </Link>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-6 w-full">
          <div className="max-w-4xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
