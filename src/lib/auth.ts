import "server-only";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerSupabase } from "@/lib/supabase/server";
import { DEMO_PROFILES } from "@/lib/data/mock-workspace";
import type { SessionProfile } from "@/types";
import { isDemoEnabled, isDemoEmail } from "@/lib/demo";

export async function getSessionProfile(): Promise<SessionProfile> {
  const cookieStore = await cookies();
  const demoEmail = cookieStore.get("demo_user_email")?.value;

  if (isDemoEnabled() && demoEmail && isDemoEmail(demoEmail)) {
    return { ...DEMO_PROFILES[demoEmail], is_demo: true };
  }

  const db = await createServerSupabase();
  const {
    data: { user },
    error,
  } = await db.auth.getUser();
  if (error && error.name !== "AuthSessionMissingError") {
    throw new Error("Unable to verify your session. Please try again.");
  }
  if (user) {
    const { data, error: profileError } = await db
      .from("profiles")
      .select(
        "id, full_name, email, kind, client_id, title, active, user_roles(role)",
      )
      .eq("id", user.id)
      .single();
    if (profileError)
      throw new Error("Unable to load your account. Please try again.");
    if (data && data.active) {
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
    if (data && !data.active) {
      redirect("/login?error=inactive");
    }
  }
  redirect("/login");
}
