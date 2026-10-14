import {NextResponse,type NextRequest} from "next/server";
import {createServerSupabase} from "@/lib/supabase/server";
import {safeNext} from "@/lib/safe-next";
export async function GET(request:NextRequest){
 const {searchParams,origin}=new URL(request.url);
 const token=searchParams.get("token_hash"),type=searchParams.get("type");
 if(token&&type==="magiclink"){
   const db=await createServerSupabase();
   const {error}=await db.auth.verifyOtp({token_hash:token,type:"magiclink"});
   if(!error)return NextResponse.redirect(`${origin}${safeNext(searchParams.get("next"))}`);
 }
 return NextResponse.redirect(`${origin}/login?error=link`);
}
