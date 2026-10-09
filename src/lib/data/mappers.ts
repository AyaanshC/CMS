import { boqTotals, lineTotal } from "@/lib/finance/money";
import type { Tables } from "@/lib/supabase/database.types";
import type {
  ActivityLogItem, Alert, AppRole, BOQTemplate, BOQVersion, ChangeOrder, ChecklistItem, Client, CreditNote, Expense,
  FeeStage, FeeStageKind, FeeStageStatus, FeeTemplate, Invoice, InvoiceStatus, ItemLibraryItem, MaterialOption,
  Message, Notification, Payment, ProfileKind, Project, ProjectFile, ProjectUpdate, Snag, StudioSettings,
  Task, TeamMember,
} from "@/types";

export type UrlFor = (pathOrUrl: string | null | undefined) => string | undefined;

const opt = <T>(v: T | null): T | undefined => (v === null ? undefined : v);
const bySort = <T extends { sort_order: number }>(a: T, b: T) => a.sort_order - b.sort_order;

export const makeUrlFor = (signed: Map<string, string>): UrlFor => (p) =>
  !p ? undefined : /^https?:\/\//.test(p) ? p : signed.get(p);

// Projects ------------------------------------------------------------------
export type ProjectRow = Tables<"projects"> & {
  client: { full_name: string } | null;
  rooms: Tables<"project_rooms">[];
  milestones: Tables<"project_milestones">[];
  members: { role_on_project: string | null; profile: { id: string; full_name: string; avatar_url: string | null } | null }[];
};

export function mapProject(r: ProjectRow): Project {
  return {
    id: r.id,
    client_id: r.client_id,
    client_name: r.client?.full_name ?? "",
    name: r.name,
    reference_number: r.reference_number,
    type: opt(r.type),
    property_type: opt(r.property_type),
    property_address: opt(r.property_address),
    area_sqft: opt(r.area_sqft),
    status: r.status,
    progress_percent: r.progress_percent,
    start_date: opt(r.start_date),
    estimated_end_date: opt(r.estimated_end_date),
    actual_end_date: opt(r.actual_end_date),
    total_budget: opt(r.total_budget),
    engagement_type: opt(r.engagement_type),
    discipline: opt(r.discipline),
    fee_basis: opt(r.fee_basis),
    fee_rate: opt(r.fee_rate),
    fee_amount: opt(r.fee_amount),
    estimated_construction_cost: opt(r.estimated_construction_cost),
    portal_slug: r.portal_token,
    director_id: opt(r.director_id),
    manager_id: opt(r.manager_id),
    created_at: r.created_at,
    updated_at: r.updated_at,
    rooms: [...r.rooms].sort(bySort).map((x) => ({
      id: x.id, project_id: x.project_id, name: x.name, room_type: opt(x.room_type), area_sqft: opt(x.area_sqft), sort_order: x.sort_order,
    })),
    milestones: [...r.milestones]
      .sort((a, b) => (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999"))
      .map((m) => ({ id: m.id, project_id: m.project_id, title: m.title, due_date: opt(m.due_date), completed_at: opt(m.completed_at) })),
    team: r.members.flatMap((m) =>
      m.profile
        ? [{ project_id: r.id, profile_id: m.profile.id, full_name: m.profile.full_name, avatar_url: opt(m.profile.avatar_url), role: opt(m.role_on_project) }]
        : [],
    ),
  };
}

export function withOutstanding(projects: Project[], invoices: Invoice[]): Project[] {
  const due = new Map<string, number>();
  for (const i of invoices) {
    if (i.status === "draft" || i.status === "cancelled") continue;
    due.set(i.project_id, (due.get(i.project_id) ?? 0) + i.amount_due);
  }
  return projects.map((p) => ({ ...p, outstanding_payment: due.get(p.id) ?? 0 }));
}

// Clients -------------------------------------------------------------------
export function mapClient(r: Tables<"clients">): Client {
  return {
    id: r.id, full_name: r.full_name, email: opt(r.email), phone: r.phone, whatsapp: opt(r.whatsapp),
    address: opt(r.address), source: opt(r.source), tags: r.tags,
    style_preferences: opt(r.style_preferences as Client["style_preferences"] | null),
    budget_min: opt(r.budget_min), budget_max: opt(r.budget_max), notes: opt(r.notes), created_at: r.created_at,
    payment_terms_days: r.payment_terms_days,
  };
}

export function withClientStats(clients: Client[], projects: Project[], activity: ActivityLogItem[]): Client[] {
  return clients.map((c) => {
    const mine = projects.filter((p) => p.client_id === c.id);
    const last = activity.filter((a) => a.client_id === c.id).map((a) => a.created_at).sort().at(-1);
    return {
      ...c,
      active_projects: mine.filter((p) => p.status !== "closed").length,
      total_value: mine.reduce((s, p) => s + (p.total_budget ?? 0), 0),
      last_activity: last,
    };
  });
}

// BOQ -------------------------------------------------------------------------
export type BoqRow = Tables<"boq_versions"> & {
  sections: (Tables<"boq_sections"> & { room: { name: string } | null; items: Tables<"boq_line_items">[] })[];
};

export function mapBoq(r: BoqRow): BOQVersion {
  const sections = [...r.sections].sort(bySort).map((s) => ({ ...s, items: [...s.items].sort(bySort) }));
  const totals = boqTotals({ gst_percent: r.gst_percent, designer_fee: r.designer_fee, discount_amount: r.discount_amount, sections });
  return {
    id: r.id, project_id: r.project_id, version_number: r.version_number, version_label: opt(r.version_label),
    status: r.status, is_active: r.is_active, submitted_at: opt(r.submitted_at), approved_at: opt(r.approved_at),
    approved_by: opt(r.approved_by), approval_note: opt(r.approval_note), gst_percent: r.gst_percent,
    discount_amount: r.discount_amount, designer_fee: r.designer_fee, grand_total: totals.grandTotal,
    created_by: opt(r.created_by), created_at: r.created_at,
    sections: sections.map((s, i) => ({
      id: s.id, boq_version_id: s.boq_version_id, room_id: opt(s.room_id), room_name: s.room?.name ?? opt(s.name),
      name: opt(s.name), category: s.category, sort_order: s.sort_order, subtotal: totals.sectionSubtotals[i],
      items: s.items.map((it) => ({
        id: it.id, section_id: it.section_id, description: it.description, specifications: opt(it.specifications),
        unit: it.unit, quantity: it.quantity, unit_rate: it.unit_rate, total: lineTotal(it.quantity, it.unit_rate),
        remarks: opt(it.remarks), sort_order: it.sort_order,
      })),
    })),
  };
}

// Snags & tasks -------------------------------------------------------------
export type SnagRow = Tables<"snags"> & {
  room: { name: string } | null;
  raiser: { full_name: string } | null;
  assignee: { full_name: string } | null;
  comments: (Tables<"snag_comments"> & { author: { full_name: string; kind: ProfileKind } | null })[];
};

export function mapSnag(r: SnagRow, urlFor: UrlFor): Snag {
  return {
    id: r.id, project_id: r.project_id, room_id: opt(r.room_id), room_name: r.room?.name, title: r.title,
    description: opt(r.description), location_detail: opt(r.location_detail), priority: r.priority, status: r.status,
    raised_by: opt(r.raised_by), raised_by_name: r.raiser?.full_name, assigned_to: opt(r.assigned_to),
    assigned_to_name: r.assignee?.full_name, due_date: opt(r.due_date), before_photo_url: urlFor(r.before_photo_url),
    after_photo_url: urlFor(r.after_photo_url), fixed_at: opt(r.fixed_at), client_closed_at: opt(r.client_closed_at),
    designer_verified_at: opt(r.designer_verified_at), created_at: r.created_at, updated_at: r.updated_at,
    comments: [...r.comments]
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((c) => ({
        id: c.id, snag_id: c.snag_id, author_id: c.author_id, author_name: c.author?.full_name ?? "Unknown",
        author_role: c.author?.kind, content: opt(c.content), photo_url: urlFor(c.photo_url), created_at: c.created_at,
      })),
  };
}

export type TaskRow = Tables<"tasks"> & { project: { name: string } | null; assignee: { full_name: string } | null };

export function mapTask(r: TaskRow): Task {
  return {
    id: r.id, project_id: r.project_id, project_name: r.project?.name, room_id: opt(r.room_id), title: r.title,
    description: opt(r.description), status: r.status, priority: r.priority, assigned_to: opt(r.assigned_to),
    assigned_to_name: r.assignee?.full_name, due_date: opt(r.due_date), is_internal: r.is_internal,
    created_by: opt(r.created_by), created_at: r.created_at,
  };
}

export type FeeStageRow = {
  id: string | null; project_id: string | null; kind: FeeStageKind | null; name: string | null; percent: number | null;
  sort_order: number | null; status: FeeStageStatus | null; percent_complete: number | null; planned_start: string | null;
  planned_end: string | null; completed_at: string | null; checklist: unknown; amount: number | null; earned: number | null; invoiced: number | null;
};

export function mapFeeStage(r: FeeStageRow): FeeStage {
  return {
    id: r.id!, project_id: r.project_id!, kind: r.kind!, name: r.name ?? "", percent: r.percent ?? 0,
    sort_order: r.sort_order ?? 0, status: r.status ?? "not_started", percent_complete: r.percent_complete ?? 0,
    planned_start: opt(r.planned_start), planned_end: opt(r.planned_end), completed_at: opt(r.completed_at),
    checklist: (r.checklist as ChecklistItem[] | null) ?? [], amount: r.amount ?? 0, earned: r.earned ?? 0, invoiced: r.invoiced ?? 0,
  };
}

export function mapFeeTemplate(r: Tables<"fee_templates">): FeeTemplate {
  return { id: r.id, name: r.name, discipline: r.discipline, kind: r.kind, stages: r.stages as FeeTemplate["stages"] };
}

export function mapChangeOrder(r: Tables<"change_orders">): ChangeOrder {
  return {
    id: r.id, project_id: r.project_id, number: r.number, title: r.title, description: opt(r.description), reason: r.reason,
    fee_impact: r.fee_impact, cost_impact: r.cost_impact, schedule_impact_days: r.schedule_impact_days, status: r.status,
    submitted_at: opt(r.submitted_at), decided_at: opt(r.decided_at), decided_by: opt(r.decided_by),
    decision_note: opt(r.decision_note), created_at: r.created_at,
  };
}

export function mapCreditNote(r: Tables<"credit_notes">): CreditNote {
  return { id: r.id, invoice_id: r.invoice_id, number: opt(r.number), amount: r.amount, reason: r.reason, issued_at: r.issued_at };
}

// Finance ---------------------------------------------------------------------
export type InvoiceRow = Tables<"invoices"> & {
  project: { name: string; client: { full_name: string } | null } | null;
  items: Tables<"invoice_items">[];
};
export interface InvoiceSummary {
  id: string | null; amount_paid: number | null; tds_amount: number | null; credited: number | null;
  retention_held: number | null; amount_due: number | null; effective_status: string | null; last_payment_date: string | null;
}

export function mapInvoice(r: InvoiceRow, s: InvoiceSummary | undefined): Invoice {
  return {
    id: r.id, project_id: r.project_id, project_name: r.project?.name ?? "", client_name: r.project?.client?.full_name ?? "",
    invoice_number: opt(r.invoice_number), status: (s?.effective_status ?? r.status) as InvoiceStatus,
    issue_date: opt(r.issue_date), due_date: opt(r.due_date), subtotal: r.subtotal, discount: r.discount,
    gst_rate: r.gst_rate, gst_amount: r.gst_amount ?? 0, total_amount: r.total_amount ?? 0,
    amount_paid: s?.amount_paid ?? 0, amount_due: s?.amount_due ?? r.total_amount ?? 0,
    tds_amount: s?.tds_amount ?? 0, credited: s?.credited ?? 0, retention_amount: r.retention_amount,
    retention_held: s?.retention_held ?? r.retention_amount, retention_released_at: opt(r.retention_released_at),
    last_payment_date: opt(s?.last_payment_date ?? null),
    notes: opt(r.notes), fee_stage_id: opt(r.fee_stage_id), change_order_id: opt(r.change_order_id),
    items: r.items.map((i) => ({ id: i.id, invoice_id: i.invoice_id, description: i.description, quantity: i.quantity, unit_rate: i.unit_rate, amount: i.amount ?? 0 })),
  };
}

export function mapPayment(r: Tables<"payments"> & { recorder: { full_name: string } | null }): Payment {
  return {
    id: r.id, invoice_id: r.invoice_id, amount: r.amount, tds_amount: r.tds_amount, payment_date: r.payment_date, mode: r.mode,
    reference: opt(r.reference), notes: opt(r.notes), recorded_by_name: r.recorder?.full_name,
  };
}

export function mapExpense(r: Tables<"expenses"> & { creator: { full_name: string } | null }, urlFor: UrlFor): Expense {
  return {
    id: r.id, project_id: r.project_id, category: r.category, description: r.description, amount: r.amount,
    receipt_url: urlFor(r.receipt_url), expense_date: r.expense_date, created_by_name: r.creator?.full_name,
  };
}

// Communication -------------------------------------------------------------
export function mapMessage(r: Tables<"messages"> & { sender: { full_name: string; kind: ProfileKind } | null }, urlFor: UrlFor): Message {
  return {
    id: r.id, project_id: r.project_id, sender_id: r.sender_id, sender_name: r.sender?.full_name ?? "Unknown",
    sender_role: r.sender?.kind === "client" ? "client" : "staff", content: opt(r.content),
    file_url: urlFor(r.file_url), file_name: opt(r.file_name), created_at: r.created_at,
  };
}

export function mapUpdate(r: Tables<"project_updates"> & { poster: { full_name: string } | null }, urlFor: UrlFor): ProjectUpdate {
  return {
    id: r.id, project_id: r.project_id, posted_by: r.posted_by, posted_by_name: r.poster?.full_name ?? "",
    title: opt(r.title), content: r.content, photos: r.photos.flatMap((p) => urlFor(p) ?? []),
    milestone_id: opt(r.milestone_id), created_at: r.created_at, likes: r.likes, loved: r.loved,
  };
}

export function mapNotification(r: Tables<"notifications">): Notification {
  return { id: r.id, user_id: r.user_id, type: r.type, title: r.title, body: r.body, link: opt(r.link), is_read: r.is_read, created_at: r.created_at };
}

// Libraries, files, settings, people ---------------------------------------
export function mapLibraryItem(r: Tables<"item_library">): ItemLibraryItem {
  return {
    id: r.id, item_name: r.item_name, category: r.category, unit: r.unit, standard_rate: r.standard_rate,
    description: opt(r.description), specifications: opt(r.specifications), created_at: r.created_at,
  };
}

export function mapTemplate(r: Tables<"boq_templates">): BOQTemplate {
  return { id: r.id, name: r.name, category: opt(r.category), description: r.description, sections: r.sections as BOQTemplate["sections"] };
}

export function mapMaterial(r: Tables<"material_options">, urlFor: UrlFor): MaterialOption {
  return {
    id: r.id, project_id: r.project_id, room_name: r.room_name, category: r.category, product_name: r.product_name,
    brand: r.brand, approx_cost: r.approx_cost, image_url: urlFor(r.image_url) ?? "", description: opt(r.description),
    is_selected: r.is_selected,
  };
}

export function mapFile(r: Tables<"project_files"> & { uploader: { full_name: string } | null }, urlFor: UrlFor): ProjectFile {
  return {
    id: r.id, project_id: r.project_id, room_id: opt(r.room_id), folder: opt(r.folder), category: r.category,
    file_name: r.file_name, storage_path: r.storage_path, file_url: urlFor(r.storage_path) ?? "", file_type: r.file_type,
    file_size_bytes: opt(r.file_size_bytes), uploaded_by: opt(r.uploaded_by), uploaded_by_name: r.uploader?.full_name,
    is_client_visible: r.is_client_visible, created_at: r.created_at,
  };
}

export function mapActivity(r: Tables<"activity_logs">): ActivityLogItem {
  return { id: r.id, project_id: opt(r.project_id), client_id: opt(r.client_id), title: r.title, description: r.description, type: r.type, created_at: r.created_at };
}

const EMPTY_BANK = { account_name: "", bank_name: "", account_number: "", ifsc_code: "", upi_id: "" };
const DEFAULT_ALERTS = { whatsapp_digest: true, payment_reminders: true, snag_fix_alerts: true, boq_ack: true };

export function mapSettings(r: Tables<"firm_settings">): StudioSettings {
  return {
    name: r.name, tagline: r.tagline, address: r.address, phone: r.phone, email: r.email, gstin: opt(r.gstin),
    pan: opt(r.pan), gst_rate: r.gst_rate, brand_color: r.brand_color, logo_url: r.logo_url,
    invoice_prefix: r.invoice_prefix, terms_and_conditions: opt(r.terms_and_conditions),
    bank_details: { ...EMPTY_BANK, ...(r.bank_details as object) },
    alert_preferences: { ...DEFAULT_ALERTS, ...(r.alert_preferences as object) },
  };
}

export function mapTeamMember(r: {
  id: string; full_name: string; email: string; phone: string | null; title: string | null;
  avatar_url: string | null; active: boolean; user_roles: { role: AppRole }[];
}): TeamMember {
  return {
    id: r.id, full_name: r.full_name, email: r.email, phone: opt(r.phone), title: opt(r.title),
    avatar_url: opt(r.avatar_url), active: r.active, roles: r.user_roles.map((x) => x.role),
  };
}

export function mapAlert(r: Tables<"alerts">): Alert {
  return { id: r.id, kind: r.kind, title: r.title, body: r.body, link: opt(r.link), project_id: opt(r.project_id),
    invoice_id: opt(r.invoice_id), created_at: r.created_at, acknowledged_at: opt(r.acknowledged_at) };
}

