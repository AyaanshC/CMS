import { create } from 'zustand';
import { 
  MOCK_CLIENTS, MOCK_PROJECTS, MOCK_BOQ, MOCK_SNAGS, 
  MOCK_TASKS, MOCK_INVOICES, MOCK_MESSAGES, MOCK_NOTIFICATIONS,
  MOCK_UPDATES, MOCK_EXPENSES, MOCK_ITEM_LIBRARY, MOCK_BOQ_TEMPLATES,
  MOCK_MATERIAL_OPTIONS, MOCK_STUDIO_SETTINGS, MOCK_FILES, MOCK_ACTIVITY_LOGS 
} from './mock-data';
import { 
  Client, Project, ProjectStatus, BOQVersion, BOQSection, BOQLineItem,
  Snag, SnagStatus, SnagComment, Task, Invoice, Expense, Message, 
  ProjectUpdate, Notification, ItemLibraryItem, BOQTemplate, 
  MaterialOption, StudioSettings, ProjectFile, ActivityLogItem, ProjectRoom, ProjectMilestone 
} from '@/types';

interface AppState {
  clients: Client[];
  projects: Project[];
  boqs: BOQVersion[];
  snags: Snag[];
  tasks: Task[];
  invoices: Invoice[];
  messages: Message[];
  notifications: Notification[];
  projectUpdates: ProjectUpdate[];
  expenses: Expense[];
  itemLibrary: ItemLibraryItem[];
  boqTemplates: BOQTemplate[];
  materialOptions: MaterialOption[];
  studioSettings: StudioSettings;
  files: ProjectFile[];
  activityLogs: ActivityLogItem[];

  // Client Actions
  addClient: (client: Client) => void;
  updateClient: (id: string, updates: Partial<Client>) => void;

  // Project Actions
  addProject: (project: Project) => void;
  advanceProjectStage: (projectId: string, stage: ProjectStatus) => void;
  addRoomToProject: (projectId: string, room: Omit<ProjectRoom, 'id' | 'project_id'>) => void;
  addMilestoneToProject: (projectId: string, milestone: Omit<ProjectMilestone, 'id' | 'project_id'>) => void;
  toggleMilestone: (projectId: string, milestoneId: string) => void;

  // BOQ Actions
  addBOQVersion: (boq: BOQVersion) => void;
  updateBOQVersion: (versionId: string, updates: Partial<BOQVersion>) => void;
  approveBOQVersion: (versionId: string, clientName: string, note?: string) => void;
  rejectBOQVersion: (versionId: string, clientName: string, reason: string) => void;
  addLineItemToBOQ: (boqVersionId: string, sectionId: string, item: Omit<BOQLineItem, 'id' | 'section_id'>) => void;
  deleteLineItemFromBOQ: (boqVersionId: string, sectionId: string, itemId: string) => void;

  // Snag Actions
  addSnag: (snag: Snag) => void;
  updateSnagStatus: (snagId: string, status: SnagStatus, actorName?: string, afterPhotoUrl?: string) => void;
  addSnagComment: (snagId: string, comment: Omit<SnagComment, 'id' | 'snag_id' | 'created_at'>) => void;

  // Task Actions
  addTask: (task: Task) => void;
  updateTaskStatus: (taskId: string, status: Task['status']) => void;
  deleteTask: (taskId: string) => void;

  // Finance Actions
  addInvoice: (invoice: Invoice) => void;
  recordPayment: (invoiceId: string, amount: number, paymentDate: string, mode: string, reference?: string) => void;
  addExpense: (expense: Expense) => void;

  // Messages & Communication
  addMessage: (message: Message) => void;
  addProjectUpdate: (update: ProjectUpdate) => void;
  toggleUpdateReaction: (updateId: string, type: 'like' | 'love') => void;

  // Files
  addFile: (file: ProjectFile) => void;
  toggleFileVisibility: (fileId: string) => void;
  deleteFile: (fileId: string) => void;

  // Item Library & Materials
  addItemToLibrary: (item: Omit<ItemLibraryItem, 'id' | 'created_at'>) => void;
  updateLibraryItem: (id: string, updates: Partial<ItemLibraryItem>) => void;
  deleteLibraryItem: (id: string) => void;
  toggleMaterialSelection: (materialId: string) => void;

  // Settings & Activity
  updateStudioSettings: (settings: Partial<StudioSettings>) => void;
  addActivityLog: (log: Omit<ActivityLogItem, 'id' | 'created_at'>) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  clients: [...MOCK_CLIENTS],
  projects: [...MOCK_PROJECTS],
  boqs: [...MOCK_BOQ],
  snags: [...MOCK_SNAGS],
  tasks: [...MOCK_TASKS],
  invoices: [...MOCK_INVOICES],
  messages: [...MOCK_MESSAGES],
  notifications: [...MOCK_NOTIFICATIONS],
  projectUpdates: [...MOCK_UPDATES],
  expenses: [...MOCK_EXPENSES],
  itemLibrary: [...MOCK_ITEM_LIBRARY],
  boqTemplates: [...MOCK_BOQ_TEMPLATES],
  materialOptions: [...MOCK_MATERIAL_OPTIONS],
  studioSettings: { ...MOCK_STUDIO_SETTINGS },
  files: [...MOCK_FILES],
  activityLogs: [...MOCK_ACTIVITY_LOGS],

  // Client Actions
  addClient: (client) => set((state) => ({ 
    clients: [client, ...state.clients],
    activityLogs: [{
      id: 'act-' + Date.now(),
      client_id: client.id,
      title: 'New Client Created',
      description: `Client profile for ${client.full_name} created.`,
      type: 'note',
      created_at: new Date().toISOString()
    }, ...state.activityLogs]
  })),

  updateClient: (id, updates) => set((state) => ({
    clients: state.clients.map(c => c.id === id ? { ...c, ...updates } : c)
  })),

  // Project Actions
  addProject: (project) => set((state) => ({ 
    projects: [project, ...state.projects],
    activityLogs: [{
      id: 'act-' + Date.now(),
      project_id: project.id,
      client_id: project.client_id,
      title: 'Project Initialized',
      description: `Project ${project.name} created under ${project.type} type.`,
      type: 'stage_change',
      created_at: new Date().toISOString()
    }, ...state.activityLogs]
  })),

  advanceProjectStage: (projectId, stage) => set((state) => {
    const project = state.projects.find(p => p.id === projectId);
    return {
      projects: state.projects.map(p => p.id === projectId ? { ...p, status: stage } : p),
      activityLogs: [{
        id: 'act-' + Date.now(),
        project_id: projectId,
        client_id: project?.client_id,
        title: `Stage Changed to ${stage.toUpperCase()}`,
        description: `Project advanced to ${stage.replace('_', ' ')} stage.`,
        type: 'stage_change',
        created_at: new Date().toISOString()
      }, ...state.activityLogs]
    };
  }),

  addRoomToProject: (projectId, roomData) => set((state) => ({
    projects: state.projects.map(p => {
      if (p.id !== projectId) return p;
      const rooms = p.rooms || [];
      const newRoom: ProjectRoom = {
        id: 'room-' + (rooms.length + 1),
        project_id: projectId,
        name: roomData.name,
        area_sqft: roomData.area_sqft,
        sort_order: rooms.length + 1,
      };
      return { ...p, rooms: [...rooms, newRoom] };
    })
  })),

  addMilestoneToProject: (projectId, milestoneData) => set((state) => ({
    projects: state.projects.map(p => {
      if (p.id !== projectId) return p;
      const milestones = p.milestones || [];
      const newMs: ProjectMilestone = {
        id: 'ms-' + (milestones.length + 1),
        project_id: projectId,
        title: milestoneData.title,
        due_date: milestoneData.due_date,
      };
      return { ...p, milestones: [...milestones, newMs] };
    })
  })),

  toggleMilestone: (projectId, milestoneId) => set((state) => ({
    projects: state.projects.map(p => {
      if (p.id !== projectId) return p;
      return {
        ...p,
        milestones: p.milestones?.map(m => m.id === milestoneId ? {
          ...m,
          completed_at: m.completed_at ? undefined : new Date().toISOString()
        } : m)
      };
    })
  })),

  // BOQ Actions
  addBOQVersion: (boq) => set((state) => ({ boqs: [boq, ...state.boqs] })),

  updateBOQVersion: (versionId, updates) => set((state) => ({
    boqs: state.boqs.map(b => b.id === versionId ? { ...b, ...updates } : b)
  })),

  approveBOQVersion: (versionId, clientName, note) => set((state) => {
    const boq = state.boqs.find(b => b.id === versionId);
    return {
      boqs: state.boqs.map(b => b.id === versionId ? {
        ...b,
        status: 'approved',
        approved_at: new Date().toISOString(),
        approval_note: note || `Approved by ${clientName}`
      } : b),
      activityLogs: [{
        id: 'act-' + Date.now(),
        project_id: boq?.project_id,
        title: `BOQ v${boq?.version_number} Approved`,
        description: `Approved by ${clientName}. ${note ? `Note: "${note}"` : ''}`,
        type: 'boq_approve',
        created_at: new Date().toISOString()
      }, ...state.activityLogs],
      notifications: [{
        id: 'notif-' + Date.now(),
        user_id: 'user-1',
        type: 'boq_approved',
        title: `BOQ v${boq?.version_number} Approved!`,
        body: `${clientName} has approved the BOQ version.`,
        is_read: false,
        created_at: new Date().toISOString()
      }, ...state.notifications]
    };
  }),

  rejectBOQVersion: (versionId, clientName, reason) => set((state) => {
    const boq = state.boqs.find(b => b.id === versionId);
    return {
      boqs: state.boqs.map(b => b.id === versionId ? {
        ...b,
        status: 'rejected',
        approval_note: `Rejected by ${clientName}: ${reason}`
      } : b),
      activityLogs: [{
        id: 'act-' + Date.now(),
        project_id: boq?.project_id,
        title: `BOQ v${boq?.version_number} Rejected`,
        description: `Rejected by ${clientName}. Reason: "${reason}"`,
        type: 'note',
        created_at: new Date().toISOString()
      }, ...state.activityLogs],
      notifications: [{
        id: 'notif-' + Date.now(),
        user_id: 'user-1',
        type: 'boq_rejected',
        title: `BOQ v${boq?.version_number} Revision Requested`,
        body: `${clientName} rejected the BOQ: "${reason}"`,
        is_read: false,
        created_at: new Date().toISOString()
      }, ...state.notifications]
    };
  }),

  addLineItemToBOQ: (boqVersionId, sectionId, itemData) => set((state) => ({
    boqs: state.boqs.map(b => {
      if (b.id !== boqVersionId) return b;
      const updatedSections = (b.sections || []).map(sec => {
        if (sec.id !== sectionId) return sec;
        const newItem: BOQLineItem = {
          id: 'item-' + Date.now(),
          section_id: sectionId,
          description: itemData.description,
          unit: itemData.unit,
          quantity: itemData.quantity,
          unit_rate: itemData.unit_rate,
          total: itemData.quantity * itemData.unit_rate,
          remarks: itemData.remarks,
          sort_order: (sec.items?.length || 0) + 1
        };
        const items = [...(sec.items || []), newItem];
        const subtotal = items.reduce((sum, it) => sum + it.total, 0);
        return { ...sec, items, subtotal };
      });
      const grandSubtotal = updatedSections.reduce((sum, s) => sum + s.subtotal, 0);
      const gst = (grandSubtotal * (b.gst_percent || 18)) / 100;
      const grand_total = grandSubtotal + gst + (b.designer_fee || 0) - (b.discount_amount || 0);
      return { ...b, sections: updatedSections, grand_total };
    })
  })),

  deleteLineItemFromBOQ: (boqVersionId, sectionId, itemId) => set((state) => ({
    boqs: state.boqs.map(b => {
      if (b.id !== boqVersionId) return b;
      const updatedSections = (b.sections || []).map(sec => {
        if (sec.id !== sectionId) return sec;
        const items = (sec.items || []).filter(i => i.id !== itemId);
        const subtotal = items.reduce((sum, it) => sum + it.total, 0);
        return { ...sec, items, subtotal };
      });
      const grandSubtotal = updatedSections.reduce((sum, s) => sum + s.subtotal, 0);
      const gst = (grandSubtotal * (b.gst_percent || 18)) / 100;
      const grand_total = grandSubtotal + gst + (b.designer_fee || 0) - (b.discount_amount || 0);
      return { ...b, sections: updatedSections, grand_total };
    })
  })),

  // Snag Actions
  addSnag: (snag) => set((state) => ({ 
    snags: [snag, ...state.snags],
    activityLogs: [{
      id: 'act-' + Date.now(),
      project_id: snag.project_id,
      title: `Snag Raised: ${snag.title}`,
      description: `Priority ${snag.priority} snag raised in ${snag.room_name || 'general'}.`,
      type: 'snag_raised',
      created_at: new Date().toISOString()
    }, ...state.activityLogs],
    notifications: [{
      id: 'notif-' + Date.now(),
      user_id: 'user-1',
      type: 'snag_raised',
      title: `New Snag: ${snag.title}`,
      body: `Priority: ${snag.priority.toUpperCase()} · ${snag.room_name || 'Site'}`,
      is_read: false,
      created_at: new Date().toISOString()
    }, ...state.notifications]
  })),

  updateSnagStatus: (snagId, status, actorName, afterPhotoUrl) => set((state) => {
    const snag = state.snags.find(s => s.id === snagId);
    return {
      snags: state.snags.map(s => s.id === snagId ? {
        ...s,
        status,
        after_photo_url: afterPhotoUrl || s.after_photo_url,
        designer_verified_at: status === 'verified' ? new Date().toISOString() : s.designer_verified_at,
        client_closed_at: status === 'closed' ? new Date().toISOString() : s.client_closed_at,
        updated_at: new Date().toISOString()
      } : s),
      activityLogs: [{
        id: 'act-' + Date.now(),
        project_id: snag?.project_id,
        title: `Snag Status: ${status.replace('_', ' ').toUpperCase()}`,
        description: `Snag "${snag?.title}" moved to ${status} by ${actorName || 'User'}.`,
        type: status === 'closed' ? 'snag_closed' : 'note',
        created_at: new Date().toISOString()
      }, ...state.activityLogs]
    };
  }),

  addSnagComment: (snagId, comment) => set((state) => ({
    snags: state.snags.map(s => {
      if (s.id !== snagId) return s;
      const comments = s.comments || [];
      const newComment: SnagComment = {
        id: 'comm-' + Date.now(),
        snag_id: snagId,
        author_id: comment.author_id,
        author_name: comment.author_name,
        content: comment.content,
        photo_url: comment.photo_url,
        created_at: new Date().toISOString()
      };
      return { ...s, comments: [...comments, newComment] };
    })
  })),

  // Task Actions
  addTask: (task) => set((state) => ({ tasks: [task, ...state.tasks] })),

  updateTaskStatus: (taskId, status) => set((state) => ({
    tasks: state.tasks.map(t => t.id === taskId ? { ...t, status } : t)
  })),

  deleteTask: (taskId) => set((state) => ({
    tasks: state.tasks.filter(t => t.id !== taskId)
  })),

  // Finance Actions
  addInvoice: (invoice) => set((state) => ({ 
    invoices: [invoice, ...state.invoices],
    notifications: [{
      id: 'notif-' + Date.now(),
      user_id: 'client-1',
      type: 'invoice_sent',
      title: `Invoice ${invoice.invoice_number} Issued`,
      body: `Total amount due: ₹${invoice.total_amount.toLocaleString()}`,
      is_read: false,
      created_at: new Date().toISOString()
    }, ...state.notifications]
  })),

  recordPayment: (invoiceId, amount, paymentDate, mode, reference) => set((state) => {
    const inv = state.invoices.find(i => i.id === invoiceId);
    return {
      invoices: state.invoices.map(i => {
        if (i.id !== invoiceId) return i;
        const newPaid = (i.amount_paid || 0) + amount;
        const newDue = Math.max(0, i.total_amount - newPaid);
        const newStatus = newDue === 0 ? 'paid' : 'partial';
        return {
          ...i,
          amount_paid: newPaid,
          amount_due: newDue,
          status: newStatus
        };
      }),
      activityLogs: [{
        id: 'act-' + Date.now(),
        project_id: inv?.project_id,
        title: `Payment Recorded: ₹${amount.toLocaleString()}`,
        description: `Payment of ₹${amount.toLocaleString()} received via ${mode.toUpperCase()} for ${inv?.invoice_number}.`,
        type: 'payment_received',
        created_at: new Date().toISOString()
      }, ...state.activityLogs]
    };
  }),

  addExpense: (expense) => set((state) => ({ expenses: [expense, ...state.expenses] })),

  // Communication
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),

  addProjectUpdate: (update) => set((state) => ({
    projectUpdates: [update, ...state.projectUpdates],
    notifications: [{
      id: 'notif-' + Date.now(),
      user_id: 'client-1',
      type: 'project_update',
      title: update.title || 'New Project Update',
      body: update.content.slice(0, 80) + '...',
      is_read: false,
      created_at: new Date().toISOString()
    }, ...state.notifications]
  })),

  toggleUpdateReaction: (updateId, type) => set((state) => ({
    projectUpdates: state.projectUpdates.map(u => {
      if (u.id !== updateId) return u;
      if (type === 'love') {
        return { ...u, loved: (u.loved || 0) + 1 };
      }
      return { ...u, likes: (u.likes || 0) + 1 };
    })
  })),

  // Files
  addFile: (file) => set((state) => ({ files: [file, ...state.files] })),

  toggleFileVisibility: (fileId) => set((state) => ({
    files: state.files.map(f => f.id === fileId ? { ...f, is_client_visible: !f.is_client_visible } : f)
  })),

  deleteFile: (fileId) => set((state) => ({
    files: state.files.filter(f => f.id !== fileId)
  })),

  // Item Library & Materials
  addItemToLibrary: (itemData) => set((state) => {
    const newItem: ItemLibraryItem = {
      id: 'lib-' + Date.now(),
      created_at: new Date().toISOString().split('T')[0],
      ...itemData
    };
    return { itemLibrary: [newItem, ...state.itemLibrary] };
  }),

  updateLibraryItem: (id, updates) => set((state) => ({
    itemLibrary: state.itemLibrary.map(item => item.id === id ? { ...item, ...updates } : item)
  })),

  deleteLibraryItem: (id) => set((state) => ({
    itemLibrary: state.itemLibrary.filter(item => item.id !== id)
  })),

  toggleMaterialSelection: (materialId) => set((state) => ({
    materialOptions: state.materialOptions.map(m => m.id === materialId ? { ...m, is_selected: !m.is_selected } : m)
  })),

  // Settings & Activity
  updateStudioSettings: (settingsUpdates) => set((state) => ({
    studioSettings: { ...state.studioSettings, ...settingsUpdates }
  })),

  addActivityLog: (log) => set((state) => ({
    activityLogs: [{
      id: 'act-' + Date.now(),
      created_at: new Date().toISOString(),
      ...log
    }, ...state.activityLogs]
  })),

  markNotificationRead: (id) => set((state) => ({
    notifications: state.notifications.map(n => n.id === id ? { ...n, is_read: true } : n)
  })),

  markAllNotificationsRead: () => set((state) => ({
    notifications: state.notifications.map(n => ({ ...n, is_read: true }))
  })),
}));
