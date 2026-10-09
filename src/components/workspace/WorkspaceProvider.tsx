import "server-only";
import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { loadWorkspace } from "@/lib/data/load-workspace";
import { AppStoreProvider } from "./AppStoreProvider";

// Must render inside <Suspense>: it reads the session cookie.
export async function WorkspaceProvider({ scope, children }: { scope: "staff" | "portal"; children: React.ReactNode }) {
  const me = await getSessionProfile();
  if (scope === "staff" && me.kind !== "staff") redirect("/portal");
  const snapshot = await loadWorkspace(me);
  return <AppStoreProvider snapshot={snapshot}>{children}</AppStoreProvider>;
}
