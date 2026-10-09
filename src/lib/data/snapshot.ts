import type {
  ActivityLogItem, Alert, BOQTemplate, BOQVersion, ChangeOrder, Client, CostRate, CreditNote, Expense, FeeStage, FeeTemplate,
  Invoice, ItemLibraryItem, MaterialOption, Message, Notification, Payment, Project, ProjectCostRow, ProjectFile, ProjectUpdate,
  RateBand, SessionProfile, Snag, StaffWeekHours, StudioSettings, Task, TeamMember, TimesheetEntry,
} from "@/types";

// Everything a signed-in user may see, already filtered by RLS.
export interface WorkspaceSnapshot {
  me: SessionProfile;
  team: TeamMember[];
  studioSettings: StudioSettings;
  clients: Client[];
  projects: Project[];
  feeStages: FeeStage[];
  feeTemplates: FeeTemplate[];
  changeOrders: ChangeOrder[];
  creditNotes: CreditNote[];
  boqs: BOQVersion[];
  snags: Snag[];
  tasks: Task[];
  invoices: Invoice[];
  payments: Payment[];
  expenses: Expense[];
  messages: Message[];
  projectUpdates: ProjectUpdate[];
  notifications: Notification[];
  itemLibrary: ItemLibraryItem[];
  boqTemplates: BOQTemplate[];
  materialOptions: MaterialOption[];
  files: ProjectFile[];
  activityLogs: ActivityLogItem[];
  alerts: Alert[];
  timesheetEntries: TimesheetEntry[];
  projectCosts: ProjectCostRow[];
  staffWeekHours: StaffWeekHours[];
  rateBands: RateBand[];
  costRates: CostRate[];
}
