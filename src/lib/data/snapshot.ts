import type {
  ActivityLogItem, BOQTemplate, BOQVersion, ChangeOrder, Client, CreditNote, Expense, FeeStage, FeeTemplate,
  Invoice, ItemLibraryItem, MaterialOption, Message, Notification, Payment, Project, ProjectFile, ProjectUpdate,
  SessionProfile, Snag, StudioSettings, Task, TeamMember,
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
}
