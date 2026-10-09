import { z } from "zod";

// Server-action inputs. Unknown keys are stripped (zod default), so pages may pass
// whole domain objects; only these fields reach the database.

const id = z.uuid();
const text = (max = 200) => z.string().trim().min(1).max(max);
const optText = (max = 2000) =>
  z.string().trim().max(max).optional().nullable().transform((v) => (v ? v : null));
const money = z.coerce.number().finite().nonnegative().max(1e11);
const date = z.iso.date();
const optDate = z.union([date, z.literal("")]).optional().nullable().transform((v) => v || null);
const optId = z.union([id, z.literal("")]).optional().nullable().transform((v) => v || null);
const path = z.string().trim().max(500);

export const projectStatus = z.enum(["lead", "consultation", "design", "boq_approval", "execution", "snag", "handover", "closed"]);
export const appRole = z.enum(["owner", "director", "project_manager", "architect", "site_supervisor", "finance", "admin", "procurement"]);
export const idInput = z.object({ id });

// Clients & projects ----------------------------------------------------------
const clientFields = z.object({
  full_name: text(120),
  phone: text(30),
  email: z.union([z.email(), z.literal("")]).optional().nullable().transform((v) => v || null),
  whatsapp: optText(30),
  address: optText(300),
  source: z.enum(["referral", "instagram", "website", "walk-in", "other"]).optional(),
  tags: z.array(z.string().trim().max(30)).max(20).default([]),
  budget_min: money.optional().nullable(),
  budget_max: money.optional().nullable(),
  payment_terms_days: z.coerce.number().int().min(0).max(180).default(14),
  notes: optText(),
});
const budgetOrdered = (c: { budget_min?: number | null; budget_max?: number | null }) =>
  c.budget_min == null || c.budget_max == null || c.budget_min <= c.budget_max;
export const clientInput = clientFields.refine(budgetOrdered, { message: "Minimum budget must not exceed maximum", path: ["budget_max"] });
export const clientUpdate = clientFields.partial().extend({ id }).refine(budgetOrdered, { message: "Minimum budget must not exceed maximum", path: ["budget_max"] });

export const projectInput = z
  .object({
    client_id: id,
    name: text(150),
    type: z.enum(["residential", "commercial", "office"]).optional(),
    property_type: optText(60),
    property_address: optText(300),
    area_sqft: z.coerce.number().positive().max(10_000_000).optional().nullable(),
    start_date: optDate,
    estimated_end_date: optDate,
    total_budget: money.optional().nullable(),
    director_id: optId,
    manager_id: optId,
  })
  .refine((p) => !p.start_date || !p.estimated_end_date || p.start_date <= p.estimated_end_date, {
    message: "End date must be after start date", path: ["estimated_end_date"],
  });
export const stageInput = z.object({ id, status: projectStatus });
export const roomInput = z.object({
  project_id: id, name: text(60),
  area_sqft: z.coerce.number().positive().optional().nullable(),
  sort_order: z.coerce.number().int().default(0),
});
export const milestoneInput = z.object({ project_id: id, title: text(150), due_date: optDate });

// BOQ -----------------------------------------------------------------------------
export const lineItemInput = z.object({
  section_id: id,
  description: text(300),
  specifications: optText(1000),
  unit: text(20),
  quantity: z.coerce.number().positive().max(1e7),
  unit_rate: money,
  remarks: optText(500),
  sort_order: z.coerce.number().int().default(0),
});
export const boqVersionInput = z.object({
  project_id: id,
  version_label: optText(120),
  gst_percent: z.coerce.number().min(0).max(28),
  discount_amount: money.default(0),
  designer_fee: money.default(0),
  sections: z.array(z.object({
    name: optText(120),
    room_id: optId,
    category: text(60),
    sort_order: z.coerce.number().int().default(0),
    items: z.array(lineItemInput.omit({ section_id: true })).max(500),
  })).max(100),
});
export const boqUpdateInput = z.object({
  id,
  version_label: optText(120),
  gst_percent: z.coerce.number().min(0).max(28).optional(),
  discount_amount: money.optional(),
  designer_fee: money.optional(),
  status: z.literal("submitted").optional(),
});
export const boqDecisionInput = z.object({
  boq_id: id,
  approve: z.boolean(),
  signer: z.string().trim().max(120).default(""),
  note: z.string().trim().max(1000).optional().nullable(),
});

// Snags & tasks --------------------------------------------------------------------
export const snagInput = z.object({
  project_id: id,
  room_id: optId,
  title: text(150),
  description: optText(),
  location_detail: optText(200),
  priority: z.enum(["critical", "major", "minor"]),
  assigned_to: optId,
  vendor_id: optId,
  due_date: optDate,
  before_photo_url: path.optional().nullable(),
});
export const snagStatusInput = z.object({
  id,
  status: z.enum(["raised", "assigned", "in_progress", "fixed", "verified", "closed"]),
  after_photo_url: path.optional().nullable(),
});
export const snagVendorInput = z.object({ id, vendor_id: optId });
export const snagCommentInput = z
  .object({ snag_id: id, content: optText(), photo_url: path.optional().nullable() })
  .refine((c) => c.content || c.photo_url, { message: "Write a comment or attach a photo" });
export const taskInput = z.object({
  project_id: id,
  room_id: optId,
  title: text(200),
  description: optText(),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  assigned_to: optId,
  due_date: optDate,
  is_internal: z.boolean().default(true),
});
export const taskStatusInput = z.object({ id, status: z.enum(["todo", "in_progress", "done"]) });

// Finance -----------------------------------------------------------------------
export const invoiceInput = z
  .object({
    project_id: id,
    subtotal: money,
    discount: money.default(0),
    gst_rate: z.coerce.number().min(0).max(28),
    due_date: date,
    notes: optText(500),
    send: z.boolean().default(true),
  })
  .refine((i) => i.discount <= i.subtotal, { message: "Discount cannot exceed subtotal", path: ["discount"] });
export const paymentInput = z.object({
  invoice_id: id,
  amount: z.coerce.number().finite().positive().max(1e11),
  tds_amount: money.default(0),
  payment_date: date,
  mode: z.enum(["bank_transfer", "upi", "cheque", "cash"]),
  reference: optText(100),
  notes: optText(500),
});
export const expenseInput = z.object({
  project_id: id,
  category: text(60),
  description: text(300),
  amount: z.coerce.number().finite().positive().max(1e10),
  expense_date: date,
  receipt_url: path.optional().nullable(),
  vendor_id: optId,
  boq_line_item_id: optId,
  cost_type: z.enum(["design", "execution"]).default("design"),
});

// Communication & files ---------------------------------------------------------
export const messageInput = z
  .object({ project_id: id, content: optText(4000), file_url: path.optional().nullable(), file_name: optText(200) })
  .refine((m) => m.content || m.file_url, { message: "Message is empty" });
export const updateInput = z.object({ project_id: id, title: optText(150), content: text(4000), photos: z.array(path).max(10).default([]) });
export const reactionInput = z.object({ id, kind: z.enum(["like", "love"]) });
export const fileRecordInput = z.object({
  project_id: id,
  folder: optText(60),
  category: z.string().max(40).default("document"),
  file_name: text(200),
  storage_path: path,
  file_type: z.string().max(120),
  file_size_bytes: z.coerce.number().int().nonnegative(),
  is_client_visible: z.boolean().default(false),
});
export const visibilityInput = z.object({ id, is_client_visible: z.boolean() });
export const materialSelectInput = z.object({ id, is_selected: z.boolean() });

// Settings & team ---------------------------------------------------------------
export const libraryItemInput = z.object({
  item_name: text(150), category: text(60), unit: text(20), standard_rate: money,
  description: optText(500), specifications: optText(1000),
  standard_cost_rate: money.optional().nullable(),
});
export const libraryItemUpdate = libraryItemInput.partial().extend({ id });
export const settingsInput = z.object({
  name: text(120).optional(),
  tagline: z.string().max(200).optional(),
  address: z.string().max(300).optional(),
  phone: z.string().max(30).optional(),
  email: z.union([z.email(), z.literal("")]).optional(),
  gstin: optText(15),
  pan: optText(10),
  gst_rate: z.coerce.number().min(0).max(28).optional(),
  brand_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  logo_url: z.string().max(500).optional(),
  invoice_prefix: z.string().trim().min(1).max(10).regex(/^[A-Za-z0-9-]+$/).optional(),
  terms_and_conditions: optText(4000),
  bank_details: z.object({
    account_name: z.string().max(120), bank_name: z.string().max(120), account_number: z.string().max(30),
    ifsc_code: z.string().max(11), upi_id: z.string().max(100),
  }).optional(),
  alert_preferences: z.object({
    whatsapp_digest: z.boolean(), payment_reminders: z.boolean(), snag_fix_alerts: z.boolean(), boq_ack: z.boolean(),
  }).optional(),
});
export const staffInviteInput = z.object({ full_name: text(120), email: z.email(), title: optText(80), roles: z.array(appRole).min(1) });
export const staffRolesInput = z.object({ user_id: id, roles: z.array(appRole).min(1) });
export const portalInviteInput = z.object({ client_id: id, full_name: text(120), email: z.email() });

// Phase 1 ---------------------------------------------------------------------------
export const feeTermsInput = z
  .object({
    id,
    engagement_type: z.enum(["design_only", "design_and_execution"]).optional(),
    discipline: z.enum(["architecture", "interiors", "both"]).optional(),
    fee_basis: z.enum(["percent_of_cost", "lump_sum", "per_sqft", "hourly"]),
    fee_rate: money.optional().nullable(),
    fee_amount: money.optional().nullable(),
    estimated_construction_cost: money.optional().nullable(),
  })
  .refine((t) => t.fee_basis !== "percent_of_cost" || (t.fee_rate != null && t.estimated_construction_cost != null), {
    message: "Enter the fee % and estimated construction cost", path: ["fee_rate"],
  })
  .refine((t) => t.fee_basis !== "per_sqft" || t.fee_rate != null, { message: "Enter the rate per sqft", path: ["fee_rate"] })
  .refine((t) => t.fee_basis !== "lump_sum" || t.fee_amount != null, { message: "Enter the lump-sum fee", path: ["fee_amount"] })
  .refine((t) => t.fee_basis !== "hourly" || t.fee_rate != null, { message: "Enter the hourly rate", path: ["fee_rate"] });

const checklist = z.array(z.object({ label: text(200), done: z.boolean() })).max(20);
export const feeStageUpdate = z.object({
  id,
  name: text(120).optional(),
  percent: z.coerce.number().gt(0).max(100).optional(),
  percent_complete: z.coerce.number().int().min(0).max(100).optional(),
  status: z.enum(["not_started", "in_progress"]).optional(),
  planned_start: optDate,
  planned_end: optDate,
  checklist: checklist.optional(),
});
export const feeStageCreate = z.object({
  project_id: id,
  kind: z.enum(["design_fee", "execution"]),
  name: text(120),
  percent: z.coerce.number().gt(0).max(100),
  sort_order: z.coerce.number().int().default(99),
  checklist: checklist.default([]),
});
export const applyTemplateInput = z.object({ project_id: id, template_id: id });

export const changeOrderInput = z
  .object({
    project_id: id,
    title: text(150),
    description: optText(2000),
    reason: z.enum(["client_request", "site_condition", "regulatory", "design_error"]),
    fee_impact: money.default(0),
    cost_impact: z.coerce.number().finite().default(0),
    schedule_impact_days: z.coerce.number().int().min(-365).max(365).default(0),
  })
  .refine((c) => c.reason !== "design_error" || c.fee_impact === 0, { message: "A design error cannot be charged to the client", path: ["fee_impact"] });
export const changeOrderUpdate = z.object({
  id, title: text(150).optional(), description: optText(2000), fee_impact: money.optional(),
  cost_impact: z.coerce.number().finite().optional(), schedule_impact_days: z.coerce.number().int().optional(),
});
export const changeOrderDecision = z.object({
  id, approve: z.boolean(), signer: z.string().trim().max(120).default(""), note: z.string().trim().max(1000).optional().nullable(),
});

export const issueInvoiceInput = z.object({ id, due_date: optDate });
export const creditNoteInput = z.object({ invoice_id: id, amount: z.coerce.number().finite().positive().max(1e11), reason: text(300) });
export const retentionInput = z.object({ id, retention_amount: money });

const isMonday = (d: string) => new Date(`${d}T00:00:00Z`).getUTCDay() === 1;
export const timesheetWeekInput = z.object({
  week_start: date.refine(isMonday, "Week must start on a Monday"),
  rows: z.array(z.object({
    project_id: optId,
    fee_stage_id: optId,
    activity: z.enum(["design", "drafting", "visualisation", "site_visit", "client_meeting", "coordination", "approvals", "admin", "business_development", "training", "leave"]),
    billable: z.boolean(),
    notes: optText(300),
    hours: z.array(z.coerce.number().min(0).max(24)).length(7),
  })).max(40),
});
export const weekInput = z.object({ week_start: date.refine(isMonday, "Week must start on a Monday") });
export const timesheetDecisionInput = z.object({ ids: z.array(id).min(1).max(500), approve: z.boolean(), note: optText(500) })
  .refine((d) => d.approve || !!d.note, { message: "Say why the time is being sent back", path: ["note"] });

export const staffTermsInput = z.object({
  id,
  weekly_capacity_hours: z.coerce.number().min(0).max(80),
  billable_target_percent: z.coerce.number().int().min(0).max(100),
  rate_band_id: optId,
});
export const rateBandInput = z.object({ id: id.optional(), name: text(60), blended_rate: money });
export const costRateInput = z.object({ profile_id: id, effective_from: date, cost_rate: money });
const weight = z.coerce.number().min(0).max(100);
export const riskSettingsInput = z.object({
  risk_weights: z.object({
    fee_burn: weight, overdue: weight, schedule: weight, cost_variance: weight,
    approvals: weight, critical_snags: weight, pending_changes: weight,
  }),
  monthly_billing_target: money.optional().nullable(),
});

// Phase 3 ---------------------------------------------------------------------------
const gst = z.coerce.number().min(0).max(28).default(18);
export const vendorInput = z.object({
  name: text(150), category: text(60), gstin: optText(15), pan: optText(10), phone: optText(30),
  email: z.union([z.email(), z.literal("")]).optional().nullable().transform((v) => v || null),
  address: optText(300), payment_terms_days: z.coerce.number().int().min(0).max(180).default(30),
  status: z.enum(["active", "preferred", "blacklisted"]).default("active"), notes: optText(1000),
});
export const vendorUpdate = vendorInput.partial().extend({ id });
export const lineCostInput = z.object({ line_item_id: id, cost_rate: money });
export const quoteInput = z.object({
  project_id: id, vendor_id: id, boq_line_item_id: optId, package_name: optText(120), description: optText(500),
  quantity: z.coerce.number().positive(), rate: money, valid_until: optDate,
}).refine((q) => q.boq_line_item_id || q.package_name, { message: "Link a BOQ line or name the package", path: ["package_name"] });
const poLine = z.object({ boq_line_item_id: optId, description: text(300), unit: text(20), quantity: z.coerce.number().positive(), rate: money, gst_rate: gst });
export const poInput = z.object({
  project_id: id, vendor_id: id, order_date: optDate, expected_delivery: optDate, notes: optText(1000), lines: z.array(poLine).min(1).max(200),
});
export const cancelPoInput = z.object({ id, reason: text(300) });
export const receiptInput = z.object({
  po_id: id, received_on: date, notes: optText(500), photo_url: path.optional().nullable(),
  lines: z.array(z.object({
    po_line_id: id, quantity_received: z.coerce.number().positive(), quantity_rejected: z.coerce.number().min(0).default(0), condition_note: optText(300),
  }).refine((l) => l.quantity_rejected <= l.quantity_received, { message: "Rejected cannot exceed received", path: ["quantity_rejected"] })).min(1),
});
export const billInput = z.object({
  vendor_id: id, project_id: id, po_id: optId, bill_number: text(60), bill_date: date, due_date: optDate, notes: optText(500),
  file_path: path.optional().nullable(),
  lines: z.array(z.object({ po_line_id: optId, description: text(300), quantity: z.coerce.number().positive(), rate: money, gst_rate: gst })).min(1).max(200),
});
export const billDecisionInput = z.object({ id, approve: z.boolean(), note: optText(500) })
  .refine((d) => d.approve || !!d.note, { message: "Give a reason for the dispute", path: ["note"] });
export const vendorPaymentInput = z.object({
  vendor_id: id, project_id: id, bill_id: optId, amount: z.coerce.number().positive(), tds_amount: money.default(0), paid_on: date,
  mode: z.enum(["bank_transfer", "upi", "cheque", "cash"]), reference: optText(100), is_advance: z.boolean().default(false),
}).refine((p) => p.is_advance || !!p.bill_id, { message: "Choose the bill, or mark this as an advance", path: ["bill_id"] });
export const expenseDecisionInput = billDecisionInput;




