import { Suspense } from "react";
import { AppSidebar } from "@/components/layout/AppSidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Suspense fallback={<aside className="w-64 bg-[hsl(var(--sidebar-background))] shrink-0" />}>
        <AppSidebar />
      </Suspense>
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
