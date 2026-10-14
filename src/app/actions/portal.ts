"use server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";
import { portalInviteInput } from "@/lib/actions/schemas";
import { callerHasRole } from "./team";
import {invitationEmailConfigured,sendInvitationEmail} from "@/lib/invitation-email";

export async function grantPortalAccess(input: unknown): Promise<{ ok: true; link: string } | { ok: false; error: string }> {
  const parsed = portalInviteInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Enter the client's name and a valid email." };
  if (!(await callerHasRole(["owner", "director", "project_manager", "admin"]))) {
    return { ok: false, error: "You don't have permission to grant portal access." };
  }

  const db = await createServerSupabase();
  const client = await db.from("clients").select("id").eq("id", parsed.data.client_id).single();
  if (client.error || !client.data) return { ok: false, error: "This client is unavailable or you don't have access." };
  const email = parsed.data.email.trim().toLowerCase();
  const admin = createAdminSupabase();
  const literalEmail=email.replace(/[\\%_]/g,character=>"\\"+character);
  const lookup = () => admin.from("profiles").select("id, kind, client_id, active").ilike("email", literalEmail).maybeSingle();
  const existing = await lookup();
  if (existing.error) return { ok: false, error: "Unable to verify the client's account. Try again." };
  const clientId=parsed.data.client_id.toLowerCase();
  const matches = async (profile: NonNullable<typeof existing.data>) => {
    if(profile.kind!=="client"||profile.client_id?.toLowerCase()!==clientId||!profile.active)return false;
    // Profile contact fields are editable. Bind the invitation to the actual
    // authentication account and its administrator-controlled association.
    const account=await admin.auth.admin.getUserById(profile.id);
    const user=account.data.user;
    return !account.error&&!!user&&user.id===profile.id&&user.email?.toLowerCase()===email
      &&user.app_metadata.kind==="client"&&typeof user.app_metadata.client_id==="string"&&user.app_metadata.client_id.toLowerCase()===clientId;
  };
  if (existing.data && !(await matches(existing.data))) return { ok: false, error: "This email belongs to another account. Use the email registered for this client." };
  if (!existing.data) {
  const created = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    app_metadata: { kind: "client", client_id: clientId },
    user_metadata: { full_name: parsed.data.full_name },
  });
    if (created.error) {
      // A concurrent invitation may have created the account; verify ownership again.
      const raced = await lookup();
      if (!raced.data || !(await matches(raced.data))) return { ok: false, error: "Could not create a matching client account. Check the email and try again." };
    }
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const link = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo: `${origin}/auth/callback?next=/portal` },
  });
  if (link.error) return { ok: false, error: link.error.message };
  const confirmation=new URL("/auth/confirm",origin);
  confirmation.searchParams.set("token_hash",link.data.properties.hashed_token);
  confirmation.searchParams.set("type","magiclink");
  confirmation.searchParams.set("next","/portal");
  return { ok: true, link: confirmation.toString() };
}
export async function emailPortalInvitation(input:unknown){
 if(!invitationEmailConfigured())return {ok:false as const,error:"Email delivery is not configured. Create a sign-in link to share with the client."};
 const parsed=portalInviteInput.safeParse(input);if(!parsed.success)return {ok:false as const,error:"Enter a valid client email."};
 const result=await grantPortalAccess(parsed.data);if(!result.ok)return result;
 return sendInvitationEmail(parsed.data.email,result.link);
}
