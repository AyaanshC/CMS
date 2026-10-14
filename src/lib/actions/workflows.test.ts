import { beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
const mocks=vi.hoisted(()=>({db:{from:vi.fn(),rpc:vi.fn(),storage:{from:vi.fn()}},admin:{from:vi.fn(),auth:{admin:{createUser:vi.fn(),generateLink:vi.fn(),getUserById:vi.fn()}}}}));
vi.mock("server-only",()=>({}));
vi.mock("next/cache",()=>({refresh:vi.fn()}));
vi.mock("@/lib/auth-demo",()=>({isDemoRequest:async()=>false}));
vi.mock("@/lib/supabase/server",()=>({createServerSupabase:async()=>mocks.db}));
vi.mock("@/lib/supabase/admin",()=>({createAdminSupabase:()=>mocks.admin}));
vi.mock("@/app/actions/team",()=>({callerHasRole:async()=>true}));
vi.mock("@/lib/store",()=>({useAppStore:()=>({itemLibrary:[],studioSettings:{gst_rate:18,name:"Audit Studio",bank_details:{}},team:[{id:"a1000000-0000-4000-8000-000000000001",full_name:"Studio Owner",roles:["owner"]}],projects:[],vendors:[],me:{kind:"staff",roles:["owner"]}})}));
import { recordReceipt } from "@/app/actions/procurement";
import { grantPortalAccess } from "@/app/actions/portal";
import {deleteFile} from "@/app/actions/files";
import { messageInput } from "./schemas";
import BOQTab from "@/components/projects/BOQTab";
import SnagTab from "@/components/projects/SnagTab";
import type { BOQVersion } from "@/types";
const id="a1000000-0000-4000-8000-000000000001";
function query(result:unknown){const q:Record<string,unknown>={};for(const method of ["select","eq","ilike"])q[method]=vi.fn(()=>q);q.single=vi.fn(async()=>result);q.maybeSingle=vi.fn(async()=>result);return q;}
function estimate(gst:number):BOQVersion{return{id,project_id:id,version_number:1,status:"draft",created_at:"2026-10-14",gst_percent:gst,designer_fee:100,discount_amount:0,grand_total:200*(1+gst/100),sections:[{id,boq_version_id:id,name:"Audit",category:"General",sort_order:1,subtotal:100,items:[{id,section_id:id,description:"Audit item",unit:"nos",quantity:1,unit_rate:100,total:100,sort_order:1}]}]};}
describe("audit workflow regressions",()=>{
  beforeEach(()=>vi.resetAllMocks());
  it("uses one transactional receipt RPC and propagates failures",async()=>{mocks.db.rpc.mockResolvedValue({data:null,error:{message:"Injected line failure"}});const result=await recordReceipt({po_id:id,received_on:"2026-10-14",lines:[{po_line_id:id,quantity_received:1}]});expect(result.ok).toBe(false);expect(mocks.db.rpc).toHaveBeenCalledWith("record_goods_receipt",expect.anything());expect(mocks.db.from).not.toHaveBeenCalled();});
  it("keeps file metadata when Storage deletion fails",async()=>{const q=query({data:{id,storage_path:`${id}/file.pdf`},error:null});q.delete=vi.fn();mocks.db.from.mockReturnValue(q);mocks.db.storage.from.mockReturnValue({remove:vi.fn(async()=>({error:{message:"Storage unavailable"}}))});expect((await deleteFile({id})).ok).toBe(false);expect(q.delete).not.toHaveBeenCalled();});
  it("rejects an invitation for an unrelated existing identity",async()=>{mocks.db.from.mockReturnValue(query({data:{id},error:null}));mocks.admin.from.mockReturnValue(query({data:{id,kind:"staff",client_id:null,active:true},error:null}));expect((await grantPortalAccess({client_id:id,full_name:"Client",email:"audit@example.test"})).ok).toBe(false);expect(mocks.admin.auth.admin.generateLink).not.toHaveBeenCalled();});
  it("creates a server-confirmed link for the matching client identity",async()=>{mocks.db.from.mockReturnValue(query({data:{id},error:null}));mocks.admin.from.mockReturnValue(query({data:{id,kind:"client",client_id:id,active:true},error:null}));mocks.admin.auth.admin.getUserById.mockResolvedValue({data:{user:{id,email:"audit@example.test",app_metadata:{kind:"client",client_id:id}}},error:null});mocks.admin.auth.admin.generateLink.mockResolvedValue({data:{properties:{hashed_token:"audit-fixture-hash"}},error:null});const r=await grantPortalAccess({client_id:id,full_name:"Client",email:"audit@example.test"});expect(r.ok).toBe(true);if(r.ok){const url=new URL(r.link);expect(url.pathname).toBe("/auth/confirm");expect(url.searchParams.get("next")).toBe("/portal");expect(url.hash).toBe("");}});
  it("rejects a contact profile that does not match the authentication identity",async()=>{mocks.db.from.mockReturnValue(query({data:{id},error:null}));mocks.admin.from.mockReturnValue(query({data:{id,kind:"client",client_id:id,active:true},error:null}));mocks.admin.auth.admin.getUserById.mockResolvedValue({data:{user:{id,email:"audit@example.test",app_metadata:{kind:"staff"}}},error:null});expect((await grantPortalAccess({client_id:id,full_name:"Client",email:"audit@example.test"})).ok).toBe(false);expect(mocks.admin.auth.admin.generateLink).not.toHaveBeenCalled();});
  it("rejects ephemeral and cross-project attachment URLs",()=>{expect(messageInput.safeParse({project_id:id,content:"",file_url:`blob:http://localhost:3000/${id}`}).success).toBe(false);expect(messageInput.safeParse({project_id:id,file_url:"other-project/file.pdf"}).success).toBe(false);expect(messageInput.safeParse({project_id:id,file_url:`${id}/file.pdf`}).success).toBe(true);});
  it("renders GST on fees and preserves zero rates",()=>{const normal=renderToStaticMarkup(createElement(BOQTab,{projectId:id,boqVersions:[estimate(18)]}));expect(normal).toContain("₹36");const zero=renderToStaticMarkup(createElement(BOQTab,{projectId:id,boqVersions:[estimate(0)]}));expect(zero).not.toContain("₹18");expect(zero).toMatch(/GST \(0/);});
  it("renders staff snags with a populated team and no project",()=>{expect(()=>renderToStaticMarkup(createElement(SnagTab,{projectId:id,snags:[],rooms:[]}))).not.toThrow();});
});
