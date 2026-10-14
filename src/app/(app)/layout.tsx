import { BrandLoader } from "@/components/brand/BrandLoader";
import { Suspense } from "react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { WorkspaceProvider } from "@/components/workspace/WorkspaceProvider";
import { DemoBanner } from "@/components/workspace/DemoBanner";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<BrandLoader fullScreen label="Loading workspace" />}>
      <WorkspaceProvider scope="staff">
        <div className="studio-shell flex h-dvh overflow-hidden bg-background">
          <AppSidebar />
          <main id="main-content" className="studio-main">
            <DemoBanner />
            {children}
          </main>
        </div>
      </WorkspaceProvider>
    </Suspense>
  );
}
