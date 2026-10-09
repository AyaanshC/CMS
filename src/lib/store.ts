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
import * as fileActions from "@/app/actions/files";
import * as commsActions from "@/app/actions/comms";
import * as settingsActions from "@/app/actions/settings";
import * as feeActions from "@/app/actions/fees";
import * as coActions from "@/app/actions/change-orders";
import * as recvActions from "@/app/actions/receivables";
import * as alertActions from "@/app/actions/alerts";
import * as tsActions from "@/app/actions/timesheets";
import type {
  BOQLineItem, BOQVersion, ChangeOrder, Client, Expense, FeeStage, Invoice, Message, Project, ProjectMilestone, ProjectRoom,
  ProjectStatus, ProjectUpdate, Snag, SnagComment, SnagStatus, Task, ItemLibraryItem, StudioSettings, TimesheetActivity,
} from "@/types";

export interface WeekRow {
  project_id: string | null; fee_stage_id: string | null; activity: TimesheetActivity; billable: boolean; notes?: string; hours: number[];
}

export type NewFileRecord = {
  project_id: string; folder?: string; file_name: string; storage_path: string;
  file_type: string; file_size_bytes: number; is_client_visible: boolean;
};

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

  // Fee & Change Order Actions
  setFeeTerms: (projectId: string, terms: Partial<Project>) => Promise<ActionResult>;
  applyFeeTemplate: (projectId: string, templateId: string) => Promise<ActionResult>;
  addFeeStage: (stage: Partial<FeeStage>) => Promise<ActionResult>;
  updateFeeStage: (stageId: string, updates: Partial<FeeStage>) => Promise<ActionResult>;
  deleteFeeStage: (stageId: string) => Promise<ActionResult>;
  completeFeeStage: (stageId: string) => Promise<ActionResult>;
  reopenFeeStage: (stageId: string) => Promise<ActionResult>;
  createChangeOrder: (co: Partial<ChangeOrder>) => Promise<ActionResult>;
  updateChangeOrder: (id: string, updates: Partial<ChangeOrder>) => Promise<ActionResult>;
  submitChangeOrder: (id: string) => Promise<ActionResult>;
  decideChangeOrder: (id: string, approve: boolean, signer: string, note?: string) => Promise<ActionResult>;

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
  issueInvoice: (id: string, dueDate?: string) => Promise<ActionResult>;
  deleteDraftInvoice: (id: string) => Promise<ActionResult>;
  cancelInvoice: (invoiceId: string) => Promise<ActionResult>;
  recordPayment: (invoiceId: string, amount: number, paymentDate: string, mode: string, reference?: string, tdsAmount?: number) => Promise<ActionResult>;
  addCreditNote: (invoiceId: string, amount: number, reason: string) => Promise<ActionResult>;
  setRetention: (invoiceId: string, amount: number) => Promise<ActionResult>;
  releaseRetention: (invoiceId: string) => Promise<ActionResult>;
  addExpense: (expense: Partial<Expense>) => Promise<ActionResult>;
  acknowledgeAlert: (id: string) => Promise<ActionResult>;

  // Messages & Communication
  addMessage: (message: Partial<Message>) => Promise<ActionResult>;
  addProjectUpdate: (update: Partial<ProjectUpdate>) => Promise<ActionResult>;
  toggleUpdateReaction: (updateId: string, type: "like" | "love") => Promise<ActionResult>;

  // Files
  addFile: (file: NewFileRecord) => Promise<ActionResult>;
  toggleFileVisibility: (fileId: string) => Promise<ActionResult>;
  deleteFile: (fileId: string) => Promise<ActionResult>;

  // Item Library & Materials
  addItemToLibrary: (item: Omit<ItemLibraryItem, 'id' | 'created_at'>) => Promise<ActionResult>;
  updateLibraryItem: (id: string, updates: Partial<ItemLibraryItem>) => Promise<ActionResult>;
  deleteLibraryItem: (id: string) => Promise<ActionResult>;
  toggleMaterialSelection: (materialId: string) => Promise<ActionResult>;

  // Settings & Activity
  updateStudioSettings: (settings: Partial<StudioSettings>) => Promise<ActionResult>;
  markNotificationRead: (id: string) => Promise<ActionResult>;
  markAllNotificationsRead: () => Promise<ActionResult>;

  // Timesheets
  saveTimesheetWeek: (weekStart: string, rows: WeekRow[]) => Promise<ActionResult>;
  submitTimesheetWeek: (weekStart: string) => Promise<ActionResult>;
  decideTimesheetEntries: (ids: string[], approve: boolean, note?: string) => Promise<ActionResult>;
}

export type AppState = WorkspaceSnapshot & AppActions;

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

    // Fee & Change Order Actions
    setFeeTerms: (projectId, terms) => run(feeActions.setFeeTerms({ ...terms, id: projectId })),
    applyFeeTemplate: (projectId, templateId) => run(feeActions.applyFeeTemplate({ project_id: projectId, template_id: templateId })),
    addFeeStage: (stage) => run(feeActions.addFeeStage(stage)),
    updateFeeStage: (stageId, updates) => run(feeActions.updateFeeStage({ ...updates, id: stageId })),
    deleteFeeStage: (stageId) => run(feeActions.deleteFeeStage({ id: stageId })),
    completeFeeStage: (stageId) => run(feeActions.completeFeeStage({ id: stageId })),
    reopenFeeStage: (stageId) => run(feeActions.reopenFeeStage({ id: stageId })),
    createChangeOrder: (co) => run(coActions.createChangeOrder(co)),
    updateChangeOrder: (id, updates) => run(coActions.updateChangeOrder({ ...updates, id })),
    submitChangeOrder: (id) => run(coActions.submitChangeOrder({ id })),
    decideChangeOrder: (id, approve, signer, note) => run(coActions.decideChangeOrder({ id, approve, signer, note })),

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
    issueInvoice: (id, dueDate) => run(recvActions.issueInvoice({ id, due_date: dueDate })),
    deleteDraftInvoice: (id) => run(recvActions.deleteDraftInvoice({ id })),
    cancelInvoice: (invoiceId) => run(financeActions.cancelInvoice({ id: invoiceId })),
    recordPayment: (invoiceId, amount, paymentDate, mode, reference, tdsAmount = 0) =>
      run(financeActions.recordPayment({ invoice_id: invoiceId, amount, payment_date: paymentDate, mode, reference, tds_amount: tdsAmount })),
    addCreditNote: (invoiceId, amount, reason) => run(recvActions.addCreditNote({ invoice_id: invoiceId, amount, reason })),
    setRetention: (invoiceId, amount) => run(recvActions.setRetention({ id: invoiceId, retention_amount: amount })),
    releaseRetention: (invoiceId) => run(recvActions.releaseRetention({ id: invoiceId })),
    addExpense: (expense) => run(financeActions.addExpense(expense)),
    acknowledgeAlert: (id) => run(alertActions.acknowledgeAlert({ id })),

    // Communication & Files
    addFile: (file) => run(fileActions.createFileRecord(file)),
    toggleFileVisibility: (fileId) => {
      const f = get().files.find((x) => x.id === fileId);
      return run(fileActions.setFileVisibility({ id: fileId, is_client_visible: !f?.is_client_visible }));
    },
    deleteFile: (fileId) => run(fileActions.deleteFile({ id: fileId })),
    addMessage: (m) => run(commsActions.sendMessage(m)),
    addProjectUpdate: (u) => run(commsActions.postUpdate(u)),
    toggleUpdateReaction: (updateId, kind) => run(commsActions.reactToUpdate({ id: updateId, kind })),
    toggleMaterialSelection: (materialId) => {
      const m = get().materialOptions.find((x) => x.id === materialId);
      return run(commsActions.setMaterialSelected({ id: materialId, is_selected: !m?.is_selected }));
    },
    markNotificationRead: (id) => run(commsActions.markNotificationRead({ id })),
    markAllNotificationsRead: () => run(commsActions.markAllNotificationsRead()),

  // Item Library & Materials
    addItemToLibrary: (item) => run(settingsActions.addLibraryItem(item)),
    updateLibraryItem: (id, updates) => run(settingsActions.updateLibraryItem({ ...updates, id })),
    deleteLibraryItem: (id) => run(settingsActions.deleteLibraryItem({ id })),

    // Settings & Activity
    updateStudioSettings: (settings) => run(settingsActions.updateSettings(settings)),

    // Timesheets
    saveTimesheetWeek: (weekStart, rows) => run(tsActions.saveTimesheetWeek({ week_start: weekStart, rows })),
    submitTimesheetWeek: (weekStart) => run(tsActions.submitTimesheetWeek({ week_start: weekStart })),
    decideTimesheetEntries: (ids, approve, note) => run(tsActions.decideTimesheetEntries({ ids, approve, note })),
  }));

export const AppStoreContext = createContext<StoreApi<AppState> | null>(null);

export function useAppStore(): AppState;
export function useAppStore<T>(selector: (s: AppState) => T): T;
export function useAppStore<T>(selector?: (s: AppState) => T) {
  const store = use(AppStoreContext);
  if (!store) throw new Error("useAppStore must be used inside <AppStoreProvider>");
  return useStore(store, selector ?? ((s) => s as T));
}
