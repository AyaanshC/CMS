import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase/server";

export default function PortalIndex() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading…</div>}>
      <PortalRedirect />
    </Suspense>
  );
}

async function PortalRedirect() {
  const me = await getSessionProfile();
  if (me.kind === "staff") redirect("/dashboard");
  const db = await createServerSupabase();
  const { data } = await db.from("projects").select("portal_token").is("archived_at", null)
    .order("created_at", { ascending: false }).limit(1);
  if (data?.[0]) redirect(`/portal/${data[0].portal_token}`);
  return <div className="p-8 text-center text-muted-foreground">No active projects are linked to your account yet.</div>;
}
