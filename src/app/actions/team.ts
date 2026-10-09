"use server";
import { refresh } from "next/cache";
import { z } from "zod";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";
import { staffInviteInput, staffRolesInput } from "@/lib/actions/schemas";
import type { ActionResult } from "@/lib/actions/result";
import type { AppRole } from "@/types";

export async function callerHasRole(roles: AppRole[]): Promise<boolean> {
  const db = await createServerSupabase();
  const results = await Promise.all(roles.map((r) => db.rpc("has_role", { r })));
  return results.some((x) => x.data === true);
}

async function currentUserId() {
  const db = await createServerSupabase();
  return (await db.auth.getUser()).data.user?.id;
}

// Creates the login with the service role (only it can set app_metadata.kind);
// profile title and roles are written as the owner so the audit log records who did it.
export async function inviteStaff(input: unknown): Promise<ActionResult> {
  const parsed = staffInviteInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Enter a name, a valid email and at least one role." };
  if (!(await callerHasRole(["owner"]))) return { ok: false, error: "Only the owner can add staff." };

  const { data, error } = await createAdminSupabase().auth.admin.createUser({
    email: parsed.data.email,
    email_confirm: true,
    app_metadata: { kind: "staff" },
    user_metadata: { full_name: parsed.data.full_name },
  });
  if (error || !data.user) return { ok: false, error: error?.message ?? "Could not create the login." };

  const db = await createServerSupabase();
  const uid = data.user.id;
  if (parsed.data.title) await db.from("profiles").update({ title: parsed.data.title }).eq("id", uid);
  const { error: rolesError } = await db.from("user_roles").insert(parsed.data.roles.map((role) => ({ user_id: uid, role })));
  if (rolesError) return { ok: false, error: rolesError.message };
  refresh();
  return { ok: true, id: uid };
}

export async function setStaffRoles(input: unknown): Promise<ActionResult> {
  const parsed = staffRolesInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Pick at least one role." };
  const { user_id, roles } = parsed.data;
  if (user_id === (await currentUserId()) && !roles.includes("owner")) {
    return { ok: false, error: "You can't remove your own owner role." };
  }
  const db = await createServerSupabase();
  const del = await db.from("user_roles").delete().eq("user_id", user_id).not("role", "in", `(${roles.join(",")})`);
  if (del.error) return { ok: false, error: del.error.message };
  const ins = await db.from("user_roles").upsert(roles.map((role) => ({ user_id, role })), { ignoreDuplicates: true });
  if (ins.error) return { ok: false, error: ins.error.message };
  refresh();
  return { ok: true };
}

export async function setStaffActive(input: unknown): Promise<ActionResult> {
  const parsed = z.object({ id: z.uuid(), active: z.boolean() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  if (parsed.data.id === (await currentUserId())) return { ok: false, error: "You can't deactivate yourself." };
  const db = await createServerSupabase();
  const { error } = await db.from("profiles").update({ active: parsed.data.active }).eq("id", parsed.data.id).select("id").single();
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}
