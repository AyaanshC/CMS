import { Suspense } from "react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { WorkspaceProvider } from "@/components/workspace/WorkspaceProvider";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center text-sm text-muted-foreground">Loading workspace…</div>}>
      <WorkspaceProvider scope="staff">
        <div className="flex h-screen overflow-hidden bg-background">
          <AppSidebar />
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </WorkspaceProvider>
    </Suspense>
  );
}
