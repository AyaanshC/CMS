import "server-only";
import { addDays, weekStart } from "@/lib/time/weeks";
import { createServerSupabase } from "@/lib/supabase/server";
import type { SessionProfile } from "@/types";
import {
  makeUrlFor, mapActivity, mapAlert, mapBoq, mapChangeOrder, mapClient, mapCostControlRow, mapCostRow, mapCreditNote,
  mapExpense, mapFeeStage, mapFeeTemplate, mapFile, mapInvoice, mapLibraryItem, mapMaterial, mapMessage,
  mapNotification, mapPayment, mapProject, mapPurchaseOrder, mapQuote, mapReceipt, mapSettings, mapSnag,
  mapTask, mapTeamMember, mapTemplate, mapTimesheetEntry, mapUpdate, mapVendor, mapVendorBill,
  mapVendorPayment, mapWeekHours, withClientStats, withOutstanding,
} from "./mappers";
import type { WorkspaceSnapshot } from "./snapshot";

const isUrl = (p: string) => /^https?:\/\//.test(p);

// ponytail: loads the whole RLS-visible workspace per request (fine for ≤ 60 live
// projects). Switch to per-page queries if load time exceeds ~500 ms.
export async function loadWorkspace(me: SessionProfile): Promise<WorkspaceSnapshot> {
  const from = addDays(weekStart(new Date().toISOString().slice(0, 10)), -77);
  const db = await createServerSupabase();
  const [
    settings, clients, team, projects, boqs, snags, tasks, invoices, summaries, payments, expenses,
    messages, updates, notifications, library, templates, materials, files, activity,
    feeStages, feeTemplates, changeOrders, creditNotes, alerts,
    timesheets, projectCosts, staffHours, rateBands, costRates,
    vendors, quotes, purchaseOrders, poLineProgress, receipts, vendorBills, vendorBillSummaries, vendorPayments, costControl,
  ] = await Promise.all([
    db.from("firm_settings").select("*").single(),
    db.from("clients").select("*").is("archived_at", null).order("created_at", { ascending: false }),
    db.from("profiles").select("id, full_name, email, phone, title, avatar_url, active, weekly_capacity_hours, billable_target_percent, rate_band_id, user_roles(role)").eq("kind", "staff").order("full_name"),
    db.from("projects")
      .select("*, client:clients(full_name), rooms:project_rooms(*), milestones:project_milestones(*), members:project_members(role_on_project, profile:profiles(id, full_name, avatar_url))")
      .is("archived_at", null).order("created_at", { ascending: false }),
    db.from("boq_versions").select("*, sections:boq_sections(*, room:project_rooms(name), items:boq_line_items(*))").order("version_number"),
    db.from("snags")
      .select("*, room:project_rooms(name), vendor:vendors(name), raiser:profiles!snags_raised_by_fkey(full_name), assignee:profiles!snags_assigned_to_fkey(full_name), comments:snag_comments(*, author:profiles(full_name, kind))")
      .order("created_at", { ascending: false }),
    db.from("tasks").select("*, project:projects(name), assignee:profiles!tasks_assigned_to_fkey(full_name)").order("due_date", { nullsFirst: false }),
    db.from("invoices").select("*, project:projects(name, client:clients(full_name)), items:invoice_items(*)").order("created_at", { ascending: false }),
    db.from("invoice_summary").select("id, amount_paid, tds_amount, credited, retention_held, amount_due, effective_status, last_payment_date"),
    db.from("payments").select("*, recorder:profiles(full_name)").order("payment_date", { ascending: false }),
    db.from("expenses").select("*, creator:profiles!expenses_created_by_fkey(full_name)").order("expense_date", { ascending: false }),
    db.from("messages").select("*, sender:profiles(full_name, kind)").order("created_at"),
    db.from("project_updates").select("*, poster:profiles(full_name)").order("created_at", { ascending: false }),
    db.from("notifications").select("*").eq("user_id", me.id).order("created_at", { ascending: false }).limit(100),
    db.from("item_library").select("*").order("item_name"),
    db.from("boq_templates").select("*").order("name"),
    db.from("material_options").select("*"),
    db.from("project_files").select("*, uploader:profiles(full_name)").order("created_at", { ascending: false }),
    db.from("activity_logs").select("*").order("created_at", { ascending: false }).limit(200),
    db.from("fee_stage_summary").select("*").order("sort_order"),
    db.from("fee_templates").select("*").order("name"),
    db.from("change_orders").select("*").order("created_at", { ascending: false }),
    db.from("credit_notes").select("*").order("issued_at", { ascending: false }),
    db.from("alerts").select("*").eq("recipient_id", me.id).is("acknowledged_at", null).order("created_at", { ascending: false }),
    db.from("timesheet_entries").select("*, author:profiles!timesheet_entries_profile_id_fkey(full_name), project:projects(name)").gte("work_date", from).order("work_date"),
    db.rpc("project_cost_rollup"),
    db.rpc("staff_week_hours", { p_from: from, p_to: addDays(from, 7 * 12 - 1) }),
    db.from("rate_bands").select("*").order("blended_rate", { ascending: false }),
    db.from("staff_cost_rates").select("*").order("effective_from", { ascending: false }),
    db.from("vendors").select("*").order("name"),
    db.from("vendor_quotes").select("*, vendor:vendors(name)").order("received_at", { ascending: false }),
    db.from("purchase_orders").select("*, vendor:vendors(name), approver:profiles!purchase_orders_approved_by_fkey(full_name), lines:po_lines(*)").order("created_at", { ascending: false }),
    db.from("po_line_progress").select("*"),
    db.from("goods_receipts").select("*, receiver:profiles!goods_receipts_received_by_fkey(full_name), lines:grn_lines(*)").order("received_on", { ascending: false }),
    db.from("vendor_bills").select("*, vendor:vendors(name), lines:vendor_bill_lines(*)").order("bill_date", { ascending: false }),
    db.from("vendor_bill_summary").select("*"),
    db.from("vendor_payments").select("*").order("paid_on", { ascending: false }),
    db.rpc("boq_cost_control"),
  ]);

  const failed = [
    settings, clients, team, projects, boqs, snags, tasks, invoices, summaries, payments, expenses,
    messages, updates, notifications, library, templates, materials, files, activity,
    feeStages, feeTemplates, changeOrders, creditNotes, alerts,
    timesheets, projectCosts, staffHours, rateBands, costRates,
    vendors, quotes, purchaseOrders, poLineProgress, receipts, vendorBills, vendorBillSummaries, vendorPayments, costControl,
  ].find((r) => r.error);
  if (failed?.error) throw new Error(`Workspace load failed: ${failed.error.message}`);

  // Sign every storage path once.
  const paths = [
    ...(files.data ?? []).map((f) => f.storage_path),
    ...(snags.data ?? []).flatMap((s) => [s.before_photo_url, s.after_photo_url, ...s.comments.map((c) => c.photo_url)]),
    ...(updates.data ?? []).flatMap((u) => u.photos),
    ...(messages.data ?? []).map((m) => m.file_url),
    ...(materials.data ?? []).map((m) => m.image_url),
    ...(expenses.data ?? []).map((e) => e.receipt_url),
    ...(receipts.data ?? []).map((r) => r.photo_url),
    ...(vendorBills.data ?? []).map((b) => b.file_path),
  ].filter((p): p is string => !!p && !isUrl(p));
  const unique = [...new Set(paths)];
  // ponytail: 1-hour signed URLs; pages left open longer show broken images until refresh.
  const signed = unique.length ? await db.storage.from("project-files").createSignedUrls(unique, 3600) : { data: [] };
  const urlFor = makeUrlFor(new Map((signed.data ?? []).flatMap((s) => (s.path && s.signedUrl ? [[s.path, s.signedUrl] as const] : []))));

  const summaryById = new Map((summaries.data ?? []).map((s) => [s.id, s]));
  const mappedInvoices = (invoices.data ?? []).map((i) => mapInvoice(i, summaryById.get(i.id)));
  const mappedActivity = (activity.data ?? []).map(mapActivity);
  const mappedProjects = withOutstanding((projects.data ?? []).map(mapProject), mappedInvoices);

  const progress = new Map((poLineProgress.data ?? []).map((p) => [p.po_line_id!, p]));
  const billSummary = new Map((vendorBillSummaries.data ?? []).map((b) => [b.id!, b]));

  return {
    me,
    team: (team.data ?? []).map(mapTeamMember),
    studioSettings: mapSettings(settings.data!),
    clients: withClientStats((clients.data ?? []).map(mapClient), mappedProjects, mappedActivity),
    projects: mappedProjects,
    feeStages: (feeStages.data ?? []).map(mapFeeStage),
    feeTemplates: (feeTemplates.data ?? []).map(mapFeeTemplate),
    changeOrders: (changeOrders.data ?? []).map(mapChangeOrder),
    creditNotes: (creditNotes.data ?? []).map(mapCreditNote),
    boqs: (boqs.data ?? []).map(mapBoq),
    snags: (snags.data ?? []).map((s) => mapSnag(s, urlFor)),
    tasks: (tasks.data ?? []).map(mapTask),
    invoices: mappedInvoices,
    payments: (payments.data ?? []).map(mapPayment),
    expenses: (expenses.data ?? []).map((e) => mapExpense(e, urlFor)),
    messages: (messages.data ?? []).map((m) => mapMessage(m, urlFor)),
    projectUpdates: (updates.data ?? []).map((u) => mapUpdate(u, urlFor)),
    notifications: (notifications.data ?? []).map(mapNotification),
    itemLibrary: (library.data ?? []).map(mapLibraryItem),
    boqTemplates: (templates.data ?? []).map(mapTemplate),
    materialOptions: (materials.data ?? []).map((m) => mapMaterial(m, urlFor)),
    files: (files.data ?? []).map((f) => mapFile(f, urlFor)),
    activityLogs: mappedActivity,
    alerts: (alerts.data ?? []).map(mapAlert),
    timesheetEntries: (timesheets.data ?? []).map(mapTimesheetEntry),
    projectCosts: (projectCosts.data ?? []).map(mapCostRow),
    staffWeekHours: (staffHours.data ?? []).map(mapWeekHours),
    rateBands: (rateBands.data ?? []).map((b) => ({ id: b.id, name: b.name, blended_rate: Number(b.blended_rate) })),
    costRates: (costRates.data ?? []).map((c) => ({ id: c.id, profile_id: c.profile_id, effective_from: c.effective_from, cost_rate: Number(c.cost_rate) })),
    vendors: (vendors.data ?? []).map(mapVendor),
    quotes: (quotes.data ?? []).map(mapQuote),
    purchaseOrders: (purchaseOrders.data ?? []).map((po) => mapPurchaseOrder(po, progress)),
    receipts: (receipts.data ?? []).map((r) => mapReceipt(r, urlFor)),
    vendorBills: (vendorBills.data ?? []).map((b) => mapVendorBill(b, billSummary.get(b.id), urlFor)),
    vendorPayments: (vendorPayments.data ?? []).map(mapVendorPayment),
    costControl: (costControl.data ?? []).map(mapCostControlRow),
  };
}
