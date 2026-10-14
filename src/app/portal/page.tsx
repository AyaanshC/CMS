import { BrandLoader } from "@/components/brand/BrandLoader";
import { Suspense } from "react";
import { WorkspaceProvider } from "@/components/workspace/WorkspaceProvider";
import { PortalProjectList } from "@/components/portal/PortalProjectList";

export default function PortalIndex() {
  return (
    <Suspense
      fallback={<BrandLoader fullScreen label="Loading your projects" />}
    >
      <WorkspaceProvider scope="portal">
        <PortalProjectList />
      </WorkspaceProvider>
    </Suspense>
  );
}
