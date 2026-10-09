"use client";

import { useEffect, useState } from "react";
import { AppStoreContext, createAppStore } from "@/lib/store";
import type { WorkspaceSnapshot } from "@/lib/data/snapshot";

export function AppStoreProvider({ snapshot, children }: { snapshot: WorkspaceSnapshot; children: React.ReactNode }) {
  const [store] = useState(() => createAppStore(snapshot));
  // A server action's refresh() re-renders the server tree with a new snapshot.
  useEffect(() => store.setState(snapshot), [store, snapshot]);
  return <AppStoreContext value={store}>{children}</AppStoreContext>;
}
