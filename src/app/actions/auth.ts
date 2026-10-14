"use server";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export async function signOut() {
  const cookieStore = await cookies();
  const wasDemo = !!cookieStore.get("demo_user_email");
  cookieStore.delete("demo_user_email");
  if (wasDemo) redirect("/login");
  const db = await createServerSupabase();
  await db.auth.signOut({ scope: "local" });
  redirect("/login");
}
