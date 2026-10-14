// Runs only against the disposable cms-audit-fixes instance. Credentials are
// read from an ignored local status file and are never logged.
import {readFile} from "node:fs/promises";
import {randomUUID} from "node:crypto";
import assert from "node:assert/strict";
import {createClient} from "@supabase/supabase-js";
import {fetchAll} from "../../src/lib/data/paginate.ts";
const env=Object.fromEntries((await readFile(".audit-db/runtime.env","utf8")).split(/\r?\n/).flatMap(line=>{const m=line.match(/^([A-Z_]+)="(.*)"$/);return m?[[m[1],m[2]]]:[];}));
assert.equal(new URL(env.API_URL).port,"55321","Refuse to test an existing or production database");
const options={auth:{persistSession:false,autoRefreshToken:false}};
const admin=createClient(env.API_URL,env.SERVICE_ROLE_KEY,options);
const owner=createClient(env.API_URL,env.ANON_KEY,options),client=createClient(env.API_URL,env.ANON_KEY,options),other=createClient(env.API_URL,env.ANON_KEY,options);
const project="a1000000-0000-4000-8000-000000000001",ownerId="00000000-0000-4000-8000-000000000001";
for(const [db,email] of [[owner,"priya@studio.test"],[client,"arun@client.test"],[other,"rohit@client.test"]]){const r=await db.auth.signInWithPassword({email,password:"password123"});assert(!r.error,`Test sign-in failed: ${r.error?.message}`);}
let checks=0;const check=name=>{checks++;console.log(`PASS ${name}`);};
const run=randomUUID(),prefix=`Audit pagination ${run}`,paths=["internal","visible","unregistered","client"].map(k=>`${project}/${run}-${k}.txt`);
try{
 for(const path of paths.slice(0,3)){const r=await owner.storage.from("project-files").upload(path,new Blob(["Disposable audit fixture"],{type:"text/plain"}));assert(!r.error,r.error?.message);}
 for(const [i,visible] of [[0,false],[1,true]]){const r=await admin.from("project_files").insert({project_id:project,file_name:`Audit ${run}`,storage_path:paths[i],file_type:"text/plain",is_client_visible:visible});assert(!r.error,r.error?.message);}
 assert((await client.storage.from("project-files").createSignedUrl(paths[0],60)).error);check("real client JWT cannot sign an internal Storage object");
 assert(!(await client.storage.from("project-files").createSignedUrl(paths[1],60)).error);check("explicitly visible Storage object is readable");
 assert((await client.storage.from("project-files").createSignedUrl(paths[2],60)).error);check("unregistered staff object remains private");
 assert((await other.storage.from("project-files").createSignedUrl(paths[1],60)).error);check("different client cannot sign another project's file");
 const guessed=await client.from("messages").insert({project_id:project,content:"Disposable access check",file_url:paths[0]});assert(guessed.error);check("client cannot expose an internal object through a message");
 assert(!(await client.rpc("register_project_upload",{p_project:project,p_path:paths[3]})).error);
 assert(!(await client.storage.from("project-files").upload(paths[3],new Blob(["Client test attachment"],{type:"text/plain"}))).error);
 assert(!(await client.from("messages").insert({project_id:project,content:"Disposable attachment check",file_url:paths[3]})).error);
 assert(!(await client.storage.from("project-files").createSignedUrl(paths[3],60)).error);check("client-owned attachment persists and is readable after save");
 let received;const messageEvent=new Promise(resolve=>{received=resolve;});
 await owner.realtime.setAuth((await owner.auth.getSession()).data.session.access_token);
 const channel=owner.channel(`audit-${run}`).on("postgres_changes",{event:"*",schema:"public",table:"messages"},payload=>{if(payload.new.content===`Realtime ${run}`)received(true);});
 let timer;
 try{
   await new Promise((resolve,reject)=>{timer=setTimeout(()=>reject(Error("Realtime subscription timed out")),12000);channel.subscribe(status=>{if(status==="SUBSCRIBED"){clearTimeout(timer);resolve();}else if(status==="CHANNEL_ERROR")reject(Error("Realtime subscription failed"));});});
   assert(!(await client.from("messages").insert({project_id:project,content:`Realtime ${run}`,file_url:paths[3]})).error);
   await Promise.race([messageEvent,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error("Realtime event timed out")),12000);})]);
   check("a second authenticated session receives project messages in realtime");
 }finally{clearTimeout(timer);await owner.removeChannel(channel);}
 assert(!(await admin.from("profiles").update({active:false}).eq("id",ownerId)).error);
 assert.equal((await owner.rpc("has_role",{r:"owner"})).data,false);check("existing owner JWT loses its role after deactivation");
 assert.equal((await owner.from("invoices").select("id")).data?.length,0);check("disabled existing session cannot read invoices");
 assert((await owner.storage.from("project-files").createSignedUrl(paths[1],60)).error);check("disabled existing session cannot read Storage");
 await owner.from("profiles").update({active:true}).eq("id",ownerId);
 assert.equal((await admin.from("profiles").select("active").eq("id",ownerId).single()).data.active,false);check("disabled owner cannot reactivate itself through the API");
 assert((await owner.rpc("submit_timesheet_week",{p_week:"2026-10-05"})).error);check("disabled session cannot bypass policy through a definer RPC");
 assert(!(await admin.from("profiles").update({active:true}).eq("id",ownerId)).error);
 const rows=Array.from({length:1005},(_,i)=>({project_id:project,title:`${prefix} ${i}`,priority:"low",is_internal:true}));
 assert(!(await admin.from("tasks").insert(rows)).error);
 const query=owner.from("tasks").select("id").like("title",`${prefix}%`).order("id");
 assert.equal((await query).data.length,1000);check("live API reproduces the 1000-row response limit");
 const all=await fetchAll(query);assert(!all.error,all.error?.message);assert.equal(all.data.length,1005);assert.equal(new Set(all.data.map(r=>r.id)).size,1005);check("pagination retrieves every record without duplicates");
 console.log(`${checks} live API checks passed.`);
}finally{
 await admin.from("profiles").update({active:true}).eq("id",ownerId);
 await admin.from("tasks").delete().like("title",`${prefix}%`);
 await admin.from("messages").delete().in("file_url",paths);
 await admin.storage.from("project-files").remove(paths);
 await admin.from("project_files").delete().in("storage_path",paths);
 await admin.from("file_uploads").delete().in("path",paths);
 for(const db of [owner,client,other,admin])db.realtime.disconnect();
}
