"use server";
import { headers } from "next/headers";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { portalInviteInput } from "@/lib/actions/schemas";
import { callerHasRole } from "./team";

export async function grantPortalAccess(input: unknown): Promise<{ ok: true; link: string } | { ok: false; error: string }> {
  const parsed = portalInviteInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Enter the client's name and a valid email." };
  if (!(await callerHasRole(["owner", "director", "project_manager", "admin"]))) {
    return { ok: false, error: "You don't have permission to grant portal access." };
  }

  const admin = createAdminSupabase();
  const created = await admin.auth.admin.createUser({
    email: parsed.data.email,
    email_confirm: true,
    app_metadata: { kind: "client", client_id: parsed.data.client_id },
    user_metadata: { full_name: parsed.data.full_name },
  });
  // An existing login for this email is fine only if it already belongs to this client.
  if (created.error && !/already/i.test(created.error.message)) return { ok: false, error: created.error.message };

  const origin = (await headers()).get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const link = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: parsed.data.email,
    options: { redirectTo: `${origin}/auth/callback?next=/portal` },
  });
  if (link.error) return { ok: false, error: link.error.message };
  return { ok: true, link: link.data.properties.action_link };
}
