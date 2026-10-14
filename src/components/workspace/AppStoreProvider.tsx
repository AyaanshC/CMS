"use client";

import { useEffect, useState } from "react";
import { AppStoreContext, createAppStore } from "@/lib/store";
import type { WorkspaceSnapshot } from "@/lib/data/snapshot";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/browser";

export function AppStoreProvider({ snapshot, children }: { snapshot: WorkspaceSnapshot; children: React.ReactNode }) {
  const [store] = useState(() => createAppStore(snapshot));
  const router = useRouter();
  // A server action's refresh() re-renders the server tree with a new snapshot.
  useEffect(() => store.setState(snapshot), [store, snapshot]);
  useEffect(() => {
    if (snapshot.me.is_demo) return;
    const db = createBrowserSupabase();
    let timer: ReturnType<typeof setTimeout>;
    let lastRefresh = Date.now();
    const refresh = () => { clearTimeout(timer); timer = setTimeout(() => { lastRefresh = Date.now(); router.refresh(); }, 400); };
    const channel = db.channel(`workspace-${snapshot.me.id}`);
    for (const table of ["messages", "notifications", "project_updates", "snags", "tasks", "boq_versions", "change_orders", "invoices", "timesheet_entries", "project_files", "material_options", "handover_acceptances", "project_rooms", "project_milestones", "projects", "vendor_bills", "vendor_payments", "purchase_orders", "goods_receipts"]) {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, refresh);
    }
    let active=true;
    // Set the verified session token before joining; relying on an asynchronous
    // auth-state callback can leave a newly-created subscription unauthenticated.
    void db.auth.getSession().then(async ({data})=>{
      if(!active)return;
      if(data.session)await db.realtime.setAuth(data.session.access_token);
      if(active)channel.subscribe();
    }).catch(()=>{if(active)refresh();});
    const onVisible = () => { if (document.visibilityState === "visible" && Date.now() - lastRefresh >= 50 * 60_000) refresh(); };
    document.addEventListener("visibilitychange", onVisible);
    const renewal = setInterval(onVisible, 50 * 60_000);
    return () => { active=false; clearTimeout(timer); clearInterval(renewal); document.removeEventListener("visibilitychange", onVisible); void db.removeChannel(channel); };
  }, [router, snapshot.me.id, snapshot.me.is_demo]);
  return <AppStoreContext value={store}>{children}</AppStoreContext>;
}
