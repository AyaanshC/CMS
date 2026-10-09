import "server-only";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import type { SessionProfile } from "@/types";

export async function getSessionProfile(): Promise<SessionProfile> {
  const db = await createServerSupabase();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/login");
  const { data } = await db
    .from("profiles")
    .select("id, full_name, email, kind, client_id, title, active, user_roles(role)")
    .eq("id", user.id)
    .single();
  if (!data || !data.active) redirect("/login?error=inactive");
  return {
    id: data.id,
    full_name: data.full_name,
    email: data.email,
    kind: data.kind,
    client_id: data.client_id,
    title: data.title,
    roles: data.user_roles.map((r) => r.role),
  };
}
