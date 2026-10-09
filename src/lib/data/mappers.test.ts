import { describe, expect, it } from "vitest";
import {
  makeUrlFor, mapBoq, mapFeeStage, mapInvoice, mapMessage, mapProject, withClientStats, withOutstanding,
  type BoqRow, type InvoiceRow, type ProjectRow,
} from "./mappers";
import type { Client, Invoice, Project } from "@/types";

const projectRow: ProjectRow = {
  id: "p1", client_id: "c1", name: "Sharma Residence", reference_number: "PRJ-2026-0001", type: "residential",
  property_type: null, property_address: null, area_sqft: 1650, status: "execution", progress_percent: 55,
  start_date: "2026-07-01", estimated_end_date: null, actual_end_date: null, total_budget: 1250000,
  portal_token: "tok123", director_id: "u2", manager_id: "u3", created_at: "2026-07-01T00:00:00Z",
  updated_at: "2026-07-01T00:00:00Z", archived_at: null,
  engagement_type: null, discipline: null, fee_basis: null, fee_rate: null, fee_amount: null, estimated_construction_cost: null,
  client: { full_name: "Arun Sharma" },
  rooms: [
    { id: "r2", project_id: "p1", name: "Bedroom", room_type: null, area_sqft: 200, sort_order: 2 },
    { id: "r1", project_id: "p1", name: "Living", room_type: null, area_sqft: 400, sort_order: 1 },
  ],
  milestones: [],
  members: [{ role_on_project: "Architect", profile: { id: "u4", full_name: "Neha Verma", avatar_url: null } }],
};

describe("mapProject", () => {
  it("maps names, token and sorts rooms", () => {
    const p = mapProject(projectRow);
    expect(p.client_name).toBe("Arun Sharma");
    expect(p.portal_slug).toBe("tok123");
    expect(p.rooms?.map((r) => r.name)).toEqual(["Living", "Bedroom"]);
    expect(p.team?.[0]).toMatchObject({ profile_id: "u4", full_name: "Neha Verma", role: "Architect" });
    expect(p.property_type).toBeUndefined();
  });
});

describe("mapBoq", () => {
  const row: BoqRow = {
    id: "b1", project_id: "p1", version_number: 1, version_label: null, status: "submitted", is_active: false,
    submitted_at: null, approved_at: null, approved_by: null, approval_note: null, gst_percent: 18,
    discount_amount: 5000, designer_fee: 35000, created_by: null, created_at: "2026-07-01T00:00:00Z",
    sections: [{
      id: "s1", boq_version_id: "b1", room_id: "r1", name: null, category: "Civil", sort_order: 1,
      room: { name: "Living" },
      items: [
        { id: "i2", section_id: "s1", description: "Putty", specifications: null, unit: "sqft", quantity: 450, unit_rate: 25, remarks: null, sort_order: 2 },
        { id: "i1", section_id: "s1", description: "Ceiling", specifications: null, unit: "sqft", quantity: 240, unit_rate: 95, remarks: null, sort_order: 1 },
      ],
    }],
  };

  it("computes totals with the shared money functions", () => {
    const b = mapBoq(row);
    expect(b.grand_total).toBe(75579);
    expect(b.sections[0].subtotal).toBe(34050);
    expect(b.sections[0].room_name).toBe("Living");
    expect(b.sections[0].items.map((i) => i.id)).toEqual(["i1", "i2"]);
    expect(b.sections[0].items[0].total).toBe(22800);
  });
});

describe("mapInvoice", () => {
  const row: InvoiceRow = {
    id: "e1", project_id: "p1", invoice_number: "PDS/26-27/0001", status: "sent", issue_date: "2026-10-01",
    due_date: "2026-10-15", subtotal: 250000, discount: 0, gst_rate: 18, gst_amount: 45000, total_amount: 295000,
    retention_amount: 0, retention_released_at: null, fee_stage_id: null, change_order_id: null,
    notes: null, created_at: "2026-10-01T00:00:00Z",
    project: { name: "Sharma Residence", client: { full_name: "Arun Sharma" } },
    items: [],
  };

  it("uses the database's effective status and balances", () => {
    const inv = mapInvoice(row, { id: "e1", amount_paid: 100000, tds_amount: 0, credited: 0, retention_held: 0, amount_due: 195000, effective_status: "partial", last_payment_date: "2026-10-05" });
    expect(inv).toMatchObject({ status: "partial", amount_paid: 100000, amount_due: 195000, client_name: "Arun Sharma" });
  });

  it("falls back safely when the summary is missing", () => {
    expect(mapInvoice(row, undefined)).toMatchObject({ status: "sent", amount_paid: 0, amount_due: 295000 });
  });
});

describe("mapMessage", () => {
  it("derives sender role from profile kind", () => {
    const m = mapMessage(
      { id: "m1", project_id: "p1", sender_id: "u11", content: "Hi", file_url: null, file_name: null, created_at: "2026-10-01T00:00:00Z", sender: { full_name: "Arun", kind: "client" } },
      makeUrlFor(new Map()),
    );
    expect(m).toMatchObject({ sender_role: "client", sender_name: "Arun" });
  });
});

describe("makeUrlFor", () => {
  const urlFor = makeUrlFor(new Map([["p1/a.jpg", "https://signed/a"]]));
  it("passes through absolute URLs and resolves storage paths", () => {
    expect(urlFor("https://images.example/x.jpg")).toBe("https://images.example/x.jpg");
    expect(urlFor("p1/a.jpg")).toBe("https://signed/a");
    expect(urlFor("p1/missing.jpg")).toBeUndefined();
    expect(urlFor(null)).toBeUndefined();
  });
});

describe("withOutstanding and withClientStats", () => {
  const projects: Project[] = [mapProject(projectRow), { ...mapProject(projectRow), id: "p2", status: "closed", total_budget: 100 }];
  const invoices = [
    { project_id: "p1", amount_due: 195000, status: "partial" } as Invoice,
    { project_id: "p1", amount_due: 5000, status: "draft" } as Invoice,
  ] as Invoice[];

  it("sums only non-draft, non-cancelled balances", () => {
    expect(withOutstanding(projects, invoices)[0].outstanding_payment).toBe(195000);
  });

  it("counts active projects and total value per client", () => {
    const clients = [{ id: "c1", full_name: "Arun", phone: "1", tags: [], created_at: "2026-01-01T00:00:00Z" }] as Client[];
    const [c] = withClientStats(clients, projects, [
      { id: "a1", client_id: "c1", title: "", description: "", type: "note", created_at: "2026-10-05T00:00:00Z" },
    ]);
    expect(c).toMatchObject({ active_projects: 1, total_value: 1250100, last_activity: "2026-10-05T00:00:00Z" });
  });
});

describe("mapFeeStage", () => {
  it("maps the summary view row", () => {
    const s = mapFeeStage({
      id: "s1", project_id: "p1", kind: "design_fee", name: "Concept", percent: 10, sort_order: 1, status: "complete",
      percent_complete: 100, planned_start: null, planned_end: null, completed_at: "2026-10-01T00:00:00Z",
      checklist: [{ label: "Sign-off", done: true }], amount: 90000, earned: 90000, invoiced: 90000,
    });
    expect(s).toMatchObject({ name: "Concept", amount: 90000, checklist: [{ label: "Sign-off", done: true }], planned_start: undefined });
  });
});
