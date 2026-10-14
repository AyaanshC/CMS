import {describe,it,expect} from "vitest";
import {boqWorkbook} from "./boq";
import type {BOQVersion} from "@/types";
describe("BOQ Excel",()=>{it("exports an actual workbook with numeric totals including fees, discount and zero GST",async()=>{
 const boq={version_number:1,status:"draft",gst_percent:0,designer_fee:100,discount_amount:25,sections:[{name:"Kitchen",category:"Carpentry",items:[{description:"Oak =1+1",quantity:2,unit_rate:50,unit:"nos"}]}]} as BOQVersion;
 const workbook=await boqWorkbook(boq,"Audit Studio");const buffer=await workbook.xlsx.writeBuffer();
 const {Workbook}=await import("exceljs");const reread=new Workbook();await reread.xlsx.load(buffer);const sheet=reread.getWorksheet("BOQ")!;
 expect(sheet.getCell("C5").value).toBe("Oak =1+1");expect(sheet.getCell("G12").value).toBe(175);expect(sheet.getCell("G11").value).toBe(0);
});});
