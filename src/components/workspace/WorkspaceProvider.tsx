import "server-only";
import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { loadWorkspace } from "@/lib/data/load-workspace";
import { DEMO_PROFILES } from "@/lib/data/mock-workspace";
import { AppStoreProvider } from "./AppStoreProvider";

// Must render inside <Suspense>: it reads the session cookie.
export async function WorkspaceProvider({ scope, children }: { scope: "staff" | "portal"; children: React.ReactNode }) {
  let me;
  try {
    me = await getSessionProfile();
  } catch {
    if (scope === "portal") {
      me = DEMO_PROFILES["arun@client.test"];
    } else {
      redirect("/login");
    }
  }

  if (scope === "staff" && me.kind !== "staff") redirect("/portal");
  const snapshot = await loadWorkspace(me);
  return <AppStoreProvider snapshot={snapshot}>{children}</AppStoreProvider>;
}
