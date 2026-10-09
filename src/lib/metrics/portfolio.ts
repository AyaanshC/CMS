import type { WorkspaceSnapshot } from "@/lib/data/snapshot";
import { projectProfitability, type Profitability } from "@/lib/finance/profitability";
import { costVariance } from "@/lib/procurement/costControl";
import { projectRisk, type RiskFactor } from "./risk";
import type { Project } from "@/types";

export interface PortfolioRow { project: Project; profit: Profitability; risk: { score: number; factors: RiskFactor[] } }

export function portfolioRows(s: WorkspaceSnapshot, today: string, useActual: boolean): PortfolioRow[] {
  return s.projects
    .filter((p) => p.status !== "lead" && p.status !== "closed")
    .map((project) => {
      const of = <T extends { project_id: string }>(xs: T[]) => xs.filter((x) => x.project_id === project.id);
      const stages = of(s.feeStages);
      const changeOrders = of(s.changeOrders);
      const invoices = of(s.invoices);
      const costRows = of(s.costControl ?? []);
      const profit = projectProfitability({
        stages, changeOrders, invoices, costs: of(s.projectCosts), expenses: of(s.expenses),
        vendorBills: of(s.vendorBills ?? []), costRows, useActual,
      });
      const risk = projectRisk({
        project, profit, stages, invoices, snags: of(s.snags), changeOrders, today,
        weights: s.studioSettings.risk_weights,
        costVariance: (s.costControl ?? []).some((r) => r.project_id === project.id) ? costVariance(costRows) : null,
      });
      return { project, profit, risk };
    })
    .sort((a, b) => b.risk.score - a.risk.score);
}
