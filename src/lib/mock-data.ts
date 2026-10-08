import {
  Client, Project, BOQVersion, Snag, Invoice, Task,
  Message, ProjectUpdate, Notification, DashboardKPIs, Expense,
  ItemLibraryItem, BOQTemplate, MaterialOption, StudioSettings, ProjectFile, ActivityLogItem
} from '@/types';

// ============================================================
// MOCK DATA — Interior Designer CMS
// ============================================================

export const MOCK_STUDIO = {
  id: 'studio-1',
  name: 'Priya Designs Studio',
  logo_url: '',
  address: '14, MG Road, Bangalore - 560001',
  gst_number: '29AABCP1234A1Z5',
  brand_color: '#4F46E5',
  owner_id: 'user-1',
};

export const MOCK_USER = {
  id: 'user-1',
  full_name: 'Priya Sharma',
  email: 'priya@priyadesigns.com',
  phone: '+91 98765 43210',
  role: 'designer' as const,
  studio_id: 'studio-1',
  avatar_url: '',
};

export const MOCK_CLIENTS: Client[] = [
  {
    id: 'client-1',
    studio_id: 'studio-1',
    full_name: 'Arun & Meena Sharma',
    email: 'arun.sharma@gmail.com',
    phone: '+91 98001 11234',
    whatsapp: '+91 98001 11234',
    address: '42, Koramangala 5th Block, Bangalore',
    source: 'referral',
    tags: ['VIP', 'Residential'],
    budget_min: 800000,
    budget_max: 1500000,
    notes: 'Referred by Ravi Mehta. Very detail-oriented. Prefers modern minimalist style.',
    created_at: '2024-10-15T09:00:00Z',
    active_projects: 1,
    total_value: 1250000,
    last_activity: '2024-12-10T14:30:00Z',
  },
  {
    id: 'client-2',
    studio_id: 'studio-1',
    full_name: 'Rohit Mehta',
    email: 'rohit.mehta@techcorp.in',
    phone: '+91 97002 22345',
    source: 'instagram',
    tags: ['Commercial', 'Office'],
    budget_min: 2000000,
    budget_max: 4000000,
    notes: 'CEO of TechCorp. Wants a premium office interior with brand colors.',
    created_at: '2024-09-01T10:00:00Z',
    active_projects: 1,
    total_value: 3200000,
    last_activity: '2024-12-08T11:00:00Z',
  },
  {
    id: 'client-3',
    studio_id: 'studio-1',
    full_name: 'Kavitha Reddy',
    email: 'kavitha.r@gmail.com',
    phone: '+91 96003 33456',
    source: 'website',
    tags: ['Residential', 'New'],
    budget_min: 400000,
    budget_max: 700000,
    notes: '2BHK apartment. Interested in scandinavian style.',
    created_at: '2024-11-20T09:30:00Z',
    active_projects: 1,
    total_value: 550000,
    last_activity: '2024-12-09T16:00:00Z',
  },
  {
    id: 'client-4',
    studio_id: 'studio-1',
    full_name: 'Suresh & Lakshmi Iyer',
    email: 'suresh.iyer@gmail.com',
    phone: '+91 95004 44567',
    source: 'referral',
    tags: ['VIP', 'Residential'],
    budget_min: 2500000,
    budget_max: 5000000,
    notes: 'Villa project. Luxury segment. Traditional + contemporary fusion preferred.',
    created_at: '2024-08-10T08:00:00Z',
    active_projects: 0,
    total_value: 4200000,
    last_activity: '2024-11-30T10:00:00Z',
  },
  {
    id: 'client-5',
    studio_id: 'studio-1',
    full_name: 'Ananya Krishnan',
    email: 'ananya.k@startup.io',
    phone: '+91 94005 55678',
    source: 'instagram',
    tags: ['Commercial'],
    budget_min: 1000000,
    budget_max: 2000000,
    notes: 'Startup office — wants collaborative, open-plan workspace.',
    created_at: '2024-12-01T11:00:00Z',
    active_projects: 1,
    total_value: 0,
    last_activity: '2024-12-07T09:00:00Z',
  },
];

export const MOCK_PROJECTS: Project[] = [
  {
    id: 'project-1',
    studio_id: 'studio-1',
    client_id: 'client-1',
    client_name: 'Arun & Meena Sharma',
    name: 'Sharma Residence — Full Home',
    reference_number: 'STU-2024-0038',
    type: 'residential',
    property_address: '42, Koramangala 5th Block, Bangalore',
    area_sqft: 2200,
    status: 'execution',
    progress_percent: 68,
    start_date: '2024-10-20',
    estimated_end_date: '2025-03-15',
    total_budget: 1250000,
    portal_slug: 'sharma-residence-2024',
    created_at: '2024-10-20T09:00:00Z',
    updated_at: '2024-12-10T14:30:00Z',
    outstanding_payment: 375000,
    rooms: [
      { id: 'room-1', project_id: 'project-1', name: 'Living Room', area_sqft: 400, sort_order: 1 },
      { id: 'room-2', project_id: 'project-1', name: 'Master Bedroom', area_sqft: 250, sort_order: 2 },
      { id: 'room-3', project_id: 'project-1', name: 'Kitchen', area_sqft: 180, sort_order: 3 },
      { id: 'room-4', project_id: 'project-1', name: 'Guest Bedroom', area_sqft: 200, sort_order: 4 },
      { id: 'room-5', project_id: 'project-1', name: 'Master Bathroom', area_sqft: 100, sort_order: 5 },
    ],
    milestones: [
      { id: 'ms-1', project_id: 'project-1', title: 'Design Concept Approved', due_date: '2024-11-10', completed_at: '2024-11-08T10:00:00Z' },
      { id: 'ms-2', project_id: 'project-1', title: 'BOQ Approved', due_date: '2024-11-25', completed_at: '2024-11-22T14:00:00Z' },
      { id: 'ms-3', project_id: 'project-1', title: 'Civil Work Complete', due_date: '2025-01-15' },
      { id: 'ms-4', project_id: 'project-1', title: 'Furniture Installation', due_date: '2025-02-20' },
      { id: 'ms-5', project_id: 'project-1', title: 'Handover', due_date: '2025-03-15' },
    ],
  },
  {
    id: 'project-2',
    studio_id: 'studio-1',
    client_id: 'client-2',
    client_name: 'Rohit Mehta',
    name: 'TechCorp Office — Floor 4 Renovation',
    reference_number: 'STU-2024-0039',
    type: 'office',
    property_address: 'Prestige Tech Park, Outer Ring Road, Bangalore',
    area_sqft: 4500,
    status: 'boq_approval',
    progress_percent: 35,
    start_date: '2024-11-01',
    estimated_end_date: '2025-04-30',
    total_budget: 3200000,
    portal_slug: 'techcorp-office-2024',
    created_at: '2024-11-01T10:00:00Z',
    updated_at: '2024-12-08T11:00:00Z',
    outstanding_payment: 960000,
    rooms: [
      { id: 'room-6', project_id: 'project-2', name: 'Reception', area_sqft: 600, sort_order: 1 },
      { id: 'room-7', project_id: 'project-2', name: 'Open Workspace', area_sqft: 2000, sort_order: 2 },
      { id: 'room-8', project_id: 'project-2', name: 'Conference Room', area_sqft: 400, sort_order: 3 },
      { id: 'room-9', project_id: 'project-2', name: 'MD Cabin', area_sqft: 300, sort_order: 4 },
    ],
    milestones: [
      { id: 'ms-6', project_id: 'project-2', title: 'Space Planning Approved', due_date: '2024-11-20', completed_at: '2024-11-18T09:00:00Z' },
      { id: 'ms-7', project_id: 'project-2', title: 'BOQ Approval', due_date: '2024-12-15' },
      { id: 'ms-8', project_id: 'project-2', title: 'Execution Start', due_date: '2025-01-05' },
    ],
  },
  {
    id: 'project-3',
    studio_id: 'studio-1',
    client_id: 'client-3',
    client_name: 'Kavitha Reddy',
    name: 'Kavitha 2BHK — Scandinavian Reno',
    reference_number: 'STU-2024-0040',
    type: 'residential',
    property_address: 'HSR Layout, Sector 2, Bangalore',
    area_sqft: 1100,
    status: 'snag',
    progress_percent: 88,
    start_date: '2024-09-01',
    estimated_end_date: '2024-12-31',
    total_budget: 550000,
    portal_slug: 'kavitha-2bhk-2024',
    created_at: '2024-09-01T09:00:00Z',
    updated_at: '2024-12-09T16:00:00Z',
    outstanding_payment: 82500,
    rooms: [
      { id: 'room-10', project_id: 'project-3', name: 'Living Room', area_sqft: 280, sort_order: 1 },
      { id: 'room-11', project_id: 'project-3', name: 'Bedroom 1', area_sqft: 180, sort_order: 2 },
      { id: 'room-12', project_id: 'project-3', name: 'Bedroom 2', area_sqft: 160, sort_order: 3 },
      { id: 'room-13', project_id: 'project-3', name: 'Kitchen', area_sqft: 120, sort_order: 4 },
    ],
    milestones: [
      { id: 'ms-9', project_id: 'project-3', title: 'Design Complete', due_date: '2024-09-30', completed_at: '2024-09-28T10:00:00Z' },
      { id: 'ms-10', project_id: 'project-3', title: 'BOQ Approved', due_date: '2024-10-10', completed_at: '2024-10-09T14:00:00Z' },
      { id: 'ms-11', project_id: 'project-3', title: 'Execution Complete', due_date: '2024-11-30', completed_at: '2024-11-28T10:00:00Z' },
      { id: 'ms-12', project_id: 'project-3', title: 'Snag Clearance', due_date: '2024-12-31' },
    ],
  },
  {
    id: 'project-4',
    studio_id: 'studio-1',
    client_id: 'client-5',
    client_name: 'Ananya Krishnan',
    name: 'Ananya Startup Office',
    reference_number: 'STU-2024-0042',
    type: 'commercial',
    property_address: 'Indiranagar 100 ft Road, Bangalore',
    area_sqft: 2800,
    status: 'consultation',
    progress_percent: 12,
    start_date: '2024-12-05',
    estimated_end_date: '2025-05-30',
    total_budget: 1500000,
    portal_slug: 'ananya-startup-office-2024',
    created_at: '2024-12-05T11:00:00Z',
    updated_at: '2024-12-07T09:00:00Z',
    outstanding_payment: 0,
    rooms: [
      { id: 'room-14', project_id: 'project-4', name: 'Open Workspace', area_sqft: 1500, sort_order: 1 },
      { id: 'room-15', project_id: 'project-4', name: 'Meeting Pods', area_sqft: 400, sort_order: 2 },
      { id: 'room-16', project_id: 'project-4', name: 'Pantry', area_sqft: 200, sort_order: 3 },
    ],
    milestones: [
      { id: 'ms-13', project_id: 'project-4', title: 'Initial Consultation', due_date: '2024-12-10' },
      { id: 'ms-14', project_id: 'project-4', title: 'Space Planning Presentation', due_date: '2025-01-10' },
    ],
  },
];

export const MOCK_BOQ: BOQVersion[] = [
  {
    id: 'boq-1',
    project_id: 'project-1',
    version_number: 3,
    version_label: 'Post site visit revision',
    status: 'approved',
    is_active: true,
    submitted_at: '2024-11-20T10:00:00Z',
    approved_at: '2024-11-22T14:00:00Z',
    approved_by: 'Arun Sharma',
    approval_note: 'Approved. Please proceed.',
    grand_total: 1249500,
    total_amount: 1249500,
    gst_percent: 18,
    discount_amount: 25000,
    designer_fee: 75000,
    created_by: 'user-1',
    created_at: '2024-11-18T09:00:00Z',
    sections: [
      {
        id: 'section-1', boq_version_id: 'boq-1', room_id: 'room-1',
        room_name: 'Living Room', name: 'Living Room — Civil Work', category: 'Civil Work', sort_order: 1, subtotal: 34700,
        items: [
          { id: 'item-1', section_id: 'section-1', description: 'False ceiling (POP)', specifications: 'POP with GI channel grid framework', unit: 'sqft', quantity: 120, unit_rate: 85, rate: 85, total: 10200, amount: 10200, sort_order: 1 },
          { id: 'item-2', section_id: 'section-1', description: 'Wall putty + primer', specifications: 'Birla White 2 coats + primer', unit: 'sqft', quantity: 200, unit_rate: 22, rate: 22, total: 4400, amount: 4400, sort_order: 2 },
          { id: 'item-3', section_id: 'section-1', description: 'Flooring — Italian marble', specifications: 'Dyna cream polish grade A', unit: 'sqft', quantity: 400, unit_rate: 180, rate: 180, total: 72000, amount: 72000, sort_order: 3 },
        ],
      },
      {
        id: 'section-2', boq_version_id: 'boq-1', room_id: 'room-1',
        room_name: 'Living Room', name: 'Living Room — Furniture', category: 'Furniture', sort_order: 2, subtotal: 89800,
        items: [
          { id: 'item-4', section_id: 'section-2', description: 'L-shaped sofa (6 seater)', specifications: 'Fabric upholstered, premium foam cushions', unit: 'nos', quantity: 1, unit_rate: 45000, rate: 45000, total: 45000, amount: 45000, sort_order: 1 },
          { id: 'item-5', section_id: 'section-2', description: 'TV unit — wall mounted', specifications: 'MDF with veneer finish, concealed cable routing', unit: 'nos', quantity: 1, unit_rate: 28000, rate: 28000, total: 28000, amount: 28000, sort_order: 2 },
          { id: 'item-6', section_id: 'section-2', description: 'Center table — glass top', specifications: '8mm toughened glass with powder-coated legs', unit: 'nos', quantity: 1, unit_rate: 12000, rate: 12000, total: 12000, amount: 12000, sort_order: 3 },
          { id: 'item-7', section_id: 'section-2', description: 'Curtains — blackout + sheer', specifications: 'Motorized double-track curtain rod with remote', unit: 'nos', quantity: 1, unit_rate: 4800, rate: 4800, total: 4800, amount: 4800, sort_order: 4 },
        ],
      },
      {
        id: 'section-3', boq_version_id: 'boq-1', room_id: 'room-2',
        room_name: 'Master Bedroom', name: 'Master Bedroom — Furniture', category: 'Furniture', sort_order: 3, subtotal: 120000,
        items: [
          { id: 'item-8', section_id: 'section-3', description: 'King bed with storage', specifications: 'Hydraulic lift storage, premium fabric headboard', unit: 'nos', quantity: 1, unit_rate: 55000, rate: 55000, total: 55000, amount: 55000, sort_order: 1 },
          { id: 'item-9', section_id: 'section-3', description: 'Wardrobe — 6 door', specifications: 'Marine ply with 1mm laminate, Hafele soft-close hardware', unit: 'nos', quantity: 1, unit_rate: 65000, rate: 65000, total: 65000, amount: 65000, sort_order: 2 },
        ],
      },
    ],
  },
  {
    id: 'boq-2',
    project_id: 'project-2',
    version_number: 1,
    version_label: 'Initial estimate',
    status: 'submitted',
    is_active: true,
    submitted_at: '2024-12-05T10:00:00Z',
    grand_total: 3185000,
    total_amount: 3185000,
    gst_percent: 18,
    discount_amount: 0,
    designer_fee: 150000,
    created_by: 'user-1',
    created_at: '2024-12-03T09:00:00Z',
    sections: [],
  },
];

export const MOCK_SNAGS: Snag[] = [
  {
    id: 'snag-1', project_id: 'project-3', room_id: 'room-10', room_name: 'Living Room',
    title: 'Paint finish uneven near window', description: 'The paint near the north window has drip marks and uneven sheen.',
    location_detail: 'North wall, near window sill', priority: 'major', status: 'verified',
    raised_by: 'user-1', raised_by_name: 'Priya Sharma', assigned_to: 'vendor-1', assigned_to_name: 'Raju Painters',
    due_date: '2024-12-15', before_photo_url: '', after_photo_url: '',
    designer_verified_at: '2024-12-09T10:00:00Z',
    created_at: '2024-12-01T09:00:00Z', updated_at: '2024-12-09T10:00:00Z',
  },
  {
    id: 'snag-2', project_id: 'project-3', room_id: 'room-11', room_name: 'Bedroom 1',
    title: 'Wardrobe door alignment off', description: 'Left door of wardrobe doesn\'t close flush.',
    location_detail: 'Built-in wardrobe, left door', priority: 'minor', status: 'fixed',
    raised_by: 'client-3', raised_by_name: 'Kavitha Reddy', assigned_to: 'vendor-2', assigned_to_name: 'Kiran Carpentry',
    due_date: '2024-12-12', before_photo_url: '', after_photo_url: '',
    created_at: '2024-12-02T10:00:00Z', updated_at: '2024-12-08T16:00:00Z',
  },
  {
    id: 'snag-3', project_id: 'project-3', room_id: 'room-13', room_name: 'Kitchen',
    title: 'Tile grout incomplete', description: 'Grouting missing in 3 spots near the sink area.',
    location_detail: 'Backsplash near sink', priority: 'critical', status: 'in_progress',
    raised_by: 'user-1', raised_by_name: 'Priya Sharma', assigned_to: 'vendor-3', assigned_to_name: 'Suresh Tiles',
    due_date: '2024-12-10', before_photo_url: '',
    created_at: '2024-12-03T11:00:00Z', updated_at: '2024-12-07T09:00:00Z',
  },
  {
    id: 'snag-4', project_id: 'project-3', room_id: 'room-10', room_name: 'Living Room',
    title: 'Ceiling fan wobble', description: 'Master bedroom ceiling fan has slight wobble at high speed.',
    location_detail: 'Center of ceiling', priority: 'major', status: 'raised',
    raised_by: 'client-3', raised_by_name: 'Kavitha Reddy',
    due_date: '2024-12-18', before_photo_url: '',
    created_at: '2024-12-08T14:00:00Z', updated_at: '2024-12-08T14:00:00Z',
  },
  {
    id: 'snag-5', project_id: 'project-1', room_id: 'room-1', room_name: 'Living Room',
    title: 'Electrical socket placement issue', description: 'One socket behind TV unit — not accessible.',
    location_detail: 'Behind TV wall unit', priority: 'minor', status: 'assigned',
    raised_by: 'user-1', raised_by_name: 'Priya Sharma', assigned_to: 'vendor-4', assigned_to_name: 'Kumar Electricals',
    due_date: '2024-12-20',
    created_at: '2024-12-07T10:00:00Z', updated_at: '2024-12-07T10:00:00Z',
  },
];

export const MOCK_INVOICES: Invoice[] = [
  {
    id: 'inv-1', project_id: 'project-1', project_name: 'Sharma Residence', client_name: 'Arun Sharma',
    invoice_number: 'STU-INV-2024-001', status: 'paid',
    issue_date: '2024-10-22', due_date: '2024-11-05',
    subtotal: 375000, gst_amount: 67500, discount: 0, total_amount: 442500,
    amount_paid: 442500, amount_due: 0,
    notes: '30% advance as per payment schedule.',
  },
  {
    id: 'inv-2', project_id: 'project-1', project_name: 'Sharma Residence', client_name: 'Arun Sharma',
    invoice_number: 'STU-INV-2024-002', status: 'paid',
    issue_date: '2024-11-25', due_date: '2024-12-05',
    subtotal: 500000, gst_amount: 90000, discount: 0, total_amount: 590000,
    amount_paid: 590000, amount_due: 0,
    notes: '40% on design approval.',
  },
  {
    id: 'inv-3', project_id: 'project-1', project_name: 'Sharma Residence', client_name: 'Arun Sharma',
    invoice_number: 'STU-INV-2024-003', status: 'sent',
    issue_date: '2024-12-08', due_date: '2024-12-31',
    subtotal: 375000, gst_amount: 67500, discount: 0, total_amount: 442500,
    amount_paid: 0, amount_due: 442500,
    notes: 'Final 30% on execution completion.',
  },
  {
    id: 'inv-4', project_id: 'project-2', project_name: 'TechCorp Office', client_name: 'Rohit Mehta',
    invoice_number: 'STU-INV-2024-004', status: 'overdue',
    issue_date: '2024-11-05', due_date: '2024-11-20',
    subtotal: 960000, gst_amount: 172800, discount: 0, total_amount: 1132800,
    amount_paid: 0, amount_due: 1132800,
    notes: '30% advance as per agreement.',
  },
  {
    id: 'inv-5', project_id: 'project-3', project_name: 'Kavitha 2BHK', client_name: 'Kavitha Reddy',
    invoice_number: 'STU-INV-2024-005', status: 'partial',
    issue_date: '2024-12-01', due_date: '2024-12-20',
    subtotal: 165000, gst_amount: 29700, discount: 0, total_amount: 194700,
    amount_paid: 100000, amount_due: 94700,
    notes: 'Remaining 30% on handover.',
  },
];

export const MOCK_TASKS: Task[] = [
  { id: 'task-1', project_id: 'project-1', project_name: 'Sharma Residence', title: 'Order Italian marble for living room', status: 'in_progress', priority: 'high', assigned_to: 'user-1', assigned_to_name: 'Priya Sharma', due_date: '2024-12-12', is_internal: true, created_by: 'user-1', created_at: '2024-12-01T09:00:00Z' },
  { id: 'task-2', project_id: 'project-1', project_name: 'Sharma Residence', title: 'Follow up with carpenter for TV unit', status: 'todo', priority: 'medium', assigned_to: 'user-2', assigned_to_name: 'Karan (Team)', due_date: '2024-12-14', is_internal: true, created_by: 'user-1', created_at: '2024-12-02T10:00:00Z' },
  { id: 'task-3', project_id: 'project-2', project_name: 'TechCorp Office', title: 'Prepare BOQ v2 after client feedback', status: 'todo', priority: 'high', assigned_to: 'user-1', assigned_to_name: 'Priya Sharma', due_date: '2024-12-11', is_internal: true, created_by: 'user-1', created_at: '2024-12-05T09:00:00Z' },
  { id: 'task-4', project_id: 'project-3', project_name: 'Kavitha 2BHK', title: 'Verify tile grout fix by Suresh', status: 'todo', priority: 'high', assigned_to: 'user-1', assigned_to_name: 'Priya Sharma', due_date: '2024-12-11', is_internal: true, created_by: 'user-1', created_at: '2024-12-08T10:00:00Z' },
  { id: 'task-5', project_id: 'project-1', project_name: 'Sharma Residence', title: 'Send progress update photos to client', status: 'done', priority: 'low', assigned_to: 'user-1', assigned_to_name: 'Priya Sharma', due_date: '2024-12-10', is_internal: false, created_by: 'user-1', created_at: '2024-12-05T11:00:00Z' },
  { id: 'task-6', project_id: 'project-4', project_name: 'Ananya Startup Office', title: 'Initial site visit and measurement', status: 'todo', priority: 'medium', assigned_to: 'user-1', assigned_to_name: 'Priya Sharma', due_date: '2024-12-13', is_internal: true, created_by: 'user-1', created_at: '2024-12-07T09:00:00Z' },
];

export const MOCK_MESSAGES: Message[] = [
  { id: 'msg-1', project_id: 'project-1', sender_id: 'user-1', sender_name: 'Priya Sharma', sender_role: 'designer', content: 'Hi Arun, I wanted to share a quick update on the living room progress. The false ceiling work is done and it looks great!', is_read: true, created_at: '2024-12-10T10:00:00Z' },
  { id: 'msg-2', project_id: 'project-1', sender_id: 'client-1', sender_name: 'Arun Sharma', sender_role: 'client', content: 'That sounds wonderful! Can you send some photos?', is_read: true, created_at: '2024-12-10T10:15:00Z' },
  { id: 'msg-3', project_id: 'project-1', sender_id: 'user-1', sender_name: 'Priya Sharma', sender_role: 'designer', content: 'Of course! Here are a few shots from today\'s site visit.', is_read: true, created_at: '2024-12-10T10:20:00Z' },
  { id: 'msg-4', project_id: 'project-1', sender_id: 'client-1', sender_name: 'Arun Sharma', sender_role: 'client', content: 'This looks beautiful. We love the ceiling design. When will the marble work start?', is_read: false, created_at: '2024-12-10T14:30:00Z' },
];

export const MOCK_UPDATES: ProjectUpdate[] = [
  { id: 'upd-1', project_id: 'project-1', posted_by: 'user-1', posted_by_name: 'Priya Sharma', title: 'False Ceiling Complete! 🎉', content: 'We\'ve completed the false ceiling work in the living room and master bedroom. The double-layer POP design has come out beautifully with the cove lighting. Next up: marble flooring!', photos: [], milestone_id: undefined, created_at: '2024-12-10T11:00:00Z', likes: 3, loved: 5 },
  { id: 'upd-2', project_id: 'project-1', posted_by: 'user-1', posted_by_name: 'Priya Sharma', title: 'Kitchen Cabinet Work Started', content: 'The kitchen modular cabinet installation has begun today. Ravi\'s team is on site and making good progress. We\'re using the lacquered MDF in warm white as approved.', photos: [], milestone_id: undefined, created_at: '2024-12-08T15:00:00Z', likes: 2, loved: 1 },
];

export const MOCK_NOTIFICATIONS: Notification[] = [
  { id: 'notif-1', user_id: 'user-1', type: 'message_received', title: 'New message from Arun Sharma', body: '"When will the marble work start?"', link: '/projects/project-1/messages', is_read: false, created_at: '2024-12-10T14:30:00Z' },
  { id: 'notif-2', user_id: 'user-1', type: 'snag_raised', title: 'New snag raised by Kavitha Reddy', body: 'Ceiling fan wobble — Living Room', link: '/projects/project-3/snags', is_read: false, created_at: '2024-12-08T14:00:00Z' },
  { id: 'notif-3', user_id: 'user-1', type: 'invoice_overdue', title: 'Invoice overdue — TechCorp Office', body: 'STU-INV-2024-004 is overdue by 20 days', link: '/invoices', is_read: false, created_at: '2024-12-10T08:00:00Z' },
  { id: 'notif-4', user_id: 'user-1', type: 'boq_approved', title: 'BOQ Approved — Sharma Residence', body: 'Arun Sharma approved BOQ v3', link: '/projects/project-1/boq', is_read: true, created_at: '2024-11-22T14:00:00Z' },
  { id: 'notif-5', user_id: 'user-1', type: 'task_due', title: 'Task due today', body: 'Verify tile grout fix by Suresh', link: '/tasks', is_read: true, created_at: '2024-12-10T08:00:00Z' },
];

export const MOCK_DASHBOARD_KPIS: DashboardKPIs = {
  active_projects: 4,
  revenue_this_month: 590000,
  outstanding_payments: 1670025,
  open_snags: 8,
  tasks_due_today: 3,
  pending_approvals: 2,
};

export const MOCK_REVENUE_DATA = [
  { month: 'Jul', revenue: 280000, expenses: 120000 },
  { month: 'Aug', revenue: 420000, expenses: 180000 },
  { month: 'Sep', revenue: 550000, expenses: 220000 },
  { month: 'Oct', revenue: 380000, expenses: 150000 },
  { month: 'Nov', revenue: 680000, expenses: 280000 },
  { month: 'Dec', revenue: 590000, expenses: 210000 },
];

export const MOCK_PROJECT_STATUS_DATA = [
  { name: 'Execution', value: 1, color: '#6366f1' },
  { name: 'BOQ Approval', value: 1, color: '#f59e0b' },
  { name: 'Snag', value: 1, color: '#ef4444' },
  { name: 'Consultation', value: 1, color: '#10b981' },
];

export const MOCK_EXPENSES: Expense[] = [
  { id: 'exp-1', project_id: 'project-1', category: 'Materials', description: 'Italian marble purchase (batch 1)', amount: 72000, expense_date: '2024-12-09' },
  { id: 'exp-2', project_id: 'project-1', category: 'Labor', description: 'Electrician wiring charges', amount: 18000, expense_date: '2024-12-07' },
  { id: 'exp-3', project_id: 'project-1', category: 'Transport', description: 'Marble crane shifting & delivery', amount: 6500, expense_date: '2024-12-08' },
  { id: 'exp-4', project_id: 'project-3', category: 'Materials', description: 'Tile grout and adhesive', amount: 4500, expense_date: '2024-12-05' },
  { id: 'exp-5', project_id: 'project-2', category: 'Consultant', description: 'HVAC consultant site visit', amount: 15000, expense_date: '2024-11-28' },
];

export const MOCK_ITEM_LIBRARY: ItemLibraryItem[] = [
  { id: 'lib-1', studio_id: 'studio-1', name: 'Bottochino Italian Marble Flooring', item_name: 'Bottochino Italian Marble Flooring', category: 'Flooring', unit: 'sqft', standard_rate: 450, base_rate: 450, description: 'Premium grade polished marble with installation', specifications: 'Premium grade polished marble with installation', created_at: '2024-01-15' },
  { id: 'lib-2', studio_id: 'studio-1', name: 'Gypsum Board False Ceiling', item_name: 'Gypsum Board False Ceiling', category: 'Civil', unit: 'sqft', standard_rate: 95, base_rate: 95, description: 'Saint Gobain Gyproc with GI channel grid and cove lighting provision', specifications: 'Saint Gobain Gyproc with GI channel grid and cove lighting provision', created_at: '2024-01-15' },
  { id: 'lib-3', studio_id: 'studio-1', name: 'Royale Luxury Acrylic Emulsion Paint', item_name: 'Royale Luxury Acrylic Emulsion Paint', category: 'Painting', unit: 'sqft', standard_rate: 35, base_rate: 35, description: 'Asian Paints Royale Luxury with 2 coats primer + 2 coats paint', specifications: 'Asian Paints Royale Luxury with 2 coats primer + 2 coats paint', created_at: '2024-01-15' },
  { id: 'lib-4', studio_id: 'studio-1', name: 'Lacquered Glass Kitchen Splashback', item_name: 'Lacquered Glass Kitchen Splashback', category: 'Kitchen', unit: 'sqft', standard_rate: 320, base_rate: 320, description: '6mm back-painted toughened glass', specifications: '6mm back-painted toughened glass', created_at: '2024-01-15' },
  { id: 'lib-5', studio_id: 'studio-1', name: 'Commercial Grade Carpet Tile', item_name: 'Commercial Grade Carpet Tile', category: 'Flooring', unit: 'sqft', standard_rate: 110, base_rate: 110, description: '500x500mm nylon loop pile carpet tiles', specifications: '500x500mm nylon loop pile carpet tiles', created_at: '2024-02-01' },
  { id: 'lib-6', studio_id: 'studio-1', name: 'Solid Teak Wood Door Frame & Shutter', item_name: 'Solid Teak Wood Door Frame & Shutter', category: 'carpentry', unit: 'nos', standard_rate: 28000, base_rate: 28000, description: '35mm thick flush door with 4mm natural teak veneer and melamine polish', specifications: '35mm thick flush door with 4mm natural teak veneer and melamine polish', created_at: '2024-02-10' },
  { id: 'lib-7', studio_id: 'studio-1', name: 'Cove LED Profile Strip 24W Warm White', item_name: 'Cove LED Profile Strip 24W Warm White', category: 'electrical', unit: 'rft', standard_rate: 180, base_rate: 180, description: 'Dotless silicone encased LED strip with meanwell driver', specifications: 'Dotless silicone encased LED strip with meanwell driver', created_at: '2024-02-15' },
  { id: 'lib-8', studio_id: 'studio-1', name: 'Modular Kitchen BWP Marine Ply Base Units', item_name: 'Modular Kitchen BWP Marine Ply Base Units', category: 'carpentry', unit: 'rft', standard_rate: 2400, base_rate: 2400, description: 'Century 710 ply with Hafele soft-close tandem drawers', specifications: 'Century 710 ply with Hafele soft-close tandem drawers', created_at: '2024-03-01' },
  { id: 'lib-9', studio_id: 'studio-1', name: 'Wall Putty & Primer Finishing (2 coats)', item_name: 'Wall Putty & Primer Finishing (2 coats)', category: 'civil', unit: 'sqft', standard_rate: 22, base_rate: 22, description: 'Birla White water-resistant wall care putty', specifications: 'Birla White water-resistant wall care putty', created_at: '2024-03-05' },
];

export const MOCK_BOQ_TEMPLATES: (BOQTemplate & { category?: string })[] = [
  {
    id: 'tmpl-1',
    name: '3BHK Luxury Residential Standard',
    type: '3BHK',
    category: 'residential',
    description: 'Comprehensive specification covering Living, Master Bedroom, 2 Guest Bedrooms, Kitchen and Balconies with premium false ceiling and woodwork.',
    sections: [
      {
        room_name: 'Living & Dining',
        name: 'Living & Dining — Civil & Ceiling',
        category: 'Civil & Ceiling',
        items: [
          { description: 'False ceiling with perimeter LED cove', unit: 'sqft', default_qty: 320, default_rate: 95 },
          { description: 'Wall putty finishing with Royale paint', unit: 'sqft', default_qty: 650, default_rate: 35 },
        ]
      },
      {
        room_name: 'Living & Dining',
        name: 'Living & Dining — Woodwork & Furniture',
        category: 'Woodwork & Furniture',
        items: [
          { description: 'TV entertainment wall unit with back-lit acoustic fluted panels', unit: 'nos', default_qty: 1, default_rate: 75000 },
          { description: 'Shoe rack console with bronze tinted mirror', unit: 'nos', default_qty: 1, default_rate: 28000 },
        ]
      },
      {
        room_name: 'Master Bedroom',
        name: 'Master Bedroom — Storage & Wardrobes',
        category: 'Storage & Wardrobes',
        items: [
          { description: 'Floor to ceiling sliding wardrobe with tinted glass & integrated sensors', unit: 'RFT', default_qty: 10, default_rate: 8500 },
          { description: 'King size hydraulic storage bed with upholstered velvet headboard', unit: 'nos', default_qty: 1, default_rate: 65000 },
        ]
      },
      {
        room_name: 'Modular Kitchen',
        name: 'Modular Kitchen — Cabinetry',
        category: 'Cabinetry',
        items: [
          { description: 'Base cabinets with Blum/Hafele soft-close hardware', unit: 'RFT', default_qty: 16, default_rate: 2400 },
          { description: 'Overhead cabinets with hydraulic flap-up stay mechanisms', unit: 'RFT', default_qty: 14, default_rate: 1900 },
          { description: 'Kalinga Stone quartz countertop 18mm', unit: 'sqft', default_qty: 45, default_rate: 420 },
        ]
      }
    ]
  },
  {
    id: 'tmpl-2',
    name: 'Modern Startup Office (1000-2500 sqft)',
    type: 'Office',
    category: 'commercial',
    description: 'Open workstation layout, conference room acoustic glass partitions, cafeteria and executive cabins.',
    sections: [
      {
        room_name: 'Open Workstation Area',
        name: 'Open Workstation — Flooring & Partition',
        category: 'Flooring & Partition',
        items: [
          { description: 'Nylon carpet tiles with underlay padding', unit: 'sqft', default_qty: 850, default_rate: 110 },
          { description: 'Cable management raceways with floor pop-ups', unit: 'nos', default_qty: 12, default_rate: 2500 },
        ]
      },
      {
        room_name: 'Conference Room',
        name: 'Conference Room — Acoustics & Glass',
        category: 'Acoustics & Glass',
        items: [
          { description: '12mm toughened frameless glass partition with black aluminium channels', unit: 'sqft', default_qty: 240, default_rate: 350 },
          { description: 'Acoustic wall panelling with fabric wrap', unit: 'sqft', default_qty: 160, default_rate: 280 },
        ]
      }
    ]
  }
];

export const MOCK_MATERIAL_OPTIONS: MaterialOption[] = [
  {
    id: 'mat-1',
    project_id: 'project-1',
    room_name: 'Living Room',
    category: 'Flooring',
    product_name: 'Dyna Italian Marble (Cream Polish)',
    brand: 'Classic Marble Co.',
    approx_cost: 380,
    image_url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&auto=format&fit=crop&q=60',
    description: 'Soft beige veining with mirror gloss polish. Pairs with warm walnut furniture.',
    is_selected: true,
  },
  {
    id: 'mat-2',
    project_id: 'project-1',
    room_name: 'Living Room',
    category: 'Flooring',
    product_name: 'Statuario Quartz 1200x600mm Vitrified Tiles',
    brand: 'Kajaria Eternity',
    approx_cost: 165,
    image_url: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=600&auto=format&fit=crop&q=60',
    description: 'Durable porcelain vitrified alternative with high scratch resistance.',
    is_selected: false,
  },
  {
    id: 'mat-3',
    project_id: 'project-1',
    room_name: 'Living Room',
    category: 'Walls',
    product_name: 'Charcoal Fluted Charcoal Wall Louvers',
    brand: 'Evershine Louvers',
    approx_cost: 210,
    image_url: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=600&auto=format&fit=crop&q=60',
    description: 'Textured accent panels for the feature entertainment TV wall.',
    is_selected: true,
  },
  {
    id: 'mat-4',
    project_id: 'project-1',
    room_name: 'Living Room',
    category: 'Lighting',
    product_name: 'Nordic Minimalist Brass Chandelier (Warm LED)',
    brand: 'The White Teak Company',
    approx_cost: 32000,
    image_url: 'https://images.unsplash.com/photo-1540932239986-30128078f3c5?w=600&auto=format&fit=crop&q=60',
    description: 'Statement ceiling luminaire over center coffee table.',
    is_selected: false,
  },
  {
    id: 'mat-5',
    project_id: 'project-1',
    room_name: 'Master Bedroom',
    category: 'Furniture',
    product_name: 'Olive Velvet Headboard Fabric',
    brand: 'D’Decor Home',
    approx_cost: 1200,
    image_url: 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=600&auto=format&fit=crop&q=60',
    description: 'Stain-resistant luxury velvet with deep diamond tufting.',
    is_selected: true,
  }
];

export const MOCK_STUDIO_SETTINGS: StudioSettings = {
  name: 'Priya Designs Studio',
  tagline: 'Bespoke Luxury Interiors & Architecture',
  address: 'Suite 402, Prestige Meridian, 14 MG Road, Bengaluru, Karnataka 560001',
  phone: '+91 98765 43210',
  email: 'contact@priyadesigns.com',
  gst_number: '29AABCP1234A1Z5',
  gstin: '29AABCP1234A1Z5',
  pan: 'AABCP1234A',
  gst_rate: 18,
  brand_color: '#4F46E5',
  logo_url: '',
  invoice_prefix: 'STU-INV',
  bank_name: 'HDFC Bank Ltd.',
  account_number: '50200049281920',
  ifsc_code: 'HDFC0000128',
  upi_id: 'priyadesigns@okhdfcbank',
  bank_details: {
    account_name: 'Priya Designs Studio Pvt Ltd',
    bank_name: 'HDFC Bank Ltd.',
    account_number: '50200049281920',
    ifsc_code: 'HDFC0000128',
    upi_id: 'priyadesigns@okhdfcbank',
  },
  terms_conditions: '1. Invoices must be cleared within 15 calendar days from the date of issue.\n2. Work execution will proceed in synchronization with payment milestone clearance.\n3. Material price escalations above 10% from vendors will be billed at actuals with prior written consent.\n4. All snag rectifications are covered under our 12-month post-handover warranty.',
  terms_and_conditions: '1. Invoices must be cleared within 15 calendar days from the date of issue.\n2. Work execution will proceed in synchronization with payment milestone clearance.\n3. Material price escalations above 10% from vendors will be billed at actuals with prior written consent.\n4. All snag rectifications are covered under our 12-month post-handover warranty.',
};

export const MOCK_FILES: ProjectFile[] = [
  { id: 'f-1', project_id: 'project-1', folder: 'Contracts', category: 'specification', file_name: 'Client_Agreement_Signed.pdf', name: 'Client Agreement (Signed)', file_url: '#', file_type: 'application/pdf', file_size_bytes: 2450000, file_size: 2450000, uploaded_by: 'user-1', uploaded_by_name: 'Priya Sharma', uploaded_at: '2024-10-20', is_client_visible: true, created_at: '2024-10-20' },
  { id: 'f-2', project_id: 'project-1', folder: 'BOQ & Quotations', category: 'specification', file_name: 'Sharma_BOQ_v3_Approved.pdf', name: 'BOQ v3 — Approved Final', file_url: '#', file_type: 'application/pdf', file_size_bytes: 1820000, file_size: 1820000, uploaded_by: 'user-1', uploaded_by_name: 'Priya Sharma', uploaded_at: '2024-11-22', is_client_visible: true, created_at: '2024-11-22' },
  { id: 'f-3', project_id: 'project-1', folder: 'Drawings & Layouts', category: '2d_drawing', file_name: 'Living_Room_Electrical_Layout_v2.dwg', name: 'Living Room Electrical Layout v2', file_url: '#', file_type: 'application/octet-stream', file_size_bytes: 5600000, file_size: 5600000, uploaded_by: 'user-1', uploaded_by_name: 'Priya Sharma', uploaded_at: '2024-11-05', is_client_visible: false, created_at: '2024-11-05' },
  { id: 'f-4', project_id: 'project-1', folder: '3D Renders', category: '3d_render', file_name: 'Living_Room_Daylight_Render_Final.jpg', name: 'Living Room Daylight Render (Final)', file_url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop&q=80', file_type: 'image/jpeg', file_size_bytes: 3400000, file_size: 3400000, thumbnail_url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&auto=format&fit=crop&q=60', uploaded_by: 'user-1', uploaded_by_name: 'Priya Sharma', uploaded_at: '2024-11-12', is_client_visible: true, created_at: '2024-11-12' },
  { id: 'f-5', project_id: 'project-1', folder: '3D Renders', category: '3d_render', file_name: 'Master_Bedroom_Night_Mode.jpg', name: 'Master Bedroom Night Mode Render', file_url: 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=800&auto=format&fit=crop&q=80', file_type: 'image/jpeg', file_size_bytes: 3100000, file_size: 3100000, thumbnail_url: 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=600&auto=format&fit=crop&q=60', uploaded_by: 'user-1', uploaded_by_name: 'Priya Sharma', uploaded_at: '2024-11-14', is_client_visible: true, created_at: '2024-11-14' },
  { id: 'f-6', project_id: 'project-1', folder: 'Site Photos', category: 'handover', file_name: 'Site_Progress_Ceiling_Complete.jpg', name: 'Site Progress — Ceiling Complete', file_url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800&auto=format&fit=crop&q=80', file_type: 'image/jpeg', file_size_bytes: 2800000, file_size: 2800000, thumbnail_url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=600&auto=format&fit=crop&q=60', uploaded_by: 'user-1', uploaded_by_name: 'Priya Sharma', uploaded_at: '2024-12-10', is_client_visible: true, created_at: '2024-12-10' },
];

export const MOCK_ACTIVITY_LOGS: ActivityLogItem[] = [
  { id: 'act-1', project_id: 'project-1', client_id: 'client-1', title: 'Stage Advanced to Execution', description: 'Project was moved from BOQ Approval to Execution following 40% milestone clearance.', type: 'stage_change', created_at: '2024-11-26T10:00:00Z' },
  { id: 'act-2', project_id: 'project-1', client_id: 'client-1', title: 'BOQ Version 3 Approved', description: 'Arun Sharma digitally approved BOQ v3 (₹12,49,500).', type: 'boq_approve', created_at: '2024-11-22T14:00:00Z' },
  { id: 'act-3', project_id: 'project-1', client_id: 'client-1', title: 'Payment Received — ₹5,90,000', description: 'Invoice #STU-INV-2024-002 paid via HDFC Bank Transfer.', type: 'payment_received', created_at: '2024-11-25T16:30:00Z' },
  { id: 'act-4', project_id: 'project-1', client_id: 'client-1', title: 'Snag Raised — Kitchen Cabinet Scratch', description: 'Snag #002 raised by client during site inspection.', type: 'snag_raised', created_at: '2024-12-06T11:20:00Z' },
  { id: 'act-5', project_id: 'project-1', client_id: 'client-1', title: 'Client Consultation Call Note', description: 'Discussed marble texture options. Client prefers Dyna cream over Statuario.', type: 'note', created_at: '2024-12-08T18:00:00Z' },
];

