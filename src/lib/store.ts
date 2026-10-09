"use client";

import { createContext, use } from "react";
import { createStore, useStore, type StoreApi } from "zustand";
import { toast } from "@/components/ui/toast";
import type { ActionResult } from "@/lib/actions/result";
import type { WorkspaceSnapshot } from "@/lib/data/snapshot";
import * as clientActions from "@/app/actions/clients";
import * as projectActions from "@/app/actions/projects";
import * as boqActions from "@/app/actions/boq";
import * as snagActions from "@/app/actions/snags";
import * as taskActions from "@/app/actions/tasks";
import * as financeActions from "@/app/actions/finance";
import type {
  BOQLineItem, BOQVersion, Client, Expense, Invoice, Message, Project, ProjectMilestone, ProjectRoom,
  ProjectStatus, ProjectUpdate, Snag, SnagComment, SnagStatus, Task, ItemLibraryItem, StudioSettings, ProjectFile,
} from "@/types";

export interface AppActions {
  // Client Actions
  addClient: (client: Partial<Client>) => Promise<ActionResult>;
  updateClient: (id: string, updates: Partial<Client>) => Promise<ActionResult>;

  // Project Actions
  createProject: (project: Partial<Project>) => Promise<ActionResult>;
  advanceProjectStage: (projectId: string, stage: ProjectStatus) => Promise<ActionResult>;
  addRoomToProject: (projectId: string, room: Omit<ProjectRoom, "id" | "project_id">) => Promise<ActionResult>;
  addMilestoneToProject: (projectId: string, milestone: Omit<ProjectMilestone, "id" | "project_id">) => Promise<ActionResult>;
  toggleMilestone: (projectId: string, milestoneId: string) => Promise<ActionResult>;

  // BOQ Actions
  addBOQVersion: (boq: BOQVersion) => Promise<ActionResult>;
  updateBOQVersion: (versionId: string, updates: Partial<BOQVersion>) => Promise<ActionResult>;
  approveBOQVersion: (versionId: string, clientName: string, note?: string) => Promise<ActionResult>;
  rejectBOQVersion: (versionId: string, clientName: string, reason: string) => Promise<ActionResult>;
  addLineItemToBOQ: (boqVersionId: string, sectionId: string, item: Omit<BOQLineItem, "id" | "section_id" | "total">) => Promise<ActionResult>;
  deleteLineItemFromBOQ: (boqVersionId: string, sectionId: string, itemId: string) => Promise<ActionResult>;

  // Snag Actions
  addSnag: (snag: Partial<Snag>) => Promise<ActionResult>;
  updateSnagStatus: (snagId: string, status: SnagStatus, actorName?: string, afterPhotoUrl?: string) => Promise<ActionResult>;
  addSnagComment: (snagId: string, comment: Omit<SnagComment, "id" | "snag_id" | "created_at">) => Promise<ActionResult>;

  // Task Actions
  addTask: (task: Partial<Task>) => Promise<ActionResult>;
  updateTaskStatus: (taskId: string, status: Task["status"]) => Promise<ActionResult>;
  deleteTask: (taskId: string) => Promise<ActionResult>;

  // Finance Actions
  addInvoice: (invoice: Partial<Invoice> & { send?: boolean }) => Promise<ActionResult>;
  cancelInvoice: (invoiceId: string) => Promise<ActionResult>;
  recordPayment: (invoiceId: string, amount: number, paymentDate: string, mode: string, reference?: string) => Promise<ActionResult>;
  addExpense: (expense: Partial<Expense>) => Promise<ActionResult>;

  // Messages & Communication
  addMessage: (message: Message) => Promise<ActionResult> | void;
  addProjectUpdate: (update: ProjectUpdate) => Promise<ActionResult> | void;
  toggleUpdateReaction: (updateId: string, type: 'like' | 'love') => Promise<ActionResult> | void;

  // Files
  addFile: (file: ProjectFile) => Promise<ActionResult> | void;
  toggleFileVisibility: (fileId: string) => Promise<ActionResult> | void;
  deleteFile: (fileId: string) => Promise<ActionResult> | void;

  // Item Library & Materials
  addItemToLibrary: (item: Omit<ItemLibraryItem, 'id' | 'created_at'>) => Promise<ActionResult> | void;
  updateLibraryItem: (id: string, updates: Partial<ItemLibraryItem>) => Promise<ActionResult> | void;
  deleteLibraryItem: (id: string) => Promise<ActionResult> | void;
  toggleMaterialSelection: (materialId: string) => Promise<ActionResult> | void;

  // Settings & Activity
  updateStudioSettings: (settings: Partial<StudioSettings>) => Promise<ActionResult> | void;
  markNotificationRead: (id: string) => Promise<ActionResult> | void;
  markAllNotificationsRead: () => Promise<ActionResult> | void;
}

export type AppState = WorkspaceSnapshot & AppActions;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function run(p: Promise<ActionResult>): Promise<ActionResult> {
  const r = await p;
  if (!r.ok) toast.add({ title: "Could not save", description: r.error, type: "error" });
  return r;
}

export const createAppStore = (snapshot: WorkspaceSnapshot) =>
  createStore<AppState>()((set, get) => ({
    ...snapshot,

    addClient: (client) => run(clientActions.createClient(client)),
    updateClient: (id, updates) => run(clientActions.updateClient({ ...updates, id })),
    createProject: (project) => run(projectActions.createProject(project)),
    advanceProjectStage: (projectId, stage) => run(projectActions.setProjectStage({ id: projectId, status: stage })),
    addRoomToProject: (projectId, room) => run(projectActions.addRoom({ ...room, project_id: projectId })),
    addMilestoneToProject: (projectId, m) => run(projectActions.addMilestone({ ...m, project_id: projectId })),
    toggleMilestone: (_projectId, milestoneId) => run(projectActions.toggleMilestone({ id: milestoneId })),

    // BOQ Actions
    addBOQVersion: (boq) =>
      run(boqActions.createBoqVersion({
        project_id: boq.project_id,
        version_label: boq.version_label,
        gst_percent: boq.gst_percent,
        discount_amount: boq.discount_amount,
        designer_fee: boq.designer_fee,
        sections: boq.sections.map((s, i) => ({
          name: s.room_name ?? s.name, room_id: s.room_id, category: s.category, sort_order: s.sort_order ?? i,
          items: s.items.map((it, j) => ({ ...it, sort_order: it.sort_order ?? j })),
        })),
      })),
    updateBOQVersion: (versionId, updates) => run(boqActions.updateBoqVersion({ ...updates, id: versionId })),
    approveBOQVersion: (versionId, signer, note) => run(boqActions.decideBoq({ boq_id: versionId, approve: true, signer, note })),
    rejectBOQVersion: (versionId, signer, reason) => run(boqActions.decideBoq({ boq_id: versionId, approve: false, signer, note: reason })),
    addLineItemToBOQ: (_versionId, sectionId, item) => run(boqActions.addLineItem({ ...item, section_id: sectionId })),
    deleteLineItemFromBOQ: (_versionId, _sectionId, itemId) => run(boqActions.deleteLineItem({ id: itemId })),

    // Snag Actions
    addSnag: (snag) => run(snagActions.createSnag(snag)),
    updateSnagStatus: (snagId, status, _actorName, afterPhotoPath) =>
      run(get().me.kind === "client" && status === "closed"
        ? snagActions.closeSnagAsClient({ id: snagId })
        : snagActions.setSnagStatus({ id: snagId, status, after_photo_url: afterPhotoPath })),
    addSnagComment: (snagId, comment) => run(snagActions.addSnagComment({ ...comment, snag_id: snagId })),
    addTask: (task) => run(taskActions.createTask(task)),
    updateTaskStatus: (taskId, status) => run(taskActions.setTaskStatus({ id: taskId, status })),
    deleteTask: (taskId) => run(taskActions.deleteTask({ id: taskId })),

    // Finance Actions
    addInvoice: (invoice) => run(financeActions.createInvoice({ ...invoice, send: invoice.send ?? invoice.status !== "draft" })),
    cancelInvoice: (invoiceId) => run(financeActions.cancelInvoice({ id: invoiceId })),
    recordPayment: (invoiceId, amount, paymentDate, mode, reference) =>
      run(financeActions.recordPayment({ invoice_id: invoiceId, amount, payment_date: paymentDate, mode, reference })),
    addExpense: (expense) => run(financeActions.addExpense(expense)),

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

  markNotificationRead: (id) => set((state) => ({
    notifications: state.notifications.map(n => n.id === id ? { ...n, is_read: true } : n)
  })),

  markAllNotificationsRead: () => set((state) => ({
    notifications: state.notifications.map(n => ({ ...n, is_read: true }))
  })),
  }));

export const AppStoreContext = createContext<StoreApi<AppState> | null>(null);

export function useAppStore(): AppState;
export function useAppStore<T>(selector: (s: AppState) => T): T;
export function useAppStore<T>(selector?: (s: AppState) => T) {
  const store = use(AppStoreContext);
  if (!store) throw new Error("useAppStore must be used inside <AppStoreProvider>");
  return useStore(store, selector ?? ((s) => s as T));
}
