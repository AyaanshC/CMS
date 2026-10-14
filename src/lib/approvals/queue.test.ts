import { describe, expect, it } from "vitest";
import {
  getMockWorkspaceSnapshot,
  DEMO_PROFILES,
} from "@/lib/data/mock-workspace";
import { canApproveTime, getApprovalQueue } from "./queue";
import { resolveProjectTab } from "@/lib/projects/navigation";

describe("approval routing and reviewer permissions", () => {
  it("does not let the owner approve their own time", () => {
    const me = DEMO_PROFILES["priya@studio.test"];
    const s = getMockWorkspaceSnapshot(me);
    expect(canApproveTime(me, s.projects[0], me.id)).toBe(false);
    expect(canApproveTime(me, s.projects[0], "another-user")).toBe(true);
    expect(canApproveTime(me, undefined, "another-user")).toBe(false);
  });
  it("limits a director's time approvals when the project has another manager", () => {
    const me = DEMO_PROFILES["vikram@studio.test"];
    const s = getMockWorkspaceSnapshot(me);
    const p = { ...s.projects[0], director_id: me.id, manager_id: "manager" };
    expect(canApproveTime(me, p, "architect")).toBe(false);
    expect(canApproveTime(me, p, "manager")).toBe(true);
  });
  it("routes pending decisions to the correct section and leaves client decisions with clients", () => {
    const s = getMockWorkspaceSnapshot(DEMO_PROFILES["priya@studio.test"]);
    const p = s.projects[0];
    s.changeOrders = [
      {
        id: "change",
        project_id: p.id,
        number: "CO-1",
        title: "More storage",
        reason: "client_request",
        fee_impact: 5000,
        cost_impact: 0,
        schedule_impact_days: 2,
        status: "submitted",
        created_at: "2026-10-01",
      },
    ];
    s.expenses = [
      {
        id: "expense",
        project_id: p.id,
        category: "travel",
        description: "Site travel",
        amount: 500,
        expense_date: "2026-10-02",
        status: "pending",
      },
    ];
    s.purchaseOrders = [
      {
        id: "po",
        project_id: p.id,
        vendor_id: "vendor",
        vendor_name: "Vendor",
        status: "pending_approval",
        created_by: s.me.id,
        created_at: "2026-10-03",
        order_date: "2026-10-03",
        approval_required_role: "owner",
        lines: [],
        total: 1000,
      },
    ];
    const queue = getApprovalQueue(s);
    expect(queue.find((q) => q.id === "change")).toMatchObject({
      canReview: false,
      reviewer: "Client",
      href: `/projects/${p.id}?tab=changes`,
    });
    expect(queue.find((q) => q.id === "expense")).toMatchObject({
      canReview: true,
      href: `/projects/${p.id}?tab=finance`,
    });
    expect(queue.find((q) => q.id === "po")?.canReview).toBe(false);
    expect(
      getApprovalQueue({ ...s, me: DEMO_PROFILES["arun@client.test"] }),
    ).toEqual([]);
  });
  it("validates deep links and prevents procurement tabs on design-only projects", () => {
    expect(resolveProjectTab("finance", false)).toBe("finance");
    expect(resolveProjectTab("procurement", false)).toBe("overview");
    expect(resolveProjectTab("procurement", true)).toBe("procurement");
    expect(resolveProjectTab("unknown", true)).toBe("overview");
  });
});
