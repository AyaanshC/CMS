// ============================================================
// INTERIOR DESIGNER CMS — Clean Domain Type Definitions
// ============================================================

// --- Users & Roles ---

export type AppRole =
  | 'owner' | 'director' | 'project_manager' | 'architect'
  | 'site_supervisor' | 'finance' | 'admin' | 'procurement';
export type ProfileKind = 'staff' | 'client' | 'vendor';

export interface TeamMember {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  title?: string;
  avatar_url?: string;
  roles: AppRole[];
  active: boolean;
  weekly_capacity_hours: number;
  billable_target_percent: number;
  rate_band_id?: string;
}

// --- Timesheets & Time Tracking ---

export type TimesheetActivity =
  | 'design' | 'drafting' | 'visualisation' | 'site_visit' | 'client_meeting' | 'coordination'
  | 'approvals' | 'admin' | 'business_development' | 'training' | 'leave';
export type TimesheetStatus = 'draft' | 'submitted' | 'approved' | 'rejected';

export const ACTIVITY_LABELS: Record<TimesheetActivity, string> = {
  design: 'Design', drafting: 'Drafting', visualisation: '3D / visualisation', site_visit: 'Site visit',
  client_meeting: 'Client meeting', coordination: 'Coordination', approvals: 'Approvals work', admin: 'Admin',
  business_development: 'Business development', training: 'Training', leave: 'Leave',
};
export const NON_PROJECT_ACTIVITIES: TimesheetActivity[] = ['admin', 'business_development', 'training', 'leave'];

export interface TimesheetEntry {
  id: string;
  profile_id: string;
  profile_name?: string;
  work_date: string;
  project_id?: string;
  project_name?: string;
  fee_stage_id?: string;
  activity: TimesheetActivity;
  hours: number;
  billable: boolean;
  notes?: string;
  status: TimesheetStatus;
  decision_note?: string;
}

export interface RateBand { id: string; name: string; blended_rate: number }
export interface CostRate { id: string; profile_id: string; effective_from: string; cost_rate: number }
export interface StaffWeekHours { profile_id: string; week_start: string; total_hours: number; billable_hours: number; submitted: boolean }
export interface ProjectCostRow {
  project_id: string; fee_stage_id?: string; hours: number; billable_hours: number; unrated_hours: number;
  blended_cost: number; actual_cost?: number;
}

// --- Clients ---

export type ClientSource = 'referral' | 'instagram' | 'website' | 'walk-in' | 'other';

export interface Client {
  id: string;
  full_name: string;
  email?: string;
  phone: string;
  whatsapp?: string;
  address?: string;
  source?: ClientSource;
  tags: string[];
  style_preferences?: {
    styles: string[];
    colors: string[];
    materials: string[];
  };
  budget_min?: number;
  budget_max?: number;
  notes?: string;
  portal_user_id?: string;
  payment_terms_days?: number;
  created_at: string;
  // computed
  active_projects?: number;
  total_value?: number;
  last_activity?: string;
}

// --- Fees & Billing Types ---

export type EngagementType = 'design_only' | 'design_and_execution';
export type FeeBasis = 'percent_of_cost' | 'lump_sum' | 'per_sqft' | 'hourly';
export type Discipline = 'architecture' | 'interiors' | 'both';
export type FeeStageKind = 'design_fee' | 'execution';
export type FeeStageStatus = 'not_started' | 'in_progress' | 'complete';

export const ENGAGEMENT_LABELS: Record<EngagementType, string> = {
  design_only: 'Design only (fee)',
  design_and_execution: 'Design + execution (turnkey)',
};
export const FEE_BASIS_LABELS: Record<FeeBasis, string> = {
  percent_of_cost: '% of construction cost',
  lump_sum: 'Lump sum',
  per_sqft: 'Rate per sqft',
  hourly: 'Hourly (billed from timesheets)',
};

export interface ChecklistItem { label: string; done: boolean }

export interface FeeStage {
  id: string;
  project_id: string;
  kind: FeeStageKind;
  name: string;
  percent: number;
  sort_order: number;
  status: FeeStageStatus;
  percent_complete: number;
  planned_start?: string;
  planned_end?: string;
  completed_at?: string;
  checklist: ChecklistItem[];
  amount: number;     // from fee_stage_summary
  earned: number;
  invoiced: number;
}

export interface FeeTemplate {
  id: string;
  name: string;
  discipline: Discipline;
  kind: FeeStageKind;
  stages: { name: string; percent: number; checklist: string[] }[];
}

export interface FeeTerms {
  fee_basis?: FeeBasis;
  fee_rate?: number;
  fee_amount?: number;
  estimated_construction_cost?: number;
  area_sqft?: number;
}

// --- Change Orders ---

export type ChangeOrderReason = 'client_request' | 'site_condition' | 'regulatory' | 'design_error';
export type ChangeOrderStatus = 'draft' | 'submitted' | 'approved' | 'rejected';
export const CHANGE_ORDER_REASON_LABELS: Record<ChangeOrderReason, string> = {
  client_request: 'Client request',
  site_condition: 'Site condition',
  regulatory: 'Regulatory requirement',
  design_error: 'Internal design error (no charge)',
};

export interface ChangeOrder {
  id: string;
  project_id: string;
  number: string;
  title: string;
  description?: string;
  reason: ChangeOrderReason;
  fee_impact: number;
  cost_impact: number;
  schedule_impact_days: number;
  status: ChangeOrderStatus;
  submitted_at?: string;
  decided_at?: string;
  decided_by?: string;
  decision_note?: string;
  created_at: string;
}

// --- Projects ---

export type ProjectType = 'residential' | 'commercial' | 'office';
export type ProjectStatus =
  | 'lead'
  | 'consultation'
  | 'design'
  | 'boq_approval'
  | 'execution'
  | 'snag'
  | 'handover'
  | 'closed';

export const PROJECT_STAGES: ProjectStatus[] = [
  'lead', 'consultation', 'design', 'boq_approval',
  'execution', 'snag', 'handover', 'closed',
];

export const PROJECT_STAGE_LABELS: Record<ProjectStatus, string> = {
  lead: 'Lead',
  consultation: 'Consultation',
  design: 'Design',
  boq_approval: 'BOQ Approval',
  execution: 'Execution',
  snag: 'Snag',
  handover: 'Handover',
  closed: 'Closed',
};

export interface Project {
  id: string;
  client_id: string;
  client_name: string;
  name: string;
  reference_number: string;
  type?: ProjectType;
  property_type?: string;
  property_address?: string;
  area_sqft?: number;
  status: ProjectStatus;
  progress_percent: number;
  start_date?: string;
  estimated_end_date?: string;
  actual_end_date?: string;
  total_budget?: number;
  portal_slug: string;
  engagement_type?: EngagementType;
  discipline?: Discipline;
  fee_basis?: FeeBasis;
  fee_rate?: number;
  fee_amount?: number;
  estimated_construction_cost?: number;
  director_id?: string;
  manager_id?: string;
  created_at: string;
  updated_at?: string;
  // relations
  rooms?: ProjectRoom[];
  milestones?: ProjectMilestone[];
  team?: ProjectTeamMember[];
  // computed
  outstanding_payment?: number;
}

export interface ProjectRoom {
  id: string;
  project_id: string;
  name: string;
  room_type?: string;
  area_sqft?: number;
  sort_order?: number;
}

export interface ProjectMilestone {
  id: string;
  project_id: string;
  title: string;
  due_date?: string;
  completed_at?: string;
}

export interface ProjectTeamMember {
  project_id: string;
  profile_id: string;
  full_name: string;
  avatar_url?: string;
  role?: string;
}

// --- BOQ ---

export type BOQStatus = 'draft' | 'submitted' | 'approved' | 'rejected';

export interface BOQVersion {
  id: string;
  project_id: string;
  version_number: number;
  version_label?: string;
  status: BOQStatus;
  is_active?: boolean;
  submitted_at?: string;
  approved_at?: string;
  approved_by?: string;
  approval_note?: string;
  gst_percent: number;
  discount_amount: number;
  designer_fee: number;
  grand_total: number;        // computed by boqTotals()
  created_by?: string;
  created_at: string;
  sections: BOQSection[];
}

export interface BOQSection {
  id: string;
  boq_version_id: string;
  room_id?: string;
  room_name?: string;
  name?: string;
  category: string;
  sort_order: number;
  subtotal: number;
  items: BOQLineItem[];
}

export interface BOQLineItem {
  id: string;
  section_id: string;
  description: string;
  specifications?: string;
  unit: string;
  quantity: number;
  unit_rate: number;
  total: number;              // computed by lineTotal()
  remarks?: string;
  sort_order: number;
}

// --- Snags ---

export type SnagPriority = 'critical' | 'major' | 'minor';
export type SnagStatus = 'raised' | 'assigned' | 'in_progress' | 'fixed' | 'verified' | 'closed';

export interface Snag {
  id: string;
  project_id: string;
  room_id?: string;
  room_name?: string;
  title?: string;
  description?: string;
  location_detail?: string;
  priority: SnagPriority;
  status: SnagStatus;
  raised_by?: string;
  raised_by_name?: string;
  assigned_to?: string;
  assigned_to_name?: string;
  due_date?: string;
  before_photo_url?: string;
  after_photo_url?: string;
  fixed_at?: string;
  client_closed_at?: string;
  designer_verified_at?: string;
  created_at: string;
  updated_at?: string;
  comments?: SnagComment[];
}

export interface SnagComment {
  id: string;
  snag_id: string;
  author_id?: string;
  author_name: string;
  author_role?: string;
  content?: string;
  photo_url?: string;
  created_at: string;
}

// --- Finance ---

export type InvoiceStatus = 'draft' | 'sent' | 'partial' | 'paid' | 'overdue' | 'cancelled';
export type PaymentMode = 'bank_transfer' | 'upi' | 'cheque' | 'cash';

export const PAYMENT_MODE_LABELS: Record<PaymentMode, string> = {
  bank_transfer: 'NEFT / RTGS / IMPS',
  upi: 'UPI',
  cheque: 'Cheque',
  cash: 'Cash',
};

export interface InvoiceLineItem {
  id: string;
  invoice_id?: string;
  description: string;
  quantity: number;
  unit_rate: number;
  amount: number;
}

export interface Invoice {
  id: string;
  project_id: string;
  project_name: string;
  client_name: string;
  invoice_number?: string;    // assigned when sent
  status: InvoiceStatus;      // effective status (overdue/partial/paid derived)
  issue_date?: string;
  due_date?: string;
  subtotal: number;
  discount: number;
  gst_rate: number;
  gst_amount: number;
  total_amount: number;
  amount_paid: number;
  amount_due: number;
  tds_amount: number;
  credited: number;
  retention_amount: number;
  retention_held: number;
  retention_released_at?: string;
  last_payment_date?: string;
  notes?: string;
  fee_stage_id?: string;
  change_order_id?: string;
  items?: InvoiceLineItem[];
}

export interface CreditNote {
  id: string;
  invoice_id: string;
  number?: string;
  amount: number;
  reason: string;
  issued_at: string;
}

export interface Payment {
  id: string;
  invoice_id: string;
  amount: number;
  tds_amount: number;
  payment_date: string;
  mode: PaymentMode;
  reference?: string;
  notes?: string;
  recorded_by_name?: string;
}

export interface Expense {
  id: string;
  project_id: string;
  category: string;
  description: string;
  amount: number;
  receipt_url?: string;
  expense_date: string;
  created_by_name?: string;
}

// --- Tasks ---

export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Task {
  id: string;
  project_id: string;
  project_name?: string;
  room_id?: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigned_to?: string;
  assigned_to_name?: string;
  due_date?: string;
  is_internal?: boolean;
  created_by?: string;
  created_at: string;
}

// --- Files ---

export interface ProjectFile {
  id: string;
  project_id: string;
  room_id?: string;
  folder?: string;
  category: string;
  file_name: string;
  storage_path?: string;
  file_url: string;
  file_type: string;
  file_size_bytes?: number;
  uploaded_by?: string;
  uploaded_by_name?: string;
  is_client_visible: boolean;
  created_at: string;
}

// --- Messages ---

export interface Message {
  id: string;
  project_id: string;
  sender_id?: string;
  sender_name: string;
  sender_role: 'staff' | 'client';
  content?: string;
  file_url?: string;
  file_name?: string;
  created_at: string;
}

export interface ProjectUpdate {
  id: string;
  project_id: string;
  posted_by: string;
  posted_by_name: string;
  title?: string;
  content: string;
  photos: string[];
  milestone_id?: string;
  created_at: string;
  likes?: number;
  loved?: number;
}

// --- Notifications ---

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  link?: string;
  is_read: boolean;
  created_at: string;
}

// --- Item Library / Rate Master ---

export interface ItemLibraryItem {
  id: string;
  item_name: string;
  category: string;
  unit: string;
  standard_rate: number;
  description?: string;
  specifications?: string;
  created_at: string;
}

// --- BOQ Templates ---

export interface BOQTemplate {
  id: string;
  name: string;
  type?: string;
  category?: string;
  description: string;
  sections: {
    room_name?: string;
    name?: string;
    category?: string;
    items: {
      description: string;
      unit: string;
      default_qty: number;
      default_rate: number;
    }[];
  }[];
}

// --- Material Selections & Moodboards ---

export interface MaterialOption {
  id: string;
  project_id: string;
  room_name: string;
  category: 'Flooring' | 'Walls' | 'Ceiling' | 'Furniture' | 'Lighting' | 'Hardware';
  product_name: string;
  brand: string;
  approx_cost: number;
  image_url: string;
  description?: string;
  is_selected?: boolean;
}

// --- Studio Settings ---

export interface RiskWeights {
  fee_burn: number; overdue: number; schedule: number; cost_variance: number;
  approvals: number; critical_snags: number; pending_changes: number;
}

export interface StudioSettings {
  name: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  gstin?: string;
  pan?: string;
  gst_rate: number;
  brand_color: string;
  logo_url: string;
  invoice_prefix: string;
  terms_and_conditions?: string;
  bank_details: {
    account_name: string;
    bank_name: string;
    account_number: string;
    ifsc_code: string;
    upi_id: string;
  };
  alert_preferences: {
    whatsapp_digest: boolean;
    payment_reminders: boolean;
    snag_fix_alerts: boolean;
    boq_ack: boolean;
  };
  risk_weights: RiskWeights;
  monthly_billing_target?: number;
}

// --- Activity Log ---

export interface ActivityLogItem {
  id: string;
  project_id?: string;
  client_id?: string;
  title: string;
  description: string;
  type: 'stage_change' | 'boq_submit' | 'boq_approve' | 'snag_raised' | 'snag_closed' | 'payment_received' | 'note';
  created_at: string;
}

export interface SessionProfile {
  id: string;
  full_name: string;
  email: string;
  kind: ProfileKind;
  client_id: string | null;
  title: string | null;
  roles: AppRole[];
}

export interface Alert {
  id: string;
  kind: string;
  title: string;
  body: string;
  link?: string;
  project_id?: string;
  invoice_id?: string;
  created_at: string;
  acknowledged_at?: string;
}


