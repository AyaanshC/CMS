import {createClient} from "jsr:@supabase/supabase-js@2";
Deno.serve(async req=>{
 const key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!key||req.headers.get("Authorization")!==`Bearer ${key}`)return new Response("Unauthorized",{status:401});
 if(req.method!=="POST")return new Response("Method not allowed",{status:405,headers:{Allow:"POST"}});
 const db=createClient(Deno.env.get("SUPABASE_URL")!,key);
 const {data,error}=await db.rpc("claim_abandoned_uploads");if(error)return Response.json({error:error.message},{status:500});
 let removed=0,failed=0;
 for(const upload of data??[]){
   const result=await db.storage.from("project-files").remove([upload.path]);
   if(result.error){failed++;await db.from("file_uploads").update({state:"pending",claimed_at:null}).eq("path",upload.path).eq("state","cleaning");}
   else{removed++;await db.from("file_uploads").delete().eq("path",upload.path).eq("state","cleaning");}
 }
 return Response.json({removed,failed});
});
