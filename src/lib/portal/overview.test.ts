import { describe, expect, it } from "vitest";
import {
  getMockWorkspaceSnapshot,
  DEMO_PROFILES,
} from "@/lib/data/mock-workspace";
import { getClientOverview } from "./overview";

describe("client next steps", () => {
  it("shows unpaid issued invoices, excludes drafts, and only asks clients to confirm verified fixes", () => {
    const s = getMockWorkspaceSnapshot(DEMO_PROFILES["arun@client.test"]);
    const p = s.projects[0];
    s.invoices = [
      {
        ...s.invoices[0],
        id: "draft",
        project_id: p.id,
        status: "draft",
        amount_due: 9000,
        due_date: "2026-01-01",
      },
      {
        ...s.invoices[0],
        id: "issued",
        project_id: p.id,
        status: "sent",
        amount_due: 1000,
        due_date: "2026-10-20",
      },
    ];
    s.snags = [
      { ...s.snags[0], id: "fixed", project_id: p.id, status: "fixed" },
      { ...s.snags[0], id: "verified", project_id: p.id, status: "verified" },
    ];
    const view = getClientOverview(s, p.id)!;
    expect(view.nextInvoice?.id).toBe("issued");
    expect(view.pending.some((d) => d.id === "fixed")).toBe(false);
    expect(view.pending.some((d) => d.id === "verified")).toBe(true);
    expect(view.milestone?.completed_at).toBeUndefined();
  });
  it("keeps decision history project-scoped and links to the recorded estimate version", () => {
    const s = getMockWorkspaceSnapshot(DEMO_PROFILES["arun@client.test"]);
    const p = s.projects[0];
    s.boqs = [
      {
        ...s.boqs[0],
        id: "approved",
        project_id: p.id,
        status: "approved",
        approved_by: "Arun",
        approved_at: "2026-10-01",
      },
      {
        ...s.boqs[0],
        id: "other",
        project_id: s.projects[1].id,
        status: "approved",
      },
    ];
    const view = getClientOverview(s, p.id)!;
    expect(view.history).toHaveLength(1);
    expect(view.history[0]).toMatchObject({
      signer: "Arun",
      href: `/portal/${p.portal_slug}/boq?version=approved`,
    });
    expect(getClientOverview(s, "missing")).toBeNull();
  });
});
