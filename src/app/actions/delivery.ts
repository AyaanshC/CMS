"use server";
import {callerHasRole} from "./team";
import {createServerSupabase} from "@/lib/supabase/server";
import {invitationEmailConfigured} from "@/lib/invitation-email";
export async function deliveryStatus(){
 if(!(await callerHasRole(["owner","finance"])))return null;
 const db=await createServerSupabase();const summary=await db.rpc("delivery_health");
 let worker="Not reachable";
 try{const response=await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/deliver-alerts`,{method:"GET",headers:{Authorization:`Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`},signal:AbortSignal.timeout(3000),cache:"no-store"});if(response.ok){const data=await response.json();worker=data.configured?"Configured":"Email service not configured";}}catch{}
 return {summary:summary.error?null:summary.data,worker,invitationConfigured:invitationEmailConfigured()};
}
