import { BrandLoader } from "@/components/brand/BrandLoader";
import { Suspense } from "react";
import { PortalOverview } from "@/components/portal/PortalOverview";

export default function PortalOverviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <Suspense
      fallback={<BrandLoader label="Loading project overview" />}
    >
      <PortalOverview params={params} />
    </Suspense>
  );
}
