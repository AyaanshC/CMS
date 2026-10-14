// Disposable local audit instance only; no email is sent by this test.
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';
const env=Object.fromEntries((await readFile('.audit-db/runtime.env','utf8')).split(/\r?\n/).flatMap(line=>{const m=line.match(/^([A-Z_]+)="(.*)"$/);return m?[[m[1],m[2]]]:[];}));
assert.equal(new URL(env.API_URL).port,'55321');
const db=createClient(env.API_URL,env.SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const request=(worker,method,auth=true)=>fetch(`${env.API_URL}/functions/v1/${worker}`,{method,headers:auth?{Authorization:`Bearer ${env.SERVICE_ROLE_KEY}`}:{},signal:AbortSignal.timeout(30000)});
let checks=0;const pass=label=>{checks++;console.log(`PASS ${label}`);};
for(const worker of ['deliver-alerts','cleanup-uploads']){assert.equal((await request(worker,'POST',false)).status,401);pass(`${worker} rejects unauthenticated requests`);}
const health=await request('deliver-alerts','GET');assert.equal(health.status,200);assert.equal((await health.json()).configured,false,'Refuse to run the no-email test with configured delivery');pass('unconfigured email health is reported honestly');
assert.equal((await request('deliver-alerts','POST')).status,503);pass('unconfigured delivery preserves queued mail');
assert.equal((await request('cleanup-uploads','GET')).status,405);pass('read requests cannot trigger cleanup');
const project='a1000000-0000-4000-8000-000000000001',owner='00000000-0000-4000-8000-000000000001';
const paths=['abandoned','referenced'].map(n=>`${project}/worker-${randomUUID()}-${n}.txt`);
const requireOk=result=>assert(!result.error,result.error?.message);
try{
 for(const path of paths){
  requireOk(await db.storage.from('project-files').upload(path,new Blob(['Disposable worker fixture'],{type:'text/plain'})));
  requireOk(await db.from('file_uploads').insert({path,project_id:project,uploaded_by:owner,expires_at:new Date(Date.now()-86400000).toISOString()}));
 }
 requireOk(await db.from('project_files').insert({project_id:project,file_name:'Worker fixture',storage_path:paths[1],file_type:'text/plain',is_client_visible:false}));
 const cleanup=await request('cleanup-uploads','POST');assert.equal(cleanup.status,200);assert((await cleanup.json()).removed>=1);
 assert((await db.storage.from('project-files').download(paths[0])).error);pass('expired unreferenced upload is physically removed');
 requireOk(await db.storage.from('project-files').download(paths[1]));pass('referenced upload is preserved');
 const lease=await db.from('file_uploads').select('path').eq('path',paths[0]);requireOk(lease);assert.equal(lease.data.length,0);pass('removed upload lease is cleaned up');
 console.log(`${checks} worker HTTP checks passed.`);
}finally{
 await db.from('project_files').delete().in('storage_path',paths);
 await db.storage.from('project-files').remove(paths);
 await db.from('file_uploads').delete().in('path',paths);
 db.realtime.disconnect();
}
