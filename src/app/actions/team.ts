"use server";
import { refresh } from "next/cache";
import { z } from "zod";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";
import { staffInviteInput, staffRolesInput } from "@/lib/actions/schemas";
import type { ActionResult } from "@/lib/actions/result";
import type { AppRole } from "@/types";
import { isDemoRequest } from "@/lib/auth-demo";
import {invitationEmailConfigured,sendInvitationEmail} from "@/lib/invitation-email";

export async function callerHasRole(roles: AppRole[]): Promise<boolean> {
  if (await isDemoRequest()) return false;
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
    app_metadata: { kind: "staff", provisioning_pending:true },
    user_metadata: { full_name: parsed.data.full_name },
  });
  if (error || !data.user) return { ok: false, error: error?.message ?? "Could not create the login." };

  const db = await createServerSupabase();
  const uid = data.user.id;
  const { error: rolesError } = await db.rpc("configure_staff", { p_user: uid, p_roles: parsed.data.roles, p_title: parsed.data.title ?? undefined,p_activate:true });
  if (rolesError) {
    const cleanup = await createAdminSupabase().auth.admin.deleteUser(uid);
    return { ok: false, error: cleanup.error ? "Staff setup failed. An unconfigured account remains; contact the owner before retrying." : "Staff setup failed. No account was added; please try again." };
  }
  refresh();
  return { ok: true, id: uid };
}

export async function setStaffRoles(input: unknown): Promise<ActionResult> {
  if (!(await callerHasRole(["owner"]))) return { ok: false, error: "Only the owner can manage staff roles." };
  const parsed = staffRolesInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Pick at least one role." };
  const { user_id, roles } = parsed.data;
  if (user_id === (await currentUserId()) && !roles.includes("owner")) {
    return { ok: false, error: "You can't remove your own owner role." };
  }
  const db = await createServerSupabase();
  const ins = await db.rpc("configure_staff", { p_user: user_id, p_roles: roles });
  if (ins.error) return { ok: false, error: ins.error.message };
  refresh();
  return { ok: true };
}

export async function setStaffActive(input: unknown): Promise<ActionResult> {
  if (!(await callerHasRole(["owner"]))) return { ok: false, error: "Only the owner can manage account access." };
  const parsed = z.object({ id: z.uuid(), active: z.boolean() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  if (parsed.data.id === (await currentUserId())) return { ok: false, error: "You can't deactivate yourself." };
  const db = await createServerSupabase();
  const { error } = await db.from("profiles").update({ active: parsed.data.active }).eq("id", parsed.data.id).select("id").single();
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}
export async function emailStaffInvitation(input:unknown):Promise<ActionResult>{
 const parsed=z.object({id:z.uuid()}).safeParse(input);if(!parsed.success||!(await callerHasRole(["owner"])))return {ok:false,error:"Only the owner can invite staff."};
 if(!invitationEmailConfigured())return {ok:false,error:"Email delivery is not configured. Staff can request a magic link from the login page."};
 const admin=createAdminSupabase();const profile=await admin.from("profiles").select("email,kind,active").eq("id",parsed.data.id).single();
 if(profile.error||profile.data.kind!=="staff"||!profile.data.active)return {ok:false,error:"An active staff account is required."};
 const identity=await admin.auth.admin.getUserById(parsed.data.id);
 if(identity.error||!identity.data.user||identity.data.user.app_metadata.kind!=="staff"||identity.data.user.email?.toLowerCase()!==profile.data.email.toLowerCase())return {ok:false,error:"This contact email does not match the staff login. Reconcile the account before inviting."};
 const link=await admin.auth.admin.generateLink({type:"magiclink",email:profile.data.email,options:{redirectTo:`${process.env.NEXT_PUBLIC_SITE_URL??"http://localhost:3000"}/auth/callback?next=/dashboard`}});
 if(link.error)return {ok:false,error:"Could not create the invitation. Please try again."};
 const confirmation=new URL("/auth/confirm",process.env.NEXT_PUBLIC_SITE_URL||"http://localhost:3000");
 confirmation.searchParams.set("token_hash",link.data.properties.hashed_token);
 confirmation.searchParams.set("type","magiclink");confirmation.searchParams.set("next","/dashboard");
 return sendInvitationEmail(profile.data.email,confirmation.toString());
}
