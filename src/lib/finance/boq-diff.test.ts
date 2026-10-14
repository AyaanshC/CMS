import {describe,it,expect} from "vitest";
import {compareBoqs} from "./boq-diff";
import type {BOQVersion} from "@/types";
const version=(description:string,quantity:number,key:string):BOQVersion=>({id:"boq",project_id:"p",version_number:1,status:"draft",gst_percent:0,discount_amount:0,designer_fee:0,grand_total:quantity*10,created_at:"2026-10-14",sections:[{id:"s",boq_version_id:"boq",name:"Living",category:"Furniture",sort_order:1,subtotal:quantity*10,items:[{id:"i",line_key:key,section_id:"s",description,unit:"nos",quantity,unit_rate:10,total:quantity*10,sort_order:1}]}]});
describe("BOQ differences",()=>{
it("matches renamed stable lines and shows removed lines",()=>{expect(compareBoqs(version("Chair",1,"a"),version("Armchair",2,"a"))[0]).toMatchObject({status:"Changed",difference:10});expect(compareBoqs(version("Chair",1,"a"),version("Table",1,"b")).map(r=>r.status)).toEqual(["Removed","Added"]);});
});
