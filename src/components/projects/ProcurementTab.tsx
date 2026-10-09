"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CostControlTable } from "@/components/procurement/CostControlTable";
import { PurchaseOrders } from "@/components/procurement/PurchaseOrders";
import { QuotesPanel } from "@/components/procurement/QuotesPanel";
import { VendorBills } from "@/components/procurement/VendorBills";
import { useAppStore } from "@/lib/store";
import type { Project } from "@/types";

export default function ProcurementTab({ project }: { project: Project }) {
  const { costControl } = useAppStore();
  const lines = costControl.filter((r) => r.project_id === project.id);
  const canSeeCosts = lines.length > 0;   // RLS returns cost rows only to roles allowed to see them
  return (
    <Tabs defaultValue={canSeeCosts ? "cost" : "pos"}>
      <TabsList>
        {canSeeCosts && <TabsTrigger value="cost">Cost control</TabsTrigger>}
        {canSeeCosts && <TabsTrigger value="quotes">Quotes</TabsTrigger>}
        <TabsTrigger value="pos">Purchase orders</TabsTrigger>
        {canSeeCosts && <TabsTrigger value="bills">Vendor bills</TabsTrigger>}
      </TabsList>
      {canSeeCosts && <TabsContent value="cost" className="mt-4"><CostControlTable rows={lines} /></TabsContent>}
      {canSeeCosts && <TabsContent value="quotes" className="mt-4"><QuotesPanel projectId={project.id} lines={lines} /></TabsContent>}
      <TabsContent value="pos" className="mt-4"><PurchaseOrders projectId={project.id} lines={lines} /></TabsContent>
      {canSeeCosts && <TabsContent value="bills" className="mt-4"><VendorBills projectId={project.id} /></TabsContent>}
    </Tabs>
  );
}
