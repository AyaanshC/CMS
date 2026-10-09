import { Suspense } from "react";
import { WorkspaceProvider } from "@/components/workspace/WorkspaceProvider";
import { PortalShell } from "@/components/portal/PortalShell";

export default function PortalLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading portal…</div>}>
      <WorkspaceProvider scope="portal">
        <PortalShell params={params}>{children}</PortalShell>
      </WorkspaceProvider>
    </Suspense>
  );
}
