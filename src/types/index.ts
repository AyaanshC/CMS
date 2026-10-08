// ============================================================
// INTERIOR DESIGNER CMS — Type Definitions
// ============================================================

// --- Users & Auth ---

export type UserRole = 'designer' | 'team' | 'client' | 'vendor';
export type TeamRole = 'editor' | 'viewer';

export interface User {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  whatsapp?: string;
  avatar_url?: string;
  role: UserRole;
  studio_id?: string;
}

export interface Studio {
  id: string;
  name: string;
  logo_url?: string;
  address?: string;
  gst_number?: string;
  brand_color: string;
  owner_id: string;
}

// --- Clients ---

export type ClientSource = 'referral' | 'instagram' | 'website' | 'walk-in' | 'other';

export interface Client {
  id: string;
  studio_id?: string;
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
  created_at: string;
  // computed
  active_projects?: number;
  total_value?: number;
  last_activity?: string;
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
  studio_id?: string;
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
  target_date?: string;
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
  grand_total: number;
  total_amount: number;
  gst_percent: number;
  discount_amount: number;
  designer_fee: number;
  created_by: string;
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
  rate?: number;
  total: number;
  amount?: number;
  remarks?: string;
  sort_order: number;
}

// --- Snags ---

export type SnagPriority = 'critical' | 'major' | 'minor' | 'high' | 'medium' | 'low';
export type SnagStatus = 'raised' | 'assigned' | 'in_progress' | 'fixed' | 'verified' | 'closed';

export interface Snag {
  id: string;
  project_id: string;
  room_id?: string;
  room_name?: string;
  room?: string;
  title?: string;
  description?: string;
  location_detail?: string;
  priority: SnagPriority;
  status: SnagStatus;
  raised_by?: string;
  raised_by_name?: string;
  reported_by?: string;
  assigned_to?: string;
  assigned_to_name?: string;
  due_date?: string;
  before_photo_url?: string;
  after_photo_url?: string;
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

export type InvoiceStatus = 'draft' | 'issued' | 'sent' | 'paid' | 'overdue' | 'partial' | 'partially_paid';
export type PaymentMode = 'bank_transfer' | 'cash' | 'cheque' | 'upi' | 'UPI' | 'NEFT/RTGS' | 'Cheque' | 'Cash';

export interface InvoiceLineItem {
  id: string;
  invoice_id?: string;
  description: string;
  quantity: number;
  rate?: number;
  unit_rate?: number;
  amount?: number;
  total?: number;
}

export interface Invoice {
  id: string;
  project_id: string;
  project_name: string;
  client_name: string;
  invoice_number: string;
  status: InvoiceStatus;
  issue_date: string;
  due_date: string;
  subtotal: number;
  gst_amount?: number;
  tax_amount?: number;
  discount?: number;
  total_amount: number;
  amount_paid: number;
  amount_due: number;
  notes?: string;
  line_items?: InvoiceLineItem[];
  items?: InvoiceLineItem[];
}

export interface Payment {
  id: string;
  invoice_id: string;
  project_id: string;
  amount: number;
  payment_date: string;
  mode: PaymentMode;
  reference?: string;
  notes?: string;
}

export interface Expense {
  id: string;
  project_id: string;
  category: string;
  description: string;
  amount: number;
  receipt_url?: string;
  expense_date: string;
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
  name?: string;
  file_url: string;
  file_type: string;
  file_size_bytes?: number;
  file_size: number;
  thumbnail_url?: string;
  uploaded_by: string;
  uploaded_by_name?: string;
  uploaded_at: string;
  is_client_visible: boolean;
  created_at: string;
}

// --- Messages ---

export interface Message {
  id: string;
  project_id: string;
  sender_id?: string;
  sender_name: string;
  sender_role: UserRole;
  content?: string;
  file_url?: string;
  file_name?: string;
  is_read?: boolean;
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

// --- Dashboard KPIs ---

export interface DashboardKPIs {
  active_projects: number;
  revenue_this_month: number;
  outstanding_payments: number;
  open_snags: number;
  tasks_due_today: number;
  pending_approvals: number;
}

// --- Item Library / Rate Master ---

export interface ItemLibraryItem {
  id: string;
  studio_id?: string;
  name?: string;
  item_name?: string;
  category: string;
  unit: string;
  standard_rate?: number;
  base_rate?: number;
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

export interface StudioSettings {
  name: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  gst_number?: string;
  gstin?: string;
  pan?: string;
  gst_rate: number;
  brand_color: string;
  logo_url: string;
  invoice_prefix: string;
  bank_name?: string;
  account_number?: string;
  ifsc_code?: string;
  upi_id?: string;
  terms_conditions?: string;
  terms_and_conditions?: string;
  bank_details: {
    account_name: string;
    bank_name: string;
    account_number: string;
    ifsc_code: string;
    upi_id: string;
  };
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
